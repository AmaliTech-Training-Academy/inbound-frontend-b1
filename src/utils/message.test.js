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

        expect(toReaderMessage(mock)).toEqual({ ...mock, recipientEmail: null, textBody: null });
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

    it("prefers a body key the reader already knows", () => {
        const message = toReaderMessage({ htmlBody: "<p>Kept</p>", html: "<p>Ignored</p>" });

        expect(message.htmlBody).toBe("<p>Kept</p>");
    });

    it("gives the reader an attachment list to count", () => {
        expect(toReaderMessage({ id: "live-1" }).attachments).toEqual([]);
    });

    it("passes a missing message straight through", () => {
        expect(toReaderMessage(undefined)).toBeUndefined();
    });
});
