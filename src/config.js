
// Central config.
const env =
    typeof import.meta !== "undefined" && import.meta.env
        ? import.meta.env
        : {};

/**
 * REST base, including the version prefix. REST and Socket.IO share one origin
 * and one process; only REST is under /api/v1.
 *
 * No default. A guessed address (the spec's localhost:9001) or a silent switch
 * to the mock both hide a build that was never told where the backend is: the
 * app looks fine and no real mail ever arrives. Unset, it stays empty, and
 * backendConfigError says so.
 */
export const API_BASE = (env.VITE_API_BASE || "").replace(/\/+$/, ""); // a trailing slash would build ".../api/v1//inbox"

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
 * Runs entirely against the in-memory mock backend: no API, no socket. Keeps
 * UI work from being blocked on backend availability.
 *
 * Opt-in only. Never infer it from a missing VITE_API_BASE, or a build that
 * was never given one ships fake addresses instead of failing.
 */
export const USE_MOCK = env.VITE_USE_MOCK === "true";

/**
 * Why these settings cannot run the app, or null when they can: either a
 * backend address or the mock, explicitly. Checked when the app runs, not when
 * it builds: the API client refuses every request with it and the page says
 * so. A build only compiles, so CI checks need no deployment settings.
 */
export function backendConfigError(settings) {
    if (settings?.VITE_USE_MOCK === "true" || settings?.VITE_API_BASE) return null;
    return (
        "VITE_API_BASE is not set, so the app has no backend to talk to. Set it to " +
        "the backend's REST base, e.g. VITE_API_BASE=https://host/server/api/v1 " +
        "(Vite reads it at build time, so a Docker build needs it as a build arg), " +
        "or set VITE_USE_MOCK=true to run against the in-browser mock."
    );
}

export const CONFIG_ERROR = backendConfigError(env);


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

/**
 * Most inboxes one session holds at once.
 *
 * The backend caps inboxes per session, and the client holds itself to the
 * same number rather than letting the server be the first to say no. Keep
 * VITE_MAX_INBOXES equal to the backend's cap.
 *
 * Each open inbox also keeps a socket of its own (a socket joins one inbox
 * room), so this bounds the connections as well as the rail.
 */
export const MAX_INBOXES = (() => {
    const configured = Number.parseInt(env.VITE_MAX_INBOXES, 10);
    return Number.isInteger(configured) && configured > 0 ? configured : 5;
})();

/** Timer colour thresholds, in seconds. */
export const TIMER_WARN_SECONDS = 5 * 60;
export const TIMER_DANGER_SECONDS = 60;
