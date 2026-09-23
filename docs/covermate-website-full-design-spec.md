# CoverMate Website Current Product Spec

Last updated: 2026-09-24

## Current Authority And Release State

Current source includes the September visitor work and the source-boundary
refactor: CMS commands/history have module owners, Cases routing/storage and
legacy Operations are separated, and published-content freshness has an explicit
shared policy. These changes preserve product behavior, content/schema and
existing timing. Admin controls use Thai independently of public TH/EN content;
editor Undo/Redo/Reset affect Draft, while the separate Publish rollback changes
Live. The dated candidate and snapshot notes below retain their original evidence
scope; they are not current deployment claims. `HANDOFF.md` and release records
own exact-SHA CI and hosted status.

The September 23 Home contact submission candidate follows the owner's state
mockup plus dedicated behavior spec. [CONTACT_SUBMISSION.md](CONTACT_SUBMISSION.md)
owns its shared panel/controller, schema v14 copy, persisted receipt contract and
local verification limits; current release status is recorded in `HANDOFF.md`.

The owner-approved September Home redesign supersedes the older expanded-page
geometry in this document. Its canonical implementation/acceptance record is
[HOME_REDESIGN.md](HOME_REDESIGN.md): compact desktop/mobile composition, integrated
illustrated background, ivory/sage/terracotta contrast, real enlarged insurer
marks, per-tier illustrations, and desktop-like tablet layout with touch behavior.
The target is roughly 3-4 viewports for the documented initial collapsed fixture,
not mandatory whitespace, a hard page height or permission to hide product data.

[HANDOFF.md](HANDOFF.md) owns the exact release revision and current production
evidence; do not infer live status from this design spec alone. The owner selected
Cloudinary Free and authorized the Home/CMS v5/SEO/media release. Hosted UAT
verified upload, recrop, draft isolation and Publish. The upload adapter replaces
Firebase Storage while retaining Auth/Firestore. See [CMS_MEDIA.md](CMS_MEDIA.md).

CMS ownership update: real business data (licence numbers, provider logos, brand
media) is editable in Admin and shared by Home/Motor/Footer. Optional blank
contacts/media stay absent. [CMS_CONTENT_OWNERSHIP.md](CMS_CONTENT_OWNERSHIP.md)
supersedes historical read-only compliance/default-image statements below.

Production baseline: `https://covermateinsurance.com`

September 23 Error page candidate: [ERROR_PAGES.md](ERROR_PAGES.md) owns the
shared responsive recovery screen and status/hosting matrix. It follows the
owner's error mockups with Behavior SPEC corrections: real branding, neutral
document art, selectable status, native Home, verified optional links/contact,
conditional safe retry and no unverified Back. Error-only CSS does not redesign
Home/Motor. Core survives unavailable JS/CMS; enhanced content supports TH/EN.
The candidate is local; it does not imply custom Vercel platform-error coverage.

September 23 Motor design candidate: `/motor` uses Home's actual shared section
components and responsive styles, not a second implementation. Keep Motor's CMS
section list/order and local Hero/trust/coverage data. Its body and final licence
band show only the broker relationship; AIA is retained in Footer. Schema v11
adds the card editor's `licenceRole`, preserving copy/media/order/visibility.
Shared component ownership and retained compatibility names are documented in
HOME_REDESIGN.md. This supersedes historical legacy Motor geometry below and is
local until a matching release is recorded in HANDOFF.md.

Cookie consent candidate: retain GA4 behind explicit opt-in. A compact, nonmodal
TH/EN bar offers equally accessible allow/decline choices above the existing
touch LINE action. It is not a second PDPA popup or form consent. Footer settings
allow withdrawal, with no additional floating button. CMS `cookieConsent.*`
owns copy; `ANALYTICS.md` owns data/consent behavior. Local until HANDOFF.md records
a matching deployment.

Implementation baseline: current source and generated candidate bundle in this
repository. Use deployment/source readback for the exact production revision;
local git HEAD alone cannot establish which working-tree edits are live.

Audience: future maintainers, design partners, product owners, and implementation agents updating the website/admin product.

## Purpose

CoverMate is a Thai insurance advisory site for life, health, and motor insurance. The public site must feel like a calm, trustworthy personal advisor rather than a generic insurance comparison marketplace. The admin side is private owner tooling for managing enquiry Cases, editing content, arranging sections, publishing Firestore drafts, and reviewing owner analytics.

This spec records the current product and visual contract so future updates are made against the real site, not older offline prototypes or screenshots.

## Snapshot Evidence

Historical production snapshot suite (not current redesign acceptance):

- Snapshot folder: `/Users/point/CoverMate/docs/snapshots/production-2026-07-31`
- Manifest: `/Users/point/CoverMate/docs/snapshots/production-2026-07-31/manifest.json`
- Captured screenshots: 47
- Intentionally missing states: contact and renewal success states, because this run did not submit real production lead data.
- Signed-in admin and owner-hash captures use a mocked `covermate-admin-session`; the manifest labels these as `mock-admin-session`.

Latest SPEC (5) release evidence is narrower than the complete production suite
above and should be treated as targeted proof for the motor tier reconciliation:

- Snapshot folder: `/Users/point/CoverMate/docs/snapshots/local-2026-08-02-spec5`
- Includes public home desktop, public tiers desktop/mobile, public `#motor`
  alias desktop, and admin Content tab tier editing.
- Manifest: `/Users/point/CoverMate/docs/snapshots/local-2026-08-02-spec5/manifest.json`

Latest local regression evidence for admin/public mode sync and legacy
Firestore content normalization:

- Snapshot folder: `/Users/point/CoverMate/docs/snapshots/local-2026-08-02-admin-sync`
- Manifest: `/Users/point/CoverMate/docs/snapshots/local-2026-08-02-admin-sync/manifest.json`
- Includes public insurer section desktop/mobile, admin-to-visitor new-tab behavior,
  and the clean public view with owner chrome suppressed.

Latest local regression evidence for admin actions and anchor-navigation
stability:

- Snapshot folder: `/Users/point/CoverMate/docs/snapshots/local-2026-08-02-admin-actions`
- Manifest: `/Users/point/CoverMate/docs/snapshots/local-2026-08-02-admin-actions/manifest.json`
- Includes public `#how` anchor jump, custom `Save draft` confirmation,
  `Publish` success toast with 30-second `Undo`, and mobile admin drawer
  stacking/action-bar spacing.

Latest local regression evidence for public/admin chrome separation:

- Snapshot folder: `/Users/point/CoverMate/docs/snapshots/local-2026-08-02-public-chrome-guard`
- Manifest: `/Users/point/CoverMate/docs/snapshots/local-2026-08-02-public-chrome-guard/manifest.json`
- Includes a clean public `/` route with a mocked admin session and stale owner
  marker, `/admin` return after closing `/#admin`, and the clean visitor popup
  after clicking `Public site`.


The following screenshots are historical ad-hoc visual evidence from production. They are useful for the exported spec context, but they are not a complete production snapshot suite:

- Public desktop: `/tmp/covermate-spec-home-desktop.png`
- Public mobile: `/tmp/covermate-spec-home-mobile.png`
- Admin login desktop: `/tmp/covermate-spec-admin-login.png`
- Admin Portal desktop: `/tmp/covermate-spec-admin-launcher.png`
- Admin analytics mobile: `/tmp/covermate-spec-admin-analytics.png`

These screenshots were captured from production on 2026-07-31 with mixed routes, viewports, and auth states. Do not treat them as exhaustive proof of every public/admin screen.

For a requested full-site archive or complete design handoff, capture the full
matrix below. Ordinary releases use the touched-risk subset; narrow visual edits
do not require unrelated routes or hosted UAT. Never label a subset complete:

- public full-page desktop/tablet/mobile;
- anchor states for `#cover`, `#fit`, `#insurers`, `#motor`, `#claim`, and `#talk`;
- TH and EN states when copy, typography, nav, or translation is in scope;
- admin signed-out login and redirect states;
- admin signed-in portal, analytics, owner edit, owner control panel tabs, drawer-closed/reopen state, and preview;
- public form empty/validation/safe success states when form or analytics behavior is in scope;
- a `manifest.json` with URL, final URL, viewport, auth state, data state, language, scroll position, `fullPage` flag, commit, timestamp, and missing-state reasons.

If this spec is being read from the bundled skill, follow `references/snapshot-suite.md` for the complete matrix.

Latest local needs-calculator evidence:

- Snapshot folder:
  `/Users/point/CoverMate/docs/snapshots/2026-08-16-needs-calculator`
- Scope: targeted local proof for the `#fit` section after migrating the
  calculator to the `covermate-reference-data-v0.1` methodology.
- The screenshot may still show Firestore-live section heading copy because
  live CMS content wins over embedded defaults. The calculator controls and
  methodology payload are the evidence target.

## Source Of Truth

Use this precedence order:

1. Latest explicit owner direction determines scope and the selected visual target.
2. For the approved Home rebuild, start with the supplied
   `covermate-home-codex-handoff-v1.0/CODEX_IMPLEMENTATION_PROMPT.md` and the
   selected desktop/tablet/mobile references plus subsequent owner corrections.
3. Firestore live/draft owns actual business content in the intended namespace;
   a mockup is not evidence for licence numbers, insurers, hours or testimonials.
4. Current source and maintained docs own existing behavior/security/data
   contracts unless the owner explicitly changes them. Production readback
   establishes deployed state, not a veto on a newly approved redesign.
5. Historical exports/snapshots remain historical, including old section tables.

Preserve semantics and capabilities, not rejected legacy geometry. Never revive
the old no-separate-Motor, embedded-only-coverage, mandatory Guides, or no-crop
constraints against newer explicit owner decisions.

## External Prototype Guardrail

Offline prototype HTML files are historical reference artifacts, not production
source of truth. Use them only for visual calibration after checking whether
they are complete and intentionally current for the task.

A valid portable prototype must:

- open directly from `file://` without a dev server;
- include or inline every runtime dependency;
- avoid missing-file console errors for `support.js`, `image-slot.js`, or
  `_ds/*/_ds_bundle.js`;
- render no visible raw template markers such as `{{ brandName }}`,
  `{{ n.label }}`, `sc-if`, `sc-for`, `x-dc`, or `[object Object]`;
- render public, admin, edit, preview, and relevant route states after reload.

If a portable export fails these checks, do not call it runnable evidence or
copy its broken runtime. Supplied screenshots still remain usable visual input;
missing prototype JavaScript is not a blocker to faithful implementation.

## Design Update Brief

Future external designs, local prototypes, or handoff updates must reflect the current product decisions:

- First read `/Users/point/CoverMate/docs/ADMIN_CMS_REBUILD_DECISIONS.md`; it is the current Admin/CMS rebuild authority.
- The public product now has two visitor entry points in the same CoverMate
  site: `/` is the full home page, and `/motor` is the dedicated
  motor-insurance campaign page for motor-specific ads/search.
- `/#motor` is the public Home anchor that scrolls to the unchanged
  `insurers` DOM/CMS section; old `/#insurers` URLs normalize to it.
  It is not the campaign route. Use `/motor` for motor-only
  landing links.
- The home visitor navbar must show only one motor item: Thai
  `ประกันรถยนต์`, English `Motor`, pointing to `#motor`. The `/motor`
  navbar may have its own local motor anchors plus a `Home` link.
- `/#motor-focus` is legacy/unexposed compatibility only; `/motor` is the
  current dedicated motor-page design source.
- Preserve enabled policy review, claim, renewal, fee and privacy capabilities
  through the compact composition/disclosures. Guides are consolidated into FAQ;
  do not restore a separate reading section or force disabled sections visible.
- Admin Portal Home target has four primary modules: `Operations`,
  `Website content`, `Analytics`, and `Settings`. The home lives inside the
  same admin shell as those modules; `/admin/ops` remains only a compatibility
  entry that defaults to Operations. The `Website content` module must not
  split editing and arranging into separate launcher cards; `Edit the words`
  opens the editor, and its `Tools -> Panel` command opens the control panel for
  section order, visibility, brand, footer, preview, publish, backup, and
  restore.
- Admin menu/chrome labels are intentionally English: `Main`, `Public site`, `Log out`, `Panel`, `Edit text`, `Save draft`, `Preview`, `Publish`, `Success`.
- Admin `Public site` actions must open the clean public route in a new browser
  tab without showing owner chrome. Legacy `/?view=public` may be consumed for
  compatibility, but new UI must not generate it.
- A signed-in admin session is not a visible public-page mode. A clean `/` load
  or reload must hide owner chrome even if stale local owner markers exist.
- All visible Thai and English text uses the Google Sans family. Headings and logo text may use heavier Google Sans weights, but do not reintroduce unrelated serif/display fonts.
- The AIA logo asset is the transparent red mark at `assets/logos/aia-logo.png`.
- Contact heading Thai `ขอรับคำปรึกษา` must remain one line on desktop and should avoid awkward word breaks elsewhere.
- Known stale Firestore CMS values that conflict with product decisions must be
  normalized on render/save/publish: duplicate `#motor` nav entries, stale
  insurer-count copy, and forced-line-break contact headings. Insurer-count copy
  follows the active `insurers.items` logo data; with the current committed logo
  set, the count is `14`. Do not reintroduce stale higher-count claims unless
  the logo data and owner approval both support the new count.
- All behavior described here is a product decision as of this release, excluding future bugs that have not appeared yet.

## Visual Direction

The design language is warm, organic, advisory, and owner-operated:

- Backgrounds are cream, pale green, warm sand, and dark brown.
- Primary actions are terracotta/orange.
- Trust and proof surfaces lean sage/green.
- Dark sections use deep brown with terracotta cards, not black or blue.
- Use integrated flat sage/peach artwork matching the approved reference, not
  detached realistic leaves, decorative orbs, or generic stock substitutes.
- Avoid generic SaaS styling or crowded comparison surfaces; do not use this
  caution to discard the owner's approved illustrations and contrast treatments.

The product should feel personal, careful, and financially credible. It should not feel salesy, over-designed, or like a landing-page template.

## Implementation Anchors

Primary source files (do not hand-edit generated visitor HTML):

- Home: `/Users/point/CoverMate/src/visitor/home.html` and `home.css`
- Shared/Motor/owner modes: `/Users/point/CoverMate/src/visitor/template.html` and `runtime.js`
- CMS commands, autosave, Reset/Publish and media actions: `/Users/point/CoverMate/src/visitor/cms-controller.js`; local snapshot history: `editor-history.js`
- Calculator/recommendation/submission contracts: `/Users/point/CoverMate/covermate-calculator.mjs`, `covermate-recommendations.mjs`, and `covermate-submission.mjs`
- Published-content TTLs and client retry timing: `/Users/point/CoverMate/covermate-freshness.mjs`, consumed by `server/seo-page.mjs` and `covermate-public.mjs`
- Generated deploy artifact: `/Users/point/CoverMate/index.html`
- Admin Portal shell: `/Users/point/CoverMate/admin/index.html`
- Admin login: `/Users/point/CoverMate/admin/login/index.html`
- Admin analytics: `/Users/point/CoverMate/admin/analytics/index.html`
- Cases UI: `/Users/point/CoverMate/admin/ops/cases.js`; backend router/service/repository and legacy Operations owners are mapped in `docs/ADMIN_CASES_V2.md`
- Firebase helpers: `/Users/point/CoverMate/covermate-firebase.js`
- GA4 helpers: `/Users/point/CoverMate/covermate-analytics.js`
- Shared font files/CSS: `/Users/point/CoverMate/assets/fonts/covermate-fonts.css`
- Vercel headers/routes: `/Users/point/CoverMate/vercel.json`

Supporting docs:

- Architecture: `/Users/point/CoverMate/docs/ARCHITECTURE.md`
- Data contract: `/Users/point/CoverMate/docs/DATA_CONTRACT.md`
- Analytics: `/Users/point/CoverMate/docs/ANALYTICS.md`
- SEO: `/Users/point/CoverMate/docs/SEO.md`
- Interaction map: `/Users/point/CoverMate/docs/INTERACTION_MAP.md`
- Needs calculator: `/Users/point/CoverMate/docs/NEEDS_CALCULATOR.md`
- Assets: `/Users/point/CoverMate/docs/DESIGN_ASSETS.md`
- NFRs: `/Users/point/CoverMate/docs/NON_FUNCTIONAL_REQUIREMENTS.md`

## Routes And Surfaces

| Route | Surface | Audience | Indexing |
| --- | --- | --- | --- |
| `/` | Public home page | Prospective customers | Indexable |
| `/motor` | Dedicated motor-insurance campaign page | Prospective motor customers from motor-specific ads/search | Indexable |
| `/#motor` | Public Home anchor into the `insurers` DOM/CMS section | Home navigation; accepts old `/#insurers` links | Same document as `/`; not sitemap |
| `/#life` | Alias into public `#cover` section | Prospective life/health customers | Same page, no separate surface |
| `/#motor-focus` | Legacy unexposed motor campaign variant | Compatibility only | Same page, no sitemap/nav exposure |
| `/#life-focus` | Unexposed life/health campaign variant | Campaign visitors when explicitly linked | Same page, no sitemap/nav exposure |
| `/#edit` | Owner click-to-edit text mode | Admin only | No separate index route |
| `/#admin` | Legacy owner control-panel drawer over public page | Admin only | No separate index route |
| `/#preview` | Owner preview of draft | Admin only | No separate index route |
| `/admin/login` | Google sign-in gate | Admin only | `noindex` |
| `/admin` | Admin Portal shell | Admin only | `noindex` |
| `/admin/ops` | Compatibility entry into Operations in the Admin Portal shell | Admin only | `noindex` |
| `/admin/content?page=motor` | Control panel scoped to the motor page | Admin only | `noindex` |
| `/admin/edit?page=motor` | Inline text editor scoped to the motor page | Admin only | `noindex` |
| `/admin/preview?page=motor` | Draft preview scoped to the motor page | Admin only | `noindex` |

## Brand Baseline

Brand fields:

- Initial mark: `C`
- Name: `CoverMate`
- Thai role: `ที่ปรึกษาประกันภัย`
- English role: `Insurance Advisory`
- Thai credential: `ตัวแทน AIA · นายหน้าประกันรถยนต์ · ดูแลถึงการเคลม`
- English credential: `AIA agent · motor broker · support through claims`
- Advisor proof logo path: `assets/logos/aia-logo.png`

Licensing copy must remain present in admin and footer surfaces:

- Life agent No. `6401006221`
- Non-life broker No. `6804008544`
- Srikrung Broker No. `5704011570`
- Thai footer legal includes Srikrung licence `ว00287/2534`

## Typography

Global font contract:

```css
font-family: "Google Sans", "Google Sans Thai", "Noto Sans Thai", system-ui, sans-serif;
```

Rules:

- Apply this stack to every visible Thai and English UI surface.
- Do not use negative letter spacing.
- Body copy should stay readable at 15-18px depending on context.
- Compact cards and admin controls should not use oversized hero-scale headings.
- Thai text must avoid awkward single-word orphaning where it affects polish.
- Admin menu/chrome text should remain English for clarity.

## Color Tokens

Current token direction:

| Role | Token/Value | Usage |
| --- | --- | --- |
| Page background | `#f5ead8` | Main cream canvas |
| Surface | `#ebddc5` | Warm cards, admin panels |
| Text | `#201e1d` | Primary ink |
| Accent | `#c67139` | CTA terracotta |
| Accent deep | `#8c491a` / darker ramp | Hover, dark accents |
| Sage | `#7a8a5e` and pale ramp | Trust/proof/insurer/renewal sections |
| Dark section | deep brown ramp | Calculator, claims, contact, footer |

Use tonal variation with purpose. Do not flatten the site into one beige/brown block; preserve contrast between cream, sage, sand, terracotta, and dark brown bands.

## Spacing, Radius, And Elevation

Layout rhythm:

- Section padding should feel generous on desktop and tighter but still breathable on mobile.
- Cards use soft rounded corners consistent with the current brand. Do not switch to sharp enterprise cards.
- Repeated item cards should not be nested inside decorative cards.
- Fixed-format controls such as nav pills, language segments, icon buttons, admin action buttons, sliders, form fields, and KPI cards need stable dimensions so content changes do not resize the layout.
- Touch targets must remain 44px-class on mobile/coarse pointer.
- Increase spacing wherever text, icon, or cards feel visually compressed.

## Responsive Contract

Desktop:

- Header is horizontal with logo left, nav center/right, language segmented control, and LINE CTA.
- Hero occupies the first viewport with the next trust bar visible below.
- Wide content should be constrained; do not let text lines run across the entire viewport.
- Section grids use 2-4 columns depending on content type.

Tablet:

- Preserve hierarchy while reducing grid columns.
- Avoid cramped nav. If width is insufficient, hide or collapse lower-priority nav before breaking text.

Mobile:

- One-column reading flow.
- Header must not duplicate nav labels or overflow horizontally.
- Cards must stack with clear spacing.
- Forms use 16px fields to avoid mobile zoom.
- Sticky mobile actions may appear only if they do not cover important content or footer actions.
- Admin analytics cards should be comfortable and scannable; do not compress chart/KPI labels into cramped rows.

## Public Header

Components:

- Logo mark: pale green circular `C`, brand name, Thai/English role line.
- Nav:
  - `#cover`: `ความคุ้มครอง` / `Cover`
  - `#review`: `ตรวจกรมธรรม์` / `Policy review`
  - `#motor`: `ประกันรถยนต์` / `Motor` (DOM/CMS section remains `insurers`)
  - `#fit`: `เครื่องมือ` / `Resources`
  - `#faq`: `คำถามที่พบบ่อย` / `FAQ`
- Language segmented control: `TH` and `EN`.
- Primary CTA: chat icon + `แอดไลน์` / LINE copy.

Guardrails:

- Never show two `ประกันรถยนต์` nav items.
- Do not make `/#motor` appear like a separate website. The separate,
  canonical motor campaign surface is `/motor`.
- Header should stay calm and not become a marketing mega-nav.
- Header/footer nav and any CTA that points to a same-page section must be
  visibility-aware: if the target section is hidden in Admin, the link/button is
  hidden too rather than leaving a dead anchor on the visitor surface.
- The Home `#insurers` section carries the explicit path into the dedicated
  motor campaign page: Thai `ดูหน้าประกันรถยนต์โดยเฉพาะ`, English
  `Open the dedicated motor page`, with `href="/motor"`. Keep this out of the
  header nav so the header still has only one Motor item.

## Visitor Section Order

Current order/visibility comes from CMS; the approved candidate may group
adjacent About/Review/How into compact bands without rewriting their owners.
`cover` is standalone and editable in Admin again. `guides` migrates into FAQ;
`#guides` redirects there. Claim/Fit/Voices being disabled in the supplied local
snapshot is not permission to fabricate them for a screenshot. See
`HOME_REDESIGN.md` for the proposed arrangement and exact visibility rules.

The table below is the **historical pre-redesign structure**, retained only to
explain legacy IDs/migration input. It is not a mandatory visible section order:

| Order | ID | Type | Background | Columns | Content Count |
| --- | --- | --- | --- | --- | --- |
| 1 | `hero` | Hero | cream | 2 | brand/value proposition |
| 2 | `trust` | Trust bar | cream | 4 | 4 trust chips |
| embedded | `cover` | Hero coverage accordions | hero | auto | 6 insurance product accordions |
| 3 | `review` | Policy review | cream | 3 | 3 review steps |
| 4 | `fit` | Coverage calculator | dark | 2 | interactive calculator |
| 5 | `how` | Process steps | cream | 4 | 4 steps |
| 6 | `insurers` | Motor insurers | sage | 4 | 14 data-driven logo items + 2 credential cards |
| 7 | `tiers` | Motor class comparison | cream | 1 | 5 rows x 5 coverage axes |
| 8 | `claim` | Claims help | dark | 4 | 4 steps + 4 proof metrics/cards |
| 9 | `renew` | Renewal reminder | sage | 3 | reminder form + 3 benefits |
| 10 | `guides` | Buying guides | surface | 2 | 4 FAQ-style guide rows |
| 11 | `voices` | Customer stories | cream | 3 | 3 story cards |
| 12 | `about` | About/licence | surface | 2 | 4 credential bullets |
| 13 | `faq` | FAQ | cream | 1 | 5 FAQ rows |
| 14 | `fees` | Fee transparency | surface | 3 | 3 fee cards + 4 notes |
| 15 | `privacy` | PDPA/privacy | cream | 2 | 5 privacy bullets |
| 16 | `talk` | Contact | dark | 2 | contact panel + lead form |

Preserve still-supported content and reachable workflows, not the historical
expanded layout. Do not reintroduce the archived Guides owner.

## Dedicated Motor Page

The current production contract includes `/motor` as a separate visitor page
inside the same CoverMate product. It is intended for motor-insurance ads and
search traffic that should not land midway through the broader home page.

Page contract:

- Canonical URL: `https://covermateinsurance.com/motor`
- SEO: indexable `WebPage` metadata distinct from `/`, while keeping the same
  CoverMate `InsuranceAgency` identity.
- Header: same brand, language control, and LINE CTA, with local motor-page nav
  for `Home`, motor coverage, insurers, tier comparison/process, and contact.
- Section order: `motor`, `motor-trust`, `motor-cover`, `insurers`, `tiers`,
  `how`, `claim`, `renew`, `faq`, `talk` (subject to CMS visibility/order).
- Data model: local hero/trust/coverage blocks live under `motorPage.*`;
  shared insurer logos, tier table, process, claim, renewal, consolidated FAQ, and
  contact content reuse the CMS-backed arrays used by Home.
- Admin: `/admin/content?page=motor`, `/admin/edit?page=motor`, and
  `/admin/preview?page=motor` must stay reachable from owner tools and must not
  leak owner chrome onto `/motor` or `/`.
- Firestore fallback: if a pre-`motorPage` live document loads, the runtime
  seeds missing schema without overriding an explicit shared `on:false`.
  Once Firestore has `motorPage`, live Firestore
  values win over local fallback/cache.

## Visitor Component Specs

Use the current compact composition in `HOME_REDESIGN.md` over older component
dimensions below. Existing CMS strings, Google Sans, brand logos, controls and
business semantics remain authoritative; no screenshot-only hard-coded copy.

### Hero

Purpose: immediately clarify the human promise: the visitor does not have to manage insurance alone.

Required elements:

- Trust badge/pill.
- Large Thai/English headline.
- Supporting copy.
- Primary LINE consultation button.
- Secondary calculator/assessment button.
- Personal advisor proof row with AIA logo.
- Integrated flat sage/peach illustrated backdrop, with quiet copy space.
- Trust bar hint visible below the first viewport.

The hero must not become a split hero with a generic image card. The brand/value proposition is the first-viewport signal.

### Trust Bar

Purpose: quick reassurance after hero.

Structure:

- Four pill cards with small icons.
- Content examples: no over-selling, AIA life/health representative, fast LINE response, claim continuity.

Keep pills stable and readable across widths.

### Coverage Accordions

Purpose: show coverage categories the advisor can help with.

Structure:

- Compact standalone Home section at `#cover`, also reachable from `/#life`.
- Product cards use circular icon chips, title, short subtitle, and accordion expand affordance.
- Product types currently include life, health, disease/critical illness, personal accident, home, and motor.
- Expanded details use the existing `cover.items[*].b1/b2/b3/note` data.
- Admin Sections and inline editing use the same coverage owners.

Rows should feel like actionable advisory categories, not commodity cards.

### Policy Review

Purpose: explain that CoverMate can review an existing policy before selling anything new.

Structure:

- Light section after coverage products.
- Three-step/cards explaining upload/share policy, review gaps/overlap, and receive simple advice.

This section is a trust-builder. Avoid pushing conversion too hard here.

### Coverage Calculator

Purpose: Home-only planning estimate without contact details, not a quote or guaranteed adequate cover. September 23 v1 candidate supersedes the old salary/buffer model.

Structure:

- Ivory/botanical section, three accessible Life/CI/Health tabs, white input
  panel and sage result panel. Desktop/tablet two columns; mobile stacked.
- Life has seven inputs including continuing income, separate assets/existing
  cover and freely entered whole years. CI has six independent recovery inputs.
- Exact nonnegative Life/CI shortfalls without rounding or implicit buffers.
  Health is a cautious gap review using existing benefits, cost sharing,
  employer/personal cover and own-pay budget, not a required lump sum.
- Calculated numbers are prominent but not alarmist and must read as advisory
  starting points rather than guaranteed costs or quotations.

Current refinements:

- One shared input/result template and pure model, no copied tab implementations.
- Session-memory values survive tab switching, not necessarily refresh. 275ms
  debounce, comma formatting, soft limits, per-tab reset and inline methodology.
- CTA scrolls to the existing contact form with a removable local summary.
  No data leaves until explicit consent and submit; the server recalculates.
- The calculator follows `/Users/point/CoverMate/docs/NEEDS_CALCULATOR.md`.
  `calculatorDesign.*` owns current UI/media; `fit.calculator` retains dated
  health references and legacy data. Old scenarios/buffers are not active v1 UI.
  Home visibility is approved for the next deploy, not changed in production yet.

### Process

Purpose: make the workflow feel simple.

Structure:

- Four horizontal steps on desktop, stacked on mobile.
- Number dots and thin connector lines where space allows.
- Copy stays concise.

### Motor Insurers

Purpose: prove motor-insurance comparison breadth.

Structure:

- Sage/green band.
- Centered heading: copy must follow the active `insurers.items` logo data. With
  the current committed logo set, the visible and stated count is `14`.
- Logo grid in a warm rounded panel. The grid is generated from the
  `insurers.items` content array, not a separate hard-coded logo list.
- Credential cards for AIA and Srikrung Broker.
- Small check note below.

Assets:

- Use insurer logos from `assets/ins/`.
- Use `assets/logos/aia-logo.png` for AIA.
- Keep Srikrung visual aligned with the current production treatment.

Guardrails:

- Logo grid should not be empty or placeholder-only.
- The first two lines in credential cards, logo and company/category row, are centered.
- Do not duplicate the insurer logo list for `/motor`; reuse `insurers.items`
  so Home, `/motor`, and Admin stay in sync.

### Motor Tier Comparison

Purpose: explain the practical difference between motor insurance classes
without sending visitors to a separate comparison page.

Structure:

- Section ID/type: `tiers`.
- Desktop renders a table with 5 rows (`ชั้น 1`, `ชั้น 2+`, `ชั้น 2`,
  `ชั้น 3+`, `ชั้น 3`) and 5 coverage axes.
- Mobile renders stacked class cards so the visitor does not horizontally
  scroll.
- Cell states are data-driven: `y` covered, `p` conditional, `n` not covered.
- The admin Content tab can edit headings, rows, row notes, cell states, add
  columns, and add tiers.

Guardrails:

- Keep this as part of the main public page. Do not expose a second motor nav
  item.
- Missing cell states must render as not covered instead of breaking layout.
- Keep section copy advisory and plain-language, not a legal substitute for
  policy wording.

### Claims Help

Purpose: show post-sale support when an incident happens.

Structure:

- Dark brown band.
- Thai/English heading and explanatory copy.
- Four steps/cards for how to act after an incident.
- Proof/KPI blocks below.

Cards must not clip text, numbers, or decorative indices. Increase inner padding and grid gaps if needed.

### Renewal Reminder

Purpose: collect expiry month and contact for renewal reminders.

Structure:

- Sage band.
- Benefit checklist/copy on one side.
- Compact form on the other side.
- Fields include insurance type, expiry month, and LINE/phone.

Do not make this look like a separate product page; it is a service slice in the continuous visitor journey.

### Guides

Purpose: answer common buying questions before contact.

Structure:

- Warm surface band.
- FAQ/accordion-like rows.
- Clear titles and brief answers.

### Customer Stories

Purpose: add proof without fake review styling.

Structure:

- Three warm cards.
- Quote-like content and simple attribution.
- Avoid stock testimonial avatars unless real assets exist.

### About / Licence

Purpose: explain owner-operated credibility.

Structure:

- Warm surface band.
- Copy about CoverMate as a personal advisory service.
- Licence/credential details and OIC verify link.
- Simple QR/LINE contact treatment where relevant.

### FAQ

Purpose: answer objections and reduce uncertainty.

Structure:

- One-column accordion rows on desktop or balanced two-column layout only if text stays readable.
- Keep icons/affordances aligned right.

### Fee Transparency

Purpose: explain why consultation can be free and how compensation works.

Structure:

- September 23 local candidate follows the owner's new desktop/mobile
  references: four icon-led explanatory tiles, then three fee-flow tiles,
  and a sage summary note. Numbers no longer dominate the fee cards.
- Single disclosure remains compact when closed. Desktop tiles share row height;
  tablet uses two explanatory columns and three flow columns; mobile stacks.
- All body/heading/note text stays in the existing section CMS fields. Optional
  statements and icon overrides belong to Transparency design (schema v9).

### PDPA / Privacy

Purpose: clarify data handling.

Structure:

- Same disclosure pattern, with five icon-led privacy tiles across desktop,
  two columns on tablet and one on mobile. No decorative per-item chevrons:
  these are readable facts, not links to nonexistent destinations.
- Sage note and a real return-to-form link preserve unsent input. Native summary
  controls preserve keyboard open/close and existing hash navigation.
- Layout changes do not revise retention periods, rights, claims or obligations.
  Local candidate status and evidence are recorded in HANDOFF.md.

### Contact / Lead Form

Purpose: final conversion without pressure.

Structure:

- Home: sage botanical band per the September 22 Contact handoff; Motor retains
  its existing contact composition. Current CMS heading/copy wins over older wording.
- Left contact channels, hours and service area, always expanded.
- Right warm-white form card; below 900px the columns stack. Mobile fields are
  single-column with 48px controls and 16px input text.
- Fields: name, LINE/phone, enquiry type, coverage interest, message/details.
- CTA uses terracotta and clear arrow/icon.

No form should send freeform personal contact details to GA4.

### Footer

Purpose: credibility, navigation, and legal details.

Structure:

- Dark brown footer with gold accents, subtle botanical/wave decoration and
  existing brand imagery, matching the September 22 owner references.
- One shared tree: brand, licence cards, quick links and contacts. Desktop has
  the CMS column count (default four); tablet caps at two; mobile stacks all
  groups expanded. OIC, licence and channel data keep their original owners.
- CMS v8 adds helper/closing copy, icons and background under Footer design.
- Links have at least 44px touch targets and visible keyboard focus. No new
  link to the dedicated `/motor` route is added to Home.

## Public Interactions And States

Visitor interactions:

- Language toggle updates visible text between Thai and English.
- Header nav scrolls to anchors on the same page without rebuilding the visitor
  DOM or causing a visible flicker.
- `/motor` renders the dedicated motor page with its own local nav and
  canonical metadata.
- `/#motor` is the public Home motor insurer anchor; `/#insurers` is its old URL.
- `/#life` normalizes to the coverage anchor behavior.
- `/#motor-focus` and `/#life-focus` render legacy unexposed campaign variants and
  must not appear in the public header nav or sitemap.
- Product/FAQ/guide rows can expand/collapse when configured.
- Calculator updates estimate live.
- Lead form writes validated Firestore data.
- Renewal form writes validated Firestore data.
- Success/error messages must be human and concise.
- GA4 tracks aggregate events only on production public visitor sessions.

Owner/admin sessions suppress public analytics events.

## Admin Login

Route: `/admin/login`

Purpose: owner sign-in gate.

Required elements:

- Centered warm card on cream background with soft green/peach decorative shapes.
- Brand row with circular `C`, `CoverMate`, and `ADMIN · PRIVATE`.
- Thai heading `เข้าสู่ระบบผู้ดูแล`.
- Thai explanatory, help and error copy, retaining familiar product/service names.
- Google sign-in button.
- Firebase Auth status/help box.
- Session note and public-site link.

Behavior:

- Google Auth is enabled.
- Access opens only for accounts allowlisted in Firestore at `admins/{uid}`.
- Successful login writes `covermate-admin-session` for a 7-day browser session.
- Do not use a demo-only copy in production.
- The login card should feel centered and breathable, not squeezed.

## Admin Portal Home

Route: `/admin`

Purpose: private owner starting point inside the single Admin Portal shell.

`ADMIN_HOME_DESIGN.md` owns the current desktop/mobile composition and Home
read lifecycle. Thai labels name the existing modules; the English module names
below identify their stable product concepts, not an English-only chrome rule.

Required elements:

- Single shared admin shell; sidebar changes views client-side without a full
  document reload.
- OIC verify link.
- H1: `Admin Portal`.
- Four primary cards:
  - `Operations`
  - `Website content`
  - `Analytics`
  - `Settings`
- Cards expose only surfaces that are live or operationally useful today.
  Unbuilt modules stay hidden until real API contracts exist.
- Quick actions open content editing, Draft preview, all Cases and due follow-ups.
- Home counts and the three newest Cases come from canonical Cases endpoints.
  A connection badge reports successful Home reads, independently of the
  verified session; CMS/Analytics source descriptions are not universal health
  checks. Errors retain navigation and offer retry.
- Inside the `Website content` module, use one unified `Edit the words` entry
  for copy and panel access. Do not reintroduce a separate `Arrange and
  customise` card; the panel is reached from the editor dock through `Tools ->
  Panel`.
- `Public site` and `Log out` actions.

`Public site` links open clean `/` in a new browser tab after clearing owner
markers for that public context.
The public bundle may still consume old `/?view=public` links for compatibility.
Clean public loads must also clear or ignore stale owner markers. Owner controls live on `/admin`, `/#admin`, `/#edit`, and `/#preview`, not on the visitor site.

Layout:

- Desktop: four cards in one row when space allows.
- Tablet: two-column modules.
- Mobile: two module columns with stacked utility panels and readable wrapping.

Do not remove the Admin Portal Home after login. It is the required hub.

## Operations / Cases v2

The latest approved handoff replaces the Operations dashboard/leads/tasks/audit
sub-tabs with one Cases page. See [ADMIN_CASES_V2.md](ADMIN_CASES_V2.md) for the
implementation, API/data boundaries, legacy mapping, responsive layouts and
verification evidence. This supersedes earlier Operations tab descriptions in
this document; other Admin modules retain their existing routes.

Cases uses six explicit statuses, global server summaries, filtered/paginated
lists and an editor with explicit Save, version conflict handling and preserved
drafts. Website enquiry text/privacy evidence are immutable; manual notes are
separate. New APIs are verified-owner only. Existing lead documents and legacy
tasks/history are retained on the same records through a read adapter.

Desktop uses the approved cream/orange table and 440 px detail panel; mobile
uses 2×2 metrics, cards and a full-screen editor. In-app notifications are
persisted and deduplicated. Email/scheduler are unconfigured and stay visibly
disabled; LINE integration is absent. Completed is not a policy-sale metric.
List and global-summary requests have independent generations: a quick search
must not discard the pending summary or let it replace the filtered list. Newer
full refreshes and leaving the workspace invalidate older results. Local/hosted
verification remains separately recorded in `ADMIN_CASES_V2.md` and `HANDOFF.md`.

## Owner Edit Mode

Route: `/admin/edit`; legacy `/#edit` remains compatible.

Purpose: click-to-type text editing over the public page.

Behavior:

- Editable text fields become tappable/clickable.
- Empty editable text fields must persist in edit mode. Deleting all text from a
  slot records an intentional blank value and leaves a visible placeholder such
  as `ว่าง - คลิกเพื่อใส่ข้อความ` / `Empty - click to add text` so the owner can
  type into it again.
- Visible logos/images have click-to-edit crop/upload controls in the inline
  editor, using the same Cloudinary dialog and Draft/Publish semantics as the
  panel. See `CMS_MEDIA.md` and `HANDOFF.md` for release status. The advisor logo
  remains `brand.advisorLogo`/`brand.advisorLogoAlt`. Explicit per-image owners
  prevent edits to another slot that happens to use the same image file.
  Favicon, social metadata and absent images remain accessible in Images & crop.
- Edits support Thai and English separately.
- Owner bar should provide a route back to `Main`, switch to `Panel`, `Save
  draft`, `Preview`, `Publish`, finish the mode, and `Log out`.
- Drafts save to Firestore/local working state according to the data contract.
- Visitor styling should remain close to the live site while edit affordances are visible.

## Owner Draft Preview

Route: `/admin/preview`; legacy `/#preview` remains compatible.

Purpose: authenticated preview of the saved draft as a visitor would see it.

Behavior:

- Reads draft content, not live content, as the normal preview source.
- Shows exactly one top preview bar.
- Preview bar actions are `Open editor`, `Public site`, and `Publish`.
- `Open editor` returns to `/admin/edit`, preserving the selected Home/Motor scope.
- `Public site` opens clean `/` in a new browser tab.
- Does not generate `/?view=public`.
- Does not show the edit dock, admin drawer, screen switcher, public reopen bar,
  or `purich-admin-ever-v7` marker.
- Uses runtime `noindex,nofollow` metadata like other owner modes.
- Mobile preview bar must wrap without horizontal overflow and should not cover
  the visitor page's header/hero content.

## Owner Control Panel

Route: `/admin/content`; legacy `/#admin` remains compatible.

Purpose: reorder, hide/show, style, and configure site sections.

Required capabilities:

- Sections tab: reorder, hide/show, choose background tone, change columns.
- Sections follow the visitor route projection, including hidden rows for
  restoration. Shared rows identify cross-page effects; Home and Motor ordering
  stay independent. Motor must not append omitted local sections to the editor.
- The final `Licences & service roles` band and `Footer` appear at the end as
  fixed-position entries, with no reorder controls. Licence cards remain owned
  by `sections.@insurers.cards`; their visibility follows the insurer section
  and per-card switches. Motor's licence editor lists broker cards only, while
  Home retains all roles. Footer uses its existing shared show/hide control.
- `Motor insurer logos` edits the logo grid, not the final licence cards.
  `Motor coverage comparison` describes featured classes plus full comparison;
  it does not expose the retired table-width control. Related design controls
  are linked from Content, with `Shared page composition`, `Shared page design`,
  `Licence band design` and `Contact section design` display names. Original
  schema keys and data remain unchanged. Selecting content resets the drawer's
  internal scroll to the section heading.
- Content tab: edit structured section content.
- Repeatable Content tab rows/cards/columns are additive and reversible: adding
  creates a blank durable-ID item, duplicating creates a new ID, and hide/remove
  controls set `on:false` with an admin-visible Restore path rather than deleting
  the object.
- Brand & contact tab: edit brand text, advisor logo path/alt metadata,
  contact links, guarded SEO title/description, footer copy, and
  header/sticky visibility. The approved local Images & crop UI adds replace,
  ratio-lock, fit, source recrop, clear and cancel. Cloudinary Free is the signed
  upload backend; see `CMS_MEDIA.md`. No base64/binary
  image data belongs in Firestore.
- Theme & data tab: accent selection, import/export, reset/restore.
- Draft save, preview, publish, status/success feedback.
- Explicit `Save draft` and `Publish` must open custom confirmation dialogs, not
  native browser dialogs.
- Successful `Save draft` waits for the Firestore draft write, then shows a
  dismissible success toast without a post-save Undo action. Editor history
  remains available.
- Successful `Publish` waits for Firestore live/draft/version writes, then shows
  a dismissible toast with `Undo` available for 30 seconds.
- The post-Publish action is labeled **ย้อน Publish · เปลี่ยนเว็บจริง** and
  restores the previous live snapshot by publishing it back to Firestore.
- Persistent editor Undo/Redo and Reset Draft are separate. History contains
  complete content snapshots across languages, ordering and media, scoped to
  this owner/site/browser tab. Reset reads current Live transactionally and
  writes Draft only; Undo Reset restores the previous Draft. Failure/conflict
  retains current work. Save/Publish do not clear editor history.
- Uncommitted calculator JSON/import buffers survive history application but
  are not themselves historical Draft content. Explicit persistence blocks
  mutations while pending; generation checks and `cache:false` autosaves
  prevent older asynchronous work from replacing newer edits. See
  `CMS_EDITOR_HISTORY.md` for the full contract and direct controller tests.
- Closing the drawer from the direct `/admin/content` control-panel route returns to
  `/admin`.
- Closing the drawer after it was opened from `/admin/edit` via `Tools → Panel`
  only hides the drawer; it must stay on `/admin/edit`, keep the editor dock
  visible, and keep inline text/image edit affordances active.
- No owner bar should appear on a fresh or reloaded public `/` route just because the browser is signed in.
- Must include a way to switch to edit mode and return to Main.
- `/admin/edit` uses the warm-ink owner dock product direction.
  The default state shows editing status, Undo/Redo and `เครื่องมือ`; the status
  also identifies an open panel. `เครื่องมือ` expands a single dark-ink command
  palette above the dock. Desktop uses two
  groups for Draft (`Save draft`, `Preview`, `Publish`, `Reset Draft`) and navigation (`Panel`,
  `Main`, `Public site`, `Log out`); mobile stacks the same groups in one
  scrollable column with a 460px cap when viewport height allows. `Publish` is
  the only terracotta-filled dock action.
- Save/Preview/Publish remain available from the control panel and the
  inline-edit dock. Closing a direct control panel returns to `/admin`;
  closing the panel opened from the editor stays in `/admin/edit`.
- `Log out` should be available consistently from owner surfaces.
- The drawer must stack above visitor sticky header/navigation on mobile and
  should not fade in over the public header.

Admin panel labels use natural Thai in either website-content language. Retain
familiar terms such as Publish, Preview, Save draft, Undo/Redo and service names;
never translate stored field paths, enums or owner-entered copy. The display-only
metadata dictionary lives in `src/visitor/admin-labels.js`; see `ADMIN_LANGUAGE.md`.

## Admin Analytics

The `/admin` shell's Analytics module currently displays operational metrics
from its legacy Operations lead data. It does not load GA4. The standalone
`/admin/analytics` dashboard below owns the Firestore/GA4 traffic views; preserve
that distinction when updating navigation or documentation.

Route: `/admin/analytics`

Purpose: private operating view for traffic quality, consultation intent, and lead capture.

Current state:

- GA4 measurement ID: `G-5TF3C235EF`, installed on public production traffic.
- Firestore leads render live when available.
- GA4 traffic connects through the server-only `/api/analytics` endpoint when
  Vercel has the numeric GA4 property ID and service-account env vars.
- If GA4 env vars are missing or the Data API fails, traffic charts show honest
  setup/unavailable states, not fake data.
- LocalStorage-only admin sessions must not reveal analytics data. The route
  must verify active Firebase admin authorization before showing the private
  dashboard.

Required layout:

- Top brand/chrome with `Main`, `Public site`, and `Log out`.
- Heading group: `OWNER ANALYTICS`, `Analytics`, explanatory copy.
- Measurement card showing GA4 installed and Data API `Live`, `Setup needed`,
  or `Unavailable`.
- KPI cards:
  - Sessions
  - Active users
  - Leads saved
  - Conversion-ready signals where data exists
- Lead trend chart from Firestore lead timestamps when available.
- Enquiry mix chart from lead `qtype`.
- Coverage interest chart from lead `coverage`.
- Acquisition/channel table from GA4 when live.
- Device mix and top public pages from GA4 when live.
- Recent leads table/list.
- Empty states should explain what data source is missing without looking broken.

Mobile analytics must be especially careful with spacing. Cards should not feel pressed together.

## Data And Dynamic Content Contract

Firestore-first behavior:

- Public live content reads from runtime `states/live`: production
  `sites/covermate/states/live`; UAT `sites/covermate-uat/states/live`.
- Draft content reads/writes runtime `states/draft`: production
  `sites/covermate/states/draft`; UAT `sites/covermate-uat/states/draft`.
- Brand/config fields such as `brand.advisorLogo` are draft/live CMS values, not
  hard-coded public-only constants or stale fallback counts.
- Publish/restore history writes runtime `versions/{versionId}`.
- Public lead submissions write the runtime lead collection: production
  `contactLeads/{leadId}`; UAT `contactLeadsUat/{leadId}`.
- Live GA4 traffic reads through `/api/analytics` with server-only secrets; UAT
  uses only `COVERMATE_UAT_GA4_*` credentials when configured.
- Reserved analytics summaries may live under
  `sites/covermate/analytics/{analyticsDoc}` or
  `sites/covermate-uat/analytics/{analyticsDoc}`.

Cache policy:

- Local storage may be used only as last-known fallback or draft/session storage.
- Fresh Firestore live content must override stale local cache/default content.
- Fallback defaults must never overwrite live content after live data is successfully loaded.
- Only fetch what the page needs when practical, but correctness of live content is more important than over-aggressive caching.
- `covermate-freshness.mjs` defines the existing 30-second per-namespace server
  reader TTL, 30-second public CDN TTL and zero browser max-age. The server TTL
  begins after a successful read; failures do not serve expired server content.
- Public client polling keeps its 60-second interval, 5-second minimum gap and
  exponential retry cap of 300 seconds. Visibility/connectivity and route
  invalidation remain in `covermate-public.mjs`; Draft/Publish behavior is separate.

Lead privacy:

- Public leads may include name, contact, topic, enquiry type, coverage, language, source path, and timestamps according to the Firestore rules.
- Do not send visitor names, phone numbers, LINE IDs, or freeform message contents to GA4.

## Analytics Contract

Public GA4:

- Measurement ID: `G-5TF3C235EF`.
- Loads only on `covermateinsurance.com`.
- Suppresses owner hashes and active admin sessions.
- Tracks only the deployed aggregate event inventory:
  `page_view`, `line_click`, `phone_click`, `email_click`, `language_change`,
  `calculator_interaction`, `form_start`, `quote_submit`,
  `quote_submit_success`, and `quote_submit_error`.
- Drops query strings from `page_location` / `page_path` and rejects unknown
  event names or unsafe event parameters.

Private admin analytics:

- Does not load the public GA script.
- Requires active Firebase admin authorization, not localStorage alone.
- Reads only dashboard-needed Firestore lead fields when available.
- Reads aggregate GA4 traffic only through `/api/analytics`; service-account
  secrets must stay server-side.
- Shows `Live`, `Setup needed`, or `Unavailable` status for GA4 traffic.

## SEO Contract

Public visitor routes:

- `/` is indexable with canonical `https://covermateinsurance.com/`.
- `/motor` is indexable with canonical `https://covermateinsurance.com/motor`.
- Thai root URLs and stable English `?lang=en` URLs, each self-canonical,
  with reciprocal hreflang. Changing language preserves the current form.
- OG/Twitter image: `https://covermateinsurance.com/assets/covermate-og.png`.
- JSON-LD includes Website, Organization/InsuranceAgency, WebPage, and Service.
- Sitemap contains Home/Motor in both languages, never admin or hash URLs.
  Admin is crawlable so noindex can be read; it is not crawl-blocked as a
  substitute for authentication. API endpoints are excluded from crawling.
- Initial HTML and hydrated metadata share `covermate-seo.mjs` and published
  CMS fields via `api/page.js`; visual body rendering remains client-side.
  See `docs/SEO.md` for unpublished implementation status and hosted checks.

Admin routes:

- `noindex,nofollow,noarchive`.
- Do not expose admin functionality in public metadata.

Design implication:

- Public H1 must remain meaningful and visible.
- Page sections should preserve semantic headings.
- Avoid hiding essential SEO text inside images.

## Accessibility Contract

Required:

- Keyboard focus visible on buttons, links, inputs, accordions, toggles, owner controls.
- Touch targets are at least 44px-class on mobile/coarse pointer.
- Color contrast must remain readable on cream, sage, surface, and dark bands.
- Forms need labels, errors, and success messages.
- Icon-only buttons require accessible names/tooltips where needed.
- Language toggle must have understandable active state.
- Accordions and drawers need clear expanded/collapsed states.
- Motion/animation must respect reduced motion.

## Assets

Core assets:

- AIA logo: `/Users/point/CoverMate/assets/logos/aia-logo.png`
- Insurer logos: `/Users/point/CoverMate/assets/ins/01-viriyah.png` through `/Users/point/CoverMate/assets/ins/14-sompo.png`
- OG/social image: `/Users/point/CoverMate/assets/covermate-og.png`
- Favicon: `/Users/point/CoverMate/favicon.svg`
- Manifest icons: `/Users/point/CoverMate/assets/apple-touch-icon.png` and related app icons.

Do not replace specific insurer logos with generic placeholders. If a design mock cannot embed the exact images, represent the logo grid with labeled logo tiles that preserve count, rhythm, and scale.

## Security And NFR Guardrails

- Firebase admin access is allowlist-based at `admins/{uid}`.
- Public leads go through App Check/validation in `/api/leads`; direct anonymous
  Firestore writes are denied.
- CSP is enforced with documented inline/eval/blob renderer allowances.
- Static site should preserve fast first paint and avoid visual flashes such as raw template/icon blocks before hydration.
- NFR targets remain: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 where feasible for this static site.

## Design Guardrails

Do:

- Preserve the current warm advisory brand.
- Keep the public page continuous and anchor-based.
- Keep admin private surfaces visually related but operationally clear.
- Keep `/admin` as the Admin Portal Home with Operations, Website content,
  Analytics, and Settings.
- Keep explicit paths between `/admin`, `/admin/edit`, and `/admin/content`;
  public-site actions open clean public routes in a new tab, while close/main
  actions return to the existing Admin/editor context.
- Keep Google Sans family everywhere.
- Keep Firestore-first live content behavior visible in design copy/states.
- Keep unbuilt admin modules hidden instead of showing fake records or
  not-wired surfaces.
- Match compact reference rhythm while preserving readable text and touch areas.

Do not:

- Reintroduce duplicate motor nav items.
- Reintroduce `[object Object]` nav labels.
- Make `/#motor` behave like the dedicated motor page. The canonical motor
  campaign route is `/motor`; `/#motor` remains a home-page alias to
  `#insurers`.
- Remove `/admin` Admin Portal Home after login.
- Hide logout in only one owner mode.
- Replace live/dynamic CMS text with hard-coded design-only content.
- Let fallback/cache states override live Firestore content or current logo-count normalization.
- Send private visitor contact details to GA.
- Use unrelated fonts for body/admin text.
- Switch to a generic blue SaaS/dashboard theme.
- Commit, push, or deploy without explicit owner instruction.

## Acceptance Checklist For Design Updates

Public visitor:

- Header has one motor nav item and no duplicate `ประกันรถยนต์`.
- `/#motor` is represented as an alias to the motor insurer section, not a
  separate surface; `/motor` is the dedicated motor campaign route.
- All in-scope enabled content is represented, including the compact standalone
  coverage grid, illustrated featured tiers and consolidated FAQ.
- Peer FAQ/category/process cards have stable equal closed geometry; labels and
  disclosure icons have proper padding, long TH/EN copy and natural expansion.
- Insurer artwork is optically large and consistently padded inside its tiles.
- Tablet follows desktop composition with touch menus/disclosures, not hover-only controls.
- Actual-size and full-page desktop/mobile evidence is personally inspected;
  a passed build, DOM check or saved screenshot is not fidelity approval.
- Hero first viewport matches the current warm organic direction.
- AIA logo appears with the current transparent red asset.
- Motor insurer logo grid is present, credible, and driven by editable
  `insurers.items`.
- Motor tier table/cards render correctly on desktop and mobile.
- Coverage calculator cards have centered icon/title treatment.
- Fee cards do not clip text or decorative numbers.
- Contact heading Thai `ขอรับคำปรึกษา` fits as one line on desktop.
- Footer preserves licence/legal/contact credibility.

Admin:

- Login page shows Firebase Auth, not demo-only wording.
- Admin Portal Home exists after login.
- Portal target has exactly four primary cards: Operations, Website content,
  Analytics, Settings.
- Operations exposes the unified Cases workspace without leaving the admin
  shell. Legacy Dashboard/Leads/Tasks/Audit links resolve to Cases; records and
  history stay preserved. Unbuilt modules and fake records stay hidden.
- Owner/admin controls use natural Thai; retain conventional Publish, Preview, Save, Analytics and service names. Content TH/EN selection stays independent.
- Logout and mode switching are reachable from edit and control-panel flows.
- Closing the control panel while editing returns to the same editor context;
  use `Public site` only when intentionally opening the clean public route in a
  new tab.
- Standalone traffic Analytics uses the existing server Data API, or honest
  setup/error/empty states; shell Analytics retains its operational data scope.
- Analytics mobile spacing is comfortable.

System:

- Google Sans family applies to Thai and English text everywhere.
- Admin routes are noindex.
- Public analytics does not collect contact/freeform PII.
- Firestore live content wins over stale cache/defaults.
- Mobile and desktop layouts are both polished.

## Known Future Work

These are intentionally not required for the current visual design unless the owner asks:

- Optional scheduled GA4 export (the server Data API already exists).
- Further separation of the remaining visitor rendering/host runtime, if needed.
  CMS commands/history and calculator/submission logic already have source module
  owners; the generated embedded renderer remains active.
- Richer authenticated production smoke harness.
- Additional real customer story assets.
