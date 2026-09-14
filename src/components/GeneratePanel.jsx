// GeneratePanel.jsx

import { useState, useCallback, useRef } from "react";
import { useInbox } from "../state/useInbox.js";
import Countdown from "./Countdown.jsx";
// import Hero from "./Hero.jsx";
import Button from "./ui/Button.jsx";

export default function GeneratePanel() {
    const { status, inbox, error, generate, reset } = useInbox();

    if (status === "loading") return <div aria-busy="true" />;

    if (status === "active" && inbox) {
        return (
            <section>
                <AddressDisplay address={inbox.address} />
                <Countdown expiresAt={inbox.expiresAt} />
                {/* <InboxList inbox={inbox} />  <- IND-7 */}
            </section>
        );
    }

    if (status === "expired") {
        return (
            <section>
                <p>This inbox has expired and its messages are gone.</p>
                <button type="button" onClick={reset}>
                    Generate a new address
                </button>
            </section>
        );
    }

    return (
        <section>
            <Button
                // variant="chip"
                type="button"
                onClick={generate}
                disabled={status === "creating"}>
                {status === "creating" ? "Generating…" : "Generate address"}
            </Button>

            {status === "error" && (
                <p role="alert">
                    {error?.message || "Could not create an inbox."} Check your
                    connection and try again.
                </p>
            )}
        </section>
    );
}

// copyState: 'idle' | 'copied' | 'failed'
//
// 'failed' matters more than it looks. The clipboard API only works in a
// secure context (https or localhost) and the browser can refuse it outright
// — e.g. if the document isn't focused. Copying the address is the whole
// point of this screen, so a silent no-op is the worst outcome: the user
// pastes stale clipboard contents into a signup form and blames us.
function AddressDisplay({ address }) {
    const [copyState, setCopyState] = useState("idle");
    const addressRef = useRef(null);
    const resetTimer = useRef(null);

    const copy = useCallback(async () => {
        clearTimeout(resetTimer.current);

        try {
            await navigator.clipboard.writeText(address);
            setCopyState("copied");
            resetTimer.current = setTimeout(() => setCopyState("idle"), 2000);
        } catch {
            setCopyState("failed");

            // Select the address so the manual fallback is one keystroke away
            // rather than a fiddly drag. This is what the old comment claimed
            // to do but didn't.
            const node = addressRef.current;
            if (node) {
                const range = document.createRange();
                range.selectNodeContents(node);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }

            // Leave the failure message up longer — the user has to act on it.
            resetTimer.current = setTimeout(() => setCopyState("idle"), 6000);
        }
    }, [address]);

    return (
        <div>
            {/* Not an <input readOnly> — that invites editing. Plain text the user
          can select, with the copy button doing the real work. */}
            <span ref={addressRef}>{address}</span>

            <button type="button" onClick={copy} aria-label={`Copy ${address}`}>
                {copyState === "copied" ? "Copied" : "Copy"}
            </button>

            {copyState === "failed" && (
                <p role="alert">
                    Couldn&apos;t copy automatically. The address is selected —
                    press Ctrl+C (or Cmd+C) to copy it.
                </p>
            )}

            {/* Announces the copy to screen readers, which won't notice a label swap */}
            <span role="status" aria-live="polite" className="visually-hidden">
                {copyState === "copied" ? "Address copied to clipboard" : ""}
            </span>
        </div>
    );
}
