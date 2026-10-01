// The mock backend's mail. A message simulated in the browser is kept here, so
// the mock fetchMessage hands back what was sent rather than a placeholder, and
// a whole set of realistic samples can be sent in one go for a demo or a test
// run without the real backend.
//
//   window.__inboundSendSamples()                    every open inbox
//   window.__inboundSendSamples("mock-x@tempmail.dev") one inbox

import { MOCK_MESSAGES } from "../data/mockMessages.js";

const sent = new Map();

export function rememberMockMessage(message) {
    if (message?.id) sent.set(String(message.id), message);
}

export function recallMockMessage(id) {
    return sent.get(String(id)) ?? null;
}

// What the design's samples do not already cover: a letter-and-number code,
// a designed email with images, and one that tries every trick the reader has
// to stop.
const EXTRA_SAMPLES = [
    {
        id: "slack-r4t8kq",
        senderName: "Slack",
        senderEmail: "no-reply@slack.com",
        subject: "Your Slack sign-in code",
        textBody:
            "Hi,\n\nYour one-time code is R4T8KQ.\n\nEnter it in the browser window where you started signing in. It expires in 10 minutes.\n\nThe Slack team",
        attachments: [],
    },
    {
        id: "digest-images",
        senderName: "The Weekly Digest",
        senderEmail: "digest@example.com",
        subject: "Issue #43: real images load, tracking pixels do not",
        htmlBody: `<div style="background-color:#eef2f7;padding:24px 0;font-family:Georgia,serif;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:600px;background-color:#ffffff;"><tr><td style="background-color:#0f172a;padding:24px;text-align:center;"><h1 style="color:#ffffff;margin:0;">The Weekly Digest</h1></td></tr><tr><td><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_big.jpg/960px-Fronalpstock_big.jpg" width="600" alt="Mountains" style="display:block;width:100%;"></td></tr><tr><td style="padding:24px 28px;color:#334155;line-height:1.7;"><p>The photo above is a real image and loads. A hidden 1x1 tracking pixel at the bottom of this email is dropped before it is fetched.</p><p style="text-align:center;"><a href="https://example.com/digest/43" style="background-color:#ff5722;color:#ffffff;padding:12px 24px;border-radius:999px;text-decoration:none;display:inline-block;">Read the full issue</a></p></td></tr></table><img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/1x1.png" width="1" height="1" alt=""></div>`,
        attachments: [],
    },
    {
        id: "sandbox-check",
        senderName: "Security test",
        senderEmail: "qa@example.com",
        subject: "Sandbox check: nothing below should run",
        htmlBody: `<div style="font-family:Arial,sans-serif;padding:16px;"><h2 style="color:#b91c1c;">Sandbox check</h2><p>None of the following should do anything.</p><script>alert('script ran')</script><img src="x" onerror="alert('onerror ran')" alt="broken"><p><a href="javascript:alert('link ran')">A javascript: link</a></p><div style="position:fixed;top:0;left:0;width:100%;height:100%;background-color:#dc2626;color:#fff;">Overlay attempt</div><form action="https://evil.example.com"><input type="password" placeholder="Password"><button>Log in</button></form><p style="color:#15803d;font-weight:bold;">No alert and no red overlay means the sandbox held.</p></div>`,
        attachments: [],
    },
];

/**
 * Every sample, as fresh copies addressed to `to`: new ids so the same set can
 * be sent again without being taken for repeats, and the arrival time now.
 */
export function sampleMessages(to) {
    const stamp = Date.now().toString(36);
    return [...MOCK_MESSAGES, ...EXTRA_SAMPLES].map((sample, index) => ({
        ...sample,
        id: `${sample.id}-${stamp}-${index}`,
        recipientEmail: to ?? sample.recipientEmail,
        receivedAt: new Date().toISOString(),
        isRead: false,
    }));
}
