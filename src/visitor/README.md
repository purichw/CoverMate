# Visitor Bundle Sources

The existing `covermate-layout` style block in `template.html` is emitted as
content-versioned `assets/visitor/layout.css` in its original cascade position.
Edit source rules, not generated assets; the HTML performance budget is unchanged.

Version history uses `editor-versions.html` and `editor-version-detail.html`,
with canonical comparisons and version actions in lazy `editor-versions.js`.
The CMS controller loads this module on demand; its existing persistence API
loads the real Publish history and restores snapshots only to Draft, with
confirmation and Undo. No automatic/manual Draft-save history is fabricated.
Run `npm run check:editor-versions`; see `docs/CMS_EDITOR_PANEL.md` and
`docs/CMS_EDITOR_HISTORY.md` for the data and restore contract.

The Brand/contact tab is composed in `editor-brand.html`, with reusable buffered
CMS media/field markup in `editor-cms-field.html` and `editor-cms-input.html`.
`editor-brand-location.html` supplies the shared location picker; live snapshots
reuse `editor-preview.html`. All values/actions resolve through `runtime.js`
and the existing CMS/media controller. Run `npm run check:editor-brand` for the
isolated real-UI checks; see `docs/CMS_EDITOR_PANEL.md` for field ownership.

`index.html` is the generated deployable visitor/owner-mode artifact, not proof
that current workspace changes are live. Edit the files in
this folder first, then run:

```bash
npm run build:visitor
```

Source ownership:

- `shell.html` is the outer static shell around the exported visitor bundle.
- `template.html` is the embedded `__bundler/template` HTML with a runtime slot.
- `editor-panel.css` owns the Admin Editor side panel, mobile bottom sheet and
  full-width Content workspace. The generator emits a versioned stylesheet.
  Page Outline and the contextual Contact inspector share existing CMS owners;
  Hero editing opens Content. Brand/Contact, Theme/Data and Version History retain
  their existing behavior.
  See [Editor panel](../../docs/CMS_EDITOR_PANEL.md).
- `editor-field.html` / `editor-language.html` are shared build fragments for
  generic Content, Outline, repeatable fields and Hero. `editor-hero.html` composes
  Hero field groups without introducing new data owners.
- `editor-content.html` composes the page-ordered section navigator and grouped
  fields. `editor-contact.html` is shared by Structure and Content;
  `editor-preview.html` gives every section the same inert snapshot controls.
  `node scripts/editor-panel-browser-check.mjs --content` verifies the real
  section/table/FAQ/contact/Footer editing flows and responsive layout.
- `editor-page.html` shares the Home/Motor picker between the panel and inline
  Tools menu. Its options and owner URLs use `CMS_EDITABLE_PAGES` in the contract.
  `check:editor-pages` verifies switching, Draft isolation, language, history
  navigation, reload and selected-page Preview. New pages need a real renderer
  and canonical CMS projection before they can be registered.
- `editor-preview.js` is emitted as a lazy, content-versioned module. It snapshots
  the actual Visitor section into an inert, script-free responsive iframe in the
  Content workspace. It strips owner-only controls and preserves form visuals
  without executable forms. Full Draft Preview remains the interactive surface.
- `home.html` and `home.css` are the compact Home projection while Motor stays
  shared. The generator composes the markup into `template.html` and emits
  minified `assets/visitor/home.css` with a content-versioned stylesheet link.
- `defaults.js` is the default CMS/site config injected into the runtime.
- `runtime.js` owns rendering, route/mode state, normalized CMS projections,
  hydration, and DOM bindings in the injected `text/x-dc` runtime.
  Inline text requires a canonical CMS owner shared with the panel, whether the
  marker uses a stable-ID section path or a registered localized field. New
  positional text overrides are not allowed; legacy reads remain supported.
  `check:editor-parity` inventories Home/Motor TH/EN and exercises both entry points.
- `cms-controller.js` composes owner commands through `withCmsController`:
  draft-save scheduling, Save/Publish/Reset, shortcuts, media, and history.
  FAQ collection commands add a bilingual row and focus its question field,
  or delete a stable-ID question after confirmation. Deletion removes both
  languages from Draft, is recoverable with editor Undo/Redo, and permits an
  empty collection. Hide remains a separate reversible visibility action.
  These commands do not publish; `check:faq` exercises their saved reload,
  preview, empty-state and mobile flows using isolated local persistence.
- `editor-history.js` owns bounded per-tab Draft Undo/Redo snapshots. Publish
  rollback and Firestore version history are separate recovery mechanisms.
- `admin-labels.js` owns the Thai Admin display dictionary; TH/EN remains the
  website content-language selector.
- `calculator.html` / `calculator.css` and `submission.html` / `submission.css`
  own their visitor UI. Calculation and validated attachment contracts live in
  root `covermate-calculator.mjs`; contact intake uses `covermate-public.mjs`
  and `/api/leads`. `covermate-contact-payload.mjs` is compiled into the deferred
  `assets/visitor/contact-payload.js` with its validation dependencies. Failed
  module loads use a fresh URL on user retry; successful loads are reused.
  This keeps form validation off the initial hydration path. Keep these
  contracts separate from CMS command extraction.
- `boot.js` / `boot.css` and `../shared/boot.html` own the shared first-paint
  loading surface for Visitor and `/admin`. `scripts/lib/boot-surface.mjs`
  inlines these into both entry points through `build:visitor`; do not edit
  the generated Admin boot slots. See [Admin loading](../../docs/ADMIN_LOADING.md).
- `line-contact.html` / `line-contact.css` own the shared floating LINE disclosure
  from 768px; narrower screens retain the existing bottom CTA only.
  `line-mark.html` supplies the unmodified official mark for contact buttons.
  See [LINE contact](../../docs/LINE_CONTACT.md) for CMS and interaction behavior.
- `../shared/select.js` / `select.css` own the shared custom single-select UI for
  visitor/CMS/Admin. Native selects retain state/validation and no-JS fallback;
  see [dropdowns](../../docs/CUSTOM_SELECT.md) for the stable wrapper contract.

The generator preserves the exported bundler serialization rules through
`scripts/lib/bundler-template.mjs`. `npm run check:visitor-source` fails when
`index.html` has drifted from these sources.

`build:visitor` also regenerates `server/asset-versions.json` for the published-CMS
initial-head renderer and the Home, LINE-contact and submission stylesheets in
`assets/visitor/`. Their generated links retain the original cascade order and
carry a hash of each stylesheet; the source check verifies these files as well
as `index.html`. CSS, defaults, and runtime code are compacted only in generated
output. Public refresh timing is shared through root
`covermate-freshness.mjs`; its extraction does not change cache/poll intervals.
The same build emits `assets/visitor/select.js` and `select.css`, refreshing
versioned references in the visitor and the marked `admin/index.html` asset block.

See [architecture](../../docs/ARCHITECTURE.md),
[Draft history](../../docs/CMS_EDITOR_HISTORY.md),
[contact intake](../../docs/CONTACT_SUBMISSION.md), and
[HANDOFF](../../docs/HANDOFF.md) for contracts and deployed versus candidate
status. Run `check:visitor-source` after source/build changes and targeted
`check:refactor` for the extracted boundaries. Documentation-only edits do not
require a rebuild or deployment.
