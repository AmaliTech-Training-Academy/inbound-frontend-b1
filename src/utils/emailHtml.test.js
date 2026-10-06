import { describe, it, expect } from "vitest";
import { paintsOwnSurface, prepareEmail } from "./emailHtml.js";
// The team's own sanitization test: a shipping email on top, every common
// attack underneath.
import SANITIZATION_TEST from "../test/fixtures/sanitizationTestEmail.html?raw";

/** The cleaned email as a document, to query like the reader would see it. */
function cleaned(html) {
    // In this document rather than a separate one, so jest-dom's matchers
    // accept the elements.
    const root = document.createElement("div");
    root.innerHTML = prepareEmail(html);
    return { body: root, querySelector: (s) => root.querySelector(s), querySelectorAll: (s) => root.querySelectorAll(s) };
}

describe("prepareEmail", () => {
    describe("the team's sanitization test email", () => {
        const doc = cleaned(SANITIZATION_TEST);
        const text = doc.body.textContent;

        it("keeps the safe half: text, formatting, button, list, table and quote", () => {
            expect(doc.querySelector("h1").textContent).toBe("Your order has shipped");
            for (const tag of ["strong", "em", "u", "s", "code", "ul", "blockquote", "hr"]) {
                expect(doc.querySelector(tag), tag).not.toBeNull();
            }
            expect(doc.querySelectorAll("li")).toHaveLength(3);
            expect(text).toContain("GH₵ 890.00");
            expect(doc.querySelector('td[style*="#e07a2f"]')).not.toBeNull();
        });

        it("keeps web links, opening them in a new tab", () => {
            const track = [...doc.querySelectorAll("a")].find((a) => a.textContent === "Track package");
            expect(track).toHaveAttribute("href", "https://example.com/track/10482");
            expect(track).toHaveAttribute("target", "_blank");
            expect(track).toHaveAttribute("rel", "noopener noreferrer");
        });

        it("keeps the https image", () => {
            expect(doc.querySelector('img[alt="Product banner"]')).not.toBeNull();
        });

        it("removes every script, including the nested-tag trick", () => {
            expect(doc.querySelector("script")).toBeNull();
            expect(prepareEmail(SANITIZATION_TEST)).not.toMatch(/<script|<scr</i);
        });

        it("removes every event handler", () => {
            const handlers = [...doc.querySelectorAll("*")].flatMap((el) =>
                [...el.attributes].filter((attr) => /^on/i.test(attr.name)),
            );
            expect(handlers).toEqual([]);
            expect(doc.body.textContent).toContain("Hover or click me");
        });

        it("makes javascript:, mixed-case, entity-encoded and data: links unclickable", () => {
            for (const label of [
                "javascript: link",
                "Mixed-case javascript: link",
                "Entity-encoded javascript: link",
                "data: URI link",
            ]) {
                const link = [...doc.querySelectorAll("a")].find((a) => a.textContent === label);
                expect(link, label).not.toHaveAttribute("href");
            }
        });

        it("drops embeds, frames, meta refresh and base", () => {
            expect(doc.querySelector("iframe, object, embed, meta, base")).toBeNull();
        });

        it("pins the fixed overlay back into the flow", () => {
            const overlay = [...doc.querySelectorAll("div")].find((el) =>
                el.textContent.startsWith("Overlay attempt"),
            );
            expect(overlay.style.position).toBe("static");
        });

        it("disarms the phishing form", () => {
            expect(doc.querySelector("form")).not.toHaveAttribute("action");
            expect(doc.querySelector('input[type="password"]')).toBeDisabled();
            expect(doc.querySelector("button")).toBeDisabled();
        });

        it("drops images that point nowhere, keeping the alt-text breakout inert", () => {
            expect(doc.querySelector('img[src="x"]')).toBeNull();
            expect(doc.querySelectorAll("img")).toHaveLength(1); // the banner only
        });

        it("keeps the sender's <style> blocks", () => {
            expect(prepareEmail(SANITIZATION_TEST)).toContain("<style>");
        });
    });

    it("keeps mailto links", () => {
        const doc = cleaned('<a href="mailto:help@example.com">Mail us</a>');
        expect(doc.querySelector("a")).toHaveAttribute("href", "mailto:help@example.com");
    });

    it("keeps inline data: images", () => {
        const doc = cleaned('<img src="data:image/png;base64,iVBORw0KGgo=" alt="dot">');
        expect(doc.querySelector("img")).not.toBeNull();
    });

    describe("tracking pixels (IND-10)", () => {
        it("drops the test email's hidden 1x1 pixel", () => {
            const doc = cleaned(SANITIZATION_TEST);
            expect(doc.querySelector('img[src*="pixel.gif"]')).toBeNull();
        });

        it.each([
            ['width="1" height="1"', "1x1 by attribute"],
            ['width="0"', "zero width"],
            ['style="width:1px;height:1px"', "1px by style"],
            ['style="display:none"', "display none"],
            ['style="visibility:hidden"', "visibility hidden"],
            ['style="opacity:0"', "opacity 0"],
        ])("drops an image with %s (%s)", (attrs) => {
            const doc = cleaned(`<img src="https://t.example.com/open.gif" ${attrs}>`);
            expect(doc.querySelector("img")).toBeNull();
        });

        it("keeps real images, small icons included", () => {
            const doc = cleaned(
                '<img src="https://cdn.example.com/logo.png" width="160">' +
                    '<img src="https://cdn.example.com/fb.png" width="32" height="32">' +
                    '<img src="https://cdn.example.com/banner.png">',
            );
            expect(doc.querySelectorAll("img")).toHaveLength(3);
        });
    });

    it("returns nothing for an empty email", () => {
        expect(prepareEmail("")).toBe("");
        expect(prepareEmail(null)).toBe("");
    });
});

// The dark theme's default text colour is chosen to be read on the reading
// pane. On a panel the mail painted itself it would all but disappear, so this
// is what decides which default the mail gets.
describe("paintsOwnSurface", () => {
    it("is false for a mail with no background of its own", () => {
        expect(paintsOwnSurface("<p>Hello</p>")).toBe(false);
        expect(paintsOwnSurface("")).toBe(false);
        expect(paintsOwnSurface(null)).toBe(false);
    });

    it("finds a panel painted inline", () => {
        expect(paintsOwnSurface('<div style="background: #ffffff"><p>Hi</p></div>')).toBe(true);
        expect(paintsOwnSurface('<div style="background-color:#f4f4f4">Hi</div>')).toBe(true);
    });

    it("finds a banner painted as an image, and the old bgcolor attribute", () => {
        expect(paintsOwnSurface('<td background="https://cdn.example.com/banner.png">Hi</td>')).toBe(true);
        expect(paintsOwnSurface('<table bgcolor="#ffffff"><tr><td>Hi</td></tr></table>')).toBe(true);
        expect(paintsOwnSurface('<div style="background-image: url(https://cdn.example.com/b.png)">Hi</div>')).toBe(true);
    });

    it("finds a panel painted from a style block", () => {
        expect(paintsOwnSurface("<style>.panel { background: #ffffff }</style><div class='panel'>Hi</div>")).toBe(true);
    });

    it("ignores a background the frame's own canvas already covers", () => {
        // html and body are forced transparent, so these never paint.
        expect(paintsOwnSurface('<body style="background: #ffffff"><p>Hi</p></body>')).toBe(false);
        expect(paintsOwnSurface("<style>body { background: #ff0000 !important }</style><p>Hi</p>")).toBe(false);
        expect(paintsOwnSurface("<style>html, body { background: #fff }</style><p>Hi</p>")).toBe(false);
    });

    it("ignores a reset that paints nothing", () => {
        expect(paintsOwnSurface('<div style="background: none">Hi</div>')).toBe(false);
        expect(paintsOwnSurface('<div style="background-color: transparent">Hi</div>')).toBe(false);
        expect(paintsOwnSurface('<div style="background-image: none">Hi</div>')).toBe(false);
        expect(paintsOwnSurface('<div style="background-position: center">Hi</div>')).toBe(false);
        expect(paintsOwnSurface('<div style="background-repeat: no-repeat">Hi</div>')).toBe(false);
    });
});
