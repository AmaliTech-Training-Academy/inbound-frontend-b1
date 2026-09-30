// Account-switcher style control for the session's inboxes. Purely local: every
// inbox is already live server-side, so switching is a selection, not a request.

import { useEffect, useRef, useState } from "react";
import Button from "./ui/Button";
import { ChevronDown, Dot, Plus } from "./icons/icons.jsx";

function formatRemaining(expiresAt, now) {
    const total = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - now) / 1000),
    );
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const pad = (value) => String(value).padStart(2, "0");

    return hours > 0
        ? `${hours}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(minutes)}:${pad(seconds)}`;
}

export default function InboxSwitcher({
    inboxes = [],
    activeId,
    onSwitch,
    onGenerate,
    disabled = false,
}) {
    const [open, setOpen] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const rootRef = useRef(null);

    // Ticks only while open: a closed switcher should not re-render every second.
    useEffect(() => {
        if (!open) return;

        const intervalId = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(intervalId);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const closeOnOutside = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("pointerdown", closeOnOutside);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeOnOutside);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [open]);

    // With one inbox there is nothing to switch between; the header's own
    // Generate button is the way to add a second.
    if (inboxes.length < 2) return null;

    const active = inboxes.find((inbox) => inbox.id === activeId);

    return (
        <div ref={rootRef} className="relative">
            <Button
                variant="light"
                onClick={() => {
                    setNow(Date.now());
                    setOpen((wasOpen) => !wasOpen);
                }}
                disabled={disabled}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Switch inbox, currently ${active?.address ?? "none"}`}
                className="font-mono">
                <Dot className="text-success" />
                <span className="max-w-[180px] truncate">
                    {active?.address ?? "No inbox"}
                </span>
                <ChevronDown />
            </Button>

            {open && (
                <div
                    role="menu"
                    aria-label="Temporary inboxes"
                    className="absolute right-0 z-30 mt-2 w-80 rounded-[10px] border border-line bg-surface p-1.5 shadow-lg">
                    {inboxes.map((inbox) => {
                        const isActive = inbox.id === activeId;

                        return (
                            <button
                                key={inbox.id}
                                type="button"
                                role="menuitemradio"
                                aria-checked={isActive}
                                onClick={() => {
                                    setOpen(false);
                                    if (!isActive) onSwitch?.(inbox.id);
                                }}
                                className="flex w-full cursor-pointer items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left transition-colors hover:bg-page">
                                <Dot
                                    className={
                                        isActive
                                            ? "text-success"
                                            : "text-text-tertiary"
                                    }
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-mono text-xs text-ink">
                                        {inbox.address}
                                    </span>
                                    <span className="block font-mono text-[11px] text-muted">
                                        {formatRemaining(
                                            inbox.expiresAt,
                                            now,
                                        )}{" "}
                                        left
                                    </span>
                                </span>
                                {isActive && (
                                    <span className="shrink-0 font-mono text-[10px] tracking-wide text-muted uppercase">
                                        Active
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    <div className="my-1 border-t border-line" />

                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false);
                            onGenerate?.();
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-xs font-medium text-ink transition-colors hover:bg-page">
                        <Plus />
                        <span>New inbox</span>
                    </button>
                </div>
            )}
        </div>
    );
}
