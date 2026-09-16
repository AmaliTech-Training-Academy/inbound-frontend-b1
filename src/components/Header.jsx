import { Moon } from "./icons/icons";
import Button from "./ui/Button";

export default function Header() {
    const scrollToGenerator = () => {
        document
            .getElementById("generate")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <header className="flex w-full items-center justify-between px-6 py-3 border-b border-line-cool">
            <div className="flex items-center gap-1.5 font-bold text-ink">
                <span className="text-[14px]">●</span>
                <span className="text-base tracking-tight">Inbound</span>
            </div>
            <div className="flex items-center gap-3">
                <Button onClick={scrollToGenerator}>Generate Email</Button>

                {/* Dark mode is not implemented yet so button set to not allowed */}

                <Button
                    variant="secondary"
                    disabled
                    aria-label="Toggle dark mode (coming soon)"
                    title="Dark mode is not available yet"
                    className="rounded-xs p-1.5 text-ink transition-colors hover:bg-line/60">
                    <Moon />
                </Button>
            </div>
        </header>
    );
}
