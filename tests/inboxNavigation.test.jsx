// The reader is reached from the inbox and has to come back to it. The address,
// the socket and the message list all belong to the home page's subtree, so the
// trip to /inbox/:messageId must not tear any of them down.
//
// Driven through the real App and its real route table: the bug was in how
// those two routes relate to each other, not inside either screen, so a test
// of the screens alone could not see it.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";

const HOME_HEADING = "Create a temporary email in seconds.";
const INBOX_STORAGE_KEY = "inbound.inbox";

// What inboxStorage.loadInbox accepts: an id, address, token and expiresAt,
// all strings, and not yet expired. Seeding it is what puts the app on the
// active inbox rather than the landing page.
const STORED_INBOX = {
    id: "inbox-nav-1",
    address: "inbox-nav-1@inbound.mail",
    token: "token-nav-1",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
};

// What the socket announces, in the shape message:new carries. The mock
// fetchMessage answers with its own subject and sender, so the row that
// appears is labelled from those, not from this payload.
const ARRIVAL = {
    id: "live-nav-1",
    subject: "Your verification code",
    sender: "Ada Lovelace <ada@example.com>",
    fromAddress: "ada@example.com",
    receivedAt: new Date().toISOString(),
};

const ROW_LABEL = "Open message from Mock Sender: Mock message";
const READER_SUBJECT = "Mock message";

/** Renders the app at the home route, where the inbox is generated. */
function renderApp() {
    return render(
        <MemoryRouter initialEntries={["/"]}>
            <App />
        </MemoryRouter>,
    );
}

/**
 * Brings the seeded inbox up with one message in its list, and returns the row.
 *
 * The socket is created a tick after the inbox mounts, so an announcement can
 * land before anything is listening. Re-announcing is harmless - useMessages
 * claims an id before it fetches - so the call is simply repeated until the row
 * lands rather than guessing at a delay.
 */
async function openInboxWithOneMessage() {
    renderApp();

    // useInbox confirms the stored inbox with the API before it reports active.
    await screen.findByRole("heading", { name: "Inbox" });

    return await waitFor(
        () => {
            window.__inboundSimulateMessage?.(ARRIVAL);
            return screen.getByLabelText(ROW_LABEL);
        },
        { timeout: 3000 },
    );
}

async function openReaderFrom(row) {
    fireEvent.click(row);
    await screen.findByLabelText("Back to inbox");
}

function goBack() {
    fireEvent.click(screen.getByLabelText("Back to inbox"));
}

describe("the inbox and the reader", () => {
    beforeEach(() => {
        window.sessionStorage.clear();
        window.sessionStorage.setItem(
            INBOX_STORAGE_KEY,
            JSON.stringify(STORED_INBOX),
        );
    });

    afterEach(() => window.sessionStorage.clear());

    it("opens the reader from a row of the live inbox", async () => {
        await openReaderFrom(await openInboxWithOneMessage());

        expect(
            screen.getByRole("heading", { level: 1, name: READER_SUBJECT }),
        ).toBeInTheDocument();
    });

    it("comes back to the inbox, and never to the landing page", async () => {
        await openReaderFrom(await openInboxWithOneMessage());

        // The reader covers the home page rather than replacing it, so the
        // landing copy is never painted on the way in...
        expect(screen.queryByText(HOME_HEADING)).toBeNull();

        goBack();

        // ...nor on the way back. Checked straight after the click, which is
        // when a remount would still be restoring the inbox and showing it.
        expect(screen.queryByText(HOME_HEADING)).toBeNull();

        await waitFor(() =>
            expect(screen.queryByLabelText("Back to inbox")).toBeNull(),
        );
        expect(
            screen.getByRole("heading", { name: "Inbox" }),
        ).toBeInTheDocument();
    });

    it("still holds the message it was opened from", async () => {
        await openReaderFrom(await openInboxWithOneMessage());

        goBack();

        await waitFor(() =>
            expect(screen.queryByLabelText("Back to inbox")).toBeNull(),
        );

        // The list was never unmounted, so the row is the same one that was
        // clicked - not a fresh fetch of whatever the server still calls unread.
        expect(screen.getByLabelText(ROW_LABEL)).toBeInTheDocument();
    });
});
