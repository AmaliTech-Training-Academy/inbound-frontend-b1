import { useCallback, useEffect, useRef, useState } from "react";
import { useInbox } from "../state/useInbox.js";
import Countdown from "./Countdown.jsx";
import { ArrowRight, Check, Timer, Copy, CheckThick } from "./icons/icons.jsx";
import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";
import Badge from "./ui/Badge.jsx";

export default function Hero() {
    const { status, inbox, error, generate, reset } = useInbox();
    const creating = status === "creating";

    return (
        <section id="generate" className="relative overflow-hidden">
            <div aria-hidden="true" className="absolute inset-0 hero-wash" />
            <div aria-hidden="true" className="absolute inset-0 dot-grid" />

            <div className="relative mx-auto flex max-w-[896px] flex-col items-center px-6 pb-12 pt-16">
                {/* FIX: Hide the heading and paragraph if an inbox is active or expired */}
                {status !== "active" && status !== "expired" && (
                    <>
                        <h1 className="max-w-[672px] text-center text-[clamp(2.5rem,6vw,4rem)] font-bold leading-[1.05] tracking-[-1.1px] text-ink">
                            Create a temporary email in seconds.
                        </h1>

                        <p className="mt-4 max-w-[576px] text-center text-base leading-6 tracking-[-0.08px] text-muted">
                            Protect your inbox with a disposable email address
                            for sign-ups, verification codes, and temporary
                            testing.
                        </p>
                    </>
                )}

                {/* FIX: Remove the top margin (mt-8) and expand width when the inbox is active */}
                <div
                    className={`w-full ${status === "active" ? "max-w-[896px]" : "max-w-[750px] mt-8"}`}>
                    {status === "loading" ? (
                        <div aria-busy="true" className="h-11" />
                    ) : status === "active" && inbox ? (
                        <ActiveInbox inbox={inbox} onReset={reset} />
                    ) : status === "expired" ? (
                        <Expired onReset={reset} />
                    ) : (
                        <div className="flex flex-col items-center">
                            <Button
                                onClick={generate}
                                disabled={creating}
                                className="flex h-11 items-center justify-center gap-2 rounded-[4px] border border-black bg-ink px-[25px] text-base font-medium tracking-[-0.16px] text-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-opacity hover:opacity-90 disabled:opacity-55">
                                {creating
                                    ? "Generating\u2026"
                                    : "Generate temporary email"}
                                {!creating && <ArrowRight />}
                            </Button>

                            {status === "error" && (
                                <p
                                    role="alert"
                                    className="mt-4 max-w-[420px] text-center text-[13px] text-danger">
                                    {error?.message ||
                                        "Could not create an inbox."}{" "}
                                    Check your connection and try again.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {status !== "active" &&
                    status !== "loading" &&
                    status !== "expired" && (
                        <>
                            <ul className="mt-6 flex flex-wrap items-center justify-center gap-6">
                                <li className="flex items-center gap-1.5 text-[13px] text-muted">
                                    <Check className="text-muted" />
                                    No signup required
                                </li>
                                <li className="flex items-center gap-1.5 text-[13px] text-muted">
                                    <Check className="text-muted" />
                                    No credit card
                                </li>
                                <li className="flex items-center gap-1.5 font-mono text-xs font-medium text-danger">
                                    <Timer className="text-danger" />
                                    Auto-destructs in 10 min
                                </li>
                            </ul>

                            <HowInboundWorks />
                        </>
                    )}
            </div>
        </section>
    );
}

function Expired({ onReset }) {
    return (
        // REFACTORED: Swapped <div> for <Card>, removed redundant bg/border/radius classes
        <Card className="flex flex-col items-center gap-4 p-8 shadow-tile">
            <p className="font-mono text-xs tracking-wide text-danger">
                INBOX PURGED
            </p>
            <p className="max-w-[420px] text-center text-sm text-muted">
                This inbox expired. Its messages and attachments are
                unrecoverable.
            </p>
            <Button
                type="button"
                onClick={onReset}
                className="flex h-11 items-center gap-2 rounded-[4px] border border-black bg-ink px-[25px] text-base font-medium text-black transition-opacity hover:opacity-90">
                Generate a new address
                <ArrowRight />
            </Button>
        </Card>
    );
}

function ActiveInbox({ inbox, onReset }) {
    return (
        <div className="w-full max-w-[896px] mx-auto flex flex-col gap-6 mt-4 animate-in fade-in duration-500 text-left">
            {/* Status Pill */}
            <div className="flex justify-center mb-2">
                <div className="flex items-center gap-2 text-[11px] font-mono tracking-wide text-muted bg-surface border border-line px-3 py-1.5 rounded-full shadow-sm">
                    <span className="text-emerald-500 animate-pulse">●</span>
                    (Ephemeral) instance active — Volatile memory allocation
                </div>
            </div>

            {/* Timer Card */}
            {/* REFACTORED: Swapped <div> for <Card> */}
            <Card className="flex items-center justify-between p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col gap-1">
                    <h2 className="text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                        Time until auto-destruct
                    </h2>
                    <div className="text-[48px] leading-none font-mono font-bold tracking-tighter text-ink mt-2 mb-2">
                        <Countdown expiresAt={inbox.expiresAt} />
                    </div>
                    <p className="text-[13px] text-muted max-w-sm">
                        This inbox and its messages are permanently deleted when
                        the timer runs out.
                    </p>
                </div>

                <div className="flex flex-col items-center gap-3">
                    <div className="size-16 rounded-full border-[3px] border-line flex items-center justify-center font-mono text-xs font-bold text-ink relative">
                        <svg
                            className="absolute inset-0 size-full -rotate-90"
                            viewBox="0 0 36 36">
                            <path
                                className="text-ink"
                                strokeDasharray="100, 100"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                        </svg>
                        100%
                    </div>
                    <button className="text-[11px] font-medium text-muted hover:text-ink transition-colors border border-line-cool rounded px-2 py-1 bg-canvas">
                        + Extend 10m
                    </button>
                </div>
            </Card>

            {/* Address Card */}
            {/* REFACTORED: Swapped <div> for <Card> */}
            <Card className="p-6 sm:p-8 shadow-sm">
                <p className="text-[11px] font-bold tracking-widest text-gray-400 text-muted uppercase mb-4">
                    Active Inbound Address
                </p>
                <AddressBar address={inbox.address} />
            </Card>

            {/* Inbox Layout */}
            <div className="mt-8 flex flex-col">
                <div className="flex flex-wrap items-center justify-between mb-4 px-2 gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-ink">Inbox</h2>
                        {/* REFACTORED: Used Badge instead of raw span, but kept rounded-full to override her default 4px radius */}
                        <Badge className="rounded-full">0 messages</Badge>
                    </div>

                    <div className="flex items-center gap-4 text-[13px] font-medium">
                        <Button
                            variant="chip"
                            className="text-muted hover:text-ink flex items-center gap-1.5 transition-colors">
                            ↻ Refresh
                        </Button>
                        <Button
                            variant="chip"
                            className="text-muted hover:text-ink flex items-center gap-1.5 transition-colors">
                            + Extend 10m
                        </Button>
                        <Button
                            variant="chip"
                            onClick={onReset}
                            className="text-danger hover:opacity-80 flex items-center gap-1.5 transition-colors border border-danger/20 bg-danger/5 px-2 py-1 rounded">
                            <span className="text-base leading-none">⊗</span>{" "}
                            Destroy Inbox
                        </Button>
                    </div>
                </div>

                {/* Empty State Body */}
                {/* REFACTORED: Swapped <div> for <Card> */}
                <Card className="p-12 sm:p-16 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="mb-5 text-muted bg-canvas border border-line-cool p-4 rounded-full">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round">
                            <rect width="20" height="16" x="2" y="4" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                    </div>

                    <h3 className="text-lg font-bold text-ink mb-2">
                        Your inbox is empty
                    </h3>

                    <p className="text-[14px] text-muted max-w-[450px] mb-8 leading-relaxed">
                        New messages and verification codes sent to{" "}
                        <span className="font-mono text-ink font-medium">
                            {inbox.address}
                        </span>{" "}
                        will appear here in real-time without refreshing.
                    </p>

                    <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-emerald-500 uppercase font-medium bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                        <span className="animate-pulse">●</span> Waiting for
                        incoming transmissions...
                    </div>
                </Card>
            </div>
        </div>
    );
}

function HowInboundWorks() {
    return (
        <div className="w-full max-w-5xl mx-auto mt-24 mb-16 text-left">
            <div className="mb-8 pl-2">
                <h2 className="text-lg font-semibold text-ink mb-1">
                    How Inbound Works
                </h2>
                <p className="text-muted text-sm">
                    Engineered for absolute frictionlessness and mathematical
                    privacy.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* REFACTORED: Swapped <div> for <Card> on all three cards */}
                <Card className="p-6 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4 text-muted">
                        <span className="text-xs font-mono font-medium">
                            01
                        </span>
                        <span>⚡️</span>
                    </div>
                    <h3 className="font-semibold text-ink mb-2">
                        Click Generate
                    </h3>
                    <p className="text-muted text-sm grow mb-6 leading-relaxed">
                        Ephemeral mailbox instance bound instantly in volatile
                        RAM. No persistent records, passwords, or cookies are
                        ever written.
                    </p>
                    <div className="text-xs font-mono text-muted pt-4 border-t border-line-cool">
                        ● Allocation: &lt; 20ms
                    </div>
                </Card>

                <Card className="p-6 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4 text-muted">
                        <span className="text-xs font-mono font-medium">
                            02
                        </span>
                        <span>📥</span>
                    </div>
                    <h3 className="font-semibold text-ink mb-2">
                        Receive OTPs & Links
                    </h3>
                    <p className="text-muted text-sm grow mb-6 leading-relaxed">
                        Real-time WebSocket streaming with 1-click verification
                        code extraction. View plain-text safely without
                        rendering external trackers.
                    </p>
                    <div className="text-xs font-mono text-muted pt-4 border-t border-line-cool">
                        ● Streaming: End-to-end TLS
                    </div>
                </Card>

                <Card className="p-6 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4 text-muted">
                        <span className="text-xs font-mono font-medium">
                            03
                        </span>
                        <span className="text-danger">🔥</span>
                    </div>
                    <h3 className="font-semibold text-ink mb-2">
                        Auto-Shred & Purge
                    </h3>
                    <p className="text-muted text-sm grow mb-6 leading-relaxed">
                        Permanent cryptographic zerocization after 10 minutes or
                        instantly via manual destruction. The entire namespace
                        is recycled.
                    </p>
                    <div className="text-xs font-mono text-danger pt-4 border-t border-line-cool">
                        ● Purge: Unrecoverable
                    </div>
                </Card>
            </div>
        </div>
    );
}

function AddressBar({ address }) {
    const [copyState, setCopyState] = useState("idle");
    const addressRef = useRef(null);
    const resetTimer = useRef(null);

    useEffect(() => () => clearTimeout(resetTimer.current), []);

    const copy = useCallback(async () => {
        clearTimeout(resetTimer.current);
        try {
            await navigator.clipboard.writeText(address);
            setCopyState("copied");
            resetTimer.current = setTimeout(() => setCopyState("idle"), 2000);
        } catch {
            setCopyState("failed");
            const node = addressRef.current;
            if (node) {
                const range = document.createRange();
                range.selectNodeContents(node);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
            resetTimer.current = setTimeout(() => setCopyState("idle"), 6000);
        }
    }, [address]);

    return (
        <div>
            {/* We changed the border style to map to the design */}
            <div className="flex items-center justify-between gap-3 border-b-2 border-ink pb-4">
                <span
                    ref={addressRef}
                    className="min-w-0 flex-1 truncate font-mono text-2xl text-ink tracking-tight">
                    {address}
                </span>

                <Button
                    type="button"
                    onClick={copy}
                    aria-label={`Copy ${address}`}
                    className="flex shrink-0 items-center gap-2 rounded-[4px] bg-ink px-4 py-2.5 text-[13px] font-medium text-black transition-opacity hover:opacity-90">
                    {copyState === "copied" ? <CheckThick /> : <Copy />}
                    <span className="hidden sm:inline">
                        {copyState === "copied" ? "Copied" : "Copy Address"}
                    </span>

                    {/* Keyboard shortcut hint */}
                    {copyState !== "copied" && (
                        <kbd className="ml-1 rounded-[2px] border border-white/20 bg-white/10 px-1.5 py-px font-mono text-[10px] text-white/70 hidden sm:inline-block">
                            ⌘C
                        </kbd>
                    )}
                </Button>
            </div>

            {copyState === "failed" && (
                <p
                    role="alert"
                    className="mt-3 text-center text-[13px] text-danger">
                    Couldn&apos;t copy automatically. The address is selected —
                    press Ctrl+C (or Cmd+C) to copy it.
                </p>
            )}
        </div>
    );
}
