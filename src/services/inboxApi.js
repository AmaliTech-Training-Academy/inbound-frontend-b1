import {
    API_BASE,
    WS_BASE,
    USE_MOCK,
    INBOX_TTL_MINUTES,
    EXTEND_MINUTES,
    MAX_EXTENDS,
} from "../config.js";

function assertConfigured(base, varName) {
    if (!base) {
        throw new Error(`${varName} is not set.`);
    }
}

// --- Mock mode -------------------------------------------------------
const MOCK = USE_MOCK;
const MOCK_TTL_MS = INBOX_TTL_MINUTES * 60_000;

// Per-inbox extend counter, so the mock can reproduce the real API's
// 409 EXTEND_LIMIT_REACHED once MAX_EXTENDS is reached.
const mockState = new Map();

if (MOCK) {
    console.warn(
        "[inboxApi] Running against the in-browser mock inbox (VITE_USE_MOCK, " +
            "or VITE_API_BASE is unset). Set VITE_API_BASE to talk to the real API.",
    );
}

function abortError() {
    return new DOMException("Aborted", "AbortError");
}

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

function mockInboxResponse(ttlMinutes) {
    const now = Date.now();
    const id = mockId();
    const ttlMs = (ttlMinutes ?? INBOX_TTL_MINUTES) * 60_000;
    mockState.set(id, { extendCount: 0, expiresAt: now + ttlMs });
    return {
        id,
        address: `mock-${Math.random().toString(36).slice(2, 8)}@tempmail.dev`,
        token: `mock_${Math.random().toString(36).slice(2, 10)}`,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + ttlMs).toISOString(),
    };
}

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
        // ApiError already hands status and code
        // debugging will be made from that
    }
    return new ApiError(res.status, code, message);
}

// Response: { id, address, token, createdAt, expiresAt }
export async function createInbox({
    ttlMinutes,
    preferredLocalPart,
    signal,
} = {}) {
    if (MOCK) {
        await delay(400, signal); // feels like a real request, and can be aborted
        return mockInboxResponse(ttlMinutes);
    }

    assertConfigured(API_BASE, "VITE_API_BASE");

    const body = {};
    if (ttlMinutes != null) body.ttlMinutes = ttlMinutes;
    if (preferredLocalPart) body.preferredLocalPart = preferredLocalPart;

    try {
        const res = await fetch(`${API_BASE}/inboxes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal,
        });

        if (!res.ok) throw await parseError(res);

        const data = await res.json();

        if (!data?.id || !data?.address || !data?.token || !data?.expiresAt) {
            throw new ApiError(
                500,
                "CONTRACT_MISMATCH",
                "Inbox response missing required fields",
            );
        }

        return data;
    } catch (err) {
        // fetch only rejects on network-level failure: DNS, CORS, offline,
        // or an abort. An abort is the caller's own timeout, so let it
        // through untouched — useInbox checks for AbortError by name.
        //
        // A non-2xx response or a contract mismatch arrives here as an
        // ApiError already carrying the server's status/code/message.
        // Wrapping it in NETWORK_ERROR would throw that away and make a 422
        // look like the user being offline, so only fetch-level failures
        // get wrapped.
        if (err instanceof ApiError || err?.name === "AbortError") throw err;
        throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server.");
    }
}

// GET /inboxes/:id — bearer auth. Returns inbox metadata plus a page
// of message summaries; IND-3 only needs it to confirm the inbox is
// still alive, IND-7 will use the message list.
export async function fetchInbox(id, token, { cursor, limit, signal } = {}) {
    if (MOCK) {
        await delay(200, signal);
        const state = mockState.get(id);
        return {
            id,
            extendCount: state?.extendCount ?? 0,
            // Mirror back the mock's own expiry so a rehydrate/refresh agrees
            // with what createInbox/extendInbox handed out.
            expiresAt: state
                ? new Date(state.expiresAt).toISOString()
                : undefined,
            messages: [],
            nextCursor: null,
        };
    }

    assertConfigured(API_BASE, "VITE_API_BASE");

    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString() ? `?${params}` : "";

    let res;
    try {
        res = await fetch(
            `${API_BASE}/inboxes/${encodeURIComponent(id)}${qs}`,
            {
                headers: { Authorization: `Bearer ${token}` },
                signal,
            },
        );
    } catch (err) {
        if (err?.name === "AbortError") throw err;
        throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server.");
    }

    if (!res.ok) throw await parseError(res);
    return await res.json();
}

// POST /inboxes/:id/extend — bearer auth. 409 EXTEND_LIMIT_REACHED once
// extendCount hits MAX_EXTENDS; surfaced as ApiError so the UI can grey
// out the button on that specific code rather than any failure.
export async function extendInbox(id, token, { extendMinutes, signal } = {}) {
    if (MOCK) {
        await delay(250, signal);
        const state = mockState.get(id) ?? {
            extendCount: 0,
            expiresAt: Date.now() + MOCK_TTL_MS,
        };
        if (state.extendCount >= MAX_EXTENDS) {
            throw new ApiError(
                409,
                "EXTEND_LIMIT_REACHED",
                "This inbox cannot be extended any further.",
            );
        }
        state.extendCount += 1;
        state.expiresAt =
            Math.max(state.expiresAt, Date.now()) +
            (extendMinutes ?? EXTEND_MINUTES) * 60_000;
        mockState.set(id, state);
        return {
            id,
            expiresAt: new Date(state.expiresAt).toISOString(),
            extendCount: state.extendCount,
        };
    }

    assertConfigured(API_BASE, "VITE_API_BASE");

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
    if (MOCK) {
        await delay(150, signal);
        mockState.delete(id);
        return;
    }

    assertConfigured(API_BASE, "VITE_API_BASE");

    const res = await fetch(`${API_BASE}/inboxes/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        signal,
    });

    if (!res.ok && res.status !== 204) throw await parseError(res);
}

// The WS route in the doc is at the host root (/ws), not under
// /api/v1, and it's a separate env var since the two can point at
// different origins in some deployments
export function inboxSocketUrl(id, token) {
    assertConfigured(WS_BASE, "VITE_WS_BASE");
    const params = new URLSearchParams({ inboxId: id, token });
    return `${WS_BASE}/ws?${params}`;
}
