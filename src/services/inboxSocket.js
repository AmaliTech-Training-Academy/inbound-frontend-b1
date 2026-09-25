import { io } from "socket.io-client";
import { SOCKET_ORIGIN, SOCKET_PATH, USE_MOCK } from "../config.js";
// TEMPORARY LATENCY DIAGNOSTICS - observation only, see utils/timingLog.js.
import { noteArrival } from "../utils/timingLog.js";

export const SOCKET_STATUS = {
    CONNECTING: "connecting",
    CONNECTED: "connected",
    JOINED: "joined",
    DISCONNECTED: "disconnected",
    ERROR: "error",
};

export function createInboxSocket({
    address,
    token,
    onMessageNew,
    onStatusChange,
} = {}) {
    if (!address || !token) {
        throw new Error(
            "createInboxSocket needs both an address and a token to join an inbox.",
        );
    }

    const report = (status, detail) => {
        if (typeof onStatusChange === "function") onStatusChange(status, detail);
    };

    const socket = USE_MOCK
        ? createMockSocket()
        : io(SOCKET_ORIGIN, {
              path: SOCKET_PATH,
              transports: ["websocket", "polling"],
              reconnection: true,
          });

    // Bound to `connect`, not run once: the server does not restore room
    // membership after a drop, so every reconnect needs a fresh join.
    const handleConnect = () => {
        report(SOCKET_STATUS.CONNECTED);

        socket.emit("join-inbox", { address, token }, (ack) => {
            if (ack?.success) {
                report(SOCKET_STATUS.JOINED, ack.room);
                return;
            }

            // A failed ack means connected but receiving nothing, so it must
            // not be reported as joined.
            console.error("[inboxSocket] join-inbox was rejected:", ack?.error);
            report(
                SOCKET_STATUS.ERROR,
                ack?.error || "unable to validate inbox credentials",
            );
        });
    };

    const handleMessageNew = (payload) => {
        if (!payload?.id) return;

        // TEMPORARY DIAGNOSTICS: the true arrival moment - the first point in
        // the app the browser has seen this event, before any handling.
        noteArrival(payload.id, payload, "socket");

        if (typeof onMessageNew === "function") onMessageNew(payload);
    };

    // Socket.IO reconnects on its own; this only surfaces the state.
    const handleDisconnect = (reason) => {
        report(SOCKET_STATUS.DISCONNECTED, reason);
    };

    const handleConnectError = (err) => {
        console.error("[inboxSocket] connection error", err);
        report(SOCKET_STATUS.ERROR, err?.message);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("message:new", handleMessageNew);

    report(SOCKET_STATUS.CONNECTING);

    return {
        close() {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleConnectError);
            socket.off("message:new", handleMessageNew);
            socket.disconnect();
        },
    };
}

// Stands in for the real socket when there is no API to connect to. Call
// window.__inboundSimulateMessage({...}) to fire a message:new by hand.
const mockSockets = new Set();

function createMockSocket() {
    const handlers = new Map();

    const on = (event, cb) => {
        if (!handlers.has(event)) handlers.set(event, new Set());
        handlers.get(event).add(cb);
    };

    const off = (event, cb) => {
        handlers.get(event)?.delete(cb);
    };

    const fire = (event, ...args) => {
        handlers.get(event)?.forEach((cb) => cb(...args));
    };

    // Mirrors the real signature; only the ack matters here.
    const emit = (...args) => {
        const [event, , ack] = args;
        if (event === "join-inbox") {
            setTimeout(() => ack?.({ success: true, room: "inbox:mock" }), 0);
        }
    };

    const socket = {
        on,
        off,
        emit,
        disconnect() {
            mockSockets.delete(socket);
            fire("disconnect", "io client disconnect");
        },
        __fire: fire,
    };

    mockSockets.add(socket);

    // Async so listeners are attached first, like the real client.
    setTimeout(() => fire("connect"), 0);

    if (typeof window !== "undefined") {
        window.__inboundSimulateMessage = (payload) => {
            mockSockets.forEach((s) => s.__fire("message:new", payload));
        };
    }

    return socket;
}
