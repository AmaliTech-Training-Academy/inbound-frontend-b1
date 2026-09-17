// Display helpers for a message's received time (IND-7, AC 2).
//
// `now` is a parameter rather than read from the clock inside so the output is
// deterministic in tests and so a list re-rendering on a timer passes one
// consistent instant to every row.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Short, glanceable age: "just now", "4m ago", "2h ago", then a date.
 * Returns "" for a missing or unparseable timestamp so the row can omit it
 * rather than render "Invalid Date".
 */
export function formatReceivedAt(receivedAt, now = Date.now()) {
    const then = new Date(receivedAt ?? "").getTime();
    if (Number.isNaN(then)) return "";

    const elapsed = now - then;

    // A message can carry a timestamp a little ahead of the browser's clock;
    // "in -3 minutes" is worse than treating it as new.
    if (elapsed < MINUTE) return "just now";
    if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
    if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;

    return new Date(then).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
}

/**
 * Full timestamp for the row's title/tooltip, so the exact time is available
 * without cluttering the list.
 */
export function formatAbsolute(receivedAt) {
    const then = new Date(receivedAt ?? "").getTime();
    if (Number.isNaN(then)) return "";
    return new Date(then).toLocaleString();
}
