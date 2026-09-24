// The list that replaced the hardcoded "0 messages" empty state.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const feed = vi.hoisted(() => ({
    value: { messages: [], connection: "joined", error: null },
}));

vi.mock("../state/useMessages.js", () => ({
    useMessages: () => feed.value,
}));

import ActiveInbox from "./ActiveInbox.jsx";

const INBOX = {
    id: "inbox-1",
    address: "user-abc@example.com",
    token: "raw-token",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    extendCount: 0,
};

function renderInbox(props = {}) {
    return render(
        <ActiveInbox
            inbox={INBOX}
            onDestroy={vi.fn()}
            onExtend={vi.fn()}
            onRefresh={vi.fn()}
            {...props}
        />,
    );
}

beforeEach(() => {
    feed.value = { messages: [], connection: "joined", error: null };
});

describe("ActiveInbox", () => {
    it("shows the empty state at zero messages", () => {
        renderInbox();

        expect(screen.getByText("0 messages")).toBeInTheDocument();
        expect(screen.getByText("Your inbox is empty")).toBeInTheDocument();
    });

    it("counts messages once some have arrived", () => {
        feed.value = {
            messages: [{ id: "m1", from: "a@b.c", subject: "One", receivedAt: new Date().toISOString() }],
            connection: "joined",
            error: null,
        };

        renderInbox();

        expect(screen.getByText("1 message")).toBeInTheDocument();
    });

    it("uses the plural label above one message", () => {
        feed.value = {
            messages: [
                { id: "m1", from: "a@b.c", subject: "One", receivedAt: new Date().toISOString() },
                { id: "m2", from: "a@b.c", subject: "Two", receivedAt: new Date().toISOString() },
            ],
            connection: "joined",
            error: null,
        };

        renderInbox();

        expect(screen.getByText("2 messages")).toBeInTheDocument();
    });

    it("replaces the empty state with the list", () => {
        feed.value = {
            messages: [
                {
                    id: "m1",
                    sender: "Ada Lovelace <ada@example.com>",
                    subject: "Your verification code",
                    receivedAt: new Date().toISOString(),
                },
            ],
            connection: "joined",
            error: null,
        };

        renderInbox();

        expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
        expect(
            screen.getByText("Your verification code"),
        ).toBeInTheDocument();
        expect(screen.queryByText("Your inbox is empty")).toBeNull();
    });

    it("still shows the address so mail can be sent to it", () => {
        renderInbox();

        expect(screen.getAllByText(INBOX.address).length).toBeGreaterThan(0);
    });
});
