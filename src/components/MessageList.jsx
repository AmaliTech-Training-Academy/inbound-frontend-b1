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
