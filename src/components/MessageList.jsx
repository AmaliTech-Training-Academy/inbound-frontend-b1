// The inbox list. Renders one row per message: sender, subject, time received.

import Badge from "./ui/Badge";
import { formatRelativeTime } from "../utils/time.js";

// `sender` is a display projection like "Ada Lovelace <ada@example.com>",
// while from/fromAddress hold the bare address. A preview row from
// message:new has only the address, so split whatever is available.
function splitSender(message) {
    const raw = message.sender || message.from || message.fromAddress || "";
    const angled = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);

    if (angled) {
        return { name: angled[1] || angled[2], email: angled[2] };
    }

    return { name: raw || "Unknown sender", email: "" };
}

function initials(name) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");
}

export default function MessageList({ messages = [] }) {
    if (!messages || messages.length === 0) return null;

    return (
        <ul className="flex flex-col gap-3 list-none m-0 p-0">
            {messages.map((message) => {
                const sender = splitSender(message);

                return (
                    <li key={message.id}>
                        <article className="flex items-start gap-3 rounded-[10px] border border-line bg-white p-4 shadow-tile">
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
                        </article>
                    </li>
                );
            })}
        </ul>
    );
}
