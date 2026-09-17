// Live inbox subscription (IND-7).
//
// Keeps one socket open for as long as the page has an inbox, syncs the
// message list from "message:new", and re-joins on every reconnect.
//
// status:
//   'idle'        - no inbox to watch
//   'connecting'  - socket down or joining; live updates are NOT arriving
//   'live'        - joined a room; messages will stream in
//   'error'       - credentials refused, or the join was never acknowledged

import { useCallback, useEffect, useRef, useState } from "react";
import { createInboxSocket, joinInbox } from "../services/inboxSocket.js";

// Newest first. Sorting rather than blindly prepending keeps the order right
// when several messages land in the same tick, and will keep it right when a
// backfill later merges older messages into a list that already has newer
// ones.
function byNewestFirst(a, b) {
    const diff = new Date(b.receivedAt) - new Date(a.receivedAt);
    if (!Number.isNaN(diff) && diff !== 0) return diff;
    // Equal or unparseable timestamps: fall back to id so the order is stable
    // across renders instead of depending on arrival sequence.
    return String(b.id).localeCompare(String(a.id));
}

export function useInboxSocket(inbox) {
    const address = inbox?.address ?? null;
    const token = inbox?.token ?? null;

    const [messages, setMessages] = useState([]);
    const [status, setStatus] = useState(address ? "connecting" : "idle");
    const [error, setError] = useState(null);

    // Switching inbox is a new list. Adjusting state during render is React's
    // own recommended pattern for this and avoids the cascading extra render
    // that resetting inside an effect would cause.
    const [watchedAddress, setWatchedAddress] = useState(address);
    if (watchedAddress !== address) {
        setWatchedAddress(address);
        setMessages([]);
        setError(null);
        setStatus(address ? "connecting" : "idle");
    }

    // The "connect" handler is registered once per socket but must always join
    // with the credentials current at the time it fires, so it reads them from
    // a ref. Written in an effect, never during render.
    const credentials = useRef({ address, token });
    const socketRef = useRef(null);

    const addMessage = useCallback((message) => {
        if (!message?.id) return;
        setMessages((prev) =>
            // The server can legitimately redeliver after a reconnect, and a
            // future backfill will overlap with what already arrived live, so
            // dedupe on id rather than trusting arrival order.
            prev.some((m) => m.id === message.id)
                ? prev
                : [...prev, message].sort(byNewestFirst),
        );
    }, []);

    useEffect(() => {
        credentials.current = { address, token };

        if (!address || !token) return;

        const join = async (socket) => {
            const creds = credentials.current;
            if (!creds.address || !creds.token) return;

            try {
                const ack = await joinInbox(socket, creds);
                // Credentials may have changed while the ack was in flight.
                if (credentials.current.address !== creds.address) return;

                if (ack.success) {
                    setStatus("live");
                    setError(null);
                    // TODO(IND-7): messages that arrived while disconnected are
                    // still missing. The backend exposes no endpoint to list
                    // them - only GET /inbox/messages/:id - so the backfill is
                    // deliberately absent rather than faked.
                } else {
                    setStatus("error");
                    setError(
                        new Error(ack.error || "Could not join the inbox."),
                    );
                }
            } catch (err) {
                if (credentials.current.address !== creds.address) return;
                console.error("[useInboxSocket] join failed", err);
                setStatus("error");
                setError(new Error("Lost contact with the mail server."));
            }
        };

        let socket = socketRef.current;

        if (!socket) {
            socket = createInboxSocket();
            socketRef.current = socket;

            // Fires on the first connect AND on every automatic reconnect.
            // Room membership does not survive a reconnect, so re-joining here
            // is what stops the socket sitting connected but silently in no
            // room.
            socket.on("connect", () => join(socket));

            socket.on("disconnect", (reason) => {
                console.error("[useInboxSocket] socket disconnected", reason);
                setStatus("connecting");
            });

            socket.on("connect_error", (err) => {
                console.error("[useInboxSocket] connection error", err);
                setStatus("connecting");
            });

            socket.on("message:new", (message) => addMessage(message));
        }

        // An inbox switch on an already-open socket is just a re-join: the
        // server leaves the previous room for us, so tearing the connection
        // down would cost a reconnect for nothing.
        if (socket.connected) join(socket);
    }, [address, token, addMessage]);

    // The socket outlives credential changes, so it is closed only when the
    // component using the hook goes away.
    useEffect(() => {
        return () => {
            socketRef.current?.disconnect();
            socketRef.current = null;
        };
    }, []);

    return {
        messages,
        status,
        error,
        isLive: status === "live",
    };
}
