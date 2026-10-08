// The inbox list, as the design's sidebar draws it: a blob avatar for the
// sender, their name and when it arrived, the subject (with a paperclip when
// something is attached) and a line of the body. A row is a button, so the
// caller decides what opening a message means.

import { Paperclip } from "lucide-react";
import Avatar from "./Avatar.jsx";
import { formatRelativeTime } from "../utils/time.js";
import { splitSender } from "../utils/message.js";
import { extractVerificationCode } from "../utils/verificationCode.js";

// A one-line taste of the body, for under the subject. The body may be HTML or
// plain text, and only needs to be readable here, not faithful.
function previewText(message) {
    const raw = message.textBody || message.text || message.body || message.html || "";
    return raw
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        // The common entities, so text that talks about markup reads "<html>"
        // rather than "&lt;html&gt;". &amp; goes last, or "&amp;lt;" would
        // decode twice.
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);
}

export default function MessageList({
    messages = [],
    onSelectMessage,
    selectedId = null,
    isUnread = (message) => !message.isRead,
}) {
    if (!messages || messages.length === 0) return null;

    return (
        <ul className="m-0 list-none p-0">
            {messages.map((message) => {
                // A row already through toReaderMessage carries its sender and
                // code worked out; a raw API row is read here instead.
                const parsed = splitSender(message);
                const sender = {
                    name: message.senderName || parsed.name,
                    email: message.senderEmail || parsed.email,
                };
                const unread = isUnread(message);
                const selected = message.id === selectedId;
                const code =
                    "verificationCode" in message
                        ? message.verificationCode
                        : extractVerificationCode({
                              subject: message.subject,
                              body: message.body || message.textBody || message.htmlBody,
                          });
                const preview = previewText(message);
                const subject = message.subject || "(No Subject)";
                const hasFiles = message.attachments?.length > 0;

                return (
                    <li key={message.id}>
                        <button
                            type="button"
                            onClick={() => onSelectMessage?.(message)}
                            aria-current={selected ? "true" : undefined}
                            aria-label={`Open message from ${sender.name}: ${subject}${
                                unread ? ", unread" : ""
                            }${hasFiles ? ", with attachments" : ""}`}
                            className={`relative flex w-full items-start gap-3 border-b border-slate-100 px-4 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-slate-900 sm:px-5 ${
                                selected ? "bg-slate-50" : "hover:bg-slate-50/70"
                            }`}>
                            <Avatar seed={sender.email || sender.name} size={42} />

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span
                                        className={`truncate text-slate-900 ${
                                            unread ? "font-semibold" : "font-medium"
                                        }`}>
                                        {sender.name}
                                    </span>
                                    <time
                                        dateTime={message.receivedAt}
                                        className="shrink-0 text-[11px] text-slate-400">
                                        {formatRelativeTime(message.receivedAt)}
                                    </time>
                                </div>

                                <div className="mt-0.5 flex items-center gap-1">
                                    {hasFiles && (
                                        <Paperclip
                                            size={12}
                                            aria-hidden="true"
                                            className="shrink-0 text-slate-400"
                                        />
                                    )}
                                    <span
                                        className={`truncate text-slate-800 ${
                                            unread ? "font-semibold" : "font-medium"
                                        }`}>
                                        {subject}
                                    </span>
                                </div>

                                {preview && (
                                    <p className="mt-0.5 truncate text-slate-400">{preview}</p>
                                )}

                                {(code || message.incomplete) && (
                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                        {code && (
                                            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700">
                                                OTP: {code.replace(/\s+/g, "")}
                                            </span>
                                        )}
                                        {message.incomplete && (
                                            <span className="text-[11px] font-medium text-rose-600">
                                                Could not load
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Unread, where the design drew its star. */}
                            <span
                                aria-hidden="true"
                                className={`mt-1.5 size-2 shrink-0 rounded-full ${
                                    unread ? "bg-sky-600" : "bg-transparent"
                                }`}
                            />
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
