// TEMPORARY LATENCY DIAGNOSTICS - where does a live message spend its time
// between `message:new` and being on screen?
//
// Observation only: nothing in this file changes control flow, ordering, or the
// timing of the real pipeline. It reads clocks and writes console lines.
//
// Removal: delete this file, then delete the calls marked `TEMPORARY
// DIAGNOSTICS` in inboxSocket.js, useMessages.js and MessageList.jsx
// (grep for `noteArrival|noteQueued|noteFetchStarted|noteFetchReturned|noteRetry|
// noteRetryStarted|noteStage|noteSweep|noteRendered`).
//
// Filter the console on "[INBOX TIMING]" and follow one message id from
// `[1] message:new received` to `[8] [TOTAL]`. The numbers in the stage names
// are the nine things we set out to measure:
//
//   [1] message:new received        -> when the event reached the browser
//   [2] (the id, on every line)     -> which message
//   [3] fetch started               -> when fetchMessage actually began
//   [4] fetch returned              -> first response, its status, how long
//   [5] PENDING                     -> whether that status was PENDING
//   [6] retry started/returned      -> the retry leg, if it ran
//   [7] inserted into state         -> when React state was given the row
//   [8] rendered                    -> when the row was committed to the DOM
//   [9] receivedAt                  -> the server's own timestamp, both copies

// Flip to false to silence the logs without removing the calls.
const ENABLED = true;

// One entry per message id. `arrivedAt` is the zero point every elapsed figure
// is measured from; `queuedAt` is when it took its place in the fetch queue,
// which is what tells us how much of the wait was queueing rather than network.
const arrivedAt = new Map();
const queuedAt = new Map();
const attemptStarted = new Map();
const retried = new Set();

let sweepStartedAt;

const log = (text) => {
    if (ENABLED) console.log(text);
};

const elapsedSince = (start) =>
    start === undefined ? null : Math.round(performance.now() - start);

/** One line, always carrying the id and how long ago `message:new` was. */
function line(id, stage, detail) {
    const elapsed = elapsedSince(arrivedAt.get(id));
    const parts = [];
    if (elapsed !== null) parts.push(`+${elapsed}ms since message:new`);
    if (detail) parts.push(detail);

    return `[INBOX TIMING] ${stage} ${id}${
        parts.length ? ` (${parts.join(", ")})` : ""
    }`;
}

/**
 * The server's own receipt time next to this browser's clock. Read it with
 * care: the difference includes clock skew between the two machines, and the
 * API does not define whether receivedAt is the backend's receipt moment or the
 * message's own Date header.
 */
function logServerTime(id, label, receivedAt) {
    const serverTime = Date.parse(receivedAt ?? "");
    if (Number.isNaN(serverTime)) return;

    log(
        line(
            id,
            label,
            `receivedAt=${receivedAt}, which this browser's clock puts ` +
                `${Math.round(Date.now() - serverTime)}ms ago`,
        ),
    );
}

/** [1] `message:new` reached the browser, before any handling. */
function noteArrival(id, payload, source = "socket") {
    if (!id || arrivedAt.has(id)) return;

    arrivedAt.set(id, performance.now());

    log(
        `[INBOX TIMING] [1] message:new received ${id} (at ${new Date().toISOString()}` +
            (source === "socket" ? "" : `, via ${source}`) +
            (payload?.subject ? `, subject="${payload.subject}"` : "") +
            ")",
    );

    // [9] the payload's copy.
    logServerTime(id, "[9] payload receivedAt", payload?.receivedAt);
}

/**
 * The arrival took its place in the serial fetch queue. `ahead` is how many
 * fetches must finish before this message's own fetch can start - the decisive
 * number if the delay turns out to be queueing rather than network.
 */
function noteQueued(id, ahead) {
    if (!id) return;

    queuedAt.set(id, performance.now());
    log(
        line(
            id,
            "[queue] queued",
            `${ahead} fetch(es) ahead of it, waiting on the serial queue`,
        ),
    );
}

/** [3] fetchMessage is about to be called. */
function noteFetchStarted(id, attempt = 1) {
    if (!id) return;

    const now = performance.now();
    attemptStarted.set(id, now);

    const waited =
        attempt === 1 && queuedAt.has(id)
            ? `${Math.round(now - queuedAt.get(id))}ms after being queued`
            : null;

    log(
        line(
            id,
            `[3] fetch started`,
            `attempt ${attempt}${waited ? `, ${waited}` : ""}`,
        ),
    );
}

/** [4] the fetch resolved. [5] whether that status was PENDING. [9] its receivedAt. */
function noteFetchReturned(id, status, attempt = 1, message) {
    if (!id) return;

    const took = elapsedSince(attemptStarted.get(id));
    const isPending = status === "PENDING";

    log(
        line(
            id,
            `[4] fetch returned`,
            `attempt ${attempt}, status ${status ?? "none"}, took ${took}ms`,
        ),
    );

    if (isPending) {
        log(line(id, "[5] status is PENDING", "the retry path will run"));
    }

    // [9] the full message's own copy, which is the authoritative one.
    logServerTime(id, "[9] message receivedAt", message?.receivedAt);
}

/** [5]/[6] the retry leg is being entered. */
function noteRetry(id, waitMs) {
    if (!id) return;

    retried.add(id);
    log(
        line(
            id,
            "[6] retry scheduled",
            `sleeping ${waitMs}ms first, so this arrives ~${waitMs}ms later than it could`,
        ),
    );
}

/** [6] the second fetch is about to be called. */
function noteRetryStarted(id) {
    if (!id) return;
    log(line(id, "[6] retry started"));
}

/** [7] the row was handed to React state. */
function noteInserted(id) {
    if (!id) return;

    log(
        line(
            id,
            "[7] inserted into state",
            `PENDING retry ${retried.has(id) ? "yes" : "no"}`,
        ),
    );
}

/** Any other stage worth a line. */
function noteStage(id, stage, detail) {
    if (!id) return;
    log(line(id, stage, detail));
}

/** The recovery sweep, whose rows occupy the queue ahead of live arrivals. */
function noteSweepStarted() {
    sweepStartedAt = performance.now();
    log(`[INBOX TIMING] [sweep] recovery sweep started`);
}

function noteSweepReturned(rowCount) {
    log(
        `[INBOX TIMING] [sweep] recovery sweep returned ` +
            `(${rowCount} row(s) in ${elapsedSince(sweepStartedAt)}ms, ` +
            `each one queued ahead of any arrival that lands while it drains)`,
    );
}

/** [8] the row is committed to the DOM. Closes the entry with the total. */
function noteRendered(id) {
    if (!id) return;

    const total = elapsedSince(arrivedAt.get(id));

    log(line(id, "[8] rendered"));

    if (total !== null) {
        log(
            `[INBOX TIMING] [8] [TOTAL] message:new -> rendered ${id} ${total}ms`,
        );
    }

    arrivedAt.delete(id);
    queuedAt.delete(id);
    attemptStarted.delete(id);
    retried.delete(id);
}

export {
    noteArrival,
    noteQueued,
    noteFetchStarted,
    noteFetchReturned,
    noteRetry,
    noteRetryStarted,
    noteInserted,
    noteStage,
    noteSweepStarted,
    noteSweepReturned,
    noteRendered,
};
