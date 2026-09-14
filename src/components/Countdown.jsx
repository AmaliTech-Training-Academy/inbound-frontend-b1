// Purely a display: reads `expiresAt` and re-renders the remaining time.
// It does NOT decide when the inbox has expired — useInbox already owns
// that transition via its own setTimeout. This just shows the number.

import { useEffect, useState } from "react";
import { msRemaining } from "../state/inboxStorage.js";

export default function Countdown({ expiresAt }) {
    const [remaining, setRemaining] = useState(() => msRemaining(expiresAt));

    useEffect(() => {
        // Resync immediately when expiresAt changes (e.g. after an extend),
        // then tick. 250ms rather than 1000ms so the display never visibly
        // stalls, but we still only show whole seconds.
        setRemaining(msRemaining(expiresAt));
        const id = setInterval(() => setRemaining(msRemaining(expiresAt)), 250);
        return () => clearInterval(id);
    }, [expiresAt]);

    const totalSeconds = Math.max(0, Math.round(remaining / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const display = `${minutes}:${String(seconds).padStart(2, "0")}`;

    return (
        <div>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {display}
            </span>
            <span> remaining</span>
        </div>
    );
}
