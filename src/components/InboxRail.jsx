import { Plus } from "lucide-react";
import Avatar from "./Avatar.jsx";
import { useNow } from "../hooks/useNow.js";
import { formatTimeLeft, isRunningOut } from "../utils/inboxProgress.js";

// The session's inboxes as the design's avatar rail: + for a new one, then a
// blob per inbox with its unread count, the open one ringed. Upright down the
// right edge on wide screens; a strip that scrolls sideways where there is no
// room for it.
//
// `onOpen` is what choosing an inbox does: both the rail and the strip switch
// straight to it, in one click.
export default function InboxRail({
    inboxes = [],
    activeId,
    onOpen,
    onAdd,
    canAdd = true,
    adding = false,
    unreadCounts = {},
    orientation = "vertical",
    label = "Inboxes",
    // The session's inbox cap, when it has reached it, so + can say why it is off.
    limit = null,
    className = "",
}) {
    // Its own clock, so every avatar's time left stays true without the page
    // re-rendering around it.
    const now = useNow(1000);
    const vertical = orientation === "vertical";
    // A little larger down the wide-screen rail, where there is room and the
    // blobs' motion should read; the strip keeps to its narrow row.
    const avatarSize = vertical ? 40 : 32;
    const full = limit !== null && inboxes.length >= limit;
    const addLabel = adding
        ? "Adding an inbox"
        : full
          ? `Inbox limit reached: ${inboxes.length} of ${limit}`
          : "New temporary inbox";

    return (
        <nav
            aria-label={label}
            className={`${
                vertical
                    ? "flex-col items-center gap-3 py-5"
                    : "items-center gap-3 overflow-x-auto px-4 py-2 sm:px-5"
            } flex ${className}`}>
            <button
                type="button"
                onClick={onAdd}
                disabled={!canAdd}
                aria-label={addLabel}
                title={addLabel}
                className={`flex ${vertical ? "size-10" : "size-8"} shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 transition-colors enabled:hover:border-slate-400 enabled:hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-line-dark dark:text-body-dark dark:enabled:hover:border-slate-500 dark:enabled:hover:text-ink-dark`}>
                <Plus size={15} aria-hidden="true" className={adding ? "animate-pulse" : ""} />
            </button>

            {inboxes.map((inbox) => {
                const active = inbox.id === activeId;
                const unread = unreadCounts[inbox.id] ?? 0;
                const ending = isRunningOut(inbox, now);
                const left = formatTimeLeft(inbox.expiresAt, now);

                return (
                    <button
                        key={inbox.id}
                        type="button"
                        onClick={() => onOpen?.(inbox.id)}
                        aria-current={active ? "true" : undefined}
                        aria-label={`${inbox.address}${unread > 0 ? `, ${unread} unread` : ""}${
                            active ? ", open" : ""
                        }, ${left} left`}
                        title={`${inbox.address} · ${left} left`}
                        className={`relative shrink-0 rounded-full transition-shadow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900 dark:ring-offset-canvas-dark dark:focus-visible:outline-ink-dark ${
                            active
                                ? `ring-2 ring-offset-2 ${ending ? "ring-rose-500" : "ring-slate-900 dark:ring-ink-dark"}`
                                : "hover:ring-2 hover:ring-slate-200 hover:ring-offset-2 dark:hover:ring-line-dark"
                        }`}>
                        <Avatar seed={inbox.address} size={avatarSize} animate="always" />
                        {unread > 0 && (
                            <span
                                aria-hidden="true"
                                className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[9px] font-semibold text-white ring-2 ring-white dark:bg-sky-500 dark:ring-canvas-dark">
                                {unread > 99 ? "99+" : unread}
                            </span>
                        )}
                        {ending && !active && (
                            <span
                                aria-hidden="true"
                                className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-canvas-dark"
                            />
                        )}
                    </button>
                );
            })}
        </nav>
    );
}
