// The extraction rule is really a rule about what not to extract, so most of
// these are false-positive cases. data/mockMessages.js is the project's own
// corpus of both kinds, and is used as such at the end.

import { describe, it, expect } from "vitest";
import { extractVerificationCode } from "./verificationCode.js";
import { MOCK_MESSAGES } from "../data/mockMessages.js";

const bodyOf = (message) => message.htmlBody || message.textBody;

describe("extractVerificationCode", () => {
    it("reads a code out of a verification email", () => {
        expect(
            extractVerificationCode({
                subject: "Your Notion sign-in request",
                body: "Your verification code is 849 201. Please enter this code to continue.",
            }),
        ).toBe("849 201");
    });

    it("reads a code the subject carries", () => {
        expect(
            extractVerificationCode({ subject: "Your login code is 849 201" }),
        ).toBe("849 201");
    });

    it("reads an OTP", () => {
        expect(extractVerificationCode({ body: "OTP: 123456" })).toBe("123456");

        expect(
            extractVerificationCode({
                body: "Your one-time password is 4821. It expires in 10 minutes.",
            }),
        ).toBe("4821");

        expect(
            extractVerificationCode({
                body: "Use the security code below to confirm it is you:",
            }),
        ).toBeNull(); // said, but never given
        expect(
            extractVerificationCode({ body: "Your security code is 559124" }),
        ).toBe("559124");
    });

    it("reads an alphanumeric code", () => {
        expect(
            extractVerificationCode({
                body: "Your verification code is A7K92P. It expires in 10 minutes.",
            }),
        ).toBe("A7K92P");

        expect(extractVerificationCode({ body: "OTP: AB12CD" })).toBe("AB12CD");
    });

    it("reads an alphanumeric code whose letters and digits alternate", () => {
        expect(
            extractVerificationCode({ body: "Your login code is 7H4K9M" }),
        ).toBe("7H4K9M");
        expect(
            extractVerificationCode({ body: "Your security code is XJ82Q1" }),
        ).toBe("XJ82Q1");
        expect(
            extractVerificationCode({
                body: "Your one-time code is 4B7X2Z9",
            }),
        ).toBe("4B7X2Z9");
    });

    it("reads a numeric code the sender hyphenated", () => {
        expect(
            extractVerificationCode({ body: "Your verification code is 849-201." }),
        ).toBe("849 201");
    });

    it("reads an alphanumeric code the sender grouped, without the grouping", () => {
        expect(
            extractVerificationCode({ body: "Your verification code is AB12-CD" }),
        ).toBe("AB12CD");
        expect(
            extractVerificationCode({ body: "OTP: A7K9-2P" }),
        ).toBe("A7K92P");
    });

    it("reads a code out of HTML without dragging markup along", () => {
        const body = `<div><p>Your verification code is <strong>849 201</strong>.</p></div>`;

        expect(extractVerificationCode({ body })).toBe("849 201");
    });

    it("keeps a code that markup splits apart", () => {
        const body = `<p>Your security code is <b>849</b> <b>201</b></p>`;

        expect(extractVerificationCode({ body })).toBe("849 201");
    });

    it("does not read a code out of markup attributes", () => {
        const body = `<p>Read your verification code in the email.</p>
            <a href="https://notion.so/login?code=849201">Sign in</a>`;

        // The href's `code=849201` is not message text, so it is not the code.
        expect(extractVerificationCode({ body })).toBeNull();
    });

    it("reads an alphanumeric code out of HTML", () => {
        expect(
            extractVerificationCode({
                body: `<p>Your verification code is <strong>A7K92P</strong>.</p>`,
            }),
        ).toBe("A7K92P");
        expect(
            extractVerificationCode({
                body: `<p>Your login code: <span style="font-weight: 600;">849-201</span></p>`,
            }),
        ).toBe("849 201");
    });

    it("does not read a code out of an attribute that looks like one", () => {
        const body = `<div data-code="A7K92P" data-token="849-201">Your verification code is in the email.</div>`;

        expect(extractVerificationCode({ body })).toBeNull();
    });

    it("reads plain text with no markup", () => {
        expect(
            extractVerificationCode({
                subject: "Confirm your email",
                body: "Hello,\n\nYour confirmation code is 482913.\n\nThanks,\nThe Team",
            }),
        ).toBe("482913");
    });

    it("does not treat an unrelated number as a code", () => {
        expect(
            extractVerificationCode({
                subject: "Deployment pipeline failed: Test suite regression",
                body: `Build pipeline #4928 failed for branch 'main' (commit e742b6).

Failure summary:
• Test: spec/security/iframe_sandbox_spec.js:42
• Exit code: 1

Total paid: $24.00 USD
Invoice 2026-09
Call +1 (555) 123-4567`,
            }),
        ).toBeNull();
    });

    it("does not treat a lone number as a code", () => {
        // Nothing here says it is a code, however code-shaped it looks.
        expect(
            extractVerificationCode({
                subject: "Your invoice",
                body: "Amount due: 2400 USD",
            }),
        ).toBeNull();
    });

    it("does not let a weaker word hand back a number", () => {
        // "zip code" and "exit code" are why a bare "code" is not a trigger.
        expect(
            extractVerificationCode({ body: "Your zip code is 94104." }),
        ).toBeNull();
        expect(
            extractVerificationCode({ body: "Exit code: 4928" }),
        ).toBeNull();
        expect(
            extractVerificationCode({ body: "Error code 5041" }),
        ).toBeNull();
    });

    // The trigger phrase is what makes a nearby token a candidate, so each of
    // these puts a non-code right after one.
    it("does not mistake an id, a date or a phone number for a code", () => {
        expect(
            extractVerificationCode({ body: "Your verification code is #4928" }),
        ).toBeNull();
        expect(
            extractVerificationCode({ body: "Your verification code is 2026-09" }),
        ).toBeNull();
        expect(
            extractVerificationCode({
                body: "Your verification code is 555-123-4567",
            }),
        ).toBeNull();
        expect(
            extractVerificationCode({ body: "Your confirmation code is 1234 5678" }),
        ).toBeNull();
    });

    it("does not read a code out of a url it points at", () => {
        expect(
            extractVerificationCode({
                body: "Your verification code is at https://notion.so/login?code=849201",
            }),
        ).toBeNull();
        expect(
            extractVerificationCode({
                body: "Your login code: open https://notion.so/login?token=A7K92P",
            }),
        ).toBeNull();
    });

    it("does not read a code out of the middle of a longer token", () => {
        expect(
            extractVerificationCode({
                body: "Your verification code is userA7K92P123",
            }),
        ).toBeNull();
        expect(
            extractVerificationCode({
                body: "Your verification code is invoice-AB12CD-2026",
            }),
        ).toBeNull();
        expect(
            extractVerificationCode({ body: "Your verification code is spec.js:42" }),
        ).toBeNull();
    });

    it("does not read a word beside a number as a code", () => {
        // A grouped candidate has to mix its letters and digits itself, so an
        // invoice reference and a currency amount are not read as ones.
        expect(
            extractVerificationCode({ body: "Your confirmation code is INV-2026-09" }),
        ).toBeNull();
        expect(
            extractVerificationCode({ body: "Your verification code is 24 USD short" }),
        ).toBeNull();
    });

    it("does not hand back a lower case token", () => {
        // Lower case is what words, hashes, ids and file names are made of, so
        // it is left alone rather than guessed at.
        expect(
            extractVerificationCode({ body: "Your verification code is e742b6" }),
        ).toBeNull();
        expect(
            extractVerificationCode({ body: "Your login code is ab12cd" }),
        ).toBeNull();
    });

    it("does not read a file name, a url or a stylesheet as a code", () => {
        expect(
            extractVerificationCode({
                body: "Your verification code is in report_2026_FINAL_v2.pdf",
            }),
        ).toBeNull();
        expect(
            extractVerificationCode({
                body: "Your login code is styled by .btn-primary in app.css",
            }),
        ).toBeNull();
        expect(
            extractVerificationCode({
                body: "Your verification code: background #FFF000 on the button",
            }),
        ).toBeNull();
    });

    it("does not read a uuid or a base64 blob as a code", () => {
        expect(
            extractVerificationCode({
                body: "Your security code is 3f2504e0-4f89-11d3-9a0c-0305e82c3301",
            }),
        ).toBeNull();
        expect(
            extractVerificationCode({
                body: "Your security code is YWJjZGVmZ2hpamtsbW5vcA==",
            }),
        ).toBeNull();
    });

    it("returns null when there is nothing to find", () => {
        expect(extractVerificationCode()).toBeNull();
        expect(extractVerificationCode({})).toBeNull();
        expect(extractVerificationCode({ subject: null, body: null })).toBeNull();
        expect(
            extractVerificationCode({ subject: "Hello", body: "Line one." }),
        ).toBeNull();
    });

    it("returns null when the wording is there but no code is", () => {
        expect(
            extractVerificationCode({ body: "Your verification code is on its way." }),
        ).toBeNull();
        expect(extractVerificationCode({ body: "OTP sent." })).toBeNull();
    });

    it("reads the numeric shapes the wording is written around", () => {
        expect(
            extractVerificationCode({ body: "Your verification code is 4821" }),
        ).toBe("4821");
        expect(
            extractVerificationCode({ body: "Your verification code is 91370426" }),
        ).toBe("91370426");
        expect(
            extractVerificationCode({ body: "Your verification code is 559124" }),
        ).toBe("559124");
    });
});

describe("extractVerificationCode against the sample messages", () => {
    it("agrees with the sample that carries a code", () => {
        const notion = MOCK_MESSAGES[0];

        expect(notion.verificationCode).toBe("849 201");
        expect(
            extractVerificationCode({
                subject: notion.subject,
                body: bodyOf(notion),
            }),
        ).toBe(notion.verificationCode);

        // Both parts of that message carry it, so both are checked.
        expect(
            extractVerificationCode({ subject: notion.subject }),
        ).toBe("849 201");
        expect(extractVerificationCode({ body: notion.textBody })).toBe(
            "849 201",
        );
    });

    it("finds nothing in the samples that carry no code", () => {
        const withoutCode = MOCK_MESSAGES.filter((m) => !m.verificationCode);

        expect(withoutCode.length).toBeGreaterThan(0);

        for (const message of withoutCode) {
            expect(
                extractVerificationCode({
                    subject: message.subject,
                    body: bodyOf(message),
                }),
            ).toBeNull();
        }
    });
});

// How real senders write it. Each of these was missed before the extractor
// learned a bare "code", "PIN", codes written before their wording, codes a
// sentence away, and codes set one digit per box.
describe("extractVerificationCode against real-world wording", () => {
    it.each([
        ["123456", "Your code is 123456"],
        ["482913", "123456 is not it. 482913 is your Instagram code. Don't share it."],
        ["482913", "482913 is your Facebook confirmation code"],
        ["739204", "G-739204 is your Google verification code."],
        ["5521", "Your Uber code: 5521. Never share this code."],
        ["839201", "Enter this code to continue: 839201"],
        ["839201", "Use 839201 to verify your account"],
        ["839201", "Your PIN is 839201"],
        ["839201", "Your one-time PIN is 839201"],
        ["839201", "Your access code is 839201"],
        ["839201", "Your activation code: 839201"],
        ["839201", "Password reset code: 839201"],
        ["839201", "Here is your code: 839201"],
        ["839201", "Code: 839201"],
        ["839201", "Your temporary code is 839201"],
        [
            "839201",
            "Your verification code is below. Enter it in the browser window where you started signing in to your account, it expires soon. 839201",
        ],
        [
            "839201",
            "<p>Your verification code:</p><table><tr><td>8</td><td>3</td><td>9</td><td>2</td><td>0</td><td>1</td></tr></table>",
        ],
        ["ABCD1234", "Your confirmation code is ABCD-1234"],
        ["839201", "Bitte verwenden Sie den Code 839201"],
        ["839201", "Votre code de vérification est 839201"],
    ])("reads %s out of %j", (expected, body) => {
        expect(extractVerificationCode({ body })).toBe(expected);
    });

    it("reads a code that only the subject carries", () => {
        expect(extractVerificationCode({ subject: "Your code is 839201", body: "" })).toBe("839201");
    });

    it("still leaves other kinds of code alone", () => {
        expect(extractVerificationCode({ body: "Use code SAVE20 at checkout for 20% off" })).toBeNull();
        expect(extractVerificationCode({ body: "Use promo code SAVE20" })).toBeNull();
        expect(extractVerificationCode({ body: "Ship to postal code 90210." })).toBeNull();
        expect(extractVerificationCode({ body: "Your tracking code: 48291044" })).toBeNull();
    });

    it("does not read a number before the wording unless the words join them", () => {
        // "55012. Your login code" - the full stop says the number belongs to
        // the sentence before.
        expect(
            extractVerificationCode({ body: "Account number 55012. Your login code is in the app." }),
        ).toBeNull();
    });
});

describe("extractVerificationCode does not join a stray number to the wording", () => {
    it("ignores a year a dash away from a mention of codes", () => {
        expect(
            extractVerificationCode({
                body: "Meeting room 5521, floor 10, year 2026 — none of these numbers is a code, so no OTP should be shown.",
            }),
        ).toBeNull();
    });

    it("still joins a dash that names the code", () => {
        expect(extractVerificationCode({ body: "839201 - your Acme sign-in code" })).toBe("839201");
    });
});
