import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import InboxRail from "./InboxRail.jsx";

const inMinutes = (m) => new Date(Date.now() + m * 60_000).toISOString();

const inbox = (id, extra = {}) => ({
    id,
    address: `${id}@inbound.dev`,
    expiresAt: inMinutes(9),
    ...extra,
});

describe("InboxRail", () => {
    it("lists every inbox by its local part, with the time it has left", () => {
        render(<InboxRail inboxes={[inbox("alpha"), inbox("bravo")]} activeId="alpha" />);

        expect(screen.getByText("alpha")).toBeInTheDocument();
        expect(screen.getByText("bravo")).toBeInTheDocument();
        expect(screen.getAllByText(/0[89]:\d\d left/)).toHaveLength(2);
    });

    it("marks the open inbox", () => {
        render(<InboxRail inboxes={[inbox("alpha"), inbox("bravo")]} activeId="bravo" />);

        expect(
            screen.getByRole("button", { name: "bravo@inbound.dev, open" }),
        ).toHaveAttribute("aria-current", "true");
        expect(
            screen.getByRole("button", { name: "alpha@inbound.dev" }),
        ).not.toHaveAttribute("aria-current");
    });

    it("shows unread mail waiting in an inbox", () => {
        render(
            <InboxRail
                inboxes={[inbox("alpha"), inbox("bravo")]}
                activeId="alpha"
                unreadCounts={{ bravo: 3 }}
            />,
        );

        expect(screen.getByText("3 new")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "bravo@inbound.dev, 3 unread" }),
        ).toBeInTheDocument();
    });

    it("switches to an inbox when its row is chosen", async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(
            <InboxRail
                inboxes={[inbox("alpha"), inbox("bravo")]}
                activeId="alpha"
                onSelect={onSelect}
            />,
        );

        await user.click(screen.getByRole("button", { name: "bravo@inbound.dev" }));

        expect(onSelect).toHaveBeenCalledWith("bravo");
    });

    it("adds an inbox from the + button", async () => {
        const user = userEvent.setup();
        const onAdd = vi.fn();
        render(<InboxRail inboxes={[inbox("alpha")]} activeId="alpha" onAdd={onAdd} />);

        await user.click(screen.getByRole("button", { name: "+ New inbox" }));

        expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it("copies an inbox's address without opening it", async () => {
        const user = userEvent.setup();
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, "clipboard", {
            value: { writeText },
            configurable: true,
        });
        const onSelect = vi.fn();
        render(
            <InboxRail
                inboxes={[inbox("alpha"), inbox("bravo")]}
                activeId="alpha"
                onSelect={onSelect}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Copy bravo@inbound.dev" }));

        expect(writeText).toHaveBeenCalledWith("bravo@inbound.dev");
        expect(onSelect).not.toHaveBeenCalled();
        expect(
            screen.getByRole("button", { name: "bravo@inbound.dev copied to clipboard" }),
        ).toBeInTheDocument();
    });

    it("drains each row's time bar, red on the timer card's rule", () => {
        // Created 10 minutes ago with 1 left: 10% of its life, under 30%.
        const ending = inbox("alpha", {
            createdAt: inMinutes(-10),
            expiresAt: inMinutes(1),
        });
        const { container } = render(<InboxRail inboxes={[ending]} activeId="alpha" />);

        const fill = container.querySelector('[style*="width"]');
        expect(parseFloat(fill.style.width)).toBeLessThan(30);
        expect(fill.className).toMatch(/bg-red-600/);
        expect(screen.getByText(/00:5\d left|01:00 left/)).toHaveClass("text-red-600");
    });

    it("notes that inboxes expire separately once there are several", () => {
        const { rerender } = render(<InboxRail inboxes={[inbox("alpha")]} activeId="alpha" />);
        expect(screen.queryByText("Each inbox expires on its own.")).toBeNull();

        rerender(<InboxRail inboxes={[inbox("alpha"), inbox("bravo")]} activeId="alpha" />);
        expect(screen.getByText("Each inbox expires on its own.")).toBeInTheDocument();
    });

    it("shows an add in progress", () => {
        render(<InboxRail inboxes={[inbox("alpha")]} activeId="alpha" canAdd={false} adding />);

        expect(screen.getByRole("button", { name: "Adding…" })).toBeDisabled();
    });
});
