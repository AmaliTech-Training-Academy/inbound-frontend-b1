const NOW = Date.now()
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

export const MOCK_MESSAGES = [
  {
    id: '849201a',
    senderName: 'Notion Team',
    senderEmail: 'notify@m.notion.so',
    recipientEmail: 'inbox-user-8921@inbound.mail',
    subject: 'Your Notion login code is 849 201',
    receivedAt: new Date(NOW - 12 * MINUTE).toISOString(),
    verificationCode: '849 201',
    contextUrl: 'https://notion.so/login?code=849201',
    contextLabel: 'Notion Workspace',
    contextActionText: 'Open Notion Workspace',
    actionText: 'Log in to Notion',
    htmlBody: `<div style="font-family: inherit; color: inherit; line-height: 1.6;">
  <p style="margin-top: 0; font-size: 15px; font-weight: 500;">Hello,</p>
  <p>We received a sign-in request for your account and workspace <strong style="color: #111213;">“Acme Product Lab.”</strong></p>
  <p>Your verification code is <strong style="font-family: 'JetBrains Mono', monospace; font-size: 14px; background-color: #f4f5f7; padding: 2px 6px; border-radius: 4px; color: #111213;">849 201</strong>. Please enter this code to continue, or click the button below to sign in directly:</p>

  <div style="margin: 18px 0 20px 0;">
    <a href="https://notion.so/login?code=849201" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 8px; background-color: #111111; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 13px; padding: 10px 18px; border-radius: 6px;">
      <span>Log in to Notion</span>
      <span aria-hidden="true">&rarr;</span>
    </a>
  </div>

  <p style="font-size: 13px; color: #6b6d73;">This one-time code expires in 10 minutes. If you did not request this login code, you can safely ignore this email.</p>

  <p style="margin-top: 20px; font-size: 13px; color: #6b6d73;">
    Attached are your workspace onboarding checklist and security policy documents for reference.
  </p>

  <hr style="border: none; border-top: 1px solid #e4e5e9; margin: 24px 0 16px 0;" />

  <p style="font-size: 12px; color: #9a9ca3; margin-bottom: 0;">
    Notion Labs, Inc. &bull; 548 Market St #74512 &bull; San Francisco, CA 94104
  </p>
</div>`,
    textBody: `Hello,

We received a request to sign in to your Notion account or join the workspace “Acme Product Lab.”

Your verification code is 849 201. Please enter this code to continue, or click the button below to sign in directly.

This code will expire in 10 minutes. If you did not request this login code, you can safely ignore this email.

Thanks,
The Notion Team`,
    attachments: [
      { id: 'att_01', filename: 'notion_workspace_onboarding_guide.pdf', type: 'PDF', size: '1.8 MB' },
      { id: 'att_02', filename: 'acme_product_lab_security_policy.pdf', type: 'PDF', size: '420 KB' },
      { id: 'att_03', filename: 'team_roster_and_roles.csv', type: 'CSV', size: '64 KB' },
    ],
    scanInfo: 'Sandboxed scan complete · 0 threats · auto-purged on expiry',
  },
  {
    id: '7123bf9',
    senderName: 'Digital Delivery Network',
    senderEmail: 'billing@delivery-net.org',
    recipientEmail: 'inbox-user-8921@inbound.mail',
    subject: 'Monthly Subscription Statement and Tax Receipt',
    receivedAt: new Date(NOW - 49 * MINUTE).toISOString(),
    verificationCode: null,
    htmlBody: `<div style="font-family: inherit; color: inherit;">
  <h2 style="font-size: 18px; margin-top: 0; font-weight: 600;">Statement of Account</h2>
  <p>Thank you for subscribing to Digital Delivery Network. Here is your service breakdown for the active billing cycle:</p>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
    <thead>
      <tr style="background-color: #f4f5f7; text-align: left;">
        <th style="padding: 8px 12px; border: 1px solid #e4e5e9;">Service Item</th>
        <th style="padding: 8px 12px; border: 1px solid #e4e5e9;">Quantity</th>
        <th style="padding: 8px 12px; border: 1px solid #e4e5e9;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px 12px; border: 1px solid #e4e5e9;">Inbound Relay Core Service</td>
        <td style="padding: 8px 12px; border: 1px solid #e4e5e9;">1</td>
        <td style="padding: 8px 12px; border: 1px solid #e4e5e9;">$19.00</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; border: 1px solid #e4e5e9;">Dedicated Domain Gateway</td>
        <td style="padding: 8px 12px; border: 1px solid #e4e5e9;">1</td>
        <td style="padding: 8px 12px; border: 1px solid #e4e5e9;">$5.00</td>
      </tr>
      <tr style="font-weight: bold; background-color: #fcfdfe;">
        <td colspan="2" style="padding: 8px 12px; border: 1px solid #e4e5e9;">Total Amount Paid</td>
        <td style="padding: 8px 12px; border: 1px solid #e4e5e9;">$24.00 USD</td>
      </tr>
    </tbody>
  </table>
  <p>Attached are your official PDF tax invoice and CSV transactional ledger.</p>
</div>`,
    attachments: [
      { id: 'att_1', filename: 'invoice-2026-09.pdf', type: 'PDF', size: '245 KB' },
      { id: 'att_2', filename: 'payment_receipt.png', type: 'PNG', size: '1.2 MB' },
      { id: 'att_3', filename: 'transaction_ledger.csv', type: 'CSV', size: '48 KB' },
    ],
    scanInfo: 'Sandboxed scan complete · 0 threats · auto-purged on expiry',
  },
  {
    id: '5594aa2',
    senderName: 'CI/CD Build Cluster',
    senderEmail: 'builds@internal-ci.net',
    recipientEmail: 'inbox-user-8921@inbound.mail',
    subject: 'Deployment pipeline failed: Test suite regression',
    receivedAt: new Date(NOW - 2 * HOUR).toISOString(),
    verificationCode: null,
    textBody: `Build pipeline #4928 failed for branch 'main' (commit e742b6).

Failure summary:
• Test: spec/security/iframe_sandbox_spec.js:42
• Error: Expected tracking pixel to be blocked by CSP
• Exit code: 1

Detailed console log and artifact archive are attached.`,
    attachments: [
      { id: 'att_4', filename: 'build_output.log', type: 'LOG', size: '780 KB' },
      { id: 'att_5', filename: 'artifacts_bundle.zip', type: 'ZIP', size: '3.4 MB' },
    ],
  },
  {
    id: '2209cc1',
    senderName: 'John Doe',
    senderEmail: 'john.doe@example.org',
    recipientEmail: 'inbox-user-8921@inbound.mail',
    subject: 'Quick test on plain text formatting',
    receivedAt: new Date(NOW - 3 * HOUR).toISOString(),
    verificationCode: null,
    textBody: `Hello,

Line one.

Line two.

Thanks,
John`,
    attachments: [],
  },
  {
    id: '89104fa',
    senderName: 'Design Systems QA',
    senderEmail: 'assets@design-review.amalitech.org',
    recipientEmail: 'inbox-user-8921@inbound.mail',
    subject: 'Q3 Brand Assets and Design Tokens Package (8 files)',
    receivedAt: new Date(NOW - 5 * HOUR).toISOString(),
    verificationCode: null,
    textBody: `Hi team,

Here are the exported brand guidelines, vectors, stylesheets, and documentation assets for the Q3 release review.

Please verify that all attachments download correctly and that long filenames render cleanly without layout overflow.

Included attachments (8 files):
1. Inbound_Brand_Guidelines_2026_Final_Draft_v3.pdf
2. logo_mark_monochrome_transparent_highres.png
3. typography_specifications_jetbrains_inter.css
4. transaction_ledger_q3_financial_audit_final.csv
5. product_overview_presentation_deck_september.pdf
6. security_architecture_diagram_high_resolution.png
7. system_diagnostics_and_telemetry_report.log
8. complete_design_tokens_release_bundle.zip

Best regards,
AmaliTech QA Team`,
    attachments: [
      { id: 'att_q1', filename: 'Inbound_Brand_Guidelines_2026_Final_Draft_v3.pdf', type: 'PDF', size: '4.8 MB' },
      { id: 'att_q2', filename: 'logo_mark_monochrome_transparent_highres.png', type: 'PNG', size: '1.4 MB' },
      { id: 'att_q3', filename: 'typography_specifications_jetbrains_inter.css', type: 'CSS', size: '32 KB' },
      { id: 'att_q4', filename: 'transaction_ledger_q3_financial_audit_final.csv', type: 'CSV', size: '128 KB' },
      { id: 'att_q5', filename: 'product_overview_presentation_deck_september.pdf', type: 'PDF', size: '8.2 MB' },
      { id: 'att_q6', filename: 'security_architecture_diagram_high_resolution.png', type: 'PNG', size: '2.1 MB' },
      { id: 'att_q7', filename: 'system_diagnostics_and_telemetry_report.log', type: 'LOG', size: '640 KB' },
      { id: 'att_q8', filename: 'complete_design_tokens_release_bundle.zip', type: 'ZIP', size: '14.5 MB' },
    ],
    scanInfo: 'Sandboxed scan complete · 0 threats · auto-purged on expiry',
  },
]
