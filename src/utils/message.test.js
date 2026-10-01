// The reader is built on the mock shape (senderName/senderEmail/htmlBody) while
// the feed hands out the API's (sender/from/body), so the mapping between them
// is worth pinning down here rather than through the reader's rendering.

import { describe, it, expect } from "vitest";
import { splitSender, toReaderMessage } from "./message.js";

describe("splitSender", () => {
    it("splits a display name from its address", () => {
        expect(splitSender({ sender: "Ada Lovelace <ada@example.com>" })).toEqual({
            name: "Ada Lovelace",
            email: "ada@example.com",
        });
    });

    it("falls back to the bare address when there is no display name", () => {
        expect(splitSender({ fromAddress: "ada@example.com" })).toEqual({
            name: "ada@example.com",
            email: "",
        });
    });

    it("names an unknown sender rather than leaving the row blank", () => {
        expect(splitSender({}).name).toBe("Unknown sender");
    });
});

describe("toReaderMessage", () => {
    it("keeps the fields the reader already understands", () => {
        const mock = {
            id: "849201a",
            senderName: "Notion Team",
            senderEmail: "notify@m.notion.so",
            htmlBody: "<p>Code</p>",
            attachments: [{ id: "att_01", filename: "guide.pdf" }],
        };

        expect(toReaderMessage(mock)).toEqual({
            ...mock,
            recipientEmail: null,
            textBody: null,
            // "Code" on its own is not a trigger, so this sample yields none.
            verificationCode: null,
        });
    });

    it("reads a display sender and address into the reader's fields", () => {
        const message = toReaderMessage({
            id: "live-1",
            sender: "Ada Lovelace <ada@example.com>",
            subject: "Your verification code",
        });

        expect(message.senderName).toBe("Ada Lovelace");
        expect(message.senderEmail).toBe("ada@example.com");
        expect(message.subject).toBe("Your verification code");
    });

    it("maps the body keys the API may use onto textBody", () => {
        expect(toReaderMessage({ body: "Hello" }).textBody).toBe("Hello");
        expect(toReaderMessage({ text: "Hello" }).textBody).toBe("Hello");
        expect(toReaderMessage({ html: "<p>Hello</p>" }).htmlBody).toBe("<p>Hello</p>");
    });

    // The live backend sends one `body`, documented as "Sanitized HTML when
    // available; otherwise plain text". Sending all of it to textBody is what
    // made a live message's markup show up as its own tags in the reader.
    describe("the single live body field", () => {
        it("routes an HTML body to the HTML path", () => {
            const message = toReaderMessage({
                id: "live-1",
                body: "<div>hiiiiiiiiii</div>",
            });

            expect(message.htmlBody).toBe("<div>hiiiiiiiiii</div>");
            expect(message.textBody).toBeNull();
        });

        it("keeps a plain-text body on the text path so newlines survive", () => {
            const body = "Hello,\n\nLine one.\n\nLine two.";
            const message = toReaderMessage({ id: "live-2", body });

            expect(message.textBody).toBe(body);
            expect(message.htmlBody).toBeNull();
        });

        it("does not read an angle bracket in prose as markup", () => {
            const prose = ["5 < 6 and 7 > 4", "2 <3", "Mail <ada@example.com>"];

            for (const body of prose) {
                const message = toReaderMessage({ id: "live-3", body });

                expect(message.textBody).toBe(body);
                expect(message.htmlBody).toBeNull();
            }
        });

        it("sends markup - a script included - to the sandboxed path", () => {
            const body = "<div>Hi</div><script>alert(1)</script>";
            const message = toReaderMessage({ id: "live-4", body });

            // It reaches SafeHtmlEmail, which is what stops it running: that
            // frame is sandboxed without allow-scripts and its document CSP is
            // script-src 'none'. See SafeHtmlEmail.test.jsx.
            expect(message.htmlBody).toBe(body);
            expect(message.textBody).toBeNull();
        });

        it("lets an explicit body key override the classification", () => {
            const message = toReaderMessage({
                id: "live-5",
                body: "<div>Ignored</div>",
                textBody: "Plain text wins",
            });

            expect(message.textBody).toBe("Plain text wins");
            expect(message.htmlBody).toBeNull();
        });
    });

    it("prefers a body key the reader already knows", () => {
        const message = toReaderMessage({ htmlBody: "<p>Kept</p>", html: "<p>Ignored</p>" });

        expect(message.htmlBody).toBe("<p>Kept</p>");
    });

    it("gives the reader an attachment list to count", () => {
        expect(toReaderMessage({ id: "live-1" }).attachments).toEqual([]);
    });

    // The reader only displays this field, so which code it gets is settled
    // here. The extraction rule itself is tested in verificationCode.test.js;
    // these are about the adapter picking it up and not overriding the backend.
    describe("the verification code", () => {
        it("reads one out of a live message, which carries none of its own", () => {
            const message = toReaderMessage({
                id: "live-6",
                subject: "Your Notion sign-in request",
                body: "Your verification code is 849 201. This code will expire in 10 minutes.",
            });

            expect(message.verificationCode).toBe("849 201");
        });

        it("reads one out of an HTML body without the markup around it", () => {
            const message = toReaderMessage({
                id: "live-7",
                body: "<div><p>Your security code is <strong>559124</strong>.</p></div>",
            });

            expect(message.verificationCode).toBe("559124");
        });

        it("keeps the backend's own code over one read out of the body", () => {
            const message = toReaderMessage({
                id: "live-8",
                body: "Your verification code is 849 201.",
                verificationCode: "123456",
            });

            expect(message.verificationCode).toBe("123456");
        });

        it("leaves the field null when the message carries no code", () => {
            const message = toReaderMessage({
                id: "live-9",
                subject: "Deployment pipeline failed",
                body: "Build pipeline #4928 failed. Exit code: 1",
            });

            expect(message.verificationCode).toBeNull();
        });
    });

    it("passes a missing message straight through", () => {
        expect(toReaderMessage(undefined)).toBeUndefined();
    });
});
