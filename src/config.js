/**
 * Central config. Everything environment-dependent or policy-dependent lives
 * here so no component hardcodes a URL or a magic number.
 */

// Vite-style env vars. Fall back to sensible local-dev defaults.
const env =
    typeof import.meta !== "undefined" && import.meta.env
        ? import.meta.env
        : {};

/** REST base. Note the API is versioned; the WS endpoint is NOT under /api/v1. */
export const API_BASE = env.VITE_API_BASE || "http://localhost:3000/api/v1";

/** WebSocket origin. Derived from API_BASE unless explicitly overridden. */
export const WS_BASE =
    env.VITE_WS_BASE ||
    API_BASE.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "");

/**
 * Flip this on to run entirely against the in-memory mock backend — no API,
 * no socket. Required by the tracker so UI work isn't blocked on backend
 * availability.
 */
export const USE_MOCK = env.VITE_USE_MOCK === "true" || !env.VITE_API_BASE;

/**
 * Inbox lifetime we request on create.
 *
 * The backend default is 30 minutes (DEFAULT_INBOX_TTL_MINUTES), but the
 * mockup copy promises ten ("One address, ten minutes, then it's gone"), so
 * we send this explicitly rather than relying on the server default.
 * Server accepts 5–120.
 */
export const INBOX_TTL_MINUTES = 10;

/**
 * Minutes added per "Extend" click.
 *
 * Backend default is EXTEND_TTL_MINUTES=15, but the spec'd button reads
 * "+5 mins", so we send 5 explicitly. Server accepts 5–60.
 */
export const EXTEND_MINUTES = 5;

/**
 * Display-only mirror of the server's MAX_EXTENDS env var.
 *
 * WARNING: this is not exposed by any API response, so it can drift if
 * backend changes the env var. Use it to grey out the button; treat a
 * 409 EXTEND_LIMIT_REACHED as the authoritative stop.
 */
export const MAX_EXTENDS = 3;

/** Timer colour thresholds, in seconds. */
export const TIMER_WARN_SECONDS = 5 * 60;
export const TIMER_DANGER_SECONDS = 60;
