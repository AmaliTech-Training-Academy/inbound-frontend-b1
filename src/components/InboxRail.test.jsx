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

    it("shows an add in progress", () => {
        render(<InboxRail inboxes={[inbox("alpha")]} activeId="alpha" canAdd={false} adding />);

        expect(screen.getByRole("button", { name: "Adding…" })).toBeDisabled();
    });
});
