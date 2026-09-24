// The live list and the empty state share this screen, so both are covered
// here: the actions the parent wires up, and what the feed renders.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EXTEND_MINUTES } from "../config.js";

const feed = vi.hoisted(() => ({
    value: { messages: [], connection: "joined", error: null },
}));

vi.mock("../state/useMessages.js", () => ({
    useMessages: () => feed.value,
}));

import ActiveInbox from "./ActiveInbox.jsx";

const INBOX = {
    id: "inbox-1",
    address: "mock-abc123@inbound.dev",
    token: "tok_abc",
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 9 * 60_000).toISOString(),
    extendCount: 0,
};

const message = (id, extra = {}) => ({
    id,
    sender: "Ada Lovelace <ada@example.com>",
    subject: `Message ${id}`,
    receivedAt: new Date().toISOString(),
    ...extra,
});

function setup(props = {}) {
    const handlers = {
        onDestroy: vi.fn(),
        onExtend: vi.fn(),
        onRefresh: vi.fn(),
    };
    render(<ActiveInbox inbox={INBOX} {...handlers} {...props} />);
    return handlers;
}

const extendButtons = () =>
    screen.getAllByRole("button", { name: new RegExp(`Extend ${EXTEND_MINUTES}m`) });

beforeEach(() => {
    feed.value = { messages: [], connection: "joined", error: null };
});

describe("ActiveInbox", () => {
    it("wires refresh, extend and destroy to their handlers", async () => {
        const user = userEvent.setup();
        const { onRefresh, onExtend, onDestroy } = setup();

        await user.click(screen.getByRole("button", { name: /refresh/i }));
        expect(onRefresh).toHaveBeenCalledTimes(1);

        await user.click(extendButtons()[0]);
        expect(onExtend).toHaveBeenCalledTimes(1);

        await user.click(screen.getByRole("button", { name: /destroy inbox/i }));
        expect(onDestroy).toHaveBeenCalledTimes(1);
    });

    it("disables every action while one is in flight", () => {
        // useInbox serialises the three actions behind one lock, so the
        // controls must not invite a click that would be silently dropped.
        setup({ busy: "refreshing" });

        expect(screen.getByRole("button", { name: /refreshing/i })).toBeDisabled();
        expect(screen.getByRole("button", { name: /destroy inbox/i })).toBeDisabled();
        extendButtons().forEach((b) => expect(b).toBeDisabled());
    });

    it("reports which action is running", () => {
        setup({ busy: "extending" });
        expect(screen.getAllByText(/extending/i).length).toBeGreaterThan(0);
    });

    it("disables extend once the limit is reached and explains why", () => {
        setup({ canExtend: false });
        const buttons = extendButtons();
        buttons.forEach((b) => {
            expect(b).toBeDisabled();
            expect(b).toHaveAttribute(
                "title",
                "This inbox cannot be extended any further.",
            );
        });
    });

    it("surfaces an action error as an alert", () => {
        setup({ actionError: new Error("Could not extend the inbox. Try again.") });
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Could not extend the inbox. Try again.",
        );
    });

    it("renders no alert when there is no error", () => {
        setup();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows the active address so mail can be sent to it", () => {
        setup();
        expect(screen.getAllByText(INBOX.address).length).toBeGreaterThan(0);
    });

    it("shows the empty state at zero messages", () => {
        setup();

        expect(screen.getByText("0 messages")).toBeInTheDocument();
        expect(screen.getByText("Your inbox is empty")).toBeInTheDocument();
    });

    it("counts messages once some have arrived", () => {
        feed.value = {
            messages: [message("m1")],
            connection: "joined",
            error: null,
        };

        setup();

        expect(screen.getByText("1 message")).toBeInTheDocument();
    });

    it("uses the plural label above one message", () => {
        feed.value = {
            messages: [message("m1"), message("m2")],
            connection: "joined",
            error: null,
        };

        setup();

        expect(screen.getByText("2 messages")).toBeInTheDocument();
    });

    it("replaces the empty state with the list", () => {
        feed.value = {
            messages: [message("m1", { subject: "Your verification code" })],
            connection: "joined",
            error: null,
        };

        setup();

        expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
        expect(screen.getByText("Your verification code")).toBeInTheDocument();
        expect(screen.queryByText("Your inbox is empty")).toBeNull();
    });
});
