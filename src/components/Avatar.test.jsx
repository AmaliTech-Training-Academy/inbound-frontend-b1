import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Avatar's whole job is deciding what to hand the library, so the library is
// stood in for and the props are what is asserted. Rendering the real one
// would test @blobatar/react's output instead of our choice.
const { blobatar } = vi.hoisted(() => ({ blobatar: vi.fn(() => null) }));
vi.mock("@blobatar/react", () => ({ Blobatar: blobatar }));

import Avatar from "./Avatar.jsx";

/** The props the last render handed the library. */
const lastProps = () => blobatar.mock.calls.at(-1)[0];

function renderAt(theme, props = {}) {
    localStorage.setItem("inbound-theme", theme);
    return render(<Avatar {...props} />);
}

describe("Avatar", () => {
    beforeEach(() => {
        blobatar.mockClear();
        localStorage.clear();
    });

    it("draws the same face for the same name", () => {
        renderAt("light", { seed: "one@inbound.mail" });

        expect(lastProps().name).toBe("one@inbound.mail");
    });

    // A nameless avatar still has to be a face rather than an empty box, and
    // the same one every time.
    it("falls back to a fixed name when there is no seed", () => {
        renderAt("light", { seed: "" });
        expect(lastProps().name).toBe("inbound");

        blobatar.mockClear();
        renderAt("light");
        expect(lastProps().name).toBe("inbound");
    });

    // The backdrop is a pale swatch meant for light surfaces. Left on in dark
    // mode it reads as a white disc behind the face, which is what QA saw.
    it("drops the backdrop in dark mode and keeps it in light", () => {
        renderAt("light", { seed: "a" });
        expect(lastProps().background).toBe("circle");

        blobatar.mockClear();
        renderAt("dark", { seed: "a" });
        expect(lastProps().background).toBe(false);
    });

    it("is 42 across unless another size is asked for", () => {
        renderAt("light", { seed: "a" });
        expect(lastProps().size).toBe(42);

        blobatar.mockClear();
        renderAt("light", { seed: "a", size: 72 });
        expect(lastProps().size).toBe(72);
    });

    // Animating is opt-in: a list of animated blobatars is inline SVG running
    // endless CSS animations, which kept the page busy every frame.
    it("stays still unless animation is asked for", () => {
        renderAt("light", { seed: "a" });
        expect(lastProps().animate).toBeUndefined();

        blobatar.mockClear();
        renderAt("light", { seed: "a", animate: "always" });
        expect(lastProps().animate).toBe("always");
    });

    it("keeps its own layout class alongside the caller's", () => {
        renderAt("light", { seed: "a", className: "mt-4" });

        expect(lastProps().className).toContain("shrink-0");
        expect(lastProps().className).toContain("mt-4");
    });
});
