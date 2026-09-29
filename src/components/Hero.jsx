import { INBOX_TTL_MINUTES } from "../config.js";
import { ArrowRight, Check, Timer } from "./icons/icons.jsx";
import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";
import HowInboundWorks from "./HowInboundWorks.jsx";
import ActiveInbox from "./ActiveInbox.jsx";
import InboxRail from "./InboxRail.jsx";

// Inbox state is owned by App and passed in, so the header's Generate
// button drives the same inbox as this one.
export default function Hero({
    status,
    inbox,
    error,
    busy,
    regenerating,
    canExtend,
    generate,
    regenerate,
    destroy,
    extend,
    refresh,
    onSelectMessage,
    inboxes = [],
    activeId = null,
    select,
    addInbox,
    canAddInbox = true,
    adding = false,
    notice = null,
    messages = [],
    isUnread,
    unreadCounts = {},
}) {
    const creating = status === "creating";
    const active = status === "active" && inbox;

    return (
        // The ambient glow behind this section is the app-wide backdrop (see
        // .app-backdrop), so every screen shares it rather than just this one.
        <section id="generate" className="relative">
            <div
                className={`relative mx-auto flex flex-col items-center px-6 pb-12 pt-16 ${active ? "max-w-[1240px]" : "max-w-[976px]"}`}>
                {status !== "active" &&
                    status !== "loading" &&
                    status !== "expired" &&
                    !regenerating && (
                    <>
                        <h1 className="max-w-[56rem] text-center text-[clamp(2.5rem,6vw,4rem)] font-bold font-sans leading-[1.05] tracking-[-1.1px] text-ink">
                            Create a temporary email in seconds.
                        </h1>

                        <p className="mt-4 max-w-xl text-center text-base leading-6 tracking-[-0.08px] text-muted">
                            Protect your inbox with a disposable email address
                            for sign-ups, verification codes, and temporary
                            testing.
                        </p>
                    </>
                )}

                <div
                    className={`w-full ${active ? "" : "max-w-187.5 mt-8"}`}>
                    {status === "loading" ? (
                        <div aria-busy="true" className="h-11" />
                    ) : active ? (
                        <div className="grid gap-6 lg:grid-cols-[232px_minmax(0,976px)] lg:justify-center">
                            <InboxRail
                                inboxes={inboxes}
                                activeId={activeId}
                                onSelect={select}
                                onAdd={addInbox}
                                canAdd={canAddInbox}
                                adding={adding}
                                unreadCounts={unreadCounts}
                            />
                            <div className="min-w-0">
                                {notice && (
                                    <p
                                        role="status"
                                        className="mb-4 rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-2 text-center text-[13px] text-amber-800">
                                        {notice.addresses.map((address, index) => (
                                            <span key={address}>
                                                {index > 0 &&
                                                    (index === notice.addresses.length - 1
                                                        ? " and "
                                                        : ", ")}
                                                <span className="font-mono">{address}</span>
                                            </span>
                                        ))}{" "}
                                        expired.
                                        {notice.switched && " Switched to your next inbox."}
                                    </p>
                                )}
                                <ActiveInbox
                                    // A fresh screen per inbox, so its timers
                                    // and dialog never carry across a switch.
                                    key={inbox.id}
                                    inbox={inbox}
                                    messages={messages}
                                    isUnread={isUnread}
                                    otherInboxCount={Math.max(0, inboxes.length - 1)}
                                    onDestroy={destroy}
                                    onExtend={extend}
                                    onRefresh={refresh}
                                    onSelectMessage={onSelectMessage}
                                    canExtend={canExtend}
                                    busy={busy}
                                    actionError={error}
                                />
                            </div>
                        </div>
                    ) : status === "expired" || regenerating ? (
                        <Expired
                            onGenerate={regenerate}
                            creating={creating}
                        />
                    ) : (
                        <div className="flex flex-col items-center">
                            <Button
                                onClick={generate}
                                disabled={creating}
                                className="flex h-11 items-center justify-center gap-2 rounded-sm border border-black bg-ink px-6.25 text-base font-medium tracking-[-0.16px] text-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-opacity hover:opacity-90 disabled:opacity-55">
                                {creating
                                    ? "Generating\u2026"
                                    : "Generate temporary email"}
                                {!creating && <ArrowRight />}
                            </Button>

                            {status === "error" && (
                                <p
                                    role="alert"
                                    className="mt-4 max-w-105 text-center text-[13px] text-danger">
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
                    status !== "expired" &&
                    !regenerating && (
                        <>
                            <ul className="mt-6 flex flex-wrap items-center justify-center gap-6">
                                <li className="flex items-center gap-1.5 text-[13px] text-[#45464C]">
                                    <Check className="text-muted" />
                                    No signup required
                                </li>
                                <li className="flex items-center gap-1.5 text-[13px] text-[#45464C]">
                                    <Check className="text-muted" />
                                    No credit card
                                </li>
                                <li className="flex items-center gap-1.5 font-mono text-xs font-medium text-danger">
                                    <Timer className="text-danger" />
                                    Auto-destructs in {INBOX_TTL_MINUTES} min
                                </li>
                            </ul>

                            <HowInboundWorks />
                        </>
                    )}
            </div>
        </section>
    );
}

function Expired({ onGenerate, creating }) {
    return (
        <Card className="flex flex-col items-center gap-4 p-8 shadow-tile">
            <p className="font-mono text-xs tracking-wide text-danger">
                INBOX PURGED
            </p>
            <p className="max-w-105 text-center text-sm text-muted">
                This inbox expired. Its messages and attachments are
                unrecoverable.
            </p>
            <Button
                type="button"
                onClick={onGenerate}
                disabled={creating}
                className="flex h-11 items-center gap-2 rounded-sm border border-black bg-ink px-6.25 text-base font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-55">
                {creating ? "Generating…" : "Generate a new address"}
                {!creating && <ArrowRight />}
            </Button>
        </Card>
    );
}
