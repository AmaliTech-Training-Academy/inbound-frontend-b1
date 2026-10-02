import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewInboxDialog from "./NewInboxDialog.jsx";

const dialog = () => screen.getByRole("dialog", { name: "New temporary inbox" });

function renderDialog(onCreate = vi.fn(), onClose = vi.fn()) {
    render(<NewInboxDialog onCreate={onCreate} onClose={onClose} />);
    return { onCreate, onClose };
}

describe("NewInboxDialog", () => {
    it("starts on Generate, with focus there", () => {
        renderDialog();

        expect(within(dialog()).getByRole("button", { name: "Generate inbox" })).toHaveFocus();
    });

    it("makes one inbox per click and shows its address to copy", async () => {
        const user = userEvent.setup();
        const { onCreate } = renderDialog(vi.fn().mockResolvedValue({ address: "one@inbound.mail" }));

        await user.click(within(dialog()).getByRole("button", { name: "Generate inbox" }));

        expect(onCreate).toHaveBeenCalledTimes(1);
        expect(within(dialog()).getByText("one@inbound.mail")).toBeInTheDocument();
        expect(
            within(dialog()).getByRole("button", { name: "Copy one@inbound.mail" }),
        ).toBeInTheDocument();
        expect(within(dialog()).getByRole("button", { name: "Done" })).toHaveFocus();
    });

    it("makes another on request, and shows the newest", async () => {
        const user = userEvent.setup();
        const onCreate = vi
            .fn()
            .mockResolvedValueOnce({ address: "one@inbound.mail" })
            .mockResolvedValueOnce({ address: "two@inbound.mail" });
        renderDialog(onCreate);

        await user.click(within(dialog()).getByRole("button", { name: "Generate inbox" }));
        await user.click(within(dialog()).getByRole("button", { name: "Generate another" }));

        expect(onCreate).toHaveBeenCalledTimes(2);
        expect(within(dialog()).getByText("two@inbound.mail")).toBeInTheDocument();
        expect(within(dialog()).queryByText("one@inbound.mail")).toBeNull();
    });

    it("takes one request at a time", async () => {
        const user = userEvent.setup();
        let finish;
        const onCreate = vi.fn(() => new Promise((resolve) => (finish = resolve)));
        renderDialog(onCreate);

        await user.click(within(dialog()).getByRole("button", { name: "Generate inbox" }));

        const busy = within(dialog()).getByRole("button", { name: "Generating…" });
        expect(busy).toBeDisabled();
        await user.click(busy);
        expect(onCreate).toHaveBeenCalledTimes(1);

        finish({ address: "one@inbound.mail" });
        expect(await within(dialog()).findByText("one@inbound.mail")).toBeInTheDocument();
    });

    it("says so when no inbox could be made", async () => {
        const user = userEvent.setup();
        renderDialog(vi.fn().mockResolvedValue(null));

        await user.click(within(dialog()).getByRole("button", { name: "Generate inbox" }));

        expect(within(dialog()).getByRole("alert")).toHaveTextContent(
            "Could not add an inbox. Try again.",
        );
    });

    it("counts the session's inboxes against its cap", () => {
        render(<NewInboxDialog onCreate={vi.fn()} onClose={vi.fn()} count={2} limit={5} />);

        expect(within(dialog()).getByText("2 of 5 inboxes in this session")).toBeInTheDocument();
        expect(within(dialog()).getByRole("button", { name: "Generate inbox" })).toBeEnabled();
    });

    it("makes nothing once the session is full, and says why", async () => {
        const user = userEvent.setup();
        const onCreate = vi.fn();
        render(<NewInboxDialog onCreate={onCreate} onClose={vi.fn()} count={5} limit={5} />);

        const generate = within(dialog()).getByRole("button", { name: "Generate inbox" });
        expect(generate).toBeDisabled();
        expect(within(dialog()).getByRole("status")).toHaveTextContent(
            "This session holds the most inboxes it can.",
        );
        // Nothing to generate, so focus starts where the way out is.
        expect(within(dialog()).getByRole("button", { name: "Close" })).toHaveFocus();

        await user.click(generate);
        expect(onCreate).not.toHaveBeenCalled();
    });

    it("stops offering another once the new one fills the session", async () => {
        const user = userEvent.setup();
        const onCreate = vi.fn().mockResolvedValue({ address: "last@inbound.mail" });
        const { rerender } = render(
            <NewInboxDialog onCreate={onCreate} onClose={vi.fn()} count={4} limit={5} />,
        );

        await user.click(within(dialog()).getByRole("button", { name: "Generate inbox" }));
        // The page re-renders with the session's new count.
        rerender(<NewInboxDialog onCreate={onCreate} onClose={vi.fn()} count={5} limit={5} />);

        expect(within(dialog()).getByText("last@inbound.mail")).toBeInTheDocument();
        expect(within(dialog()).getByRole("button", { name: "Generate another" })).toBeDisabled();
    });

    it("gives the server's reason when an add is refused", async () => {
        const user = userEvent.setup();
        render(
            <NewInboxDialog
                onCreate={vi.fn().mockResolvedValue(null)}
                onClose={vi.fn()}
                errorMessage="Too many requests from this IP, please try again later."
            />,
        );

        await user.click(within(dialog()).getByRole("button", { name: "Generate inbox" }));

        expect(within(dialog()).getByRole("alert")).toHaveTextContent(
            "Too many requests from this IP, please try again later.",
        );
    });

    it("closes from Done, the close button and escape", async () => {
        const user = userEvent.setup();
        const { onClose } = renderDialog(vi.fn().mockResolvedValue({ address: "one@inbound.mail" }));

        await user.click(within(dialog()).getByRole("button", { name: "Close" }));
        await user.keyboard("{Escape}");
        await user.click(within(dialog()).getByRole("button", { name: "Generate inbox" }));
        await user.click(within(dialog()).getByRole("button", { name: "Done" }));

        expect(onClose).toHaveBeenCalledTimes(3);
    });

    it("writes nothing once closed mid-request", async () => {
        const user = userEvent.setup();
        let finish;
        const onCreate = vi.fn(() => new Promise((resolve) => (finish = resolve)));
        const error = vi.spyOn(console, "error");
        const { unmount } = render(<NewInboxDialog onCreate={onCreate} onClose={vi.fn()} />);

        await user.click(within(dialog()).getByRole("button", { name: "Generate inbox" }));
        unmount();
        finish({ address: "late@inbound.mail" });
        await Promise.resolve();

        expect(error).not.toHaveBeenCalled();
    });
});
