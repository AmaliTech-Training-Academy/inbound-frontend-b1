import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationStack from "./NotificationStack.jsx";

const region = () => screen.getByRole("status", { name: "Notifications" });

const note = (key, overrides = {}) => ({
    key,
    kind: "message",
    text: `Notice ${key}`,
    inboxAddress: null,
    ...overrides,
});

function renderStack(notifications = [], onDismiss = vi.fn()) {
    render(<NotificationStack notifications={notifications} onDismiss={onDismiss} />);
    return { onDismiss };
}

describe("NotificationStack", () => {
    // A live region added to the page later is not reliably announced, so the
    // empty one has to be there from the start.
    it("keeps its live region on the page with nothing to say", () => {
        renderStack([]);

        expect(region()).toBeInTheDocument();
        expect(region()).toBeEmptyDOMElement();
    });

    // Polite, not assertive: mail arriving should wait for a screen reader to
    // finish its sentence rather than cut in.
    it("announces politely", () => {
        renderStack([note("a")]);

        expect(region()).toHaveAttribute("aria-live", "polite");
    });

    it("shows each notification, in the order given", () => {
        renderStack([note("a"), note("b")]);

        const texts = within(region())
            .getAllByText(/^Notice/)
            .map((el) => el.textContent);
        expect(texts).toEqual(["Notice a", "Notice b"]);
    });

    it("names the inbox when it was given one", () => {
        renderStack([note("a", { inboxAddress: "two@inbound.mail" })]);

        expect(within(region()).getByText("two@inbound.mail")).toBeInTheDocument();
    });

    it("says nothing about an inbox when it was given none", () => {
        renderStack([note("a")]);

        expect(within(region()).queryByText(/@/)).not.toBeInTheDocument();
    });

    it("dismisses the one whose button was pressed", async () => {
        const user = userEvent.setup();
        const { onDismiss } = renderStack([note("a"), note("b")]);

        await user.click(within(region()).getByRole("button", { name: "Dismiss: Notice b" }));

        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(onDismiss).toHaveBeenCalledWith("b");
    });

    // The stack is fixed over the page, so it must not swallow clicks aimed at
    // what is behind it - only the notices themselves take the pointer.
    it("lets clicks through the empty space around it", () => {
        renderStack([note("a")]);

        expect(region().className).toContain("pointer-events-none");
        expect(region().firstElementChild.className).toContain("pointer-events-auto");
    });

    // The notice still appears; it just does not travel to get there.
    it("drops the animation for anyone who asked for less motion", () => {
        renderStack([note("a")]);

        expect(region().firstElementChild.className).toContain("motion-reduce:animate-none");
    });

    // Top right under the header, which is where this page has always put a
    // notification, and clear of the rail and the dense control row.
    it("sits where this page's notices sit", () => {
        renderStack([note("a")]);

        expect(region().className).toContain("top-16");
        expect(region().className).toContain("sm:right-4");
    });
});
