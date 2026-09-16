// links have no pages yet so they are set as not allowed

const LINKS = ["Manifesto", "Documentation", "Security Audits", "Terms"];

export default function Footer() {
    return (
        <footer className="w-full border-t border-line-cool bg-surface px-6 py-6 text-xs text-muted box-border">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">Inbound</span>
                    <span className="text-line-cool">•</span>
                    <span>
                        © 2026 Inbound. Zero logs, zero tracking. Ephemeral by
                        architecture.
                    </span>
                </div>

                <div className="flex items-center gap-6 font-medium text-muted">
                    {LINKS.map((label) => (
                        <span
                            key={label}
                            title="Coming soon"
                            className="cursor-not-allowed text-gray-600">
                            {label}
                        </span>
                    ))}
                </div>
            </div>
        </footer>
    );
}
