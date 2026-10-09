import { describe, it, expect } from "vitest";
import { CRITICAL_PERCENT, formatTimeLeft, inboxProgress, isRunningOut } from "./inboxProgress.js";
import { EXTEND_MINUTES, INBOX_TTL_MINUTES } from "../config.js";

// A fixed "now"; each inbox is described by how far its expiry is from it.
const NOW = new Date("2026-10-02T12:00:00Z").getTime();
const MINUTE = 60_000;
const at = (offsetMs) => new Date(NOW + offsetMs).toISOString();

/** An inbox that lives `lifeMinutes` in all and has `leftMinutes` of it left. */
const inbox = (lifeMinutes, leftMinutes, extra = {}) => ({
    createdAt: at((leftMinutes - lifeMinutes) * MINUTE),
    expiresAt: at(leftMinutes * MINUTE),
    ...extra,
});

describe("inboxProgress", () => {
    describe("inboxProgress", () => {
        it("counts a brand-new inbox as full", () => {
            expect(inboxProgress(inbox(10, 10), NOW)).toBe(100);
        });

        it("gives the share of the inbox's life that is left", () => {
            expect(inboxProgress(inbox(10, 5), NOW)).toBe(50);
            expect(inboxProgress(inbox(10, 1), NOW)).toBe(10);
        });

        it("stops at 0 once the inbox has expired", () => {
            expect(inboxProgress(inbox(10, -3), NOW)).toBe(0);
        });

        it("measures an extended inbox against its whole new life, so it never overflows", () => {
            // Created 8 minutes ago and extended: now 7 minutes left of 15.
            expect(inboxProgress(inbox(15, 7), NOW)).toBeCloseTo((7 / 15) * 100);
        });

        it("treats an inbox without a usable expiry as full", () => {
            expect(inboxProgress(undefined, NOW)).toBe(100);
            expect(inboxProgress({}, NOW)).toBe(100);
            expect(inboxProgress({ expiresAt: "not a date" }, NOW)).toBe(100);
        });

        it("falls back to the configured lifetime when createdAt is missing", () => {
            const half = (INBOX_TTL_MINUTES / 2) * MINUTE;
            expect(inboxProgress({ expiresAt: at(half) }, NOW)).toBe(50);
        });

        it("adds the extensions granted so far to that fallback", () => {
            const life = INBOX_TTL_MINUTES + 2 * EXTEND_MINUTES;
            const left = { expiresAt: at((life / 2) * MINUTE), extendCount: 2 };
            expect(inboxProgress(left, NOW)).toBe(50);
        });

        it("does not divide by zero when createdAt equals expiresAt", () => {
            const same = at(0);
            expect(inboxProgress({ createdAt: same, expiresAt: same }, NOW)).toBe(0);
        });
    });

    describe("isRunningOut", () => {
        it("is false while more than the critical share is left", () => {
            expect(isRunningOut(inbox(10, 5), NOW)).toBe(false);
        });

        it("is true at the critical share and below", () => {
            const atCritical = inbox(100, CRITICAL_PERCENT);
            expect(isRunningOut(atCritical, NOW)).toBe(true);
            expect(isRunningOut(inbox(10, 1), NOW)).toBe(true);
        });

        it("is true once the inbox has expired", () => {
            expect(isRunningOut(inbox(10, -1), NOW)).toBe(true);
        });
    });

    describe("formatTimeLeft", () => {
        it("shows the time left as mm:ss", () => {
            expect(formatTimeLeft(at(9 * MINUTE + 5_000), NOW)).toBe("09:05");
            expect(formatTimeLeft(at(59_000), NOW)).toBe("00:59");
        });

        it("drops part-seconds rather than rounding up", () => {
            expect(formatTimeLeft(at(1_999), NOW)).toBe("00:01");
        });

        it("keeps counting minutes past an hour", () => {
            expect(formatTimeLeft(at(75 * MINUTE), NOW)).toBe("75:00");
        });

        it("stops at 00:00 once the inbox has expired", () => {
            expect(formatTimeLeft(at(-30_000), NOW)).toBe("00:00");
        });

        it("shows 00:00 for an expiry it cannot read", () => {
            expect(formatTimeLeft("not a date", NOW)).toBe("00:00");
            expect(formatTimeLeft(undefined, NOW)).toBe("00:00");
        });
    });
});
