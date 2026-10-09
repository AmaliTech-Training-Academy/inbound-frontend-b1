import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useInboxNotifications } from "./useInboxNotifications.js";

const inMinutes = (m) => new Date(Date.now() + m * 60_000).toISOString();

const inboxA = { id: "a", address: "one@inbound.mail", expiresAt: inMinutes(10) };
const inboxB = { id: "b", address: "two@inbound.mail", expiresAt: inMinutes(10) };

function setup(initial = {}) {
    const notify = vi.fn();
    const props = { inboxes: [inboxA], feeds: {}, notice: null, ...initial };
    const view = renderHook((p) => useInboxNotifications({ ...p, notify }), {
        initialProps: props,
    });
    const update = (next) => view.rerender({ ...props, ...next });
    return { notify, update, ...view };
}

/** The kinds raised since the last check, in order. */
const kinds = (notify) => notify.mock.calls.map(([n]) => n.kind);

describe("useInboxNotifications", () => {
    beforeEach(() => vi.clearAllMocks());

    // The rule the whole hook is shaped around: a page that loads with mail in
    // it, or with an inbox already in its last minutes, has not just seen those
    // things happen.
    describe("the first render", () => {
        it("says nothing about mail that was already there", () => {
            const { notify } = setup({
                feeds: { a: { messages: [{ id: "m1", sender: "Slack <no-reply@slack.com>" }] } },
            });

            expect(notify).not.toHaveBeenCalled();
        });

        it("says nothing about an inbox already in its last five minutes", () => {
            const { notify } = setup({
                inboxes: [{ ...inboxA, expiresAt: inMinutes(3) }],
            });

            expect(notify).not.toHaveBeenCalled();
        });

        it("says nothing about the inboxes the session already held", () => {
            const { notify } = setup({ inboxes: [inboxA, inboxB] });

            expect(notify).not.toHaveBeenCalled();
        });
    });

    describe("mail arriving", () => {
        it("announces a new message, naming its sender", () => {
            const { notify, update } = setup({ feeds: { a: { messages: [] } } });

            update({ feeds: { a: { messages: [{ id: "m1", sender: "Slack <no-reply@slack.com>" }] } } });

            expect(notify).toHaveBeenCalledTimes(1);
            expect(notify.mock.calls[0][0]).toMatchObject({
                kind: "message",
                key: "message:m1",
                text: "New message from Slack.",
            });
        });

        it("announces it once, however often the list is handed back", () => {
            const feeds = { a: { messages: [{ id: "m1", sender: "Slack <no-reply@slack.com>" }] } };
            const { notify, update } = setup({ feeds: { a: { messages: [] } } });

            update({ feeds });
            update({ feeds: { a: { messages: [...feeds.a.messages] } } });

            expect(notify).toHaveBeenCalledTimes(1);
        });

        // Knowing mail arrived somewhere else is the point: the other inbox is
        // not on screen, so nothing else would say so.
        it("announces mail in an inbox that is not the open one", () => {
            const { notify, update } = setup({
                inboxes: [inboxA, inboxB],
                feeds: { a: { messages: [] }, b: { messages: [] } },
            });

            update({ feeds: { a: { messages: [] }, b: { messages: [{ id: "m9", sender: "Notion <team@notion.so>" }] } } });

            expect(notify).toHaveBeenCalledTimes(1);
            expect(notify.mock.calls[0][0]).toMatchObject({
                kind: "message",
                inboxAddress: "two@inbound.mail",
            });
        });

        // Feed messages are raw. A preview row from message:new carries only
        // an address, in whichever field the server used - reading senderName
        // off it directly names every sender "someone".
        it.each([
            ["sender, with a display name", { sender: "Ada Lovelace <ada@example.com>" }, "Ada Lovelace"],
            ["sender, bare address", { sender: "ada@example.com" }, "ada@example.com"],
            ["from", { from: "Grace Hopper <grace@example.com>" }, "Grace Hopper"],
            ["fromAddress", { fromAddress: "alan@example.com" }, "alan@example.com"],
        ])("names the sender from %s", (_label, fields, expected) => {
            const { notify, update } = setup({ feeds: { a: { messages: [] } } });

            update({ feeds: { a: { messages: [{ id: "m1", ...fields }] } } });

            expect(notify.mock.calls[0][0].text).toBe(`New message from ${expected}.`);
        });

        it("leaves the address off when there is only one inbox to confuse it with", () => {
            const { notify, update } = setup({ feeds: { a: { messages: [] } } });

            update({ feeds: { a: { messages: [{ id: "m1", from: "x@y.z" }] } } });

            expect(notify.mock.calls[0][0].inboxAddress).toBeNull();
        });
    });

    describe("the last five minutes", () => {
        it("announces the crossing, once", () => {
            const { notify, update } = setup();
            // One timestamp, handed back twice: an expiry does not drift,
            // and a re-render must not be read as a second crossing.
            const low = { ...inboxA, expiresAt: inMinutes(4) };

            update({ inboxes: [low] });
            update({ inboxes: [{ ...low }] });

            expect(kinds(notify)).toEqual(["running-out"]);
        });

        it("says nothing once the inbox has actually run out", () => {
            const { notify, update } = setup();

            update({ inboxes: [{ ...inboxA, expiresAt: inMinutes(-1) }] });

            expect(notify).not.toHaveBeenCalled();
        });
    });

    describe("extending", () => {
        it("announces a later expiry", () => {
            const { notify, update } = setup();

            update({ inboxes: [{ ...inboxA, expiresAt: inMinutes(15) }] });

            expect(kinds(notify)).toEqual(["extended"]);
        });

        // Without clearing the mark, an inbox extended out of its last minutes
        // and then run down again would cross the line in silence.
        it("re-arms the five-minute warning", () => {
            const { notify, update } = setup();

            update({ inboxes: [{ ...inboxA, expiresAt: inMinutes(4) }] });
            update({ inboxes: [{ ...inboxA, expiresAt: inMinutes(20) }] });
            update({ inboxes: [{ ...inboxA, expiresAt: inMinutes(3) }] });

            expect(kinds(notify)).toEqual(["running-out", "extended", "running-out"]);
        });
    });

    it("announces an inbox joining the session", () => {
        const { notify, update } = setup();

        update({ inboxes: [inboxA, inboxB] });

        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify.mock.calls[0][0]).toMatchObject({
            kind: "added",
            key: "added:b",
            inboxAddress: "two@inbound.mail",
        });
    });

    describe("an inbox running out while others remain", () => {
        it("passes the notice on, with where it went", () => {
            const { notify, update } = setup();

            update({ notice: { addresses: ["one@inbound.mail"], switched: true } });

            expect(notify.mock.calls[0][0]).toMatchObject({
                kind: "expired",
                text: "one@inbound.mail expired. Switched to your next inbox.",
            });
        });

        it("says only that it expired when nothing took over", () => {
            const { notify, update } = setup();

            update({ notice: { addresses: ["one@inbound.mail"], switched: false } });

            expect(notify.mock.calls[0][0].text).toBe("one@inbound.mail expired.");
        });

        it("passes the same notice on only once", () => {
            const notice = { addresses: ["one@inbound.mail"], switched: true };
            const { notify, update } = setup();

            update({ notice });
            update({ notice });

            expect(notify).toHaveBeenCalledTimes(1);
        });
    });
});
