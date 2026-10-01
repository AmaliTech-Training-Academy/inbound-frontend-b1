import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Hero from "./Hero.jsx";

const HEADLINE = /Create a temporary email in seconds/i;

// Hero is handed useInbox()'s return value by App; this builds one.
function inboxProps(overrides = {}) {
    return {
        status: "idle",
        inbox: null,
        error: null,
        busy: null,
        regenerating: false,
        canExtend: true,
        generate: vi.fn(),
        regenerate: vi.fn(),
        reset: vi.fn(),
        destroy: vi.fn(),
        extend: vi.fn(),
        refresh: vi.fn(),
        ...overrides,
    };
}

const activeInbox = {
    id: "i1",
    address: "someone@inbound.dev",
    token: "tok",
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 9 * 60_000).toISOString(),
};

describe("Hero", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows the landing copy when there is no inbox", () => {
        render(<Hero {...inboxProps({ status: "idle" })} />);
        expect(screen.getByText(HEADLINE)).toBeInTheDocument();
    });

    it("hides the landing copy while rehydrating a stored inbox", () => {
        // On refresh useInbox starts at "loading" while it confirms the stored
        // inbox with the server. Rendering the marketing headline during that
        // window flashes the landing page before the address reappears.
        render(<Hero {...inboxProps({ status: "loading" })} />);
        expect(screen.queryByText(HEADLINE)).not.toBeInTheDocument();
    });

    it("hides the landing copy once the inbox is active", () => {
        render(<Hero {...inboxProps({ status: "active", inbox: activeInbox })} />);
        expect(screen.queryByText(HEADLINE)).not.toBeInTheDocument();
    });

    it("hides the landing copy on the purged screen", () => {
        render(<Hero {...inboxProps({ status: "expired" })} />);
        expect(screen.queryByText(HEADLINE)).not.toBeInTheDocument();
        expect(screen.getByText(/INBOX PURGED/i)).toBeInTheDocument();
    });

    it("shows no supporting copy while rehydrating either", () => {
        render(<Hero {...inboxProps({ status: "loading" })} />);
        expect(screen.queryByText(/How Inbound Works/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/No signup required/i)).not.toBeInTheDocument();
    });

    it("regenerates directly from the purged card instead of resetting", async () => {
        const user = userEvent.setup();
        const regenerate = vi.fn();
        const reset = vi.fn();

        render(<Hero {...inboxProps({ status: "expired", regenerate, reset })} />);
        await user.click(
            screen.getByRole("button", { name: /generate a new address/i }),
        );

        expect(regenerate).toHaveBeenCalledTimes(1);
        // reset() would drop the user back to the landing page for a second click.
        expect(reset).not.toHaveBeenCalled();
    });

    it("keeps the purged card up while the new address is generating", () => {
        // Between the click and the new inbox arriving, useInbox reports
        // "creating". Without the regenerating flag that status renders the
        // landing page, flashing the headline and How Inbound Works.
        render(
            <Hero {...inboxProps({ status: "creating", regenerating: true })} />,
        );

        expect(screen.getByText(/INBOX PURGED/i)).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /generating/i }),
        ).toBeDisabled();
        expect(screen.queryByText(HEADLINE)).not.toBeInTheDocument();
        expect(screen.queryByText(/How Inbound Works/i)).not.toBeInTheDocument();
    });
});
