import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

// An icon button that copies `text`, and says so. When the clipboard is
// blocked it selects the text in `fallbackRef` instead, so Ctrl+C still works.
export default function CopyButton({
    text,
    fallbackRef = null,
    size = 15,
    className = "",
    children = null,
}) {
    const [state, setState] = useState("idle");
    const reset = useRef(null);
    useEffect(() => () => clearTimeout(reset.current), []);

    const copy = async (event) => {
        // Rows and pills around this button are clickable too.
        event.stopPropagation();
        clearTimeout(reset.current);
        try {
            await navigator.clipboard.writeText(text);
            setState("copied");
            reset.current = setTimeout(() => setState("idle"), 1500);
        } catch (err) {
            console.error("[CopyButton] clipboard write failed", err);
            setState("failed");
            const node = fallbackRef?.current;
            if (node) {
                const range = document.createRange();
                range.selectNodeContents(node);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
            reset.current = setTimeout(() => setState("idle"), 6000);
        }
    };

    return (
        <button
            type="button"
            onClick={copy}
            aria-label={
                state === "copied"
                    ? `${text} copied to clipboard`
                    : state === "failed"
                      ? `Could not copy ${text} automatically${
                            fallbackRef ? "; it is selected, press Ctrl+C" : ""
                        }`
                      : `Copy ${text}`
            }
            title={state === "failed" ? "Couldn't copy automatically" : "Copy address"}
            className={`inline-flex shrink-0 items-center gap-1.5 transition-colors ${
                state === "copied"
                    ? "text-emerald-600"
                    : state === "failed"
                      ? "text-rose-600"
                      : "text-slate-400 hover:text-slate-700"
            } ${className}`}>
            {state === "copied" ? <Check size={size} /> : <Copy size={size} />}
            {children}
        </button>
    );
}
