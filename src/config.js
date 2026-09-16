
// Central config. 

const env =
    typeof import.meta !== "undefined" && import.meta.env
        ? import.meta.env
        : {};

/** REST base. Note the API is versioned; the WS endpoint is NOT under /api/v1. */
export const API_BASE = env.VITE_API_BASE || "http://localhost:3000/api/v1";

/** WebSocket origin */
export const WS_BASE =
    env.VITE_WS_BASE ||
    API_BASE.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "");

/**
 * Flip this on to run entirely against the in-memory mock backend — no API,
 * no socket. Required by the tracker so UI work isn't blocked on backend
 * availability.
 *
 * Note this is NOT gated on DEV: a production preview build with no API base
 * still has to work, because the mokc is currently the only working path.
 */
export const USE_MOCK = env.VITE_USE_MOCK === "true" || !env.VITE_API_BASE;


export const INBOX_TTL_MINUTES = 10;
export const EXTEND_MINUTES = 5;


export const MAX_EXTENDS = 3;

/** Timer colour thresholds, in seconds. */
export const TIMER_WARN_SECONDS = 5 * 60;
export const TIMER_DANGER_SECONDS = 60;
