// Owns the session's inboxes and which one is active.
//
// status: 'idle' | 'creating' | 'active' | 'expired' | 'error'

import { useCallback, useEffect, useRef, useState } from "react";
import {
    createInbox,
    getInboxInfo,
    extendInbox,
    ApiError,
} from "../services/inboxApi.js";
import { MAX_EXTENDS } from "../config.js";
import { saveInboxes, loadInboxes, msRemaining } from "./inboxStorage.js";

// Turns a hung request into a retryable error rather than a stuck spinner.
const CREATE_TIMEOUT_MS = 8000;

// Sanity check only - parses and is still in the future. Deliberately no upper
// bound: the server owns the TTL, so a ceiling from our own config would reject
// valid expiries and pin the countdown to a stale value.
function isPlausibleExpiry(value) {
    if (!value) return false;
    const ms = new Date(value).getTime() - Date.now();
    if (Number.isNaN(ms)) return false;
    return ms > 0;
}

/** Swaps one inbox out of the list, leaving the others untouched. */
function replaceInbox(inboxes, id, patch) {
    return inboxes.map((inbox) =>
        inbox.id === id ? { ...inbox, ...patch } : inbox,
    );
}

export function useInbox() {
    // Restore from storage so a refresh redraws the same screen instead of
    // blanking it for a round trip.
    const [session, setSession] = useState(loadInboxes);
    const [status, setStatus] = useState(
        session.activeId ? "active" : "idle",
    );
    const [error, setError] = useState(null);

    // Which inbox action is in flight: 'extending' | 'refreshing' |
    // 'destroying' | null. Drives per-button state without folding it into `status`.
    const [busy, setBusy] = useState(null);

    const inbox =
        session.inboxes.find((candidate) => candidate.id === session.activeId) ??
        null;

    // Single writer for storage, so a mutation cannot forget to persist.
    useEffect(() => {
        saveInboxes(session);
    }, [session]);

    // Guards against a double-click creating two inboxes; a ref so the handler
    // reads it synchronously.
    const inFlight = useRef(false);

    const actionLock = useRef(false);

    // Kept so a local action can cancel the mount-time confirmation: the inbox is
    // on screen before the server answers, so a late answer must not resurrect a
    // destroyed inbox or overwrite a newly selected one.
    const confirmation = useRef(null);
    const cancelConfirmation = useCallback(() => {
        confirmation.current?.abort();
        confirmation.current = null;
    }, []);

    /**
     * Drops one inbox and re-points the session at whatever is left. Only the
     * active inbox's removal forces a new selection.
     */
    const removeInbox = useCallback(
        (id, { expired = false } = {}) => {
            const remaining = session.inboxes.filter(
                (candidate) => candidate.id !== id,
            );
            const activeId =
                session.activeId === id
                    ? (remaining.at(-1)?.id ?? null)
                    : session.activeId;

            setSession({ inboxes: remaining, activeId });

            if (remaining.length === 0) setStatus(expired ? "expired" : "idle");
            else setStatus("active");
        },
        [session],
    );

    // Re-confirms the restored inbox on mount, so a refresh picks up an expiry
    // changed elsewhere. Only runs on mount for the restored inbox.
    const initialToken = useRef(inbox?.token ?? null);
    // The id is captured alongside it: a session token can own several inboxes,
    // so the routes that take an id need one to say which is meant.
    const initialId = useRef(inbox?.id ?? null);

    useEffect(() => {
        const tokenToConfirm = initialToken.current;
        const inboxIdToConfirm = initialId.current;
        if (!tokenToConfirm) return;

        const controller = new AbortController();
        confirmation.current = controller;

        (async () => {
            try {
                const fresh = await getInboxInfo(tokenToConfirm, {
                    inboxId: inboxIdToConfirm,
                    signal: controller.signal,
                });
                // The request may have settled just before a local action
                // cancelled it, so check again rather than trust the await.
                if (controller.signal.aborted) return;

                // /inbox/info returns no id and no token, so only mutable fields are merged.
                setSession((prev) => {
                    const current = prev.inboxes.find(
                        (candidate) => candidate.token === tokenToConfirm,
                    );
                    if (!current) return prev;

                    const expiryChanged =
                        isPlausibleExpiry(fresh?.expiresAt) &&
                        fresh.expiresAt !== current.expiresAt;

                    // Compare the timestamp, not object identity: a fresh object
                    // every mount would rewrite an identical blob each time.
                    if (!expiryChanged && !fresh?.createdAt) return prev;

                    return {
                        ...prev,
                        inboxes: replaceInbox(prev.inboxes, current.id, {
                            ...(expiryChanged
                                ? { expiresAt: fresh.expiresAt }
                                : {}),
                            ...(fresh?.createdAt
                                ? { createdAt: fresh.createdAt }
                                : {}),
                            ...(fresh?.extendCount != null
                                ? { extendCount: fresh.extendCount }
                                : {}),
                        }),
                    };
                });

                setStatus("active");
            } catch (err) {
                if (controller.signal.aborted) return;

                console.error(
                    "[useInbox] could not confirm the stored inbox with the server",
                    err,
                );

                if (err instanceof ApiError && err.isDead) {
                    // 401/403/404/410 all mean the same thing to the user: this
                    // inbox is gone. 410 is the server saying it outlived its TTL.
                    // The others in the session are unaffected.
                    setSession((prev) => {
                        const target = prev.inboxes.find(
                            (candidate) => candidate.token === tokenToConfirm,
                        );
                        if (!target) return prev;
                        const remaining = prev.inboxes.filter(
                            (candidate) => candidate.id !== target.id,
                        );
                        const activeId =
                            prev.activeId === target.id
                                ? (remaining.at(-1)?.id ?? null)
                                : prev.activeId;
                        return { inboxes: remaining, activeId };
                    });
                    setStatus(err.isExpired ? "expired" : "idle");
                } else {
                    setStatus("active");
                }
            } finally {
                if (confirmation.current === controller) {
                    confirmation.current = null;
                }
            }
        })();

        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (status !== "active" || !inbox) return;

        const remaining = Math.max(0, msRemaining(inbox.expiresAt));

        const t = setTimeout(
            () => removeInbox(inbox.id, { expired: true }),
            remaining,
        );

        return () => clearTimeout(t);
    }, [status, inbox, removeInbox]);

    useEffect(() => {
        if (status !== "active" || !inbox) return;

        const recheck = () => {
            if (document.visibilityState !== "visible") return;
            if (msRemaining(inbox.expiresAt) <= 0) {
                removeInbox(inbox.id, { expired: true });
            }
        };

        document.addEventListener("visibilitychange", recheck);
        window.addEventListener("focus", recheck);
        return () => {
            document.removeEventListener("visibilitychange", recheck);
            window.removeEventListener("focus", recheck);
        };
    }, [status, inbox, removeInbox]);

    // Appends and activates, rather than replacing: the previously generated
    // inboxes stay reachable for as long as their TTL lasts.
    const generate = useCallback(async () => {
        if (inFlight.current) return;
        inFlight.current = true;
        cancelConfirmation();

        setStatus("creating");
        setError(null);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), CREATE_TIMEOUT_MS);

        try {
            const created = await createInbox({ signal: controller.signal });
            setSession((prev) => ({
                inboxes: [...prev.inboxes, created],
                activeId: created.id,
            }));
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
    }, [cancelConfirmation]);

    // Same request as generate(), but flagged so the purged card can stay on
    // screen: the status in between is "creating", which would otherwise render
    // the landing page.
    const [regenerating, setRegenerating] = useState(false);

    const regenerate = useCallback(async () => {
        setRegenerating(true);
        try {
            await generate();
        } finally {
            setRegenerating(false);
        }
    }, [generate]);

    /**
     * Local-only: no request, because the address is already live server-side.
     * A late confirmation for the previous inbox is cancelled so it cannot pull
     * the selection back.
     */
    const switchInbox = useCallback(
        (id) => {
            if (!session.inboxes.some((inbox) => inbox.id === id)) return;

            cancelConfirmation();
            setSession((prev) => ({ ...prev, activeId: id }));
            setError(null);
            setStatus("active");
        },
        [session.inboxes, cancelConfirmation],
    );

    // Local-only, because the API has no DELETE: the address keeps receiving mail
    // server-side until its TTL runs out, so discarding the token is the most this
    // client can do. The session falls back to the newest inbox still alive.
    const destroy = useCallback(() => {
        if (!session.activeId) return;
        cancelConfirmation();
        setError(null);
        removeInbox(session.activeId);
    }, [session.activeId, cancelConfirmation, removeInbox]);

    // Drops every inbox. Kept separate from destroy(), which removes only the
    // active one.
    const reset = useCallback(() => {
        cancelConfirmation();
        setSession({ inboxes: [], activeId: null });
        setError(null);
        setStatus("idle");
    }, [cancelConfirmation]);

    const extend = useCallback(async () => {
        if (!inbox?.token) return;
        if (actionLock.current) return;
        actionLock.current = true;
        cancelConfirmation();
        setBusy("extending");
        setError(null);
        const target = inbox;
        try {
            const res = await extendInbox(target.token, { inboxId: target.id });
            if (!res?.expiresAt) {
                throw new ApiError(500, "Extend response missing expiresAt");
            }
            setSession((prev) => ({
                ...prev,
                inboxes: replaceInbox(prev.inboxes, target.id, {
                    expiresAt: res.expiresAt,
                    extendCount:
                        res.extendCount ?? (target.extendCount ?? 0) + 1,
                }),
            }));
        } catch (err) {
            console.error("[useInbox] extend failed", err);
            if (err instanceof ApiError && err.isDead) {
                removeInbox(target.id, { expired: true });
                return;
            }
            setError(new Error("Could not extend the inbox. Try again."));
        } finally {
            actionLock.current = false;
            setBusy(null);
        }
    }, [inbox, cancelConfirmation, removeInbox]);

    // Re-reads the inbox so an expiry changed elsewhere (another tab extending
    // it) is picked up.
    const refresh = useCallback(async () => {
        if (!inbox?.token) return;
        if (actionLock.current) return;
        actionLock.current = true;
        cancelConfirmation();
        setBusy("refreshing");
        setError(null);
        const target = inbox;
        try {
            const fresh = await getInboxInfo(target.token, { inboxId: target.id });
            if (
                isPlausibleExpiry(fresh?.expiresAt) &&
                fresh.expiresAt !== target.expiresAt
            ) {
                setSession((prev) => ({
                    ...prev,
                    inboxes: replaceInbox(prev.inboxes, target.id, {
                        expiresAt: fresh.expiresAt,
                    }),
                }));
            }
        } catch (err) {
            console.error("[useInbox] refresh failed", err);
            if (err instanceof ApiError && err.isDead) {
                removeInbox(target.id, { expired: true });
                return;
            }
            setError(new Error("Could not refresh the inbox. Try again."));
        } finally {
            actionLock.current = false;
            setBusy(null);
        }
    }, [inbox, cancelConfirmation, removeInbox]);

    return {
        status,
        inbox,
        inboxes: session.inboxes,
        activeId: session.activeId,
        error,
        busy,
        regenerating,
        canExtend: (inbox?.extendCount ?? 0) < MAX_EXTENDS,
        generate,
        regenerate,
        switchInbox,
        reset,
        destroy,
        extend,
        refresh,
    };
}
