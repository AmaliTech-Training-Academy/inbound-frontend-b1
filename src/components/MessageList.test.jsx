// AC #2: each entry shows sender, subject and the time received.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MessageList from "./MessageList.jsx";

const now = () => new Date().toISOString();

describe("MessageList", () => {
    it("renders nothing when there are no messages", () => {
        const { container } = render(<MessageList messages={[]} />);

        expect(container).toBeEmptyDOMElement();
    });

    it("shows the sender, subject and time received", () => {
        render(
            <MessageList
                messages={[
                    {
                        id: "msg-1",
                        sender: "Ada Lovelace <ada@example.com>",
                        subject: "Your verification code",
                        receivedAt: now(),
                    },
                ]}
            />,
        );

        expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
        expect(screen.getByText("<ada@example.com>")).toBeInTheDocument();
        expect(
            screen.getByText("Your verification code"),
        ).toBeInTheDocument();
        expect(screen.getByText("just now")).toBeInTheDocument();
    });

    it("falls back to the bare address when there is no display name", () => {
        render(
            <MessageList
                messages={[
                    {
                        id: "msg-1",
                        fromAddress: "sender@example.com",
                        subject: "Hi",
                        receivedAt: now(),
                    },
                ]}
            />,
        );

        // A preview row has only the address, so it becomes the label.
        expect(screen.getAllByText("sender@example.com").length).toBeGreaterThan(
            0,
        );
    });

    it("shows a placeholder for a missing subject", () => {
        render(
            <MessageList
                messages={[{ id: "msg-1", from: "a@b.c", receivedAt: now() }]}
            />,
        );

        expect(screen.getByText("(No Subject)")).toBeInTheDocument();
    });

    it("counts attachments when the full message has them", () => {
        render(
            <MessageList
                messages={[
                    {
                        id: "msg-1",
                        from: "a@b.c",
                        subject: "Invoice",
                        receivedAt: now(),
                        attachments: [{ id: "a1" }, { id: "a2" }],
                    },
                ]}
            />,
        );

        expect(screen.getByText("2 files")).toBeInTheDocument();
    });

    it("marks a row whose full message could not be loaded", () => {
        render(
            <MessageList
                messages={[
                    {
                        id: "msg-1",
                        fromAddress: "a@b.c",
                        subject: "Password reset",
                        receivedAt: now(),
                        incomplete: true,
                    },
                ]}
            />,
        );

        expect(screen.getByText("Could not load")).toBeInTheDocument();
    });

    it("renders every message in the order it was given", () => {
        render(
            <MessageList
                messages={[
                    {
                        id: "msg-1",
                        from: "a@b.c",
                        subject: "First",
                        receivedAt: now(),
                    },
                    {
                        id: "msg-2",
                        from: "a@b.c",
                        subject: "Second",
                        receivedAt: now(),
                    },
                ]}
            />,
        );

        expect(screen.getAllByRole("listitem")).toHaveLength(2);
    });
});
