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
- `home.html` and `home.css` are the compact Home projection; the
  generator composes them into `template.html` while Motor stays shared.
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
  and `/api/leads`. Keep these contracts separate from CMS command extraction.
- `boot.js` / `boot.css` own the first-paint loading shell.

The generator preserves the exported bundler serialization rules through
`scripts/lib/bundler-template.mjs`. `npm run check:visitor-source` fails when
`index.html` has drifted from these sources.

`build:visitor` also regenerates `server/asset-versions.json` for the published-CMS
initial-head renderer. CSS, defaults, and runtime code are compacted only in
generated output. Public refresh timing is shared through root
`covermate-freshness.mjs`; its extraction does not change cache/poll intervals.

See [architecture](../../docs/ARCHITECTURE.md),
[Draft history](../../docs/CMS_EDITOR_HISTORY.md),
[contact intake](../../docs/CONTACT_SUBMISSION.md), and
[HANDOFF](../../docs/HANDOFF.md) for contracts and deployed versus candidate
status. Run `check:visitor-source` after source/build changes and targeted
`check:refactor` for the extracted boundaries. Documentation-only edits do not
require a rebuild or deployment.
