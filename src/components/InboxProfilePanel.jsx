import { ArrowRightLeft, Check, Mail, Timer, X } from "lucide-react";
import Avatar from "./Avatar.jsx";
import CopyButton from "./CopyButton.jsx";
import { useNow } from "../state/useNow.js";
import { formatTimeLeft, isRunningOut } from "../utils/inboxProgress.js";

// The design's "Inbox profile" drawer, for the inbox chosen on the rail: who
// it is, how long it has left, and the way to switch to it.
export default function InboxProfilePanel({
    inbox,
    open,
    isCurrent,
    unread = 0,
    onClose,
    onSwitch,
}) {
    const now = useNow(1000);
    const localPart = inbox?.address.split("@")[0] ?? "";
    const ending = inbox ? isRunningOut(inbox, now) : false;

    return (
        <aside
            aria-label="Inbox profile"
            aria-hidden={!open}
            inert={!open}
            className={`hidden shrink-0 overflow-hidden border-l border-slate-200 bg-white transition-[width] duration-300 ease-out sm:block print:hidden ${
                open ? "w-80" : "w-0 border-l-0"
            }`}>
            <div className="flex h-full w-80 flex-col">
                {inbox && (
                    <>
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <span className="text-sm font-medium text-slate-900">Inbox profile</span>
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-700"
                                aria-label="Close profile panel">
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>

                        <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
                            <Avatar seed={inbox.address} size={72} animate="always" />
                            <p className="mt-4 max-w-full truncate text-base font-semibold text-slate-900">
                                {localPart}
                            </p>
                            <p className="mt-1 flex max-w-full items-center gap-1.5 text-xs text-slate-400">
                                <Mail size={12} aria-hidden="true" className="shrink-0" />
                                <span className="truncate">{inbox.address}</span>
                                <CopyButton text={inbox.address} size={12} />
                            </p>

                            {isCurrent ? (
                                <span className="mt-4 flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                                    <Check size={12} aria-hidden="true" />
                                    Currently viewing this inbox
                                </span>
                            ) : (
                                <span className="mt-4 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                                    {unread} unread message{unread === 1 ? "" : "s"}
                                </span>
                            )}

                            <p
                                className={`mt-3 flex items-center gap-1.5 text-xs tabular-nums ${
                                    ending ? "text-rose-600" : "text-slate-400"
                                }`}>
                                <Timer size={12} aria-hidden="true" />
                                {formatTimeLeft(inbox.expiresAt, now)} left
                            </p>
                        </div>

                        <div className="mt-auto border-t border-slate-100 px-5 py-4">
                            <button
                                type="button"
                                onClick={() => onSwitch?.(inbox.id)}
                                disabled={isCurrent}
                                className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                                    isCurrent
                                        ? "cursor-not-allowed bg-slate-100 text-slate-400"
                                        : "bg-slate-900 text-white hover:bg-slate-800"
                                }`}>
                                <ArrowRightLeft size={15} aria-hidden="true" />
                                {isCurrent ? "This is your current inbox" : `Switch to ${localPart}`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </aside>
    );
}
