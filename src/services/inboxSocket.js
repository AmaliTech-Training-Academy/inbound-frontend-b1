import { io } from "socket.io-client";
import { SOCKET_ORIGIN, SOCKET_PATH, USE_MOCK } from "../config.js";
import { rememberMockMessage, sampleMessages } from "./mockMail.js";

const JOIN_TIMEOUT_MS = 10_000;
const JOIN_RETRY_MS = [2_000, 5_000, 10_000, 30_000];

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

    // A rejected or unanswered join leaves the socket connected but receiving
    // nothing, so it is asked again, a little later each time, for as long as
    // the socket stays connected. A drop needs no retry: the reconnect joins.
    let connected = false;
    let closed = false;
    let joinAttempt = 0;
    let ackTimer = null;
    let retryTimer = null;

    const join = () => {
        let settled = false;

        const failed = (reason) => {
            if (settled || closed) return;
            settled = true;
            console.error("[inboxSocket] join-inbox failed:", reason);
            report(SOCKET_STATUS.ERROR, reason);
            if (!connected) return;
            const wait = JOIN_RETRY_MS[Math.min(joinAttempt, JOIN_RETRY_MS.length - 1)];
            joinAttempt += 1;
            retryTimer = setTimeout(join, wait);
        };

        clearTimeout(ackTimer);
        ackTimer = setTimeout(() => failed("the server did not answer"), JOIN_TIMEOUT_MS);

        socket.emit("join-inbox", { address, token }, (ack) => {
            clearTimeout(ackTimer);
            if (settled || closed) return;
            if (!ack?.success) {
                failed(ack?.error || "unable to validate inbox credentials");
                return;
            }
            settled = true;
            joinAttempt = 0;
            report(SOCKET_STATUS.JOINED, ack.room);
        });
    };

    // Bound to `connect`, not run once: the server does not restore room
    // membership after a drop, so every reconnect needs a fresh join.
    const handleConnect = () => {
        connected = true;
        joinAttempt = 0;
        clearTimeout(retryTimer);
        report(SOCKET_STATUS.CONNECTED);
        join();
    };

    const handleMessageNew = (payload) => {
        if (!payload?.id) return;
        if (typeof onMessageNew === "function") onMessageNew(payload);
    };

    // Socket.IO reconnects on its own; this only surfaces the state.
    const handleDisconnect = (reason) => {
        connected = false;
        clearTimeout(retryTimer);
        clearTimeout(ackTimer);
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
            closed = true;
            clearTimeout(retryTimer);
            clearTimeout(ackTimer);
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

    // Mirrors the real signature; only the ack matters here. The address it
    // joined is kept so a simulated message can be sent to one inbox.
    const emit = (...args) => {
        const [event, credentials, ack] = args;
        if (event === "join-inbox") {
            socket.address = credentials?.address;
            setTimeout(() => ack?.({ success: true, room: "inbox:mock" }), 0);
        }
    };

    const socket = {
        on,
        off,
        emit,
        address: null,
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
        // With a `to` address, only that inbox hears it; without one, every
        // open inbox does. The message is remembered, so opening it shows what
        // was sent (see mockMail.js).
        window.__inboundSimulateMessage = (payload) => {
            rememberMockMessage(payload);
            mockSockets.forEach((s) => {
                if (!payload?.to || payload.to === s.address) s.__fire("message:new", payload);
            });
        };

        // The full set of samples, half a second apart, so they land as a
        // live burst rather than all at once.
        window.__inboundSendSamples = (to) => {
            const samples = sampleMessages(to);
            samples.forEach((message, index) => {
                // Stamped as it is sent, so the list puts the newest on top.
                setTimeout(
                    () =>
                        window.__inboundSimulateMessage({
                            ...message,
                            to,
                            receivedAt: new Date().toISOString(),
                        }),
                    index * 500,
                );
            });
            return `Sending ${samples.length} sample messages${to ? ` to ${to}` : ""}.`;
        };
    }

    return socket;
}
