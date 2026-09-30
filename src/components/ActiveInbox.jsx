import { useEffect, useMemo, useState } from "react";
import Card from "./ui/Card";
import Countdown from "./Countdown";
import ProgressRing from "./ProgressRing";
import Button from "./ui/Button";
import AddressBar from "./AddressBar";
import InboxList from "./InboxList";
import MessageReader from "./MessageReader";
import { INBOX_TTL_MINUTES, EXTEND_MINUTES } from "../config.js";

export default function ActiveInbox({
    inbox,
    onDestroy,
    onExtend,
    onRefresh,
    canExtend = true,
    busy = null,
    actionError = null,
    messages = [],
    activeMessage = null,
    onSelectMessage,
    onBack,
    onGenerateEmail,
}) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const intervalId = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(intervalId);
    }, []);

    const percentage = useMemo(() => {
        if (!inbox.expiresAt) return 100;

        const expiryTimestamp = new Date(inbox.expiresAt).getTime();
        if (Number.isNaN(expiryTimestamp)) return 100;

        const createdTimestamp = new Date(inbox.createdAt ?? "").getTime();
        const fallbackMs =
            (INBOX_TTL_MINUTES + (inbox.extendCount ?? 0) * EXTEND_MINUTES) *
            60_000;
        const totalDurationMs = Number.isNaN(createdTimestamp)
            ? fallbackMs
            : Math.max(1, expiryTimestamp - createdTimestamp);

        const msRemaining = Math.max(0, expiryTimestamp - now);
        const calcPercentage = (msRemaining / totalDurationMs) * 100;
        return Math.min(100, Math.max(0, calcPercentage));
    }, [inbox.expiresAt, inbox.createdAt, inbox.extendCount, now]);

    const isDanger = percentage <= 30;
    const extending = busy === "extending";
    const refreshing = busy === "refreshing";
    const destroying = busy === "destroying";
    // useInbox serialises extend/refresh/destroy behind one lock, so a click
    // on a second action while one is in flight would silently do nothing.
    // Disable all three together to match.
    const anyBusy = busy !== null;
    const extendLabel = `+ Extend ${EXTEND_MINUTES}m`;

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 mt-4 animate-in fade-in duration-500 text-left">
            {/* Status Pill */}
            <div className="flex justify-center mb-2">
                <div className="flex items-center gap-2 text-[11px] font-mono tracking-wide text-gray-700 bg-surface border border-line px-3 py-1.5 rounded-full shadow-sm">
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

                    <button
                        type="button"
                        onClick={onExtend}
                        disabled={!canExtend || anyBusy}
                        title={
                            canExtend
                                ? undefined
                                : "This inbox cannot be extended any further."
                        }
                        className="text-[11px] font-medium text-muted hover:text-ink transition-colors border border-line-cool rounded px-2 py-1 bg-canvas disabled:opacity-50 disabled:cursor-not-allowed">
                        {extending ? "Extending…" : extendLabel}
                    </button>
                </div>
            </Card>

            {/* Address Card */}
            <Card className="p-6 sm:p-8 shadow-sm">
                <p className="text-[11px] font-bold tracking-widest text-muted mb-4">
                    Active Inbound Address
                </p>
                <AddressBar address={inbox.address} />
            </Card>

            {/* Both branches carry a "Destroy Inbox" control, so they are mutually exclusive. */}
            {activeMessage ? (
                <MessageReader
                    message={activeMessage}
                    inboxAddress={inbox.address}
                    onBack={onBack}
                    onGenerateEmail={onGenerateEmail}
                    onDestroy={onDestroy}
                />
            ) : (
                <div className="mt-8 flex flex-col">
                    <div className="flex flex-wrap items-center justify-end gap-4 mb-4 px-2">
                        <Button
                            onClick={onGenerateEmail}
                            aria-label="Generate new temporary email"
                            className="flex items-center gap-1.5">
                            Generate Email
                        </Button>
                        <div className="flex items-center gap-4 text-[13px] font-medium">
                            <Button
                                variant="chip"
                                onClick={onRefresh}
                                disabled={anyBusy}
                                className="text-muted hover:text-ink flex items-center gap-1.5 transition-colors">
                                ↻ {refreshing ? "Refreshing…" : "Refresh"}
                            </Button>
                            <Button
                                variant="chip"
                                onClick={onExtend}
                                disabled={!canExtend || anyBusy}
                                title={
                                    canExtend
                                        ? undefined
                                        : "This inbox cannot be extended any further."
                                }
                                className="text-muted hover:text-ink flex items-center gap-1.5 transition-colors">
                                {extending ? "Extending…" : extendLabel}
                            </Button>
                            <Button
                                variant="chip"
                                onClick={onDestroy}
                                disabled={anyBusy}
                                className="text-danger hover:border-danger hover:bg-red-100 hover:opacity-80 flex items-center gap-1.5 transition-colors border border-danger/20  px-2 py-1 rounded">
                                <span className="text-base leading-none">
                                    <img
                                        className="w-[10.667px] h-3"
                                        src="/trash-1.png"
                                        alt=""
                                    />
                                </span>{" "}
                                {destroying ? "Destroying…" : "Destroy Inbox"}
                            </Button>
                        </div>
                    </div>

                    {actionError && (
                        <p
                            role="alert"
                            className="mb-4 px-2 text-[13px] text-danger">
                            {actionError.message}
                        </p>
                    )}

                    <InboxList
                        messages={messages}
                        onSelectMessage={onSelectMessage}
                    />
                </div>
            )}
        </div>
    );
}
