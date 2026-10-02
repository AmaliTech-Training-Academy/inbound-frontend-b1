import { INBOX_TTL_MINUTES, EXTEND_MINUTES } from "../config.js";

/** Below this share of its life left, an inbox is shown as running out. */
export const CRITICAL_PERCENT = 30;

// How much of the inbox's life is left, as 0-100.
//
// The denominator is createdAt -> expiresAt, so an extension makes the ring
// jump back up rather than overflow. Without a usable createdAt it falls back
// to the configured lifetime plus the extensions granted so far.
export function inboxProgress(inbox, now) {
    if (!inbox?.expiresAt) return 100;

    const expiry = new Date(inbox.expiresAt).getTime();
    if (Number.isNaN(expiry)) return 100;

    const created = new Date(inbox.createdAt ?? "").getTime();
    const fallbackMs =
        (INBOX_TTL_MINUTES + (inbox.extendCount ?? 0) * EXTEND_MINUTES) * 60_000;
    const total = Number.isNaN(created) ? fallbackMs : Math.max(1, expiry - created);

    const left = Math.max(0, expiry - now);
    return Math.min(100, Math.max(0, (left / total) * 100));
}

// The one rule for "turn it red", shared by the timer card and the rail so
// the same inbox never reads as fine in one place and running out in another.
export function isRunningOut(inbox, now) {
    return inboxProgress(inbox, now) <= CRITICAL_PERCENT;
}

/** Time left before `expiresAt`, as mm:ss, stopping at 00:00. */
export function formatTimeLeft(expiresAt, now) {
    const end = new Date(expiresAt).getTime();
    const seconds = Number.isNaN(end) ? 0 : Math.max(0, Math.floor((end - now) / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
