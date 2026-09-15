// Owns the inbox lifecycle. Every other IND-3 component reads from this.

// status: 'loading' | 'idle' | 'creating' | 'active' | 'expired' | 'error'

//   loading  - checking storage on first paint, show nothing/skeleton
//   idle     - no inbox, show the Generate button
//   creating - request in flight, button disabled + spinner
//   active   - inbox exists and hasn't expired
//   expired  - the clock ran out
//   error    - creation failed, offer retry

import { useCallback, useEffect, useRef, useState } from "react";
import { createInbox, fetchInbox, ApiError } from "../services/inboxApi.js";
import {
    saveInbox,
    loadInbox,
    clearInbox,
    msRemaining,
} from "./inboxStorage.js";

//the timeout exists to turn a hung request into a retryable error r
// rather than a button stuck on "Generating…" forever.
const CREATE_TIMEOUT_MS = 8000;

// The doc caps TTL at 10 minutes, so a server expiry further out than
// this is not a longer-lived inbox — it's a static mock example, clock
// skew, or a bug. See isPlausibleExpiry below.
const MAX_PLAUSIBLE_TTL_MS = 10 * 60 * 1000;

// Whether a server-supplied expiresAt is worth trusting over what we
// already stored. A Postman mock returns a timestamp that was hardcoded
// when the example was saved; adopting it would either expire the inbox
// instantly (past date) or freeze the countdown at an absurd number
// (far-future date). Either way it overwrites a good local value with a
// meaningless one, and the write persists, so every refresh repeats it.
function isPlausibleExpiry(value) {
    if (!value) return false;
    const ms = new Date(value).getTime() - Date.now();
    if (Number.isNaN(ms)) return false;
    return ms > 0 && ms < MAX_PLAUSIBLE_TTL_MS;
}

export function useInbox() {
    const [status, setStatus] = useState(() => {
        const stored = loadInbox();
        return stored ? "loading" : "idle";
    });
    const [inbox, setInbox] = useState(null);
    const [error, setError] = useState(null);

    // Guards against a double-click creating two inboxes. A ref rather than
    // state because we need the value synchronously inside the handler.
    const inFlight = useRef(false);

    // On mount: rehydrate. loadInbox already drops anything expired, so
    // reaching here with a value means the client thinks it's alive — we
    // still confirm with the server, since the backend may have reaped it.
    useEffect(() => {
        const stored = loadInbox();
        if (!stored) {
            return;
        }

        const controller = new AbortController();

        (async () => {
            try {
                const fresh = await fetchInbox(stored.id, stored.token, {
                    signal: controller.signal,
                });

                // id, address and token are assigned once at creation and can
                // never change for the life of an inbox, so they are never
                // merged — a server value could only corrupt them, never
                // correct them. expiresAt genuinely can change (an extend in
                // another tab pushes it out), so it is the one field worth
                // taking from the server — but only when it looks real.
                const merged = isPlausibleExpiry(fresh?.expiresAt)
                    ? { ...stored, expiresAt: fresh.expiresAt }
                    : stored;

                // Only touch storage when something actually changed. Writing
                // an identical blob on every mount is noise that makes a real
                // bug harder to spot in the Application tab.
                if (merged !== stored) saveInbox(merged);

                setInbox(merged);
                setStatus("active");
            } catch (err) {
                if (controller.signal.aborted) return;

                if (
                    err instanceof ApiError &&
                    (err.isUnauthorized || err.isNotFound)
                ) {
                    // Server says it's gone (or the token's dead). Clean slate.
                    clearInbox();
                    setStatus("idle");
                } else {
                    // Network blip — trust local state rather than dumping the
                    // user back to the landing page and losing their address.
                    setInbox(stored);
                    setStatus("active");
                }
            }
        })();

        return () => controller.abort();
    }, []);

    // Flip to expired the moment the clock runs out. One timeout aimed at the
    // exact expiry instant, re-armed whenever expiresAt changes (an extension
    // in IND-19 will push it out).
    useEffect(() => {
        if (status !== "active" || !inbox) return;

        const remaining = msRemaining(inbox.expiresAt);

        if (remaining <= 0) {
            clearInbox();
            setStatus("expired");
            return;
        }

        const t = setTimeout(() => {
            clearInbox();
            setStatus("expired");
        }, remaining);

        return () => clearTimeout(t);
    }, [status, inbox]);

    // Backgrounded tabs get their timers throttled, and a sleeping machine
    // stops them entirely — so the timeout above can fire long after expiry.
    // Countdown recalculates from the timestamp and would show 0:00 while
    // status still said "active". Re-check whenever the tab comes back.
    useEffect(() => {
        if (status !== "active" || !inbox) return;

        const recheck = () => {
            if (document.visibilityState !== "visible") return;
            if (msRemaining(inbox.expiresAt) <= 0) {
                clearInbox();
                setStatus("expired");
            }
        };

        document.addEventListener("visibilitychange", recheck);
        window.addEventListener("focus", recheck);
        return () => {
            document.removeEventListener("visibilitychange", recheck);
            window.removeEventListener("focus", recheck);
        };
    }, [status, inbox]);

    const generate = useCallback(async () => {
        if (inFlight.current) return;
        inFlight.current = true;

        setStatus("creating");
        setError(null);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), CREATE_TIMEOUT_MS);

        try {
            const created = await createInbox({ signal: controller.signal });
            saveInbox(created);
            setInbox(created);
            setStatus("active");
        } catch (err) {
            const isTimeout = err?.name === "AbortError";
            setError(
                isTimeout
                    ? new Error("That took too long. Check your connection.")
                    : err,
            );
            setStatus("error");
        } finally {
            clearTimeout(timer);
            inFlight.current = false;
        }
    }, []);

    // Used by IND-19's "New address" and by the retry path after expiry.
    const reset = useCallback(() => {
        clearInbox();
        setInbox(null);
        setError(null);
        setStatus("idle");
    }, []);

    return { status, inbox, error, generate, reset };
}
