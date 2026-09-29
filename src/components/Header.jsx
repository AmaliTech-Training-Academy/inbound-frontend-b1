import { useEffect, useRef } from "react";
import Button from "./ui/Button";
import { Moon } from "./icons/icons";

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
        // One header for every page, the reader included, so they cannot drift.
        <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-line bg-white/80 px-6 backdrop-blur-sm">
            <div className="flex select-none items-center gap-2">
                <span aria-hidden="true" className="size-2 rounded-full bg-ink" />
                <span className="text-base font-semibold tracking-[-0.4px] text-ink">
                    Inbound
                </span>
            </div>
            <div className="flex items-center">
                <Button
                    onClick={handleGenerate}
                    disabled={creating}
                    aria-keyshortcuts="G"
                    className="h-8 gap-2 rounded-[2px] px-3 text-[13px]">
                    {creating ? "Generating…" : "Generate Email"}
                    {!creating && (
                        <kbd
                            aria-hidden="true"
                            className="rounded-[2px] border border-[#c6c6cd] bg-[#191c1d] px-[5px] font-mono text-[12px] leading-4 font-normal text-white">
                            G
                        </kbd>
                    )}
                </Button>

                {/* Dark mode is not implemented yet, so the toggle is shown but disabled. */}
                <span className="ml-3 border-l border-[#c6c6cd] pl-3">
                    <button
                        type="button"
                        disabled
                        aria-label="Toggle dark mode (coming soon)"
                        title="Dark mode is not available yet"
                        className="grid size-7 place-items-center rounded-[2px] text-ink disabled:cursor-not-allowed">
                        <Moon />
                    </button>
                </span>
            </div>
        </header>
    );
}
