# Article Editor

Updated 2026-10-03 for the local editor concept redesign; this update is not a
deployment claim. See [HANDOFF.md](HANDOFF.md) for release evidence.
Publication and cloud-storage behavior is specified in
[ARTICLES_PUBLISHING.md](ARTICLES_PUBLISHING.md); this document covers authoring
and reader presentation.

## Scope And Persistence

The existing `/admin#articles` workspace lazy-loads Tiptap when creating or
editing a draft. The shared Admin sidebar, verified session and role gate stay
in place. Readonly sessions cannot open the writer. A full article document is
required for editing; a list summary must never overwrite the body.

Production drafts use the verified server repository with draft Autosave,
explicit Publish and revision checks. Existing local recovery drafts and the isolated test editor
use IndexedDB `covermate-article-drafts-v1`, scoped by verified
UID and environment. Both repositories use the same Autosave flow. Revision checks run inside
an atomic read/write transaction, so a stale tab cannot overwrite a newer draft.
Storage errors preserve current edits. JSON export/import provides a local backup;
import creates a new identity, clears the revision and does not publish anything.
Local drafts are not synced or recoverable after browser-data deletion without
that backup. Do not use this store as an authorization or public publication source.

Existing published articles produce a separate working draft and keep their
slug read-only. Back, sidebar navigation, logout and browser unload guard unsaved
changes. Saving during continued typing does not mark later edits saved.

### Draft Autosave

After an author edit, the editor saves after 700 ms of inactivity, with a
30-second maximum wait during continuous editing. Opening an untouched article
does not write. TH/EN bodies, metadata, cover and pending tags share one serialized
save path; input composition defers saving until it ends. Autosave does not clear
the tag field, move focus or replace the document. Edits made during a request
are saved by a subsequent request using the acknowledged revision.

The existing status shows pending, saving, saved time, invalid input, offline or
failure. Save/⌘S/Ctrl+S flushes the same draft immediately and retries a failed
save; Publish remains an explicit, confirmed action. Incomplete drafts can save,
but malformed supplied values pause Autosave until corrected. Failures preserve
edits in the open editor and stop blind retries. Reconnecting resumes offline or
connectivity failures; revision conflicts and permission errors require explicit
recovery. Export remains available for a backup before reopening a stale draft.
There is no new durable offline recovery store: closing before a successful save
can still lose pending changes, so existing leave/unload warnings remain active.
Discarding edits cancels queued writes. No website or other article draft is saved.

`scripts/lib/article-autosave-check.mjs`, run by `article-validation-check.mjs
--browser`, exercises the real editor/repository using isolated storage and delayed,
failed and conflicting writes. Local evidence does not certify a production deploy.

## Field Requirements And SEO

`article-validation.mjs` owns the shared field requirements used by the editor
and article repository. Fields identify **จำเป็น**, **ไม่บังคับ**, or
**อัตโนมัติ** beside the label. Validation messages appear immediately below the
corresponding control with `aria-invalid` and `aria-describedby`. Empty required
fields are collected in a green readiness checklist with screen-reader field
descriptions, rather than repeated visible error paragraphs. Invalid nonempty
values retain inline corrective messages. The collapsible checklist shows
completed/pending icons, a count and progress bar; it uses two columns on desktop
and one on mobile. Its linked rows reveal the affected field, opening its disclosure/sheet or
switching language as needed. Invalid input stays in place for correction.

| Field | Publication requirement | Behavior |
| --- | --- | --- |
| Title, card excerpt, body | Required per selected language | Whitespace-only values are invalid |
| Slug, category, author | Required | Shared between languages; published Slug is immutable |
| Cover | Optional | Separate from body images |
| Cover Alt, body-image Alt | Required when the corresponding image exists | Localized; body Alt is editable in the image dialog and settings |
| SEO title, SEO description | Optional | Empty uses the article title and card excerpt respectively |
| Canonical URL | Automatic, read-only | Derived from Slug and language |
| Editorial date | Optional | Blank hides the public date; clear (X) removes it; input uses Bangkok time |
| Tags, captions, summaries, notes, attribution | Optional | Existing content and length limits remain in effect |
| Reference rows | Optional to add | Each added row requires its name and valid HTTPS URL; remove unwanted rows |

Incomplete drafts can still be saved. Malformed dates, unsafe URLs, excessive
lengths or invalid reference rows must be corrected before saving. Publish is
disabled until the current translation and shared fields pass validation.
Selecting additional languages in confirmation revalidates those translations
and disables confirmation while any selected language is incomplete. Server
validation remains authoritative; field errors such as slug collision and Home
pin-cap rejection return `{field,language,message}` and target the same controls.
Revision/auth/network failures retain the existing form and overall status.

The **SEO และการแชร์** disclosure contains separate title/description overrides,
effective character counts, canonical URL and a live search-result approximation.
60/160-character guidance is advisory, not a publication limit; storage limits
remain 240/600. Google may choose different titles/snippets. Sharing uses the
selected language's cover and its Alt. Metadata, Open Graph/Twitter and Article JSON-LD are
derived from the published snapshot, never unsaved or saved-only draft text.
Article JSON-LD includes the visible headline, publication/modification dates,
author, category and tags. Tags do not create an obsolete meta-keywords field.
Only published locales receive hreflang; private previews remain noindex.

### Responsive Article Images (October 2)

Upload/crop once; `article-media.mjs` provides mobile/desktop thumbnail and
banner delivery profiles (320/640/800/1600 px, plus 1280 for intermediate/DPR
selection). `srcset` and layout-specific `sizes` choose the actual request.
Cloudinary URLs use crop-preserving `c_limit,f_auto,q_auto` delivery transforms;
the saved original and recrop coordinates do not change. The Admin cover panel
lists available widths, capped to the saved image width. These are automatic
delivery variants, not four independently editable crops or upload fields.

The four currently shipped article images also have hashed WebP derivatives,
generated/checked by `build:visitor` via `scripts/build-article-images.mjs`.
Unknown local/external/signed URLs keep their existing source, with no invented
variant URL. Public media exposes safe output dimensions but no original/crop
metadata. Home cards, index/pinned/related cards, detail covers and body figures
consume variants. The page CMS's unrelated logo/background slots are unchanged.

Checks: `node scripts/article-delivery-check.mjs --browser` (real Chromium
responsive selection; Cloudinary response bytes mocked, shipped assets real),
`node scripts/article-media-check.mjs --browser`, and
`node scripts/article-validation-check.mjs --browser`.

Reference: [Cloudinary responsive HTML](https://cloudinary.com/documentation/responsive_html).

Sources: [Google title links](https://developers.google.com/search/docs/appearance/title-link),
[image guidance](https://developers.google.com/search/docs/appearance/google-images),
[SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

Article buttons use the accessible names **บันทึกร่างบทความ / เผยแพร่บทความ**;
the visible Save label is shortened to **บันทึกร่าง** beside the article heading.
They operate only on the selected article. Website Save/Publish/Reset still affect only website
state, and article keyboard Save does not bubble to another module's shortcut.
No article Reset is wired to the website Reset action.

Focused checks: `node scripts/article-validation-check.mjs --browser`
(Chromium; `COVERMATE_ARTICLES_BROWSER=webkit` for WebKit),
`node scripts/content-lifecycle-isolation-check.mjs` and
`node scripts/editor-reset-contract-check.mjs`. The validation browser harness
uses the actual Admin editor, article repository and public renderer with an
isolated in-memory database and synthetic identity. It verifies draft save/reload,
field correction, conditional Alt, SEO publication, multilingual confirmation,
server conflict and 1440/375 layouts, without production writes or auth testing.
Recorded local evidence: `uat-results/article-validation/`. This implementation
is included in `aa8b68d`; this documentation refresh did not rerun visual or
authenticated production checks.

## Writing

Reader-facing fields live in one independent **ข้อมูลบทความ** section above
the writer. Icon/text tabs group title/excerpt/slug/category/tags, cover,
key takeaways, decorative notes, author/date, sources and the actual index-card
preview. Fields have a single owner, a two-column desktop layout and a one-column
mobile layout. TH/EN stays in the section header. Advanced typography is folded.
Clicking metadata in the collapsed reader preview opens its corresponding field.
The index-card preview uses real Visitor styling, with direct actions to edit
title/cover or open full-page Preview; it does not save or publish.

The writing header provides **เต็มหน้าจอ**, which expands the same mounted
iframe/editor to the browser viewport. It keeps language, formatting, block
insertion, Preview, Save draft, Publish and checklist access available.
Unrelated metadata, reader heading/share/related/CTA sections and the main
checklist do not consume the fullscreen text area. The outside shell
is inert and page scrolling is locked until exit. The exit button or Escape
restores the page position and focus; open child dialogs own Escape first.
No iframe reparenting/recreation occurs: selection, undo and unsaved documents
survive entry/exit, language switches and responsive changes.

The writer starts collapsed, showing a read-only article preview. Expanding it
enables the same editor instance. The common writing controls stay visible. Secondary
formatting and numeric text sizing are grouped in a folded formatting disclosure;
callouts, block insertion/order/placement and block help are grouped in a separate
folded block-tools disclosure. In fullscreen these open bounded overlays without
shrinking the writing area. These expose the existing controls and document
operations without removing advanced capabilities.

The settings shortcut beside the backup actions opens publication pins/state
and SEO controls only. Reader-visible fields stay in the metadata section rather
than covering the writer. Editorial date stays
with author metadata and retains the same scheduling behavior and guidance.
Full-page Preview and safe-area Save/Publish remain available. Tags
accept Enter or comma-separated input and commit on blur/save; removing a tag
never drops text currently being entered. Validation reveals a folded invalid
field. A late stylesheet/font load recalculates title/excerpt height.

The live card uses the active draft language, category, cover, excerpt, editorial
date and body reading time. It does not save or publish. Its action opens the
existing real Visitor preview. Missing/failed cover images keep a stable frame;
the body image is independent. Card excerpts and SEO descriptions stay separate.
There is no publication-status selector, slug-availability
button or scheduled-unpublish control: these mock details have no corresponding
supported action. Draft Autosave uses the real repository; immediate Save,
Publish and confirmed Unpublish are preserved.

- Independent TH/EN documents, titles, excerpts, dates, SEO and cover captions.
- H1–H6, paragraphs, bold/italic/underline/strike/highlight, sub/superscript,
  alignment, ordered/bullet nested lists, safe links, divider and undo/redo.
- Summary, Key points, note, warning and coverage feature blocks with editable titles; quotes
  with attribution; image figures with alt text and captions.
- Tables with row/column insertion and removal, header row, cell merge/split.
- Freely ordered top-level article blocks: select directly on the page or from
  the block list, move up/down, duplicate, delete, or add a paragraph. Summary
  cards, botanical quote cards and illustrations can be inserted after any
  selected block. Placement is body column, sidebar, or full article width.
  All operations participate in the document's Undo/Redo history.
- The bulb summary block has an editable title, check list and optional
  decorative note. The botanical quote block has directly editable rich text
  and optional attribution. Clearing a note/title/attribution hides that text.
  Body text stays editable on the actual page; “แก้รายละเอียด” edits card fields.
- YouTube link cards, not embedded players or arbitrary iframe/HTML.
- Separate cover, category, tags, author, Home recommendation, pin, sources,
  localized key takeaways, slug, SEO title/description.
- Independent `ปักหมุดบน Home` (`featured`, preserving existing values) and
  index pin switches. Home pins reserve at most ten draft/live article slots;
  server rejection keeps all editor changes available for correction. Publication
  remains explicit, and removing a live pin requires republishing the change.
- Optional localized `headerNote`, `sidebarQuote`, and `takeawayNote` create the
  decorative header, botanical sidebar quote, and note beside the takeaway
  banner. Fields retain line breaks, are plain text, and can be cleared. Each
  has a localized `headerNoteEnabled`, `sidebarQuoteEnabled`, or
  `takeawayNoteEnabled` switch. Turning it off preserves its text for reuse;
  text stays editable while hidden. Save/Publish, backup and full-page Preview
  preserve both values independently for TH/EN. Missing flags default to true
  for older articles. An enabled empty sidebar quote uses the existing CMS
  `articleDetail.note` when configured; disabling it also suppresses that fallback.
  The takeaway-note switch hides only the note, not the summary/checklist.
- The writing canvas shows the real public article page while editing. The body
  is directly editable in its reading column; title, cover, summary and decorative
  notes open their settings on click or keyboard activation. Changes update the
  canvas before Save or Preview. Desktop/Mobile switches the writing viewport.
  The private writing frame starts at the body and hides public navigation,
  footer and floating contact controls. Full-page Preview retains that public
  chrome; only the writing frame's own scroll moves when it first opens.
- The canvas occupies the content workspace on desktop and mobile. Its
  Desktop/Mobile controls select the reader viewport independently of the
  Admin viewport. Metadata is above the writer; fullscreen isolates text editing.
  Bottom save actions respect safe-area padding and hide
  when a detected software keyboard opens.


Images support HTTPS URLs, local assets and uploads through the configured media
provider, with explicit crop confirmation. Revision-history restore and
whole-article duplication are not implemented controls. Archive/Trash/Restore are managed
in the article list. Draft Autosave is described above. The offline test adapter has no
publication capability; the real verified repository supports explicit Publish.

## Typography Controls

Article text uses Google Sans, including decorative notes and botanical quotes.
This latest font direction replaces the earlier handwritten Sriracha treatment.
The shared responsive defaults follow the compact hierarchy of the supplied
mockups; they are CSS design values, not measurements recovered from the images.

| Body role | Desktop (px) | Mobile (px) |
| --- | ---: | ---: |
| Paragraph | 18 | 16 |
| H1 | 36 | 24 |
| H2 | 26 | 20 |
| H3 | 22 | 18 |
| H4 | 20 | 17 |
| H5 | 18 | 16 |
| H6 | 16 | 15 |

The page title defaults to 40 px desktop / 24 px mobile, separate from an H1 inserted into
the body. Selecting P or H1–H6 changes document semantics and the default style;
it does not remove a previously applied custom text size. Body headings feed the
TOC regardless of their visual size. H2 is the usual starting level below the
article title, but all six levels are available.

- **ขนาดข้อความ / มือถือ** apply a numeric size to selected text, or to text
  typed next when only a caret is active. **คืนขนาดข้อความ** removes the size
  mark while retaining bold, links and other marks. Text then inherits its
  block/default size. An empty mobile field uses the main override when set;
  without a main override, the responsive semantic default applies.
- **ตัวอักษร / ช่องไฟบล็อก** edits the selected top-level block's size, mobile
  size, line height, space before/after and internal padding. Blank fields remove
  that override. **คืนค่าบล็อก** clears these numeric overrides without changing
  its type, content, placement or independently sized inline text.
  Card body sizing preserves its title/note hierarchy; custom padding retains
  an icon gutter so text cannot cover the bulb or coverage illustration.
- The article settings' **ขนาดและระยะชื่อบทความ** and
  **ขนาดและระยะคำโปรย** expose the same numeric fields for the real title and
  deck. These styles belong to the active translation's document. Clearing a
  field restores that element's default.

All controls update the writing canvas directly and participate in document
Undo/Redo. Font family is fixed to Google Sans; there is no arbitrary CSS editor.

`article-typography.mjs` owns the shared whitelist: `fontSize` and
`fontSizeMobile` accept 8–120 px, `lineHeight` accepts 1–3, `spaceBefore` and
`spaceAfter` accept 0–160 px, and `padding` accepts 0–120 px. Only finite numeric
values in range are retained, rounded to two decimal places; strings, invalid
values and unsupported properties are discarded. Zero spacing remains valid.
Inline `textStyle` marks allow only the two size fields. Supported block nodes
store the six fields in their attributes; `doc.attrs.titleStyle` and
`doc.attrs.excerptStyle` hold title/deck overrides. The renderer emits only these
validated CSS custom properties with explicit units. This contract is shared by
normalization, backup, server save/publication, the Editor, Preview and reader.

## Editorial Metadata

`pinned` is separate from `featured`: eligible published pins form the public
index carousel in the Admin-managed pin order. There is no per-carousel pin cap;
Home uses its own recommendation flag and existing `featuredIds` ordering.
Explicit title/oldest sorting or search puts pins in normal results. Public
search also includes tags. See [ADMIN_ARTICLES.md](ADMIN_ARTICLES.md).

Each translation has nullable ISO `publishedAt`. Input/display use Asia/Bangkok,
regardless of device timezone. A future date remains draft metadata: it does
not create a scheduled job or bypass the public published/date gate. Draft
preview can show a future editorial date, but nothing is added to a public feed.
An empty date uses today only for preview, not as a saved publication timestamp.

Admin list supports category/status/pin/author and inclusive article-date range
filters, tag/title/slug/author search, date/update/title/pinned ordering and
pagination. Dates missing from records sort last. Local working copies are
explicitly labeled and do not claim to change existing public versions.

## Shared Document Contract

`article-document.mjs` owns version 1 JSON normalization, safe URLs, legacy
conversion, text extraction, TOC and HTML rendering. `src/admin/article-extensions.mjs`
owns the matching Tiptap schema. `assets/article-document.css` styles both editor
and Visitor. Arbitrary HTML, unsafe URLs and unsupported nodes are not rendered.
Normalization limits depth, node count, text length and table spans. Backups
and local saves are limited to 2 MB.

Flexible documents have `doc.attrs.layout="blocks"`. Top-level nodes accept
`placement="body"|"sidebar"|"full"`; normalization omits the default body value
and rejects placement on nested nodes. `takeaway` stores `title`/`note` plus
rich list/paragraph content; `quoteCard` stores attribution plus rich content.
The reader, Preview and TipTap use the same placement CSS and node anatomy.
Desktop uses a 3:1 content/sidebar grid. A sidebar block occupies the available
right-hand cell beside its immediately preceding body block; a full-width block
starts a complete row. Mobile follows document order, with every block stacked.
This is structured responsive composition, not unrestricted pixel positioning.

Legacy metadata summaries become a `takeaway` document node when a draft opens,
without writing storage or marking the draft dirty. `articleSummary:true` identifies
the single node connected to the persistent summary form; other takeaway blocks
remain independent. Both form and canvas edits update that node, preserving its
position. A visible grip supports native drag/drop; existing block move controls
provide a non-drag alternative. Duplicate makes an independent block. Clearing
the form or deleting the node does not resurrect old metadata. The conversion
and separate remove-summary buttons no longer exist. `takeawaysInDocument`
suppresses the old public summary. Explicit sidebar-quote conversion retains its
existing behavior and `sidebarQuoteInDocument` flag. Each language is independent.

Preview loads the real public page bundle and its current published website
configuration into a disposable iframe. It injects only the safely projected
article draft in memory: no Save or Publish is required. Header, footer, related
published cards, share controls, consultation CTA and the contact dock use the
same runtime, templates and styles as Visitor. Desktop/Mobile change the actual
iframe viewport, including media queries and sticky behavior. Desktop has a
panoramic cover, reading column, contents/quote rail and full-width takeaway
banner; mobile places collapsible contents below the cover, before takeaways
and prose, while sharing stays after the prose. Authored block order is retained.
Article title is H1; authored headings support H1–H6, with H2 recommended below it.

Summary and Key points use sage cards, a gold lightbulb badge, and botanical
decoration. Bulleted lists inside these blocks receive checkmarks; paragraphs
and numbered/nested lists retain their meaning. Key takeaways in metadata edit
the canonical summary block; they do not render a second copy of that block.
Quotes, body images, sources and tables retain their supported content.

The reader custom element applies its own real `cm-article-prose` class on
connection. The template runtime's `classname` attribute is not a CSS class;
checking rendered styles guards against rich blocks becoming unstyled text.

Preview uses an in-memory `srcdoc` iframe inside a sandbox with scripts and same-origin
access only. It has isolated in-memory storage, no analytics or telemetry, and
no server draft-preview endpoint. External navigation, sharing and form submits
show Preview feedback instead of dispatching; bookmarks stay inside the frame.
The selected editor language is used; change TH/EN in the editor before reopening
Preview. A failed public-page fetch preserves the draft and offers Retry.
Hosted-page CSP, `frame-ancestors 'none'` and X-Frame-Options DENY remain unchanged.
Closing Preview aborts loading and discards its document. Readiness waits for the
real Visitor boot to finish; a blocked or failed boot also offers Retry.
No fake author avatar or quote is supplied when editorial data is empty.

### Author information and editorial transparency

The **ผู้เขียนและการจัดทำบทความ** settings disclose optional author biography,
HTTPS profile URL and a plain-text explanation of how that article was prepared.
These fields are independent for TH/EN, remain editable in a saved/reopened draft
and backup, and use the same public renderer in the writing canvas and Preview.
Clicking the visible author/profile/editorial text in the canvas opens its actual
setting. The visibility switch retains the text while hiding the details and
profile link; the existing byline name remains visible. Clearing an optional
field removes it without an organization biography or other fallback.

Only confirmed information belongs in these fields. A name does not imply a
qualification or review: the product does not generate `reviewedBy`, experience,
licenses or a human-reviewed claim. Source references remain a separate existing
collection. An empty biography/profile creates no empty About-author panel.
Tables scroll within their region rather than widening the page. The public
server still checks record and selected-language publication and rejects future,
missing or empty content. Optional notes pass through the same normalized draft,
backup, server save/publication and public projection as the article body.

## Build And Checks

```sh
npm run build:article-editor
npm run build:visitor
npm run check:article-editor
npm run check:article-editor:browser
PLAYWRIGHT_BROWSERS_PATH=/Users/point/CoverMate/.tools/playwright-browsers BROWSER=webkit npm run check:article-editor:browser
node scripts/articles-admin-check.mjs
node scripts/articles-index-check.mjs
node scripts/article-detail-check.mjs
node scripts/article-editor-metadata-check.mjs
node scripts/article-editor-layout-check.mjs
node scripts/article-reader-parity-check.mjs
node scripts/article-reference-snapshots.mjs
node scripts/article-blocks-check.mjs --browser
node scripts/article-typography-check.mjs --browser
node scripts/articles-admin-preview.mjs
```

`admin/articles/editor.js` is generated. Edit `src/admin/` then rebuild it.
Tiptap is not included in the Visitor bundle. The preview is loopback-only with
a synthetic verified account, fixture copy, blocked backend writes and no live
customer connections. It can save local drafts in that preview origin only.

Existing pre-typography Chromium and Playwright WebKit checks covered 1440/820/390/320 layout,
TH/EN, undo/redo, semantic blocks, unsafe links, preview, save/reload, stale-tab
conflict, unsaved navigation, pin/date/filter persistence, import/export and an
actual Visitor rich-document round trip. Evidence is under
`uat-results/article-editor/`. Physical iPhone keyboard/safe-area behavior and
the older unrelated Admin navigation/reload WebKit failure are not certified.
No customer/email, full-site release, production auth or deploy suites were run.

The numeric typography contract has a separate targeted check in
`article-typography-check.mjs`: normalization/escaping, authoring through visible
controls, reset/undo, save/reopen and desktop/mobile Editor/Preview/reader parity.
Its presence is not a claim that a current run has passed; use the run report
for current verification status.

Scoped Axe checks on the writing workspace and mobile settings found no
WCAG A/AA violations after isolating article table styles from the Admin shell.
This automated check is not a complete accessibility or screen-reader audit.

The production repository already enforces authorization, revision conflicts,
audit records and separate draft/public projections. Pin/date changes use that
publish/revision boundary; the carousel ordering has its own authorized settings
revision. Do not add media-upload, autosave or expiry controls without their
corresponding supported persistence operations.

September 30 redesign evidence is in `uat-results/article-editor-redesign/`:
paired reference/development captures, full desktop/mobile pages, writing and
settings views, 1440/820/390/320 layout checks, live-card updates, metadata/tag
save/reopen and scoped Axe checks. The actual Auth/Firestore emulator journey
also verifies save, denied/conflicting saves, preview, publication, separate
draft edits, republication and unpublish through the real API. No production
content was changed for visual verification.

## Live Writing Canvas

`src/admin/article-canvas.mjs` loads the same private public-page document used by
Preview. TipTap is instantiated inside that iframe's document, preserving browser
selection, clipboard and undo behavior. The public body projection stays hidden
while the editable document occupies its exact reading column. Metadata updates
use the private runtime update hook without replacing the writing hosts. No
draft endpoint, public write or analytics event is created by typing.

Blank or temporarily invalid titles/slugs use private display placeholders only;
they never enter the saved draft. Save, Publish and Import wait for editor
readiness. Schema defaults do not mark an untouched article dirty; metadata
edits made during loading remain dirty. A failed canvas load retains the draft
and offers Retry and JSON export.

The key-takeaways form stays available whether the summary is at its initial
position or has been moved. It edits the canonical summary block directly,
without a conversion action. A Summary block inserted with the toolbar is a
separate body block at the authored position. The coverage feature block (`kind: feature`)
has a hospital icon and editable title/body; it survives the same document
normalization, backup and publication flow as other callouts.

Focused verification for this change uses `article-reader-parity-check.mjs`
(editable canvas/Preview/public typography and responsive layout),
`article-editor-tools-check.mjs`, `article-feature-card-check.mjs`, and the real
Auth/API/Firestore emulator journey in `articles-cloud-e2e.mjs`. The latter creates
rich content from an empty Editor through visible controls, saves/reopens it,
checks Preview and published desktop/mobile views, then unpublishes it. Test
publication is confined to the isolated `demo-covermate` emulator project.

Typography verification (2026-09-29): `article-typography-check.mjs --browser`
passed in Chromium and WebKit for H1–H6/P, partial inline sizes, mobile overrides,
block/title/deck styles, cards, table wrappers, reset/Undo, local save/reopen and
computed-style equality across Editor/Preview/public reader. The Auth/API/Firestore
journey passed in both engines (separate successful runs), including UI-authored
H4/custom sizing, save/reopen, draft/public isolation and publication. The
Chromium tools check also passed table rows/columns, merge/split and Undo after
the wrapper change. No production data was changed or deployment performed.

Current visual evidence is under `uat-results/article-typography/` and
`uat-results/article-reference/`. Editor controls were inspected at 1440 and
390 px; the latter has no horizontal page overflow. The outer toolbar remains
in normal flow so it cannot cover text selected inside the independently
scrolling writing frame. This is browser-engine QA, not a physical-device test.
Broader site/release checks are outside this typography pass.

### Content workspace and fullscreen verification (2026-10-03)

`node scripts/article-workspace-check.mjs` (also available via the existing
`article-editor-layout-check.mjs` entry point) checks one field owner, live
metadata selection, independent TH/EN content, canvas/editor identity, selected
text and Undo across fullscreen, child-dialog Escape, Save/Preview/reopen,
explicit hidden notes, and 820/390/320px writing. Existing
`article-editor-check.mjs --browser` retains broad authoring and stale-tab
checks. `article-editor-tools-check.mjs` owns advanced formatting and media QA.
Evidence: `uat-results/article-workspace-20261003/`. Local synthetic data only;
this workflow change does not certify production deployment or authentication.
