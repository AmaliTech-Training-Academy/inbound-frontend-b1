import { io } from "socket.io-client";
import { SOCKET_ORIGIN, SOCKET_PATH, USE_MOCK } from "../config.js";
import { messagesFor } from "./mockBackend.js";

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
        ? createMockSocket({ address, token })
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

            // A failed ack means connected but receiving nothing, so it must not be reported as joined.
            console.error("[inboxSocket] join-inbox was rejected:", ack?.error);
            report(
                SOCKET_STATUS.ERROR,
                ack?.error || "unable to validate inbox credentials",
            );
        });
    };

    const handleMessageNew = (payload) => {
        if (!payload?.id) return;

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

// --- Mock transport --------------------------------------------------
// Stands in for the real socket when there is no API to connect to. Joining an
// inbox replays that inbox's seeded mail as live arrivals, so the list fills the
// same way it does against the real server.

const mockSockets = new Set();

// Spaced out so the arrivals land one at a time, as they would off a real feed.
const REPLAY_INTERVAL_MS = 120;

function createMockSocket({ address, token }) {
    const handlers = new Map();
    let replayTimers = [];

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

    // Each seeded message arrives as its own message:new, which is also what
    // exercises the client's id de-duplication against the unread sweep.
    const replaySeedMessages = () => {
        replayTimers = messagesFor(token).map((message, index) =>
            setTimeout(
                () => fire("message:new", message),
                index * REPLAY_INTERVAL_MS,
            ),
        );
    };

    // Mirrors the real signature; only the ack matters here.
    const emit = (...args) => {
        const [event, , ack] = args;
        if (event !== "join-inbox") return;

        setTimeout(() => {
            ack?.({ success: true, room: `inbox:${address}` });
            replaySeedMessages();
        }, 0);
    };

    const socket = {
        on,
        off,
        emit,
        disconnect() {
            replayTimers.forEach(clearTimeout);
            replayTimers = [];
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
