import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const { useMessages } = vi.hoisted(() => ({ useMessages: vi.fn() }));
vi.mock("../hooks/useMessages.js", () => ({ useMessages }));

import InboxFeed from "./InboxFeed.jsx";

const INBOX = { id: "a", address: "one@inbound.mail", token: "t" };

/** A feed with stable references, so a re-render alone changes nothing. */
function feed(overrides = {}) {
    return {
        messages: MESSAGES,
        connection: "joined",
        error: null,
        synced: true,
        sweepError: null,
        resync: RESYNC,
        retry: RETRY,
        ...overrides,
    };
}
const MESSAGES = [];
const RESYNC = () => {};
const RETRY = () => {};

describe("InboxFeed", () => {
    beforeEach(() => {
        useMessages.mockReset();
        useMessages.mockReturnValue(feed());
    });

    it("draws nothing - it is here to own a hook, not to render", () => {
        const { container } = render(<InboxFeed inbox={INBOX} onUpdate={vi.fn()} />);

        expect(container).toBeEmptyDOMElement();
    });

    it("opens the feed for the inbox it was given", () => {
        render(<InboxFeed inbox={INBOX} onUpdate={vi.fn()} />);

        expect(useMessages).toHaveBeenCalledWith(INBOX);
    });

    it("reports the whole feed upward, under its inbox's id", () => {
        const onUpdate = vi.fn();
        render(<InboxFeed inbox={INBOX} onUpdate={onUpdate} />);

        expect(onUpdate).toHaveBeenCalledWith("a", {
            messages: MESSAGES,
            connection: "joined",
            error: null,
            synced: true,
            sweepError: null,
            resync: RESYNC,
            retry: RETRY,
        });
    });

    // Every value is in the dependency array, so dropping one would leave the
    // page showing a stale version of it with nothing to say so. One case per
    // value, because a missing dependency only shows up for its own field.
    it.each([
        ["messages", { messages: [{ id: "m1" }] }],
        ["connection", { connection: "disconnected" }],
        ["error", { error: new Error("nope") }],
        ["synced", { synced: false }],
        ["sweepError", { sweepError: "gone" }],
        ["resync", { resync: () => {} }],
        ["retry", { retry: () => {} }],
    ])("reports again when %s changes", (_name, change) => {
        const onUpdate = vi.fn();
        const { rerender } = render(<InboxFeed inbox={INBOX} onUpdate={onUpdate} />);
        onUpdate.mockClear();

        useMessages.mockReturnValue(feed(change));
        rerender(<InboxFeed inbox={INBOX} onUpdate={onUpdate} />);

        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(onUpdate.mock.calls[0][1]).toMatchObject(change);
    });

    // The page re-renders for its own reasons; a feed that said nothing changed
    // must not make it do work.
    it("stays quiet when a re-render changes nothing", () => {
        const onUpdate = vi.fn();
        const { rerender } = render(<InboxFeed inbox={INBOX} onUpdate={onUpdate} />);
        onUpdate.mockClear();

        rerender(<InboxFeed inbox={INBOX} onUpdate={onUpdate} />);

        expect(onUpdate).not.toHaveBeenCalled();
    });

    // One of these is mounted per inbox, which is the reason the component
    // exists: hooks cannot be called in a loop over the session's inboxes.
    it("keeps each inbox's feed to itself", () => {
        const onUpdate = vi.fn();
        const other = { id: "b", address: "two@inbound.mail", token: "t2" };

        useMessages.mockImplementation((inbox) =>
            feed({ connection: inbox.id === "a" ? "joined" : "connecting" }),
        );
        render(
            <>
                <InboxFeed inbox={INBOX} onUpdate={onUpdate} />
                <InboxFeed inbox={other} onUpdate={onUpdate} />
            </>,
        );

        const byId = Object.fromEntries(onUpdate.mock.calls.map(([id, f]) => [id, f.connection]));
        expect(byId).toEqual({ a: "joined", b: "connecting" });
    });
});
