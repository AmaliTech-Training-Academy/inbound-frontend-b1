// Persists the whole inbox object as one blob so IND-7 (WebSocket reconnect)
// and IND-19 (extend / new address) can all read the same source of truth.

// Shape stored: { id, address, token, expiresAt }   <- expiresAt is an ISO string from the API

const KEY = "inbound.inbox";

// Safari in private mode throws on access rather than returning null, so the
// accessor itself has to be guarded, not just the read/write.
function store() {
    try {
        return window.sessionStorage;
    } catch (err) {
        console.error(
            "[inboxStorage] sessionStorage is unavailable (private mode or " +
                "blocked site data); the inbox will not survive a reload.",
            err,
        );
        return null;
    }
}

export function saveInbox(inbox) {
    try {
        store()?.setItem(KEY, JSON.stringify(inbox));
    } catch (err) {
        // The inbox still works for this page view, it just won't survive a
        // refresh — most likely the quota is full or writes are blocked.
        console.error("[inboxStorage] failed to save the inbox", err);
    }
}

export function clearInbox() {
    try {
        store()?.removeItem(KEY);
    } catch (err) {
        // Worth logging loudly: a clear that silently fails leaves a dead
        // inbox (and its token) behind after destroy or expiry.
        console.error("[inboxStorage] failed to clear the stored inbox", err);
    }
}

// Returns the stored inbox, or null if there isn't one, or it's malformed,
// or it has already expired. Clears anything unusable on the way out so
// we never hand back a dead inbox.
export function loadInbox() {
    let raw;
    try {
        raw = store()?.getItem(KEY);
    } catch (err) {
        console.error("[inboxStorage] failed to read the stored inbox", err);
        return null;
    }
    if (!raw) return null;

    let inbox;
    try {
        inbox = JSON.parse(raw);
    } catch (err) {
        console.error(
            "[inboxStorage] stored inbox is not valid JSON; discarding it",
            err,
        );
        clearInbox();
        return null;
    }

    const valid =
        inbox &&
        typeof inbox.id === "string" &&
        typeof inbox.address === "string" &&
        typeof inbox.token === "string" &&
        typeof inbox.expiresAt === "string";

    if (!valid) {
        console.error(
            "[inboxStorage] stored inbox is missing required fields; discarding it",
            inbox,
        );
        clearInbox();
        return null;
    }

    if (msRemaining(inbox.expiresAt) <= 0) {
        clearInbox();
        return null;
    }

    return inbox;
}

// One session token can own several inboxes, so what is stored is the
// session, not an inbox:
//
//   { token, expiresAt, inboxes: [{ id, address, createdAt, expiresAt,
//     extendCount }], activeId, hiddenIds: [] }
//
// hiddenIds are inboxes destroyed in this tab. destroy() deletes them on the
// server too, so this is no longer the only thing keeping them off screen -
// but a sync already in flight when the delete landed can still answer with
// one, so the list stays filtered here as well.

const SESSION_KEY = "inbound.session";

export function saveSession(session) {
    try {
        store()?.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (err) {
        console.error("[inboxStorage] failed to save the session", err);
    }
}

export function clearSession() {
    try {
        store()?.removeItem(SESSION_KEY);
    } catch (err) {
        console.error("[inboxStorage] failed to clear the stored session", err);
    }
}

/** Inboxes still worth showing: not destroyed here, not yet expired. */
export function liveInboxes(session) {
    if (!session) return [];
    const hidden = new Set(session.hiddenIds ?? []);
    return session.inboxes.filter(
        (inbox) => !hidden.has(inbox.id) && msRemaining(inbox.expiresAt) > 0,
    );
}

/**
 * Drops dead inboxes and keeps activeId pointing at a live one. Returns null
 * once nothing is left, which is the caller's cue that the session is over.
 */
export function pruneSession(session) {
    if (!session) return null;
    const live = liveInboxes(session);
    if (live.length === 0) return null;

    const liveIds = new Set(live.map((inbox) => inbox.id));
    return {
        ...session,
        inboxes: live,
        // Kept whole, never trimmed to the inboxes still listed here: a
        // destroyed inbox leaves this list at once but stays on the server's
        // until its TTL, so forgetting its id would let the next sync bring
        // it back. The list only lives as long as the session.
        hiddenIds: [...(session.hiddenIds ?? [])],
        activeId: liveIds.has(session.activeId) ? session.activeId : live[0].id,
    };
}

function isStoredInbox(inbox) {
    return (
        inbox &&
        typeof inbox.id === "string" &&
        typeof inbox.address === "string" &&
        typeof inbox.expiresAt === "string"
    );
}

// Returns the stored session, or null. A single inbox stored by an earlier
// version (inbound.inbox) is moved across first: its token already is the
// session token, since the API issues no other.
export function loadSession() {
    let raw;
    try {
        raw = store()?.getItem(SESSION_KEY);
    } catch (err) {
        console.error("[inboxStorage] failed to read the stored session", err);
        return null;
    }

    if (!raw) {
        const legacy = loadInbox();
        if (!legacy) return null;
        const migrated = {
            token: legacy.token,
            expiresAt: legacy.expiresAt,
            inboxes: [
                {
                    id: legacy.id,
                    address: legacy.address,
                    createdAt: legacy.createdAt,
                    expiresAt: legacy.expiresAt,
                    extendCount: legacy.extendCount ?? 0,
                },
            ],
            activeId: legacy.id,
            hiddenIds: [],
        };
        saveSession(migrated);
        clearInbox();
        return migrated;
    }

    let session;
    try {
        session = JSON.parse(raw);
    } catch (err) {
        console.error(
            "[inboxStorage] stored session is not valid JSON; discarding it",
            err,
        );
        clearSession();
        return null;
    }

    const valid =
        session &&
        typeof session.token === "string" &&
        Array.isArray(session.inboxes) &&
        session.inboxes.every(isStoredInbox);

    if (!valid) {
        console.error(
            "[inboxStorage] stored session is missing required fields; discarding it",
            session,
        );
        clearSession();
        return null;
    }

    const pruned = pruneSession({
        ...session,
        hiddenIds: Array.isArray(session.hiddenIds) ? session.hiddenIds : [],
    });
    if (!pruned) {
        clearSession();
        return null;
    }
    return pruned;
}

// Milliseconds left until expiry. Always derived from the timestamp, never
// from a decrementing counter — a counter drifts and breaks when the tab
// is backgrounded and timers get throttled.
export function msRemaining(expiresAt) {
    const end = new Date(expiresAt).getTime();
    if (Number.isNaN(end)) return 0;
    return Math.max(0, end - Date.now());
}
