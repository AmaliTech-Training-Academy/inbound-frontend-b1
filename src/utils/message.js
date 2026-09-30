// Maps the API's message shape onto the shape in data/mockMessages.js that the
// reader was built against.

import { extractVerificationCode } from "./verificationCode.js";

// `sender` is a display projection like "Ada Lovelace <ada@example.com>", while
// from/fromAddress hold the bare address.
function splitSender(message) {
    const raw = message?.sender || message?.from || message?.fromAddress || "";
    const angled = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);

    if (angled) {
        return { name: angled[1] || angled[2], email: angled[2] };
    }

    return { name: raw || "Unknown sender", email: "" };
}

// A tag, and not merely an angle bracket, so `5 < 6` and a bare
// `<ada@example.com>` stay text.
const HTML_TAG = /<\/?[a-z][a-z0-9]*(?:\s[^<>]*)?\/?>/i;

function looksLikeHtml(value) {
    return typeof value === "string" && HTML_TAG.test(value);
}

function toReaderMessage(message) {
    if (!message) return message;

    const sender = splitSender(message);

    // The API documents one `body` field, holding either sanitized HTML or plain
    // text, so it has to be routed to the right one of the reader's two keys. It
    // cannot go to both: the text path collapses newlines, and HTML on the text
    // path shows its tags literally.
    const explicitHtml = message.htmlBody || message.html || null;
    const explicitText = message.textBody || message.text || null;
    const bodyIsHtml =
        !explicitHtml && !explicitText && looksLikeHtml(message.body);

    const htmlBody = explicitHtml || (bodyIsHtml ? message.body : null);
    const textBody = explicitText || (bodyIsHtml ? null : message.body) || null;

    return {
        ...message,
        senderName: message.senderName || sender.name,
        senderEmail: message.senderEmail || sender.email || null,
        recipientEmail: message.recipientEmail || message.to || null,
        htmlBody,
        textBody,
        // An explicit value is the backend's own word on it and wins; otherwise
        // the code is extracted here and is null when none can be trusted.
        verificationCode:
            message.verificationCode ||
            extractVerificationCode({
                subject: message.subject,
                // The part the reader will actually show, so the code shown and
                // the code read come from the same place.
                body: htmlBody || textBody,
            }),
        attachments: message.attachments || [],
    };
}

export { splitSender, toReaderMessage };
