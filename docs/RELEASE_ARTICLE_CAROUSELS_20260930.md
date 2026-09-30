# Article carousels and CMS integration - 2026-09-30

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

Current evidence is stored under ignored `uat-results/home-carousel/`,
`article-carousel/`, `articles-cloud/`, `editor-panel/` and `admin-controls/`.
Fixture screenshots prove UI behavior, not production content availability.

The API release fixture uses a per-run Firestore namespace and refreshes the
settings revision after Home pin reservations. Stale-revision rejection remains
an explicit assertion. Browser authoring scrolls the actual writing frame into
view before interacting or checking a reopened draft, including WebKit.

Before production: finish the repository checks, verify the hosted preview,
and require GitHub `verify` on the exact release SHA. The existing Vercel gate
must hold production aliasing while checks are pending or failed. Do not force
promotion. After deployment, read back the alias/source SHA and verify served
assets and public routes. Remote IDs and terminal results belong in an ignored
release receipt; this document is not a claim that deployment has completed.

## Recovery

The pre-integration source baseline is `759024f`. Verify the currently assigned
production deployment before recovery and obtain explicit rollback approval.
No database restoration is needed; optional ordering fields are additive.
