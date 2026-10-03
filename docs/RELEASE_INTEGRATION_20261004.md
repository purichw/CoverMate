# October 4 Combined Release

## Authorized Scope

The owner requested all pending work from this chat, CoverMate 2
(`01a0848b-55ad-7e52-a2ee-9d73770e3332`) and CoverMate 3
(`01a0f0c5-dc9f-7ad3-8f5e-b612013a9904`) to be integrated and deployed.
This is a code release, not permission to publish existing CMS/article drafts.

The integration branch `codex/release-all-20261004` starts at `28e8c60` and
preserves the current production source. Pending source changes were applied
from `admin-shell-consistency-20260926`, `motor-comparison-20260924` and
`center-admin-cards`; generated bundles were rebuilt from the integrated source.
Original worktrees and historical exports remain intact. Stale bundles,
screenshots, local credentials and dependency symlinks are not release inputs.

## Included Work

- Article Editor: grouped metadata panels, clearer labels, green readiness
  checklist, collapsed preview and focused expanded writing, cover-image tools,
  optional display dates, per-language publishing and independent localized
  media with confirmed one-time reuse.
- Canonical article summaries: direct dragging, form/body synchronization and
  backward-compatible adoption without manual conversion buttons.
- Admin owner panel and account menu: grouped actions, shared logout
  confirmation and account actions visible on short desktop viewports.
- Article management: permanent deletion only from Trash with exact `DELETE`
  confirmation, optimistic revision checks and atomic projection/slug cleanup.
- Public article search: TH/EN suggestions, keyboard selection, relevance,
  published pins and actual per-language Publish time for sorting.

## Integration Repairs

Preserved localized images alongside the Publish clock in public summaries.
An explicit empty EN image does not inherit TH, and publishing EN does not leak
unpublished TH edits. Legacy catalogs recover missing Publish timestamps by
reading their live source, without rewriting content.

Summary adoption preserves classic paragraph spacing. Removing summary items
retains its accompanying note for reuse. Backup import replaces document
attributes as well as content, preventing duplicate legacy summary banners.
Formatting popovers close after a command. Updated browser journeys use the
real expanded editor and metadata panels, retaining persistence, validation,
responsive geometry and public/private media assertions.

## Verification And Promotion

Local evidence is under `uat-results/` (not committed). Targeted coverage
includes article search, carousel, editor tools, metadata, summary drag,
localized media, dates, publication validation, owner panel, account-menu
geometry and logout cancellation. Real Auth/Firestore emulator checks cover
API lifecycle/deletion, language isolation and rich authoring through Preview,
Publish and visitor readback. Required CI additionally runs WebKit.

`scripts/article-release-hosted-check.mjs --write-uat --url=<exact-preview>`
creates only its own synthetic UAT article and temporary UAT-only owner. It
checks TH/EN publication independence and guarded deletion, then removes the
article and disables the test identity. It never changes existing UAT settings
or production content. `scripts/article-release-smoke.mjs` performs read-only
deployed asset hashes and desktop/mobile article-route checks.

At commit time, hosted UAT, exact-SHA full CI and production promotion are still
pending. A passing build alone is not a release: retain the required GitHub
`verify` deployment gate, then verify the canonical production alias and served
assets. Follow `RELEASE_RUNBOOK.md` timing checkpoints. No Firestore Rules or
environment configuration changes are part of this release.

Recovery is a reviewed follow-up reverting the integrated source to `28e8c60`
through the same CI gate; do not reset production content or discard the source
worktrees. Permanent article deletion is irreversible and is never a rollout
or cleanup step for real content.
