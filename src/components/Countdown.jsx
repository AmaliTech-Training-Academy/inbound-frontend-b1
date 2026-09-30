import { useEffect, useState, useMemo } from "react";

export default function Countdown({ expiresAt }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        // The display is whole seconds, so a faster tick would only re-render
        // more often for the same output.
        const intervalId = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);

    const formattedTime = useMemo(() => {
        if (!expiresAt) return "00:00";

        const expiryTimestamp = new Date(expiresAt).getTime();

        const secondsRemaining = Math.max(
            0,
            Math.floor((expiryTimestamp - now) / 1000),
        );

        const minutes = Math.floor(secondsRemaining / 60);
        const seconds = secondsRemaining % 60;

        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }, [expiresAt, now]);

    return (
        <div>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {formattedTime}
            </span>
            {/* The design shows the digits alone; screen readers still get
                the word that makes them a duration. */}
            <span className="sr-only"> remaining</span>
        </div>
    );
}
