import { Moon } from "./icons/icons";
import Button from "./ui/Button";

export default function Header() {
    return (
        <header className="border-b border-line bg-header">
            <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-3">
                <a href="/" className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-black" />
                    <span className="text-base font-semibold tracking-[-0.4px] text-ink">
                        Inbound
                    </span>
                </a>

                <div className="flex items-center gap-2">
                    <Button>
                        Generate Email &nbsp;
                        <kbd
                            aria-hidden="true"
                            className="rounded-[2px] border border-line-cool bg-[#191c1d] px-[5px] py-px font-mono text-xs leading-4 text-white">
                            G
                        </kbd>
                    </Button>

                    {/* <div className="border-l border-line-cool pl-[13px]"> */}

                    <Button
                        variant="secondary"
                        aria-label="Toggle dark mode"
                        className="rounded-[2px] p-1.5 text-ink transition-colors hover:bg-line/60">
                        <Moon className="" />
                    </Button>
                    {/* </div> */}
                </div>
            </div>
        </header>
    );
}
