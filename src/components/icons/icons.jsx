// Figma's exported SVG URLs expire after ~7 days, so these are inline re-draws at
// the exact leaf dimensions the design specifies; keep the explicit width/height
// — the design uses non-uniform sizes.

export function ArrowRight({ className = "" }) {
    // trailing glyph inside the hero CTA
    return (
        <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            className={className}>
            <path
                d="M1 6h10M7 2l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function Check({ className = "" }) {
    // the two neutral micro-props under the CTA
    return (
        <svg
            width="10.867"
            height="8.017"
            viewBox="0 0 11 8"
            fill="none"
            aria-hidden="true"
            className={className}>
            <path
                d="M1 4.2L3.9 7 10 1"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function Timer({ className = "" }) {
    // taller than the checks; carries the danger accent
    return (
        <svg
            width="11.25"
            height="13.125"
            viewBox="0 0 9 10.5"
            fill="none"
            aria-hidden="true"
            className={className}>
            <circle
                cx="4.5"
                cy="6.2"
                r="3.8"
                stroke="currentColor"
                strokeWidth="1.1"
            />
            <path
                d="M4.5 4.4v1.9l1.3 1"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M3.2 0.6h2.6"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function Bolt({ className = "" }) {
    // step 01 tile
    return (
        <svg
            width="13.333"
            height="16.667"
            viewBox="0 0 10 12.5"
            fill="none"
            aria-hidden="true"
            className={className}>
            <path
                d="M5.8 0.6L1 7.1h3.3l-.9 4.8 4.8-6.5H4.9l.9-4.8z"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function Envelope({ className = "" }) {
    // step 02 tile
    return (
        <svg
            width="16.667"
            height="15"
            viewBox="0 0 12.5 11.25"
            fill="none"
            aria-hidden="true"
            className={className}>
            <rect
                x="0.6"
                y="1.4"
                width="11.3"
                height="8.5"
                rx="1.2"
                stroke="currentColor"
                strokeWidth="1.1"
            />
            <path
                d="M0.9 2.2l5.35 3.9 5.35-3.9"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function Shred({ className = "" }) {
    // step 03 tile, widest but shortest of the three
    return (
        <svg
            width="16.667"
            height="12.083"
            viewBox="0 0 12.5 9"
            fill="none"
            aria-hidden="true"
            className={className}>
            <path
                d="M0.8 2.1h7.4"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
            />
            <path
                d="M3.3 2.1V1.3a.8.8 0 01.8-.8h.8a.8.8 0 01.8.8v.8"
                stroke="currentColor"
                strokeWidth="1.1"
            />
            <path
                d="M1.7 2.1l.5 5.4a1 1 0 001 .9h2.6a1 1 0 001-.9l.5-5.4"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinejoin="round"
            />
            <path
                d="M9.6 3.4h2.3M9.6 5.2h2.3M9.6 7h2.3"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function Moon({ className = "" }) {
    // dark-mode toggle in the header
    return (
        <svg
            width="13.5"
            height="13.5"
            viewBox="0 0 13.5 13.5"
            fill="none"
            aria-hidden="true"
            className={className}>
            <path
                d="M11.8 8.4A5.2 5.2 0 015.1 1.7a5.4 5.4 0 106.7 6.7z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function Copy({ className = "" }) {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            className={className}>
            <rect
                x="4.7"
                y="4.7"
                width="8.2"
                height="8.2"
                rx="1.4"
                stroke="currentColor"
                strokeWidth="1.2"
            />
            <path
                d="M2.4 9.3H2a.9.9 0 01-.9-.9V2a.9.9 0 01.9-.9h6.4a.9.9 0 01.9.9v.4"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function CheckThick({ className = "" }) {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            className={className}>
            <path
                d="M2.5 7.3L5.6 10.4 11.5 4.2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/**
 * The status node: 6x6 in the pills, 8x8 as the brand mark. A filled shape
 * rather than the "●" character it replaced, which rendered at whatever size
 * the surrounding font happened to be.
 */
export function Dot({ size = 6, className = "" }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 6 6"
            fill="none"
            aria-hidden="true"
            className={className}>
            <circle cx="3" cy="3" r="3" fill="currentColor" />
        </svg>
    );
}

export function Refresh({ className = "" }) {
    return (
        <svg
            width="10.667"
            height="10.667"
            viewBox="0 0 10.667 10.667"
            fill="none"
            aria-hidden="true"
            className={className}>
            <path
                d="M9.6 5.33a4.27 4.27 0 11-1.25-3.02"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
            />
            <path
                d="M9.7 1.1v3.1H6.6"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function Plus({ className = "" }) {
    return (
        <svg
            width="9.333"
            height="9.333"
            viewBox="0 0 9.333 9.333"
            fill="none"
            aria-hidden="true"
            className={className}>
            <path
                d="M4.667 0.9v7.533M0.9 4.667h7.533"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function Trash({ className = "" }) {
    return (
        <svg
            width="10.667"
            height="12"
            viewBox="0 0 10.667 12"
            fill="none"
            aria-hidden="true"
            className={className}>
            <path
                d="M0.8 2.6h9.067M3.6 2.6V1.5a.7.7 0 01.7-.7h2.067a.7.7 0 01.7.7v1.1"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M2.2 2.6l.5 8a.9.9 0 00.9.83h4.467a.9.9 0 00.9-.83l.5-8"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinejoin="round"
            />
            <path
                d="M4.3 5.1v4.3M6.367 5.1v4.3"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function ArrowLeft({ className = "" }) {
    return (
        <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            className={className}>
            <path
                d="M11 6H1M5 2L1 6l4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** The trailing mark on an outbound link, replacing the "→" character. */
export function ExternalLink({ className = "" }) {
    return (
        <svg
            width="10.667"
            height="10.667"
            viewBox="0 0 10.667 10.667"
            fill="none"
            aria-hidden="true"
            className={className}>
            <path
                d="M5.1 1.1h4.467v4.467"
                stroke="currentColor"
                strokeWidth="1.15"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M9.567 1.1L4.9 5.767"
                stroke="currentColor"
                strokeWidth="1.15"
                strokeLinecap="round"
            />
            <path
                d="M8.4 6.5v2.4a.9.9 0 01-.9.9H1.9a.9.9 0 01-.9-.9V3.3a.9.9 0 01.9-.9h2.4"
                stroke="currentColor"
                strokeWidth="1.15"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function ChevronDown({ className = "" }) {
    return (
        <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
            className={className}>
            <path
                d="M2.2 3.8L5 6.6l2.8-2.8"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// --- Reader and attachment glyphs ------------------------------------
// These shared a 24x24 outline style but were re-drawn inline at each call
// site; consolidated here so a change lands everywhere at once. Size is the
// caller's, via className.

export function Paperclip({ className = "" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className={className}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
        </svg>
    );
}

export function Download({ className = "" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className={className}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
        </svg>
    );
}

export function CheckCircle({ className = "" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className={className}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
        </svg>
    );
}

export function Warning({ className = "" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className={className}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
        </svg>
    );
}

export function Close({ className = "" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

export function Print({ className = "" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className={className}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
        </svg>
    );
}

export function Clock({ className = "" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className={className}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
        </svg>
    );
}

export function Shield({ className = "" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className={className}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
        </svg>
    );
}

/** Replaces the bare "@" character prefixed to the reader's address chip. */
export function AtSign({ className = "" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className={className}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
            />
        </svg>
    );
}

