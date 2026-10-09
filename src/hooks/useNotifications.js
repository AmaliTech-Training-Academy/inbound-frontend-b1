import { useCallback, useEffect, useRef, useState } from "react";

// Long enough to read a short line without hunting for it, short enough that a
// burst of mail does not build a wall. Dismissing by hand is always available.
const DISMISS_AFTER_MS = 6000;

// Past this, the oldest goes. Five inboxes can deliver at once, and a stack
// taller than the screen is worse than no stack at all.
const MAX_VISIBLE = 4;

/**
 * A queue of short-lived notifications.
 *
 * Keyed, not counted: `notify` with a key that is already showing does nothing,
 * so a caller may re-announce the same occurrence on every render without
 * having to remember whether it already did. The key is the occurrence - a
 * message id, an inbox id and its expiry - rather than the kind of event.
 */
export function useNotifications({ dismissAfterMs = DISMISS_AFTER_MS } = {}) {
    const [notifications, setNotifications] = useState([]);
    const timers = useRef(new Map());

    const dismiss = useCallback((key) => {
        clearTimeout(timers.current.get(key));
        timers.current.delete(key);
        setNotifications((current) => current.filter((n) => n.key !== key));
    }, []);

    const notify = useCallback(
        (notification) => {
            const { key } = notification;
            if (timers.current.has(key)) return;

            // The timer doubles as the record of what is showing, so it is set
            // before the state update rather than in an effect afterwards: two
            // calls in one tick would otherwise both pass the check above.
            timers.current.set(
                key,
                setTimeout(() => dismiss(key), dismissAfterMs),
            );

            setNotifications((current) => {
                const next = [...current, notification];
                const overflow = next.slice(0, Math.max(0, next.length - MAX_VISIBLE));
                overflow.forEach((n) => {
                    clearTimeout(timers.current.get(n.key));
                    timers.current.delete(n.key);
                });
                return next.slice(-MAX_VISIBLE);
            });
        },
        [dismiss, dismissAfterMs],
    );

    // Timers outlive the component otherwise, and fire into a dead setState.
    useEffect(() => {
        const pending = timers.current;
        return () => {
            pending.forEach((timer) => clearTimeout(timer));
            pending.clear();
        };
    }, []);

    return { notifications, notify, dismiss };
}
