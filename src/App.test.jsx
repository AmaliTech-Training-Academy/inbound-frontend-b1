import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("./services/inboxApi.js", async () => {
    const actual = await vi.importActual("./services/inboxApi.js");
    return { ...actual, createInbox: vi.fn(), getInboxInfo: vi.fn() };
});

import App from "./App.jsx";
import { createInbox } from "./services/inboxApi.js";

const CREATED = {
    id: "i1",
    address: "from-landing@inbound.dev",
    token: "tok",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
};

function renderApp() {
    // App renders a route table, so it needs a router around it to mount.
    return render(
        <MemoryRouter initialEntries={["/"]}>
            <App />
        </MemoryRouter>,
    );
}

describe("App", () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    it("opens the inbox the landing page generated", async () => {
        // The landing page and the inbox must share one session. If each held
        // its own, the inbox would open on something the landing never made.
        const user = userEvent.setup();
        createInbox.mockResolvedValue(CREATED);
        renderApp();

        await user.click(screen.getByRole("button", { name: "Generate Inbox" }));
        await user.click(await screen.findByRole("link", { name: "Go to inbox" }));

        expect(screen.getByRole("heading", { level: 1, name: "Inbox" })).toBeInTheDocument();
        expect(screen.getAllByText("from-landing@inbound.dev")).not.toHaveLength(0);
        expect(createInbox).toHaveBeenCalledTimes(1);
    });

    it("offers a retry when an inbox cannot be made", async () => {
        const user = userEvent.setup();
        vi.spyOn(console, "error").mockImplementation(() => {});
        createInbox.mockRejectedValue(new Error("Could not reach the server."));
        renderApp();

        await user.click(screen.getByRole("button", { name: "Generate Inbox" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not reach the server. Check your connection and try again.",
        );

        createInbox.mockResolvedValue(CREATED);
        await user.click(screen.getByRole("button", { name: "Try Again" }));

        expect(await screen.findByText("from-landing@inbound.dev")).toBeInTheDocument();
    });
});
