// What the list does with an arrival: fetch, order, de-duplicate, degrade.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
    createInboxSocket: vi.fn(),
    fetchMessage: vi.fn(),
}));

vi.mock("../services/inboxSocket.js", () => ({
    createInboxSocket: mocks.createInboxSocket,
    SOCKET_STATUS: {
        CONNECTING: "connecting",
        CONNECTED: "connected",
        JOINED: "joined",
        DISCONNECTED: "disconnected",
        ERROR: "error",
    },
}));

vi.mock("../services/inboxApi.js", () => ({
    fetchMessage: mocks.fetchMessage,
}));

import { useMessages } from "./useMessages.js";

const INBOX = { address: "user-abc@example.com", token: "raw-token" };

let socketOptions;
let closeMock;

function preview(id, receivedAt, subject = `Subject ${id}`) {
    return {
        id,
        fromAddress: "sender@example.com",
        subject,
        receivedAt,
    };
}

/** Deliver one message:new the way the socket would. */
async function deliver(payload) {
    await act(async () => {
        socketOptions.onMessageNew(payload);
    });
}

/** Renders the hook and lets the deferred socket creation run. */
async function renderMessages(inbox = INBOX) {
    const rendered = renderHook(() => useMessages(inbox));
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
    return rendered;
}

beforeEach(() => {
    mocks.createInboxSocket.mockReset();
    mocks.fetchMessage.mockReset();

    closeMock = vi.fn();
    socketOptions = null;

    mocks.createInboxSocket.mockImplementation((options) => {
        socketOptions = options;
        return { close: closeMock };
    });

    // Default: the full message comes back immediately.
    mocks.fetchMessage.mockImplementation(async (id) => ({
        id,
        subject: `Full ${id}`,
        sender: "Ada Lovelace <ada@example.com>",
        receivedAt: "2026-09-17T09:00:00.000Z",
    }));
});

describe("useMessages", () => {
    it("does not open a socket without an address and token", async () => {
        await renderMessages({ address: "a@b.c" });

        expect(mocks.createInboxSocket).not.toHaveBeenCalled();
    });

    it("subscribes using the inbox address and token", async () => {
        await renderMessages();

        expect(mocks.createInboxSocket).toHaveBeenCalledTimes(1);
        expect(mocks.createInboxSocket).toHaveBeenCalledWith(
            expect.objectContaining({
                address: INBOX.address,
                token: INBOX.token,
            }),
        );
    });

    it("fetches the full message when one arrives", async () => {
        const { result } = await renderMessages();

        await deliver(preview("msg-1", "2026-09-17T09:00:00.000Z"));

        await waitFor(() => expect(result.current.messages).toHaveLength(1));

        // Only the first two arguments: the third carries an abort signal,
        // which this test has no reason to pin.
        const [calledId, calledToken] = mocks.fetchMessage.mock.calls[0];
        expect(calledId).toBe("msg-1");
        expect(calledToken).toBe(INBOX.token);

        expect(result.current.messages[0].subject).toBe("Full msg-1");
    });

    it("records a repeated id only once", async () => {
        const { result } = await renderMessages();
        const payload = preview("msg-1", "2026-09-17T09:00:00.000Z");

        await deliver(payload);
        await deliver(payload);
        await deliver(payload);

        await waitFor(() => expect(result.current.messages).toHaveLength(1));
        expect(mocks.fetchMessage).toHaveBeenCalledTimes(1);
    });

    it("keeps every message from a burst, newest first", async () => {
        const { result } = await renderMessages();

        const times = {
            msg1: "2026-09-17T09:00:00.000Z",
            msg2: "2026-09-17T09:00:01.000Z",
            msg3: "2026-09-17T09:00:02.000Z",
            msg4: "2026-09-17T09:00:03.000Z",
            msg5: "2026-09-17T09:00:04.000Z",
        };

        mocks.fetchMessage.mockImplementation(async (id) => ({
            id,
            subject: `Full ${id}`,
            receivedAt: times[id],
        }));

        // Fired in one synchronous batch, out of chronological order.
        await act(async () => {
            socketOptions.onMessageNew(preview("msg3", times.msg3));
            socketOptions.onMessageNew(preview("msg1", times.msg1));
            socketOptions.onMessageNew(preview("msg5", times.msg5));
            socketOptions.onMessageNew(preview("msg2", times.msg2));
            socketOptions.onMessageNew(preview("msg4", times.msg4));
        });

        await waitFor(() => expect(result.current.messages).toHaveLength(5));
        expect(result.current.messages.map((m) => m.id)).toEqual([
            "msg5",
            "msg4",
            "msg3",
            "msg2",
            "msg1",
        ]);
    });

    it("retries once when the message is still PENDING", async () => {
        mocks.fetchMessage
            .mockResolvedValueOnce({ id: "msg-1", status: "PENDING" })
            .mockResolvedValueOnce({
                id: "msg-1",
                status: "PARSED",
                subject: "Parsed at last",
            });

        const { result } = await renderMessages();

        await deliver(preview("msg-1", "2026-09-17T09:00:00.000Z"));

        await waitFor(
            () => expect(result.current.messages).toHaveLength(1),
            { timeout: 3000 },
        );
        expect(mocks.fetchMessage).toHaveBeenCalledTimes(2);
        expect(result.current.messages[0].subject).toBe("Parsed at last");
    });

    it("falls back to the preview row when the full fetch fails", async () => {
        mocks.fetchMessage.mockRejectedValue(new Error("boom"));

        const { result } = await renderMessages();

        await deliver(
            preview("msg-1", "2026-09-17T09:00:00.000Z", "Password reset"),
        );

        await waitFor(() => expect(result.current.messages).toHaveLength(1));
        expect(result.current.messages[0]).toMatchObject({
            id: "msg-1",
            subject: "Password reset",
            fromAddress: "sender@example.com",
            incomplete: true,
        });
    });

    it("reports connection status upward", async () => {
        const { result } = await renderMessages();

        await act(async () => {
            socketOptions.onStatusChange("joined", "inbox:abc");
        });

        expect(result.current.connection).toBe("joined");
        expect(result.current.error).toBeNull();
    });

    it("surfaces a failed join as an error", async () => {
        const { result } = await renderMessages();

        await act(async () => {
            socketOptions.onStatusChange(
                "error",
                "invalid or expired inbox credentials",
            );
        });

        expect(result.current.error?.message).toBe(
            "invalid or expired inbox credentials",
        );
    });

    it("closes the socket on unmount", async () => {
        const { unmount } = await renderMessages();

        unmount();

        expect(closeMock).toHaveBeenCalledTimes(1);
    });
});
