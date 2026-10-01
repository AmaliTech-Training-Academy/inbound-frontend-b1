import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddressBar from "./AddressBar.jsx";

const ADDRESS = "mock-abc123@inbound.dev";

// userEvent.setup() installs its own navigator.clipboard, so this must be
// called AFTER setup() or the stub is silently replaced and the test passes
// against userEvent's clipboard instead of ours.
function stubClipboard(impl) {
    Object.defineProperty(navigator, "clipboard", {
        value: { writeText: impl },
        configurable: true,
        writable: true,
    });
}

describe("AddressBar", () => {
    it("renders the address", () => {
        render(<AddressBar address={ADDRESS} />);
        expect(screen.getByText(ADDRESS)).toBeInTheDocument();
    });

    it("copies the address and confirms it", async () => {
        const user = userEvent.setup();
        const writeText = vi.fn().mockResolvedValue(undefined);
        stubClipboard(writeText);

        render(<AddressBar address={ADDRESS} />);
        await user.click(screen.getByRole("button", { name: /copy/i }));

        expect(writeText).toHaveBeenCalledWith(ADDRESS);
        expect(await screen.findByText("Copied")).toBeInTheDocument();
    });

    it("announces the copied state to screen readers", async () => {
        const user = userEvent.setup();
        stubClipboard(vi.fn().mockResolvedValue(undefined));

        render(<AddressBar address={ADDRESS} />);
        await user.click(screen.getByRole("button", { name: `Copy ${ADDRESS}` }));

        await waitFor(() =>
            expect(
                screen.getByRole("button", {
                    name: `${ADDRESS} copied to clipboard`,
                }),
            ).toBeInTheDocument(),
        );
    });

    it("falls back to a selection hint when the clipboard is blocked", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const user = userEvent.setup();
        stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));

        render(<AddressBar address={ADDRESS} />);
        await user.click(screen.getByRole("button", { name: /copy/i }));

        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent(/press ctrl\+c/i);
        // Prince's review: the real reason must reach the console.
        expect(spy).toHaveBeenCalledWith(
            "[AddressBar] clipboard write failed",
            expect.any(Error),
        );
    });

    it("shows no failure alert before any interaction", () => {
        render(<AddressBar address={ADDRESS} />);
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
