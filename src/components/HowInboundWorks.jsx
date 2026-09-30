import Card from "./ui/Card";
import { INBOX_TTL_MINUTES } from "../config.js";

export default function HowInboundWorks() {
    return (
        <div className="w-full max-w-5xl mx-auto mt-24 mb-16 text-left">
            <div className="mb-8 pl-2">
                <h2 className="text-[24px] leading-8 tracking-[-0.6px] font-semibold text-ink mb-1">
                    How Inbound Works
                </h2>
                <p className="text-gray-600 text-sm">
                    Engineered for absolute frictionlessness and mathematical
                    privacy.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4 text-muted">
                        <span className="text-xs font-mono font-medium">
                            01
                        </span>
                        <span>
                            <img
                                src="/bolt.png"
                                alt="bolt icon"
                                className="w-[13.333px] h-[16.667px]"
                            />
                        </span>
                    </div>
                    <h3 className="font-semibold text-[16px] leading-6 tracking-[-0.16px] text-ink mb-2">
                        Click Generate
                    </h3>
                    <p className="text-[#45464C] text-sm grow mb-6 leading-relaxed">
                        Ephemeral mailbox instance bound instantly in volatile
                        RAM. No account, password, or tracking cookie is ever
                        created — only this tab keeps the address, so closing
                        it forgets the inbox.
                    </p>
                    <div className="text-xs font-mono text-[#45464C] pt-4 border-t border-line-cool">
                        ● Allocation: &lt; 20ms
                    </div>
                </Card>

                <Card className="p-6 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4 text-muted">
                        <span className="text-xs font-mono font-medium">
                            02
                        </span>
                        <span>
                            <img
                                src="/email.png"
                                className="w-[16.667px] h-3.75"
                                alt=""
                            />
                        </span>
                    </div>
                    <h3 className="text-[16px] leading-6 tracking-[-0.16px] font-semibold text-ink mb-2">
                        Receive OTPs & Links
                    </h3>
                    <p className="text-[#45464C] text-sm grow mb-6 leading-relaxed">
                        Real-time WebSocket streaming with 1-click verification
                        code extraction. View plain-text safely without
                        rendering external trackers.
                    </p>
                    <div className="text-xs font-mono text-[#45464C] pt-4 border-t border-line-cool">
                        ● Streaming: End-to-end TLS
                    </div>
                </Card>

                <Card className="p-6 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4 text-muted">
                        <span className="text-xs text-[#BB0112] font-mono font-medium">
                            03
                        </span>
                        <span className="text-[#BB0112]">
                            <img src="/trash-2.svg" alt="trash icon" />
                        </span>
                    </div>
                    <h3 className="font-semibold text-[16px] leading-6 tracking-[-0.16px] text-ink mb-2">
                        Auto-Shred & Purge
                    </h3>
                    <p className="text-[#45464C] text-sm grow mb-6 leading-relaxed">
                        Permanent cryptographic zeroization after{" "}
                        {INBOX_TTL_MINUTES} minutes or instantly via manual
                        destruction. The entire namespace is recycled.
                    </p>
                    <div className="text-xs font-mono text-danger pt-4 border-t border-line-cool">
                        ● Purge: Unrecoverable
                    </div>
                </Card>
            </div>
        </div>
    );
}
