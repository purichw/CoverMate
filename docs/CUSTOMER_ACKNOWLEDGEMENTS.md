# Customer acknowledgement emails

Status: implemented with automated coverage, disabled by default. Deployment
does not enable sending unless the Production feature switch is configured.
No production environment variables or real customer sends were changed during
implementation. Real inbox delivery remains a separate activation check.

## Public workflow

- Home and Motor share an optional email field in the contact form. The existing
  name, LINE/phone, consent, submission states and contact destinations remain.
- A blank email remains valid and is omitted from the API payload, preserving
  the old request fingerprint. A supplied address is validated in the browser
  and API and saved as `caseRecord.contact.email` alongside LINE/phone.
- `publicCopy.contactEmail`, `publicCopy.contactEmailHint` and
  `contactSubmission.emailInvalid` are editable through the existing TH/EN CMS.
  Existing owner values, including intentionally blank copy, are not overwritten.
- Only a new consultation with an explicit email field can create an
  acknowledgement. An email typed in the LINE/phone field is not enrolled.
  Renewals, historical cases and manually created cases do not trigger one.
- Submission success means the case was saved, not that email was delivered.
  Missing/suppressed email and provider outages do not prevent an accepted case.
  The email is not marketing, an insurance quotation or a coverage confirmation.

## Sender and configuration

Use the existing Resend transport, not the Zoho mailbox SMTP service. Zoho
receives replies. The existing admin notification destination is unchanged.

The owner separately reported migrating the admin notification destination to
`covermate@covermateinsurance.com` and redeploying on 2026-09-24. That change
does not deploy or enable this locally implemented acknowledgement flow. Account
logins, Firebase UID/roles and recovery addresses are explicitly outside scope.

Server-only Vercel Production variables:

| Variable | Value/purpose |
| --- | --- |
| `CUSTOMER_ACK_ENABLED` | Exactly `true` to enable; absent/other values disable. |
| `CUSTOMER_ACK_REPLY_TO` | `covermate@covermateinsurance.com` (also the fallback). |
| `ADMIN_NOTIFICATION_FROM` | Existing verified Resend sender, e.g. `CoverMate <notifications@notify.covermateinsurance.com>`. |
| `RESEND_API_KEY` | Existing sending key. Never add to public/CMS configuration. |

Existing valid `ADMIN_NOTIFICATION_EMAIL` and Production runtime configuration
are also required because the sender shares the existing notifier. Independent
recovery uses the configured notification worker and its existing scheduler.
See [admin notifications](ADMIN_EMAIL_NOTIFICATIONS.md). Configuration changes
require deployment. Configuration presence alone does not prove sender-domain
verification, account quota, worker health or inbox delivery.

Preview, `cm_env=uat`, emulator and other non-production environments cannot
send acknowledgement emails, even if the feature switch is true. Tests inject
a fake provider with synthetic data; they do not use real Resend credentials.

## Queue, privacy and abuse protection

- The case, activity, admin alert and `caseEmailOutbox/customer-{caseId}` intent
  commit in one transaction. Nothing sends before this commit. Queue staging
  failures still fail that transaction rather than falsely acknowledging a case.
- The outbox is server-only under existing default-deny rules. Its recipient is
  personal data, just like the contact record; apply the existing privacy and
  retention process to both. Rate-limit document IDs use a secret-key HMAC, not
  the raw email. Rate-limit records have a two-day `expiresAt` timestamp.
- No names, free-text enquiries, health information, calculator answers, consent
  receipts or admin links are included in customer emails to unverified addresses.
  Only the server-generated reference, service hours and public contacts appear.
- For an address (case-insensitive), at most one acknowledgement intent per ten
  minutes and three per UTC day is queued. The site-wide ceiling is 40 customer
  acknowledgement intents per UTC day. Existing IP limits and App Check remain.
- Suppression does not reject the enquiry. Counters reserve intents, not proven
  deliveries, and are deliberately not refunded after failures. This cap reduces
  abuse; it is not a guarantee that all account traffic stays within a free plan.
  Admin alerts, reminders and other account usage share provider limits. Check
  the actual plan/quota before activation and monitor provider rejections.
- A transactional lease and stable provider idempotency key prevent concurrent
  or accepted-request replay from creating duplicate emails. First-send payload,
  recipient, sender and Reply-To are frozen for retries.
- Existing retry bounds apply: six attempts, at most 23 hours after first send.
  Unsent customer receipts also expire 24 hours after case submission. Disabling
  the switch cancels pending receipts on the next worker pass; already accepted
  messages cannot be recalled. Do not reset ambiguous jobs to a new key.
- Provider `accepted`/ID proves acceptance only. Check delivery/bounce status in
  Resend and verify the real inbox. There is no delivery webhook or automatic
  suppression-list integration in this change.

## Email rendering

`server/customer-email-template.cjs` composes the shared inline-table frame from
`server/admin-email-template.cjs`. It supports HTML/plain text and TH/EN using
the submitted language. The published header logo and service hours are used;
intentional blanks remain blank. LINE uses the original official icon and a
validated published LINE URL. A missing/invalid LINE URL falls back to the site.

The standalone Email Studio export is not a runtime dependency. Its arbitrary
editable content is not sent automatically to unverified recipients. This keeps
private case details and unreviewed operator content out of acknowledgement mail.
Browser screenshots verify geometry, not universal Outlook/Gmail/Zoho rendering.

## Activation checklist

1. Review the local form and TH/EN email previews and approve release scope.
2. Confirm Resend sender verification, account quota and worker health. Confirm
   the Reply-To Zoho inbox can receive and reply; do not change website DNS.
3. Configure the two customer variables in Production and deploy through the
   normal release gate. Do not enable real delivery in UAT.
4. With the owner's approval, submit one clearly labeled test using an inbox
   they control. Check one case, one customer intent, one owner alert and provider
   ID; then independently verify inbox receipt and Reply-To in Zoho.
5. Replay the same request ID to confirm no duplicate. Monitor provider logs for
   delivery failures. Disable the feature switch and redeploy to stop new sends.

Steps 2-5 were not performed in this implementation pass.

## Targeted checks

```sh
node scripts/contact-submission-check.mjs
node scripts/calculator-contract-check.mjs
npm run check:contact:intake
npm run check:customer-email
npm run check:customer-email:browser
npm run check:admin-email
npm run check:email-scheduler
npm run check:admin-email-template
npm run check:visitor-source
git diff --check
```

Firebase emulator checks require JDK 21+. Browser tests use local fixtures and
block external traffic. Evidence is written under `uat-results/customer-email/`:
TH/EN form and acknowledgement screenshots plus `browser-report.json`.
The browser fixture sets the contact band to sage rather than the old dark source
default; screenshots are local fixture evidence, not a production/CMS snapshot.
`node scripts/customer-email-browser-check.mjs --serve` starts a read-only local
form and email preview with API submissions disabled.
