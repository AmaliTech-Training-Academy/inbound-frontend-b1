import { useEffect, useState } from "react";
import { msRemaining } from "../state/inboxStorage.js";

function timeLeft(expiresAt, now) {
    const end = new Date(expiresAt).getTime();
    const seconds = Number.isNaN(end) ? 0 : Math.max(0, Math.floor((end - now) / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

// The session's inboxes, one row each: which is open, its address, how long
// it has left and how much unread mail it holds. + adds one more to the
// session. A column on wide screens, a horizontal strip on narrow ones.
export default function InboxRail({
    inboxes = [],
    activeId,
    onSelect,
    onAdd,
    canAdd = true,
    adding = false,
    unreadCounts = {},
}) {
    // Its own clock, so every row's countdown ticks without the page
    // re-rendering around it.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <nav
            aria-label="Inboxes"
            className="flex flex-col gap-2 lg:sticky lg:top-20 lg:self-start">
            <p className="px-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                Inboxes
                <span className="ml-1.5 font-mono font-medium normal-case tracking-normal">
                    {inboxes.length}
                </span>
            </p>

            <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0 lg:flex-col lg:overflow-visible">
                {inboxes.map((inbox) => {
                    const active = inbox.id === activeId;
                    const unread = unreadCounts[inbox.id] ?? 0;
                    const localPart = inbox.address.split("@")[0];
                    const ending = msRemaining(inbox.expiresAt) <= 60_000;

                    return (
                        <li key={inbox.id} className="shrink-0 lg:shrink">
                            <button
                                type="button"
                                onClick={() => onSelect?.(inbox.id)}
                                aria-current={active ? "true" : undefined}
                                aria-label={`${inbox.address}${
                                    unread > 0 ? `, ${unread} unread` : ""
                                }${active ? ", open" : ""}`}
                                className={`flex w-full min-w-44 items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${
                                    active
                                        ? "border-gray-900 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                                        : "border-gray-200 bg-white/60 hover:border-gray-300 hover:bg-white"
                                }`}>
                                <span
                                    aria-hidden="true"
                                    className={`size-2 shrink-0 rounded-full ${
                                        active ? "bg-gray-950" : "border border-gray-300"
                                    }`}
                                />
                                <span className="min-w-0 flex-1">
                                    <span
                                        className={`block truncate font-mono text-[13px] ${
                                            active ? "font-semibold text-gray-950" : "text-gray-700"
                                        }`}
                                        title={inbox.address}>
                                        {localPart}
                                    </span>
                                    <span
                                        className={`block font-mono text-[11px] tabular-nums ${
                                            ending ? "text-red-600" : "text-gray-400"
                                        }`}>
                                        {timeLeft(inbox.expiresAt, now)} left
                                    </span>
                                </span>
                                {unread > 0 && (
                                    <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700">
                                        {unread} new
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })}

                <li className="shrink-0 lg:shrink">
                    <button
                        type="button"
                        onClick={onAdd}
                        disabled={!canAdd}
                        className="flex h-full w-full min-w-36 items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-gray-300 px-3 py-2.5 text-xs font-medium text-gray-600 transition-colors enabled:hover:border-gray-400 enabled:hover:bg-white enabled:hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-50">
                        {adding ? "Adding…" : "+ New inbox"}
                    </button>
                </li>
            </ul>
        </nav>
    );
}
