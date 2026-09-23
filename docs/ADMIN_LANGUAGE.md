# Admin language

Admin Portal uses natural Thai, including navigation, cases, settings, login,
Analytics, CMS controls, media editing, validation and feedback. Retain familiar
workflow terms (Publish, Preview, Save, Save draft, Undo, Restore, Export/Import,
Analytics, SEO) and product/service names (LINE, Firebase, Firestore, Google).

The CMS TH/EN selector edits the corresponding **website content**. Admin controls
remain Thai in both modes. Customer messages, names, owner-entered content, field
paths, routes, API enums and database keys must never be translated or rewritten.
The existing logo artwork and Google Sans / Google Sans Thai typography remain.

CMS metadata uses the display-only dictionary in `src/visitor/admin-labels.js`,
embedded by `scripts/lib/visitor-source.mjs`. Keep `CMS_CONTENT_FIELDS` group keys
and canonical data paths stable. Add Thai display labels for new metadata.
Build `index.html` with `node scripts/generate-visitor-bundle.mjs`; build the media
editor with `npm run build:media` after changing its source.

Cases use Thai date labels, Gregorian years and Bangkok time; stored timestamps
and native form values are unchanged. Known server-generated notices/errors are
localized at the presentation boundary; customer content remains as entered.

Validation for this change: isolated browser checks for Cases, login, Analytics,
portal modules, CMS TH/EN editing, and media editing; desktop/mobile screenshots
in `uat-results/admin-th/`. Fixtures block production writes. No data migration,
production publish or deployment is part of this localization.
