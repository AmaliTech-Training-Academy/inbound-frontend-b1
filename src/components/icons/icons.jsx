// icons.jsx
//
// The Figma file exports each of these as a separate SVG asset, but those
// URLs expire after ~7 days, so committing them as <img src> would break
// the build within a week. These are inline re-draws at the exact leaf
// dimensions the design specifies — noted on each.
//
// To ship the exact exported bytes instead, download them while the URLs
// are live into src/assets/ and swap these for <img> tags. Keep the
// explicit width/height either way: the design uses non-uniform sizes and
// one global icon size would break the layout.



export function ArrowRight({ className = "" }) {
    // 12 x 12 — trailing glyph inside the hero CTA
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
    // 10.867 x 8.017 — the two neutral micro-props under the CTA
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
    // 11.25 x 13.125 — taller than the checks; carries the danger accent
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
    // 13.333 x 16.667 — step 01 tile
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
    // 16.667 x 15 — step 02 tile
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
    // 16.667 x 12.083 — step 03 tile, widest but shortest of the three
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
    // 13.5 x 13.5 — dark-mode toggle in the header
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
