// Owns the live message list for one inbox: subscription, retrieval, ordering
// and de-duplication. useInbox keeps owning the inbox lifecycle itself.

import { useCallback, useEffect, useRef, useState } from "react";
import { createInboxSocket, SOCKET_STATUS } from "../services/inboxSocket.js";
import { fetchMessage, fetchUnreadMessages } from "../services/inboxApi.js";
// TEMPORARY LATENCY DIAGNOSTICS - observation only: none of these calls change
// control flow, ordering or timing. See utils/timingLog.js.
import {
    noteArrival,
    noteQueued,
    noteFetchStarted,
    noteFetchReturned,
    noteRetry,
    noteRetryStarted,
    noteInserted,
    noteStage,
    noteSweepStarted,
    noteSweepReturned,
} from "../utils/timingLog.js";

// The ingest webhook answers 202, so a message can be announced before it is
// parsed. One retry covers that window; anything still PENDING falls back to
// the preview row.
const PENDING_RETRY_MS = 700;

// Lookups run one at a time (see the queue), so a request that never settles
// would stall everything behind it. fetchMessage has no timeout of its own.
const FETCH_TIMEOUT_MS = 8000;

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
        // TEMPORARY DIAGNOSTICS: where the queue actually reaches this message,
        // so it sits after any wait behind earlier fetches.
        noteFetchStarted(id, 1);

        const first = await fetchMessage(id, token, { signal });
        noteFetchReturned(id, first?.status, 1, first); // TEMPORARY DIAGNOSTICS

        if (first?.status !== "PENDING") return first;

        // TEMPORARY DIAGNOSTICS: the retry is why a message can appear a
        // further ~700ms late.
        noteRetry(id, PENDING_RETRY_MS);
        await delay(PENDING_RETRY_MS);

        noteRetryStarted(id); // TEMPORARY DIAGNOSTICS
        const second = await fetchMessage(id, token, { signal });
        noteFetchReturned(id, second?.status, 2, second); // TEMPORARY DIAGNOSTICS
        return second;
    } catch (err) {
        console.error("[useMessages] could not load message", id, err);
        noteStage(id, "[!] fetch failed", String(err?.message ?? err)); // TEMPORARY DIAGNOSTICS
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export function useMessages(inbox) {
    const [messages, setMessages] = useState([]);
    const [connection, setConnection] = useState(SOCKET_STATUS.CONNECTING);
    const [error, setError] = useState(null);

    // Ids already accepted, checked before the fetch so a replayed event costs
    // nothing. A ref because the socket handler needs it synchronously.
    const seenIds = useRef(new Set());

    // Fetches run one at a time, so a burst becomes a queue rather than a
    // thundering herd.
    const queue = useRef(Promise.resolve());

    // A flapping connection can re-join twice before the first recovery
    // settles; the second sweep would find nothing new, so it is skipped.
    const recovering = useRef(false);

    // The socket is created once per inbox, so it reads credentials through a
    // ref rather than closing over a value that can go stale.
    const inboxRef = useRef(inbox);
    inboxRef.current = inbox;

    const insert = useCallback((message) => {
        // TEMPORARY DIAGNOSTICS: logged as the row goes into state. React
        // commits the re-render right after, so `rendered` follows closely.
        noteInserted(message.id);

        setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message].sort(byReceivedAtDesc);
        });
    }, []);

    // TEMPORARY DIAGNOSTICS: how many fetches are outstanding at any moment -
    // the number a live arrival ends up waiting behind. Book-keeping only:
    // nothing reads it to make a decision.
    const pendingFetches = useRef(0);

    const enqueue = useCallback((task) => {
        pendingFetches.current += 1; // TEMPORARY DIAGNOSTICS
        queue.current = queue.current
            .then(task)
            .catch((err) => {
                // A rejected task must not break the chain behind it.
                console.error("[useMessages] queued task failed", err);
            })
            .finally(() => {
                pendingFetches.current -= 1; // TEMPORARY DIAGNOSTICS
            });
        return queue.current;
    }, []);

    // One arrival, whichever way it was announced: the socket's message:new, or
    // a row of the unread list after a re-join. Ids are claimed here, before the
    // fetch, so an event the two paths both report costs one request and renders
    // one row.
    const handleMessageNew = useCallback(
        (partial) => {
            if (!partial?.id) return;

            // TEMPORARY DIAGNOSTICS: a no-op for a socket arrival, which the
            // socket already stamped. For a recovery row this is the arrival,
            // and it is labelled so the two are never confused.
            noteArrival(partial.id, partial, "recovery sweep");

            if (seenIds.current.has(partial.id)) {
                noteStage(partial.id, "skipped (already accepted)"); // TEMPORARY DIAGNOSTICS
                return;
            }
            seenIds.current.add(partial.id);

            const token = inboxRef.current?.token;
            if (!token) return;

            enqueue(async () => {
                const full = await loadFullMessage(partial.id, token);
                insert(full ?? toPreviewRow(partial));
            });

            // TEMPORARY DIAGNOSTICS: depth counts this task too, so "ahead" is
            // how many fetches must finish before this message's fetch starts.
            noteQueued(partial.id, pendingFetches.current - 1);
        },
        [enqueue, insert],
    );

    // Reconnect recovery. A re-join restores the transport but not the messages
    // that arrived while it was down, so the unread endpoint is the only way
    // back to them. Unread rows are list-shaped, so they go through
    // handleMessageNew exactly like a socket preview: same de-duplication, same
    // full-message load, same ordering.
    //
    // A failure here must not cost the caller anything - live arrivals keep
    // working - so it is logged and swallowed rather than raised.
    const recoverUnread = useCallback(async () => {
        const token = inboxRef.current?.token;
        if (!token || recovering.current) return;

        // Same guard as a single message load: without a timeout, one request
        // that never settles would leave `recovering` stuck on and silently end
        // recovery for good.
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        recovering.current = true;
        noteSweepStarted(); // TEMPORARY DIAGNOSTICS

        try {
            const unread = await fetchUnreadMessages(token, {
                signal: controller.signal,
            });

            // TEMPORARY DIAGNOSTICS: every row below becomes one fetch queued
            // ahead of anything that arrives while the sweep drains, so this
            // count is the length of the queue a live message lands behind.
            noteSweepReturned(unread.length);

            unread.forEach(handleMessageNew);
        } catch (err) {
            console.error("[useMessages] could not recover unread messages", err);
        } finally {
            clearTimeout(timer);
            recovering.current = false;
        }
    }, [handleMessageNew]);

    useEffect(() => {
        if (!inbox?.address || !inbox?.token) return;

        // A different inbox means a different message history.
        seenIds.current = new Set();
        queue.current = Promise.resolve();
        setMessages([]);
        setError(null);
        setConnection(SOCKET_STATUS.CONNECTING);

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
    return { messages, connection, error, resync: recoverUnread };
}
