export default function Footer() {
    return (
        <footer className="w-full border-t border-line bg-white/50 px-6 py-6 text-xs text-muted box-border">
            {/* Matches the widest landing section, so the brand lines up with
                "How Inbound Works" above it. */}
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">Inbound</span>
                    <span className="text-line-cool">•</span>
                    <span>
                        © 2026 Inbound. Zero logs, zero tracking. Ephemeral by
                        architecture.
                    </span>
                </div>
            </div>
        </footer>
    );
}
