import { describe, it, expect } from "vitest";
import { formatReceivedAt, formatAbsolute } from "./formatReceivedAt.js";

const NOW = new Date("2026-09-17T12:00:00.000Z").getTime();
const ago = (ms) => new Date(NOW - ms).toISOString();

describe("receivedAt formatting", () => {
    describe("formatReceivedAt", () => {
        it("calls anything under a minute 'just now'", () => {
            expect(formatReceivedAt(ago(0), NOW)).toBe("just now");
            expect(formatReceivedAt(ago(59_000), NOW)).toBe("just now");
        });

        it("counts whole minutes under an hour", () => {
            expect(formatReceivedAt(ago(60_000), NOW)).toBe("1m ago");
            expect(formatReceivedAt(ago(4 * 60_000 + 30_000), NOW)).toBe("4m ago");
            expect(formatReceivedAt(ago(59 * 60_000), NOW)).toBe("59m ago");
        });

        it("counts whole hours under a day", () => {
            expect(formatReceivedAt(ago(60 * 60_000), NOW)).toBe("1h ago");
            expect(formatReceivedAt(ago(23 * 60 * 60_000), NOW)).toBe("23h ago");
        });

        it("falls back to a date beyond a day", () => {
            const out = formatReceivedAt(ago(3 * 24 * 60 * 60_000), NOW);
            expect(out).not.toMatch(/ago|just now/);
            expect(out).toBeTruthy();
        });

        it("treats a timestamp slightly ahead of the clock as new", () => {
            // Server and browser clocks drift; "in -2 minutes" would be worse.
            expect(formatReceivedAt(new Date(NOW + 30_000).toISOString(), NOW)).toBe(
                "just now",
            );
        });

        it("returns an empty string rather than 'Invalid Date'", () => {
            expect(formatReceivedAt(undefined, NOW)).toBe("");
            expect(formatReceivedAt("not-a-date", NOW)).toBe("");
            expect(formatReceivedAt(null, NOW)).toBe("");
        });
    });

    describe("formatAbsolute", () => {
        it("renders a full timestamp", () => {
            expect(formatAbsolute(new Date(NOW).toISOString())).toBeTruthy();
        });

        it("returns an empty string for junk", () => {
            expect(formatAbsolute("nope")).toBe("");
            expect(formatAbsolute(undefined)).toBe("");
        });
    });
});
