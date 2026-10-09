import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDestroyDialog from "./ConfirmDestroyDialog.jsx";

const dialog = () => screen.getByRole("alertdialog", { name: "Destroy Temporary Inbox?" });

function renderDialog(props = {}) {
    const onCancel = props.onCancel ?? vi.fn();
    const onConfirm = props.onConfirm ?? vi.fn();
    const view = render(
        <ConfirmDestroyDialog open onCancel={onCancel} onConfirm={onConfirm} {...props} />,
    );
    return { ...view, onCancel, onConfirm };
}

describe("ConfirmDestroyDialog", () => {
    it("draws nothing until it is opened", () => {
        render(<ConfirmDestroyDialog open={false} onCancel={vi.fn()} onConfirm={vi.fn()} />);

        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    // Enter is the key most likely to be pressed at a dialog that has just
    // appeared, so the thing it lands on must not be the destructive one.
    it("opens with focus on Cancel, not on destroy", () => {
        renderDialog();

        expect(within(dialog()).getByRole("button", { name: "Cancel" })).toHaveFocus();
        expect(within(dialog()).getByRole("button", { name: "Yes, destroy inbox" })).not.toHaveFocus();
    });

    it("asks before it destroys, and only destroys when asked to", async () => {
        const user = userEvent.setup();
        const { onCancel, onConfirm } = renderDialog();

        await user.click(within(dialog()).getByRole("button", { name: "Yes, destroy inbox" }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onCancel).not.toHaveBeenCalled();
    });

    it("backs out on Cancel", async () => {
        const user = userEvent.setup();
        const { onCancel, onConfirm } = renderDialog();

        await user.click(within(dialog()).getByRole("button", { name: "Cancel" }));

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("backs out on Escape", async () => {
        const user = userEvent.setup();
        const { onCancel, onConfirm } = renderDialog();

        await user.keyboard("{Escape}");

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("backs out on a click outside the panel", async () => {
        const user = userEvent.setup();
        const { onCancel, onConfirm } = renderDialog();

        // The backdrop is the one aria-hidden child of the dialog.
        await user.click(dialog().querySelector('[aria-hidden="true"]'));

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    // The listener is on the window, so a dialog that closed without removing
    // it would answer Escape from anywhere for the rest of the session.
    it("stops listening for Escape once it is closed", async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();
        const { rerender } = render(
            <ConfirmDestroyDialog open onCancel={onCancel} onConfirm={vi.fn()} />,
        );

        rerender(<ConfirmDestroyDialog open={false} onCancel={onCancel} onConfirm={vi.fn()} />);
        await user.keyboard("{Escape}");

        expect(onCancel).not.toHaveBeenCalled();
    });

    it("names the address it is about to throw away", () => {
        renderDialog({ address: "one@inbound.mail" });

        expect(within(dialog()).getByText("one@inbound.mail")).toBeInTheDocument();
    });

    it("says 'this temporary address' when it was given no address", () => {
        renderDialog();

        expect(within(dialog()).getByText(/this temporary address/)).toBeInTheDocument();
        expect(within(dialog()).queryByText(/@/)).not.toBeInTheDocument();
    });

    // Destroying one of several inboxes is a smaller act than destroying the
    // last one, and the dialog says which it is.
    it("counts the inboxes that survive, in the right number", () => {
        const { unmount } = renderDialog({ otherInboxCount: 1 });
        expect(within(dialog()).getByText(/Your other inbox stays\./)).toBeInTheDocument();
        unmount();

        renderDialog({ otherInboxCount: 3 });
        expect(within(dialog()).getByText(/Your other 3 inboxes stay\./)).toBeInTheDocument();
    });

    it("says nothing about other inboxes when this is the only one", () => {
        renderDialog({ otherInboxCount: 0 });

        expect(within(dialog()).queryByText(/Your other/)).not.toBeInTheDocument();
    });

    it("keeps the backend note out of the way unless it is asked for", () => {
        const { unmount } = renderDialog();
        expect(within(dialog()).queryByText(/Backend deletion API/)).not.toBeInTheDocument();
        unmount();

        renderDialog({ showBackendNote: true });
        expect(within(dialog()).getByText(/Backend deletion API/)).toBeInTheDocument();
    });

    // Portalled on purpose: an animated ancestor makes a containing block that
    // would otherwise trap this fixed overlay inside it.
    it("renders into the body rather than where it was placed", () => {
        const { container } = renderDialog();

        expect(container).toBeEmptyDOMElement();
        expect(dialog().parentElement).toBe(document.body);
    });
});
