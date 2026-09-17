import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// The hook is the unit under test, so the transport is replaced with a fake
// socket we can drive: connect, reconnect, deliver, disconnect.
vi.mock("../services/inboxSocket.js", () => ({
    createInboxSocket: vi.fn(() => makeFakeSocket()),
    joinInbox: vi.fn(async () => ({ success: true, room: "inbox:1" })),
    JOIN_ACK_TIMEOUT_MS: 8000,
}));

import { useInboxSocket } from "./useInboxSocket.js";
import { createInboxSocket, joinInbox } from "../services/inboxSocket.js";

let sockets = [];

function makeFakeSocket() {
    const listeners = new Map();
    const socket = {
        connected: false,
        disconnect: vi.fn(() => {
            socket.connected = false;
        }),
        on(event, fn) {
            if (!listeners.has(event)) listeners.set(event, new Set());
            listeners.get(event).add(fn);
            return socket;
        },
        off(event, fn) {
            listeners.get(event)?.delete(fn);
            return socket;
        },
        emit: vi.fn(),
        fire(event, payload) {
            for (const fn of listeners.get(event) ?? []) fn(payload);
        },
        connect() {
            socket.connected = true;
            socket.fire("connect");
        },
    };
    sockets.push(socket);
    return socket;
}

const inboxA = { address: "a@inbound.dev", token: "tok_a" };
const inboxB = { address: "b@inbound.dev", token: "tok_b" };

const msg = (id, seconds, extra = {}) => ({
    id,
    fromAddress: `${id}@example.com`,
    subject: `Subject ${id}`,
    receivedAt: new Date(Date.UTC(2026, 8, 16, 10, 0, seconds)).toISOString(),
    ...extra,
});

beforeEach(() => {
    sockets = [];
    createInboxSocket.mockClear();
    joinInbox.mockClear();
    joinInbox.mockResolvedValue({ success: true, room: "inbox:1" });
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("useInboxSocket", () => {
    it("stays idle and opens no socket without an inbox", () => {
        const { result } = renderHook(() => useInboxSocket(null));

        expect(result.current.status).toBe("idle");
        expect(result.current.messages).toEqual([]);
        expect(createInboxSocket).not.toHaveBeenCalled();
    });

    it("joins once connected and reports the inbox live", async () => {
        const { result } = renderHook(() => useInboxSocket(inboxA));
        expect(result.current.status).toBe("connecting");

        await act(async () => sockets[0].connect());

        expect(joinInbox).toHaveBeenCalledWith(sockets[0], inboxA);
        await waitFor(() => expect(result.current.isLive).toBe(true));
    });

    it("appends messages as they arrive", async () => {
        const { result } = renderHook(() => useInboxSocket(inboxA));
        await act(async () => sockets[0].connect());

        await act(async () => sockets[0].fire("message:new", msg("m1", 1)));
        await act(async () => sockets[0].fire("message:new", msg("m2", 2)));

        expect(result.current.messages.map((m) => m.id)).toEqual(["m2", "m1"]);
    });

    it("orders by received time, not arrival order", async () => {
        // AC: the list stays correct when several arrive in quick succession.
        const { result } = renderHook(() => useInboxSocket(inboxA));
        await act(async () => sockets[0].connect());

        await act(async () => {
            sockets[0].fire("message:new", msg("older", 1));
            sockets[0].fire("message:new", msg("newest", 9));
            sockets[0].fire("message:new", msg("middle", 5));
        });

        expect(result.current.messages.map((m) => m.id)).toEqual([
            "newest",
            "middle",
            "older",
        ]);
    });

    it("ignores a redelivered message", async () => {
        const { result } = renderHook(() => useInboxSocket(inboxA));
        await act(async () => sockets[0].connect());

        await act(async () => sockets[0].fire("message:new", msg("dup", 1)));
        await act(async () => sockets[0].fire("message:new", msg("dup", 1)));

        expect(result.current.messages).toHaveLength(1);
    });

    it("ignores a payload with no id", async () => {
        const { result } = renderHook(() => useInboxSocket(inboxA));
        await act(async () => sockets[0].connect());

        await act(async () => sockets[0].fire("message:new", { subject: "x" }));

        expect(result.current.messages).toEqual([]);
    });

    it("re-joins after a reconnect, because rooms do not survive one", async () => {
        const { result } = renderHook(() => useInboxSocket(inboxA));
        await act(async () => sockets[0].connect());
        await waitFor(() => expect(result.current.isLive).toBe(true));

        await act(async () => sockets[0].fire("disconnect", "transport close"));
        expect(result.current.status).toBe("connecting");

        await act(async () => sockets[0].connect());

        expect(joinInbox).toHaveBeenCalledTimes(2);
        await waitFor(() => expect(result.current.isLive).toBe(true));
    });

    it("surfaces a refused join", async () => {
        joinInbox.mockResolvedValue({
            success: false,
            error: "invalid or expired inbox credentials",
        });

        const { result } = renderHook(() => useInboxSocket(inboxA));
        await act(async () => sockets[0].connect());

        await waitFor(() => expect(result.current.status).toBe("error"));
        expect(result.current.error.message).toBe(
            "invalid or expired inbox credentials",
        );
    });

    it("surfaces an unacknowledged join", async () => {
        joinInbox.mockRejectedValue(new Error("timed out"));

        const { result } = renderHook(() => useInboxSocket(inboxA));
        await act(async () => sockets[0].connect());

        await waitFor(() => expect(result.current.status).toBe("error"));
        expect(result.current.error.message).toMatch(/lost contact/i);
    });

    it("drops to connecting when the connection fails", async () => {
        const { result } = renderHook(() => useInboxSocket(inboxA));
        await act(async () => sockets[0].connect());
        await waitFor(() => expect(result.current.isLive).toBe(true));

        await act(async () =>
            sockets[0].fire("connect_error", new Error("refused")),
        );

        expect(result.current.status).toBe("connecting");
        expect(result.current.isLive).toBe(false);
    });

    it("switches inbox by re-joining the same socket, not reconnecting", async () => {
        // The server leaves the previous room itself, so a teardown would cost
        // a reconnect for nothing.
        const { result, rerender } = renderHook(
            ({ inbox }) => useInboxSocket(inbox),
            { initialProps: { inbox: inboxA } },
        );
        await act(async () => sockets[0].connect());
        await act(async () => sockets[0].fire("message:new", msg("old", 1)));
        expect(result.current.messages).toHaveLength(1);

        await act(async () => rerender({ inbox: inboxB }));

        expect(createInboxSocket).toHaveBeenCalledTimes(1);
        expect(sockets[0].disconnect).not.toHaveBeenCalled();
        expect(joinInbox).toHaveBeenLastCalledWith(sockets[0], inboxB);
        // The previous inbox's mail must not linger in the new one.
        expect(result.current.messages).toEqual([]);
    });

    it("closes the socket on unmount", async () => {
        const { unmount } = renderHook(() => useInboxSocket(inboxA));
        await act(async () => sockets[0].connect());

        unmount();

        expect(sockets[0].disconnect).toHaveBeenCalled();
    });
});
