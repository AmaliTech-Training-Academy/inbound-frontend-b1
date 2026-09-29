import { useEffect, useMemo, useState } from "react";
import Card from "./ui/Card";
import Countdown from "./Countdown";
import ProgressRing from "./ProgressRing";
import AddressBar from "./AddressBar";
import ConfirmDestroyDialog from "./ConfirmDestroyDialog";
import MessageList from "./MessageList";
import { useMessages } from "../state/useMessages.js";
import { INBOX_TTL_MINUTES, EXTEND_MINUTES } from "../config.js";

export default function ActiveInbox({
    inbox,
    onDestroy,
    onExtend,
    onRefresh,
    onSelectMessage,
    canExtend = true,
    busy = null,
    actionError = null,
}) {
    const [now, setNow] = useState(() => Date.now());

    // Live messages for this inbox. Owns its own socket, so unmounting on
    // expiry or destroy tears the connection down too.
    const { messages } = useMessages(inbox);

    // Messages opened in this tab. The socket's previews carry no read flag,
    // so "unread" is the server's word where it has one, and this otherwise.
    const [openedIds, setOpenedIds] = useState(() => new Set());

    // Destroying is permanent, so the button only asks; the dialog destroys.
    const [confirmingDestroy, setConfirmingDestroy] = useState(false);
    const isUnread = (message) =>
        !message.isRead && !openedIds.has(message.id);
    const unreadCount = messages.filter(isUnread).length;

    const openMessage = (message) => {
        setOpenedIds((prev) => new Set(prev).add(message.id));
        onSelectMessage?.(message);
    };

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
        <div className="w-full max-w-[976px] mx-auto flex flex-col gap-6 mt-4 animate-in fade-in duration-500 text-left">
            {/* Status Pill */}
            <div className="flex justify-center mb-2">
                <div className="flex items-center gap-2 text-[11px] font-mono tracking-wide text-gray-700 bg-surface border border-line px-3 py-1.5 rounded-full shadow-sm">
                    <span className="text-emerald-500 animate-pulse">●</span>
                    Ephemeral instance active · volatile memory allocation
                </div>
            </div>

            {/* Timer Card */}
            <Card className="flex items-center justify-between p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col gap-1">
                    <h2 className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">
                        Time until auto-destruct
                    </h2>

                    <div
                        className={`text-[56px] leading-none font-mono font-bold tracking-tighter mt-2 mb-2 transition-colors duration-500 ${isDanger ? "text-danger" : "text-ink"}`}>
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

            {/* Inbox Layout */}
            <div className="mt-8 flex flex-col">
                <div className="flex flex-wrap items-center justify-between mb-3 gap-4">
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-bold tracking-[-0.5px] text-gray-900">
                            Inbox
                        </h2>
                        <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 font-mono text-xs font-medium text-gray-600">
                            {messages.length}{" "}
                            {messages.length === 1 ? "message" : "messages"}
                        </span>
                        {unreadCount > 0 && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-700">
                                {unreadCount} unread
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <InboxAction onClick={onRefresh} disabled={anyBusy}>
                            <span aria-hidden="true">↻</span>
                            {refreshing ? "Refreshing…" : "Refresh"}
                        </InboxAction>
                        <InboxAction
                            onClick={onExtend}
                            disabled={!canExtend || anyBusy}
                            title={
                                canExtend
                                    ? undefined
                                    : "This inbox cannot be extended any further."
                            }
                            >
                            {extending ? "Extending…" : extendLabel}
                        </InboxAction>
                        <InboxAction
                            onClick={() => setConfirmingDestroy(true)}
                            disabled={anyBusy}
                            danger>
                            {destroying ? "Destroying…" : "Destroy Inbox"}
                        </InboxAction>
                    </div>
                </div>

                <ConfirmDestroyDialog
                    open={confirmingDestroy}
                    onCancel={() => setConfirmingDestroy(false)}
                    onConfirm={() => {
                        setConfirmingDestroy(false);
                        onDestroy?.();
                    }}
                />

                {actionError && (
                    <p
                        role="alert"
                        className="mb-4 px-2 text-[13px] text-danger">
                        {actionError.message}
                    </p>
                )}

                {messages.length > 0 ? (
                    <>
                        <MessageList
                            messages={messages}
                            onSelectMessage={openMessage}
                            isUnread={isUnread}
                            now={now}
                        />
                        <AutoExtractNote />
                    </>
                ) : (
                    /* Empty State Body */
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
                )}
            </div>
        </div>
    );
}

// The inbox's header actions, as the design draws them: white, a hairline
// border and a one-pixel shadow, with hover only deepening the border and
// tinting the fill. Destroy is the same button in red.
function InboxAction({ danger = false, children, ...props }) {
    return (
        <button
            type="button"
            className={`flex h-8 items-center gap-1.5 rounded-[6px] border bg-white px-3 text-xs font-medium shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-50 ${
                danger
                    ? "border-red-200 text-red-600 enabled:hover:border-red-300 enabled:hover:bg-red-50"
                    : "border-gray-200 text-gray-700 enabled:hover:border-gray-300 enabled:hover:bg-gray-50"
            }`}
            {...props}>
            {children}
        </button>
    );
}

// Explains the code extraction under the list, as in the design's inbox frame.
function AutoExtractNote() {
    return (
        <div className="mt-4 flex gap-4 rounded-[12px] border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-gray-200 bg-gray-50 text-sm text-gray-600">
                ⚿
            </span>
            <div>
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
                    Auto-Extract Verification Codes
                    <span className="rounded border border-gray-200 bg-gray-50 px-1.5 font-mono text-[10px] font-medium text-gray-500">
                        SMART OTP
                    </span>
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                    6-digit verification OTPs, security tokens, and magic links
                    are extracted automatically and pinned at the top of
                    incoming messages for one-click copying.
                </p>
            </div>
        </div>
    );
}
