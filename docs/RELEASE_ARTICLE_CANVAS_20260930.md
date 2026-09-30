# Article canvas and typography release — 2026-09-30

The owner authorized pushing and deploying the article work in this chat from
`codex/motor-comparison-20260924`. The base is `523642b1f3af1a039d28f3097080dbd13006a1d6`.
Changes in the primary checkout and its dependency symlink are excluded.

## Scope

- The editor writes directly into the real article page in a private iframe.
  Editor, full-page Preview and public rendering share the document layout,
  typography, cards and table wrapper. Preview updates preserve selection and
  undo history; its update implementation is included only in private frames.
- Body, sidebar and full-width blocks can be inserted, moved, duplicated and
  removed. Takeaway, quote and feature cards retain their composition while
  editable text and independent optional notes remain under CMS control.
- Google Sans and compact default heading/body scales apply consistently.
  H1–H6/P, numeric desktop/mobile sizes, line height, spacing and padding are
  editable. Numeric whitelisting protects the shared storage/render boundary.
- Source-only HTML comments are omitted from the generated public template;
  integration markers and raw-text elements are preserved. Performance budgets
  are unchanged.

No production article is created, saved, published or migrated for this release.
No Rules, environment, email or account-permission policy changes are included.

## Verification

Local checks cover schema safety, Google Sans loading, inline and block styles,
H1–H6/P, table geometry, Undo, backup round trips, save/reopen, full-page Preview,
responsive parity and article Auth/API persistence. Chromium and WebKit evidence
is stored under `uat-results/article-*` and `uat-results/articles-cloud`.
Types, contracts, security, generated bundles and refactor boundaries pass.
The final performance check passes Home/Motor at 390/1440px with zero CLS;
compressed Home shell is 234,476 bytes against the unchanged 235,000-byte cap.

Remote acceptance still requires exact-SHA GitHub `verify`, an actual hosted
UAT editor/Preview journey and canonical production asset/route readback. Those
terminal results and deployment IDs belong in the ignored
`uat-results/article-release/` receipt. The hosted journey uses a temporary
`uatOnly` identity and blocks application writes; cleanup disables the identity
and deactivates its allowlist record.

## Recovery

Prior production: `dpl_ARZCzanrdaDmR3BodnNJEtg38TCN`,
`covermate-oxm1njiu5-purich-w.vercel.app`, SHA `523642b1f3af1a039d28f3097080dbd13006a1d6`.
Prefer a forward fix. Do not restore article data or roll back without explicit
authorization: older code does not understand the new block/type attributes and
can discard them if a newer document is edited and saved there.
