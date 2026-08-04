# CoverMate Claude Feedback: SPEC 2 / Handoff Conflicts

Last updated: 2026-08-03

Purpose: this is a direct feedback note for Claude Design before producing the
next CoverMate standalone or design update. It reconciles the latest Claude
handoff package with the real production product decisions in this repository.

## Artifacts Studied

- `/Users/point/Downloads/SPEC (2).md`
  - SHA-256:
    `63e566124316e7bddb8a472a75acf95866acc008fd8e6cfd9de6e3a186c0d81d`
- `/Users/point/Downloads/CoverMate Standalone (2).html`
  - SHA-256:
    `cd877fc02501b7933d98f8c77ffcffe8820a2ebcfd050bc5a202a292ee46683d`
- `/Users/point/Downloads/CoverMate Handoff.zip`
  - SHA-256:
    `a64ad69ca885f8fdfd2bcc62fe12d4adbbe65f23c420dd59f2d59a02408d1787`
- Existing production/product docs:
  - `/Users/point/CoverMate/docs/covermate-website-full-design-spec.md`
  - `/Users/point/CoverMate/docs/CLAUDE_DESIGN_RECONCILIATION.md`
  - `/Users/point/CoverMate/docs/DATA_CONTRACT.md`
  - `/Users/point/CoverMate/docs/INTERACTION_MAP.md`
  - `/Users/point/CoverMate/docs/ARCHITECTURE.md`

Rendered standalone check:

- The latest standalone hydrates successfully in Chrome.
- No visible raw `{{ ... }}`, `sc-if`, `sc-for`, `x-dc`, `[object Object]`,
  or settled `Unpacking...` leak was found in the DOM.
- `#motor` and `#insurers` scroll to the same motor-insurer section.
- Body and H1 computed font stacks resolve to Google Sans / Google Sans Thai.
- Known issue: opening the standalone from `file://` still logs a
  `.image-slots.state.json` fetch error. Treat this as a portability issue to
  clean up in future exports.

## Source-Of-Truth Order

Use this order when sources disagree:

1. Latest explicit owner request.
2. Production product decisions documented in `/Users/point/CoverMate/docs`.
3. Current production behavior at `https://covermate.vercel.app`.
4. `/Users/point/Downloads/SPEC (2).md` and the extracted handoff package.
5. `/Users/point/Downloads/CoverMate Standalone (2).html` as visual evidence
   only where it does not conflict with the product decisions above.

Claude standalone/design exports are reference artifacts. They must not override
production auth, Firestore paths, publish behavior, analytics privacy,
SEO/indexing, admin routing, or already-accepted component placement decisions.

## Hard Conflicts To Fix Before The Next Claude Export

| Area | Handoff / Claude source | Production decision | Required Claude correction |
| --- | --- | --- | --- |
| Architecture | SPEC recommends Next.js App Router and API routes. | Current production is a static Vercel bundle with Firebase helpers. | Treat Next.js/API as future refactor guidance, not a reason to remove current static production behavior. |
| Firestore rules | `handoff/firestore.rules` uses `owner@example.com`, `/leads`, `/renewals`, and `/site/{doc}`. | Production uses Firebase Auth plus Firestore `admins/{uid}`, `sites/covermate/states/live`, `sites/covermate/states/draft`, `sites/covermate/versions/*`, and `contactLeads/*`. | Do not apply handoff rules directly. Generate future rules against the production data contract unless the backend refactor is explicitly approved. |
| Lead schema | SPEC/handoff target uses `leads/{id}` with consent/source/intent fields. | Production public forms write validated `contactLeads/{leadId}` with `qtype`, `coverage`, `summary`, `sourcePath`, `consent`, status/read timestamps. | If updating forms, preserve `contactLeads/*` until a planned migration exists. |
| Admin allowlist | Handoff rules contain an email allowlist placeholder. | Production allowlist is Firestore document ID by Firebase UID: `admins/{uid}` with `active: true`. | Never ship `owner@example.com` or email-only rules. |
| Fonts | `handoff/theme/organic.css` still imports Caprasimo/Figtree and has negative heading tracking. `handoff/src/theme.ts` still includes Figtree fallback. | Product decision: Google Sans family everywhere, both Thai and English; no Caprasimo, Chonburi, Figtree, or unrelated display/body fonts. | Remove stale font imports/tokens from future exports. Do not rely on Codex patching computed output afterward. |
| Letter spacing | Handoff organic CSS contains `letter-spacing: -0.015em`. | No negative tracking anywhere. Small-caps/kickers may use positive tracking only. | Set headings to `letter-spacing: 0`. |
| Spacing tokens | SPEC says there is no `--space-5` or `--space-7`; using them caused layout drops. Some generated Organic CSS still includes `--space-5`. | Production docs treat undefined spacing tokens as a bug class. | Use only the approved scale and run a grep/test for invalid custom properties. |
| Validator shape | `handoff/src/validate.ts` does not fully preserve fields such as `brand.advisorLogo`, `contact.facebookName`, `contact.facebookUrl`, and `contact.whatsapp`. | Those fields are production CMS values and must survive validate/import/migrate. | Expand schema before using validation at an API/import boundary; do not strip production fields. |
| Contact section defaults | Handoff `defaults.json` has a `talk` contact section without normal localized title/body fields. | Production contact heading/body/form copy must remain visible and editable through existing CMS paths. | Do not treat missing `talk` defaults as permission to empty or rebuild the contact section. |
| Standalone portability | Latest standalone renders, but logs a `file://` `.image-slots.state.json` error. | A portable standalone should open cleanly without missing-file/helper fetch errors. | Inline/remove image-slot helper state or ship a complete folder bundle with a clear open-this file. |
| Screen switcher | Standalone includes a screen switcher. | Screen switcher is demo-only. It must never appear in production public UI. | Keep screen switcher only in standalone review artifacts. |
| Owner dock | Latest standalone still shows a very reduced edit footer in some states. | Production owner dock is the warm-ink dock: compact `Mode · Text edit`, `Tools`, `Close`; expanded Draft/Go to palette; `Publish` is the only terracotta fill. | Preserve the production owner dock placement and hierarchy. Do not reintroduce cluttered full-width action bars or the too-minimal `Close`-only footer. |

## Existing Component Placement And Micro-Layout Decisions

The items below are Product Decisions. If a Claude export differs, preserve the
production decision unless the owner explicitly changes it.

| Surface / component | Production location or treatment | What Claude must not change |
| --- | --- | --- |
| Public page order | `hero -> trust -> cover -> review -> fit -> how -> insurers -> tiers -> claim -> renew -> guides -> voices -> about -> faq -> fees -> privacy -> talk`. | Do not reorder sections just because the standalone explores a different visual rhythm. |
| Header nav | One global header. Logo/brand left, nav anchors, language toggle, LINE CTA. Header motor item points to `#insurers`. | Do not create a separate motor microsite header. Do not duplicate motor nav in the header. |
| `#motor` behavior | Alias/scroll target into `#insurers` on the same page. | Do not make `#motor` look like a separate page or reset the nav/chrome. |
| Hero | Left advisory message, CTA cluster, proof/advisor card, organic background forms. | Do not replace with generic split hero/card media layout. |
| Trust strip | Compact trust pills/cards after hero. | Do not turn these into large marketing cards or create cramped pills. |
| Coverage/products | Expandable advisory categories in the `#cover` section. | Do not make them commodity insurance product cards. Keep the advisory/category feel. |
| Policy review | Sits after coverage products and before calculator. | Do not move it below claims or bury it near FAQs; it is a trust-building bridge before calculator. |
| Coverage calculator / `#fit` | Dark brown band. Calculator copy on one side; calculator controls adjacent. Life-stage option cards are terracotta cards with centered icon and centered label. | Do not left-align the life-stage card content. Cards such as `เพิ่งเริ่มทำงาน`, `มีครอบครัว มีลูก`, `เจ้าของธุรกิจ`, `ใกล้เกษียณ` must not look left-heavy. |
| Calculator controls | Inputs/sliders have stable dimensions and update estimate live. | Do not allow labels/icons/dynamic values to resize or shift the card layout. |
| Process / `#how` | Four steps after calculator, horizontal on desktop and stacked on mobile. | Do not move process before calculator; do not compress step copy until it clips. |
| Motor insurers / `#insurers` | Sage band. Centered heading, warm rounded logo grid, then AIA and Srikrung credential cards. | Do not split into a separate motor page. Do not hard-code a second logo list outside `insurers.items`. |
| Insurer count | Copy says 14 insurers compared, and derives from the 14 visible committed logo files. | Keep copy aligned to the visible insurer logo count. With the current asset set, that count is 14. |
| Credential cards | AIA and Srikrung proof cards sit below the logo grid. The first two lines, logo and company/category row, are centered. | Do not left-align the logo/category row or replace AIA with a placeholder. |
| AIA logo | `assets/logos/aia-logo.png`, transparent red AIA mark, default for `brand.advisorLogo`. | Do not use old/generic icon assets. The image must remain editable in admin. |
| Motor tiers | Immediately follows motor insurer proof. Desktop table, mobile stacked class cards. | Do not expose as a separate nav page. Do not force horizontal scroll on mobile. |
| Tier cell editing | Owner mode can edit tier headings/rows/cell states; visitor sees clean content only. | Do not show direct-manipulation handles or dashed edit outlines to public visitors. |
| Claims help | Dark brown band after tiers. Four steps/cards plus proof KPI cards. | Do not clip text, decorative numbers, or card content. Add padding/gaps instead of shrinking typography too much. |
| Renewal reminder | Sage band after claims. Benefit/checklist copy plus compact form. | Do not make it a separate product landing page; it is a service slice in the continuous journey. |
| Guides | Educational accordion/list section after renewal. | Do not merge into FAQ unless the owner asks; guides and FAQ have different jobs. |
| Voices/stories | Placeholder/non-claim story state unless real permissioned material exists. | Do not invent testimonials or claim-success stories. |
| About | Explains Purich/CoverMate relationship and licences. | Do not soften or paraphrase legal relationship copy without approval. |
| FAQ | Dedicated FAQ accordion before fee transparency. | Do not scatter these questions across unrelated sections. |
| Fee transparency | Warm fee cards with large decorative numbers and enough inner padding. | Do not let decorative indices overlap or clip copy. Preserve comfortable card spacing. |
| Privacy/PDPA | Separate privacy/data-use section before contact. | Do not hide consent/data-use language inside tiny form footnotes only. |
| Contact / `#talk` | Final dark section. Left copy and LINE/contact card; right form card. Thai heading `ขอรับคำปรึกษา` should fit as one phrase on desktop. | Do not force `ขอรับ` / `คำปรึกษา` into two lines on desktop. Avoid awkward Thai word breaks. |
| Contact form | Name/contact/topic/coverage/detail/consent with clear spacing. | Do not remove consent or make form fields cramped. |
| Footer | Dark footer after contact with brand, nav, contact, licence/OIC copy. | Do not put standalone screen switcher or admin edit outlines in production footer. |
| Admin login | Centered breathable auth card on organic cream background. | Do not squeeze the central card or use demo/no-server copy in production. |
| Admin launcher | `/admin` after login, with exactly three primary cards: `Edit the words`, `Arrange & customise`, `Analytics`. Analytics is the third card. | Do not bypass the launcher after login. Do not remove Analytics. |
| Admin drawer / `#admin` | Right-side drawer/control panel, persistent publish path, English admin labels. | Do not make `Close` ambiguous with `Log out`. Do not hide Save/Preview/Publish after closing without a reopen path. |
| Inline edit / `#edit` | Warm-ink owner dock floats over the page. Compact by default; `Tools` expands the command palette. | Do not use a busy full-width bottom bar with every action visible at once. Do not use a `Close`-only footer that traps the owner away from publish actions. |
| Admin public exit | `Public site` clears owner markers via `/?view=public` then lands on clean `/`. | Do not leave admin chrome visible on the visitor page after Public site. |
| Analytics | Private admin route with comfortable card spacing, Firestore lead data when available, GA4 Data API placeholders where not connected. | Do not compress mobile analytics cards. Do not show fake GA4 charts as real data. |
| Toasts/dialogs | Save draft and Publish require custom confirmation, successful write, dismissible toast, and 30-second Undo. | Do not use native browser confirms or instantaneous visual flashes that appear before persistence completes. |

## Claude Export Checklist For Small Components

Run this checklist before returning any updated standalone/design:

- Public component order still matches the canonical 17-section order.
- Fit/life-stage cards center icon and label.
- Credential-card logo/company rows are centered.
- Fee cards do not clip decorative numbers, headings, or body copy.
- Contact heading Thai `ขอรับคำปรึกษา` stays one line on desktop.
- Admin launcher still has three equal cards and Analytics is third.
- Owner dock default is compact, with `Tools` expansion available.
- `Public site` removes owner chrome from the visible public route.
- Header has one motor nav item only.
- `#motor` aliases/scrolls into `#insurers`.
- No standalone screen switcher appears in production public UI.
- Google Sans family applies to Thai and English text.
- No raw template syntax, image-slot missing-file error, or unpack splash remains
  in a delivered standalone.

## Prompt To Send Back To Claude

```text
Please update the CoverMate design/standalone using the current production
product decisions, not by overwriting them.

Read these first:
- /Users/point/CoverMate/docs/CLAUDE_FEEDBACK_SPEC2_CONFLICTS.md
- /Users/point/CoverMate/docs/CLAUDE_DESIGN_RECONCILIATION.md
- /Users/point/CoverMate/docs/covermate-website-full-design-spec.md

Use SPEC (2).md and CoverMate Handoff.zip as target implementation context, but
when they conflict with production decisions, production wins.

Preserve every component placement and micro-layout decision in
CLAUDE_FEEDBACK_SPEC2_CONFLICTS.md. This includes small details: centered
life-stage cards in #fit, centered first two lines in AIA/Srikrung credential
cards, non-clipping fee cards, one-line desktop contact heading, single motor
header nav item, #motor as an anchor alias, the warm-ink owner dock, English
admin chrome, and the three-card admin launcher with Analytics as card 3.

Before returning the design/export, include a ledger:
component | changed? | preserved production decision? | reason | risk.
```
