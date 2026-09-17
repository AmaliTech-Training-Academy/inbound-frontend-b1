import { useEffect, useState } from "react";
import Card from "./ui/Card";
import { formatReceivedAt, formatAbsolute } from "../utils/formatReceivedAt.js";

// How often the relative times ("4m ago") are recalculated. A message that
// says "just now" ten minutes later is worse than a cheap interval.
const TICK_MS = 30_000;

/**
 * The inbox's messages, newest first (IND-7, AC 1 and 2).
 *
 * Rows are not interactive yet: opening a message is IND-8, and the reader
 * does not exist. A row that looked clickable and did nothing would be the
 * same defect as the inert buttons flagged in IND-3's review.
 *
 * TODO(IND-7): this layout is provisional. The Figma design for the message
 * list shows more than the socket currently delivers, so it is deliberately
 * NOT built yet - see the gaps below. Revisit once the payload is widened.
 *
 * The backend Message model already holds every missing field; the
 * "message:new" event just does not emit them (see publishNewMessage in the
 * backend's src/configs/websocket.js), which was a deliberate choice to keep
 * the notification lightweight.
 *
 *   design element          needs                 status
 *   ----------------------  --------------------  -------------------------
 *   sender display name     message.fromName      in DB, not emitted
 *   preview snippet         message.textBody      in DB, not emitted
 *   unread dot / NEW chip   message.isRead        in DB, not emitted
 *   "N unread" count        derived from isRead   blocked on the above
 *   "Open" per row          the reader            IND-8, does not exist
 *   Auto-Extract OTP card   OTP extraction        separate ticket
 *
 * Preferred fix is widening the emit rather than firing a
 * GET /inbox/messages/:id per arrival, which would be one request per
 * message and defeats the reason the payload is slim.
 *
 * Also note the design's time format is "14s ago" / "2 min", where
 * formatReceivedAt currently produces "just now" / "4m ago".
 *
 * Open question for whoever wrote the ticket: "Open" and read/unread state
 * belong to IND-8's reader, so this design may span both tickets rather than
 * being IND-7's target on its own.
 */
export default function MessageList({ messages }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(id);
    }, []);

    return (
        <Card className="shadow-sm overflow-hidden">
            <ul className="divide-y divide-line-cool">
                {messages.map((message) => (
                    <li
                        key={message.id}
                        className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:gap-4">
                        <span className="min-w-0 truncate font-mono text-[13px] text-muted sm:w-56 sm:shrink-0">
                            {message.fromAddress || "unknown sender"}
                        </span>

                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                            {message.subject || (
                                <span className="italic text-muted">
                                    (no subject)
                                </span>
                            )}
                        </span>

                        <time
                            dateTime={message.receivedAt}
                            title={formatAbsolute(message.receivedAt)}
                            className="shrink-0 font-mono text-[11px] text-muted tabular-nums">
                            {formatReceivedAt(message.receivedAt, now)}
                        </time>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
