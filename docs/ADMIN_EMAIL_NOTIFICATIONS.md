# System inbox email alerts

Optional customer acknowledgements reuse this transport and outbox, behind a
separate disabled-by-default switch. They have a different recipient and a
minimal public-only template; see [customer acknowledgements](CUSTOMER_ACKNOWLEDGEMENTS.md).
This does not change the system inbox destination described below.

The public form queues an alert to the configured CoverMate inbox after the case
commits. Scheduled follow-up alerts and daily overdue digests go to this same
system inbox. Per-owner email addresses/preferences and LINE sending remain
unavailable; changing a status or note does not itself send an email.

## Configuration

Server-only Vercel Production variables:

- `RESEND_API_KEY`: key permitted to send from the verified sender domain.
- `ADMIN_NOTIFICATION_FROM`: `CoverMate <notifications@notify.covermateinsurance.com>`.
- `ADMIN_NOTIFICATION_EMAIL`: `covermate@covermateinsurance.com`.
- `ADMIN_NOTIFICATION_CRON_SECRET`: at least 32 characters; only the dedicated
  worker caller receives it, never the Resend key or Firebase credentials.
- `ADMIN_NOTIFICATION_SCHEDULER_ENABLED`: `true` after configuring the worker.

Environment changes require a new deployment. Configuration presence is not
delivery evidence. The key and arbitrary provider responses never reach the
browser or logs. Recipient and sender never come from form input.

### Inbox migration, 2026-09-24

The owner reported updating `ADMIN_NOTIFICATION_EMAIL` to the Zoho mailbox
above and redeploying. Scope is operational/customer email only: do not change
Google sign-in, Firebase UID/allowlist, service-account ownership or recovery
accounts. Actual receipt in the new inbox still needs verification with the
Admin notification test action; a provider acceptance message alone is not
proof of inbox delivery.

New, not-yet-attempted alerts use the current environment recipient. Existing
jobs with a frozen payload keep their original destination on retry. Preserve
those payloads and idempotency keys; do not bulk-rewrite the outbox to migrate it.
Changing the system inbox does not enable customer acknowledgements, which have
their own feature switch and release requirements.

## Contract and limits

- `api/leads.js` atomically commits case, creation activity, in-app marker and
  `caseEmailOutbox/{caseId}`. Both production runtime and namespace are required;
  UAT, previews and emulators never queue real emails.
- `server/admin-notification.cjs` dispatches after commit using Vercel
  `waitUntil`. Email failure cannot turn a saved enquiry into a failed form.
  Replaying the accepted request resumes the same intent.
- New-case and follow-up emails contain case reference/time, customer name,
  contact channels, interest/topic and up to 240 characters of the original
  enquiry. The owner explicitly authorized these fields. Internal working notes,
  calculator snapshots and privacy receipts remain inside Admin. Links contain
  only a validated opaque case ID and require the existing owner sign-in.
- First attempt freezes payload/from/to. A 30-second transactional lease
  prevents simultaneous sends. Retries reuse identical payload and Resend key.
- Up to three attempts run immediately for a new case: six-second request
  timeout and 1/3-second backoff. Later retries use 5/10/20-minute delays and the
  independent worker. Six total attempts or 23 hours after the first attempt
  requires review, inside Resend's 24-hour deduplication window. There is no
  unlimited retry or new-key resend after ambiguous expiry.
- `queueAt` is an indexed numeric due/lease time. Terminal jobs move to a sentinel
  future value; the worker scans at most five due jobs per tick, one attempt per
  job, with a 20-second work budget. Backlogs may take additional ticks.
- Historical enquiries and manual creations do not generate new-case emails.
- Existing default-deny Firestore Rules protect the new outbox. No client write
  access, Rules deployment, migration or new credentials are required.

## Admin and evidence

The HTML and plain-text variants share `server/admin-email-template.cjs`.
Both new-case and test emails use the same frame/header, metadata and primary
button. Colors, rounded rust CTA and typography follow the current Home/Motor
visitor design. Email markup uses inline table styles instead of browser-only
components or CSS variables, with Google Sans/Thai and safe client fallbacks.
Logo, heading, introduction, CTA and footer share a centered axis. Case metadata
keeps explicit left alignment, with balanced top and bottom padding. Table-cell
padding and HTML alignment attributes preserve the grouping in email clients.
The logo comes from the published Thai `brand.media.headerLogo`; an intentional
blank remains blank. First-attempt HTML is frozen with the payload so a later
Publish or template deploy cannot change a retried Resend request.

Owner-only `GET /api/ops/notification-capabilities` returns
`intakeEmailAvailable`, `intakeEmailRecipient`, `followUpEmailAvailable`,
`overdueDigestAvailable`, `schedulerAvailable`, `schedulerCadenceMinutes` and
`schedulerLastRunAt`. Scheduled availability requires the switch/secret, Resend
configuration and a successful worker heartbeat within the last 15 minutes.
This is worker readiness, not evidence that a particular email was delivered.
`emailAvailable:false` still describes unsupported personal email preferences.

Owner-only `POST /api/ops/notification-test-email` accepts an empty body and an
idempotency key. It sends a labeled test to the system inbox without creating a
customer case. One new test per minute is allowed. UI retains its retry key on
failure until provider acceptance.

Outbox `accepted`, `providerId` and `acceptedAt` prove Resend acceptance, **not
inbox delivery**. Check the provider ID in Resend for delivered/bounced events;
there is no delivery webhook. `failed` and `needs_review` require checking Resend
and correcting configuration before an operator-approved retry. Never blindly
reset expired ambiguous attempts or change their frozen payload.

## Independent schedule and lifecycle

`cron-job.org` calls `GET https://covermateinsurance.com/api/notification-worker`
every five minutes with `Authorization: Bearer <ADMIN_NOTIFICATION_CRON_SECRET>`.
The endpoint responds only with aggregate counts, has no customer payload and
rejects missing/wrong credentials or non-production delivery environments. The
external scheduler must not receive customer data, Resend keys or Firebase
credentials. Enable failure/recovery notifications on the scheduler. Vercel
Hobby's own daily-only Cron is deliberately not used for five-minute work.

`server/admin-email-scheduler.cjs` owns a durable lease and heartbeat in
`systemJobs/adminEmailScheduler`. Bootstrap pages through 100 existing canonical
cases/old outbox rows at a time; it never mutates the original customer case or
imports legacy tasks. Pending pre-upgrade outbox rows receive their queue index.

- Creating/changing an enabled follow-up stages `follow-up-<hash(caseId:revision)>`
  atomically with the case. This includes manually entered cases. Nothing sends
  before its due time; the first available tick at/after the due time sends it.
- Before every follow-up attempt, the current case must still be open, reminder
  enabled and have the same revision and due time. Otherwise the intent is
  cancelled. Already accepted mail cannot be recalled. Reopening alone does not
  restore an old reminder.
- The first successful tick at/after 09:00 Asia/Bangkok stages one
  `overdue-YYYY-MM-DD` digest. Only open, reminder-enabled cases due before the
  current Bangkok calendar day qualify. No empty digest is sent; there is no
  backfill of missed historical daily summaries.
- Digest contains the total and up to 10 earliest overdue cases. Eligibility is
  checked again before the first send. Retries preserve the exact frozen payload;
  unsent previous-day digests expire rather than arriving as stale daily mail.
- Provider/network outages, service scheduling delays and queues can delay
  delivery; the five-minute cadence is not an exact-time delivery guarantee.

Disable `ADMIN_NOTIFICATION_SCHEDULER_ENABLED` and redeploy to stop scheduled
delivery. Turn off a case reminder or close/reschedule it to invalidate its
pending follow-up. Preserve outbox records when rolling back; never clear a
provider idempotency receipt in order to retry it.

Checks: `npm run check:admin-email` (real emulator transactions/fake provider),
`npm run check:email-scheduler` (leases, revisions, cancellation, digest and retry),
`npm run check:contact:intake` (receipt, replay, consent, no external send), and
`node scripts/cases-browser-check.mjs --notifications` (configured/unconfigured
UI, retry-key reuse and acceptance feedback), and
`node scripts/admin-email-template-check.mjs` (both template variants, responsive
rendering and image-blocked readability). Browser screenshots do not certify
every mail client's rendering; plain text remains available independently.

Rollback through the normal commit/CI/deployment gate. Existing cases and outbox
delivery evidence remain intact; rollback must not delete or replay them.

References: [Resend API](https://resend.com/docs/api-reference/emails/send-email),
[Idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[Vercel waitUntil](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package).
