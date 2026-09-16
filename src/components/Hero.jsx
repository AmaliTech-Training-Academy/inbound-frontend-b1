import { useInbox } from "../state/useInbox.js";
import { INBOX_TTL_MINUTES } from "../config.js";
import { ArrowRight, Check, Timer } from "./icons/icons.jsx";
import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";
import HowInboundWorks from "./HowInboundWorks.jsx";
import ActiveInbox from "./ActiveInbox.jsx";

export default function Hero() {
    const {
        status,
        inbox,
        error,
        busy,
        canExtend,
        generate,
        reset,
        destroy,
        extend,
        refresh,
    } = useInbox();
    const creating = status === "creating";

    return (
        <section id="generate" className="relative overflow-hidden">
            <div aria-hidden="true" className="absolute inset-0 hero-wash" />
            <div aria-hidden="true" className="absolute inset-0 dot-grid" />

            <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pb-12 pt-16">
                {status !== "active" && status !== "expired" && (
                    <>
                        <h1 className="max-w-2xl text-center text-[clamp(2.5rem,6vw,4rem)] font-bold font-sans leading-[1.05] tracking-[-1.1px] text-ink">
                            Create a temporary email in seconds.
                        </h1>

                        <p className="mt-4 max-w-xl text-center text-base leading-6 tracking-[-0.08px] text-[#45464C]">
                            Protect your inbox with a disposable email address
                            for sign-ups, verification codes, and temporary
                            testing.
                        </p>
                    </>
                )}

                <div
                    className={`w-full ${status === "active" ? "max-w-4xl" : "max-w-187.5 mt-8"}`}>
                    {status === "loading" ? (
                        <div aria-busy="true" className="h-11" />
                    ) : status === "active" && inbox ? (
                        <ActiveInbox
                            inbox={inbox}
                            onDestroy={destroy}
                            onExtend={extend}
                            onRefresh={refresh}
                            canExtend={canExtend}
                            busy={busy}
                            actionError={error}
                        />
                    ) : status === "expired" ? (
                        <Expired onReset={reset} />
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
                    status !== "expired" && (
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

function Expired({ onReset }) {
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
                onClick={onReset}
                className="flex h-11 items-center gap-2 rounded-sm border border-black bg-ink px-6.25 text-base font-medium text-white transition-opacity hover:opacity-90">
                Generate a new address
                <ArrowRight />
            </Button>
        </Card>
    );
}
