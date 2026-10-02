import { describe, it, expect } from "vitest";
import { recallMockMessage, rememberMockMessage, sampleMessages } from "./mockMail.js";
import { MOCK_MESSAGES } from "../data/mockMessages.js";

describe("mockMail", () => {
    it("hands back a simulated message by its id", () => {
        rememberMockMessage({ id: "sim-1", subject: "Hello", textBody: "Hi there" });

        expect(recallMockMessage("sim-1")).toMatchObject({ subject: "Hello", textBody: "Hi there" });
        expect(recallMockMessage("never-sent")).toBeNull();
    });

    it("sends every sample, plus the extras, addressed to the inbox asked for", () => {
        const samples = sampleMessages("mock-abc@tempmail.dev");

        expect(samples.length).toBeGreaterThan(MOCK_MESSAGES.length);
        for (const message of samples) {
            expect(message.recipientEmail).toBe("mock-abc@tempmail.dev");
            expect(message.isRead).toBe(false);
        }
        expect(samples.map((m) => m.subject)).toContain("Your Slack sign-in code");
    });

    it("gives every send fresh ids, so a second batch is not taken for repeats", () => {
        const first = sampleMessages().map((m) => m.id);
        const ids = new Set(first);

        expect(ids.size).toBe(first.length);
        for (const sample of MOCK_MESSAGES) expect(ids.has(sample.id)).toBe(false);
    });
});
