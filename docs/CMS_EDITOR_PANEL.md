# Admin Editor panel

Implementation and operating contract, reviewed against live source `aa8b68d`
on 2026-10-02. [HANDOFF.md](HANDOFF.md) owns current CI/deployment evidence;
[the September 27 release record](RELEASE_CMS_PANEL_20260927.md) retains the
earlier evidence. This documentation refresh did not rerun visual, hosted-auth
or production-Publish checks.

## Layout and navigation

The desktop editor places a fixed panel beside the same rendered website.
The website stage scales to fit the remaining space; it is not an iframe or a
device simulator. At 1000px and below the panel becomes a bottom sheet. Its grip
expands/collapses the sheet, while the content scrolls independently. Outline
and Details switch panes on narrow screens to keep forms readable.

Save draft, Preview and Publish remain in the header. Undo, Redo and Reset draft
remain in the footer. Brand/Contact, Theme/Data and Version History retain their
existing owners and behavior. Content uses the full-width section workspace below.

Page Outline uses the existing Home/Motor section projection, including fixed
licence and footer bands. Search only filters the outline. Selecting a section
highlights and scrolls to its rendered page element. Hidden or unavailable
sections remain accessible in the outline. Existing move, visibility, background
and column controls retain their original data owners and restrictions.
Footer selection targets the public footer only. A hidden public footer must
never select the editor's action bar. Mobile pane changes reset the panel's
scroll position. On `/admin/edit`, Escape commits the active text field before
closing the panel and restores focus to the owner Tools toggle.

## Page switching

Introduced 2026-09-28. The **หน้าที่แก้ไข** selector is always visible in
the panel header and also available in the inline editor's Tools menu. Both use
`editor-page.html` and the existing shared select. Home and Motor are the only
implemented page choices; Articles uses its separate Article Editor.

`CMS_EDITABLE_PAGES` in `covermate-contract.js` owns each supported page's ID,
label, public path and initial section. Owner URLs, route parsing and the page
selector consume this registry. Switching stays in the current editor mode,
commits the active field before reading Draft, selects the new page's initial
section and clears the old outline search. It retains language, valid UAT/emulator
flags, undo history and advanced JSON buffers. Browser Back/Forward selects the
matching page. Preview uses the selected page and language.

This is still one site-wide Draft and Publish operation, not separate per-page
publishing. Home and Motor have distinct content owners; shared Header, Footer,
brand and contact changes continue to affect every consumer. Switching never
publishes. Save/Publish/Reset confirmations and busy operations disable the picker.
Escape closes an open select before dismissing its containing editor.

To add a future page, implement and test its Visitor route/renderer, CMS canonical
fields, panel projection and inline equivalents first, then register the page.
Adding a registry entry alone is not a page implementation. Do not list planned
or placeholder pages. Keep page-specific content separate from genuine shared
site settings, and extend page-switching tests for every registered page.

`npm run check:editor-pages` covers registry/URL round trips, direct field edits
followed immediately by switching, Home/Motor TH/EN isolation, reload, history
navigation, Preview, context flags, confirmation guards and both inline/panel
entry points. Local screenshots/report are in `uat-results/editor-pages/`.
It uses a synthetic owner with immutable Live; it does not verify hosted auth,
production Publish or physical devices.
The page-switch browser check passed on 2026-09-28, including the embedded
Motor preview after switching. Final 1440px/390px screenshots were inspected.
Route contracts, CMS controller tests, generated bundles and unchanged
Home/Motor performance budgets also passed in that verification. The page-switch
implementation is included in `aa8b68d`; the dated results are not fresh checks.

## Content workspace

### Context navigation refresh — 2026-10-03

The page picker is a context card with the current page, document icon and short
description. Desktop places it beside the heading/status; mobile stacks it below
the heading. The same fragment is used by the inline Tools menu. The existing
shared native/select surface still owns values, keyboard navigation, centered
menu options, busy state and focus. Page choices come from `CMS_EDITABLE_PAGES`,
including the implemented Health and Life landing pages.

Content's section card shows the actual page order and total (including hidden
sections), rather than the mockup's illustrative eight sections. Desktop adds a
local search and quick section buttons; the overflow button opens the full shared
picker. Search filters shortcuts only, never changes Draft or removes options.
Enter selects a sole match, Arrow Down focuses results, and Escape clears a query
before a later Escape can close the panel. Choosing a section or another page
clears the query. Mobile uses the full-width section card and existing scrolling
picker. Save/Preview are labelled icon buttons on mobile; Publish stays labelled.
The bottom sheet, independent form scrolling and footer history remain intact.

Verification: `check:editor-pages`, `check:editor-content`, controller checks,
bundle validation and unchanged Home/Motor performance budgets passed locally.
Content coverage includes search/empty/keyboard, hidden sections, full picker,
Draft save/reload/Preview and 1440/768/390/320px layouts. Desktop and mobile
reference/before/after images were personally reviewed under
`uat-results/editor-navigation-20261003/`. This is an isolated local fixture with
immutable Live; no production CMS publication or deployment is claimed.

Introduced 2026-09-30. Content uses the same panel dimensions, action bars
and scroll surface as the other tabs. The redundant embedded preview and second
desktop section list have been removed. The shared section select follows the
actual page order on every viewport; grouped fields fill the available width.
Selecting a section scrolls the real website to it. Desktop keeps that website
beside the panel; mobile retains the standard bottom sheet, not an expanded
Content-only sheet. Full Draft Preview remains an optional whole-page command.

`editor-content.html` owns navigation and grouped composition, not persistence.
`editor-contact.html` is shared by Structure and Content; both consume the same
field models/commit handlers. Existing field/language primitives remain canonical.
Plain copy updates canonical Draft on each input, so the actual website changes
before blur, while focus, caret and grouped Undo/Redo remain intact. URLs, email
and media references retain validation-on-commit buffers; raw JSON editors keep
their explicit Save action. This never writes Live or implicitly publishes.

- Main copy, notes, destinations and display settings are grouped by section.
- Comparison columns remain stable-ID insurance items; coverage rows remain
  stable-ID heads. Status, notes and Remarks retain their actual CMS handlers.
  Comparison header copy uses `homeDesign.comparison*`, also shared with Motor.
- Repeatable items/cards use disclosures; their real reorder, duplicate and
  visibility actions remain available. FAQ deletion still requires confirmation
  and supports Undo; adding a question opens its disclosure and focuses it.
- Footer is selectable and uses the existing `footer.*` owners, including legacy
  tagline/legal fields. Shared brand/media/navigation controls open their actual
  owning group. They are not separate per-section copies.
- No arbitrary Add section, unsupported deletion, carousel, or dummy overflow
  controls are added from the reference. Existing schema-backed additions stay.
- This is still one site-wide Draft and Publish, not per-section publication.
- Home Articles is a movable outline/content row, including when the feed is
  disabled, empty or unavailable. `homeDesign.articlesBefore` stores its next
  section ID; empty means the last movable position. The existing Articles
  module still owns visibility and publication. Its read-only published feed is
  loaded for the owner canvas; no article drafts are copied into the Home CMS.

`npm run check:editor-content` exercises ordered
navigation, table/row/Remark edits, visibility, FAQ add/delete/cancel/Undo/focus,
Contact, Footer, reload and full Draft Preview. It checks 1440/768/390/320px and
Home/Motor data ownership. Evidence is saved in `uat-results/editor-content/`.
It never publishes or touches production data. This pass does not certify hosted
authorization, actual phone keyboards, or production publishing.

2026-09-30 local verification: Hero and Content browser checks passed, including
live copy before blur, middle-of-text caret retention, Undo/Redo, Draft reload,
Home/Motor ownership and equal panel dimensions across tabs at 1440/768/390/320px.
Desktop and mobile screenshots were inspected. Broader whole-site suites and
deployment were not run for this focused change.

Local Content, existing panel, Hero and page-switch browser checks passed on
2026-09-28. Current route/content contracts, CMS controller, text-edit regression,
generated bundles and unchanged performance budgets also passed. Desktop and
mobile snapshots were inspected. Preview now leaves the source editor open when
the new tab succeeds, severs opener access before navigation, and falls back to
the same tab only when blocked. No hosted Publish or deployment was performed.

## Hero fields

Candidate implementation, 2026-09-28; not a production deployment claim.
Selecting Hero in Page Outline opens Content. The outline retains ordering and
visibility controls, but there is no duplicate Hero copy form in the inspector.
Content has a section selector and reusable TH/EN and field primitives.

Hero uses the same Content panel and actual page canvas as other sections. Main copy
is expanded; supporting copy, destination links and real background/media
settings use collapsible groups. Global LINE and advisor shortcuts edit their
existing owners, not Hero-specific duplicates. Home uses `sections.@hero`;
Motor uses `motorPage.hero`. Shared statement/media use `homeDesign` where the
actual page renderer uses it. Empty optional copy remains valid.

The Brand tab still uses `editor-preview.js` to snapshot the rendered section into a sandboxed,
inert iframe with the page styles and assets. Desktop/Tablet/Mobile select real
1280/768/390px layout widths, scaled to fit. It does not run scripts, boot a second
app, navigate, submit forms or write CMS. Hidden sections show a hidden state.
Use the existing full Draft Preview for interactive behavior. No mockup-only
carousel, synthetic layout controls, or decorative tips are added.

`npm run check:editor-hero` exercises canonical fields, TH/EN, shared destinations,
validation, visibility, background, autosave/fresh navigation, Undo/Redo,
confirmations and full Preview; checks 1440/768/390/320px workspaces and independent
Motor ownership. Evidence is under `uat-results/hero-editor/`. This local fixture
does not authorize or exercise production Publish.

The candidate passed the Hero, existing panel and FAQ browser checks, generated
bundle checks and unchanged Home/Motor performance budgets. Desktop 1440px and
mobile 390px final screenshots were captured and visually inspected; the form,
preview, grouped settings and action bars were also reviewed at writing depth.
Local fixtures are synthetic: their displayed save status is not a hosted CMS
verification. Hosted authentication, cross-browser/device QA and deployment of
this UI remain outside this candidate check.

## Contact inspector ownership

- Section heading: `sections.@talk.th/en.kicker` and `.title`.
- Intro: active advisor fields where the page uses the advisor introduction;
  the section body is explicitly labelled as fallback in that configuration.
- Contact channels: existing LINE, Facebook, hours and area fields. Display
  names are separate from destination URLs. Icons use the existing media editor.
- Form: existing localized `publicCopy`, consent, `formOptions`, placeholders
  and submission-button fields. No customer submission or notification behavior
  changes.

Copy inputs update the live Draft renderer while typing; validated destinations
retain the existing CMS buffer and commit-on-blur commands. Save, Preview,
Publish, Reset and history keep their existing confirmation and persistence
contracts. TH/EN selects content language; Admin controls remain Thai.

The reference mockup's arbitrary add/remove channel controls are not exposed:
the current public schema has a fixed channel set. Do not add cosmetic controls
that cannot persist and render through the canonical model.

## Inline and panel parity

Local candidate audit, 2026-09-28; not deployed by this audit. A public canvas
text edit must resolve to the same canonical CMS path as its panel field.
`data-content-path` and `data-cms-copy` both accept registered localized fields
and stable-ID section paths. Generic field models expose `path`, rendered as
`data-cms-owner`; shared/global controls retain their existing owners.

| Surface | Owner / result |
| --- | --- |
| Comparison headings, subtitles and notes label | `homeDesign.comparison*.<lang>`; fully qualified inline paths now resolve correctly |
| Insurer names | `sections.@insurers.items.@<id>.<lang>.name`; canvas and repeatable form share the record |
| Calculator units, unknown labels, validation/status copy and method labels | Existing `calculatorDesign` fields; repeated text uses the same owner |
| Section, repeatable, header/footer and shared copy | Existing section/global controls; no new positional overrides |
| Coverage status and Remarks | Same cell owner and remark dialog from the canvas or panel |
| Media | Same `cmsImageSlots` entry and media editor from either entry point |

Unowned arrows, disclosure glyphs, calendar labels and computed results are not
free-text editable. Existing positional overrides remain readable and existing
canonical migration behavior is retained; this change does not delete old data.
Disclosure controls remain operable in edit mode.

Remove ineffective controls rather than inventing a public behavior: the current
transparency layout has no section kicker, steps use numbers instead of selected
vector icons, and the current calculator does not render the old section note,
situation/recommendation fields, dataset/source-package labels or reference note.
Those inputs are no longer offered. Stored values are preserved. Current room
reference inputs, reviewed product/reference catalogs, and media controls remain.

`npm run check:editor-parity` uses the isolated panel fixture. It inventories
Home/Motor in TH/EN (347/227 unique inline text owners respectively in the default
fixture), plus all three calculator modes, and compares them with panel handler
models. Real UI roundtrips cover comparison copy, insurer names, calculator units,
FAQ including blank text, saved reload, disclosure behavior, coverage status,
Remarks, and both media entry points. Live is immutable and external writes are
blocked. Reports and desktop/mobile screenshots are in `uat-results/editor-parity/`.
This is not a claim that every conditional state was individually edited, nor a
hosted Publish/authentication or physical-device test.

## Source and verification

### Brand and contact tab

Local candidate, 2026-09-28. The Brand tab reconciles the supplied desktop/mobile
mockups with the canonical CMS model, without inserting mockup values. Five
disclosure groups cover brand identity/media, credentials/advisor, contact,
hours/service area, and display settings. Desktop retains the live Visitor
canvas; mobile reuses the inert Content snapshot, collapsed initially. Choosing
a location or opening a main group highlights the corresponding Visitor area.

| Group | Canonical owners / consumers |
| --- | --- |
| Brand | `brand.name`, `brand.fullName`, `brand.role` (logo alt text), localized `brand.media.headerLogo` and `footerLogo`, sharing image and favicon |
| Credentials | `brand.credential`, `brand.advisorLogo`, `licences.*`, `advisor.*`; Home Hero, Motor broker card, licence section and Footer keep their distinct owners |
| Contact | `contact.lineId/lineUrl/facebookName/facebookUrl/phone/email`, `header.cta`; shared contact links, header CTA and Footer |
| Hours / area | `contact.hours.<lang>`, `contact.area.<lang>`; Home/Motor contact and proof areas |
| Display | Existing `header.*`, `footer.show`, `stickyBar`, actual contact/insurer section visibility; no unsupported independent Hero-card switch |

Header/Footer logos remain separate localized assets. Change-image actions open
the existing crop/upload editor. Removing an image changes its CMS value, not
the uploaded file; Undo can restore it. Raw media paths remain in a collapsed
source disclosure. Fields use buffered `cmsInput` validation/commit, including
intentional empty values. Invalid URLs/emails do not reach Draft.

Legacy `brand.initial`, `brand.media.mark` and `contact.whatsapp` have no current
Visitor consumers, so they are no longer offered; stored values remain. Do not
present logo alt text as a rendered tagline or invent office-address fields.
SEO settings remain in Theme and data. Licence-card and contact-form links open
the actual Content owners. Existing composition, navigation, image slots and
other CMS groups remain in the advanced disclosure; cross-tab shortcuts open
all ancestor disclosures before focus/scroll.

`editor-brand.html` composes the tab. `editor-cms-field.html` and
`editor-cms-input.html` share buffered fields/media across primary/advanced
groups. `editor-brand-location.html`, `editor-language.html` and
`editor-preview.html` retain shared location/language/preview controls.

`npm run check:editor-brand` exercises TH/EN, media replace/remove/Undo/cancel,
invalid contact data, intentional clear, licence resolution, visibility, Draft
reload, Home/Motor consumers, and desktop/768/390/320px UI. Evidence is in
`uat-results/editor-brand/`. The fixture blocks publication/external writes;
it does not prove hosted Firebase delivery or physical-device behavior.

Owners: `src/visitor/editor-panel.css`, `template.html`, `runtime.js` and
`cms-controller.js`. Build with `npm run build:visitor`; never hand-edit the
generated `index.html`.

## Version history tab

The September 28 reference is reconciled with the existing Firestore contract:
`sites/{siteId}/versions` contains Publish snapshots, capped at the newest 20
when loaded. Autosaves and explicit Draft saves are not archived there. Do not
invent automatic/manual-save rows, semantic release numbers, notes, actors or
image previews to match the illustration. Draft and Live summaries are separate
from the published history list; `ตรงกับ Live` means content equality after
canonical normalization, not an invented server version pointer.

`editor-versions.html` provides the overview, real counts, search, content-match
filters, ordering and five-record pagination. It uses the shared CMS shell,
selects, buttons and tokens. Desktop retains the adjacent Visitor canvas; mobile
uses cards. `editor-version-detail.html` is a scrollable comparison dialog,
adapted to a bottom sheet on mobile. Compare with either current Draft or Live;
differences are computed from actual canonical values, not screenshots. Stable
repeatable IDs distinguish reordering from editing. Blank values, missing values
and disabled values remain distinct. Large comparisons load in groups of 60.
The comparison/view model is a content-versioned lazy module, loaded only when
the owner opens Version history; public visitors do not fetch it.

The list summary compares each snapshot with the previous loaded publication.
Full IDs and recorded authors/dates are available in details; missing authors
are explicitly unknown. Refresh reads only `loadVersions`, never hydrates over
the working Draft. Fetch failure preserves cached records with a warning;
no-history and no-search-results are separate states.

Restore now requires confirmation and writes **only Draft**, including Home,
Motor and shared data. It no longer calls Publish. Success is one undoable edit;
the existing Firebase save queue/revision and authorization checks still apply.
Failure retains the current Draft and history. Uncommitted import/calculator
buffers retain their existing behavior. No uploaded asset is deleted. Undo can
recover the pre-restore Draft; publication remains a separate explicit action.

`npm run check:editor-versions` runs the direct controller tests and actual UI
clicks in an isolated local fixture. The fixture's published records are synthetic;
Live is immutable, external writes and Publish are blocked. Evidence includes
search/filter/order/page, compare Draft/Live, restore/cancel/failure, Undo/Redo,
reload, Home/Motor, empty/error/retry and 320/390/768px layouts/focus. This is not
hosted Firebase or physical-device verification. Production was not modified.

`editor-field.html` and `editor-language.html` are shared by existing generic
Content/Outline/repeatable forms and Hero; `editor-hero.html` composes Hero's
specialized field groups. They are build fragments, not independent runtime apps. The generator
also emits the content-versioned, lazy `assets/visitor/editor-preview.js` module.

The build emits versioned `assets/visitor/editor-panel.css` and
`assets/visitor/editor-tools.css` stylesheet links in the same cascade positions.
Panel rules remain owned by `editor-panel.css`; existing tool/dock rules remain
in the template's `covermate-owner-dock-ui` block. Do not edit generated assets.
Keeping these rules outside the serialized HTML preserves the visitor shell
budget without changing the rules or editor runtime.

`node scripts/editor-panel-browser-check.mjs` exercises the real browser UI
against a synthetic owner and in-memory Draft. It blocks external writes and
does not Publish. `--serve` exposes the same fixture for local visual review.
Screenshots and provenance are written under `uat-results/editor-panel/`.
Production Firebase authorization, delivery and Publish are outside this
isolated design check.

For real persistence, `scripts/inline-link-hosted-check.mjs --panel` runs against
an explicit CoverMate deployment preview and `sites/covermate-uat`. It requires
`--write-uat`, `--url`, the exact committed `--commit`, and process-supplied
server credentials plus an encryption key. It edits only the canonical LINE
display name and helper in UAT Draft, checks reload and mobile layout, and
verifies UAT Live is unchanged. Cleanup restores only this run's Draft changes,
preserves another writer's changes, deactivates its temporary owner allowlist,
and disables its temporary Auth account. No CMS Publish, lead submission or
notification send is part of this check.

Run browser suites serially. Earlier structure/history checks were inconclusive
under workstation load; those runs are not release evidence. The final merged
candidate needs fresh targeted results and hosted UAT cleanup evidence recorded
in the release record before promotion.

Related contracts: [content ownership](CMS_CONTENT_OWNERSHIP.md),
[Draft history](CMS_EDITOR_HISTORY.md), [source ownership](../src/visitor/README.md).
