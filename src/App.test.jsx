import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("./services/inboxApi.js", async () => {
    const actual = await vi.importActual("./services/inboxApi.js");
    return { ...actual, createInbox: vi.fn(), getInboxInfo: vi.fn() };
});

import App from "./App.jsx";
import { ApiError, createInbox } from "./services/inboxApi.js";

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

    it("says a timeout once, as one sentence", async () => {
        const user = userEvent.setup();
        vi.spyOn(console, "error").mockImplementation(() => {});
        // The create request is aborted by its own timer when it runs long.
        createInbox.mockRejectedValue(new DOMException("Aborted", "AbortError"));
        renderApp();

        await user.click(screen.getByRole("button", { name: "Generate Inbox" }));

        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent("That took too long. Check your connection and try again.");
        expect(alert.textContent.match(/Check your connection/g)).toHaveLength(1);
    });

    it("offers a retry when an inbox cannot be made", async () => {
        const user = userEvent.setup();
        vi.spyOn(console, "error").mockImplementation(() => {});
        // What the API client throws when fetch itself fails.
        createInbox.mockRejectedValue(new ApiError(0, "Could not reach the server."));
        renderApp();

        await user.click(screen.getByRole("button", { name: "Generate Inbox" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Could not reach the server. Check your connection and try again.",
        );

        createInbox.mockResolvedValue(CREATED);
        await user.click(screen.getByRole("button", { name: "Try Again" }));

        expect(await screen.findByText("from-landing@inbound.dev")).toBeInTheDocument();
    });

    describe("an error on the inbox page", () => {
        async function failToAddAnInbox(user) {
            vi.spyOn(console, "error").mockImplementation(() => {});
            createInbox.mockResolvedValueOnce(CREATED).mockRejectedValueOnce(new ApiError(429));
            renderApp();

            await user.click(screen.getByRole("button", { name: "Generate Inbox" }));
            await user.click(await screen.findByRole("link", { name: "Go to inbox" }));
            await user.click(screen.getAllByRole("button", { name: "Add an inbox" })[0]);
            await user.click(screen.getByRole("button", { name: "Generate inbox" }));
            await screen.findByRole("button", { name: "Dismiss error" });
        }

        it("can be dismissed", async () => {
            const user = userEvent.setup();
            await failToAddAnInbox(user);

            await user.click(screen.getByRole("button", { name: "Dismiss error" }));

            expect(screen.queryByRole("button", { name: "Dismiss error" })).toBeNull();
        });

        it("goes away with the dialog that already showed it", async () => {
            const user = userEvent.setup();
            await failToAddAnInbox(user);

            await user.click(screen.getByRole("button", { name: "Close" }));

            expect(screen.queryByRole("alert")).toBeNull();
        });
    });
});
