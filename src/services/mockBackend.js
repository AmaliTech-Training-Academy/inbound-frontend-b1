// In-browser stand-in for the inbox backend, used while the real one is
// unavailable. config.js decides whether it is active (USE_MOCK); inboxApi.js
// delegates its mock branches here and inboxSocket.js replays these same
// records over a fake socket. Nothing else knows this module exists, so
// removing it plus the USE_MOCK branches restores the real integration exactly.
//
// Everything is keyed by token. Several inboxes are live at once, and each has
// to resolve its own expiry and its own mail rather than whichever was created
// last.

import { EXTEND_MINUTES, INBOX_TTL_MINUTES } from "../config.js";

// .test is reserved by RFC 2606, so a mock address can never collide with a
// routable one.
const DOMAIN = "inbound.test";

/** token -> { id, address, localPart, domain, createdAt, expiresAt, extendCount, messages } */
const inboxes = new Map();

let sequence = 0;

function nextId(prefix) {
    sequence += 1;
    return `${prefix}-${sequence.toString(36)}${Math.random()
        .toString(36)
        .slice(2, 6)}`;
}

// --- Seed mail -------------------------------------------------------
// Six templates, each inbox taking a rotating window of three, so switching
// between inboxes shows visibly different mail instead of the same list.

const TEMPLATES = [
    {
        senderName: "Notion Team",
        from: "notify@m.notion.so",
        subject: "Your Notion login code is 849 201",
        minutesAgo: 2,
        body: `<div style="line-height: 1.6;">
  <p style="margin-top: 0;">Hello,</p>
  <p>We received a sign-in request for your workspace <strong>Acme Product Lab</strong>.</p>
  <p>Your verification code is <strong>849 201</strong>. Enter it to continue, or use the button below to sign in directly.</p>
  <p style="color: #6b6d73; font-size: 13px;">This one-time code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
</div>`,
        attachments: [
            { id: "att_onboarding", filename: "workspace_onboarding_guide.pdf", type: "PDF", size: "1.8 MB" },
            { id: "att_policy", filename: "security_policy.pdf", type: "PDF", size: "420 KB" },
        ],
    },
    {
        senderName: "Digital Delivery Network",
        from: "billing@delivery-net.org",
        subject: "Monthly subscription statement and tax receipt",
        minutesAgo: 24,
        body: `<div>
  <h2 style="font-size: 18px; margin-top: 0;">Statement of account</h2>
  <p>Here is your service breakdown for the active billing cycle:</p>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
    <thead>
      <tr style="background-color: #f4f5f7; text-align: left;">
        <th style="padding: 8px 12px; border: 1px solid #e4e5e9;">Service item</th>
        <th style="padding: 8px 12px; border: 1px solid #e4e5e9;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px 12px; border: 1px solid #e4e5e9;">Inbound relay core service</td>
        <td style="padding: 8px 12px; border: 1px solid #e4e5e9;">$19.00</td>
      </tr>
      <tr style="font-weight: bold;">
        <td style="padding: 8px 12px; border: 1px solid #e4e5e9;">Total paid</td>
        <td style="padding: 8px 12px; border: 1px solid #e4e5e9;">$24.00 USD</td>
      </tr>
    </tbody>
  </table>
  <p>Your invoice and transactional ledger are attached.</p>
</div>`,
        attachments: [
            { id: "att_invoice", filename: "invoice-2026-09.pdf", type: "PDF", size: "245 KB" },
            { id: "att_ledger", filename: "transaction_ledger.csv", type: "CSV", size: "48 KB" },
        ],
    },
    {
        senderName: "CI/CD Build Cluster",
        from: "builds@internal-ci.net",
        subject: "Deployment pipeline failed: test suite regression",
        minutesAgo: 51,
        body: `Build pipeline #4928 failed for branch 'main' (commit e742b6).

Failure summary:
- Test: spec/security/iframe_sandbox_spec.js:42
- Error: expected tracking pixel to be blocked by CSP
- Exit code: 1

The full console log and artifact archive are attached.`,
        attachments: [{ id: "att_build_log", filename: "build_output.log", type: "LOG", size: "780 KB" }],
    },
    {
        senderName: "Aurora Health",
        from: "no-reply@aurora-health.example",
        subject: "Confirm your appointment on 14 October",
        minutesAgo: 96,
        body: `<div style="line-height: 1.6;">
  <p style="margin-top: 0;">Hi,</p>
  <p>This is a reminder for your appointment on <strong>14 October at 09:30</strong>.</p>
  <p>Please confirm attendance using the confirmation code <strong>K7T2M9</strong>, or call the clinic to reschedule.</p>
</div>`,
        attachments: [],
    },
    {
        senderName: "John Doe",
        from: "john.doe@example.org",
        subject: "Quick test on plain text formatting",
        minutesAgo: 173,
        body: `Hello,

Line one.

Line two.

Thanks,
John`,
        attachments: [],
    },
    {
        senderName: "Design Systems QA",
        from: "assets@design-review.example",
        subject: "Q3 brand assets and design tokens package",
        minutesAgo: 288,
        body: `Hi team,

Here are the exported brand guidelines, vectors and stylesheets for the Q3 review.

Please check that long filenames render cleanly without overflowing the attachment card.

Best regards,
QA Team`,
        attachments: [
            { id: "att_brand", filename: "Inbound_Brand_Guidelines_2026_Final_Draft_v3.pdf", type: "PDF", size: "4.8 MB" },
            { id: "att_logo", filename: "logo_mark_monochrome_transparent_highres.png", type: "PNG", size: "1.4 MB" },
            { id: "att_tokens", filename: "complete_design_tokens_release_bundle.zip", type: "ZIP", size: "14.5 MB" },
        ],
    },
];

const MESSAGES_PER_INBOX = 3;

/** A rotating window of templates, so no two consecutive inboxes look alike. */
function seedMessages(address, rotation) {
    const now = Date.now();

    return Array.from({ length: MESSAGES_PER_INBOX }, (_, index) => {
        const template =
            TEMPLATES[(rotation + index * 2) % TEMPLATES.length];
        const id = nextId("msg");

        return {
            id,
            subject: template.subject,
            // Display form first: the API documents `sender` as "Name <addr>"
            // and utils/message.js falls back through from/fromAddress.
            sender: `${template.senderName} <${template.from}>`,
            from: template.from,
            fromAddress: template.from,
            to: address,
            receivedAt: new Date(
                now - template.minutesAgo * 60_000,
            ).toISOString(),
            body: template.body,
            attachments: template.attachments,
            // Everything seeded has already been parsed, so nothing trips the
            // PENDING retry path in useMessages.
            status: "READY",
            isRead: index > 1,
        };
    });
}

// --- Store -----------------------------------------------------------

export function createInboxRecord() {
    const localPart = `inbox-${Math.random().toString(36).slice(2, 8)}`;
    const address = `${localPart}@${DOMAIN}`;
    const token = nextId("mock");
    const createdAt = Date.now();

    const record = {
        id: nextId("inbox"),
        address,
        localPart,
        domain: DOMAIN,
        token,
        createdAt: new Date(createdAt).toISOString(),
        expiresAt: new Date(
            createdAt + INBOX_TTL_MINUTES * 60_000,
        ).toISOString(),
        extendCount: 0,
        messages: seedMessages(address, inboxes.size),
    };

    inboxes.set(token, record);
    return record;
}

export function getRecord(token) {
    return inboxes.get(token) ?? null;
}

/** Adds EXTEND_MINUTES to this inbox's expiry, never to another's. */
export function extendRecord(token) {
    const record = getRecord(token);
    if (!record) return null;

    const from = Math.max(new Date(record.expiresAt).getTime(), Date.now());

    record.extendCount += 1;
    record.expiresAt = new Date(
        from + EXTEND_MINUTES * 60_000,
    ).toISOString();

    return record;
}

/** The full message, or null when this inbox never received that id. */
export function getMessage(token, id) {
    const record = getRecord(token);
    if (!record) return null;
    return record.messages.find((message) => message.id === id) ?? null;
}

/**
 * The unread list, in the API's own list shape: no body, because the real
 * endpoint returns rows that each need a fetchMessage round trip.
 */
export function listUnread(token) {
    const record = getRecord(token);
    if (!record) return [];

    return record.messages
        .filter((message) => !message.isRead)
        .map(({ id, subject, sender, fromAddress, receivedAt }) => ({
            id,
            subject,
            sender,
            fromAddress,
            receivedAt,
        }));
}

/** Every message, oldest first, for the socket to replay as live arrivals. */
export function messagesFor(token) {
    const record = getRecord(token);
    if (!record) return [];

    return [...record.messages].sort(
        (a, b) => new Date(a.receivedAt) - new Date(b.receivedAt),
    );
}

export function inboxCount() {
    return inboxes.size;
}

/** Test seam: mock state is module-level, so it outlives a render. */
export function resetMockBackend() {
    inboxes.clear();
    sequence = 0;
}
