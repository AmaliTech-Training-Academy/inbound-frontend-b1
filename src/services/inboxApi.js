// inboxApi.js
//
// Matches the Temp Inbox Service API doc:
//   - REST lives under {VITE_API_BASE_URL} (already includes /api/v1)
//   - WS lives at {VITE_WS_BASE_URL}/ws (root, no /api/v1 prefix)
//   - Errors come back as { error: { code, message } }
//
// Both env vars are blank until backend gives you a real host — see
// .env.example. Calls will throw a clear error until then rather than
// silently hitting a relative path that 404s.
//
// This layer reports what the server said, unmodified. It does not patch,
// rescue or second-guess response values — useInbox decides what to trust.
// Two layers rewriting the same field is how you get a bug that survives
// being fixed in one of them.

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const WS_BASE = import.meta.env.VITE_WS_BASE_URL;

function assertConfigured(base, varName) {
    if (!base) {
        throw new Error(
            `${varName} is not set. Copy .env.example to .env and fill it in once backend gives you a host.`,
        );
    }
}

// --- Mock mode -------------------------------------------------------
// While VITE_API_BASE_URL is blank, createInbox/fetchInbox fake a
// response instead of hitting the network, so the whole IND-3 flow —
// button, address, copy, countdown ticking to zero, expired state,
// refresh-restores-inbox — can be watched end to end with zero backend.
// The moment the env var is set, this path is skipped entirely.
//
// Note this is the only mock that can exercise the countdown honestly: it
// mints a real TTL relative to now. A Postman mock returns a timestamp
// hardcoded when the example was saved, so against Postman the countdown
// will read as years — correct behaviour for a static fixture, not a bug.
// Use Postman to verify HTTP, headers and error codes; use this for timing.
const MOCK = import.meta.env.DEV && !API_BASE;
const MOCK_TTL_MS = 30_000; // short on purpose, so expiry is easy to watch

if (MOCK) {
    console.warn(
        "[inboxApi] VITE_API_BASE_URL is not set — using a fake in-browser inbox. " +
            "Set the env var to talk to the real API.",
    );
}

function abortError() {
    return new DOMException("Aborted", "AbortError");
}

// A setTimeout that respects an AbortSignal. Plain `await new Promise(r =>
// setTimeout(r, ms))` resolves no matter what, so a fake request stays
// "in flight" after the caller has given up — which silently defeats any
// timeout built on top of it. Real fetch honours the signal; the fake has
// to as well, or mock mode tests a code path that doesn't exist.
function delay(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(abortError());
        const t = setTimeout(resolve, ms);
        signal?.addEventListener(
            "abort",
            () => {
                clearTimeout(t);
                reject(abortError());
            },
            { once: true },
        );
    });
}

function mockId() {
    return (
        crypto.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
}

function mockInboxResponse() {
    const now = Date.now();
    return {
        id: mockId(),
        address: `mock-${Math.random().toString(36).slice(2, 8)}@tempmail.dev`,
        token: `mock_${Math.random().toString(36).slice(2, 10)}`,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + MOCK_TTL_MS).toISOString(),
    };
}

// Thrown for any non-2xx response. `code` is the doc's error.code
// (e.g. "INBOX_NOT_FOUND", "EXTEND_LIMIT_REACHED", "VALIDATION_ERROR"),
// so callers can branch on it instead of parsing message strings.
export class ApiError extends Error {
    constructor(status, code, message) {
        super(message || code || `Request failed (${status})`);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
    }

    get isUnauthorized() {
        return this.status === 401 || this.status === 403;
    }

    get isNotFound() {
        return this.status === 404 || this.code === "INBOX_NOT_FOUND";
    }
}

async function parseError(res) {
    let code, message;
    try {
        const body = await res.json();
        code = body?.error?.code;
        message = body?.error?.message;
    } catch {
        // non-JSON error body (e.g. a proxy 502 page) — fall through to status
    }
    return new ApiError(res.status, code, message);
}

// POST /inboxes — no auth. Both body fields are optional per the doc's
// Zod schema, so an empty call is valid and gets you a random address
// at the default TTL.
//
// Response: { id, address, token, createdAt, expiresAt }
export async function createInbox({
    ttlMinutes,
    preferredLocalPart,
    signal,
} = {}) {
    if (MOCK) {
        await delay(400, signal); // feels like a real request, and can be aborted
        return mockInboxResponse();
    }

    assertConfigured(API_BASE, "VITE_API_BASE_URL");

    const body = {};
    if (ttlMinutes != null) body.ttlMinutes = ttlMinutes;
    if (preferredLocalPart) body.preferredLocalPart = preferredLocalPart;

    const res = await fetch(`${API_BASE}/inboxes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
    });

    if (!res.ok) throw await parseError(res);

    const data = await res.json();

    // Fail loudly in dev if the deployed API drifts from the doc — much
    // easier to debug than a countdown silently reading NaN.
    if (!data?.id || !data?.address || !data?.token || !data?.expiresAt) {
        throw new ApiError(
            500,
            "CONTRACT_MISMATCH",
            "Inbox response missing required fields",
        );
    }

    return data;
}

// GET /inboxes/:id — bearer auth. Returns inbox metadata plus a page
// of message summaries; IND-3 only needs it to confirm the inbox is
// still alive, IND-7 will use the message list.
export async function fetchInbox(id, token, { cursor, limit, signal } = {}) {
    if (MOCK) {
        // Deliberately omits address, token and expiresAt. A stateless fake
        // cannot know them, so the caller falls back to what it stored —
        // which is the truthful outcome. Inventing values here is what made
        // the address and the countdown reset on every refresh.
        await delay(200, signal);
        return { id, extendCount: 0, messages: [], nextCursor: null };
    }

    assertConfigured(API_BASE, "VITE_API_BASE_URL");

    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString() ? `?${params}` : "";

    const res = await fetch(
        `${API_BASE}/inboxes/${encodeURIComponent(id)}${qs}`,
        {
            headers: { Authorization: `Bearer ${token}` },
            signal,
        },
    );

    if (!res.ok) throw await parseError(res);
    return await res.json();
}

// POST /inboxes/:id/extend — bearer auth. 409 EXTEND_LIMIT_REACHED once
// extendCount hits MAX_EXTENDS; surfaced as ApiError so the UI can grey
// out the button on that specific code rather than any failure.
export async function extendInbox(id, token, { extendMinutes, signal } = {}) {
    assertConfigured(API_BASE, "VITE_API_BASE_URL");

    const body = {};
    if (extendMinutes != null) body.extendMinutes = extendMinutes;

    const res = await fetch(
        `${API_BASE}/inboxes/${encodeURIComponent(id)}/extend`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
            signal,
        },
    );

    if (!res.ok) throw await parseError(res);
    return await res.json(); // { id, expiresAt, extendCount }
}

// DELETE /inboxes/:id — bearer auth, 204 No Content. Used by "new
// address" to clean up the old inbox server-side before discarding it
// client-side (best-effort: don't block the UI if this fails).
export async function deleteInbox(id, token, { signal } = {}) {
    assertConfigured(API_BASE, "VITE_API_BASE_URL");

    const res = await fetch(`${API_BASE}/inboxes/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        signal,
    });

    if (!res.ok && res.status !== 204) throw await parseError(res);
}

// The WS route in the doc is at the host root (/ws), not under
// /api/v1, and it's a separate env var since the two can point at
// different origins in some deployments (e.g. behind different
// reverse-proxy rules for HTTP vs upgrade requests).
export function inboxSocketUrl(id, token) {
    assertConfigured(WS_BASE, "VITE_WS_BASE_URL");
    const params = new URLSearchParams({ inboxId: id, token });
    return `${WS_BASE}/ws?${params}`;
}
