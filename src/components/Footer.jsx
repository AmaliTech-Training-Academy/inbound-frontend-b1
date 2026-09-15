export default function Footer() {
    return (
        <footer className="w-full border-t border-gray-300 bg-surface px-6 py-6 text-xs text-muted box-border">
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
                    <a
                        href="#manifesto"
                        className="hover:text-ink text-gray-600 transition-colors">
                        Manifesto
                    </a>
                    <a
                        href="#documentation"
                        className="hover:text-ink text-gray-600 transition-colors">
                        Documentation
                    </a>
                    <a
                        href="#security"
                        className="hover:text-ink text-gray-600 transition-colors">
                        Security Audits
                    </a>
                    <a
                        href="#terms"
                        className="hover:text-ink text-gray-600 transition-colors">
                        Terms
                    </a>
                </div>
            </div>
        </footer>
    );
}
