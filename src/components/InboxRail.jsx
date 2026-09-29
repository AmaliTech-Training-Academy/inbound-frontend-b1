import { useEffect, useRef, useState } from "react";
import { inboxProgress, isRunningOut } from "../utils/inboxProgress.js";
import { CheckThick, Copy } from "./icons/icons.jsx";

function timeLeft(expiresAt, now) {
    const end = new Date(expiresAt).getTime();
    const seconds = Number.isNaN(end) ? 0 : Math.max(0, Math.floor((end - now) / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

// The session's inboxes, one row each: which is open, its address, how long
// it has left (as a countdown and a draining bar) and how much unread mail it
// holds, with a copy button on hover. + adds one more to the session. A
// column on wide screens, a horizontal strip on narrow ones.
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
            className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-20 lg:self-start">
            <div className="px-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    Inboxes
                    <span className="ml-1.5 font-mono font-medium normal-case tracking-normal">
                        {inboxes.length}
                    </span>
                </p>
                {inboxes.length > 1 && (
                    <p className="mt-0.5 text-[11px] leading-4 text-gray-400">
                        Each inbox expires on its own.
                    </p>
                )}
            </div>

            {/* On narrow screens a strip that scrolls within itself, one card at a time. */}
            <ul className="m-0 flex snap-x snap-mandatory list-none gap-2 overflow-x-auto p-0 pb-1 lg:snap-none lg:flex-col lg:overflow-visible lg:pb-0">
                {inboxes.map((inbox) => (
                    <RailRow
                        key={inbox.id}
                        inbox={inbox}
                        active={inbox.id === activeId}
                        unread={unreadCounts[inbox.id] ?? 0}
                        now={now}
                        onSelect={onSelect}
                    />
                ))}

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

function RailRow({ inbox, active, unread, now, onSelect }) {
    const localPart = inbox.address.split("@")[0];
    // The timer card's rule, so a row and its card turn red together.
    const ending = isRunningOut(inbox, now);
    const percent = inboxProgress(inbox, now);

    // On a phone the rail is a strip wider than the screen, so the open inbox
    // - a new one lands at the end - is scrolled into view when it changes.
    // inline "start" lands on the strip's snap points (inline "nearest" stops
    // between them and the snap pulls the row half out of view again); block
    // "nearest" leaves the page itself where it is.
    const rowRef = useRef(null);
    useEffect(() => {
        if (active) {
            rowRef.current?.scrollIntoView?.({ block: "nearest", inline: "start" });
        }
    }, [active]);

    return (
        // The row selects; the copy button sits over its corner as a sibling,
        // since a button cannot hold another button.
        <li ref={rowRef} className="group relative shrink-0 snap-start lg:shrink">
            <button
                type="button"
                onClick={() => onSelect?.(inbox.id)}
                aria-current={active ? "true" : undefined}
                aria-label={`${inbox.address}${unread > 0 ? `, ${unread} unread` : ""}${
                    active ? ", open" : ""
                }`}
                className={`flex w-full min-w-48 flex-col gap-2 rounded-[10px] border px-3 pb-2.5 pt-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${
                    active
                        ? "border-gray-900 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                        : "border-gray-200 bg-white/60 hover:border-gray-300 hover:bg-white"
                }`}>
                {/* pr-8 keeps the whole line, badge included, clear of the
                    copy button over the row's corner. */}
                <span className="flex w-full items-center gap-2.5 pr-8">
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
                </span>

                {/* How much of its life is left, draining; red on the same
                    rule as the countdown. */}
                <span aria-hidden="true" className="block h-1 w-full overflow-hidden rounded-full bg-gray-100">
                    <span
                        className={`block h-full rounded-full transition-[width] duration-1000 ease-linear ${
                            ending ? "bg-red-600" : active ? "bg-gray-900" : "bg-gray-400"
                        }`}
                        style={{ width: `${percent}%` }}
                    />
                </span>
            </button>

            <RowCopy address={inbox.address} />
        </li>
    );
}

// Copies one inbox's address without opening it. Shown on hover, and on
// keyboard focus so it is never mouse-only.
function RowCopy({ address }) {
    const [state, setState] = useState("idle");
    const reset = useRef(null);
    useEffect(() => () => clearTimeout(reset.current), []);

    const copy = async () => {
        clearTimeout(reset.current);
        try {
            await navigator.clipboard.writeText(address);
            setState("copied");
        } catch (err) {
            console.error("[InboxRail] clipboard write failed", err);
            setState("failed");
        }
        reset.current = setTimeout(() => setState("idle"), 1500);
    };

    return (
        <button
            type="button"
            onClick={copy}
            aria-label={
                state === "copied"
                    ? `${address} copied to clipboard`
                    : state === "failed"
                      ? `Could not copy ${address}`
                      : `Copy ${address}`
            }
            title={
                state === "failed"
                    ? "Could not copy - open the inbox and copy from there"
                    : "Copy address"
            }
            className={`absolute right-2 top-2 grid size-7 place-items-center rounded-[6px] border bg-white transition focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-gray-900 group-hover:opacity-100 ${
                state === "idle"
                    ? "border-gray-200 text-gray-500 opacity-0 hover:border-gray-300 hover:text-gray-900"
                    : state === "copied"
                      ? "border-emerald-200 text-success opacity-100"
                      : "border-red-200 text-red-600 opacity-100"
            }`}>
            {state === "copied" ? <CheckThick /> : <Copy />}
        </button>
    );
}
