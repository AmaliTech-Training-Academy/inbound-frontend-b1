// The feed hands out the API's message shape, while the reader was built
// against the shape in data/mockMessages.js. This maps the first onto the
// second, leaving anything the reader already understands untouched.

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

function toReaderMessage(message) {
    if (!message) return message;

    const sender = splitSender(message);

    return {
        ...message,
        senderName: message.senderName || sender.name,
        senderEmail: message.senderEmail || sender.email || null,
        recipientEmail: message.recipientEmail || message.to || null,
        // The body arrives under whichever key the backend picked; the reader
        // only looks at htmlBody/textBody, so gather the known spellings.
        htmlBody: message.htmlBody || message.html || null,
        textBody: message.textBody || message.text || message.body || null,
        attachments: message.attachments || [],
    };
}

export { splitSender, toReaderMessage };
