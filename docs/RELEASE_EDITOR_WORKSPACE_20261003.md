# CMS navigation and article writing workspace — October 3

Scope: the current chat's CMS page/section selectors and unified article writing
workspace. Integrated with production baseline `ec5d888` without replacing its
Home carousel or section visibility/order changes. No production content,
settings, authentication configuration or Firestore Rules changes are included.

Reader-visible title, cover, summary, decorative notes, author/date and sources
now have one field owner beside the live writing canvas. Fullscreen preserves
the mounted editor, selection, undo and draft state. Publication pins and SEO
remain in settings. CMS page/section cards retain search, keyboard navigation,
ordered section choices and mobile layout.

Local release checks cover generated bundles, unchanged performance budgets,
CMS pages/content/order, article workspace in Chromium and WebKit, validation,
movable block conversion and reader/Preview parity. Integration tests now open
the actual content panels and select visible actions; their persistence,
authorization and publication assertions remain intact. The new workspace
regression also runs in the existing CI Articles shard.

The focused real Auth/Firestore emulator journeys passed in Chromium and
WebKit: authorship from an empty editor, crop authorization, denied/stale save,
save/reopen, full Preview, Publish, visitor readback, draft/live isolation and
Unpublish. The Home pin journey passed save/reload/publication and the concurrent
ten-pin limit. These checks use synthetic isolated records, not production data.

Local evidence is under `uat-results/editor-pages/`, `editor-content/`,
`editor-panel/` and `article-workspace-20261003/`. Desktop/mobile CMS captures
were inspected after integration. Prior article comparison captures document
the unchanged article editor implementation; current workspace runs verify the
integrated canvas and behavior. Browser-engine checks are not physical-device QA.

Release uses the normal Git-triggered `main` deployment and exact-SHA `verify`
gate. A successful local check is not production promotion. Record remote run,
deployment and read-only asset/route verification in the release evidence and
final report. Recovery is a new reviewed revert of this change on the latest
main; do not reset over unrelated work or roll back stored content.
