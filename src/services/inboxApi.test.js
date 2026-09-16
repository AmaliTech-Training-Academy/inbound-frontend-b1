import { describe, it, expect, beforeAll, vi } from "vitest";
import {
    createInbox,
    fetchInbox,
    extendInbox,
    deleteInbox,
    ApiError,
} from "./inboxApi.js";
import { INBOX_TTL_MINUTES, EXTEND_MINUTES, MAX_EXTENDS } from "../config.js";

// No VITE_API_BASE in the test env, so config.js resolves USE_MOCK to true and
// every call below exercises the in-browser mock rather than the network.
beforeAll(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
});

const minutesBetween = (a, b) =>
    (new Date(a).getTime() - new Date(b).getTime()) / 60_000;

describe("createInbox (mock mode)", () => {
    it("returns every field the client contract requires", async () => {
        const inbox = await createInbox();
        expect(inbox).toMatchObject({
            id: expect.any(String),
            address: expect.stringContaining("@"),
            token: expect.any(String),
            createdAt: expect.any(String),
            expiresAt: expect.any(String),
        });
    });

    it("defaults the lifetime to the configured TTL", async () => {
        const { createdAt, expiresAt } = await createInbox();
        expect(minutesBetween(expiresAt, createdAt)).toBeCloseTo(
            INBOX_TTL_MINUTES,
            5,
        );
    });

    it("honours an explicit ttlMinutes", async () => {
        const { createdAt, expiresAt } = await createInbox({ ttlMinutes: 25 });
        expect(minutesBetween(expiresAt, createdAt)).toBeCloseTo(25, 5);
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

describe("extendInbox (mock mode)", () => {
    it("pushes expiry out by the configured amount", async () => {
        const inbox = await createInbox();
        const res = await extendInbox(inbox.id, inbox.token);

        expect(res.extendCount).toBe(1);
        expect(minutesBetween(res.expiresAt, inbox.expiresAt)).toBeCloseTo(
            EXTEND_MINUTES,
            1,
        );
    });

    it("accumulates across repeated extends", async () => {
        const inbox = await createInbox();
        let last;
        for (let i = 1; i <= MAX_EXTENDS; i++) {
            last = await extendInbox(inbox.id, inbox.token);
            expect(last.extendCount).toBe(i);
        }
        expect(minutesBetween(last.expiresAt, inbox.expiresAt)).toBeCloseTo(
            MAX_EXTENDS * EXTEND_MINUTES,
            1,
        );
    });

    it("refuses past MAX_EXTENDS with a 409 the UI can branch on", async () => {
        const inbox = await createInbox();
        for (let i = 0; i < MAX_EXTENDS; i++) {
            await extendInbox(inbox.id, inbox.token);
        }

        await expect(
            extendInbox(inbox.id, inbox.token),
        ).rejects.toBeInstanceOf(ApiError);

        await extendInbox(inbox.id, inbox.token).catch((err) => {
            expect(err.status).toBe(409);
            expect(err.code).toBe("EXTEND_LIMIT_REACHED");
        });
    });
});

describe("fetchInbox (mock mode)", () => {
    it("echoes back the expiry the mock issued", async () => {
        const inbox = await createInbox();
        const fresh = await fetchInbox(inbox.id, inbox.token);
        expect(fresh.expiresAt).toBe(inbox.expiresAt);
        expect(fresh.messages).toEqual([]);
    });

    it("reflects an extend performed beforehand", async () => {
        const inbox = await createInbox();
        const extended = await extendInbox(inbox.id, inbox.token);
        const fresh = await fetchInbox(inbox.id, inbox.token);
        expect(fresh.expiresAt).toBe(extended.expiresAt);
        expect(fresh.extendCount).toBe(1);
    });
});

describe("deleteInbox (mock mode)", () => {
    it("resolves and forgets the inbox's extend state", async () => {
        const inbox = await createInbox();
        await extendInbox(inbox.id, inbox.token);
        await expect(deleteInbox(inbox.id, inbox.token)).resolves.toBeUndefined();

        // A fresh extend after deletion starts the count over.
        const res = await extendInbox(inbox.id, inbox.token);
        expect(res.extendCount).toBe(1);
    });
});

describe("ApiError", () => {
    it("classifies auth and not-found statuses", () => {
        expect(new ApiError(401, "NOPE", "x").isUnauthorized).toBe(true);
        expect(new ApiError(403, "NOPE", "x").isUnauthorized).toBe(true);
        expect(new ApiError(404, "NOPE", "x").isNotFound).toBe(true);
        expect(new ApiError(500, "INBOX_NOT_FOUND", "x").isNotFound).toBe(true);
        expect(new ApiError(500, "BOOM", "x").isUnauthorized).toBe(false);
    });

    it("falls back to a readable message", () => {
        expect(new ApiError(503, undefined, undefined).message).toContain("503");
    });
});
