// The Inbound mark: the orange blob with navy eyes. The same drawing as
// public/favicon.svg, so the tab, the header and the footer all show one face.
// Decorative beside the "Inbound" wordmark, so hidden from assistive tech.
export default function BrandMark({ size = 22, className = "" }) {
    return (
        <svg
            aria-hidden="true"
            width={size}
            height={size}
            viewBox="0 0 32 32"
            className={`shrink-0 ${className}`}>
            <path
                d="M16 2.5c8 0 13.5 5.6 13.5 13.6S23.9 29.5 15.9 29.5 2.5 24 2.5 16.1 8 2.5 16 2.5z"
                fill="#ff5722"
            />
            <rect x="10.5" y="11.5" width="3.2" height="7" rx="1.6" fill="#0b1c30" />
            <rect x="18.3" y="11.5" width="3.2" height="7" rx="1.6" fill="#0b1c30" />
        </svg>
    );
}
