import { MailOpen, Trash2, Zap } from "lucide-react";
import { INBOX_TTL_MINUTES } from "../config.js";

// The three steps, in the words a first-time visitor would use: what they get,
// what turns up in it, and when it goes away. Drawn as the design's cards; all
// three carry the same brand treatment, none is singled out by colour.
const STEPS = [
    {
        icon: Zap,
        title: "Click Generate",
        body: "You get a working email address right away — no account, no password, no tracking cookie. Only this tab remembers it, so closing the tab forgets the inbox.",
        note: "Nothing to sign up for",
    },
    {
        icon: MailOpen,
        title: "Receive Codes & Links",
        body: "Mail arrives on its own, and any verification code is pulled out and ready to copy. Emails open safely: no scripts, no forms, no tracking pixels.",
        note: "Sent over a secure connection",
    },
    {
        icon: Trash2,
        title: "Everything Disappears",
        body: `The inbox and everything in it are deleted after ${INBOX_TTL_MINUTES} minutes, or the moment you destroy it yourself. Once it is gone, it cannot be brought back.`,
        note: "Gone for good",
    },
];

// Three across only from lg up: at tablet widths three columns leave each card
// narrow and tall, with dead space beneath the row.
export default function HowInboundWorks({ className = "" }) {
    return (
        <ol className={`m-0 grid w-full list-none grid-cols-1 gap-4 p-0 lg:grid-cols-3 ${className}`}>
            {STEPS.map(({ icon: Icon, title, body, note }, index) => (
                <li
                    key={title}
                    className="flex flex-col rounded-3xl border border-slate-200 bg-white/90 p-6 text-left dark:border-line-dark dark:bg-surface-dark/90">
                    <div className="mb-5 flex items-center justify-between">
                        <span className="font-mono text-xs text-brand">
                            {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                            <Icon size={17} aria-hidden="true" />
                        </span>
                    </div>
                    <h2 className="text-lg font-semibold text-ink dark:text-ink-dark">{title}</h2>
                    <p className="mt-2 grow text-sm leading-relaxed text-slate-600 dark:text-body-dark">{body}</p>
                    <p className="mt-6 pt-4 font-mono text-xs text-brand">● {note}</p>
                </li>
            ))}
        </ol>
    );
}
