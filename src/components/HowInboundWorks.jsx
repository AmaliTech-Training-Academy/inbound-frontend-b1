import { MailOpen, Trash2, Zap } from "lucide-react";
import { INBOX_TTL_MINUTES } from "../config.js";

// The original project's three steps, word for word, drawn as the design's
// cards: glassy white, a hairline border, the step number and its icon on top.
const STEPS = [
    {
        icon: Zap,
        title: "Click Generate",
        body: "Ephemeral mailbox instance bound instantly in volatile RAM. No account, password, or tracking cookie is ever created — only this tab keeps the address, so closing it forgets the inbox.",
        note: "Allocation: < 20ms",
    },
    {
        icon: MailOpen,
        title: "Receive OTPs & Links",
        body: "Real-time WebSocket streaming with 1-click verification code extraction. Emails open in a sandbox: no scripts, no forms, no tracking pixels.",
        note: "Streaming: End-to-end TLS",
    },
    {
        icon: Trash2,
        title: "Auto-Shred & Purge",
        body: `Permanent cryptographic zeroization after ${INBOX_TTL_MINUTES} minutes or instantly via manual destruction. The entire namespace is recycled.`,
        note: "Purge: Unrecoverable",
        danger: true,
    },
];

export default function HowInboundWorks({ className = "" }) {
    return (
        <ol className={`m-0 grid w-full list-none grid-cols-1 gap-4 p-0 md:grid-cols-3 ${className}`}>
            {STEPS.map(({ icon: Icon, title, body, note, danger }, index) => (
                <li
                    key={title}
                    className="flex flex-col rounded-3xl border border-slate-200 bg-white/90 p-6 text-left">
                    <div className="mb-5 flex items-center justify-between">
                        <span
                            className={`font-mono text-xs ${danger ? "text-rose-600" : "text-slate-400"}`}>
                            {String(index + 1).padStart(2, "0")}
                        </span>
                        <span
                            className={`flex size-10 items-center justify-center rounded-full ${
                                danger ? "bg-rose-50 text-rose-600" : "bg-slate-800 text-white"
                            }`}>
                            <Icon size={17} aria-hidden="true" />
                        </span>
                    </div>
                    <h2 className="text-lg font-medium text-slate-900">{title}</h2>
                    <p className="mt-2 grow text-sm leading-relaxed text-slate-600">{body}</p>
                    <p
                        className={`mt-6 border-t border-slate-200/70 pt-4 font-mono text-xs ${
                            danger ? "text-rose-600" : "text-slate-500"
                        }`}>
                        ● {note}
                    </p>
                </li>
            ))}
        </ol>
    );
}
