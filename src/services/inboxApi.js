// Client for the Inbound Email API.
//
// Matches the published OpenAPI spec (Inbound Email API 1.0.0, served at
// /api-docs on the backend). Three things about that contract shape this file:
//
//  1. Every response is wrapped: { success, message?, data }. Callers here get
//     the unwrapped `data`, so the rest of the app never sees the envelope.
//  2. Creation issues two credentials: an inbox token, which scopes the inbox
//     and message routes, and a session token, which scopes the session routes.
//     Only the inbox token is kept here - nothing in this client calls a
//     session route. The inbox routes take no inbox id: the token is the inbox.
//     None accepts a request body - TTL and the extend amount are server-owned.
//  3. Errors carry no machine-readable code, only { success: false, message }.
//     Branching therefore has to be on HTTP status, which is why ApiError
//     exposes named status checks rather than code comparisons.
//
// There is no DELETE endpoint. "Destroy Inbox" is local-only; see destroy()
// in useInbox.js.

import { API_BASE, USE_MOCK } from "../config.js";
import {
    createInboxRecord,
    getRecord,
    extendRecord,
    getMessage,
} from "./mockBackend.js";

function assertConfigured() {
    if (!API_BASE) throw new Error("VITE_API_BASE is not set.");
}

export class ApiError extends Error {
    constructor(status, message) {
        super(message || `Request failed (${status})`);
        this.name = "ApiError";
        this.status = status;
    }

    get isUnauthorized() {
        return this.status === 401 || this.status === 403;
    }

    get isNotFound() {
        return this.status === 404;
    }

    /** 410 Gone: the inbox outlived its TTL and the server has reaped it. */
    get isExpired() {
        return this.status === 410;
    }

    /** The inbox is unusable and the client should stop showing it. */
    get isDead() {
        return this.isUnauthorized || this.isNotFound || this.isExpired;
    }
}

// --- Mock mode -------------------------------------------------------
// Deliberately not gated on DEV, so a preview build with no VITE_API_BASE still
// works. The store itself lives in mockBackend.js; this file only routes to it,
// so the shapes below are identical in both modes.
const MOCK = USE_MOCK;

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

// --- Transport -------------------------------------------------------

// fetch only rejects on network-level failure (DNS, CORS, offline, or the
// caller's own abort); non-2xx resolves normally and is handled by readEnvelope.
async function guardedFetch(url, init, label) {
    try {
        return await fetch(url, init);
    } catch (err) {
        if (err?.name === "AbortError") throw err;
        console.error(`[inboxApi] ${label} could not reach ${url}`, err);
        throw new ApiError(0, "Could not reach the server.");
    }
}

/** Unwrap `data`, or throw an ApiError keeping the server's own `message`. */
async function readEnvelope(res, label) {
    let body;
    try {
        body = await res.json();
    } catch (err) {
        console.error(`[inboxApi] ${label} returned invalid JSON`, err);
        throw new ApiError(res.status, "The server sent an unreadable reply.");
    }

    if (!res.ok || body?.success === false) {
        const err = new ApiError(res.status, body?.message);
        console.error(`[inboxApi] ${label} failed`, err);
        throw err;
    }

    if (!body || typeof body !== "object" || !("data" in body)) {
        console.error(`[inboxApi] ${label} response had no data field`, body);
        throw new ApiError(res.status, "The server sent an unexpected reply.");
    }

    return body.data;
}

function authHeaders(token) {
    return { Authorization: `Bearer ${token}` };
}

// --- Endpoints -------------------------------------------------------

/**
 * POST /api/v1/inbox -> { session: { token, expiresAt }, id, address, token,
 *                           expiresAt }
 *
 * Unauthenticated, and the only call that issues credentials: the per-inbox
 * `token` and, alongside it, the session token. The inbox the app carries
 * holds the per-inbox one, because that is what every other call - and the
 * socket's join-inbox - authenticates with.
 *
 * Takes no request body: the server owns the TTL. `createdAt` is added
 * client-side, since the create response omits it but the progress ring needs a
 * start point; it is never sent back to the server.
 */
export async function createInbox({ signal } = {}) {
    if (MOCK) {
        await delay(400, signal);
        const record = createInboxRecord();
        // The record carries its own seeded mail; the create contract does not.
        const { id, address, token, createdAt, expiresAt } = record;
        return { id, address, token, createdAt, expiresAt };
    }

    assertConfigured();

    const res = await guardedFetch(
        `${API_BASE}/inbox`,
        { method: "POST", signal },
        "createInbox",
    );

    const data = await readEnvelope(res, "createInbox");

    // Two credentials come back and they are not interchangeable: inbox and
    // message routes are scoped by the inbox token, session routes by the
    // session token. Nothing here calls a session route, so the inbox token is
    // the one kept; the response's session token is deliberately dropped.
    const token = data?.token;

    if (!data?.id || !data?.address || !token || !data?.expiresAt) {
        console.error("[inboxApi] createInbox contract mismatch", data);
        throw new ApiError(res.status, "Inbox response missing required fields");
    }

    return {
        createdAt: new Date().toISOString(),
        id: data.id,
        address: data.address,
        token,
        expiresAt: data.expiresAt,
    };
}

/**
 * GET /api/v1/inbox/info -> { address, localPart, extendCount, domain,
 *                             createdAt, expiresAt, message }
 *
 * The inbox token is the whole address of the request: the route takes no id
 * and the response carries neither an id nor a token back, because the caller
 * already holds both from creation.
 */
export async function getInboxInfo(token, { signal } = {}) {
    if (MOCK) {
        await delay(200, signal);
        const record = getRecord(token);
        if (record) {
            const { address, localPart, domain, extendCount, createdAt, expiresAt } =
                record;
            return { address, localPart, domain, extendCount, createdAt, expiresAt };
        }

        // Fallback for pre-seeded inboxes (e.g. in tests)
        return {
            address: "mock@tempmail.dev",
            localPart: "mock",
            domain: "tempmail.dev",
            extendCount: 0,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        };
    }

    assertConfigured();

    const res = await guardedFetch(
        `${API_BASE}/inbox/info`,
        { headers: authHeaders(token), signal },
        "getInboxInfo",
    );

    return await readEnvelope(res, "getInboxInfo");
}

/**
 * PATCH /api/v1/inbox/extend -> { expiresAt, lastExtendedAt, extendCount }
 *
 * Extends the inbox the token belongs to; like /inbox/info, the route takes no
 * id. No request body and no server-side cap: the backend always adds a fixed
 * amount and increments extendCount without limit. EXTEND_MINUTES and
 * MAX_EXTENDS in config.js are therefore display and courtesy values only -
 * see the note there.
 */
export async function extendInbox(token, { signal } = {}) {
    if (MOCK) {
        await delay(250, signal);
        const record = extendRecord(token);
        if (record) {
            return {
                expiresAt: record.expiresAt,
                lastExtendedAt: new Date().toISOString(),
                extendCount: record.extendCount,
            };
        }

        return {
            expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
            lastExtendedAt: new Date().toISOString(),
            extendCount: 1,
        };
    }

    assertConfigured();

    const res = await guardedFetch(
        `${API_BASE}/inbox/extend`,
        { method: "PATCH", headers: authHeaders(token), signal },
        "extendInbox",
    );

    const data = await readEnvelope(res, "extendInbox");

    if (!data?.expiresAt) {
        console.error("[inboxApi] extendInbox contract mismatch", data);
        throw new ApiError(res.status, "Extend response missing expiresAt");
    }

    return data;
}

/** GET /api/v1/inbox/messages/:id -> the full message, body sanitised server side. */
export async function fetchMessage(id, token, { signal } = {}) {
    if (MOCK) {
        await delay(200, signal);
        const message = getMessage(token, id);
        if (message) return message;
        return {
            id,
            subject: "Mock message",
            sender: "Mock Sender <sender@example.com>",
            from: "sender@example.com",
            to: "mock@tempmail.dev",
            body: "This is a mock message body.",
            attachments: [],
            isRead: false,
        };
    }

    assertConfigured();

    const res = await guardedFetch(
        `${API_BASE}/inbox/messages/${encodeURIComponent(id)}`,
        { headers: authHeaders(token), signal },
        "fetchMessage",
    );

    return await readEnvelope(res, "fetchMessage");
}

/**
 * GET /api/v1/inbox/messages -> { messages: InboxMessageSummary[] }
 *
 * Reconnect recovery. Socket.IO restores the transport but does not replay
 * what arrived while the client was away, so the inbox's whole message list is
 * what a re-join resynchronises against.
 *
 * The rows are list-shaped, not full messages: { id, subject, fromName,
 * fromAddress, toAddress, isRead, receivedAt, attachmentCount } - no body. Each
 * one therefore goes through fetchMessage like any other arrival before it
 * reaches the list. Newest first, per the spec.
 *
 * The inbox token already scopes the list to one inbox. The route declares no
 * query parameters at all, so there is nothing to narrow it with.
 */
export async function fetchInboxMessages(token, { signal } = {}) {
    if (MOCK) {
        await delay(200, signal);
        // The mock backend stores no messages of its own, so there is nothing
        // to recover; live message:new previews still work.
        return [];
    }

    assertConfigured();

    const res = await guardedFetch(
        `${API_BASE}/inbox/messages`,
        { headers: authHeaders(token), signal },
        "fetchInboxMessages",
    );

    const data = await readEnvelope(res, "fetchInboxMessages");
    const messages = Array.isArray(data) ? data : data?.messages;

    if (!Array.isArray(messages)) {
        console.error("[inboxApi] fetchInboxMessages contract mismatch", data);
        throw new ApiError(res.status, "Messages response was not a list");
    }

    return messages;
}

/**
 * GET /api/v1/inbox/messages/unread/all -> { messages: UnreadMessage[] }
 *
 * The unread-only view of the same list, scoped by the same inbox token, with
 * rows shaped { id, subject, sender, to, receivedAt, isRead }. Nothing reads it
 * today - reconnect recovery wants every message, not just the unread ones -
 * but the endpoint is part of the published contract and is kept wrapped here
 * so a caller never has to know about the envelope.
 */
export async function fetchUnreadMessages(token, { signal } = {}) {
    if (MOCK) {
        await delay(200, signal);
        return [];
    }

    assertConfigured();

    const res = await guardedFetch(
        `${API_BASE}/inbox/messages/unread/all`,
        { headers: authHeaders(token), signal },
        "fetchUnreadMessages",
    );

    const data = await readEnvelope(res, "fetchUnreadMessages");

    if (!Array.isArray(data?.messages)) {
        console.error("[inboxApi] fetchUnreadMessages contract mismatch", data);
        throw new ApiError(res.status, "Unread messages response was not a list");
    }

    return data.messages;
}
