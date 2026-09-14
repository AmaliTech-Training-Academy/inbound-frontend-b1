import { Moon } from "./icons/icons";
import Button from "./ui/Button";

export default function Header() {
    return (
        <header className="border-b border-gray-300 flex w-full items-center justify-between px-6 py-3 border-line-cool">
            <div className="flex items-center gap-1.5 font-bold text-ink">
                <span className="text-[14px]">●</span>
                <span className="text-base tracking-tight">Inbound</span>
            </div>
            <div className="flex items-center gap-3">
                <Button>
                    Generate Email &nbsp;
                    {/* keyboard shortcut ... TODO later */}
                    {/* <kbd
                            aria-hidden="true"
                            className="rounded-[2px] border border-line-cool bg-[#191c1d] px-[5px] py-px font-mono text-xs leading-4 text-white">
                            G
                        </kbd> */}
                </Button>

                <Button
                    variant="secondary"
                    aria-label="Toggle dark mode"
                    className="rounded-xs p-1.5 text-ink transition-colors hover:bg-line/60">
                    <Moon className="" />
                </Button>
            </div>
        </header>
    );
}
