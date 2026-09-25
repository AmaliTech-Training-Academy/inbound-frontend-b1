// The feed hands out the API's message shape, while the reader was built
// against the shape in data/mockMessages.js. This maps the first onto the
// second, leaving anything the reader already understands untouched.

import { extractVerificationCode } from "./verificationCode.js";

// `sender` is a display projection like "Ada Lovelace <ada@example.com>",
// while from/fromAddress hold the bare address. A preview row from
// message:new has only the address, so split whatever is available.
function splitSender(message) {
    const raw = message?.sender || message?.from || message?.fromAddress || "";
    const angled = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);

    if (angled) {
        return { name: angled[1] || angled[2], email: angled[2] };
    }

    // Display name and email fall back to the same string, so the reader
    // shows the address once rather than twice.
    return { name: raw || "Unknown sender", email: "" };
}

// A tag, and not merely an angle bracket: `<` plus an optional `/`, a tag name,
// then whitespace, `/` or `>`. So `<div>hi</div>` and `<br>` are markup, while
// `5 < 6`, `2 <3` and a bare `<ada@example.com>` stay text.
const HTML_TAG = /<\/?[a-z][a-z0-9]*(?:\s[^<>]*)?\/?>/i;

function looksLikeHtml(value) {
    return typeof value === "string" && HTML_TAG.test(value);
}

function toReaderMessage(message) {
    if (!message) return message;

    const sender = splitSender(message);

    // The API documents one `body` field - "Sanitized HTML when available;
    // otherwise plain text" - so it carries either and has to be routed to the
    // right one of the reader's two keys. It cannot go to both: the text path
    // collapses newlines, and HTML on the text path shows its tags literally.
    // An explicit htmlBody/html/textBody/text always wins over classifying it.
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
        // Settled here rather than in the reader, which only displays the field:
        // a live message arrives with the body and nothing else, while the mock
        // shape has this pre-filled. An explicit value is the backend's own
        // word on it and wins; otherwise it is read out of the message, and is
        // null when the message contains no code that can be trusted.
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
