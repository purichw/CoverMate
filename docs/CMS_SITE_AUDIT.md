# CMS Site Audit

Date: 2026-09-21. Scope: Home, Motor, shared visitor surfaces and their owner
controls. Unreleased candidate changes; no live/draft database migration or publish.
A protected preview exists, but the final working tree is not fully CI-verified.
Cloudinary Free replaces Firebase Storage; the owner authorized production.
See [current checkpoint](HANDOFF.md).

## Repairs

| Finding | Repair |
| --- | --- |
| Review/renewal Admin edited `label` while visitors read `title/body` | Correct field schema; v5 migrates only missing titles from old labels |
| Hero content could not be selected in the panel | Home/Motor Hero fields and CTA targets exposed |
| Motor inline copy pointed to Home section paths | Motor local owners use `motorPage.hero/trust/cover`; shared sections remain shared |
| Older inline values could shadow newer Admin edits | Semantic copy paths for section/items/cards/nav/shared labels; changed-field overrides are cleared |
| Motor insurer strip ignored hidden rows | Same visibility and source data as Home |
| Testimonial placeholders and invalid image edits | Empty image stays absent; invalid input never replaces the valid reference |
| Helper labels embedded in public templates | Motor trademark, tier column headings, story labels become bilingual registry fields |
| Calculator data had no usable owner controls | Situation/recommendation text, hospital/source/date/grade/reference amount and consumed numeric assumptions exposed; formulas unchanged |
| Calculator source URL/note not visible | Render source link and note; composed numeric reference not editable as a misleading text override |
| Task-link inputs used mismatched handler names | Bind to real `change/commit` handlers |
| Media replace workflow limited to URLs | Crop/fit UI, media inventory and signed Cloudinary Free uploads; hosted evidence in CMS_MEDIA.md/HANDOFF.md |
| Section destination sanitation incomplete | Shared Home/Motor sanitation permits only the supported internal route/anchor formats |

## Preserved Boundaries

- Actual licence numbers, contacts, approved text, assets and manual overrides
  remain data. No blanket rewrite or removal of real information.
- Explicit blanks are preserved. No invented phone/email/photo or confidence
  grade. Missing schema fields still receive one-time migration defaults.
- The previous Guides-to-FAQ migration and the compact redesign are preserved.
- Repeatable IDs own content/media across reorder/hide/duplicate operations.
- Button/control symbols, formulas, validation, auth, endpoints, route rules,
  layout ratios, formatting units and boot HTML metadata remain code-owned.
- Local image preview is not a hosted upload or production release; the media
  decision and initial-HTML SEO path are documented separately.

## Evidence

`check:cms:site` checks 19 section owners and both language branches, including
Motor path ownership, blanks, hidden logos, Admin precedence and v5 idempotence.
`check:cms:site:browser` exercises owner edits, local save/reload and Motor preview,
calculator/media controls and Home/Motor mobile rendering. It uses mocked Auth,
state and object storage, with the real browser cropper and PNG validator.
`check:cms:browser` covers the existing local draft/preview/publish simulation;
`check:media` covers API authorization, UAT isolation and hostile/oversized images.

Auth/Storage production configuration, real hosted uploads and real publishing
are deliberately not exercised by this audit. Release must follow the existing
runbook and separately authorized UAT/production checks.
