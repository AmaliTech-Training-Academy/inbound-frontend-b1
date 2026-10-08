// Several inboxes in one session, driven through the real App in mock mode:
// the bugs worth catching here are in how the rail, the per-inbox feeds and
// the session state fit together, which no single component test can see.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";
import { MAX_INBOXES } from "../src/config.js";

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
    // Only the first inbox hears it: the mock socket otherwise tells them all.
    to: STORED_INBOX.address,
};

// The mock's fetchMessage answers with its own sender and subject.
const ROW_LABEL = /^Open message from Mock Sender: Mock message/;

const rail = () => screen.getByRole("navigation", { name: "Inboxes" });
// Every avatar is named by its address; + is named for what it does.
const railInboxes = () =>
    within(rail())
        .getAllByRole("button")
        .filter((button) => /@/.test(button.getAttribute("aria-label") ?? ""));

async function openFirstInboxWithAMessage() {
    render(
        <MemoryRouter initialEntries={["/inbox"]}>
            <App />
        </MemoryRouter>,
    );
    await screen.findByRole("heading", { level: 1, name: "Inbox" });

    // The socket joins a tick after the inbox mounts, so re-announce until
    // the row lands; useMessages claims an id before fetching, so repeats are
    // harmless.
    await waitFor(
        () => {
            window.__inboundSimulateMessage?.(ARRIVAL);
            return screen.getByRole("button", { name: ROW_LABEL });
        },
        { timeout: 3000 },
    );
}

async function addAnInbox() {
    fireEvent.click(within(rail()).getByRole("button", { name: "New temporary inbox" }));
    const dialog = screen.getByRole("dialog", { name: "New temporary inbox" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Generate inbox" }));

    await waitFor(() => expect(railInboxes()).toHaveLength(2), { timeout: 3000 });
    expect(await within(dialog).findByText("Your new address")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog", { name: "New temporary inbox" })).toBeNull();
}

describe("several inboxes in one session", () => {
    beforeEach(() => {
        window.sessionStorage.clear();
        window.sessionStorage.setItem("inbound.inbox", JSON.stringify(STORED_INBOX));
    });

    afterEach(() => window.sessionStorage.clear());

    it("adds a second inbox, switches back, and keeps the first one's mail", async () => {
        await openFirstInboxWithAMessage();

        await addAnInbox();

        // The new inbox is the open one, and it has no mail of its own.
        expect(await screen.findByText("Your inbox is empty")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: ROW_LABEL })).toBeNull();

        // One click on the rail switches to the inbox: no profile in between.
        fireEvent.click(
            within(rail()).getByRole("button", { name: new RegExp(`^${STORED_INBOX.address}`) }),
        );
        expect(screen.queryByRole("complementary", { name: "Inbox profile" })).toBeNull();

        // Its feed stayed alive while the other inbox was open.
        expect(await screen.findByRole("button", { name: ROW_LABEL })).toBeInTheDocument();
        expect(screen.getAllByText(STORED_INBOX.address)).not.toHaveLength(0);
    });

    it("counts unread mail waiting in an inbox that is not open", async () => {
        await openFirstInboxWithAMessage();

        await addAnInbox();

        expect(
            within(rail()).getByRole("button", { name: new RegExp(`^${STORED_INBOX.address}, 1 unread`) }),
        ).toBeInTheDocument();
    });

    it("offers no more inboxes once the session holds its cap", async () => {
        const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
        window.sessionStorage.clear();
        window.sessionStorage.setItem(
            "inbound.session",
            JSON.stringify({
                token: "token-full",
                expiresAt,
                inboxes: Array.from({ length: MAX_INBOXES }, (_, i) => ({
                    id: `full-${i}`,
                    address: `full-${i}@inbound.mail`,
                    createdAt: new Date().toISOString(),
                    expiresAt,
                    extendCount: 0,
                })),
                activeId: "full-0",
                hiddenIds: [],
            }),
        );
        render(
            <MemoryRouter initialEntries={["/inbox"]}>
                <App />
            </MemoryRouter>,
        );
        await screen.findByRole("heading", { level: 1, name: "Inbox" });

        // Every way in says so: the rail, the phone strip and the toolbar.
        const limit = `Inbox limit reached: ${MAX_INBOXES} of ${MAX_INBOXES}`;
        const adds = screen.getAllByRole("button", { name: limit });
        expect(adds).toHaveLength(3);
        adds.forEach((button) => expect(button).toBeDisabled());
        expect(screen.queryByRole("button", { name: "Add an inbox" })).toBeNull();
    });

    it("destroys only the open inbox and moves to the other", async () => {
        await openFirstInboxWithAMessage();

        await addAnInbox();

        fireEvent.click(screen.getByRole("button", { name: "Destroy inbox" }));
        const dialog = screen.getByRole("alertdialog");
        expect(dialog).toHaveTextContent("Your other inbox stays.");
        fireEvent.click(within(dialog).getByRole("button", { name: /yes, destroy inbox/i }));

        await waitFor(() => expect(railInboxes()).toHaveLength(1));
        expect(railInboxes()[0]).toHaveAccessibleName(new RegExp(`^${STORED_INBOX.address}`));
        expect(screen.getByRole("heading", { level: 1, name: "Inbox" })).toBeInTheDocument();
    });
});
