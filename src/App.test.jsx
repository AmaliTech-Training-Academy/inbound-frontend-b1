import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("./services/inboxApi.js", async () => {
    const actual = await vi.importActual("./services/inboxApi.js");
    return { ...actual, createInbox: vi.fn(), getInboxInfo: vi.fn() };
});

import App from "./App.jsx";
import { createInbox } from "./services/inboxApi.js";

describe("App", () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.clearAllMocks();
        // jsdom has no layout, so scrollIntoView is not implemented.
        Element.prototype.scrollIntoView = vi.fn();
    });

    it("shows the inbox the header generated", async () => {
        // Header and Hero must share one inbox. If each held its own, the
        // header would create an inbox the page never displays.
        const user = userEvent.setup();
        createInbox.mockResolvedValue({
            id: "i1",
            address: "from-header@inbound.dev",
            token: "tok",
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        });

        render(<App />);
        await user.click(screen.getByRole("button", { name: /^generate email$/i }));

        // The active inbox renders the address in more than one place.
        expect(
            await screen.findAllByText("from-header@inbound.dev"),
        ).not.toHaveLength(0);
        expect(createInbox).toHaveBeenCalledTimes(1);
    });
});
