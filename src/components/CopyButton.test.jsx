import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import CopyButton from "./CopyButton.jsx";

const ADDRESS = "copy-me@inbound.mail";

function stubClipboard(writeText) {
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

function WithFallback() {
    const ref = useRef(null);
    return (
        <p>
            <span ref={ref}>{ADDRESS}</span>
            <CopyButton text={ADDRESS} fallbackRef={ref} />
        </p>
    );
}

describe("CopyButton", () => {
    it("copies the text and says so, then settles back", async () => {
        vi.useFakeTimers();
        const writeText = vi.fn().mockResolvedValue();
        stubClipboard(writeText);
        render(<CopyButton text={ADDRESS} />);

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: `Copy ${ADDRESS}` }));
        });

        expect(writeText).toHaveBeenCalledWith(ADDRESS);
        expect(screen.getByRole("button")).toHaveAccessibleName(`${ADDRESS} copied to clipboard`);

        act(() => vi.advanceTimersByTime(1500));
        expect(screen.getByRole("button")).toHaveAccessibleName(`Copy ${ADDRESS}`);
    });

    it("does not let the click reach a clickable row around it", async () => {
        stubClipboard(vi.fn().mockResolvedValue());
        const onRowClick = vi.fn();
        render(
            <div onClick={onRowClick}>
                <CopyButton text={ADDRESS} />
            </div>,
        );

        await act(async () => {
            fireEvent.click(screen.getByRole("button"));
        });

        expect(onRowClick).not.toHaveBeenCalled();
    });

    it("selects the text for Ctrl+C when the clipboard is blocked", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        stubClipboard(vi.fn().mockRejectedValue(new Error("blocked")));
        render(<WithFallback />);

        await act(async () => {
            fireEvent.click(screen.getByRole("button"));
        });

        expect(screen.getByRole("button")).toHaveAccessibleName(
            `Could not copy ${ADDRESS} automatically; it is selected, press Ctrl+C`,
        );
        expect(window.getSelection().toString()).toBe(ADDRESS);
    });
});
