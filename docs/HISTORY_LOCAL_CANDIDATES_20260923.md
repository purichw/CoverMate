# Historical local candidate notes — September 23, 2026

Archived on 2026-09-24 from the original working checkout during documentation
reconciliation. These notes preserve the original scope, local evidence and
limitations; words such as “current”, “local only” or “pending” describe those
historical checkpoints. They are not new authorization or current release status.

Use [HANDOFF.md](HANDOFF.md), [REFACTOR_20260924.md](REFACTOR_20260924.md) and
[RELEASE_VISITOR_20260924.md](RELEASE_VISITOR_20260924.md) for the newer source
and verification boundaries. In particular, visitor work is now upstream, the
old 775KB measurement is historical, and legacy Ops test fixtures now live in
independent modules. No old candidate or content-migration instruction below
should be executed merely because this archive retains it.

## September 23 Home Advisor Identity Candidate

- Local only, explicitly **no production deploy**. Limited to the existing
  Home Hero proof, the introduction before licence cards, and Contact description.
- CMS v15 adds one optional TH/EN `advisor.*` profile. Published CMS was read
  without writing; no real name or portrait is available. Both remain blank,
  never copied from the supplied mockup. Brand fallback remains visible.
- Hero is permanent on Home, retaining AIA, existing licence numbers, OIC link
  and hours. Mobile places it after Hero copy/CTA. Portrait is 56x70 beside the
  name; no image duplication in Contact/licences. Motor/Footer are untouched.
- Existing Contact body is retained and restored when no localized name exists
  (or both custom intro fragments are blank). Individual fragments and the one
  name retain canonical inline/CMS ownership. No form/consent/calculation changes.
- Focused checks: `check:advisor`, `check:advisor:browser`, `check:cms`,
  `check:contact`, `check:contact:browser`, `check:bundles`, `check:types`,
  Admin structure and Motor contract regression. Evidence lives under
  `uat-results/home-advisor/`; `synthetic-layout-*` uses explicit test markers
  and an existing logo to exercise the optional image slot, not a real advisor.
- Local preview: `node scripts/home-advisor-check.mjs --serve`. In-memory CMS
  drafts only, external requests blocked, publishing/API writes disabled.
  Production publish, actual photo upload, real enquiries and full release
  verification are intentionally deferred; no new authorization is implied.

## September 23 Admin Structure Reconciliation

- Local only, not published or deployed. The Sections list now uses the same
  route section projection as the visitor, retaining hidden sections for restore.
  Motor no longer appends local sections absent from its configured order.
- Logo grid and final licence band have separate editor entries; licence data
  stays in `sections.@insurers.cards`. Motor edits only broker cards. Licence
  visibility still depends on the insurer section plus individual cards; there
  is no new independent switch or duplicated CMS section.
- Licences and Footer are fixed end-of-page entries. Reorder boundaries are
  disabled and cannot modify these bands. Footer opens its existing design
  group and uses the existing shared visibility setting.
- Updated comparison/calculator/contact labels, shared-page scope, live anchor
  labels and shortcuts to design groups. Home coverage heading edits its actual
  `ui.coverageLabel` owner. No data migration/schema bump or auth changes.
- `check:admin-structure` and `check:admin-structure:browser` cover projection,
  route-isolated ordering, visibility, canonical editing, draft persistence and
  desktop/mobile panel fit. Browser tests block external traffic and write only
  in-memory draft fixtures; no lead, publish or production write.
- Local preview: `node scripts/admin-structure-browser.mjs --serve` (loopback,
  memory-only drafts, publishing/API submissions disabled). Evidence:
  `uat-results/admin-structure/`. Full release/auth/backend suites are deferred
  to a separately authorized release.

## September 23 Contact Submission Candidate

- Home swaps the existing form body through pending, slow, success, confirmed
  failure, unknown and rate-limited panels using the supplied reference.
  Shared owners: `covermate-submission.mjs`, the existing transport and
  `src/visitor/submission.{html,css}`. Motor/renewal retain their presentation.
- Schema v14 adds localized CMS copy with missing-only migration. Details and
  evidence are in `CONTACT_SUBMISSION.md`. Chromium/WebKit and isolated Firebase
  emulator checks passed; no real enquiry, LINE message, push or deploy here.
- Release this client with the persisted `{accepted,reference}` receipt backend.
  Unknown remains read-only plus LINE until replay-key lifetime is guaranteed;
  it never silently resubmits with a new key.

## September 23 Home Needs V1 Candidate

- Local only. Owner approved enabling Needs calculator on Home **when next
  deploying**, not a production write in this turn. Motor remains unchanged.
- The owner's latest pasted v1 spec replaces the former rounded/buffer model.
  One `calculator.html`/`calculator.css` layout serves three real tabs; shared
  `covermate-calculator.mjs` owns exact Life/CI formulas and cautious health-gap
  review. Separate per-tab inputs, 275ms debounce, comma formatting, soft limits,
  tab-local reset, keyboard navigation and inline methodology are implemented.
- Schema v13 owns all new TH/EN copy and media slots through Admin. Existing
  botanical art is reused; optional family photo stays empty. No new paid service.
- CTA prepares a local immutable snapshot for the existing contact form. It
  sends nothing until consent and submit; attachment can be removed. Shared
  validation whitelists fields and recomputes results in the lead API. No auto
  save, persistence, financial analytics parameters or new route.
- The published fixture hides fit and contains stale old intro copy. The local
  preview enables it with current seed copy. At release, use independent,
  revision-checked live/draft migration to update only known stale calculator
  copy and the approved Home visibility. Never publish an unrelated draft.
- Scope, formulas, sources, validation and local evidence are documented in
  `NEEDS_CALCULATOR.md`. No physical LINE/Safari device or production submission
  was tested. Broader site release checks remain for an authorized release.

## September 23 Shared Error Page Candidate

- Local only; no push, deploy, Vercel plan change or production CMS write.
  See [ERROR_PAGES.md](ERROR_PAGES.md) for the behavior-spec mapping, source
  owners, status matrix, generated artifacts and verification boundaries.
- One cream/sage/terracotta template serves the existing document handler's
  404/405/500/503 and can render any trusted 400–599 status. Static 404 is the
  ordinary host fallback; other platform errors still depend on Vercel capability.
- Core Home/code/copy works without JS/CMS. Optional links/contact use published
  data; Back is hidden without verified navigation state. TH/EN, mobile layout,
  safe GET retry, current CMS blanks and JSON fallback for non-page paths are
  covered by the targeted error harness. Error copy/art are in Brand & contact
  → Error page, introduced in schema v12 and retained in the v13 candidate.
- User approved deletion of the experimental `api/error.js`; it is removed.
  The new `api/not-found.js` is a fixed JSON 404 fallback, not a query-driven
  error demo. Local Vercel build needs project settings before a future release.

## September 23 Shared Home/Motor Candidate

- Local only; no commit, push, deploy, billing change or production CMS write.
  The owner's latest direction requires actual shared components, not another
  copied Motor page. Home and Motor now use the same `home.html`/`home.css`
  sections and `template.html` shell, contact/renewal forms, licences and Footer.
  Existing filenames and `homeDesign.*` keys remain for compatibility.
- Motor keeps its own CMS section list, visibility, order, hero/trust/coverage
  copy and navigation. Home-only sections are not injected. Insurer relationship
  cards move to the final licence band using their existing data, not a new CMS
  section. Featured tiers and the full comparison reuse Home's components.
- Schema v11 adds Admin-editable `licenceRole` on insurer relationship cards.
  Motor body/proof use only enabled broker cards; hidden/blank broker content
  never falls back to AIA. Home keeps its life-agent content and licence number;
  Footer retains both providers on both routes. Inline copy/media paths remain
  canonical after filtering and reordering.
- `npm run check:motor-design -- --fixture=uat-results/transparency-design/fixture.json`
  checks projections, migration idempotence, reordered/hidden/blank cards,
  unchanged Motor section order, Admin role selection and isolated draft save.
  Chromium passed Motor at 1440/820/390px, mobile EN, and Home at 1440/390px;
  WebKit and Firefox passed Motor at 390px. Coverage/FAQ/comparison/renewal
  interaction, unsent form preservation, unchecked consent, image decoding and
  overflow checks passed. Types, CMS ownership and generated bundles also pass.
- Screenshots/reports: ignored `uat-results/motor-shared-design/`, using the
  previously saved published-state fixture. Desktop/tablet/mobile composition
  and Home regression captures were personally inspected. This is not an
  exact-SHA release gate, production smoke or physical Safari/LINE device test.
  See HOME_REDESIGN.md for shared owners and CMS_CONTENT_OWNERSHIP.md for roles.

## September 23 Legacy Cleanup Candidate

- Local only; no commit, push, deployment or CMS publish. See
  `docs/LEGACY_CLEANUP.md` for scope, evidence and recovery snapshots.
- Retired Guides/old loader markup and the superseded Fees/Privacy renderers
  are removed. FAQ migration/archive, current transparency UI, Motor sections,
  owner editing, incoming links and saved data compatibility remain active.
- Calculator fallback now copies the existing canonical seed instead of
  carrying an identical second dataset. Generated runtime output is compacted
  without renaming identifiers; readable source and export boundaries remain.
- Second-pass HTML measurement: 796,097 → 739,657 bytes; local gzip 190,854 →
  180,394 bytes. The existing performance budget passes without relaxed limits.
- This does not separate the active embedded host/editor architecture or delete
  historical artwork. Unrelated pending transparency and consent work is kept.

## September 23 GA4 Consent Candidate

- Owner selected keeping GA4 with a compact opt-in, not removing tracking.
  Local only: no push, deploy, paid service, GA property change or CMS publish.
- Shared Home/Motor consent bar sits above the existing touch LINE action in
  one bottom dock. It disappears after allow/decline and can be reopened from
  Footer. The normal page/footer remains usable; there is no modal backdrop.
- No Google tag before valid opt-in. Advertising stays denied. Withdrawal
  disables future GA collection and clears GA cookies; cross-tab changes,
  expiration and blocked storage are covered. Contact/renewal consent is untouched.
- Schema v10 seeds TH/EN `cookieConsent.*` under Brand & contact > Cookie consent.
  Existing text edits survive migration. See ANALYTICS.md for the consent record,
  180-day policy, failure behavior, verification commands and evidence limits.
- Targeted tests use intercepted Google requests, not live collection. Local
  responsive evidence is in ignored `uat-results/cookie-consent/`. A future
  release still requires its own exact-SHA gate and production smoke.
- Passed analytics/owner-boundary regression, CMS ownership, types and bundle
  validation; UI flow at 1440/820/390/320px in Chromium plus 390px WebKit/Firefox.
  Desktop/mobile captures using the saved published-state fixture were personally
  inspected. Tests also cover hidden Footer/LINE controls, CMS title changes and
  choice expiration in an open page. Physical Safari/LINE and live GA ingestion
  were intentionally not part of this local pass. WebKit fixture routing must
  allow the bundler's `blob:` scripts instead of treating them as external URLs.

## September 23 Transparency Design Candidate

- Local, uncommitted redesign of Fees and Privacy from the owner's two new
  references. Not pushed, deployed or published to production CMS.
- Open Fees uses four explanatory tiles plus three fee-flow tiles; Privacy
  uses five tiles. Both keep compact closed summaries, vector icons, soft
  green/peach icon backgrounds, botanical CSS motifs and sage notes.
- Mobile uses readable stacked rows, not scaled-down desktop columns. Heading
  statements move under the introduction and closing decorative statements
  are omitted there. Per-item decorative arrows are intentionally not fake links.
- Existing copy, IDs, visibility and order remain authoritative. Schema v9 adds
  editable presentation statements and 1:1 icon crop slots; it never rewrites
  fee or PDPA obligations. No server/API/billing behavior changes.
- Shared rendering also covers Motor privacy if that section is explicitly
  enabled in its CMS section list; no hidden section was enabled in production.
- Targeted local Chromium checks: TH/EN at 1440, 820, 390 and 320px; full item
  counts, equal desktop peers, no overflow, keyboard toggles, anchors and
  return-to-form input preservation. CMS tests cover custom icons/text,
  reordered/hidden items, empty arrays and intentional blank copy.
- Evidence: ignored `uat-results/transparency-design/`, using a read-only copy
  of the current production page's published seed. Final desktop/mobile/tablet
  PNGs were personally opened and inspected, along with the desktop reference
  comparison. The mock image scale is not a known CSS viewport; mobile keeps
  readable 14px body text instead of scaling all copy to the bitmap. This is not a full release
  gate or a physical Safari/LINE device test.

```sh
node scripts/transparency-design-check.mjs --published
node scripts/transparency-design-check.mjs --fixture=uat-results/transparency-design/fixture.json --serve
```

## Operations / Cases v2 candidate — 23 September 2026

Current implementation and rollout notes: [ADMIN_CASES_V2.md](ADMIN_CASES_V2.md).
The supplied all-in-one v2 handoff is authoritative over the earlier mockup and
pasted prompt. Cases replaces visible Operations sub-tabs, uses the existing
lead records through a non-destructive adapter, and adds explicit draft/Save,
version conflicts, follow-up revisions and owner-scoped in-app notifications.

New code: `admin/ops/cases.js`, `admin/ops/cases.css`,
`server/cases-contract.cjs`, `server/cases-service.cjs`,
`server/enquiry-privacy.cjs`. `api/ops.js` retains existing auth and dispatches
new Cases endpoints. Public intake now returns `{accepted:true,reference}` and
verifies the displayed privacy-notice version; its helper and browser source
are updated together. New canonical Firestore documents require server-side
writes and owner reads. Rules must ship with the API when this is released.

Local evidence is in `uat-results/cases-v2/`; `check:ops` now runs the Cases
contract/browser checks, with `check:cases:api` for isolated Auth/Firestore
emulators. The legacy Operations regression file remains as historical
fixtures/reference; its old tab assertions are superseded. Real form-to-Admin
readback was also checked using the targeted `nfr-journeys --cases-only` path.
No production records were changed and no push/deploy was performed. Email
and offline scheduling remain unconfigured; the UI states this explicitly.

## Incremental refactor / hosted UAT checkpoint — 23 September 2026

See [REFACTOR_20260924.md](REFACTOR_20260924.md) for the module map, source
provenance, passed checks and remaining limits. CMS controller, Operations/Cases
backend responsibilities, shared freshness policy and independent test fixtures
have been extracted without changing schema or permissions. Hosted QA also found
and fixed the Cases initial-summary/immediate-search race.

The final UAT preview is https://covermate-7dk2jpqi6-purich-w.vercel.app.
It is assembled from production commit `c7bada4` plus this refactor and the
summary race fix. Local CI/emulators, hosted CMS and final hosted Cases passed;
UAT content was restored, synthetic Cases closed and temporary accounts disabled.
Production was not deployed or published. Separate pending calculator/contact/
layout work remains in the main working tree and still has its pre-existing
shell performance-budget failure; this UAT pass does not release that work.
