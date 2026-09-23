# New website case email alerts

The public form queues an alert to the configured CoverMate inbox after the case
commits. This system alert is separate from per-owner email preferences and
scheduled follow-up reminders, which remain unavailable.

## Configuration

Server-only Vercel Production variables:

- `RESEND_API_KEY`: key permitted to send from the verified sender domain.
- `ADMIN_NOTIFICATION_FROM`: `CoverMate <notifications@notify.covermateinsurance.com>`.
- `ADMIN_NOTIFICATION_EMAIL`: `covermate@proton.me`.

Environment changes require a new deployment. Configuration presence is not
delivery evidence. The key and arbitrary provider responses never reach the
browser or logs. Recipient and sender never come from form input.

## Contract and limits

- `api/leads.js` atomically commits case, creation activity, in-app marker and
  `caseEmailOutbox/{caseId}`. Both production runtime and namespace are required;
  UAT, previews and emulators never queue real emails.
- `server/admin-notification.cjs` dispatches after commit using Vercel
  `waitUntil`. Email failure cannot turn a saved enquiry into a failed form.
  Replaying the accepted request resumes the same intent.
- Email contains only case reference, submission time and a fixed Admin URL.
  Customer contact, free text and calculator details remain inside Admin.
- First attempt freezes payload/from/to. A 30-second transactional lease
  prevents simultaneous sends. Retries reuse identical payload and Resend key.
- Up to three attempts run immediately: six-second request timeout and 1/3-second
  backoff. Transient failures stay pending. Owner notification refresh resumes a
  small batch of pending/stalled intents. Six total attempts or 23 hours after
  first attempt requires review, inside Resend's 24-hour deduplication window.
- **No independent scheduler exists.** If immediate retries fail and neither
  form replay nor owner notification refresh occurs, the retained intent waits.
  This is not guaranteed eventual delivery or a scheduled follow-up reminder.
- Historical enquiries and manually entered cases are never backfilled.
- Existing default-deny Firestore Rules protect the new outbox. No client write
  access, Rules deployment, migration or new credentials are required.

## Admin and evidence

The HTML and plain-text variants share `server/admin-email-template.cjs`.
Both new-case and test emails use the same frame/header, metadata and primary
button. Colors, rounded rust CTA and typography follow the current Home/Motor
visitor design. Email markup uses inline table styles instead of browser-only
components or CSS variables, with Google Sans/Thai and safe client fallbacks.
The logo comes from the published Thai `brand.media.headerLogo`; an intentional
blank remains blank. First-attempt HTML is frozen with the payload so a later
Publish or template deploy cannot change a retried Resend request.

Owner-only `GET /api/ops/notification-capabilities` returns
`intakeEmailAvailable` and `intakeEmailRecipient`. Availability means complete
configuration, not a successful provider call. Existing `emailAvailable:false`
and `schedulerAvailable:false` still describe personal/scheduled notifications.

Owner-only `POST /api/ops/notification-test-email` accepts an empty body and an
idempotency key. It sends a labeled test to the system inbox without creating a
customer case. One new test per minute is allowed. UI retains its retry key on
failure until provider acceptance.

Outbox `accepted`, `providerId` and `acceptedAt` prove Resend acceptance, **not
inbox delivery**. Check the provider ID in Resend for delivered/bounced events;
there is no delivery webhook. `failed` and `needs_review` require checking Resend
and correcting configuration before an operator-approved retry. Never blindly
reset expired ambiguous attempts or change their frozen payload.

Checks: `npm run check:admin-email` (real emulator transactions/fake provider),
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
