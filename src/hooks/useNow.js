import { useEffect, useState } from "react";

// The current time, re-read every `intervalMs`. Countdowns and relative times
// derive from this rather than decrementing a counter of their own, so a tab
// that was throttled in the background is right again on its next tick.
export function useNow(intervalMs = 1000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
}
