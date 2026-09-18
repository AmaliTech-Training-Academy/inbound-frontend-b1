// Socket.IO client for the live inbox (IND-7).
//
// Contract, as implemented by the backend in src/configs/websocket.js:
//
//   emit  "join-inbox"  { address, token }
//         ack           { success: true,  room: "inbox:<uuid>" }
//                       { success: false, error: "<reason>" }
//   on    "message:new" { id, fromAddress, subject, receivedAt }
//
// Two behaviours of the server that shape the client:
//
//  1. A socket belongs to exactly one inbox room. The server leaves any
//     previous "inbox:" room before joining the new one, so switching inboxes
//     is a re-emit of join-inbox on the same connection, NOT a reconnect.
//  2. Room membership lives on the connection. Any reconnect — including
//     socket.io's own automatic one — starts the socket in no room at all, so
//     join-inbox has to be re-emitted on every "connect", not just the first.

import { io } from "socket.io-client";
import { WS_BASE, USE_MOCK } from "../config.js";

// The server acks join-inbox after a DB lookup. If nothing comes back the
// socket is connected but silently in no room, which looks identical to an
// empty inbox — so fail loudly instead of waiting forever.
export const JOIN_ACK_TIMEOUT_MS = 8000;

export function createInboxSocket() {
    if (USE_MOCK) return createMockSocket();

    return io(WS_BASE, {
        // The backend mounts socket.io at the default path on its own origin.
        //
        // Both transports, as the API docs specify. Restricting this to
        // ["websocket"] removes socket.io's fallback, so any proxy that
        // blocks the upgrade takes the live inbox down entirely instead of
        // degrading to long-polling.
        transports: ["websocket", "polling"],
        withCredentials: false,
    });
}

/**
 * Emit join-inbox and resolve with the server's ack.
 *
 * Resolves `{ success: false, error }` rather than rejecting on a refused
 * join: an expired or unknown inbox is an expected outcome the UI renders,
 * not an exception. Rejects only when the ack never arrives.
 */
export function joinInbox(socket, { address, token }) {
    return new Promise((resolve, reject) => {
        let settled = false;

        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            const err = new Error(
                `join-inbox was not acknowledged within ${JOIN_ACK_TIMEOUT_MS}ms`,
            );
            console.error("[inboxSocket] join-inbox timed out", err);
            reject(err);
        }, JOIN_ACK_TIMEOUT_MS);

        socket.emit("join-inbox", { address, token }, (ack) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);

            if (!ack?.success) {
                console.error(
                    "[inboxSocket] join-inbox refused",
                    ack?.error ?? "no reason given",
                );
            }
            resolve(ack ?? { success: false, error: "empty acknowledgement" });
        });
    });
}

// --- Mock socket -----------------------------------------------------------
// USE_MOCK means there is no server to talk to, and pointing socket.io at a
// dead origin just produces an endless reconnect loop in the console. This
// stand-in implements the slice of the socket.io surface the hook uses, and
// accepts any join, so the inbox UI can be built before the backend is up.
//
// In the browser it exposes window.__inboundMockMessage(partial) to push a
// message into the open inbox by hand.
function createMockSocket() {
    const listeners = new Map();
    let connected = false;

    const emitLocal = (event, payload) => {
        for (const fn of listeners.get(event) ?? []) fn(payload);
    };

    const socket = {
        get connected() {
            return connected;
        },
        on(event, fn) {
            if (!listeners.has(event)) listeners.set(event, new Set());
            listeners.get(event).add(fn);
            return socket;
        },
        off(event, fn) {
            listeners.get(event)?.delete(fn);
            return socket;
        },
        emit(event, _payload, ack) {
            if (event === "join-inbox") {
                ack?.({ success: true, room: "inbox:mock" });
            }
            return socket;
        },
        disconnect() {
            if (!connected) return socket;
            connected = false;
            emitLocal("disconnect", "io client disconnect");
            return socket;
        },
        // Test/dev seam: deliver a message as though the server had pushed it.
        __deliver(message) {
            emitLocal("message:new", message);
        },
    };

    // Connect on the next tick so listeners registered synchronously after
    // creation still see the "connect" event, matching the real client.
    setTimeout(() => {
        connected = true;
        emitLocal("connect");
    }, 0);

    if (typeof window !== "undefined") {
        let n = 0;
        window.__inboundMockMessage = (partial = {}) => {
            n += 1;
            socket.__deliver({
                id: `mock-msg-${n}-${Date.now()}`,
                fromAddress: `sender${n}@example.com`,
                subject: `Test message ${n}`,
                receivedAt: new Date().toISOString(),
                ...partial,
            });
        };
    }

    return socket;
}
