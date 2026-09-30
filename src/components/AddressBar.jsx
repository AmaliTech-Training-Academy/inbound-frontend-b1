import { useCallback, useEffect, useRef, useState } from "react";
import Button from "./ui/Button";
import { CheckThick, Copy } from "./icons/icons";

export default function AddressBar({ address }) {
    const [copyState, setCopyState] = useState("idle");
    const addressRef = useRef(null);
    const resetTimer = useRef(null);

    useEffect(() => () => clearTimeout(resetTimer.current), []);

    const copy = useCallback(async () => {
        clearTimeout(resetTimer.current);
        try {
            await navigator.clipboard.writeText(address);
            setCopyState("copied");
            resetTimer.current = setTimeout(() => setCopyState("idle"), 2000);
        } catch (err) {
            console.error("[AddressBar] clipboard write failed", err);
            setCopyState("failed");
            const node = addressRef.current;
            if (node) {
                const range = document.createRange();
                range.selectNodeContents(node);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
            resetTimer.current = setTimeout(() => setCopyState("idle"), 6000);
        }
    }, [address]);

    return (
        <div>
            <div className="flex items-center justify-between gap-3 border-b-2 border-ink pb-4">
                <span
                    ref={addressRef}
                    className="min-w-0 flex-1 truncate font-mono text-2xl text-ink tracking-tight">
                    {address}
                </span>

                <Button
                    type="button"
                    size="lg"
                    onClick={copy}
                    aria-label={
                        copyState === "copied"
                            ? `${address} copied to clipboard`
                            : copyState === "failed"
                              ? `Could not copy ${address} automatically; it is selected, press Ctrl+C`
                              : `Copy ${address}`
                    }
                    className="shrink-0 transition-opacity hover:opacity-90">
                    {/* Copied reads in green, as on the reader's Copy Code. */}
                    {copyState === "copied" ? (
                        <span className="flex items-center gap-1.5 font-semibold text-success">
                            <CheckThick />
                            <span className="hidden sm:inline">Copied</span>
                        </span>
                    ) : (
                        <>
                            <Copy />
                            <span className="hidden sm:inline">Copy Address</span>
                        </>
                    )}
                </Button>
            </div>

            {copyState === "failed" && (
                <p
                    role="alert"
                    className="mt-3 text-center text-[13px] text-danger">
                    Couldn&apos;t copy automatically. The address is selected —
                    press Ctrl+C (or Cmd+C) to copy it.
                </p>
            )}
        </div>
    );
}