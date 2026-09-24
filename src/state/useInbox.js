// Owns the inbox lifecycle. Every other IND-3 component reads from this.

// status: 'idle' | 'creating' | 'active' | 'expired' | 'error'

//   idle     - no inbox, show the Generate button
//   creating - request in flight, button disabled + spinner
//   active   - inbox exists and hasn't expired
//   expired  - the clock ran out
//   error    - creation failed, offer retry

import { useCallback, useEffect, useRef, useState } from "react";
import {
    createInbox,
    getInboxInfo,
    extendInbox,
    ApiError,
} from "../services/inboxApi.js";
import { MAX_EXTENDS } from "../config.js";
import {
    saveInbox,
    loadInbox,
    clearInbox,
    msRemaining,
} from "./inboxStorage.js";

// The timeout exists to turn a hung request into a retryable error
// rather than a button stuck on "Generating…" forever.
const CREATE_TIMEOUT_MS = 8000;

// Whether a server-supplied expiresAt is worth adopting.
//
// Only a sanity check that it parses and is still in the future. There is
// deliberately no upper bound: the server owns the TTL (the API accepts no
// ttlMinutes and extends by a fixed amount without a documented cap), so any
// ceiling derived from our own config would reject valid expiries and pin the
// countdown to a stale value.
function isPlausibleExpiry(value) {
    if (!value) return false;
    const ms = new Date(value).getTime() - Date.now();
    if (Number.isNaN(ms)) return false;
    return ms > 0;
}

export function useInbox() {
    // Restore straight from storage rather than showing a placeholder while
    // the server confirms. loadInbox() has already discarded anything expired
    // or malformed, so what comes back is displayable immediately: a refresh
    // now redraws the same screen the user was on instead of blanking it for
    // the length of a round trip. The confirmation below still runs, and
    // still tears the inbox down if the server says it is gone.
    const [restored] = useState(loadInbox);
    const [status, setStatus] = useState(restored ? "active" : "idle");
    const [inbox, setInbox] = useState(restored);
    const [error, setError] = useState(null);

    // Which inbox action is in flight: 'extending' | 'refreshing' |
    // 'destroying' | null. Drives the per-button disabled/loading state
    // without collapsing it into the top-level `status` machine.
    const [busy, setBusy] = useState(null);

    // Guards against a double-click creating two inboxes. A ref rather than
    // state because we need the value synchronously inside the handler.
    const inFlight = useRef(false);

    const actionLock = useRef(false);

    useEffect(() => {
        const stored = loadInbox();
        if (!stored) {
            return;
        }

        const controller = new AbortController();

        (async () => {
            try {
                const fresh = await getInboxInfo(stored.token, {
                    signal: controller.signal,
                });
                // /inbox/info returns no id and no token - the caller
                // already holds both - so only the mutable fields are merged.
                const expiryChanged =
                    isPlausibleExpiry(fresh?.expiresAt) &&
                    fresh.expiresAt !== stored.expiresAt;

                const merged = {
                    ...stored,
                    ...(expiryChanged ? { expiresAt: fresh.expiresAt } : {}),
                    ...(fresh?.createdAt
                        ? { createdAt: fresh.createdAt }
                        : {}),
                    ...(fresh?.extendCount != null
                        ? { extendCount: fresh.extendCount }
                        : {}),
                };

                // Only touch storage when the value actually changed.
                // Compare the timestamp, not object identity: spreading
                // `stored` mints a new object every time, so an identity check
                // would rewrite an identical blob on every mount.
                if (expiryChanged || fresh?.createdAt) saveInbox(merged);

                setInbox(merged);
                setStatus("active");
            } catch (err) {
                if (controller.signal.aborted) return;

                console.error(
                    "[useInbox] could not confirm the stored inbox with the server",
                    err,
                );

                if (err instanceof ApiError && err.isDead) {
                    // 401/403/404/410 all mean the same thing to the user:
                    // this inbox is gone. 410 in particular is the server
                    // telling us it outlived its TTL.
                    clearInbox();
                    setStatus(err.isExpired ? "expired" : "idle");
                } else {
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
            // The API accepts no request body: lifetime is server-owned.
            const created = await createInbox({ signal: controller.signal });
            saveInbox(created);
            setInbox(created);
            setStatus("active");
        } catch (err) {
            const isTimeout = err?.name === "AbortError";
            console.error(
                isTimeout
                    ? "[useInbox] createInbox timed out after " +
                          `${CREATE_TIMEOUT_MS}ms`
                    : "[useInbox] createInbox failed",
                err,
            );
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

    // "Destroy Inbox".
    //
    // Local-only, because the API has no DELETE: the address keeps receiving
    // mail server-side until its TTL runs out. Discarding the token is the
    // most this client can do - without it nothing here can read the inbox
    // again. If a delete endpoint is added, this is where it goes.
    const destroy = useCallback(() => {
        reset();
    }, [reset]);

    // "+ Extend 5m". Pushes expiresAt out server-side, then adopts the new
    // timestamp: the expiry timeout and the progress ring both key off it.
    const extend = useCallback(async () => {
        if (!inbox?.id || !inbox?.token) return;
        if (actionLock.current) return;
        actionLock.current = true;
        setBusy("extending");
        setError(null);
        try {
            const res = await extendInbox(inbox.token);
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
            if (err instanceof ApiError && err.isDead) {
                clearInbox();
                setInbox(null);
                setStatus("expired");
                return;
            }
            setError(new Error("Could not extend the inbox. Try again."));
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
            const fresh = await getInboxInfo(inbox.token);
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
            if (err instanceof ApiError && err.isDead) {
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
