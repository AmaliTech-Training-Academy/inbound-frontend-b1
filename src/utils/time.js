// Relative timestamps for the inbox list. Pure, so it can be tested directly
// rather than through a rendered component.

function formatRelativeTime(iso) {
    if (!iso) return "";

    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";

    const diffMs = Date.now() - then;

    // A server clock slightly ahead of ours shouldn't render "-1m ago".
    if (diffMs < 0) return "just now";

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return "just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    return new Date(then).toLocaleDateString();
}

export { formatRelativeTime };
