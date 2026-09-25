// join-inbox must be re-emitted on every connect, reconnects included.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Exercises the real transport path so the io() call itself is covered; the
// fake socket stands in for what it returns.
const { ioMock } = vi.hoisted(() => ({ ioMock: vi.fn() }));

vi.mock("socket.io-client", () => ({ io: ioMock }));

vi.mock("../config.js", () => ({
    USE_MOCK: false,
    API_BASE: "https://host.test/server/api/v1",
    SOCKET_ORIGIN: "https://host.test/server",
    SOCKET_PATH: "/socket.io",
}));

import { createInboxSocket, SOCKET_STATUS } from "./inboxSocket.js";

function makeFakeSocket() {
    const handlers = new Map();

    return {
        on: vi.fn((event, cb) => {
            if (!handlers.has(event)) handlers.set(event, new Set());
            handlers.get(event).add(cb);
        }),
        off: vi.fn((event, cb) => {
            handlers.get(event)?.delete(cb);
        }),
        emit: vi.fn(),
        disconnect: vi.fn(),
        fire(event, ...args) {
            handlers.get(event)?.forEach((cb) => cb(...args));
        },
    };
}

const CREDENTIALS = { address: "user-abc@example.com", token: "raw-token" };

function setup(overrides = {}) {
    const socket = makeFakeSocket();
    ioMock.mockReturnValue(socket);

    const onMessageNew = vi.fn();
    const onStatusChange = vi.fn();

    const connection = createInboxSocket({
        ...CREDENTIALS,
        onMessageNew,
        onStatusChange,
        ...overrides,
    });

    return { socket, connection, onMessageNew, onStatusChange };
}

/** The ack callback we handed to the most recent join-inbox emit. */
function latestJoinAck(socket) {
    const call = socket.emit.mock.calls.at(-1);
    return call?.[2];
}

beforeEach(() => {
    ioMock.mockReset();
});

describe("createInboxSocket", () => {
    it("requires both an address and a token", () => {
        expect(() => createInboxSocket({ address: "a@b.c" })).toThrow();
        expect(() => createInboxSocket({ token: "t" })).toThrow();
    });

    it("connects to the configured origin, path and transports", () => {
        setup();

        expect(ioMock).toHaveBeenCalledTimes(1);
        const [url, options] = ioMock.mock.calls[0];
        expect(url).toBe("https://host.test/server");
        expect(options.path).toBe("/socket.io");
        expect(options.transports).toEqual(["websocket", "polling"]);
        expect(options.reconnection).toBe(true);
    });

    it("does not join before the connection is established", () => {
        const { socket } = setup();

        expect(socket.emit).not.toHaveBeenCalled();
    });

    it("joins the inbox with the address and token on connect", () => {
        const { socket, onStatusChange } = setup();

        socket.fire("connect");

        expect(socket.emit).toHaveBeenCalledTimes(1);
        expect(socket.emit).toHaveBeenCalledWith(
            "join-inbox",
            { address: CREDENTIALS.address, token: CREDENTIALS.token },
            expect.any(Function),
        );

        latestJoinAck(socket)({ success: true, room: "inbox:abc" });
        expect(onStatusChange).toHaveBeenCalledWith(
            SOCKET_STATUS.JOINED,
            "inbox:abc",
        );
    });

    it("re-joins the room after a reconnect", () => {
        const { socket } = setup();

        socket.fire("connect");
        latestJoinAck(socket)({ success: true, room: "inbox:abc" });

        // The transport drops; Socket.IO reconnects and fires `connect` again.
        socket.fire("disconnect", "transport close");
        socket.fire("connect");

        const joins = socket.emit.mock.calls.filter(
            ([event]) => event === "join-inbox",
        );
        expect(joins).toHaveLength(2);
        expect(joins[1][1]).toEqual({
            address: CREDENTIALS.address,
            token: CREDENTIALS.token,
        });
    });

    it("reports a failed join as an error rather than as joined", () => {
        const { socket, onStatusChange } = setup();

        socket.fire("connect");
        latestJoinAck(socket)({
            success: false,
            error: "invalid or expired inbox credentials",
        });

        expect(onStatusChange).toHaveBeenCalledWith(
            SOCKET_STATUS.ERROR,
            "invalid or expired inbox credentials",
        );
        expect(onStatusChange).not.toHaveBeenCalledWith(
            SOCKET_STATUS.JOINED,
            expect.anything(),
        );
    });

    it("passes message:new previews through", () => {
        const { socket, onMessageNew } = setup();
        const preview = {
            id: "msg-1",
            fromAddress: "sender@example.com",
            subject: "Verification code",
            receivedAt: "2026-09-17T09:00:00.000Z",
        };

        socket.fire("message:new", preview);

        expect(onMessageNew).toHaveBeenCalledWith(preview);
    });

    it("ignores a message:new payload with no id", () => {
        const { socket, onMessageNew } = setup();

        socket.fire("message:new", { subject: "no id here" });

        expect(onMessageNew).not.toHaveBeenCalled();
    });

    it("stops delivering events once closed", () => {
        const { socket, connection, onMessageNew } = setup();
        socket.fire("connect");

        connection.close();

        expect(socket.disconnect).toHaveBeenCalledTimes(1);

        socket.fire("message:new", { id: "msg-1" });
        socket.fire("connect");

        expect(onMessageNew).not.toHaveBeenCalled();
        // Still just the original join; close() unbound the connect handler.
        expect(socket.emit).toHaveBeenCalledTimes(1);
    });});
