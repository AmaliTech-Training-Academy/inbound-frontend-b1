import { useEffect, useRef } from "react";
import { msRemaining } from "../state/inboxStorage.js";
import { splitSender } from "../utils/message.js";

// QA's threshold (IB-008), in minutes rather than the percentage that turns
// the timer red: isRunningOut is 30% of a lifetime that extensions change, so
// the two do not coincide and are not meant to. This one is a crossing, not a
// state - the last few minutes are the ones worth acting on.
const RUNNING_OUT_MS = 5 * 60_000;

// Feed messages are raw: a preview row from message:new carries only an
// address, in whichever of sender/from/fromAddress the server used. splitSender
// is what the reader itself uses, so a toast names a sender the same way the
// row below it does.
function senderOf(message) {
    // splitSender falls back to "Unknown sender" rather than an empty name,
    // so there is nothing further to guard here.
    const { name, email } = splitSender(message);
    return name || email;
}

/**
 * Turns the session's own state changes into notifications.
 *
 * Every one of these is a *transition*, not a condition, which is the whole
 * difficulty: an inbox already under five minutes when the page loads has not
 * just crossed the line, and announcing it would be a lie. So the first run
 * records what is already true and says nothing; only later changes speak.
 */
export function useInboxNotifications({ inboxes, feeds, notice, notify }) {
    const seenMessages = useRef(null);
    const runningOut = useRef(null);
    const expiryTimes = useRef(null);
    const knownInboxes = useRef(null);
    const lastNotice = useRef(null);

    // 1. Mail arriving, in any inbox - the one on screen or one that is not.
    useEffect(() => {
        const first = seenMessages.current === null;
        if (first) seenMessages.current = new Set();

        for (const inbox of inboxes) {
            for (const message of feeds[inbox.id]?.messages ?? []) {
                const id = String(message.id);
                if (seenMessages.current.has(id)) continue;
                seenMessages.current.add(id);
                if (first) continue;
                notify({
                    key: `message:${id}`,
                    kind: "message",
                    text: `New message from ${senderOf(message)}.`,
                    inboxAddress: inboxes.length > 1 ? inbox.address : null,
                });
            }
        }
    }, [inboxes, feeds, notify]);

    // 2. An inbox crossing into its last five minutes, and 3. being extended.
    //
    // Both watch expiresAt, so they share an effect: an extend that lifts an
    // inbox back above the threshold has to clear its "running out" mark too,
    // or a second crossing would never be announced.
    useEffect(() => {
        const firstRunningOut = runningOut.current === null;
        const firstExpiry = expiryTimes.current === null;
        if (firstRunningOut) runningOut.current = new Set();
        if (firstExpiry) expiryTimes.current = new Map();

        for (const inbox of inboxes) {
            const previous = expiryTimes.current.get(inbox.id);
            const current = new Date(inbox.expiresAt).getTime();
            expiryTimes.current.set(inbox.id, current);

            // A real extend adds whole minutes. Requiring more than a second
            // means a timestamp that merely came back rounded differently, or
            // from a clock a little ahead, is not announced as one.
            const extended = previous !== undefined && current - previous > 1000;
            if (!firstExpiry && extended) {
                notify({
                    key: `extended:${inbox.id}:${current}`,
                    kind: "extended",
                    text: "Time extended.",
                    inboxAddress: inboxes.length > 1 ? inbox.address : null,
                });
            }

            const left = msRemaining(inbox.expiresAt);
            const low = left > 0 && left <= RUNNING_OUT_MS;
            if (!low) {
                runningOut.current.delete(inbox.id);
                continue;
            }
            if (runningOut.current.has(inbox.id)) continue;
            runningOut.current.add(inbox.id);
            if (firstRunningOut) continue;
            notify({
                key: `running-out:${inbox.id}:${current}`,
                kind: "running-out",
                text: "Less than 5 minutes left.",
                inboxAddress: inboxes.length > 1 ? inbox.address : null,
            });
        }
    }, [inboxes, notify]);

    // 4. An inbox joining the session.
    useEffect(() => {
        const first = knownInboxes.current === null;
        if (first) knownInboxes.current = new Set();

        for (const inbox of inboxes) {
            if (knownInboxes.current.has(inbox.id)) continue;
            knownInboxes.current.add(inbox.id);
            if (first) continue;
            notify({
                key: `added:${inbox.id}`,
                kind: "added",
                text: "New inbox ready.",
                inboxAddress: inbox.address,
            });
        }
    }, [inboxes, notify]);

    // 5. An inbox running out while the session keeps others. useInbox only
    // raises `notice` in that case - the last one leaves through the expired
    // card instead - so there is no count to check here.
    useEffect(() => {
        if (!notice) return;
        if (lastNotice.current === notice) return;
        lastNotice.current = notice;

        const addresses = notice.addresses ?? [];
        notify({
            key: `expired:${addresses.join(",")}`,
            kind: "expired",
            text: `${addresses.join(", ")} expired.${notice.switched ? " Switched to your next inbox." : ""}`,
        });
    }, [notice, notify]);
}
