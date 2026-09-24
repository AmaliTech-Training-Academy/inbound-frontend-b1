import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../state/useInbox.js", () => ({ useInbox: vi.fn() }));

import Hero from "./Hero.jsx";
import { useInbox } from "../state/useInbox.js";

const HEADLINE = /Create a temporary email in seconds/i;

function mockInbox(overrides = {}) {
    useInbox.mockReturnValue({
        status: "idle",
        inbox: null,
        error: null,
        busy: null,
        canExtend: true,
        generate: vi.fn(),
        reset: vi.fn(),
        destroy: vi.fn(),
        extend: vi.fn(),
        refresh: vi.fn(),
        ...overrides,
    });
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
        mockInbox({ status: "idle" });
        render(<Hero />);
        expect(screen.getByText(HEADLINE)).toBeInTheDocument();
    });

    it("hides the landing copy while rehydrating a stored inbox", () => {
        // On refresh useInbox starts at "loading" while it confirms the stored
        // inbox with the server. Rendering the marketing headline during that
        // window flashes the landing page before the address reappears.
        mockInbox({ status: "loading" });
        render(<Hero />);
        expect(screen.queryByText(HEADLINE)).not.toBeInTheDocument();
    });

    it("hides the landing copy once the inbox is active", () => {
        mockInbox({ status: "active", inbox: activeInbox });
        render(<Hero />);
        expect(screen.queryByText(HEADLINE)).not.toBeInTheDocument();
    });

    it("hides the landing copy on the purged screen", () => {
        mockInbox({ status: "expired" });
        render(<Hero />);
        expect(screen.queryByText(HEADLINE)).not.toBeInTheDocument();
        expect(screen.getByText(/INBOX PURGED/i)).toBeInTheDocument();
    });

    it("shows no supporting copy while rehydrating either", () => {
        mockInbox({ status: "loading" });
        render(<Hero />);
        expect(screen.queryByText(/How Inbound Works/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/No signup required/i)).not.toBeInTheDocument();
    });

    it("regenerates directly from the purged card instead of resetting", async () => {
        const user = userEvent.setup();
        const generate = vi.fn().mockResolvedValue(undefined);
        const reset = vi.fn();
        mockInbox({ status: "expired", generate, reset });

        render(<Hero />);
        await user.click(
            screen.getByRole("button", { name: /generate a new address/i }),
        );

        expect(generate).toHaveBeenCalledTimes(1);
        // reset() would drop the user back to the landing page for a second click.
        expect(reset).not.toHaveBeenCalled();
    });
});
