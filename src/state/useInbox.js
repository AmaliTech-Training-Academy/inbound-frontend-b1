// Owns the session and its inboxes. Every other IND-3 component reads from this.
//
// One session token owns any number of inboxes. What comes back describes
// the *active* inbox in the same shape it always has (`status`, `inbox`, the
// actions), plus the list of inboxes and the means to add and switch.

// status: 'idle' | 'creating' | 'active' | 'expired' | 'error'

//   idle     - no inbox, show the Generate button
//   creating - the first inbox is being created, button disabled + spinner
//   active   - at least one inbox exists and hasn't expired
//   expired  - the last inbox's clock ran out
//   error    - creating the first inbox failed, offer retry

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    createInbox,
    getInboxInfo,
    getSessionInboxes,
    extendInbox,
    rateLimitedFor,
    ApiError,
    NotConfiguredError,
} from "../services/inboxApi.js";
import { MAX_EXTENDS, MAX_INBOXES } from "../config.js";
import {
    saveSession,
    loadSession,
    clearSession,
    liveInboxes,
    pruneSession,
    msRemaining,
} from "./inboxStorage.js";

// The timeout exists to turn a hung request into a retryable error
// rather than a button stuck on "Generating…" forever.
const CREATE_TIMEOUT_MS = 8000;

// How often the inbox list is re-read from the server, for expiries changed
// elsewhere and for the rail's message counts. Every read counts against the
// API's 100 requests per 15 minutes per IP, shared with everything else the
// tab (and any other tab on the same connection) sends, so once a minute and
// only while the tab is on screen.
const SYNC_INTERVAL_MS = 60_000;

// How long "<address> expired" stays up after an inbox runs out.
const NOTICE_MS = 5000;

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

function toEntry(created) {
    return {
        id: created.id,
        address: created.address,
        createdAt: created.createdAt,
        expiresAt: created.expiresAt,
        extendCount: 0,
    };
}

// The server's list is the truth about which inboxes exist and when they
// expire. What only this tab knows - extend counts - is kept.
function mergeServerList(session, serverInboxes) {
    const local = new Map(session.inboxes.map((inbox) => [inbox.id, inbox]));

    // The order on screen is kept: the server lists inboxes in no promised
    // order, and adopting it made a just-added inbox jump from the bottom of
    // the rail to somewhere else a few seconds later. Inboxes this tab already
    // shows stay where they are; ones it has not seen join the end, oldest
    // first.
    const position = new Map(session.inboxes.map((inbox, index) => [inbox.id, index]));
    const created = (inbox) => new Date(inbox.createdAt ?? 0).getTime() || 0;
    const ordered = [...serverInboxes].sort((a, b) => {
        const pa = position.get(a.id);
        const pb = position.get(b.id);
        if (pa !== undefined && pb !== undefined) return pa - pb;
        if (pa !== undefined) return -1;
        if (pb !== undefined) return 1;
        return created(a) - created(b);
    });

    return {
        ...session,
        inboxes: ordered.map((remote) => ({
            id: remote.id,
            address: remote.address,
            createdAt: remote.createdAt ?? local.get(remote.id)?.createdAt,
            // The server's word wins whenever it is a real time, past ones
            // included: an expired inbox is exactly what it reports on.
            expiresAt: Number.isNaN(new Date(remote.expiresAt).getTime())
                ? (local.get(remote.id)?.expiresAt ?? remote.expiresAt)
                : remote.expiresAt,
            extendCount: local.get(remote.id)?.extendCount ?? 0,
            messageCount: remote.messageCount,
        })),
    };
}

// What to tell the user about inboxes that went away between two states of
// the session: every one that left the list - open or not, by timer or by
// sync - except those destroyed on purpose, and whether the open one was
// among them. Null when nothing left, or when nothing is left at all (the
// purged card says that).
function expiryNotice(prev, next) {
    if (!prev || !next) return null;
    const hidden = new Set(prev.hiddenIds ?? []);
    const kept = new Set(next.inboxes.map((inbox) => inbox.id));
    const gone = prev.inboxes.filter(
        (inbox) => !hidden.has(inbox.id) && !kept.has(inbox.id),
    );
    if (gone.length === 0) return null;
    return {
        addresses: gone.map((inbox) => inbox.address),
        switched: gone.some((inbox) => inbox.id === prev.activeId),
    };
}

export function useInbox() {
    // Restore straight from storage rather than showing a placeholder while
    // the server confirms. loadSession() has already discarded anything
    // expired or malformed, so what comes back is displayable immediately: a
    // refresh redraws the same screen instead of blanking it for a round
    // trip. The sync below still runs, and still ends the session if the
    // server says it is gone.
    const [restored] = useState(loadSession);
    const [session, setSession] = useState(restored);
    const [status, setStatus] = useState(restored ? "active" : "idle");
    const [error, setError] = useState(null);

    // Which inbox action is in flight: 'extending' | 'refreshing' |
    // 'destroying' | null. Drives the per-button disabled/loading state
    // without collapsing it into the top-level `status` machine.
    const [busy, setBusy] = useState(null);

    // Adding a second, third... inbox. Separate from `status`, which only
    // goes through "creating" for the first: the page must not fall back to
    // the landing screen while one more inbox is on its way.
    const [adding, setAdding] = useState(false);

    // { addresses, switched }: which inboxes just expired, shown briefly while
    // others remain.
    const [notice, setNotice] = useState(null);

    // Guards against a double-click creating two inboxes. A ref rather than
    // state because we need the value synchronously inside the handler.
    const inFlight = useRef(false);

    const actionLock = useRef(false);

    // The latest session, for handlers and timers that must not act on a
    // stale copy. Updated after every commit.
    const sessionRef = useRef(session);
    useEffect(() => {
        sessionRef.current = session;
    });

    // Persist every change. Storage is an external system, so this is what
    // an effect is for; the reducers above stay pure.
    useEffect(() => {
        if (session) saveSession(session);
        else clearSession();
    }, [session]);

    // The in-flight sync with the server. Kept so that any local lifecycle
    // action can cancel it: the inboxes are on screen before the server
    // answers, so the user can destroy, add or extend first, and a late
    // answer about the old state must not overwrite what they did -
    // resurrecting a destroyed inbox, or ending a session on a stale 401.
    const pendingSync = useRef(null);
    const cancelSync = useCallback(() => {
        pendingSync.current?.abort();
        pendingSync.current = null;
    }, []);

    const endSession = useCallback(
        (nextStatus) => {
            cancelSync();
            setSession(null);
            setStatus(nextStatus);
        },
        [cancelSync],
    );

    // When the list was last asked for, so a tab coming back into view knows
    // whether it is owed one.
    const lastSyncAt = useRef(0);

    const sync = useCallback(async () => {
        const current = sessionRef.current;
        if (!current) return;
        cancelSync();
        const controller = new AbortController();
        pendingSync.current = controller;
        lastSyncAt.current = Date.now();

        try {
            const remote = await getSessionInboxes(current.token, {
                signal: controller.signal,
            });
            // The request may have settled just before a local action
            // cancelled it, so check again rather than trust the await.
            if (controller.signal.aborted) return;

            const before = sessionRef.current ?? current;
            const next = pruneSession(mergeServerList(before, remote));
            if (!next) {
                endSession("expired");
                return;
            }
            const expired = expiryNotice(before, next);
            if (expired) setNotice(expired);
            setSession(next);
        } catch (err) {
            if (controller.signal.aborted) return;
            console.error("[useInbox] could not sync the session with the server", err);
            if (err instanceof ApiError && err.isDead) {
                // 401/403/404/410 all mean the same thing to the user: this
                // session is gone. 410 is the server saying it outlived its TTL.
                endSession(err.isExpired ? "expired" : "idle");
            }
            // A network failure keeps what is on screen: a blip must not cost
            // someone their addresses.
        } finally {
            if (pendingSync.current === controller) pendingSync.current = null;
        }
    }, [cancelSync, endSession]);

    // The routine re-read, as opposed to one the user asked for. Skipped while
    // nobody is looking, and while the server has told the client to back off:
    // either way it would only spend the budget the user's own clicks need.
    const backgroundSync = useCallback(() => {
        if (document.visibilityState === "hidden") return;
        if (rateLimitedFor() > 0) return;
        sync();
    }, [sync]);

    // Confirm a restored session once, then keep the list fresh.
    const hasSession = session !== null;
    useEffect(() => {
        if (!hasSession) return undefined;
        // Scheduled rather than called: the sync ends in state updates, which
        // belong after this commit, not inside it.
        const first = setTimeout(backgroundSync, 0);
        const id = setInterval(backgroundSync, SYNC_INTERVAL_MS);
        return () => {
            clearTimeout(first);
            clearInterval(id);
            cancelSync();
        };
    }, [hasSession, backgroundSync, cancelSync]);

    // Drop every inbox whose clock has run out. When the active one goes and
    // others remain, the next takes over and a notice says what happened;
    // when the last goes, the session is over.
    const expireDue = useCallback(() => {
        const current = sessionRef.current;
        if (!current) return;
        const hidden = new Set(current.hiddenIds);
        const gone = current.inboxes.filter(
            (inbox) => !hidden.has(inbox.id) && msRemaining(inbox.expiresAt) <= 0,
        );
        if (gone.length === 0) return;

        const next = pruneSession(current);
        if (!next) {
            endSession("expired");
            return;
        }
        setNotice(expiryNotice(current, next));
        setSession(next);
    }, [endSession]);

    // One timeout aimed at the soonest expiry, re-armed whenever the inboxes
    // change (an extend pushes one out, an add brings a new one in).
    useEffect(() => {
        const live = liveInboxes(session);
        if (live.length === 0) return undefined;
        const soonest = Math.min(...live.map((inbox) => msRemaining(inbox.expiresAt)));
        const t = setTimeout(expireDue, Math.max(0, soonest));
        return () => clearTimeout(t);
    }, [session, expireDue]);

    // Timers are throttled in a background tab, and the sync skips one, so
    // check again on return - and catch up on the list if a sync is owed.
    useEffect(() => {
        if (!hasSession) return undefined;
        const recheck = () => {
            if (document.visibilityState !== "visible") return;
            expireDue();
            if (Date.now() - lastSyncAt.current >= SYNC_INTERVAL_MS) backgroundSync();
        };
        document.addEventListener("visibilitychange", recheck);
        window.addEventListener("focus", recheck);
        return () => {
            document.removeEventListener("visibilitychange", recheck);
            window.removeEventListener("focus", recheck);
        };
    }, [hasSession, expireDue, backgroundSync]);

    useEffect(() => {
        if (!notice) return undefined;
        const t = setTimeout(() => setNotice(null), NOTICE_MS);
        return () => clearTimeout(t);
    }, [notice]);

    const inboxes = useMemo(
        () =>
            liveInboxes(session).map((inbox) => ({
                ...inbox,
                // Every call and the socket authenticate with the session
                // token, so each inbox carries it the way one inbox always did.
                token: session.token,
            })),
        [session],
    );
    const inbox = inboxes.find((entry) => entry.id === session?.activeId) ?? null;

    // Adds an inbox to the session, or starts the session with its first.
    // Resolves to the inbox it added, or null when it added none, so a caller
    // creating several in a row can list what it got.
    const addInbox = useCallback(async () => {
        if (inFlight.current) return null;
        const current = sessionRef.current;
        const count = liveInboxes(current).length;

        // The backend caps a session's inboxes; asking past the cap would only
        // be refused. Destroying one here does not free a place server-side
        // until its TTL runs out (there is no delete), so a refusal can still
        // come back below, and it is shown as the server words it.
        if (count >= MAX_INBOXES) {
            setError(
                new Error(
                    `This session already holds ${MAX_INBOXES} inboxes, the most it can.`,
                ),
            );
            return null;
        }

        inFlight.current = true;
        cancelSync();
        const first = count === 0;
        if (first) setStatus("creating");
        else setAdding(true);
        setError(null);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), CREATE_TIMEOUT_MS);

        try {
            let created;
            try {
                created = await createInbox({
                    sessionToken: current?.token,
                    signal: controller.signal,
                });
            } catch (err) {
                // The server no longer knows the session (404): start a new
                // one. Its old inboxes cannot be read without it anyway.
                //
                // Only a 404. Any other refusal - the session's inbox cap, a
                // rate limit - is the server saying no to this session, and
                // quietly starting a fresh one would both dodge the cap and
                // strand every inbox the session holds.
                if (!current?.token || !(err instanceof ApiError && err.isNotFound)) throw err;
                created = await createInbox({ signal: controller.signal });
            }

            setSession((prev) => {
                const base =
                    prev && prev.token === created.token
                        ? prev
                        : { token: created.token, inboxes: [], hiddenIds: [] };
                return {
                    ...base,
                    expiresAt: created.sessionExpiresAt ?? created.expiresAt,
                    inboxes: [
                        ...base.inboxes.filter((entry) => entry.id !== created.id),
                        toEntry(created),
                    ],
                    activeId: created.id,
                };
            });
            setStatus("active");
            return toEntry(created);
        } catch (err) {
            const isTimeout = err?.name === "AbortError";
            console.error(
                isTimeout
                    ? "[useInbox] createInbox timed out after " + `${CREATE_TIMEOUT_MS}ms`
                    : "[useInbox] createInbox failed",
                err,
            );
            // Each message is a whole sentence, shown as it is: the page adds
            // nothing, so "check your connection" is never said twice.
            // A build without a backend address is the operator's to fix; the
            // visitor only needs to know it is not them. The technical reason
            // is in the console line above.
            const shown = err instanceof NotConfiguredError
                ? new Error("Inbound can't create inboxes right now. Please try again later.")
                : isTimeout
                ? new Error("That took too long. Check your connection and try again.")
                : err instanceof ApiError && err.status === 0
                  ? new Error("Could not reach the server. Check your connection and try again.")
                  : err instanceof ApiError && err.status >= 400 && err.status < 500
                    ? new Error(err.message)
                    : new Error("Could not create an inbox. Try again in a moment.");
            // A 4xx is the server declining on purpose - its cap, its rate
            // limit - and its own words say which; anything else reads the same.
            const refused =
                err instanceof ApiError && err.status >= 400 && err.status < 500
                    ? new Error(err.message)
                    : null;
            setError(first ? shown : (refused ?? new Error("Could not add an inbox. Try again.")));
            // Failing to add a second inbox leaves the first on screen.
            if (first) setStatus("error");
            return null;
        } finally {
            clearTimeout(timer);
            inFlight.current = false;
            setAdding(false);
        }
    }, [cancelSync]);

    // The first inbox; also what the landing page's button calls.
    const generate = addInbox;

    // Replaces an expired inbox. Same request as generate(), but flagged so
    // the purged card can stay on screen for the length of it: the status in
    // between is "creating", which would otherwise render the landing page.
    const [regenerating, setRegenerating] = useState(false);

    const regenerate = useCallback(async () => {
        setRegenerating(true);
        try {
            await addInbox();
        } finally {
            setRegenerating(false);
        }
    }, [addInbox]);

    const select = useCallback((id) => {
        setError(null);
        setSession((prev) =>
            prev && prev.inboxes.some((entry) => entry.id === id)
                ? { ...prev, activeId: id }
                : prev,
        );
    }, []);

    const dismissError = useCallback(() => setError(null), []);

    // Ends everything, locally. Does not touch the server.
    const reset = useCallback(() => {
        endSession("idle");
        setError(null);
    }, [endSession]);

    // "Destroy Inbox": the one being viewed.
    //
    // Local-only, because the API has no DELETE: the address keeps receiving
    // mail server-side until its TTL runs out. Hiding it is the most this
    // client can do. With other inboxes left the next one takes over; with
    // none, the session ends. If a delete endpoint is added, this is where it
    // goes.
    const destroy = useCallback(() => {
        cancelSync();
        setError(null);
        const current = sessionRef.current;
        if (!current) return;
        const next = pruneSession({
            ...current,
            hiddenIds: [...current.hiddenIds, current.activeId],
        });
        if (!next) {
            endSession("idle");
            return;
        }
        setSession(next);
    }, [cancelSync, endSession]);

    // Drops one inbox the server says is gone, ending the session if it was
    // the last.
    const dropInbox = useCallback(
        (id) => {
            const current = sessionRef.current;
            if (!current) return;
            const next = pruneSession({
                ...current,
                inboxes: current.inboxes.filter((entry) => entry.id !== id),
            });
            if (!next) {
                endSession("expired");
                return;
            }
            setNotice(expiryNotice(current, next));
            setSession(next);
        },
        [endSession],
    );

    const updateInbox = useCallback((id, changes) => {
        setSession((prev) =>
            prev
                ? {
                      ...prev,
                      inboxes: prev.inboxes.map((entry) =>
                          entry.id === id ? { ...entry, ...changes } : entry,
                      ),
                  }
                : prev,
        );
    }, []);

    // "+ Extend 5m" on the active inbox. Pushes expiresAt out server-side,
    // then adopts the new timestamp: the expiry timeout and the progress ring
    // both key off it.
    const extend = useCallback(async () => {
        if (!inbox?.id || !inbox?.token) return;
        if (actionLock.current) return;
        actionLock.current = true;
        cancelSync();
        setBusy("extending");
        setError(null);
        try {
            const res = await extendInbox(inbox.id, inbox.token);
            if (!res?.expiresAt) {
                throw new ApiError(500, "Extend response missing expiresAt");
            }
            updateInbox(inbox.id, {
                expiresAt: res.expiresAt,
                extendCount: res.extendCount ?? (inbox.extendCount ?? 0) + 1,
            });
        } catch (err) {
            console.error("[useInbox] extend failed", err);
            if (err instanceof ApiError && err.isDead) {
                dropInbox(inbox.id);
                return;
            }
            // A 429 carries how long to wait, which beats "try again".
            setError(
                err instanceof ApiError && err.isRateLimited
                    ? new Error(err.message)
                    : new Error("Could not extend the inbox. Try again."),
            );
        } finally {
            actionLock.current = false;
            setBusy(null);
        }
    }, [inbox, cancelSync, updateInbox, dropInbox]);

    // "Refresh". Re-reads the active inbox and the session's list, so an
    // expiry changed elsewhere (another tab extending it) is picked up.
    const refresh = useCallback(async () => {
        if (!inbox?.id || !inbox?.token) return;
        if (actionLock.current) return;
        actionLock.current = true;
        cancelSync();
        setBusy("refreshing");
        setError(null);
        try {
            const fresh = await getInboxInfo(inbox.id, inbox.token);
            if (
                isPlausibleExpiry(fresh?.expiresAt) &&
                fresh.expiresAt !== inbox.expiresAt
            ) {
                updateInbox(inbox.id, { expiresAt: fresh.expiresAt });
            }
        } catch (err) {
            console.error("[useInbox] refresh failed", err);
            if (err instanceof ApiError && err.isDead) {
                // Server says it is gone. Do not keep showing a dead address.
                dropInbox(inbox.id);
                return;
            }
            // A 429 carries how long to wait, which beats "try again".
            setError(
                err instanceof ApiError && err.isRateLimited
                    ? new Error(err.message)
                    : new Error("Could not refresh the inbox. Try again."),
            );
        } finally {
            actionLock.current = false;
            setBusy(null);
        }
        sync();
    }, [inbox, cancelSync, updateInbox, dropInbox, sync]);

    return {
        status,
        inbox,
        inboxes,
        activeId: inbox?.id ?? null,
        error,
        busy,
        adding,
        notice,
        regenerating,
        canExtend: (inbox?.extendCount ?? 0) < MAX_EXTENDS,
        canAddInbox: !adding && inboxes.length < MAX_INBOXES,
        // The cap, and whether this session has reached it, so the page can
        // say why it will not add another rather than just greying it out.
        maxInboxes: MAX_INBOXES,
        atInboxLimit: inboxes.length >= MAX_INBOXES,
        generate,
        regenerate,
        addInbox,
        select,
        reset,
        destroy,
        extend,
        refresh,
        dismissError,
    };
}
