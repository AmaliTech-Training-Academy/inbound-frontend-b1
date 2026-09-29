// Several inboxes in one session, driven through the real App in mock mode:
// the bugs worth catching here are in how the rail, the per-inbox feeds and
// the session state fit together, which no single component test can see.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";

// An inbox stored by the one-inbox version, so this also covers migrating it.
const STORED_INBOX = {
    id: "inbox-multi-1",
    address: "first-inbox@inbound.mail",
    token: "token-multi-1",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
};

const ARRIVAL = {
    id: "multi-msg-1",
    subject: "Your verification code",
    fromAddress: "ada@example.com",
    receivedAt: new Date().toISOString(),
};

// The mock's fetchMessage answers with its own sender and subject.
const ROW_LABEL = "Open message from Mock Sender: Mock message";

const rail = () => screen.getByRole("navigation", { name: "Inboxes" });
const railRows = () =>
    within(rail())
        .getAllByRole("button")
        // A row's label is its address; each row's copy button reads "Copy …".
        .filter((button) => {
            const label = button.getAttribute("aria-label") ?? "";
            return /@/.test(label) && !label.startsWith("Copy ");
        });

async function openFirstInboxWithAMessage() {
    render(
        <MemoryRouter initialEntries={["/"]}>
            <App />
        </MemoryRouter>,
    );
    await screen.findByRole("heading", { name: "Inbox" });

    // The socket joins a tick after the inbox mounts, so re-announce until
    // the row lands; useMessages claims an id before fetching, so repeats are
    // harmless.
    await waitFor(
        () => {
            window.__inboundSimulateMessage?.(ARRIVAL);
            return screen.getByLabelText(ROW_LABEL);
        },
        { timeout: 3000 },
    );
}

describe("several inboxes in one session", () => {
    beforeEach(() => {
        window.sessionStorage.clear();
        window.sessionStorage.setItem("inbound.inbox", JSON.stringify(STORED_INBOX));
    });

    afterEach(() => window.sessionStorage.clear());

    it("adds a second inbox, switches back, and keeps the first one's mail", async () => {
        await openFirstInboxWithAMessage();

        fireEvent.click(within(rail()).getByRole("button", { name: "+ New inbox" }));
        await waitFor(() => expect(railRows()).toHaveLength(2), { timeout: 3000 });

        // The new inbox is the open one, and it has no mail of its own.
        expect(await screen.findByText("Your inbox is empty")).toBeInTheDocument();
        expect(screen.queryByLabelText(ROW_LABEL)).toBeNull();

        fireEvent.click(
            within(rail()).getByRole("button", {
                name: new RegExp(`^${STORED_INBOX.address}`),
            }),
        );

        // Its feed stayed alive while the other inbox was open.
        expect(await screen.findByLabelText(ROW_LABEL)).toBeInTheDocument();
        expect(screen.getByText(STORED_INBOX.address)).toBeInTheDocument();
    });

    it("destroys only the open inbox and moves to the other", async () => {
        await openFirstInboxWithAMessage();

        fireEvent.click(within(rail()).getByRole("button", { name: "+ New inbox" }));
        await waitFor(() => expect(railRows()).toHaveLength(2), { timeout: 3000 });

        fireEvent.click(screen.getByRole("button", { name: /destroy inbox/i }));
        const dialog = screen.getByRole("alertdialog");
        expect(dialog).toHaveTextContent("Your other inbox stays.");
        fireEvent.click(within(dialog).getByRole("button", { name: /yes, destroy inbox/i }));

        await waitFor(() => expect(railRows()).toHaveLength(1));
        expect(railRows()[0]).toHaveAccessibleName(
            new RegExp(`^${STORED_INBOX.address}`),
        );
        expect(screen.getByRole("heading", { name: "Inbox" })).toBeInTheDocument();
    });
});
