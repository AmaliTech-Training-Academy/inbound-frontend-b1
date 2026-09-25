// The inbox list. Renders one row per message: sender, subject, time received.
// A row is a button, so the caller decides what opening a message means.

import { useEffect } from "react";
import Badge from "./ui/Badge";
import { formatRelativeTime } from "../utils/time.js";
import { splitSender } from "../utils/message.js";
// TEMPORARY LATENCY DIAGNOSTICS - observation only, see utils/timingLog.js.
import { noteRendered } from "../utils/timingLog.js";

function initials(name) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");
}

export default function MessageList({ messages = [], onSelectMessage }) {
    // TEMPORARY DIAGNOSTICS: the list is newest first, so messages[0] is the
    // newest arrival. An effect runs after React has committed, so this is the
    // first moment the row is on screen. Keyed on the id, so the once-a-second
    // countdown re-render does not re-log it.
    const newestId = messages[0]?.id;
    useEffect(() => {
        if (newestId) noteRendered(newestId);
    }, [newestId]);

    if (!messages || messages.length === 0) return null;

    return (
        <ul className="flex flex-col gap-3 list-none m-0 p-0">
            {messages.map((message) => {
                const sender = splitSender(message);

                return (
                    <li key={message.id}>
                        <button
                            type="button"
                            onClick={() => onSelectMessage?.(message)}
                            aria-label={`Open message from ${sender.name}: ${
                                message.subject || "(No Subject)"
                            }`}
                            className="flex w-full cursor-pointer items-start gap-3 rounded-[10px] border border-line bg-white p-4 text-left shadow-tile transition-colors hover:bg-surface-subtle">
                            <span
                                aria-hidden="true"
                                className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-[8px] bg-chip text-sm font-semibold text-ink">
                                {initials(sender.name)}
                            </span>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="truncate text-sm font-semibold text-ink">
                                        {sender.name}
                                    </span>
                                    <time
                                        dateTime={message.receivedAt}
                                        className="shrink-0 font-mono text-[11px] text-muted">
                                        {formatRelativeTime(message.receivedAt)}
                                    </time>
                                </div>

                                <p className="mt-0.5 truncate text-sm text-ink">
                                    {message.subject || "(No Subject)"}
                                </p>

                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    {sender.email && (
                                        <span className="truncate font-mono text-xs text-muted">
                                            &lt;{sender.email}&gt;
                                        </span>
                                    )}

                                    {message.attachments?.length > 0 && (
                                        <Badge>
                                            {message.attachments.length}{" "}
                                            {message.attachments.length === 1
                                                ? "file"
                                                : "files"}
                                        </Badge>
                                    )}

                                    {message.incomplete && (
                                        <Badge className="text-danger">
                                            Could not load
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
