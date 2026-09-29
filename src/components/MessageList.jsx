// The inbox list, laid out as the design's message table (node 33:820): one
// white card, a row per message with a read-state dot, the sender, a state
// badge, any verification code, "subject — preview", the time and "Open".
// A row is a button, so the caller decides what opening a message means.

import { useEffect } from "react";
import { formatRelativeTime } from "../utils/time.js";
import { splitSender } from "../utils/message.js";
import { extractVerificationCode } from "../utils/verificationCode.js";
// TEMPORARY LATENCY DIAGNOSTICS - observation only, see utils/timingLog.js.
import { noteRendered } from "../utils/timingLog.js";

// Unread and this recent is shown as NEW rather than UNREAD.
const NEW_FOR_MS = 60_000;

// A one-line taste of the body, for after the subject. The body may be HTML or
// plain text, and only needs to be readable here, not faithful.
function previewText(message) {
    const raw = message.textBody || message.text || message.body || message.html || "";
    return raw
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);
}

export default function MessageList({
    messages = [],
    onSelectMessage,
    isUnread = (message) => !message.isRead,
    // The caller's ticking clock, so NEW turns into UNREAD on its own. Without
    // one nothing is shown as NEW; reading the time here would be impure.
    now = null,
}) {
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
        <ul className="m-0 list-none divide-y divide-gray-200 overflow-hidden rounded-[12px] border border-gray-200 bg-white p-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            {messages.map((message) => {
                const sender = splitSender(message);
                const unread = isUnread(message);
                const received = new Date(message.receivedAt).getTime();
                const fresh =
                    unread && now !== null && now - received < NEW_FOR_MS;
                const code = extractVerificationCode({
                    subject: message.subject,
                    body: message.body || message.textBody || message.htmlBody,
                });
                const preview = previewText(message);

                return (
                    <li key={message.id}>
                        <button
                            type="button"
                            onClick={() => onSelectMessage?.(message)}
                            aria-label={`Open message from ${sender.name}: ${
                                message.subject || "(No Subject)"
                            }`}
                            className="group flex w-full cursor-pointer items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-900">
                            <span
                                aria-hidden="true"
                                className={`size-2 shrink-0 rounded-full ${
                                    unread ? "bg-gray-950" : "border border-gray-300"
                                }`}
                            />

                            <span className="flex min-w-0 flex-1 items-center gap-2">
                                <span
                                    className={`shrink-0 text-sm ${
                                        unread
                                            ? "font-bold text-gray-950"
                                            : "font-medium text-gray-600"
                                    }`}>
                                    {sender.name}
                                </span>

                                <StateBadge fresh={fresh} unread={unread} />

                                {code && (
                                    <span className="shrink-0 rounded border border-emerald-200 bg-emerald-50 px-1.5 font-mono text-[10px] font-semibold leading-[15px] text-emerald-700">
                                        OTP: {code.replace(/\s+/g, "")}
                                    </span>
                                )}

                                <span
                                    className={`min-w-0 truncate text-sm ${
                                        unread ? "text-gray-600" : "text-gray-500"
                                    }`}>
                                    {message.subject || "(No Subject)"}
                                    {preview && (
                                        <>
                                            <span className="text-gray-300"> — </span>
                                            {preview}
                                        </>
                                    )}
                                </span>

                                {message.attachments?.length > 0 && (
                                    <span className="shrink-0 font-mono text-[11px] text-gray-400">
                                        {message.attachments.length}{" "}
                                        {message.attachments.length === 1 ? "file" : "files"}
                                    </span>
                                )}

                                {message.incomplete && (
                                    <span className="shrink-0 text-[11px] font-medium text-red-600">
                                        Could not load
                                    </span>
                                )}
                            </span>

                            <time
                                dateTime={message.receivedAt}
                                className="shrink-0 font-mono text-xs text-gray-400">
                                {formatRelativeTime(message.receivedAt)}
                            </time>
                            <span
                                aria-hidden="true"
                                className={`shrink-0 text-sm font-semibold group-hover:underline ${
                                    unread ? "text-gray-900" : "text-gray-600"
                                }`}>
                                Open
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

function StateBadge({ fresh, unread }) {
    const [label, style] = fresh
        ? ["NEW", "border-emerald-200 bg-emerald-50 font-semibold text-emerald-700"]
        : unread
          ? ["UNREAD", "border-gray-200 bg-gray-100 font-medium text-gray-600"]
          : ["READ", "border-gray-200 bg-gray-50 text-gray-500"];

    return (
        <span
            className={`shrink-0 rounded border px-1.5 font-mono text-[10px] leading-[15px] ${style}`}>
            {label}
        </span>
    );
}
