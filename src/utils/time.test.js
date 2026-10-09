import { describe, it, expect, beforeEach, vi } from "vitest";
import { formatRelativeTime } from "./time.js";

// A fixed "now", so every relative label is measured from the same moment.
const NOW = new Date("2026-10-02T12:00:00Z");
const ago = (ms) => new Date(NOW.getTime() - ms).toISOString();

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("time", () => {
    describe("formatRelativeTime", () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(NOW);
        });

        it("returns an empty label when there is no timestamp", () => {
            expect(formatRelativeTime(undefined)).toBe("");
            expect(formatRelativeTime(null)).toBe("");
            expect(formatRelativeTime("")).toBe("");
        });

        it("returns an empty label for a timestamp it cannot read", () => {
            expect(formatRelativeTime("not a date")).toBe("");
        });

        it("says just now for anything under a minute old", () => {
            expect(formatRelativeTime(ago(0))).toBe("just now");
            expect(formatRelativeTime(ago(59 * SECOND))).toBe("just now");
        });

        it("says just now, not a negative age, when the server clock runs ahead", () => {
            expect(formatRelativeTime(ago(-30 * SECOND))).toBe("just now");
        });

        it("counts minutes under an hour", () => {
            expect(formatRelativeTime(ago(MINUTE))).toBe("1m ago");
            expect(formatRelativeTime(ago(59 * MINUTE))).toBe("59m ago");
        });

        it("counts hours under a day", () => {
            expect(formatRelativeTime(ago(HOUR))).toBe("1h ago");
            expect(formatRelativeTime(ago(23 * HOUR + 59 * MINUTE))).toBe("23h ago");
        });

        it("counts days under thirty", () => {
            expect(formatRelativeTime(ago(DAY))).toBe("1d ago");
            expect(formatRelativeTime(ago(29 * DAY))).toBe("29d ago");
        });

        it("falls back to the date itself from thirty days on", () => {
            const iso = ago(30 * DAY);
            expect(formatRelativeTime(iso)).toBe(new Date(iso).toLocaleDateString());
        });
    });
});
