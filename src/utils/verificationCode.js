// Reads a verification code out of a message so the reader can show one without
// any parsing of its own. Called from the message adapter (utils/message.js),
// which is the single place the API's message shape is normalised.
//
// The hard part is not finding numbers, it is not finding the wrong one. Mail is
// full of four-to-eight digit numbers that mean something else - invoice totals,
// message ids, dates, zip codes, phone numbers, commit hashes - so a number only
// counts as a code when the message also says, near it, that it is one.

// The wording that makes a nearby number a code. Drawn from the phrases real
// senders use, and from the sample messages in src/data/mockMessages.js
// ("login code", "verification code", "one-time code").
//
// A bare "code" is deliberately not on this list. "Zip code", "exit code",
// "error code" and "status code" are all ordinary in mail, and each would hand
// back a number with nothing to do with verification. A message that uses none
// of the phrases below gets null, which the reader already handles by hiding
// the code section.
const CODE_KEYWORD =
    /\b(?:one[\s-]time (?:code|passcode|password)|two[\s-]factor code|2fa code|verification code|security code|(?:auth|authentication) code|login code|sign[\s-]in code|confirmation code|passcode|otp)\b/gi;

// How far past the keyword a code may sit. Senders write "Your verification
// code is 849 201" or "OTP: 123456", so the code is close; the window is what
// stops a number in a later, unrelated paragraph from being claimed.
const LOOKAHEAD_CHARS = 80;

// Four to eight digits, or the same split 3+3 the way real mail writes it
// ("849 201", the shape of the code in the Notion sample). Not anchored with
// \b, because \b treats "-" and "." as boundaries and "555-1234" and "$19.00"
// must not match; the neighbours are checked instead, below.
const CODE_PATTERN = /\d{3}[ \t]\d{3}|\d{4,8}/g;

// A candidate is thrown away when one of these is glued directly to its left,
// which is what "e742b6", "att_01", "#4928" and "invoice-2026-09" look like.
// Punctuation that merely ends a sentence is not here, so "code is 849 201."
// still counts, and neither is ":", so "OTP: 123456" counts.
const GLUED_BEFORE = /[\w#.,=+\-/\\%$€£@—–]/;

// The same on the right, which is what "$24.00 USD" and "2026-09" look like.
const GLUED_AFTER = /[\w+\-/\\%$€£@—–]/;

/**
 * The scannable text of a message part.
 *
 * HTML is stripped - tags and the attributes inside them - so no code is ever
 * read out of markup, and the `code=849201` in an href never reaches the scan.
 * Whitespace is collapsed so a match cannot depend on where the sender wrapped
 * a line. Plain text passes through, bar that collapsing.
 */
function toPlainText(value) {
    if (typeof value !== "string") return "";

    return (
        value
            // A script's body is not message content, and its punctuation and
            // numbers would otherwise be scanned as if it were.
            .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
            // Tags, attributes and all. Replaced by a space rather than by
            // nothing, so "<b>849</b><b>201</b>" cannot become the six-digit
            // "849201" - a different code from the one that was written.
            .replace(/<[^>]*>/g, " ")
            // The one entity that can split a code in two.
            .replace(/&nbsp;|&#160;/gi, " ")
            .replace(/\s+/g, " ")
            .trim()
    );
}

/**
 * Is this number part of something longer, rather than a code standing alone?
 *
 * Both sides are checked because the giveaways differ: a hash or an id leads
 * ("e742b6", "#4928") while a date or a price trails ("2026-09", "24.00 USD").
 */
function isGluedToSomethingElse(text, index, value) {
    const before = text[index - 1];
    const after = text[index + value.length];

    if (before != null && GLUED_BEFORE.test(before)) return true;
    if (after != null && GLUED_AFTER.test(after)) return true;

    return false;
}

function firstCodeAfter(text, from) {
    const window = text.slice(from, from + LOOKAHEAD_CHARS);

    for (const match of window.matchAll(CODE_PATTERN)) {
        if (!isGluedToSomethingElse(window, match.index, match[0])) {
            return match[0];
        }
    }

    return null;
}

/**
 * The verification code of a message, or null when there isn't one that can be
 * trusted.
 *
 * Both parts are scanned, because senders put the code in either - the sample
 * message in src/data/mockMessages.js has it in both. `body` may be HTML or
 * plain text; the API documents a single body field that carries whichever the
 * sender sent, so markup is handled rather than assumed away.
 *
 * The code is returned as the message wrote it, so a 3+3 code comes back as
 * "849 201" - the form the reader's widest letter-spacing is built for, and the
 * form the API's own example uses.
 */
export function extractVerificationCode({ subject, body } = {}) {
    const text = toPlainText([subject, body].filter(Boolean).join(" "));
    if (!text) return null;

    for (const match of text.matchAll(CODE_KEYWORD)) {
        const code = firstCodeAfter(text, match.index + match[0].length);

        if (code) return code;
    }

    return null;
}
