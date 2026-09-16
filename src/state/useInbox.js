// Owns the inbox lifecycle. Every other IND-3 component reads from this.

// status: 'loading' | 'idle' | 'creating' | 'active' | 'expired' | 'error'

//   loading  - checking storage on first paint, show nothing/skeleton
//   idle     - no inbox, show the Generate button
//   creating - request in flight, button disabled + spinner
//   active   - inbox exists and hasn't expired
//   expired  - the clock ran out
//   error    - creation failed, offer retry

import { useCallback, useEffect, useRef, useState } from "react";
import {
    createInbox,
    fetchInbox,
    extendInbox,
    deleteInbox,
    ApiError,
} from "../services/inboxApi.js";
import { INBOX_TTL_MINUTES, EXTEND_MINUTES, MAX_EXTENDS } from "../config.js";
import {
    saveInbox,
    loadInbox,
    clearInbox,
    msRemaining,
} from "./inboxStorage.js";

// The timeout exists to turn a hung request into a retryable error
// rather than a button stuck on "Generating…" forever.
const CREATE_TIMEOUT_MS = 8000;

// The longest life an inbox can legitimately have: the TTL we request at
// creation plus every extension the server will allow. Anything further out
// than this is not a longer-lived inbox — it's a static mock example, clock
// skew, or a bug. Derived from config so it cannot drift from what we send.
// See isPlausibleExpiry below.
const MAX_PLAUSIBLE_TTL_MS =
    (INBOX_TTL_MINUTES + MAX_EXTENDS * EXTEND_MINUTES) * 60 * 1000;

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

    // Which inbox action is in flight: 'extending' | 'refreshing' |
    // 'destroying' | null. Drives the per-button disabled/loading state
    // without collapsing it into the top-level `status` machine.
    const [busy, setBusy] = useState(null);

    // Guards against a double-click creating two inboxes. A ref rather than
    // state because we need the value synchronously inside the handler.
    const inFlight = useRef(false);

    // One lock across extend/refresh/destroy. `busy` drives the UI but is
    // async state, so it cannot prevent a second action starting in the same
    // tick, and the three of them are not independent: a refresh that started
    // before an extend resolves with the pre-extend expiry and would write it
    // back over the newer one. Serialising them is simpler than
    // reconciling out-of-order responses, and the user has no reason to run
    // two at once.
    const actionLock = useRef(false);

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
                const expiryChanged =
                    isPlausibleExpiry(fresh?.expiresAt) &&
                    fresh.expiresAt !== stored.expiresAt;

                const merged = expiryChanged
                    ? { ...stored, expiresAt: fresh.expiresAt }
                    : stored;

                // Only touch storage when the value actually changed.
                // Compare the timestamp, not object identity: spreading
                // `stored` mints a new object every time, so an identity check
                // would rewrite an identical blob on every mount.
                if (expiryChanged) saveInbox(merged);

                setInbox(merged);
                setStatus("active");
            } catch (err) {
                if (controller.signal.aborted) return;

                if (
                    err instanceof ApiError &&
                    (err.isUnauthorized || err.isNotFound)
                ) {
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
    // exact expiry instant, re-armed whenever expiresAt changes (an extend
    // pushes it out).

    useEffect(() => {
        if (status !== "active" || !inbox) return;

        const remaining = Math.max(0, msRemaining(inbox.expiresAt));

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
            const created = await createInbox({
                ttlMinutes: INBOX_TTL_MINUTES,
                signal: controller.signal,
            });
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
    // Local-only: does not touch the server.
    const reset = useCallback(() => {
        clearInbox();
        setInbox(null);
        setError(null);
        setStatus("idle");
    }, []);

    const destroy = useCallback(async () => {
        const current = inbox;
        if (current?.id && current?.token) {
            if (actionLock.current) return;
            actionLock.current = true;
            setBusy("destroying");
            try {
                await deleteInbox(current.id, current.token);
            } catch (err) {
                console.error("[useInbox] destroy failed", err);
            } finally {
                actionLock.current = false;
                setBusy(null);
            }
        }
        reset();
    }, [inbox, reset]);

    // "+ Extend 5m". Pushes expiresAt out server-side, then adopts the new
    // timestamp: the expiry timeout and the progress ring both key off it.
    const extend = useCallback(async () => {
        if (!inbox?.id || !inbox?.token) return;
        if (actionLock.current) return;
        actionLock.current = true;
        setBusy("extending");
        setError(null);
        try {
            const res = await extendInbox(inbox.id, inbox.token, {
                extendMinutes: EXTEND_MINUTES,
            });
            if (!res?.expiresAt) {
                throw new ApiError(
                    500,
                    "CONTRACT_MISMATCH",
                    "Extend response missing expiresAt",
                );
            }
            const next = {
                ...inbox,
                expiresAt: res.expiresAt,
                extendCount: res.extendCount ?? (inbox.extendCount ?? 0) + 1,
            };
            saveInbox(next);
            setInbox(next);
        } catch (err) {
            console.error("[useInbox] extend failed", err);
            const limitReached =
                err instanceof ApiError && err.code === "EXTEND_LIMIT_REACHED";
            setError(
                new Error(
                    limitReached
                        ? "This inbox cannot be extended any further."
                        : "Could not extend the inbox. Try again.",
                ),
            );
        } finally {
            actionLock.current = false;
            setBusy(null);
        }
    }, [inbox]);

    // "Refresh". Re-reads the inbox so an expiry changed elsewhere (another
    // tab extending it) and, from IND-7, the message list are picked up.
    const refresh = useCallback(async () => {
        if (!inbox?.id || !inbox?.token) return;
        if (actionLock.current) return;
        actionLock.current = true;
        setBusy("refreshing");
        setError(null);
        try {
            const fresh = await fetchInbox(inbox.id, inbox.token);
            if (
                isPlausibleExpiry(fresh?.expiresAt) &&
                fresh.expiresAt !== inbox.expiresAt
            ) {
                const next = { ...inbox, expiresAt: fresh.expiresAt };
                saveInbox(next);
                setInbox(next);
            }
        } catch (err) {
            console.error("[useInbox] refresh failed", err);
            if (
                err instanceof ApiError &&
                (err.isUnauthorized || err.isNotFound)
            ) {
                // Server says it is gone. Do not keep showing a dead address.
                clearInbox();
                setInbox(null);
                setStatus("expired");
                return;
            }
            setError(new Error("Could not refresh the inbox. Try again."));
        } finally {
            actionLock.current = false;
            setBusy(null);
        }
    }, [inbox]);

    return {
        status,
        inbox,
        error,
        busy,
        canExtend: (inbox?.extendCount ?? 0) < MAX_EXTENDS,
        generate,
        reset,
        destroy,
        extend,
        refresh,
    };
}
