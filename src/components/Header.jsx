import { useEffect, useRef } from "react";
import Button from "./ui/Button";

// Typing "g" in a field is text, not a shortcut.
function isTypingTarget(el) {
    return (
        el instanceof HTMLElement &&
        (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
    );
}

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

    // "G" does what the button does, as the design's key hint promises. Read
    // through a ref so the listener is attached once and never goes stale.
    const handleGenerateRef = useRef(handleGenerate);
    useEffect(() => {
        handleGenerateRef.current = handleGenerate;
    });

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key !== "g" && event.key !== "G") return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.repeat || isTypingTarget(event.target)) return;
            handleGenerateRef.current();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    return (
        <header className="flex w-full items-center justify-between px-6 py-3 border-b border-line bg-header/80 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 font-bold text-ink">
                <span className="text-[14px]">●</span>
                <span className="text-base tracking-tight">Inbound</span>
            </div>
            <div className="flex items-center gap-3">
                <Button
                    onClick={handleGenerate}
                    disabled={creating}
                    aria-keyshortcuts="G"
                    className="gap-2">
                    {creating ? "Generating…" : "Generate Email"}
                    {!creating && (
                        <kbd
                            aria-hidden="true"
                            className="rounded-[2px] border border-white/40 px-1 font-mono text-[11px] leading-4 font-normal">
                            G
                        </kbd>
                    )}
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
