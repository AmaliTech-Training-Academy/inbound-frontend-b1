import { describe, it, expect, vi, afterEach } from "vitest";
import { joinInbox, JOIN_ACK_TIMEOUT_MS } from "./inboxSocket.js";

const CREDS = { address: "mock-a@inbound.dev", token: "tok_abc" };

// Minimal stand-in: joinInbox only ever calls socket.emit(event, payload, ack).
function socketThatAcks(ack) {
    return {
        emit: vi.fn((event, payload, cb) => {
            if (ack !== undefined) cb(ack);
        }),
    };
}

afterEach(() => {
    vi.useRealTimers();
});

describe("joinInbox", () => {
    it("emits join-inbox with the address and token", async () => {
        const socket = socketThatAcks({ success: true, room: "inbox:1" });
        await joinInbox(socket, CREDS);

        expect(socket.emit).toHaveBeenCalledWith(
            "join-inbox",
            CREDS,
            expect.any(Function),
        );
    });

    it("resolves the server's success ack", async () => {
        const socket = socketThatAcks({ success: true, room: "inbox:abc" });
        await expect(joinInbox(socket, CREDS)).resolves.toEqual({
            success: true,
            room: "inbox:abc",
        });
    });

    it("resolves - not rejects - when the server refuses", async () => {
        // A refused join is an expected outcome the UI renders, not a crash.
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const socket = socketThatAcks({
            success: false,
            error: "invalid or expired inbox credentials",
        });

        await expect(joinInbox(socket, CREDS)).resolves.toMatchObject({
            success: false,
            error: "invalid or expired inbox credentials",
        });
        expect(spy).toHaveBeenCalled();
    });

    it("treats an empty acknowledgement as a failure", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const socket = socketThatAcks(null);
        await expect(joinInbox(socket, CREDS)).resolves.toMatchObject({
            success: false,
        });
    });

    it("rejects if the ack never arrives", async () => {
        vi.useFakeTimers();
        vi.spyOn(console, "error").mockImplementation(() => {});
        const socket = socketThatAcks(undefined); // never calls back

        const pending = joinInbox(socket, CREDS);
        const assertion = expect(pending).rejects.toThrow(/not acknowledged/i);
        await vi.advanceTimersByTimeAsync(JOIN_ACK_TIMEOUT_MS + 1);
        await assertion;
    });

    it("ignores a late ack that arrives after the timeout", async () => {
        vi.useFakeTimers();
        vi.spyOn(console, "error").mockImplementation(() => {});

        let late;
        const socket = { emit: vi.fn((_e, _p, cb) => (late = cb)) };

        const pending = joinInbox(socket, CREDS);
        const assertion = expect(pending).rejects.toThrow();
        await vi.advanceTimersByTimeAsync(JOIN_ACK_TIMEOUT_MS + 1);
        await assertion;

        // Must not throw "resolve after reject" or otherwise misbehave.
        expect(() => late({ success: true })).not.toThrow();
    });
});
