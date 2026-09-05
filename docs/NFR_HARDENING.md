# Non-functional hardening

## Scope

Requested 2026-09-05: implement security, concurrent-write protection, abuse
controls, recovery, observability, first-load performance, CSP, and stronger
regression/accessibility coverage. Verify Admin draft/publish against a separate
Visitor browser context and persistent backend data.

## Verification plan

- Security: real Firestore emulator allow/deny tests for public, unknown,
  inactive, read-only, operator, owner, and UAT-only identities.
- Data: concurrent CMS/Operations edits fail explicitly without lost updates;
  duplicate lead retries do not create extra records.
- Recovery: inspect cloud backup/PITR, document recovery objectives, and run an
  isolated restore rehearsal. Never restore over production.
- Runtime: slow/offline dependencies, early content visibility, external
  resource errors, privacy-preserving diagnostics, and enforced CSP.
- E2E: separate admin/visitor sessions; edit, blank text, save draft, preview,
  publish, fresh visitor readback, and restore fixture. Test both home/motor.
- Browsers/accessibility: Chromium and WebKit, keyboard, focus, automated axe,
  zoom, mobile layout, and reduced motion.

## Implementation and activation

| Area | Candidate implementation | Activation / remaining boundary |
| --- | --- | --- |
| Access control | Unknown roles deny access; owner-only CMS writes; read-only cannot mutate Operations or analytics settings | App and rules must be released in the migration order below |
| Data integrity | CMS transactions compare loaded revisions and atomically publish live/draft/version; Operations CAS plus client If-Match; idempotent lead IDs | Old API clients without If-Match retain backward compatibility, but concurrent server writes still use CAS |
| Abuse controls | App Check validates the registered web app; 5 requests/minute and 30/day per HMAC IP/environment; bounded request bodies and server timeouts | Hosted real App Check form submission and Firestore UAT readback passed; minimum score remains 0.5 |
| Recovery | AES-256-GCM encrypted export, authenticated format, checksum, readback verification, isolated restore | Daily GitHub schedule becomes active only after workflow is pushed to main |
| Observability | Redacted runtime/CSP/LCP/INP/CLS events and request IDs; read-only rendered-page availability check every 6 hours | Vercel log collection starts after deploy; no external alerting/SLO dashboard or field percentiles claimed |
| First load | Public REST hydration without Auth/Firestore SDK; lazy App Check; pinned local React/ReactDOM; existing boot fallback preserved | Local lab budgets are not field Core Web Vitals evidence |
| CSP | Enforced source, frame, base, object, form restrictions; X-Frame-Options DENY | DC runtime still needs unsafe-inline/unsafe-eval/blob; this is not strict CSP |
| Regression / maintenance | Real emulator Auth/Rules/API/Publish tests, Chromium/WebKit, axe, keyboard/reflow, targeted strict JS types, generated-source validation | Automated axe does not replace screen-reader testing on real devices |

No Firebase billing plan was enabled. Managed backup/PITR was deliberately not
enabled, per the user's choice. Production content is not edited by the release
checks; all form and publish fixtures use the isolated UAT namespace.

## Recovery runbook

- Daily schedule: 03:17 Asia/Bangkok. GitHub artifact retention: 14 days.
- Target recovery point: the most recent successful daily export, normally up
  to 24 hours old. GitHub scheduled jobs can be delayed; this is not a guaranteed
  RPO or point-in-time recovery service.
- The snapshot is a paginated export, not an atomic database snapshot. Writes
  during capture may produce different document update times.
- Scope: all Firestore documents/subcollections. Firebase Auth accounts, Storage
  objects, repository files, and cloud configuration are not included.
- Read budget defaults to 10,000 documents and a bounded number of requests.
  Exceeding the budget fails the job without writing a partial backup.
- Encryption uses a random 32-byte base64 key, HKDF-SHA256, AES-256-GCM and gzip.
  Plaintext is not written to disk. Wrong keys/tampering fail authentication.
- Cloud reads use the read-only `covermate-backup` service account. GitHub uses
  Workload Identity Federation limited to this repository ID, main ref, and
  `.github/workflows/backup.yml`; no downloadable cloud private key is used by
  the backup workflow.
- GitHub repository variable `COVERMATE_BACKUP_WIF_PROVIDER` and secret
  `COVERMATE_BACKUP_KEY` are configured. Local recovery key is in ignored
  `.env.server.local` (mode 0600). Keep a separate user-controlled password-vault
  copy before relying on this as disaster recovery. GitHub secrets cannot be
  downloaded later; losing the key makes these backups unrecoverable.
- Stay within the account's free GitHub Actions/artifact and Firestore read
  allowances. This avoids paid Firebase managed backups, but is not a promise
  of unlimited free GitHub resources.

```sh
node --env-file=.env.server.local scripts/backup.mjs create
node --env-file=.env.server.local scripts/backup.mjs verify <encrypted-file>
FIRESTORE_EMULATOR_HOST=127.0.0.1:8088 node --env-file=.env.server.local scripts/backup.mjs restore-emulator <encrypted-file>
```

Restore only accepts the fixed loopback emulator, creates a new recovery prefix,
and compares every restored document with the decrypted snapshot. It cannot
overwrite production. A production restore requires a separately reviewed
migration and explicit authorization.

Rehearsal evidence: 15 documents backed up, decrypted, and restored/read back in
`demo-covermate/recovery-1788581506430`, with zero production writes. Encrypted
snapshot SHA-256:
`ea7727df22e775737f199e9353773fbaa12d8a616ffc962412b0de8b43c5ba3c`.
This proves format/restore integrity, not a measured production recovery-time SLA.

## Test evidence

Evidence is local and ignored under `uat-results/nfr/`:

- `cloud-publish.json`, `cloud-publish-visitor.png`, `cloud-publish-admin.png`:
  actual Firebase Auth custom-token login with an active UAT-only owner allowlist
  record; actual Firestore `sites/covermate-uat` writes; actual editor input and
  Publish confirmation clicks; a fresh unauthenticated browser sees the change.
  Initially run against the local candidate, then against the hosted preview
  with real App Check form submission and Admin lead-list readback. Original UAT
  states were encrypted before testing and restored afterward; test allowlist
  was deactivated. Concurrent changes from other identities are not overwritten.
- `e2e.json`: real Auth/Firestore emulator publish, blank-slot persistence,
  draft isolation, stale-write rejection, Chromium and WebKit. WebKit can report
  a cancelled emulator Listen stream during document teardown; only that exact
  navigation-time cancellation is classified separately. Runtime errors on the
  active page remain failures.
- `journeys.json`: real public form/API/backend/Admin readback, retry after an
  offline failure without losing input, same-document Admin module switches,
  admin-only preview/panel navigation, new-tab Public site, Home-to-motor CTA,
  keyboard FAQ, 320px CSS reflow, both languages and routes with axe.
- Security tests use actual emulator enforcement, including unknown/inactive,
  read-only, operator, owner, UAT-only, revision and immutable-history checks.
  Non-emulator App Check also rejects missing/forged tokens. `hosted-form.json`
  and `hosted-form.png` prove valid hosted-token attestation, actual form clicks,
  server API submission and Firestore UAT readback without emulator bypass.
  The passing preview is `covermate-9z96afrwp-purichwc-1517s-projects.vercel.app`.
- `npm run smoke` covers the existing full desktop/tablet/mobile surface.
  `npm run check:ci` combines source/contracts/boot/needs/editor/analytics/ops/
  performance checks and smoke. `npm run check:emulators` runs the real backend
  suite; Java 21 and Chromium/WebKit are required.
- Production dependencies: `npm audit --omit=dev --audit-level=high` reported
  zero vulnerabilities. Development tools still report seven moderate findings;
  no forced breaking dependency upgrade was applied.

Accessibility corrections preserve layout/branding: dark action-token variants
meet contrast requirements, phone icon links have names, PDPA uses valid list
structure, and language switches synchronize HTML lang, metadata, and CMS slots.
The 320px check is reflow coverage, not a claim of physical-device 200% zoom or
VoiceOver verification. Only small contract/encryption/telemetry modules are
strict-typechecked; this is not whole-project TypeScript conversion.

## Release prerequisites and rollback

Activation evidence (2026-09-05): server secrets and the Node runtime option
are configured for Preview/Production; Firestore rules were deployed after
the working API/site. Real hosted UAT publish/form/Admin readback passed again
after the rules change. Production App Check accepted a real token and rejected
missing consent before writing any record. Anonymous draft/lead reads and
direct UAT lead writes returned 403; unauthenticated APIs returned 401.

The [first GitHub backup run](https://github.com/purichw/CoverMate/actions/runs/33947107195)
succeeded using WIF. Its downloaded encrypted artifact decrypted and verified
26 documents locally. Daily scheduling is active. The
[production availability run](https://github.com/purichw/CoverMate/actions/runs/33947374828)
passed home, motor, and Admin Login. Login was included in the self-hosted React
resource map after the enforced CSP exposed its remaining CDN dependency.
Scheduled success is not a substitute for keeping the recovery key separately.

Final production smoke also exercises real LCP beacon delivery (HTTP 202),
not just the installed flag. Exact telemetry/favicon/Google tag requests
cancelled within 2.5 seconds of a document navigation are classified separately;
active-page network failures and HTTP errors remain failures. Visitor analytics
is suppressed across the entire `/admin/*` namespace before auth hydration,
including when the shared route module has not loaded. Public Google tag
diagnostics use the exact `www.googletagmanager.com` connect source, consistent
with [Google's CSP guidance](https://developers.google.com/tag-platform/security/guides/csp).

1. Configure `COVERMATE_SERVER_CREDENTIALS`, `COVERMATE_RATE_LIMIT_SECRET`, and
   `COVERMATE_RECAPTCHA_SITE_KEY` in Vercel server environments. The credential
   must never use a public/client env prefix. Keep local `.env*` and `.tools/`
   excluded from deploys and source control. Rotate the forms service-account
   key on exposure and prefer platform federation when available.
   Vercel also requires `NODE_OPTIONS=--experimental-require-module` for the
   Firebase Admin 14 / jwks-rsa / jose dependency chain. Without it, the hosted
   function fails at startup with `ERR_REQUIRE_ESM`, despite passing locally.
   This follows [Vercel's documented runtime option](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration).
2. Register the actual preview hostname in the reCAPTCHA key domain allowlist;
   test a valid token and public lead submission on the hosted preview.
   Allow domain configuration time to propagate. CSP must allow the SDK's
   `https://content-firebaseappcheck.googleapis.com` token-exchange endpoint;
   this exact source is covered by the security contract check.
3. Capture a fresh encrypted backup; deploy the candidate APIs/site, verify new
   form writes and Admin publish, then deploy reviewed Firestore rules. Old
   browser tabs may require refresh because direct anonymous lead writes are
   intentionally denied. Do not deploy rules first while the old form is live.
4. Re-run hosted smoke and production read-only asset/route checks; enable
   scheduled workflows by pushing main only when release is authorized.
5. Roll back app and rule changes together if the old client is restored;
   reverting only Vercel would leave its direct-write form blocked. Do not roll
   back CMS data automatically. Preserve revision counters during any restore.

Rate-limit `expiresAt` and lead `retentionReviewAt` fields are review markers,
not automatic deletion promises. No TTL policy, production deletion job, paid
PITR, or new billing account is enabled by this release.
