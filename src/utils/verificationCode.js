// A token is only a code when the message also says, near it, that it is one.
// That wording, and not the shape, is what separates a code from the invoice
// numbers, ids, dates and hashes that look exactly like one.

// The words that say "a code is here". Phrases first, so "verification code"
// is read as one trigger rather than as "code" alone. A bare "code" counts too
// - "Your code is 123456" and "Code: 839201" are how much real mail puts it -
// unless the word before it makes it some other kind of code (see NOT_A_LOGIN).
const CODE_KEYWORD =
    /\b(?:(?:one[\s-]time|two[\s-]factor|2fa|verification|verify|security|auth|authentication|login|log[\s-]in|sign[\s-]in|confirmation|access|activation|reset|recovery|temporary|single[\s-]use)\s+(?:code|pin|passcode|password|number)|passcode|otp|pin|code)\b/gi;

// Words that, said on their own, point back at a code written before them:
// "Use 839201 to verify your account".
const VERIFY_WORD = /\b(?:verify|verification)\b/gi;

// The word before a bare "code" that makes it not a sign-in code at all.
const NOT_A_LOGIN =
    /\b(?:zip|postal|post|area|country|region|error|exit|status|response|return|promo|promotional|discount|coupon|voucher|gift|referral|invite|tracking|reference|product|source|qr|bar|dress|colou?r|html|css|sort|swift|bank|tax|iso|airport|short)\s*$/i;

// Marketing mail says "use code SAVE20 at checkout"; a code that is a discount
// is not one to sign in with.
const SALES_WORDS = /\b(?:promo|discount|coupon|voucher|checkout|% off|off your)\b/i;

// How far past the trigger a code may sit. Senders often put a sentence in
// between ("Your code is below. Enter it in the window where you started
// signing in."), but a code-shaped token in a later paragraph is not claimed.
const LOOKAHEAD_CHARS = 140;

// How far before the trigger a code may sit, for "482913 is your Instagram
// code". Only taken when the words between join them (see JOINS_CODE_TO_WORDS).
const LOOKBEHIND_CHARS = 60;
// The words between must read as one short clause that names the code: "is
// your Instagram", "to", "- your". A dash alone is not enough ("year 2026 -
// none of these numbers is a code" must not hand back 2026), and neither is a
// sentence break.
const JOINS_CODE_TO_WORDS =
    /^\s*(?:(?:is|to|as)\b|[-—:]\s*(?:your|the|use|enter)\b)[^.!?]{0,32}$/i;

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
            // A code set one digit per box ("8 3 9 2 0 1", as designed emails
            // lay it out) is one code, not six numbers.
            .replace(/\b\d(?: \d){3,7}\b/g, (digits) => digits.replace(/ /g, ""))
            .trim()
    );
}

function isGluedToSomethingElse(text, index, value) {
    const before = text[index - 1];
    const after = text[index + value.length];

    // "G-739204": a single capital and a dash in front is a sender's prefix
    // (Google's), not part of a longer token.
    const senderPrefix =
        before === "-" &&
        /[A-Z]/.test(text[index - 2] ?? "") &&
        !/\w/.test(text[index - 3] ?? "");

    if (before != null && !senderPrefix && GLUED_BEFORE.test(before)) return true;
    if (after != null && GLUED_AFTER.test(after)) return true;

    // A number with another number a space away is one longer figure ("1234
    // 5678"), not a code beside a stray number.
    if (before === " " && /\d/.test(text[index - 2] ?? "") && /^\d/.test(value)) return true;
    if (after === " " && /\d/.test(text[index + value.length + 1] ?? "") && /\d$/.test(value)) {
        return true;
    }

    return false;
}

/**
 * The code a candidate spells, or null when it is only code-shaped.
 *
 * Letters must be upper case and mixed with digits, which keeps words, hashes,
 * ids and file names out. A separator-split candidate must mix within a group
 * of its own, or be two equal blocks of letters and digits ("ABCD-1234"), so
 * "24 USD" and "INV-2026" are not read as codes. A code written in lower case
 * is missed, and the reader then hides the section.
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
    const evenBlocks =
        groups.length === 2 &&
        groups[0].length >= 3 &&
        groups[0].length === groups[1].length;

    return groups.length === 1 || mixes || evenBlocks ? compact : null;
}

// Every code in `text`. A token that turns out not to be one is retried a
// character later rather than skipped whole: "G-7392" is not a code, but the
// "739204" it was cut from is.
function codesIn(text) {
    const found = [];
    const pattern = new RegExp(CODE_PATTERN.source, "g");
    let match;

    while ((match = pattern.exec(text)) !== null) {
        const code = isGluedToSomethingElse(text, match.index, match[0])
            ? null
            : toCodeValue(match[0]);

        if (code) {
            found.push({ code, start: match.index, end: match.index + match[0].length });
        } else {
            pattern.lastIndex = match.index + 1;
        }
    }
    return found;
}

function firstCodeAfter(text, from) {
    const window = text.slice(from, from + LOOKAHEAD_CHARS);
    return codesIn(window)[0]?.code ?? null;
}

/** The nearest code before `to`, when the words between join it to them. */
function codeJustBefore(text, to) {
    const start = Math.max(0, to - LOOKBEHIND_CHARS);
    const window = text.slice(start, to);
    const nearest = codesIn(window).at(-1);
    if (!nearest) return null;

    // Glue is judged against the whole text, not the cut-off window.
    if (isGluedToSomethingElse(text, start + nearest.start, window.slice(nearest.start, nearest.end))) {
        return null;
    }
    return JOINS_CODE_TO_WORDS.test(window.slice(nearest.end)) ? nearest.code : null;
}

function isLoginCodeWording(text, match) {
    if (!/^code$/i.test(match[0])) return true;

    const before = text.slice(Math.max(0, match.index - 30), match.index);
    if (NOT_A_LOGIN.test(before)) return false;

    const around = text.slice(Math.max(0, match.index - 60), match.index + 80);
    return !SALES_WORDS.test(around);
}

/**
 * The verification code of a message, or null when there isn't one that can be
 * trusted. Both parts are scanned, and `body` may be HTML or plain text.
 */
export function extractVerificationCode({ subject, body } = {}) {
    const text = toPlainText([subject, body].filter(Boolean).join(" "));
    if (!text) return null;

    // A code right after its wording is the common case and the safest read,
    // so every trigger is tried that way before any is read backwards.
    const triggers = [...text.matchAll(CODE_KEYWORD)].filter((match) =>
        isLoginCodeWording(text, match),
    );

    for (const match of triggers) {
        const code = firstCodeAfter(text, match.index + match[0].length);
        if (code) return code;
    }

    for (const match of [...triggers, ...text.matchAll(VERIFY_WORD)]) {
        const code = codeJustBefore(text, match.index);
        if (code) return code;
    }

    return null;
}
