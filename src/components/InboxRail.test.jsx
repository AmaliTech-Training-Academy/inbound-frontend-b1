import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InboxRail from "./InboxRail.jsx";

// The clock is pinned (Date only, so clicks and intervals still run), which
// keeps "05:00 left" from ticking to 04:59 under a slow render.
const NOW = new Date("2026-09-30T12:00:00Z");
const IN_FIVE_MINUTES = "2026-09-30T12:05:00Z";

const INBOXES = [
    { id: "one", address: "first@inbound.mail", expiresAt: IN_FIVE_MINUTES },
    { id: "two", address: "second@inbound.mail", expiresAt: IN_FIVE_MINUTES },
];

const rail = () => screen.getByRole("navigation", { name: "Inboxes" });
const avatar = (address) =>
    within(rail()).getByRole("button", { name: new RegExp(`^${address}`) });

describe("InboxRail", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(NOW);
    });

    it("lists every inbox by its address, with the time it has left", () => {
        render(<InboxRail inboxes={INBOXES} activeId="one" />);

        expect(avatar("first@inbound.mail")).toHaveAccessibleName(
            "first@inbound.mail, open, 05:00 left",
        );
        expect(avatar("second@inbound.mail")).toHaveAccessibleName(
            "second@inbound.mail, 05:00 left",
        );
    });

    it("marks the open inbox", () => {
        render(<InboxRail inboxes={INBOXES} activeId="two" />);

        expect(avatar("second@inbound.mail")).toHaveAttribute("aria-current", "true");
        expect(avatar("first@inbound.mail")).not.toHaveAttribute("aria-current");
    });

    it("shows unread mail waiting in an inbox", () => {
        render(<InboxRail inboxes={INBOXES} activeId="one" unreadCounts={{ two: 3 }} />);

        expect(avatar("second@inbound.mail")).toHaveAccessibleName(
            "second@inbound.mail, 3 unread, 05:00 left",
        );
        expect(within(avatar("second@inbound.mail")).getByText("3")).toBeInTheDocument();
    });

    it("keeps a large unread count to a badge's width", () => {
        render(<InboxRail inboxes={INBOXES} activeId="one" unreadCounts={{ one: 120 }} />);

        expect(within(avatar("first@inbound.mail")).getByText("99+")).toBeInTheDocument();
    });

    it("hands the chosen inbox to the caller", async () => {
        const user = userEvent.setup();
        const onOpen = vi.fn();
        render(<InboxRail inboxes={INBOXES} activeId="one" onOpen={onOpen} />);

        await user.click(avatar("second@inbound.mail"));

        expect(onOpen).toHaveBeenCalledWith("two");
    });

    it("adds an inbox from the + button", async () => {
        const user = userEvent.setup();
        const onAdd = vi.fn();
        render(<InboxRail inboxes={INBOXES} activeId="one" onAdd={onAdd} />);

        await user.click(within(rail()).getByRole("button", { name: "New temporary inbox" }));

        expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it("shows an add in progress, and takes no second one", () => {
        render(<InboxRail inboxes={INBOXES} activeId="one" adding canAdd={false} />);

        expect(within(rail()).getByRole("button", { name: "Adding an inbox" })).toBeDisabled();
    });

    it("says the session is full rather than just greying + out", () => {
        render(<InboxRail inboxes={INBOXES} activeId="one" limit={2} canAdd={false} />);

        const add = within(rail()).getByRole("button", { name: "Inbox limit reached: 2 of 2" });
        expect(add).toBeDisabled();
        expect(add).toHaveAttribute("title", "Inbox limit reached: 2 of 2");
    });

    it("can be labelled for a second copy of itself", () => {
        render(
            <InboxRail inboxes={INBOXES} activeId="one" orientation="horizontal" label="Switch inbox" />,
        );

        expect(screen.getByRole("navigation", { name: "Switch inbox" })).toBeInTheDocument();
    });
});
