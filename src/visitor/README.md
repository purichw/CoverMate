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
- `home.html` and `home.css` are the candidate compact Home projection; the
  generator composes them into `template.html` while Motor stays shared.
- `defaults.js` is the default CMS/site config injected into the runtime.
- `runtime.js` is the `text/x-dc` runtime injected into that template.

The generator preserves the exported bundler serialization rules through
`scripts/lib/bundler-template.mjs`. `npm run check:visitor-source` fails when
`index.html` has drifted from these sources.

`build:visitor` also regenerates `server/asset-versions.json` for the candidate
published-CMS initial-head renderer. Static CSS/defaults are compacted only in
generated output. See `docs/HANDOFF.md` for incomplete final CI, preview versus
production status and current release authorization; do not rebuild/deploy for docs edits.
