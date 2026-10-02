import { useState } from "react";
import { extractVerificationCode } from "../utils/verificationCode.js";
import CopyButton from "./CopyButton.jsx";

// The landing page's centrepiece: the code finder the inbox runs, working on
// four sample emails. Two carry a sign-in code and two only look like they
// do, so the card shows the one decision Inbound makes for you: what is a code
// and what is not. Every result is the real extractor's answer, worked out
// here from the sample's text, never written into the sample.
//
// The senders are made up on purpose; a real company's name on an email it
// never sent would read as an endorsement.
const SAMPLES = [
    {
        sender: "Northwind",
        subject: "Your Northwind sign-in code",
        body: "Hi there, your sign-in code is 482 913. It works once and expires in 10 minutes.",
        why: "Read straight after “sign-in code”, in the groups the sender wrote it in.",
    },
    {
        sender: "Orbit",
        subject: "G-739204 is your Orbit verification code",
        body: "Enter it on the screen where you started. Don’t share it with anyone.",
        why: "Read back from “verification code”, with the sender’s G- prefix left off.",
    },
    {
        sender: "Ledgerly",
        subject: "Your Ledgerly receipt",
        body: "Thanks for your order. Invoice INV-2026 for $19.00 was paid on 2026-09-30. Reference 552918.",
        decoys: ["INV-2026", "2026-09-30", "552918"],
        why: "An invoice, a date and a reference. Code-shaped, but nothing calls them a code.",
    },
    {
        sender: "Brightside",
        subject: "A little thank-you from Brightside",
        body: "Use code SAVE20 at checkout for 20% off your next order.",
        decoys: ["SAVE20"],
        why: "A discount code. The checkout wording says it isn’t one to sign in with.",
    },
].map((sample) => ({ ...sample, code: extractVerificationCode(sample) }));

const FOUND = SAMPLES.filter((sample) => sample.code).length;

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// `text` with the found code marked in the accent and each decoy marked as
// "looked at, left alone".
function Marked({ text, code, decoys = [] }) {
    const tokens = [code, ...decoys].filter(Boolean);
    if (!tokens.length) return text;

    const parts = text.split(new RegExp(`(${tokens.map(escapeRegExp).join("|")})`));
    return parts.map((part, index) => {
        if (part === code) {
            return (
                <mark key={index} className="rounded bg-brand-soft px-1 font-mono text-[0.95em] text-ink">
                    {part}
                </mark>
            );
        }
        if (decoys.includes(part)) {
            return (
                <span
                    key={index}
                    className="font-mono text-[0.95em] text-slate-400 underline decoration-slate-300 decoration-dotted underline-offset-4">
                    {part}
                </span>
            );
        }
        return part;
    });
}

export default function CodeFinderDemo({ className = "" }) {
    const [selected, setSelected] = useState(0);
    const sample = SAMPLES[selected];

    return (
        <figure className={`m-0 ${className}`}>
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-[0_30px_60px_-35px_rgba(11,28,48,0.35)]">
                <div className="flex items-center justify-between px-3 pb-2 pt-2.5 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                    <span>Code finder · sample inbox</span>
                    <span>
                        {FOUND}/{SAMPLES.length} have a code
                    </span>
                </div>

                <ul className="m-0 list-none p-0" aria-label="Sample emails">
                    {SAMPLES.map((item, index) => {
                        const active = index === selected;
                        return (
                            <li key={item.sender}>
                                <button
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setSelected(index)}
                                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                                        active ? "bg-slate-100" : "hover:bg-slate-50"
                                    }`}>
                                    <span className="w-20 shrink-0 truncate text-sm font-semibold text-ink">
                                        {item.sender}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm text-slate-500">
                                        {item.subject}
                                    </span>
                                    {item.code ? (
                                        <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs text-ink">
                                            <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
                                            {item.code}
                                        </span>
                                    ) : (
                                        <span className="shrink-0 font-mono text-xs text-slate-400">no code</span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <div aria-live="polite" className="mt-2 rounded-[1.25rem] bg-slate-50 p-4">
                    <p className="m-0 truncate text-sm font-semibold text-ink">
                        <Marked text={sample.subject} code={sample.code} decoys={sample.decoys} />
                    </p>
                    {/* Held at two lines, as is the note below, so picking
                        another email never moves the card. */}
                    <p className="m-0 mt-1.5 min-h-[2lh] text-sm leading-relaxed text-slate-600">
                        <Marked text={sample.body} code={sample.code} decoys={sample.decoys} />
                    </p>

                    <div className="mt-4 flex min-h-12 items-center justify-between gap-4 border-t border-slate-200 pt-3">
                        {sample.code ? (
                            <>
                                <div className="min-w-0">
                                    <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                                        Code found
                                    </p>
                                    <p className="m-0 font-mono text-2xl font-medium tracking-wide text-ink">
                                        {sample.code}
                                    </p>
                                </div>
                                <CopyButton
                                    text={sample.code}
                                    size={14}
                                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium">
                                    Copy
                                </CopyButton>
                            </>
                        ) : (
                            <div>
                                <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                                    No code
                                </p>
                                <p className="m-0 text-2xl font-medium text-slate-400">Nothing to copy</p>
                            </div>
                        )}
                    </div>
                    <p className="m-0 mt-2 min-h-[2lh] text-xs leading-relaxed text-slate-500">{sample.why}</p>
                </div>
            </div>

            <figcaption className="mt-3 px-3 font-mono text-[11px] text-slate-400">
                Pick an email. Every message in your inbox gets this same check.
            </figcaption>
        </figure>
    );
}
