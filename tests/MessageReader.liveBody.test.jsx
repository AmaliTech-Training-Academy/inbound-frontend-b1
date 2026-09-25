// A live message reaches the reader through toReaderMessage, and the API sends
// a single `body` that can be HTML or plain text. This pins the end of that
// flow - what the reader renders - rather than how the adapter labels it, which
// src/utils/message.test.js covers.
//
// Kept out of tests/MessageReader.test.jsx on purpose: that file is IND-10's,
// and this flow is IND-7's live body.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MessageReader from "../src/components/MessageReader.jsx";
import { toReaderMessage } from "../src/utils/message.js";

// A live message as fetchMessage returns it: sender/fromAddress rather than the
// reader's senderName/senderEmail, no htmlBody or textBody, one `body`.
const live = (body) =>
    toReaderMessage({
        id: "live-body-1",
        subject: "Your verification code",
        sender: "Ada Lovelace <ada@example.com>",
        receivedAt: new Date().toISOString(),
        attachments: [],
        body,
    });

const bodyFrame = () => screen.getByTitle("Sandboxed Email Content");

describe("a live message body", () => {
    it("renders HTML in the sandboxed frame rather than as literal tags", () => {
        const { container } = render(
            <MessageReader message={live("<div>hiiiiiiiiii</div>")} />,
        );

        // The markup goes into the frame...
        expect(bodyFrame().getAttribute("srcdoc")).toContain(
            "<div>hiiiiiiiiii</div>",
        );

        // ...and the reader shows neither the tags nor the body as plain text,
        // which is what it used to do.
        expect(container.textContent).not.toContain("<div>");
        expect(container.textContent).not.toContain("hiiiiiiiiii");
    });

    it("keeps a plain-text body readable, line breaks and all", () => {
        const body = "Hello,\n\nLine one.\n\nLine two.";

        render(<MessageReader message={live(body)} />);

        // Plain text must not be pushed through the HTML frame, or the newlines
        // would collapse.
        expect(screen.queryByTitle("Sandboxed Email Content")).toBeNull();

        const rendered = screen.getByText(/Line one\./);
        expect(rendered.textContent).toBe(body);
        expect(rendered).toHaveClass("whitespace-pre-wrap");
    });

    it("never lets a script in the body become executable", () => {
        const { container } = render(
            <MessageReader
                message={live(
                    "<div>Hi</div><script>window.__liveBodyRan = true</script>",
                )}
            />,
        );

        // The script travels as inert text inside the sandboxed document: the
        // frame has no allow-scripts, and its CSP is script-src 'none'.
        expect(bodyFrame().getAttribute("sandbox")).toBe("allow-same-origin");
        expect(bodyFrame().getAttribute("srcdoc")).toContain("script-src 'none'");
        expect(bodyFrame().getAttribute("srcdoc")).toContain("<script>");

        // It is not a real script element in the page, and not shown as text.
        expect(container.querySelector("script")).toBeNull();
        expect(container.textContent).not.toContain("__liveBodyRan");
        expect(window.__liveBodyRan).toBeUndefined();
    });

    it("does not load remote content carried by the body", () => {
        const { container } = render(
            <MessageReader
                message={live(
                    '<div>Hi</div><img src="https://tracker.example.com/pixel.png">',
                )}
            />,
        );

        // Nothing remote is fetched by the page itself: the img stays inside
        // the sandboxed document, whose CSP is img-src 'none' and whose CSS
        // hides images as a second line of defence.
        expect(container.querySelector('img[src^="https://"]')).toBeNull();
        expect(bodyFrame().getAttribute("srcdoc")).toContain("img-src 'none'");
    });
});
