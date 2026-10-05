// Client for the Inbound Email API.
//
// Matches the published OpenAPI spec (Inbound Email API 1.0.0, served at
// /api-docs on the backend). Three things about that contract shape this file:
//
//  1. Every response is wrapped: { success, message?, data }. Callers here get
//     the unwrapped `data`, so the rest of the app never sees the envelope.
//  2. The bearer token is a SESSION token, and one session can own several
//     inboxes. So the token alone no longer says which inbox is meant: the
//     per-inbox routes (info, extend) take the inbox id in the path. None
//     accepts a request body - TTL and the extend amount are server-owned.
//  3. Errors carry no machine-readable code, only { success: false, message }.
//     Branching therefore has to be on HTTP status, which is why ApiError
//     exposes named status checks rather than code comparisons.
//
// There is no DELETE endpoint. "Destroy Inbox" is local-only; see destroy()
// in useInbox.js.

import {
    API_BASE,
    USE_MOCK,
    CONFIG_ERROR,
    INBOX_TTL_MINUTES,
    EXTEND_MINUTES,
} from "../config.js";
import { MOCK_MESSAGES } from "../data/mockMessages.js";
import { recallMockMessage } from "./mockMail.js";

// Thrown before any request when the app was built without a backend
// address, so nothing goes out to a guessed one and the page can say plainly
// what is wrong instead of showing fake mail.
export class NotConfiguredError extends Error {
    constructor() {
        super(CONFIG_ERROR || "VITE_API_BASE is not set.");
        this.name = "NotConfiguredError";
    }
}

function assertConfigured() {
    if (!API_BASE) throw new NotConfiguredError();
}

// Loud at start-up rather than at the first click.
if (CONFIG_ERROR) console.error(`[inboxApi] ${CONFIG_ERROR}`);

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

    /** 429: the server is asking this client to slow down. */
    get isRateLimited() {
        return this.status === 429;
    }
}

// --- Rate limit ------------------------------------------------------
// The API allows each IP 100 requests per 15 minutes, across every route
// (express-rate-limit in the backend's utils/rateLimit.js), and answers 429
// past that. Every request counts against the same budget, so after a 429 the
// client's own background traffic - the timed session sync, the sweep on each
// socket join - holds off until rateLimitedFor() is back to 0. What the user
// asks for by hand (Refresh, Extend, a new inbox) always goes out: blocking a
// click on a guess of when the server will relent is worse than one more 429.
//
// How long to hold off: the server's own RateLimit-Reset / Retry-After when the
// browser may read them, which it may not - the backend does not list them in
// Access-Control-Expose-Headers - and otherwise 30 seconds, then 60. No longer:
// the server's window is fixed, so asking again does not extend it, and a long
// guess would only leave the inbox waiting after the server has relented. Any
// request that succeeds ends the wait at once.
const BACKOFF_START_MS = 30_000;
const BACKOFF_MAX_MS = 60_000;
let coolingUntil = 0;
let refusals = 0;

/** Milliseconds background requests should still hold off for; 0 when they need not. */
export function rateLimitedFor() {
    return Math.max(0, coolingUntil - Date.now());
}

/** Forgets any back-off. For tests, which share this module's state. */
export function resetRateLimit() {
    coolingUntil = 0;
    refusals = 0;
}

function serverResetMs(res) {
    for (const name of ["Retry-After", "RateLimit-Reset"]) {
        const seconds = Number(res.headers?.get?.(name));
        if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
    }
    return null;
}

function noteRateLimited(res) {
    refusals += 1;
    const wait =
        serverResetMs(res) ??
        Math.min(BACKOFF_MAX_MS, BACKOFF_START_MS * 2 ** (refusals - 1));
    coolingUntil = Date.now() + wait;
}

// --- Mock mode -------------------------------------------------------
// Selected explicitly in config.js (VITE_USE_MOCK=true only), and not gated
// on DEV, so a build made with the mock on still works. The mock returns exactly the shapes the real client returns
// after unwrapping, so swapping between them changes nothing upstream.
const MOCK = USE_MOCK;
const mockState = new Map();
// Sessions the mock knows, by token: `adopted` when it only met the token
// after a reload, so it holds just the inboxes added since and cannot list
// the session in full.
const mockSessions = new Map();

if (MOCK) {
    console.warn(
        "[inboxApi] Running against the in-browser mock inbox (VITE_USE_MOCK=true). " +
            "Unset it and set VITE_API_BASE to talk to the real API.",
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

// --- Transport -------------------------------------------------------

// fetch only rejects on network-level failure: DNS, CORS, offline, or an
// abort. Non-2xx responses resolve normally and are handled by readEnvelope.
// An abort is the caller's own timeout, so it passes through untouched -
// useInbox checks for AbortError by name.
async function guardedFetch(url, init, label) {
    let res;
    try {
        res = await fetch(url, init);
    } catch (err) {
        if (err?.name === "AbortError") throw err;
        console.error(`[inboxApi] ${label} could not reach ${url}`, err);
        throw new ApiError(0, "Could not reach the server.");
    }

    if (res.status === 429) noteRateLimited(res);
    else if (res.ok) resetRateLimit(); // the server is answering again
    return res;
}

/**
 * Turn a response into its `data` payload, or throw an ApiError.
 *
 * The server's own `message` is preserved on the error: it is the only
 * human-readable detail the contract provides, and dropping it would leave
 * every failure indistinguishable from every other.
 */
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
 * POST /api/v1/inbox -> { session: { token, expiresAt }, id, address, expiresAt }
 *
 * There is no per-inbox token any more. The returned inbox carries the
 * session token as `token`, because that is what every other call - and the
 * socket's join-inbox - authenticates with, and the rest of the app already
 * reads it from there.
 *
 * Takes no request body: the server owns the TTL, so ttlMinutes and
 * preferredLocalPart are not options the API offers.
 *
 * `createdAt` is added client-side. The create response omits it (only
 * /inbox/info returns one) but the progress ring needs a start point, and the
 * moment the response lands is within a round-trip of the real value. It is
 * used only for that denominator, never sent back to the server.
 *
 * Given `sessionToken`, the new inbox joins that session. The server answers
 * 404 for a session it no longer knows; the caller decides whether to start
 * a fresh one. `sessionExpiresAt` is the session's own lifetime, which the
 * server keeps at least as long as its newest inbox.
 */
export async function createInbox({ sessionToken, signal } = {}) {
    if (MOCK) {
        await delay(400, signal);
        // Lenient where the real server is strict: a reload wipes the mock's
        // memory but not the tab's stored session, so an unknown token is
        // adopted rather than refused.
        const token = sessionToken ?? `mock_${Math.random().toString(36).slice(2, 10)}`;
        if (!mockSessions.has(token)) {
            mockSessions.set(token, { adopted: Boolean(sessionToken) });
        }
        const id = mockId();
        const now = Date.now();
        const expiresAt = now + INBOX_TTL_MINUTES * 60_000;
        const address = `mock-${Math.random().toString(36).slice(2, 8)}@tempmail.dev`;
        mockState.set(id, { extendCount: 0, expiresAt, token, address, createdAt: now });
        return {
            id,
            address,
            token,
            createdAt: new Date(now).toISOString(),
            expiresAt: new Date(expiresAt).toISOString(),
            sessionExpiresAt: new Date(expiresAt).toISOString(),
        };
    }

    assertConfigured();

    const res = await guardedFetch(
        `${API_BASE}/inbox`,
        {
            method: "POST",
            ...(sessionToken ? { headers: authHeaders(sessionToken) } : {}),
            signal,
        },
        "createInbox",
    );

    const data = await readEnvelope(res, "createInbox");
    const token = data?.session?.token;

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
        sessionExpiresAt: data.session?.expiresAt ?? data.expiresAt,
    };
}

/**
 * GET /api/v1/session/inboxes -> { inboxes: [{ id, address, localPart,
 *   domain, createdAt, expiresAt, messageCount }] }
 *
 * Every inbox the session owns, expired ones included: the server does not
 * filter them, so the caller does.
 */
export async function getSessionInboxes(token, { signal } = {}) {
    if (MOCK) {
        await delay(150, signal);
        // A session from before a reload: the mock cannot vouch for it, nor
        // list the inboxes it lost, so it answers like an unreachable server
        // and the tab keeps what it has - rather than ending, or shrinking, a
        // session the real server would know in full.
        if (!mockSessions.has(token) || mockSessions.get(token).adopted) {
            throw new ApiError(0, "The mock backend has no record of this session.");
        }
        return [...mockState.entries()]
            .filter(([, entry]) => entry.token === token)
            .map(([id, entry]) => ({
                id,
                address: entry.address,
                createdAt: new Date(entry.createdAt).toISOString(),
                expiresAt: new Date(entry.expiresAt).toISOString(),
                messageCount: 0,
            }));
    }

    assertConfigured();

    const res = await guardedFetch(
        `${API_BASE}/session/inboxes`,
        { headers: authHeaders(token), signal },
        "getSessionInboxes",
    );

    const data = await readEnvelope(res, "getSessionInboxes");

    if (!Array.isArray(data?.inboxes)) {
        console.error("[inboxApi] getSessionInboxes contract mismatch", data);
        throw new ApiError(res.status, "Session inboxes response was not a list");
    }

    return data.inboxes;
}

/**
 * GET /api/v1/inbox/:id -> { address, localPart, extendCount, domain,
 *                            createdAt, expiresAt, message }
 *
 * The response carries no `id` and no `token`: the caller already holds both
 * from creation.
 */
export async function getInboxInfo(id, token, { signal } = {}) {
    if (MOCK) {
        await delay(200, signal);
        const entry = mockState.get(id) ?? [...mockState.entries()].at(-1)?.[1];
        return {
            address: entry?.address ?? "mock@tempmail.dev",
            localPart: "mock",
            domain: "tempmail.dev",
            extendCount: entry?.extendCount ?? 0,
            createdAt: undefined,
            expiresAt: entry ? new Date(entry.expiresAt).toISOString() : undefined,
        };
    }

    assertConfigured();

    const res = await guardedFetch(
        `${API_BASE}/inbox/${encodeURIComponent(id)}`,
        { headers: authHeaders(token), signal },
        "getInboxInfo",
    );

    return await readEnvelope(res, "getInboxInfo");
}

/**
 * PATCH /api/v1/inbox/extend/:id -> { expiresAt, lastExtendedAt, extendCount }
 *
 * No request body and no server-side cap: the backend always adds a fixed
 * amount and increments extendCount without limit. EXTEND_MINUTES and
 * MAX_EXTENDS in config.js are therefore display and courtesy values only -
 * see the note there.
 */
export async function extendInbox(id, token, { signal } = {}) {
    if (MOCK) {
        await delay(250, signal);
        // The inbox asked for, falling back to the newest for callers that
        // predate per-inbox ids.
        const key = mockState.has(id) ? id : [...mockState.keys()].at(-1);
        const entry = mockState.get(key);
        const base = Math.max(entry?.expiresAt ?? Date.now(), Date.now());
        const next = {
            ...entry,
            extendCount: (entry?.extendCount ?? 0) + 1,
            expiresAt: base + EXTEND_MINUTES * 60_000,
        };
        if (key) mockState.set(key, next);
        return {
            expiresAt: new Date(next.expiresAt).toISOString(),
            lastExtendedAt: new Date().toISOString(),
            extendCount: next.extendCount,
        };
    }

    assertConfigured();

    const res = await guardedFetch(
        `${API_BASE}/inbox/extend/${encodeURIComponent(id)}`,
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

/**
 * GET /api/v1/inbox/messages/:id -> the full message, body sanitised server
 * side. IND-8's reader consumes this; IND-7 only needs the socket previews.
 */
export async function fetchMessage(id, token, { signal } = {}) {
    if (MOCK) {
        await delay(200, signal);
        // A message simulated in the browser with a body comes back as it was
        // sent. A bare preview (an id and a subject) falls through, so a
        // sample's id still brings back the whole sample.
        const remembered = recallMockMessage(id);
        if (remembered && (remembered.htmlBody || remembered.textBody || remembered.body)) {
            return { isRead: false, attachments: [], ...remembered };
        }

        // A sample's id brings back the whole sample - HTML, a code, files -
        // so the reader can be tried against real-looking mail. It arrives now.
        const sample = MOCK_MESSAGES.find((candidate) => candidate.id === id);
        if (sample) return { ...sample, receivedAt: new Date().toISOString(), isRead: false };
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
 * GET /api/v1/inbox/messages/unread/all?inboxId=:id
 *     -> { session, messages: UnreadMessage[] }
 *
 * Reconnect recovery. Socket.IO restores the transport but does not replay
 * what arrived while the client was away, so this is the only way back to
 * those messages.
 *
 * The rows are list-shaped, not full messages: { id, subject, sender, to,
 * receivedAt, isRead } - `sender` already assembled by the server from the
 * name/address pair, `to` the inbox's own address, and no body at all. Each
 * one therefore goes through fetchMessage like any other arrival before it
 * reaches the list. Newest first, per the spec.
 *
 * The session token alone would return unread mail for every inbox in the
 * session, so `inboxId` narrows it to the one being watched.
 */
export async function fetchUnreadMessages(token, { inboxId, signal } = {}) {
    if (MOCK) {
        await delay(200, signal);
        // The mock backend stores no messages of its own, so there is nothing
        // to recover; live message:new previews still work.
        return [];
    }

    assertConfigured();

    const res = await guardedFetch(
        `${API_BASE}/inbox/messages/unread/all` +
            (inboxId ? `?inboxId=${encodeURIComponent(inboxId)}` : ""),
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

/**
 * GET /api/v1/inbox/attachments/:attachmentId -> the attachment's bytes
 *
 * The only endpoint that does not answer with the {success, message, data}
 * envelope: a success is the raw file, so readEnvelope cannot be used and the
 * JSON error body is only parsed on the failure path.
 *
 * Authenticated binary, which is why this cannot be an <a download>: the
 * bearer token has to travel in a header, so the bytes come back here and the
 * caller turns them into a download.
 *
 * `fallbackName` is the filename from the message payload, used when the
 * server sends no Content-Disposition (or one this cannot read).
 */
export async function downloadAttachment(attachmentId, token, { fallbackName, signal } = {}) {
    if (MOCK) {
        await delay(200, signal);
        const name = fallbackName || "attachment.txt";
        return {
            blob: new Blob([`Mock contents of ${name}`], { type: "text/plain" }),
            filename: name,
        };
    }

    assertConfigured();

    const res = await guardedFetch(
        `${API_BASE}/inbox/attachments/${encodeURIComponent(attachmentId)}`,
        { headers: authHeaders(token), signal },
        "downloadAttachment",
    );

    if (!res.ok) {
        // The failure path does answer with the envelope, so the server's own
        // message survives. A 404 here is also "stored with no content", not
        // only "no such attachment".
        let message;
        try {
            message = (await res.json())?.message;
        } catch {
            message = undefined;
        }
        const err = new ApiError(res.status, message);
        console.error("[inboxApi] downloadAttachment failed", err);
        throw err;
    }

    return {
        blob: await res.blob(),
        filename: filenameFromDisposition(res.headers.get("Content-Disposition")) || fallbackName || "attachment",
    };
}

// The filename out of a Content-Disposition header, or null. Handles the
// RFC 5987 `filename*=UTF-8''...` form first, since a server that sends both
// means that one to win.
function filenameFromDisposition(header) {
    if (!header) return null;

    const encoded = header.match(/filename\*=\s*UTF-8''([^;]+)/i);
    if (encoded) {
        try {
            return decodeURIComponent(encoded[1].trim());
        } catch (err) {
            console.error("[inboxApi] undecodable filename* in Content-Disposition", err);
        }
    }

    // Express sends the plain form unquoted for an ordinary name
    // (filename=logo.png) and quoted once it contains a space or a quote, with
    // inner quotes backslash-escaped - so the quoted branch has to allow \" and
    // unescape it, or a name like 'weird "quoted" name.txt' is cut at the first
    // escaped quote.
    const quoted = header.match(/filename\s*=\s*"((?:[^"\\]|\\.)*)"/i);
    if (quoted) return quoted[1].replace(/\\(.)/g, "$1").trim() || null;

    const bare = header.match(/filename\s*=\s*([^;]+)/i);
    return bare ? bare[1].trim() || null : null;
}
