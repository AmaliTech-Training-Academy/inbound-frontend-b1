import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Plus, X } from "lucide-react";
import Avatar from "./Avatar.jsx";
import CopyButton from "./CopyButton.jsx";

// The design's "New temporary inbox" modal, one inbox at a time: generate an
// address for this session, copy it, and carry on. The new inbox is already
// the open one behind the dialog by the time it shows here.
//
// Mounted only while open, so every opening starts from a clean slate.
export default function NewInboxDialog({
    onClose,
    onCreate,
    // How many inboxes the session holds, and the most it may.
    count = 0,
    limit = Infinity,
    // Why the last add failed, in the server's words when it gave any.
    errorMessage = null,
}) {
    const full = count >= limit;
    const [latest, setLatest] = useState(null);
    const [running, setRunning] = useState(false);
    const [failed, setFailed] = useState(false);
    const generateRef = useRef(null);
    const doneRef = useRef(null);
    const closeRef = useRef(null);
    const addressRef = useRef(null);

    // A request still in flight when the dialog closes must not write into it.
    const mounted = useRef(false);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    // Focus follows the step: Generate first, then Done once there is an
    // address. A full session has nothing to generate, so Close takes it.
    const opensFull = useRef(full);
    useEffect(() => {
        (latest ? doneRef : opensFull.current ? closeRef : generateRef).current?.focus();
    }, [latest]);

    const generate = async () => {
        if (running || full) return;
        setRunning(true);
        setFailed(false);
        const created = await onCreate();
        if (!mounted.current) return;
        if (created) setLatest(created.address);
        else setFailed(true);
        setRunning(false);
    };

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-inbox-title"
            aria-describedby="new-inbox-body"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
            <div aria-hidden="true" className="absolute inset-0 bg-slate-900/30" onClick={onClose} />

            <div className="relative w-full min-w-0 max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
                <div className="flex items-start justify-between gap-4">
                    <h2 id="new-inbox-title" className="text-lg font-semibold text-slate-900">
                        New temporary inbox
                    </h2>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        className="-mr-1 -mt-1 shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Close">
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>
                <p id="new-inbox-body" className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    One more disposable address for this session. It works as its own inbox and
                    expires on its own.
                </p>
                {Number.isFinite(limit) && (
                    <p className="mt-3 text-xs tabular-nums text-slate-400">
                        {count} of {limit} inboxes in this session
                    </p>
                )}
                {full && (
                    <p role="status" className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        This session holds the most inboxes it can. One frees up when an inbox
                        expires.
                    </p>
                )}

                {latest ? (
                    <div key={latest} className="mt-6 animate-fade-up">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                            Your new address
                        </p>
                        <div className="mt-2 flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-2">
                            <Avatar seed={latest} size={28} />
                            <span
                                ref={addressRef}
                                className="min-w-0 flex-1 truncate font-mono text-sm text-slate-800"
                                title={latest}>
                                {latest}
                            </span>
                            <CopyButton text={latest} fallbackRef={addressRef} className="p-2" />
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={generate}
                                disabled={running || full}
                                className="flex items-center justify-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 enabled:hover:bg-slate-50 disabled:opacity-60">
                                {running ? (
                                    <Loader2 size={14} aria-hidden="true" className="animate-spin" />
                                ) : (
                                    <Plus size={14} aria-hidden="true" />
                                )}
                                {running ? "Generating…" : "Generate another"}
                            </button>
                            <button
                                ref={doneRef}
                                type="button"
                                onClick={onClose}
                                className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        ref={generateRef}
                        type="button"
                        onClick={generate}
                        disabled={running || full}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 py-3 text-sm font-medium text-white enabled:hover:bg-slate-800 disabled:opacity-70">
                        {running ? (
                            <Loader2 size={15} aria-hidden="true" className="animate-spin" />
                        ) : (
                            <Plus size={15} aria-hidden="true" />
                        )}
                        {running ? "Generating…" : "Generate inbox"}
                    </button>
                )}

                {failed && (
                    <p role="alert" className="mt-3 text-center text-sm text-rose-600">
                        {errorMessage || "Could not add an inbox. Try again."}
                    </p>
                )}
            </div>
        </div>,
        document.body,
    );
}
