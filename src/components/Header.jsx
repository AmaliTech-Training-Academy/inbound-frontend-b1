import { Moon } from "./icons/icons";
import Button from "./ui/Button";

export default function Header({ status, generate, regenerate }) {
    const creating = status === "creating";

    // Generates from wherever the user is, and brings the generator into
    // view so they see the result. An active inbox is left alone: replacing
    // it from the header would silently throw away an address in use, so
    // the button only scrolls to it.
    const handleGenerate = () => {
        document
            .getElementById("generate")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });

        if (status === "expired") regenerate();
        else if (status === "idle" || status === "error") generate();
    };

    return (
        <header className="flex w-full items-center justify-between px-6 py-3 border-b border-line-cool">
            <div className="flex items-center gap-1.5 font-bold text-ink">
                <span className="text-[14px]">●</span>
                <span className="text-base tracking-tight">Inbound</span>
            </div>
            <div className="flex items-center gap-3">
                <Button onClick={handleGenerate} disabled={creating}>
                    {creating ? "Generating…" : "Generate Email"}
                </Button>

                {/* Dark mode is not implemented yet so button set to not allowed */}

                <Button
                    variant="secondary"
                    disabled
                    aria-label="Toggle dark mode (coming soon)"
                    title="Dark mode is not available yet"
                    className="rounded-xs p-1.5 text-ink transition-colors hover:bg-line/60">
                    {/* <Moon /> will implement later */}
                </Button>
            </div>
        </header>
    );
}
