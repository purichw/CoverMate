# CoverMate Claude Design Reconciliation

Last updated: 2026-08-02

Purpose: keep the Claude Design/export loop aligned with the real CoverMate
product. This document reconciles the latest Claude standalone HTML with the
latest CoverMate production/product spec so future Claude exports stop
reintroducing already-decided product conflicts.

## What Was Studied

Latest Claude HTML reference:

- File: `/Users/point/Downloads/CoverMate Standalone (1).html`
- SHA-256:
  `0bae1f0b89b43bf4836ae4ce81d3d3047cd6a256cc846baaee2679cfda853b73`
- Size: `2914564` bytes
- Extracted reference manifest:
  `/Users/point/CoverMate/.claude-reference/covermate-standalone-2026-08-02-latest/reference-manifest.md`
- Extracted worklog:
  `/Users/point/CoverMate/.claude-reference/covermate-standalone-2026-08-02-latest/CLAUDE_TO_A_TEE_WORKLOG.md`

Product/spec references:

- Current production baseline: `https://covermate.vercel.app`
- Repository design spec:
  `/Users/point/CoverMate/docs/covermate-website-full-design-spec.md`
- Latest implementation spec from Claude/Product handoff:
  `/Users/point/Downloads/SPEC (1).md`
- Current machine-readable handoff package:
  `/Users/point/Downloads/Insurance Agent Poster Concepts.zip`
  containing `handoff/` defaults, schema, OpenAPI, Firestore rules, helper
  source, theme data, and spec test stubs.

Snapshot evidence:

- Folder:
  `/Users/point/CoverMate/docs/snapshots/claude-reconcile-2026-08-02`
- Main comparison images:
  - `comparison-public-desktop.png`
  - `comparison-public-mobile.png`
  - `comparison-admin-login.png`
  - `comparison-admin-analytics.png`
- Raw capture data:
  - `capture-summary.json`
  - `capture-summary-extra.json`

## Source-Of-Truth Order For Claude

Use this order for future Claude design/export work:

1. Newest explicit owner request.
2. Production product decisions documented in this repository.
3. Latest implementation spec and `handoff/` package.
4. Latest Claude HTML visual reference, only where it does not conflict with
   product decisions.
5. Older screenshots, standalone files, and earlier Claude exports as visual
   calibration only.

The supplied Claude HTML is valuable visual evidence. It is not allowed to
override production auth, Firestore, publishing, analytics, SEO, privacy,
routing, or admin-mode contracts.

## Rendered Findings

The latest HTML is much healthier than the broken raw-template export:

| Check | Reference HTML | Production |
| --- | --- | --- |
| Public root renders without raw `{{ ... }}` markers | Pass | Pass |
| First-paint `Unpacking...` visible after settle | No | No |
| Visible public sections | 17 | 17 |
| Page-level horizontal overflow at 1440 and 390 | None found | None found |
| Computed body font | Google Sans / Google Sans Thai stack | Google Sans / Google Sans Thai / Noto Sans Thai stack |
| Public route owner chrome | Not visible | Not visible |
| Console | `file:// .image-slots.state.json` fetch error | Clean on public root |
| SEO document title | Blank after unpack | Production title present |

Important clarification: automated nav text sees motor twice because it also
captures footer/jump links. The product guardrail is one motor item in the
visitor header nav. Footer may repeat the same nav list.

## Product Decisions Claude Must Preserve

These are not suggestions. They are accepted product decisions in the current
production/dev line.

| Area | Decision |
| --- | --- |
| Public site structure | One continuous page. `/#motor` is an alias to `#insurers`, not a second motor website. |
| Public section set | Keep all 17 sections: hero, trust, cover, review, fit, how, insurers, tiers, claim, renew, guides, voices, about, faq, fees, privacy, talk. |
| Header nav | Header shows one motor item only: Thai `ประกันรถยนต์`, English `Motor`, href `#insurers`. |
| Focus routes | `/#motor-focus` and `/#life-focus` may exist as unexposed campaign variants. They are not public nav or sitemap items. |
| Admin launcher | `/admin` remains after login and has exactly three primary cards: `Edit the words`, `Arrange & customise`, `Analytics`. |
| Admin labels | Owner/admin chrome labels are English: `Main`, `Public site`, `Log out`, `Panel`, `Edit text`, `Save draft`, `Preview`, `Publish`, `Success`. Do not reintroduce Thai `ออก` as an ambiguous action label. |
| Public-site exit | `Public site` uses `/?view=public`, clears owner markers, then returns to clean `/`. A signed-in admin session must not visibly alter the public visitor page. |
| Owner reopen bar | In-session recovery only after closing admin/edit tools. It must not survive a clean public `/` reload through stale localStorage. |
| Save/Publish | Must use custom confirmation dialogs, wait for Firestore writes, then show dismissible success toasts with a 30-second `Undo`. |
| CMS content | Firestore live content is canonical for visitors. Draft is private. Local fallback/cache may not override successfully loaded Firestore live content. |
| Typography | Google Sans family everywhere. Do not reintroduce Caprasimo, Chonburi, or unrelated display/body fonts. |
| AIA logo | Use `assets/logos/aia-logo.png`, transparent red AIA mark, as the advisor proof logo default. |
| Claim stories | Stay placeholder/not-filled until real permissioned, anonymised, document-matched claim material exists. Do not design fake testimonial proof. |
| Analytics | Analytics is a private admin surface. Public GA4 receives aggregate events only, never names, phones, LINE IDs, email, or freeform text. |
| SEO | Public root is indexable with canonical metadata and JSON-LD. Admin routes are `noindex`. |

## Reconciliation Ledger

| Surface / component | Claude HTML says / shows | Product reality | Decision | Claude next-export rule |
| --- | --- | --- | --- | --- |
| Public visitor root | Warm organic page with 17 sections. | Production also has 17 sections and similar rhythm. | Claude adopted / matched. | Keep this public structure and section order. |
| Mobile visitor | Reference includes demo screen switcher bottom-left. | Production has no screen switcher and keeps mobile CTA unobstructed. | Product UX preserved. | Screen switcher is standalone demo-only; never include in production public design. |
| Header nav | Same public nav list, but footer links can be captured too. | Header has one motor item; footer may repeat nav. | Product UX preserved. | Design/QA should check header nav separately from footer nav. |
| `#motor` | Reference includes normal public route anchors. | Production aliases `#motor` to `#insurers`; no separate page chrome. | Product UX preserved. | Do not design a separate-looking motor page unless owner explicitly reopens this decision. |
| Hero proof card | Reference can show placeholder image state in standalone due image-slot storage. | Production uses AIA red logo from `brand.advisorLogo`. | Hybrid. | Keep Claude layout but use real AIA logo asset/default and editable image field. |
| Stories / voices | Reference heading implies real claim stories. | Product keeps "not filled yet" placeholder until compliant cases exist. | Product UX/compliance preserved. | Use placeholder/no-real-review state unless real approved stories are provided. |
| Admin login | Reference says `Demo build`, no server, button opens portal. | Production uses Firebase Auth and Firestore `admins/{uid}` allowlist. | Behavior exception / product preserved. | Keep card geometry, but production design copy must say Firebase Auth/Firestore allowlist, not demo. |
| Admin launcher | Reference has three cards including Analytics. | Production matches the three-card launcher and routes to real surfaces. | Claude adopted + product routing preserved. | Keep the three equal-weight cards. Do not bypass `/admin` after login. |
| Admin panel close | Reference visible button says Thai `ออก`. | Production uses close semantics, not sign-out, and keeps `Log out` separate. | Product UX preserved. | Replace ambiguous `ออก` with icon/accessible close or English close semantics; do not imply logout. |
| Owner action bar | Reference has Save/Preview/Publish but localStorage/demo flashes. | Production uses custom confirm dialogs, Firestore writes, toasts, Undo. | Product UX preserved. | Design confirm/toast/Undo states explicitly. Do not collapse to a short flash. |
| Public-site action | Reference `goVisitor` sets hash empty. | Production must use `/?view=public` to clear owner marker and suppress admin chrome. | Product UX preserved. | Future exports must model `Public site` as a clean visitor-view transition, not just hash clear. |
| Inline edit | Reference supports direct text edit and toolbar. | Production also supports direct edit plus supported image edit and Firestore draft. | Hybrid. | Keep direct editing visuals; preserve draft/live, image field, teardown, and mode-switch controls. |
| Analytics | Reference is visually close but demo/local and says Firestore unavailable. | Production `/admin/analytics` is private, reads Firestore leads when allowed, and keeps GA4 backend placeholders. | Hybrid. | Keep visual dashboard, but distinguish real Firestore lead data from GA4 Data API placeholders. |
| Lead forms | Reference sets success in browser only. | Production writes validated Firestore `contactLeads/*`. | Behavior exception / product preserved. | Do not design lead success as a fake local-only state for production. Consent/privacy must remain visible. |
| Renewal form | Reference validates in browser only. | Production writes the same Firestore lead stream with renewal summary. | Behavior exception / product preserved. | Keep validation/help copy but preserve real Firestore persistence. |
| Fonts | Reference source still contains Caprasimo/Figtree Organic source, though computed render is patched to Google Sans. | Production decision is Google Sans family everywhere. | Product preserved. | Remove old display-font tokens from future design exports; do not rely on downstream patches. |
| Standalone wrapper | Reference opens and renders, but logs `.image-slots.state.json` `file://` fetch error. | A portable standalone must open cleanly from `file://`. | Not fully portable yet. | If sending a standalone deliverable, make it self-contained and clean-console, or label it as reference-only. |
| SEO metadata | Reference unpacked document title is blank. | Production title/canonical/OG/JSON-LD are required. | Product preserved. | Claude visual export may omit SEO only if marked design-only; implementation handoff must include SEO contract. |

## SPEC Reconciliation

`/Users/point/Downloads/SPEC (1).md` adds target architecture and data contracts
that are broader than today's static production bundle. Treat them this way:

| SPEC (1) item | Current production status | Reconciliation |
| --- | --- | --- |
| Next.js App Router + TypeScript API layout | Not current repo architecture; repo is static Vercel bundle. | Target refactor architecture, not a reason for Claude to remove current static production behavior. |
| One `SiteDocument` / one `config` shared by admin and visitor | Current bundle follows this concept via embedded config + Firestore live/draft. | Keep as hard contract. |
| Draft/live/history API endpoints | Current production uses Firebase helper + Firestore directly from static app. | Target backend/API contract for future refactor; visible UX must already reflect draft/live/publish separation. |
| `SCHEMA`, `TYPE_LABEL`, section type registry | Current bundle has embedded schema-like editor logic. | Keep as implementation contract for future refactor and Claude handoff. |
| Owner rich text subset | Current inline edit supports owner text overrides; full markup subset is target/handoff contract. | Claude should design toolbar/states, not invent arbitrary rich text. |
| Hide/show model with `on` and `off` | Current admin panel supports hide/show and product docs require it. | Keep. Hidden means absent on visitor page. |
| Custom confirm/toast/Undo publish flow | Current production implements this; Claude reference still lags. | Product wins. Future Claude export must show these states. |
| GA4 event dictionary / no PII | Current production has GA4 installed and privacy boundary. | Keep. Claude must not add PII metrics or fake charts. |
| Standalone build as handoff artifact | Current product treats standalone/reference HTML as not source-of-truth unless clean and self-contained. | Reconcile wording: standalone is useful review artifact, not production source. |
| Collateral surfaces | Separate from web build. | Keep same brand/legal/copy rules, but do not bundle into web production. |

## Feedback Prompt For Claude

Use this prompt when asking Claude Design to update the next CoverMate design or
standalone export:

```text
You are updating CoverMate designs against the real production product, not an
older standalone demo. Use this source order:

1. The newest owner request.
2. Production/product decisions in /Users/point/CoverMate/docs.
3. SPEC (1).md and the handoff/ package from Insurance Agent Poster Concepts.zip.
4. The latest standalone HTML only as visual evidence when it does not conflict.

Must preserve:
- Public site is one continuous anchor page.
- #motor is an alias to #insurers, not a separate website.
- Header has one motor nav item only: TH "ประกันรถยนต์", EN "Motor", href #insurers.
- Keep all 17 public sections: hero, trust, cover, review, fit, how, insurers,
  tiers, claim, renew, guides, voices, about, faq, fees, privacy, talk.
- Keep /admin launcher after login with exactly three cards: Edit the words,
  Arrange & customise, Analytics.
- Admin labels are English: Main, Public site, Log out, Panel, Edit text,
  Save draft, Preview, Publish, Success.
- Inline edit uses the warm-ink owner dock from `owner-dock-spec.md`. Keep
  `Mode · Text edit`, `Tools`, and `Done` visible by default; put `Save draft`,
  `Preview`, and `Publish` under `Draft`, and `Panel`, `Main`, `Public site`,
  and `Log out` under `Go to`. Do not reintroduce the black/white alternating
  toolbar; `Publish` is the only terracotta-filled dock action.
- Public site action clears owner chrome. A signed-in admin session is not a
  visible public-page mode.
- Save draft and Publish require custom confirmation dialogs, successful
  Firestore writes, dismissible success toasts, and 30-second Undo.
- Production login copy is Firebase Auth + Firestore admins/{uid} allowlist,
  not demo/no-server copy.
- Analytics is private. Firestore leads render when available; GA4 traffic
  charts stay backend/Data API placeholders. No PII goes to GA4.
- Google Sans family everywhere. Do not reintroduce Caprasimo, Chonburi, or
  unrelated display/body fonts.
- AIA proof logo uses assets/logos/aia-logo.png and remains editable through
  brand.advisorLogo.
- Claim/customer stories remain placeholder/not-filled until real permissioned,
  anonymised, document-matched cases exist.
- Admin routes are noindex; public root keeps SEO metadata/JSON-LD/canonical.

If exporting standalone:
- Deliver a single self-contained HTML or complete folder bundle with an
  explicit open-this file.
- It must open from file:// with no raw {{ ... }}, sc-if, sc-for, x-dc,
  [object Object], "Unpacking..." flash after settle, or missing-file console
  errors.
- #login and #portal are demo-only ports; production routes are /admin/login
  and /admin.
- The screen switcher is standalone-only, collapsed by default, and must never
  appear in production public UI.

For every new visual change, provide a decision ledger:
component | follows Claude | preserves production | hybrid | reason | risk.
```

## Acceptance Checklist For Future Claude Exports

Public:

- No raw template markers or unpack splash after the page settles.
- Public root has 17 visible sections in the expected order.
- Desktop and mobile have no page-level horizontal overflow.
- Header nav has one motor item; footer repeats are okay.
- `#motor` scrolls/aliases into the motor insurer section and keeps global nav.
- AIA proof logo is the red AIA mark, not a generic placeholder.
- Stories/voices remain clearly placeholder unless real compliant stories exist.

Admin:

- `/admin/login` production design uses Firebase/Auth allowlist copy.
- `/admin` launcher exists and keeps three cards.
- `/#admin` uses English admin chrome, separates close from logout, and keeps
  mode switching visible.
- `Save draft` and `Publish` include custom confirmation, success toast, close
  button, and 30-second Undo states.
- `Public site` visibly returns to clean visitor mode with no owner chrome.
- `/admin/analytics` distinguishes Firestore lead data from GA4 Data API
  placeholders.

System:

- Google Sans family applies everywhere.
- Public GA4 excludes visitor PII and freeform text.
- Firestore live wins over fallback/cache.
- Standalone evidence, if provided, passes clean-console `file://` validation.

## Open Reconciliation Notes

- The current production repo is still a static exported bundle. SPEC (1)'s
  Next.js/API structure should guide a future refactor, not cause a Claude
  design export to remove existing production behavior.
- The latest reference root visually matches production closely. The biggest
  mismatches are demo-only/admin behavior, standalone portability, and stale
  source font tokens.
- The reference's `file://` `.image-slots.state.json` error means it is not yet
  a fully clean portable standalone, even though visible raw template markers
  are fixed.
