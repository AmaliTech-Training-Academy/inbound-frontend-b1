// Persists every inbox generated in this session, plus which one is active.
//
// Shape stored under KEY:
//   { version: 1, activeId: string | null, inboxes: Inbox[] }
// where Inbox is { id, address, token, expiresAt, createdAt?, extendCount? }.
//
// sessionStorage, not localStorage: an inbox is scoped to the tab that made it,
// and closing the tab is meant to forget it.

const KEY = "inbound.inboxes";

// Superseded by KEY, which holds a list rather than one blob.
const LEGACY_KEY = "inbound.inbox";

const VERSION = 1;

// Safari in private mode throws on access rather than returning null, so the
// accessor itself has to be guarded, not just the read/write.
function store() {
    try {
        return window.sessionStorage;
    } catch (err) {
        console.error(
            "[inboxStorage] sessionStorage is unavailable (private mode or " +
                "blocked site data); inboxes will not survive a reload.",
            err,
        );
        return null;
    }
}

function readRaw(key) {
    try {
        return store()?.getItem(key) ?? null;
    } catch (err) {
        console.error(`[inboxStorage] failed to read ${key}`, err);
        return null;
    }
}

function removeRaw(key) {
    try {
        store()?.removeItem(key);
    } catch (err) {
        // Logged loudly: a clear that silently fails leaves a dead inbox (and
        // its token) behind after destroy or expiry.
        console.error(`[inboxStorage] failed to clear ${key}`, err);
    }
}

function isValidInbox(inbox) {
    return (
        inbox &&
        typeof inbox.id === "string" &&
        typeof inbox.address === "string" &&
        typeof inbox.token === "string" &&
        typeof inbox.expiresAt === "string"
    );
}

// Milliseconds left until expiry. Always derived from the timestamp, never from
// a decrementing counter, which drifts when backgrounded timers are throttled.
export function msRemaining(expiresAt) {
    const end = new Date(expiresAt).getTime();
    if (Number.isNaN(end)) return 0;
    return Math.max(0, end - Date.now());
}

export function saveInbox(inbox) {
    try {
        store()?.setItem(LEGACY_KEY, JSON.stringify(inbox));
    } catch (err) {
        console.error("[inboxStorage] failed to save the inbox", err);
    }
}

export function clearInbox() {
    try {
        store()?.removeItem(LEGACY_KEY);
    } catch (err) {
        console.error("[inboxStorage] failed to clear the stored inbox", err);
    }
}

export function loadInbox() {
    let raw;
    try {
        raw = store()?.getItem(LEGACY_KEY);
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

    const valid = isValidInbox(inbox);

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

/**
 * Every live inbox, newest last, plus the active id. Expired entries are
 * dropped here rather than by each caller.
 */
export function loadInboxes() {
    const raw = readRaw(KEY);

    let parsed = null;
    if (raw) {
        try {
            parsed = JSON.parse(raw);
        } catch (err) {
            console.error(
                "[inboxStorage] stored inboxes are not valid JSON; discarding",
                err,
            );
            removeRaw(KEY);
        }
    }

    let inboxes = Array.isArray(parsed?.inboxes)
        ? parsed.inboxes.filter(isValidInbox)
        : [];

    if (inboxes.length === 0) {
        const legacy = loadInbox();
        if (legacy) inboxes = [legacy];
    }

    inboxes = inboxes.filter((inbox) => msRemaining(inbox.expiresAt) > 0);

    if (inboxes.length === 0) return { activeId: null, inboxes: [] };

    // An activeId pointing at a pruned inbox would leave the UI with no
    // selection, so it falls back to the newest one still alive.
    const stored = parsed?.activeId;
    const activeId = inboxes.some((inbox) => inbox.id === stored)
        ? stored
        : inboxes.at(-1).id;

    return { activeId, inboxes };
}

export function saveInboxes({ activeId = null, inboxes = [] } = {}) {
    try {
        store()?.setItem(
            KEY,
            JSON.stringify({ version: VERSION, activeId, inboxes }),
        );
        const active = inboxes.find((inbox) => inbox.id === activeId);
        if (active) {
            saveInbox(active);
        } else {
            clearInbox();
        }
    } catch (err) {
        // They still work for this page view, they just won't survive a refresh.
        console.error("[inboxStorage] failed to save inboxes", err);
    }
}

export function clearInboxes() {
    removeRaw(KEY);
    clearInbox();
}
