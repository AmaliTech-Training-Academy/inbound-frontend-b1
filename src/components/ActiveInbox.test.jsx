import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActiveInbox from "./ActiveInbox.jsx";
import { EXTEND_MINUTES } from "../config.js";

const inbox = {
    id: "inbox-1",
    address: "mock-abc123@inbound.dev",
    token: "tok_abc",
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 9 * 60_000).toISOString(),
};

function setup(props = {}) {
    const handlers = {
        onDestroy: vi.fn(),
        onExtend: vi.fn(),
        onRefresh: vi.fn(),
    };
    render(<ActiveInbox inbox={inbox} {...handlers} {...props} />);
    return handlers;
}

const extendButtons = () =>
    screen.getAllByRole("button", { name: new RegExp(`Extend ${EXTEND_MINUTES}m`) });

describe("ActiveInbox", () => {
    it("shows the active address", () => {
        setup();
        expect(screen.getAllByText(inbox.address).length).toBeGreaterThan(0);
    });

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

    it("shows the empty state until messages exist", () => {
        setup();
        expect(screen.getByText(/your inbox is empty/i)).toBeInTheDocument();
        expect(screen.getByText(/0 messages/i)).toBeInTheDocument();
    });

    describe("message list", () => {
        const messages = [
            {
                id: "m1",
                fromAddress: "sender@example.com",
                subject: "Your code is 123456",
                receivedAt: new Date().toISOString(),
            },
        ];

        it("replaces the empty state once mail arrives", () => {
            setup({ messages, socketStatus: "live" });

            expect(screen.queryByText(/your inbox is empty/i)).not.toBeInTheDocument();
            expect(screen.getByText("sender@example.com")).toBeInTheDocument();
            expect(screen.getByText("Your code is 123456")).toBeInTheDocument();
        });

        it("uses the singular for one message", () => {
            setup({ messages, socketStatus: "live" });
            expect(screen.getByText("1 message")).toBeInTheDocument();
        });

        it("pluralises correctly for several messages", () => {
            setup({
                messages: [
                    messages[0],
                    { ...messages[0], id: "m2", subject: "Second" },
                ],
                socketStatus: "live",
            });
            expect(screen.getByText("2 messages")).toBeInTheDocument();
        });

        it("says it is live when the socket has joined", () => {
            setup({ socketStatus: "live" });
            expect(screen.getByText("Live")).toBeInTheDocument();
        });

        it("warns while reconnecting, so a stale list is not mistaken for an empty one", () => {
            setup({ socketStatus: "connecting" });
            expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
            expect(
                screen.getByText(/connecting to the mail server/i),
            ).toBeInTheDocument();
        });

        it("states plainly when mail will not arrive", () => {
            setup({
                socketStatus: "error",
                socketError: new Error("invalid or expired inbox credentials"),
            });
            expect(screen.getByText(/not receiving mail/i)).toBeInTheDocument();
            expect(
                screen.getByText(/new mail will not appear/i),
            ).toBeInTheDocument();
        });

        it("shows no live indicator when the socket is idle", () => {
            setup({ socketStatus: "idle" });
            expect(screen.queryByText("Live")).not.toBeInTheDocument();
            expect(screen.queryByText(/reconnecting/i)).not.toBeInTheDocument();
        });
    });
});
