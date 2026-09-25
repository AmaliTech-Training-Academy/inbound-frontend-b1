// The extraction rule is really a rule about what not to extract, so most of
// these are false-positive cases. The sample messages in data/mockMessages.js
// are the project's own corpus of both kinds, and are used as such at the end.

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

    it("returns null when there is nothing to find", () => {
        expect(extractVerificationCode()).toBeNull();
        expect(extractVerificationCode({})).toBeNull();
        expect(extractVerificationCode({ subject: null, body: null })).toBeNull();
        expect(
            extractVerificationCode({ subject: "Hello", body: "Line one." }),
        ).toBeNull();
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
