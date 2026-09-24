
// Central config. 
const env =
    typeof import.meta !== "undefined" && import.meta.env
        ? import.meta.env
        : {};

/**
 * REST base, including the version prefix.
 *
 * Default matches the server block of the published OpenAPI spec
 * (http://localhost:9001). REST and Socket.IO share one origin and one
 * process; only REST is under /api/v1.
 */
export const API_BASE = (
    env.VITE_API_BASE || "http://localhost:9001/api/v1"
).replace(/\/+$/, ""); // a trailing slash would build ".../api/v1//inbox"

/** WebSocket origin */
export const WS_BASE =
    env.VITE_WS_BASE ||
    API_BASE.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "");

/**
 * Run against the in-memory mock backend instead of the API.
 *
 * Opt-in only. This used to default to on whenever VITE_API_BASE was unset,
 * which made a fresh clone look like a working app while serving invented
 * inboxes - the backend team pulled dev and saw mock data with no indication
 * anything was wrong. A missing config should fail visibly, not quietly
 * pretend, so the mock now requires VITE_USE_MOCK="true".
 *
 * Deliberately not gated on DEV: a preview build has to be able to demo
 * without a backend.
 */
export const USE_MOCK = env.VITE_USE_MOCK === "true";


/**
 * Inbox lifetime, in minutes.
 *
 * DISPLAY ONLY against the real API. POST /api/v1/inbox takes no request
 * body, so the server's own TTL decides how long an inbox lives and this
 * value cannot influence it. It is what the mock issues, and what the UI copy
 * quotes - keep it in step with the backend's INBOX_TTL_MINUTES or the copy
 * will lie. Read expiresAt from the response for anything that must be right.
 */
export const INBOX_TTL_MINUTES = 10;

/**
 * Minutes added per extend. DISPLAY ONLY, for the same reason:
 * PATCH /api/v1/inbox/extend takes no body and always adds a fixed amount.
 */
export const EXTEND_MINUTES = 5;

/**
 * Client-side courtesy cap on extends.
 *
 * The API documents no limit and the server increments extendCount without
 * bound, so nothing enforces this but us. Greying the button out past this
 * count is a UI choice, not a contract.
 */
export const MAX_EXTENDS = 3;

/** Timer colour thresholds, in seconds. */
export const TIMER_WARN_SECONDS = 5 * 60;
export const TIMER_DANGER_SECONDS = 60;
