// The timing log only reads clocks and writes console lines, so these pin down
// the lines themselves: what each stage says, and that a message's entry is
// measured from its arrival and cleared once it is on screen.

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    noteArrival,
    noteQueued,
    noteFetchStarted,
    noteFetchReturned,
    noteRetry,
    noteRetryStarted,
    noteInserted,
    noteStage,
    noteSweepStarted,
    noteSweepReturned,
    noteRendered,
} from "./timingLog.js";

// The module keeps one entry per message id for the whole run, so each test
// uses its own ids rather than resetting the module.
let nextId = 0;
const newId = () => `msg-${++nextId}`;

describe("timingLog", () => {
    let clock;
    let log;
    const lines = () => log.mock.calls.map(([text]) => text);

    beforeEach(() => {
        clock = 1000;
        vi.spyOn(performance, "now").mockImplementation(() => clock);
        log = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    describe("noteArrival", () => {
        it("logs the arrival with the subject and the payload's receivedAt", () => {
            const id = newId();
            noteArrival(id, { subject: "Your code", receivedAt: new Date().toISOString() });

            expect(lines()[0]).toMatch(new RegExp(`^\\[INBOX TIMING\\] \\[1\\] message:new received ${id} `));
            expect(lines()[0]).toContain('subject="Your code"');
            expect(lines()[1]).toContain(`[9] payload receivedAt ${id}`);
        });

        it("names the source when it is not the socket", () => {
            noteArrival(newId(), {}, "poll");
            expect(lines()[0]).toContain("via poll");
        });

        it("skips the receivedAt line when the payload has none", () => {
            noteArrival(newId(), {});
            expect(lines()).toHaveLength(1);
        });

        it("logs each message once, however often it arrives", () => {
            const id = newId();
            noteArrival(id, {});
            noteArrival(id, {});
            expect(lines()).toHaveLength(1);
        });
    });

    describe("the fetch stages", () => {
        it("measures the queue wait and the fetch from the arrival", () => {
            const id = newId();
            noteArrival(id, {});
            clock += 10;
            noteQueued(id, 2);
            clock += 40;
            noteFetchStarted(id);
            clock += 25;
            noteFetchReturned(id, "READY");

            expect(lines()[1]).toContain("2 fetch(es) ahead of it");
            expect(lines()[2]).toContain("+50ms since message:new");
            expect(lines()[2]).toContain("attempt 1, 40ms after being queued");
            expect(lines()[3]).toContain("attempt 1, status READY, took 25ms");
            expect(lines().join("\n")).not.toContain("[5]");
        });

        it("flags a PENDING reply and follows the retry through to the state", () => {
            const id = newId();
            noteArrival(id, {});
            noteFetchStarted(id);
            noteFetchReturned(id, "PENDING");
            noteRetry(id, 500);
            noteRetryStarted(id);
            noteInserted(id);

            const all = lines().join("\n");
            expect(all).toContain(`[5] status is PENDING ${id}`);
            expect(all).toContain("sleeping 500ms first");
            expect(all).toContain(`[6] retry started ${id}`);
            expect(all).toContain("PENDING retry yes");
        });

        it("says there was no retry when there was none", () => {
            const id = newId();
            noteInserted(id);
            expect(lines()[0]).toContain("PENDING retry no");
        });

        it("logs a reply with no status as none", () => {
            noteFetchReturned(newId(), undefined);
            expect(lines()[0]).toContain("status none");
        });
    });

    describe("noteRendered", () => {
        it("closes the entry with the total time since the arrival", () => {
            const id = newId();
            noteArrival(id, {});
            clock += 120;
            noteRendered(id);

            expect(lines()).toContain(`[INBOX TIMING] [8] [TOTAL] message:new -> rendered ${id} 120ms`);
        });

        it("clears the entry, so a second render has no total", () => {
            const id = newId();
            noteArrival(id, {});
            noteRendered(id);
            log.mockClear();

            noteRendered(id);
            expect(lines()).toEqual([`[INBOX TIMING] [8] rendered ${id}`]);
        });
    });

    describe("the recovery sweep", () => {
        it("logs how many rows the sweep returned and how long it took", () => {
            noteSweepStarted();
            clock += 300;
            noteSweepReturned(4);

            expect(lines()[0]).toBe("[INBOX TIMING] [sweep] recovery sweep started");
            expect(lines()[1]).toContain("(4 row(s) in 300ms");
        });
    });

    it("logs a free-form stage against the message", () => {
        const id = newId();
        noteStage(id, "[socket] joined", "room inbox-1");
        expect(lines()).toEqual([`[INBOX TIMING] [socket] joined ${id} (room inbox-1)`]);
    });

    it("ignores every call that has no message id", () => {
        noteArrival(undefined, {});
        noteQueued(undefined, 1);
        noteFetchStarted(undefined);
        noteFetchReturned(undefined, "READY");
        noteRetry(undefined, 100);
        noteRetryStarted(undefined);
        noteInserted(undefined);
        noteStage(undefined, "x");
        noteRendered(undefined);

        expect(log).not.toHaveBeenCalled();
    });
});
