# CoverMate Website Full Design Spec For Claude

Last updated: 2026-08-16

Production baseline: `https://covermate.vercel.app`

Implementation baseline: current production bundle in this repository. Use the
latest git commit/deployment record for the exact deployed revision.

Audience: Claude Design or any design partner updating the corresponding website/admin designs.

## Purpose

CoverMate is a Thai insurance advisory site for life, health, and motor insurance. The public site must feel like a calm, trustworthy personal advisor rather than a generic insurance comparison marketplace. The admin side is private owner tooling for editing content, arranging sections, publishing Firestore drafts, and reviewing owner analytics.

This spec exports the current product and visual contract so design updates can be made against the real site, not older standalone exports.

## Snapshot Evidence

Most recent complete production suite:

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

Latest Claude Design reconciliation evidence:

- Reconciliation doc:
  `/Users/point/CoverMate/docs/CLAUDE_DESIGN_RECONCILIATION.md`
- Snapshot folder:
  `/Users/point/CoverMate/docs/snapshots/claude-reconcile-2026-08-02`
- Compared reference:
  `/Users/point/Downloads/CoverMate Standalone (1).html`
- Reference SHA-256:
  `0bae1f0b89b43bf4836ae4ce81d3d3047cd6a256cc846baaee2679cfda853b73`
- Main evidence images: `comparison-public-desktop.png`,
  `comparison-public-mobile.png`, `comparison-admin-login.png`, and
  `comparison-admin-analytics.png`.
- Summary: the latest Claude HTML visually matches the public surface closely
  and fixes raw-template visibility, but it remains a design/reference artifact
  because admin auth/publish semantics are demo-oriented and the standalone
  still logs a `file://` `.image-slots.state.json` fetch error.

The following screenshots are historical ad-hoc visual evidence from production. They are useful for the exported spec context, but they are not a complete production snapshot suite:

- Public desktop: `/tmp/covermate-spec-home-desktop.png`
- Public mobile: `/tmp/covermate-spec-home-mobile.png`
- Admin login desktop: `/tmp/covermate-spec-admin-login.png`
- Admin launcher desktop: `/tmp/covermate-spec-admin-launcher.png`
- Admin analytics mobile: `/tmp/covermate-spec-admin-analytics.png`

These screenshots were captured from production on 2026-07-31 with mixed routes, viewports, and auth states. Do not treat them as exhaustive proof of every public/admin screen.

For release evidence, Claude handoff evidence, or "all screens" visual QA, capture a complete production snapshot suite instead:

- public full-page desktop/tablet/mobile;
- anchor states for `#cover`, `#fit`, `#insurers`, `#motor`, `#claim`, and `#talk`;
- TH and EN states when copy, typography, nav, or translation is in scope;
- admin signed-out login and redirect states;
- admin signed-in launcher, analytics, owner edit, owner arrange panel tabs, drawer-closed/reopen state, and preview;
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

1. Production site at `https://covermate.vercel.app`; verify the deployed commit for the current release in Vercel or `git log`.
2. Repository implementation in `/Users/point/CoverMate`.
3. Project docs in `/Users/point/CoverMate/docs`.
4. Firestore live CMS state when present: `sites/covermate/states/live`.
5. The current external machine-readable handoff package at
   `/Users/point/Downloads/Insurance Agent Poster Concepts.zip` for
   implementation planning, schema/API/rules references, and Claude handoff
   context. The filename is misleading; it contains a `handoff/` implementation
   package, not only poster concepts.
6. Earlier Claude/standalone/screenshots only as visual calibration.

If older references conflict with this spec or the live site, this spec and the live implementation win.

## Standalone And Claude Export Guardrail

Claude/standalone HTML files are reference artifacts, not production source of
truth. Use them for visual calibration and design handoff only after checking
whether they are truly portable.

A valid portable standalone must:

- open directly from `file://` without a dev server;
- include or inline every runtime dependency;
- avoid missing-file console errors for `support.js`, `image-slot.js`, or
  `_ds/*/_ds_bundle.js`;
- render no visible raw template markers such as `{{ brandName }}`,
  `{{ n.label }}`, `sc-if`, `sc-for`, `x-dc`, or `[object Object]`;
- render public, `#admin`, `#edit`, and relevant hash states after reload.

Known reference caveat:
`/Users/point/Downloads/CoverMate Standalone BUILD SOURCE (do not open).dc.html`
is runtime-dependent when opened alone from `/Downloads`. It can display raw
`{{ ... }}` placeholders if its sidecar runtime files are absent. Treat it as a
Claude reference input, not a valid self-contained deliverable. The candidate
packaged demo studied most recently is
`/Users/point/Downloads/CoverMate Standalone (1).html`, but it must still pass
the standalone validation checklist before being shared as evidence; the
2026-08-02 reconciliation found no visible raw template markers after settle but
did find a `file://` `.image-slots.state.json` fetch error.
If a standalone demo is required, ask Claude to produce a single self-contained
HTML file or a complete folder bundle with an explicit `open-this.html`.

## Claude Update Brief

Update the corresponding Claude designs to reflect the current product decisions:

- First read
  `/Users/point/CoverMate/docs/ADMIN_CMS_REBUILD_DECISIONS.md`; it is the
  current Admin/CMS rebuild authority. Then read
  `/Users/point/CoverMate/docs/CLAUDE_DESIGN_RECONCILIATION.md` as historical
  reconciliation context.
- The public site is one continuous page. `/#motor` is only an alias that scrolls to `#insurers`; it must not become a separate-looking page.
- The visitor navbar must show only one motor item: Thai `ประกันรถยนต์`, English `Motor`, pointing to `#insurers`.
- Keep the hidden focused motor variant available conceptually, but do not expose it in the public nav/design unless the owner explicitly asks.
- Add the expanded public sections that now exist after the original reference: policy review, claims, renewal reminder, guides, fee transparency, and PDPA/privacy.
- Admin Portal Home target has four primary modules: `Operations`,
  `Website content`, `Analytics`, and `Settings`. The home lives inside the
  same admin shell as those modules; `/admin/ops` remains only a compatibility
  entry that defaults to Operations.
- Admin menu/chrome labels are intentionally English: `Main`, `Public site`, `Log out`, `Panel`, `Edit text`, `Save draft`, `Preview`, `Publish`, `Success`.
- Admin `Public site` actions must clear owner markers and land on clean `/`
  without showing owner chrome. Legacy `/?view=public` may be consumed for
  compatibility, but new UI must not generate it.
- A signed-in admin session is not a visible public-page mode. A clean `/` load
  or reload must hide owner chrome even if stale local owner markers exist.
- All visible Thai and English text uses the Google Sans family. Headings and logo text may use heavier Google Sans weights, but do not reintroduce unrelated serif/display fonts.
- The AIA logo asset is the transparent red mark at `assets/logos/aia-logo.png`.
- Contact heading Thai `ขอรับคำปรึกษา` must remain one line on desktop and should avoid awkward word breaks elsewhere.
- Known stale Firestore CMS values that conflict with product decisions must be
  normalized on render/save/publish: duplicate `#motor` nav entries and
  forced-line-break contact headings. The rebuild target treats `26+` as
  Srikrung panel availability while the visible logo grid may remain a 14-logo
  selection.
- All behavior described here is a product decision as of this release, excluding future bugs that have not appeared yet.

## Visual Direction

The design language is warm, organic, advisory, and owner-operated:

- Backgrounds are cream, pale green, warm sand, and dark brown.
- Primary actions are terracotta/orange.
- Trust and proof surfaces lean sage/green.
- Dark sections use deep brown with terracotta cards, not black or blue.
- Decorative geometry is limited to oversized soft circles/organic curves integrated into page backgrounds.
- Avoid generic SaaS dashboards, blue/purple gradients, stock illustration hero art, sharp enterprise chrome, or crowded marketplace comparison tables.

The product should feel personal, careful, and financially credible. It should not feel salesy, over-designed, or like a landing-page template.

## Implementation Anchors

Primary files:

- Public visitor site and owner hash modes: `/Users/point/CoverMate/index.html`
- Admin Portal shell: `/Users/point/CoverMate/admin/index.html`
- Admin login: `/Users/point/CoverMate/admin/login/index.html`
- Admin analytics: `/Users/point/CoverMate/admin/analytics/index.html`
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
| `/` | Public visitor site | Prospective customers | Indexable |
| `/#motor` | Alias into public `#insurers` section | Prospective motor customers | Same page, no separate surface |
| `/#life` | Alias into public `#cover` section | Prospective life/health customers | Same page, no separate surface |
| `/#motor-focus` | Unexposed motor campaign variant | Campaign visitors when explicitly linked | Same page, no sitemap/nav exposure |
| `/#life-focus` | Unexposed life/health campaign variant | Campaign visitors when explicitly linked | Same page, no sitemap/nav exposure |
| `/#edit` | Owner click-to-edit text mode | Admin only | No separate index route |
| `/#admin` | Owner arrange/customise drawer over public page | Admin only | No separate index route |
| `/#preview` | Owner preview of draft | Admin only | No separate index route |
| `/admin/login` | Google sign-in gate | Admin only | `noindex` |
| `/admin` | Admin Portal shell | Admin only | `noindex` |
| `/admin/ops` | Compatibility entry into Operations in the Admin Portal shell | Admin only | `noindex` |

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
  - `#insurers`: `ประกันรถยนต์` / `Motor`
  - `#fit`: `เครื่องมือ` / `Resources`
  - `#faq`: `คำถามที่พบบ่อย` / `FAQ`
- Language segmented control: `TH` and `EN`.
- Primary CTA: chat icon + `แอดไลน์` / LINE copy.

Guardrails:

- Never show two `ประกันรถยนต์` nav items.
- Do not make `#motor` appear like a separate website.
- Header should stay calm and not become a marketing mega-nav.

## Visitor Section Order

The current public page has 16 visible live sections plus one embedded `cover`
data source. `cover` is no longer a standalone public/Admin section; its
product details render inside the hero coverage accordion cluster, and the
`#cover` anchor lands there for existing nav and `/#life` compatibility.

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

Claude designs should include all sections. Do not stop at the older shorter reference page.

## Visitor Component Specs

### Hero

Purpose: immediately clarify the human promise: the visitor does not have to manage insurance alone.

Required elements:

- Trust badge/pill.
- Large Thai/English headline.
- Supporting copy.
- Primary LINE consultation button.
- Secondary calculator/assessment button.
- Personal advisor proof row with AIA logo.
- Organic green background circle and soft peach shape.
- Trust bar hint visible below the first viewport.

The hero must not become a split hero with a generic image card. The brand/value proposition is the first-viewport signal.

### Trust Bar

Purpose: quick reassurance after hero.

Structure:

- Four pill cards with small icons.
- Content examples: no over-selling, AIA life/health representative, fast LINE response, claim continuity.

Keep pills stable and readable across widths.

### Hero Coverage Accordions

Purpose: show coverage categories the advisor can help with.

Structure:

- Embedded in the hero assist-card cluster under the coverage prompt.
- `#cover` is an anchor on this cluster, not on a standalone section.
- Product cards use circular icon chips, title, short subtitle, and accordion expand affordance.
- Product types currently include life, health, disease/critical illness, personal accident, home, and motor.
- Expanded details use the existing `cover.items[*].b1/b2/b3/note` data.
- The Admin Sections list must not show `#cover`; owners edit this copy inline
  where it appears on the page.

Rows should feel like actionable advisory categories, not commodity cards.

### Policy Review

Purpose: explain that CoverMate can review an existing policy before selling anything new.

Structure:

- Light section after coverage products.
- Three-step/cards explaining upload/share policy, review gaps/overlap, and receive simple advice.

This section is a trust-builder. Avoid pushing conversion too hard here.

### Coverage Calculator

Purpose: interactive estimate of recommended coverage.

Structure:

- Dark brown section.
- Left copy block with warm heading.
- Right or adjacent calculator panel depending on viewport.
- Segmented/card-like choices for situation context.
- Inputs for essential monthly spending, support years, debts/future
  obligations, liquid assets/existing cover, current room benefit, and recovery
  period.
- Three outputs: life starting need, health room-reference gap, and
  critical-illness/recovery buffer.
- Calculated numbers are prominent but not alarmist and must read as advisory
  starting points rather than guaranteed costs or quotations.

Current refinements:

- Life-stage option cards center their icon and label.
- Cards must not look left-heavy.
- Use terracotta cards against deep brown.
- The calculator follows `/Users/point/CoverMate/docs/NEEDS_CALCULATOR.md`.
  Do not reintroduce arbitrary salary/dependency multipliers.
  `fit.calculator` in Firestore is the source of truth; embedded defaults only
  fill missing nested assumptions. Situation-card labels, icons, tints, and
  recommendation bullets are `fit.calculator.situations` data, and the first
  enabled situation renders by default so results appear on initial load.

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
- Centered heading: copy may state `26+` Srikrung panel availability while the
  visible logo grid remains a curated 14-logo selection.
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
- Do not create a separate motor page in nav. This is the `#insurers` anchor.

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

- Three fee cards with clear headings and explanatory copy.
- Prevent clipping of large decorative numbers.
- Keep paragraph lines readable.

### PDPA / Privacy

Purpose: clarify data handling.

Structure:

- Calm informational section.
- Bullet list of what is collected, why, retention/sharing stance, and user choices.
- Avoid legal-wall density.

### Contact / Lead Form

Purpose: final conversion without pressure.

Structure:

- Dark brown band.
- Left contact copy and LINE card.
- Right form card.
- Thai heading `ขอรับคำปรึกษา` must remain a one-line phrase on desktop.
- Fields: name, LINE/phone, enquiry type, coverage interest, message/details.
- CTA uses terracotta and clear arrow/icon.

No form should send freeform personal contact details to GA4.

### Footer

Purpose: credibility, navigation, and legal details.

Structure:

- Dark footer.
- Brand summary, nav links, contact details, legal copy, OIC verify link.
- Footer links should be readable and not cramped on mobile.

## Public Interactions And States

Visitor interactions:

- Language toggle updates visible text between Thai and English.
- Header nav scrolls to anchors on the same page without rebuilding the visitor
  DOM or causing a visible flicker.
- `/#motor` normalizes to the motor insurer anchor behavior.
- `/#life` normalizes to the coverage anchor behavior.
- `/#motor-focus` and `/#life-focus` render unexposed campaign variants and
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
- English explanatory copy.
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
- Quick actions:
  - `Edit public-page words`
  - `Preview website draft`
  - `Review lead intake`
  - `Open follow-ups`
- System status rows for Firebase admin session, Operations backend, Website
  CMS, and first-party analytics.
- `Public site` and `Log out` actions.

`Public site` links land directly on clean `/` after clearing owner markers.
The public bundle may still consume old `/?view=public` links for compatibility.
Clean public loads must also clear or ignore stale owner markers. Owner controls live on `/admin`, `/#admin`, `/#edit`, and `/#preview`, not on the visitor site.

Layout:

- Desktop: four cards in one row when space allows.
- Tablet: two-column modules.
- Mobile: one column with generous spacing.

Do not remove the Admin Portal Home after login. It is the required hub.

## Owner Edit Mode

Route/hash: `/#edit`

Purpose: click-to-type text editing over the public page.

Behavior:

- Editable text fields become tappable/clickable.
- Media is not changed through inline binary upload. The advisor proof logo is
  managed as metadata in the owner panel through `brand.advisorLogo` and
  `brand.advisorLogoAlt`, defaulting to `assets/logos/aia-logo.png`.
- Edits support Thai and English separately.
- Owner bar should provide a route back to `Main`, switch to `Panel`, `Save
  draft`, `Preview`, `Publish`, finish the mode, and `Log out`.
- Drafts save to Firestore/local working state according to the data contract.
- Visitor styling should remain close to the live site while edit affordances are visible.

## Owner Draft Preview

Route/hash: `/#preview`

Purpose: authenticated preview of the saved draft as a visitor would see it.

Behavior:

- Reads draft content, not live content, as the normal preview source.
- Shows exactly one top preview bar.
- Preview bar actions are `Open editor`, `Public site`, and `Publish`.
- `Open editor` returns to `/#edit`.
- `Public site` clears transient owner state and lands on clean `/`.
- Does not generate `/?view=public`.
- Does not show the edit dock, admin drawer, screen switcher, public reopen bar,
  or `purich-admin-ever-v7` marker.
- Uses runtime `noindex,nofollow` metadata like other owner modes.
- Mobile preview bar must wrap without horizontal overflow and should not cover
  the visitor page's header/hero content.

## Owner Arrange Panel

Route/hash: `/#admin`

Purpose: reorder, hide/show, style, and configure site sections.

Required capabilities:

- Sections tab: reorder, hide/show, choose background tone, change columns.
- Content tab: edit structured section content.
- Brand & contact tab: edit brand text, advisor logo path/alt metadata,
  contact links, guarded SEO title/description, footer copy, and
  header/sticky visibility. It must not expose direct file upload, Firebase
  Storage upload, base64/data-image storage, crop tools, or drag/drop image
  processing.
- Theme & data tab: accent selection, import/export, reset/restore.
- Draft save, preview, publish, status/success feedback.
- Explicit `Save draft` and `Publish` must open custom confirmation dialogs, not
  native browser dialogs.
- Successful `Save draft` waits for the Firestore draft write, then shows a
  dismissible toast with `Undo` available for 30 seconds.
- Successful `Publish` waits for Firestore live/draft/version writes, then shows
  a dismissible toast with `Undo` available for 30 seconds.
- `Undo` after publish restores the previous live snapshot by publishing it
  back to Firestore.
- Closing the drawer should not trap the owner; it returns to `/admin`.
- No owner bar should appear on a fresh or reloaded public `/` route just because the browser is signed in.
- Must include a way to switch to edit mode and return to Main.
- `/#edit` uses the warm-ink owner dock from the Claude owner-dock reference.
  The default state shows only `Editing on page` and `Tools`; if the admin
  drawer is open while inline editing remains active, the status becomes
  `Editing on page · Panel open`. `Tools` expands a single dark-ink command
  palette above the dock. Desktop uses two
  groups, `Draft` (`Save draft`, `Preview`, `Publish`) and `Go to` (`Panel`,
  `Main`, `Public site`, `Log out`); mobile stacks the same groups in one
  scrollable column with a 460px cap when viewport height allows. `Publish` is
  the only terracotta-filled dock action.
- Save/Preview/Publish remain available from `/#admin` and the inline-edit dock; closing the drawer returns to `/admin`.
- `Log out` should be available consistently from owner surfaces.
- The drawer must stack above visitor sticky header/navigation on mobile and
  should not fade in over the public header.

Admin panel labels should be English even when public language is Thai.

## Admin Analytics

Route: `/admin/analytics`

Purpose: private operating view for traffic quality, consultation intent, and lead capture.

Current state:

- GA4 measurement ID: `G-5TF3C235EF`, installed on public production traffic.
- GA4 Data API is not connected in the static app yet.
- Firestore leads render live when available.
- Traffic charts are backend-ready placeholders until a GA4 Data API or scheduled Firestore export exists.
- LocalStorage-only admin sessions must not reveal analytics data. The route
  must verify active Firebase admin authorization before showing the private
  dashboard.

Required layout:

- Top brand/chrome with `Main`, `Public site`, and `Log out`.
- Heading group: `OWNER ANALYTICS`, `Analytics`, explanatory copy.
- Measurement card showing GA4 installed and Data API not connected/backend needed.
- KPI cards:
  - Sessions
  - Active users
  - Leads saved
  - Conversion-ready signals where data exists
- Lead trend chart from Firestore lead timestamps when available.
- Enquiry mix chart from lead `qtype`.
- Coverage interest chart from lead `coverage`.
- Recent leads table/list.
- Empty states should explain what data source is missing without looking broken.

Mobile analytics must be especially careful with spacing. Cards should not feel pressed together.

## Data And Dynamic Content Contract

Firestore-first behavior:

- Public live content reads from `sites/covermate/states/live`.
- Draft content reads/writes `sites/covermate/states/draft`.
- Brand/config fields such as `brand.advisorLogo` are draft/live CMS values, not
  hard-coded public-only constants or stale fallback counts.
- Publish/restore history writes `sites/covermate/versions/{versionId}`.
- Public lead submissions write `contactLeads/{leadId}`.
- Reserved analytics summaries may live under `sites/covermate/analytics/{analyticsDoc}`.

Cache policy:

- Local storage may be used only as last-known fallback or draft/session storage.
- Fresh Firestore live content must override stale local cache/default content.
- Fallback defaults must never overwrite live content after live data is successfully loaded.
- Only fetch what the page needs when practical, but correctness of live content is more important than over-aggressive caching.

Lead privacy:

- Public leads may include name, contact, topic, enquiry type, coverage, language, source path, and timestamps according to the Firestore rules.
- Do not send visitor names, phone numbers, LINE IDs, or freeform message contents to GA4.

## Analytics Contract

Public GA4:

- Measurement ID: `G-5TF3C235EF`.
- Loads only on `covermate.vercel.app`.
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
- Treats GA4 charts as honest placeholders until a backend/export is added.

## SEO Contract

Public root:

- Indexable.
- Canonical: `https://covermate.vercel.app/`.
- Thai and English metadata.
- OG/Twitter image: `https://covermate.vercel.app/assets/covermate-og.png`.
- JSON-LD includes Website, Organization/InsuranceAgency, WebPage, and Service.
- Sitemap and robots should include the public root and exclude admin routes.

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
- Security rules validate public lead creates.
- CSP is currently report-only because the generated bundle uses inline code.
- Static site should preserve fast first paint and avoid visual flashes such as raw template/icon blocks before hydration.
- NFR targets remain: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 where feasible for this static site.

## Design Guardrails

Do:

- Preserve the current warm advisory brand.
- Keep the public page continuous and anchor-based.
- Keep admin private surfaces visually related but operationally clear.
- Keep `/admin` as the Admin Portal Home with Operations, Website content,
  Analytics, and Settings.
- Keep Google Sans family everywhere.
- Keep Firestore-first live content behavior visible in design copy/states.
- Keep unbuilt admin modules hidden instead of showing fake records or
  not-wired surfaces.
- Add breathing room where cards or text are crowded.

Do not:

- Reintroduce duplicate motor nav items.
- Reintroduce `[object Object]` nav labels.
- Make `#motor` a separate public website.
- Remove `/admin` Admin Portal Home after login.
- Hide logout in only one owner mode.
- Keep explicit paths between `/admin`, `/#edit`, and `/#admin`; public-exit
  and close actions must land on clean `/`.
- Replace live/dynamic CMS text with hard-coded design-only content.
- Let fallback/cache states override live Firestore content or current logo-count normalization.
- Send private visitor contact details to GA.
- Use unrelated fonts for body/admin text.
- Switch to a generic blue SaaS/dashboard theme.
- Commit, push, or deploy without explicit owner instruction.

## Acceptance Checklist For Claude Design Updates

Public visitor:

- Header has one motor nav item and no duplicate `ประกันรถยนต์`.
- `#motor` is represented as an alias to the motor insurer section, not a separate surface.
- All visible sections are represented in the design, including motor tier
  comparison, while `cover` is represented as hero accordions rather than a
  standalone band.
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
- Operations sub-tabs expose Dashboard, Leads, Tasks, and Audit without leaving
  the admin shell. Unbuilt modules stay hidden instead of rendering not-wired
  states or fake records.
- Owner/admin controls use English labels.
- Logout and mode switching are reachable from edit and arrange flows.
- Closing arrange panel exits owner mode to clean `/`; reopen tools from
  `/admin`.
- Analytics page includes GA4 installed status, Data API placeholder, KPI cards, charts, and recent leads states.
- Analytics mobile spacing is comfortable.

System:

- Google Sans family applies to Thai and English text everywhere.
- Admin routes are noindex.
- Public analytics does not collect contact/freeform PII.
- Firestore live content wins over stale cache/defaults.
- Mobile and desktop layouts are both polished.

## Known Future Work

These are intentionally not required for the current visual design unless the owner asks:

- GA4 Data API backend or scheduled GA4 export into Firestore.
- Full source refactor out of embedded generated HTML into component modules.
- Richer authenticated production smoke harness.
- Additional real customer story assets.
