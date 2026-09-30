// A token is only a code when the message also says, near it, that it is one.
// That wording, and not the shape, is what separates a code from the invoice
// numbers, ids, dates and hashes that look exactly like one.

// A bare "code" is deliberately absent: "zip code", "exit code" and "status
// code" are ordinary in mail and each would hand back an unrelated number.
const CODE_KEYWORD =
    /\b(?:one[\s-]time (?:code|passcode|password)|two[\s-]factor code|2fa code|verification code|security code|(?:auth|authentication) code|login code|sign[\s-]in code|confirmation code|passcode|otp)\b/gi;

// How far past the keyword a code may sit, so a code-shaped token in a later,
// unrelated paragraph is not claimed.
const LOOKAHEAD_CHARS = 80;

// Not anchored with \b, because \b treats "-" and "." as boundaries and
// "555-1234" and "$19.00" must not match.
const CODE_PATTERN =
    /\d{3}[ \t-]\d{3}|[A-Z0-9]{1,4}[ \t-][A-Z0-9]{1,4}|\d{4,8}|[A-Z0-9]{4,8}/g;

// Characters that, glued to a candidate, mean it is part of something longer
// rather than a code standing alone ("e742b6", "#4928", "2026-09").
const GLUED_BEFORE = /[\w#.,=+\-/\\%$€£@—–]/;
const GLUED_AFTER = /[\w+\-/\\%$€£@—–]/;

/** The scannable text of a message part: HTML stripped, whitespace collapsed. */
function toPlainText(value) {
    if (typeof value !== "string") return "";

    return (
        value
            // A script's body is not message content, and its numbers would
            // otherwise be scanned as if it were.
            .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
            // Replaced by a space rather than nothing, so "<b>849</b><b>201</b>"
            // cannot become the six-digit "849201".
            .replace(/<[^>]*>/g, " ")
            // The one entity that can split a code in two.
            .replace(/&nbsp;|&#160;/gi, " ")
            .replace(/\s+/g, " ")
            .trim()
    );
}

function isGluedToSomethingElse(text, index, value) {
    const before = text[index - 1];
    const after = text[index + value.length];

    if (before != null && GLUED_BEFORE.test(before)) return true;
    if (after != null && GLUED_AFTER.test(after)) return true;

    return false;
}

/**
 * The code a candidate spells, or null when it is only code-shaped.
 *
 * Letters must be upper case and mixed with digits, which keeps words, hashes,
 * ids and file names out; a separator-split candidate must mix within a group of
 * its own, so "24 USD" and "INV-2026" are not read as codes. A code written in
 * lower case is missed, and the reader then hides the section.
 */
function toCodeValue(raw) {
    const groups = raw.split(/[ \t-]+/);
    const compact = groups.join("");

    if (/^\d+$/.test(compact)) {
        if (groups.length === 1) {
            return /^\d{4,8}$/.test(compact) ? compact : null;
        }

        // "2026-09" is a date and "1234 5678" is two numbers; only the 3+3 is
        // a code that a sender grouped.
        return groups.every((group) => group.length === 3)
            ? groups.join(" ")
            : null;
    }

    if (!/^[A-Z0-9]{4,8}$/.test(compact)) return null;
    if (!/\d/.test(compact)) return null;

    const mixes = groups.some(
        (group) => /[A-Z]/.test(group) && /\d/.test(group),
    );

    return groups.length === 1 || mixes ? compact : null;
}

function firstCodeAfter(text, from) {
    const window = text.slice(from, from + LOOKAHEAD_CHARS);

    for (const match of window.matchAll(CODE_PATTERN)) {
        if (isGluedToSomethingElse(window, match.index, match[0])) continue;

        const code = toCodeValue(match[0]);
        if (code) return code;
    }

    return null;
}

/**
 * The verification code of a message, or null when there isn't one that can be
 * trusted. Both parts are scanned, and `body` may be HTML or plain text.
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
