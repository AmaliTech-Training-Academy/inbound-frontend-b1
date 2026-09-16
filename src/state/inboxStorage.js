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

// Milliseconds left until expiry. Always derived from the timestamp, never
// from a decrementing counter — a counter drifts and breaks when the tab
// is backgrounded and timers get throttled.
export function msRemaining(expiresAt) {
    const end = new Date(expiresAt).getTime();
    if (Number.isNaN(end)) return 0;
    return Math.max(0, end - Date.now());
}
