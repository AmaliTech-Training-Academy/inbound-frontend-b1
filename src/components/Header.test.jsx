import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Header from "./Header.jsx";

function renderHeader(status) {
    const props = { status, generate: vi.fn(), regenerate: vi.fn() };
    render(<Header {...props} />);
    return props;
}

const button = () => screen.getByRole("button", { name: /generate email/i });

describe("Header", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each(["idle", "error"])(
        "generates an inbox when there is none (%s)",
        async (status) => {
            const user = userEvent.setup();
            const { generate, regenerate } = renderHeader(status);

            await user.click(button());

            expect(generate).toHaveBeenCalledTimes(1);
            expect(regenerate).not.toHaveBeenCalled();
        },
    );

    it("replaces an expired inbox through regenerate", async () => {
        // regenerate() keeps the purged card up while the request runs; plain generate() would flash the landing page in between.
        const user = userEvent.setup();
        const { generate, regenerate } = renderHeader("expired");

        await user.click(button());

        expect(regenerate).toHaveBeenCalledTimes(1);
        expect(generate).not.toHaveBeenCalled();
    });

    it("leaves an active inbox alone", async () => {
        // Replacing it from the header would throw away an address in use.
        const user = userEvent.setup();
        const { generate, regenerate } = renderHeader("active");

        await user.click(button());

        expect(generate).not.toHaveBeenCalled();
        expect(regenerate).not.toHaveBeenCalled();
    });

    it("is disabled while an inbox is being created", () => {
        renderHeader("creating");

        expect(
            screen.getByRole("button", { name: /generating/i }),
        ).toBeDisabled();
    });

    describe("G shortcut", () => {
        it("generates, like clicking the button", async () => {
            const user = userEvent.setup();
            const { generate } = renderHeader("idle");

            await user.keyboard("g");

            expect(generate).toHaveBeenCalledTimes(1);
        });

        it("is ignored while typing in a field", async () => {
            const user = userEvent.setup();
            const { generate } = renderHeader("idle");
            const field = document.createElement("input");
            document.body.appendChild(field);

            await user.click(field);
            await user.keyboard("g");

            expect(generate).not.toHaveBeenCalled();
            field.remove();
        });

        it("is ignored with a modifier held", async () => {
            const user = userEvent.setup();
            const { generate } = renderHeader("idle");

            await user.keyboard("{Control>}g{/Control}");

            expect(generate).not.toHaveBeenCalled();
        });
    });
});
