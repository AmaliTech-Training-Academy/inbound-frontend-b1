import { describe, it, expect, beforeAll, vi } from "vitest";
import {
    createInbox,
    getInboxInfo,
    extendInbox,
    fetchMessage,
    ApiError,
} from "./inboxApi.js";
import { INBOX_TTL_MINUTES, EXTEND_MINUTES } from "../config.js";

// No VITE_API_BASE in the test env, so config.js resolves USE_MOCK to true and
// every call below exercises the in-browser mock rather than the network.
beforeAll(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
});

const minutesBetween = (a, b) =>
    (new Date(a).getTime() - new Date(b).getTime()) / 60_000;

describe("createInbox (mock mode)", () => {
    it("returns the fields the client contract requires", async () => {
        const inbox = await createInbox();
        expect(inbox).toMatchObject({
            id: expect.any(String),
            address: expect.stringContaining("@"),
            token: expect.any(String),
            expiresAt: expect.any(String),
        });
    });

    it("stamps createdAt, which the real API does not return", async () => {
        // The 201 body has no createdAt, but the progress ring needs a start
        // point, so the client adds one at the moment the response lands.
        const before = Date.now();
        const { createdAt } = await createInbox();
        const stamped = new Date(createdAt).getTime();

        expect(Number.isNaN(stamped)).toBe(false);
        expect(stamped).toBeGreaterThanOrEqual(before);
        expect(stamped).toBeLessThanOrEqual(Date.now());
    });

    it("issues the configured lifetime", async () => {
        const { createdAt, expiresAt } = await createInbox();
        expect(minutesBetween(expiresAt, createdAt)).toBeCloseTo(
            INBOX_TTL_MINUTES,
            1,
        );
    });

    it("issues a distinct address and token each time", async () => {
        const [a, b] = [await createInbox(), await createInbox()];
        expect(a.address).not.toBe(b.address);
        expect(a.token).not.toBe(b.token);
    });

    it("rejects with an AbortError when the signal is already aborted", async () => {
        const controller = new AbortController();
        controller.abort();
        await expect(
            createInbox({ signal: controller.signal }),
        ).rejects.toMatchObject({ name: "AbortError" });
    });
});

describe("getInboxInfo (mock mode)", () => {
    it("returns inbox metadata without an id or token", async () => {
        // The bearer token identifies the inbox, so the response carries
        // neither - the caller already holds both from creation.
        const inbox = await createInbox();
        const info = await getInboxInfo(inbox.token);

        expect(info).toMatchObject({
            address: expect.any(String),
            extendCount: expect.any(Number),
        });
        expect(info.id).toBeUndefined();
        expect(info.token).toBeUndefined();
    });

    it("reflects an extend performed beforehand", async () => {
        const inbox = await createInbox();
        const extended = await extendInbox(inbox.token);
        const info = await getInboxInfo(inbox.token);

        expect(info.expiresAt).toBe(extended.expiresAt);
        expect(info.extendCount).toBe(1);
    });
});

describe("extendInbox (mock mode)", () => {
    it("returns the documented shape", async () => {
        const inbox = await createInbox();
        const res = await extendInbox(inbox.token);

        expect(res).toMatchObject({
            expiresAt: expect.any(String),
            lastExtendedAt: expect.any(String),
            extendCount: 1,
        });
    });

    it("pushes expiry out by the configured amount", async () => {
        const inbox = await createInbox();
        const res = await extendInbox(inbox.token);
        expect(minutesBetween(res.expiresAt, inbox.expiresAt)).toBeCloseTo(
            EXTEND_MINUTES,
            1,
        );
    });

    it("keeps accumulating past MAX_EXTENDS, because the server has no cap", async () => {
        // The API documents no limit; the extend ceiling is a UI courtesy
        // only, so the service must not pretend to enforce one.
        const inbox = await createInbox();
        let last;
        for (let i = 1; i <= 5; i++) {
            last = await extendInbox(inbox.token);
            expect(last.extendCount).toBe(i);
        }
        expect(minutesBetween(last.expiresAt, inbox.expiresAt)).toBeCloseTo(
            5 * EXTEND_MINUTES,
            1,
        );
    });
});

describe("fetchMessage (mock mode)", () => {
    it("returns a message for the reader", async () => {
        const inbox = await createInbox();
        const message = await fetchMessage("msg-1", inbox.token);

        expect(message).toMatchObject({
            id: "msg-1",
            subject: expect.any(String),
            from: expect.any(String),
            body: expect.any(String),
            attachments: expect.any(Array),
        });
    });
});

describe("ApiError", () => {
    it("classifies the statuses the API documents", () => {
        expect(new ApiError(401, "x").isUnauthorized).toBe(true);
        expect(new ApiError(403, "x").isUnauthorized).toBe(true);
        expect(new ApiError(404, "x").isNotFound).toBe(true);
        expect(new ApiError(410, "x").isExpired).toBe(true);
        expect(new ApiError(500, "x").isUnauthorized).toBe(false);
        expect(new ApiError(500, "x").isExpired).toBe(false);
    });

    it("treats 401/403/404/410 alike as a dead inbox", () => {
        for (const status of [401, 403, 404, 410]) {
            expect(new ApiError(status, "x").isDead).toBe(true);
        }
        expect(new ApiError(500, "x").isDead).toBe(false);
        expect(new ApiError(0, "x").isDead).toBe(false);
    });

    it("keeps the server's message, the only detail the contract gives", () => {
        expect(new ApiError(410, "Inbox has expired").message).toBe(
            "Inbox has expired",
        );
    });

    it("falls back to a readable message when the server sends none", () => {
        expect(new ApiError(503).message).toContain("503");
    });
});
