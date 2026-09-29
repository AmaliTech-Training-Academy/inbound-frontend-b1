
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

/**
 * Socket.IO origin and path, split from the API base.
 *
 * socket.io-client reads the path of the URL it is given as a NAMESPACE, not
 * as a mount point: io("https://host/server") asks for namespace "/server" on
 * the default "/socket.io" and never connects. A deployment prefix therefore
 * has to travel in the `path` option, with the URL cut back to the origin.
 *
 *   http://localhost:9001/api/v1  -> origin http://localhost:9001, path /socket.io
 *   https://host/server/api/v1    -> origin https://host, path /server/socket.io
 */
export function splitSocketTarget(apiBase) {
    try {
        const url = new URL(apiBase.replace(/\/api\/v1\/?$/, ""));
        const prefix = url.pathname.replace(/\/+$/, "");
        return { origin: url.origin, path: `${prefix}/socket.io` };
    } catch {
        // Relative or unparseable: fall back to same-origin defaults.
        return { origin: undefined, path: "/socket.io" };
    }
}

const socketTarget = splitSocketTarget(API_BASE);

export const SOCKET_ORIGIN = env.VITE_SOCKET_ORIGIN || socketTarget.origin;

export const SOCKET_PATH = env.VITE_SOCKET_PATH || socketTarget.path;

/**
 * Flip this on to run entirely against the in-memory mock backend — no API,
 * no socket. Required by the tracker so UI work isn't blocked on backend
 * availability.
 *
 * Note this is NOT gated on DEV: a production preview build with no API base
 * still has to work, because the mock is currently the only working path.
 */
export const USE_MOCK = env.VITE_USE_MOCK === "true" || !env.VITE_API_BASE;


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
