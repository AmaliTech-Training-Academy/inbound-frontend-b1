import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    saveInbox,
    loadInbox,
    clearInbox,
    msRemaining,
} from "./inboxStorage.js";

const KEY = "inbound.inbox";

function makeInbox(overrides = {}) {
    return {
        id: "inbox-1",
        address: "test@inbound.dev",
        token: "tok_abc",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        ...overrides,
    };
}

describe("inboxStorage", () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    describe("saveInbox / loadInbox", () => {
        it("round-trips an inbox through sessionStorage", () => {
            const inbox = makeInbox();
            saveInbox(inbox);
            expect(loadInbox()).toEqual(inbox);
        });

        it("writes to sessionStorage, not localStorage", () => {
            // The blob holds the bearer token; localStorage would outlive the tab.
            saveInbox(makeInbox());
            expect(sessionStorage.getItem(KEY)).not.toBeNull();
            expect(localStorage.getItem(KEY)).toBeNull();
        });

        it("returns null when nothing is stored", () => {
            expect(loadInbox()).toBeNull();
        });
    });

    describe("loadInbox rejects unusable data", () => {
        it("drops an already-expired inbox and clears it", () => {
            saveInbox(
                makeInbox({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
            );
            expect(loadInbox()).toBeNull();
            expect(sessionStorage.getItem(KEY)).toBeNull();
        });

        it("clears malformed JSON and logs why", () => {
            const spy = vi.spyOn(console, "error").mockImplementation(() => {});
            sessionStorage.setItem(KEY, "{not json");

            expect(loadInbox()).toBeNull();
            expect(sessionStorage.getItem(KEY)).toBeNull();
            expect(spy).toHaveBeenCalled();
        });

        it.each(["id", "address", "token", "expiresAt"])(
            "clears an inbox missing %s",
            (field) => {
                vi.spyOn(console, "error").mockImplementation(() => {});
                const inbox = makeInbox();
                delete inbox[field];
                sessionStorage.setItem(KEY, JSON.stringify(inbox));

                expect(loadInbox()).toBeNull();
                expect(sessionStorage.getItem(KEY)).toBeNull();
            },
        );
    });

    describe("clearInbox", () => {
        it("removes the stored inbox", () => {
            saveInbox(makeInbox());
            clearInbox();
            expect(loadInbox()).toBeNull();
        });
    });

    describe("msRemaining", () => {
        it("returns the milliseconds left until expiry", () => {
            const in30s = new Date(Date.now() + 30_000).toISOString();
            expect(msRemaining(in30s)).toBeGreaterThan(29_000);
            expect(msRemaining(in30s)).toBeLessThanOrEqual(30_000);
        });

        it("clamps to zero once expired rather than going negative", () => {
            expect(msRemaining(new Date(Date.now() - 60_000).toISOString())).toBe(
                0,
            );
        });

        it("treats an unparseable timestamp as expired", () => {
            expect(msRemaining("not-a-date")).toBe(0);
            expect(msRemaining(undefined)).toBe(0);
        });
    });
});
