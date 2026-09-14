// inboxStorage.js
// Persists the whole inbox object as one blob so IND-7 (WebSocket reconnect)
// and IND-19 (extend / new address) can all read the same source of truth.
//
// Shape stored:
//   { id, address, token, expiresAt }   <- expiresAt is an ISO string from the API

const KEY = "inbound.inbox";

export function saveInbox(inbox) {
    try {
        localStorage.setItem(KEY, JSON.stringify(inbox));
    } catch {
        // Private browsing / storage full. Not fatal: the inbox still works for
        // this page view, it just won't survive a refresh.
    }
}

export function clearInbox() {
    try {
        localStorage.removeItem(KEY);
    } catch {
        // ignore
    }
}

// Returns the stored inbox, or null if there isn't one, it's malformed,
// or it has already expired. Clears anything unusable on the way out so
// we never hand back a dead inbox.
export function loadInbox() {
    let raw;
    try {
        raw = localStorage.getItem(KEY);
    } catch {
        return null;
    }
    if (!raw) return null;

    let inbox;
    try {
        inbox = JSON.parse(raw);
    } catch {
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
