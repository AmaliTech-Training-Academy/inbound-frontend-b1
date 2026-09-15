// Purely a display: reads `expiresAt` and re-renders the remaining time.
// It does NOT decide when the inbox has expired — useInbox already owns
// that transition via its own setTimeout. This just shows the number.

import { useEffect, useState, useMemo } from "react";

export default function Countdown({ expiresAt }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const intervalId = setInterval(() => {
            setNow(Date.now());
        }, 250);

        return () => clearInterval(intervalId);
    }, []);


    const formattedTime = useMemo(() => {
        // 1. Defensive Check: If expiresAt is missing/null, return a default
        if (!expiresAt) return "00:00";

        // 2. Type Safety: Convert expiresAt to a numeric timestamp
        const expiryTimestamp = new Date(expiresAt).getTime();

        // 3. Math: Now we can safely subtract
        const secondsRemaining = Math.max(
            0,
            Math.floor((expiryTimestamp - now) / 1000),
        );

        // 4. Formatting
        const minutes = Math.floor(secondsRemaining / 60);
        const seconds = secondsRemaining % 60;

        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }, [expiresAt, now]);

    return (
        <div>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {formattedTime}
            </span>
            <span> remaining</span>
        </div>
    );
}
