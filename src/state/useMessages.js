// Owns the live message list for one inbox: subscription, retrieval, ordering
// and de-duplication. useInbox keeps owning the inbox lifecycle itself.

import { useCallback, useEffect, useRef, useState } from "react";
import { createInboxSocket, SOCKET_STATUS } from "../services/inboxSocket.js";
import { fetchMessage } from "../services/inboxApi.js";

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
// that something arrived, which beats the message never appearing at all.
function toPreviewRow(partial) {
    return {
        id: partial.id,
        subject: partial.subject ?? null,
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
    } catch (err) {
        console.error("[useMessages] could not load message", id, err);
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

    // The socket is created once per inbox, so it reads credentials through a
    // ref rather than closing over a value that can go stale.
    const inboxRef = useRef(inbox);
    inboxRef.current = inbox;

    const insert = useCallback((message) => {
        setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message].sort(byReceivedAtDesc);
        });
    }, []);

    const enqueue = useCallback((task) => {
        queue.current = queue.current.then(task).catch((err) => {
            // A rejected task must not break the chain behind it.
            console.error("[useMessages] queued task failed", err);
        });
        return queue.current;
    }, []);

    const handleMessageNew = useCallback(
        (partial) => {
            if (!partial?.id) return;
            if (seenIds.current.has(partial.id)) return;
            seenIds.current.add(partial.id);

            const token = inboxRef.current?.token;
            if (!token) return;

            enqueue(async () => {
                const full = await loadFullMessage(partial.id, token);
                insert(full ?? toPreviewRow(partial));
            });
        },
        [enqueue, insert],
    );

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
                    }
                },
            });
        }, 0);

        return () => {
            clearTimeout(connectTimer);
            socket?.close();
        };
    }, [inbox?.address, inbox?.token, handleMessageNew]);

    // Not implemented: mail that arrived while the socket was down. The API
    // only exposes GET /inbox/messages/{id}, which needs an id this client can
    // never learn for a message it did not see, and there is no list, unread or
    // ?since= endpoint to query. Reconnect itself is handled - the socket
    // re-joins on every connect - so only the gap needs backend support.
    const resync = useCallback(() => Promise.resolve(), []);

    return { messages, connection, error, resync };
}
