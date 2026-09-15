import { useEffect, useMemo, useState } from "react";
import Card from "./ui/Card";
import Countdown from "./Countdown";
import ProgressRing from "./ProgressRing";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import AddressBar from "./AddressBar";

export default function ActiveInbox({ inbox, onReset }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const intervalId = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(intervalId);
    }, []);

    const percentage = useMemo(() => {
        if (!inbox.expiresAt) return 100;
        const expiryTimestamp = new Date(inbox.expiresAt).getTime();
        const msRemaining = Math.max(0, expiryTimestamp - now);
        const maxDurationMs = 600000;
        const calcPercentage = (msRemaining / maxDurationMs) * 100;
        return Math.min(100, Math.max(0, calcPercentage));
    }, [inbox.expiresAt, now]);

    const isDanger = percentage <= 30;

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 mt-4 animate-in fade-in duration-500 text-left">
            {/* Status Pill */}
            <div className="flex justify-center mb-2">
                <div className="flex items-center gap-2 text-[11px] font-mono tracking-wide text-gray-700 bg-surface border border-gray-300 border-line px-3 py-1.5 rounded-full shadow-sm">
                    <span className="text-emerald-500 animate-pulse">●</span>
                    (Ephemeral) instance active — Volatile memory allocation
                </div>
            </div>

            {/* Timer Card */}
            <Card className="flex items-center justify-between p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col gap-1">
                    <h2 className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">
                        Time until auto-destruct
                    </h2>

                    <div
                        className={`text-[48px] leading-none font-mono font-bold tracking-tighter mt-2 mb-2 transition-colors duration-500 ${isDanger ? "text-danger" : "text-ink"}`}>
                        <Countdown expiresAt={inbox.expiresAt} />
                    </div>

                    <p className="text-[13px] text-muted max-w-sm">
                        This inbox and its messages are permanently deleted when
                        the timer runs out.
                    </p>
                </div>

                <div className="flex flex-col items-center gap-3">
                    <ProgressRing percentage={percentage} isDanger={isDanger} />

                    <button className="text-[11px] font-medium text-muted hover:text-ink transition-colors border border-line-cool rounded px-2 py-1 bg-canvas">
                        + Extend 5m
                    </button>
                </div>
            </Card>

            {/* Address Card */}
            <Card className="p-6 sm:p-8 shadow-sm">
                <p className="text-[11px] font-bold tracking-widest text-gray-400 text-muted mb-4">
                    Active Inbound Address
                </p>
                <AddressBar address={inbox.address} />
            </Card>

            {/* Inbox Layout */}
            <div className="mt-8 flex flex-col">
                <div className="flex flex-wrap items-center justify-between mb-4 px-2 gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-ink">Inbox</h2>
                        <Badge className="rounded-full text-gray-900">
                            0 messages
                        </Badge>
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
                            + Extend 5m
                        </Button>
                        <Button
                            variant="chip"
                            onClick={onReset}
                            className="text-danger hover:border-danger hover:bg-red-100 hover:opacity-80 flex items-center gap-1.5 transition-colors border border-danger/20  px-2 py-1 rounded">
                            <span className="text-base leading-none">
                                <img
                                    className="w-[10.667px] h-3"
                                    src="/trash-1.png"
                                    alt="trash-btn"
                                />
                            </span>{" "}
                            Destroy Inbox
                        </Button>
                    </div>
                </div>

                {/* Empty State Body */}
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

                    <p className="text-[14px] text-muted max-w-112.5 mb-8 leading-relaxed">
                        New messages and verification codes sent to{" "}
                        <span className="font-mono text-ink font-medium">
                            {inbox.address}
                        </span>{" "}
                        will appear here in real-time without refreshing.
                    </p>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-gray-800 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
                        <span className="text-emerald-500 animate-pulse">
                            ●
                        </span>
                        Waiting for incoming transmissions...
                    </div>
                </Card>
            </div>
        </div>
    );
}
