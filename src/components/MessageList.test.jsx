// AC #2: each entry shows sender, subject and the time received.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

    it("prefers the sender a reader-shaped message already carries", () => {
        render(
            <MessageList
                messages={[
                    {
                        id: "msg-1",
                        senderName: "Notion Team",
                        senderEmail: "notify@m.notion.so",
                        subject: "Your login code",
                        receivedAt: now(),
                    },
                ]}
            />,
        );

        expect(screen.getByText("Notion Team")).toBeInTheDocument();
    });

    it("shows a placeholder for a missing subject", () => {
        render(
            <MessageList
                messages={[{ id: "msg-1", from: "a@b.c", receivedAt: now() }]}
            />,
        );

        expect(screen.getByText("(No Subject)")).toBeInTheDocument();
    });

    it("says when a row carries attachments", () => {
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
                isUnread={() => false}
            />,
        );

        expect(
            screen.getByRole("button", {
                name: "Open message from a@b.c: Invoice, with attachments",
            }),
        ).toBeInTheDocument();
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

        const rows = screen.getAllByRole("listitem");
        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveTextContent("First");
        expect(rows[1]).toHaveTextContent("Second");
    });

    it("hands the clicked row back to the caller", async () => {
        const user = userEvent.setup();
        const onSelectMessage = vi.fn();
        const message = {
            id: "msg-1",
            sender: "Ada Lovelace <ada@example.com>",
            subject: "Your verification code",
            receivedAt: now(),
        };

        render(
            <MessageList
                messages={[message]}
                onSelectMessage={onSelectMessage}
                isUnread={() => false}
            />,
        );

        await user.click(
            screen.getByRole("button", {
                name: "Open message from Ada Lovelace: Your verification code",
            }),
        );

        expect(onSelectMessage).toHaveBeenCalledWith(message);
    });

    it("gives a subjectless row something to be announced by", async () => {
        const user = userEvent.setup();
        const onSelectMessage = vi.fn();
        const message = { id: "msg-1", from: "a@b.c", receivedAt: now() };

        render(
            <MessageList
                messages={[message]}
                onSelectMessage={onSelectMessage}
                isUnread={() => false}
            />,
        );

        await user.click(
            screen.getByRole("button", {
                name: "Open message from a@b.c: (No Subject)",
            }),
        );

        expect(onSelectMessage).toHaveBeenCalledWith(message);
    });

    it("marks the open message as the current row", () => {
        render(
            <MessageList
                messages={[
                    { id: "a", subject: "One", fromAddress: "a@x.dev", receivedAt: now() },
                    { id: "b", subject: "Two", fromAddress: "a@x.dev", receivedAt: now() },
                ]}
                selectedId="b"
            />,
        );

        const [first, second] = screen.getAllByRole("button");
        expect(first).not.toHaveAttribute("aria-current");
        expect(second).toHaveAttribute("aria-current", "true");
    });

    describe("read state", () => {
        const row = { id: "a", subject: "Hi", fromAddress: "a@x.dev", receivedAt: now() };

        it("announces an unopened message as unread", () => {
            render(<MessageList messages={[row]} isUnread={() => true} />);

            expect(
                screen.getByRole("button", { name: "Open message from a@x.dev: Hi, unread" }),
            ).toBeInTheDocument();
        });

        it("drops the unread note once the message is opened", () => {
            render(<MessageList messages={[row]} isUnread={() => false} />);

            expect(
                screen.getByRole("button", { name: "Open message from a@x.dev: Hi" }),
            ).toBeInTheDocument();
        });
    });

    it("shows the verification code found in the message", () => {
        render(
            <MessageList
                messages={[
                    {
                        id: "a",
                        subject: "Your login code is 849 201",
                        fromAddress: "a@x.dev",
                        receivedAt: now(),
                    },
                ]}
            />,
        );
        expect(screen.getByText("OTP: 849201")).toBeInTheDocument();
    });

    it("uses the code a reader-shaped message already worked out", () => {
        render(
            <MessageList
                messages={[
                    {
                        id: "a",
                        subject: "Welcome",
                        fromAddress: "a@x.dev",
                        receivedAt: now(),
                        verificationCode: "112 358",
                    },
                ]}
            />,
        );
        expect(screen.getByText("OTP: 112358")).toBeInTheDocument();
    });

    it("follows the subject with a plain-text preview of the body", () => {
        render(
            <MessageList
                messages={[
                    {
                        id: "a",
                        subject: "Welcome",
                        body: "<p>Two steps <b>left</b></p>",
                        fromAddress: "a@x.dev",
                        receivedAt: now(),
                    },
                ]}
            />,
        );
        expect(screen.getByText("Two steps left")).toBeInTheDocument();
    });

    it("decodes escaped markup in the preview instead of showing entities", () => {
        render(
            <MessageList
                messages={[
                    {
                        id: "a",
                        subject: "Pasted code",
                        body: "<div>&lt;!DOCTYPE html&gt; &lt;p&gt;Tom &amp;amp; Jerry&lt;/p&gt;</div>",
                        fromAddress: "a@x.dev",
                        receivedAt: now(),
                    },
                ]}
            />,
        );
        expect(screen.getByText("<!DOCTYPE html> <p>Tom &amp; Jerry</p>")).toBeInTheDocument();
    });
});
