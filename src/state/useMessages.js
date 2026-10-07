// Owns the live message list for one inbox: subscription, retrieval, ordering
// and de-duplication. useInbox keeps owning the inbox lifecycle itself.

import { useCallback, useEffect, useRef, useState } from "react";
import { createInboxSocket, SOCKET_STATUS } from "../services/inboxSocket.js";
import { fetchMessage, fetchUnreadMessages, rateLimitedFor } from "../services/inboxApi.js";

// The ingest webhook answers 202, so a message can be announced before it is
// parsed. One quick retry covers that window; a message still PENDING after it
// is listed as a preview and retried like any other that did not load.
const PENDING_RETRY_MS = 700;

// Lookups run one at a time (see the queue), so a request that never settles
// would stall everything behind it. fetchMessage has no timeout of its own.
const FETCH_TIMEOUT_MS = 8000;

// A message that did not load is tried again on its own a few times: after the
// rate-limit back-off if the server is refusing, otherwise after a short pause.
// After that it waits for the reader's Retry, a Refresh or a reconnect.
const AUTO_RETRIES = 3;
const RETRY_PAUSE_MS = 5000;

function byReceivedAtDesc(a, b) {
    const at = new Date(a.receivedAt ?? 0).getTime() || 0;
    const bt = new Date(b.receivedAt ?? 0).getTime() || 0;
    return bt - at;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Shown when the full fetch fails. message:new already carries enough to show
// that something arrived, which beats the message never appearing at all. The
// unread rows from the recovery endpoint are already in this shape: a display
// `sender` and no body.
function toPreviewRow(partial) {
    return {
        id: partial.id,
        subject: partial.subject ?? null,
        sender: partial.sender ?? null,
        from: partial.fromAddress ?? null,
        fromAddress: partial.fromAddress ?? null,
        receivedAt: partial.receivedAt ?? new Date().toISOString(),
        attachments: [],
        incomplete: true,
    };
}

async function loadFullMessage(id, token) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const signal = controller.signal;

    try {
        const first = await fetchMessage(id, token, { signal });
        if (first?.status !== "PENDING") return first;

        await delay(PENDING_RETRY_MS);
        return await fetchMessage(id, token, { signal });
    } finally {
        clearTimeout(timer);
    }
}

export function useMessages(inbox) {
    const [messages, setMessages] = useState([]);
    const [connection, setConnection] = useState(SOCKET_STATUS.CONNECTING);
    const [error, setError] = useState(null);
    // Whether the first sweep has settled and what it found is listed, and why
    // the last sweep failed - so an empty list is only called empty once it
    // has been checked.
    const [synced, setSynced] = useState(false);
    const [sweepError, setSweepError] = useState(null);

    // Ids already accepted, checked before the fetch so a replayed event costs
    // nothing. A ref because the socket handler needs it synchronously.
    const seenIds = useRef(new Set());

    // Fetches run one at a time, so a burst becomes a queue rather than a
    // thundering herd.
    const queue = useRef(Promise.resolve());

    // A flapping connection can re-join twice before the first recovery
    // settles; the second sweep would find nothing new, so it is skipped.
    const recovering = useRef(false);

    // A sweep put off while the server has the client backing off, and the
    // sweep itself, read through a ref so the timer never calls a stale one.
    const deferredSweep = useRef(null);
    const sweepRef = useRef(null);

    // Automatic retries of messages that did not load: attempts so far per id,
    // the timers waiting to run them, and the handler they call back into.
    const retries = useRef(new Map());
    const retryTimers = useRef(new Set());
    const handleRef = useRef(null);

    // The socket is created once per inbox, so it reads credentials through a
    // ref rather than closing over a value that can go stale. Updated after
    // each commit: nothing reads it while rendering, only the socket's
    // handlers and the sweep, which run later.
    const inboxRef = useRef(inbox);
    useEffect(() => {
        inboxRef.current = inbox;
    });

    // A different inbox means a different message history, so its list
    // starts empty. Reset while rendering - React's way to reset state when a
    // prop changes - rather than in the socket effect, which would paint the
    // previous inbox's list for one more frame first.
    const inboxKey =
        inbox?.address && inbox?.token ? `${inbox.address}\n${inbox.token}` : null;
    const [listFor, setListFor] = useState(inboxKey);
    if (listFor !== inboxKey) {
        setListFor(inboxKey);
        setMessages([]);
        setError(null);
        setConnection(SOCKET_STATUS.CONNECTING);
        setSynced(false);
        setSweepError(null);
    }

    // A row that did not load is the only one that gives way: to the full
    // message, or to a newer attempt that failed too.
    const insert = useCallback((message) => {
        setMessages((prev) => {
            const at = prev.findIndex((m) => m.id === message.id);
            if (at === -1) return [...prev, message].sort(byReceivedAtDesc);
            if (!prev[at].incomplete) return prev;
            const next = [...prev];
            next[at] = message;
            return next.sort(byReceivedAtDesc);
        });
    }, []);

    const scheduleRetry = useCallback((partial) => {
        const attempts = (retries.current.get(partial.id) ?? 0) + 1;
        retries.current.set(partial.id, attempts);
        if (attempts > AUTO_RETRIES) return;

        const backoff = rateLimitedFor();
        const timer = setTimeout(() => {
            retryTimers.current.delete(timer);
            handleRef.current?.(partial);
        }, backoff > 0 ? backoff + 1000 : RETRY_PAUSE_MS);
        retryTimers.current.add(timer);
    }, []);

    const enqueue = useCallback((task) => {
        queue.current = queue.current.then(task).catch((err) => {
            // A rejected task must not break the chain behind it.
            console.error("[useMessages] queued task failed", err);
        });
        return queue.current;
    }, []);

    // One arrival, whichever way it was announced: the socket's message:new, or
    // a row of the unread list after a re-join. Ids are claimed here, before the
    // fetch, so an event the two paths both report costs one request and renders
    // one row.
    const handleMessageNew = useCallback(
        (partial) => {
            if (!partial?.id || seenIds.current.has(partial.id)) return;
            seenIds.current.add(partial.id);

            const token = inboxRef.current?.token;
            if (!token) return;

            enqueue(async () => {
                let full = null;
                try {
                    full = await loadFullMessage(partial.id, token);
                } catch (err) {
                    console.error("[useMessages] could not load message", partial.id, err);
                }

                if (full && full.status !== "PENDING") {
                    retries.current.delete(partial.id);
                    // The id asked for is the message's id, whatever the reply
                    // carries: a row without one can be listed but never opened,
                    // since its link would lead to /inbox/undefined.
                    insert({ ...full, id: full.id ?? partial.id });
                    return;
                }

                // Not loaded (or still being parsed): list what is known, and
                // release the id so a retry, a Refresh or a reconnect fetches it.
                insert(toPreviewRow(partial));
                seenIds.current.delete(partial.id);
                scheduleRetry(partial);
            });
        },
        [enqueue, insert, scheduleRetry],
    );

    useEffect(() => {
        handleRef.current = handleMessageNew;
    }, [handleMessageNew]);

    // The reader's Retry: a fresh round of automatic attempts, starting now.
    // A message already being fetched is left to that fetch.
    const retry = useCallback(
        (message) => {
            if (!message?.id) return;
            retries.current.delete(message.id);
            handleMessageNew(message);
        },
        [handleMessageNew],
    );

    // Reconnect recovery. A re-join restores the transport but not the messages
    // that arrived while it was down, so the unread endpoint is the only way
    // back to them. Unread rows are list-shaped, so they go through
    // handleMessageNew exactly like a socket preview: same de-duplication, same
    // full-message load, same ordering.
    //
    // A failure here must not cost the caller anything - live arrivals keep
    // working - so it is reported as sweepError rather than raised, and a sweep
    // refused for too many requests runs again once the back-off is over.
    // `manual` is a sweep the user asked for (Refresh): it always goes out.
    // The automatic one, on every socket join, holds off after a 429.
    const recoverUnread = useCallback(async ({ manual = false } = {}) => {
        const token = inboxRef.current?.token;
        if (!token || recovering.current) return;

        // Just after a 429 the request would most likely be refused too. The
        // automatic sweep waits the back-off out instead, then runs, so what
        // arrived meanwhile is still recovered.
        const wait = manual ? 0 : rateLimitedFor();
        if (wait > 0) {
            clearTimeout(deferredSweep.current);
            deferredSweep.current = setTimeout(() => sweepRef.current?.(), wait + 1000);
            return;
        }

        // Same guard as a single message load: without a timeout, one request
        // that never settles would leave `recovering` stuck on and silently end
        // recovery for good.
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        recovering.current = true;
        let swept = false;

        try {
            const unread = await fetchUnreadMessages(token, {
                inboxId: inboxRef.current?.id,
                signal: controller.signal,
            });
            setSweepError(null);
            unread.forEach(handleMessageNew);
            swept = true;
        } catch (err) {
            console.error("[useMessages] could not recover unread messages", err);
            setSweepError(err);
            const backoff = rateLimitedFor();
            if (backoff > 0) {
                clearTimeout(deferredSweep.current);
                deferredSweep.current = setTimeout(() => sweepRef.current?.(), backoff + 1000);
            }
        } finally {
            clearTimeout(timer);
            recovering.current = false;
        }

        // What the sweep found is on screen before the list counts as checked.
        if (swept) await queue.current;
        setSynced(true);
    }, [handleMessageNew]);

    useEffect(() => {
        sweepRef.current = recoverUnread;
    }, [recoverUnread]);

    useEffect(() => {
        if (!inbox?.address || !inbox?.token) return;

        // A different inbox means a different message history (its list was
        // emptied while rendering, above).
        seenIds.current = new Set();
        queue.current = Promise.resolve();
        retries.current = new Map();
        const pendingRetries = retryTimers.current;

        // Created a tick late on purpose: StrictMode tears this effect down and
        // re-runs it on mount, and a socket created synchronously would open a
        // WebSocket that the cleanup then aborts mid-handshake.
        let socket;
        const connectTimer = setTimeout(() => {
            socket = createInboxSocket({
                address: inbox.address,
                token: inbox.token,
                onMessageNew: handleMessageNew,
                onStatusChange: (status, detail) => {
                    setConnection(status);
                    if (status === SOCKET_STATUS.ERROR) {
                        setError(new Error(detail || "The live connection failed."));
                    } else if (status === SOCKET_STATUS.JOINED) {
                        setError(null);

                        // Every join, not just a re-join: a reloaded page has
                        // the same gap as a dropped socket, and it joins for the
                        // first time. Anything already on screen is skipped by id.
                        recoverUnread();
                    }
                },
            });
        }, 0);

        return () => {
            clearTimeout(connectTimer);
            clearTimeout(deferredSweep.current);
            pendingRetries.forEach(clearTimeout);
            pendingRetries.clear();
            socket?.close();
        };
    }, [inbox?.address, inbox?.token, handleMessageNew, recoverUnread]);

    // Recovery is unread-only, because that is the only sweep the API offers:
    // GET /inbox/messages/unread/all. There is still no all-messages endpoint,
    // and GET /inbox/messages/:id needs an id this client never learned, so a
    // message the server no longer counts as unread cannot be re-listed.
    //
    // `resync` is that same sweep, kept for a caller that wants to ask for one
    // by hand. Ids already on screen are skipped, so it is always safe to call.
    // The sweep, for a caller that wants one by hand - so never held off.
    const resync = useCallback(() => recoverUnread({ manual: true }), [recoverUnread]);

    return { messages, connection, error, synced, sweepError, resync, retry };
}
