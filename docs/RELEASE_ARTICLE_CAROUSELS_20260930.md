# Article carousels and CMS integration - 2026-09-30

Historical release record. The candidate, local evidence and recovery baseline
below describe September 30 and are not current pending work. Current live
source is `aa8b68d` (2026-10-02); see [HANDOFF.md](HANDOFF.md) for the successful
CI and promoted deployment. Current presentation and checks are owned by
[HOME_ARTICLES.md](HOME_ARTICLES.md), [ARTICLES_INDEX.md](ARTICLES_INDEX.md)
and [ARTICLE_EDITOR.md](ARTICLE_EDITOR.md). No new visual smoke was run for
this documentation update.

The owner authorized push and deployment of this chat's changes. The candidate
integrates upstream `4d429ca` in `.tools/admin-shell-consistency-20260926`;
unrelated changes in the primary checkout are excluded.

## Scope

- Responsive public article index and Admin list/editor presentation.
- Unlimited ordered index pins in a 10-second carousel. Independent Home pins
  occupy at most ten slots; newest eligible non-duplicate articles fill the rest.
- Transactional Home pin limits include draft/live reservations. Unpinning a
  published article releases its slot only after publishing or unpublishing.
- Home's article section participates in CMS ordering, with live panel updates.
- The merged editor retains upstream's real-page writing canvas, rich blocks,
  typography, crop confirmation and publication boundaries alongside the basic
  metadata form and responsive settings panel.
- Desktop writing spans both metadata columns to preserve reader typography.
  Legacy Summary/Quote conversion controls retain their DOM identity during
  selection updates so pointer clicks are not lost; conversion remains undoable.
- Upstream publication-scope copy and isolation tests are retained: website
  drafts and each article have independent save, publish and reset boundaries.
- The subsequent upstream Admin refresh and CMS entry links are preserved.
  Home card styling retains that update alongside the independent carousel;
  CMS entry selection and private article-feed loading both remain active.
- The shared reader is a versioned generated asset loaded before the component
  runtime. This keeps the compressed shell under the existing performance cap;
  bundle validation guards its execution order and generated parity.

No production content migration, sample publication, lead submission, email,
credential, Rules or environment change is part of this deployment.

## Evidence And Gates

Local browser checks exercise the Home selection cases (0/3/10 pins), duplicate
exclusion, carousel navigation/timing/pausing, mobile layout, CMS article ordering,
Undo/Redo/save/reload, list filters and editor controls. Real Auth/Firestore
emulator checks exercise rich authoring, denied/conflicting saves, publication,
reader parity, unpublication and independent Home pin limits/concurrency.

The evidence from that release work was stored under ignored
`uat-results/home-carousel/`, `article-carousel/`, `articles-cloud/`,
`editor-panel/` and `admin-controls/`.
Fixture screenshots prove UI behavior, not production content availability.

API and cloud-browser release fixtures use per-run Firestore namespaces. The API
fixture refreshes settings revisions after Home pin reservations; stale-revision
rejection remains an explicit assertion. Browser authoring scrolls the actual
writing frame into view before interacting or checking a reopened draft,
including WebKit, and reads typography only once the canvas node is rendered.

Before production: finish the repository checks, verify the hosted preview,
and require GitHub `verify` on the exact release SHA. The existing Vercel gate
must hold production aliasing while checks are pending or failed. Do not force
promotion. After deployment, read back the alias/source SHA and verify served
assets and public routes. Remote IDs and terminal results belong in an ignored
release receipt. This historical candidate record did not claim a completed
deployment; current status is linked above.

For current Home paging changes, `scripts/home-articles-pins-e2e.mjs` is the
focused real Auth/Firestore publication check as well as part of the emulator
suite. It now expects three active mobile cards and advances by three, while
the independent index still has one active card. The isolated-emulator command
and current carousel behavior are documented in `HOME_ARTICLES.md`; do not
reuse the historical layout or timing expectations above as current checks.

## Recovery

The historical pre-integration source baseline was `759024f`; it is not a
current rollback target. Verify the currently assigned production deployment
before recovery and obtain explicit rollback approval.
No database restoration is needed; optional ordering fields are additive.
