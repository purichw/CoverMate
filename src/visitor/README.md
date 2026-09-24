# Visitor Bundle Sources

`index.html` is the generated deployable visitor/owner-mode artifact, not proof
that current workspace changes are live. Edit the files in
this folder first, then run:

```bash
npm run build:visitor
```

Source ownership:

- `shell.html` is the outer static shell around the exported visitor bundle.
- `template.html` is the embedded `__bundler/template` HTML with a runtime slot.
- `home.html` and `home.css` are the compact Home projection while Motor stays
  shared. The generator composes the markup into `template.html` and emits
  minified `assets/visitor/home.css` with a content-versioned stylesheet link.
- `defaults.js` is the default CMS/site config injected into the runtime.
- `runtime.js` owns rendering, route/mode state, normalized CMS projections,
  hydration, and DOM bindings in the injected `text/x-dc` runtime.
- `cms-controller.js` composes owner commands through `withCmsController`:
  draft-save scheduling, Save/Publish/Reset, shortcuts, media, and history.
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
