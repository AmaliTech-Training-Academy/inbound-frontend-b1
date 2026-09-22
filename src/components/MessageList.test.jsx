import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, within } from "@testing-library/react";
import MessageList from "./MessageList.jsx";

const NOW = new Date("2026-09-17T12:00:00.000Z").getTime();
const ago = (ms) => new Date(NOW - ms).toISOString();

const messages = [
    {
        id: "m2",
        fromAddress: "newer@example.com",
        subject: "Your verification code",
        receivedAt: ago(30_000),
    },
    {
        id: "m1",
        fromAddress: "older@example.com",
        subject: "Welcome aboard",
        receivedAt: ago(5 * 60_000),
    },
];

describe("MessageList", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("shows sender, subject and time for each message", () => {
        // AC 2: each list entry shows sender, subject, and time received.
        render(<MessageList messages={messages} />);

        const rows = screen.getAllByRole("listitem");
        expect(rows).toHaveLength(2);

        expect(within(rows[0]).getByText("newer@example.com")).toBeInTheDocument();
        expect(
            within(rows[0]).getByText("Your verification code"),
        ).toBeInTheDocument();
        expect(within(rows[0]).getByText("just now")).toBeInTheDocument();

        expect(within(rows[1]).getByText("older@example.com")).toBeInTheDocument();
        expect(within(rows[1]).getByText("Welcome aboard")).toBeInTheDocument();
        expect(within(rows[1]).getByText("5m ago")).toBeInTheDocument();
    });

    it("renders messages in the order given", () => {
        render(<MessageList messages={messages} />);
        const rows = screen.getAllByRole("listitem");
        expect(rows[0]).toHaveTextContent("newer@example.com");
        expect(rows[1]).toHaveTextContent("older@example.com");
    });

    it("exposes a machine-readable timestamp and a full one on hover", () => {
        render(<MessageList messages={[messages[0]]} />);
        const time = screen.getByText("just now");
        expect(time).toHaveAttribute("datetime", messages[0].receivedAt);
        expect(time.getAttribute("title")).toBeTruthy();
    });

    it("refreshes relative times as the clock moves", () => {
        render(<MessageList messages={[messages[0]]} />);
        expect(screen.getByText("just now")).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(3 * 60_000);
        });

        expect(screen.getByText("3m ago")).toBeInTheDocument();
    });

    it("labels a message with no subject instead of leaving a blank row", () => {
        render(
            <MessageList
                messages={[{ ...messages[0], subject: "" }]}
            />,
        );
        expect(screen.getByText("(no subject)")).toBeInTheDocument();
    });

    it("falls back when the sender is missing", () => {
        render(
            <MessageList
                messages={[{ ...messages[0], fromAddress: undefined }]}
            />,
        );
        expect(screen.getByText("unknown sender")).toBeInTheDocument();
    });

    it("renders nothing but an empty list for no messages", () => {
        render(<MessageList messages={[]} />);
        expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    });

    it("keeps rows non-interactive until the reader exists", () => {
        // Opening a message is IND-8. A row that looks clickable and does
        // nothing is the defect IND-3's review flagged on the inert buttons.
        render(<MessageList messages={messages} />);
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
});
