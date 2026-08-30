# Visitor Bundle Sources

`index.html` is the deployed visitor/owner-mode artifact. Edit the files in
this folder first, then run:

```bash
npm run build:visitor
```

Source ownership:

- `shell.html` is the outer static shell around the exported visitor bundle.
- `template.html` is the embedded `__bundler/template` HTML with a runtime slot.
- `defaults.js` is the default CMS/site config injected into the runtime.
- `runtime.js` is the `text/x-dc` runtime injected into that template.

The generator preserves the exported bundler serialization rules through
`scripts/lib/bundler-template.mjs`. `npm run check:visitor-source` fails when
`index.html` has drifted from these sources.
