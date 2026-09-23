---
name: covermate-design-spec
description: Maintain, update, audit, snapshot, or hand off the CoverMate website and admin designs against the current production product spec. Use when working on CoverMate public visitor pages, admin login, Admin Portal shell, owner editor/control-panel routes, analytics surfaces, design handoffs, reference reconciliation, responsive/UI polish, production snapshot suites, Firestore CMS content behavior, SEO/analytics design implications, or any task that must preserve CoverMate product decisions.
---

# CoverMate Design Spec

## Overview

Use this skill to keep CoverMate website and admin design work aligned with the real production product, not older offline/reference exports. It packages the current full design spec and the workflow for reconciling new references with the existing implementation.

## Required Reference

For substantive design, implementation, or handoff work, read:

- `references/current-design-spec.md`

If the repository file exists at `/Users/point/CoverMate/docs/covermate-website-full-design-spec.md`, prefer that file as the newest source and use this bundled reference as a fallback snapshot. If they differ, the repository doc wins unless the user explicitly says otherwise.

For production snapshots, visual archives, release evidence, or design handoffs that need current screenshots, also read:

- `references/snapshot-suite.md`

## Workflow

1. Establish the task surface: public home, dedicated `/motor` page, `/#motor` legacy alias, admin login, Admin Portal shell, owner edit mode, owner control panel, or admin analytics.
2. Read the current design spec before changing design-sensitive behavior, copy, layout, nav, admin flows, analytics, SEO, or dynamic CMS assumptions.
3. Reconcile any new screenshot/spec/reference against the current product decisions. The newest explicit user request wins, but preserve existing CoverMate decisions unless the user intentionally changes them.
4. Preserve the two current public entry points: `/` is the full home page, and `/motor` is the dedicated motor-insurance campaign page in the same product. `/#motor` remains only a legacy home-page alias to `#insurers`.
5. Preserve the Admin Portal after login as the unified private shell for `Operations`, `Website content`, `Analytics`, and `Settings`. Website content uses one editor entry; do not reintroduce a separate `Arrange & customise` launcher card.
6. Preserve natural Thai Admin controls with conventional English terms such as `Save draft`, `Preview`, `Publish`, `Undo` and `Redo`; follow `docs/ADMIN_LANGUAGE.md`. Public TH/EN content switching must not translate Admin controls or overwrite the other content language.
7. Preserve Google Sans family usage across Thai and English visitor/admin text.
8. Treat Firestore live content as canonical. Local fallback/cache must not override successfully loaded live content.
9. Capture and personally inspect rendered screenshots before finishing UI work. Choose evidence by touched risk; a release does not automatically require a complete archive. Use the full snapshot suite when a full-site archive/handoff is requested. Paths, DOM checks and successful captures alone are not visual review.
10. Do not commit, push, or deploy unless the user explicitly asks in the current turn.

## Snapshot Discipline

- Never call a partial viewport set a "full production snapshot" or "complete evidence".
- Label ad-hoc `/tmp` screenshots as narrow evidence with route, viewport, auth state, and whether `fullPage` was used.
- For complete evidence, capture the matrix in `references/snapshot-suite.md`, use matched viewport sets, wait for fonts/hydration/data to settle, and write a manifest with provenance.
- Use `fullPage: true` for long page archives. Use viewport crops only for specific anchor, drawer, form, or interaction states.
- Keep signed-out, signed-in, owner-hash, TH/EN, desktop/tablet/mobile, and data-state captures separate instead of mixing them as if they were comparable.
- If any required surface cannot be captured, state exactly which surface is missing and why.

## Must-Preserve Product Decisions

- The home visitor navbar shows one motor item only: Thai `ประกันรถยนต์`, English `Motor`, pointing to `#insurers`. The `/motor` page may use a local motor-page navbar with a `Home` link.
- No `[object Object]` labels may appear in nav or UI.
- `/#motor-focus` is legacy/unexposed compatibility only; `/motor` is the current dedicated motor page.
- Home follows the approved compact redesign in `docs/HOME_REDESIGN.md`, with standalone editable Coverage and legacy Guides items consolidated into FAQ. Section availability is not a mandate to show every section. Preserve current CMS visibility, complete tier choices and truthful content. Read current live/draft data for order rather than restoring a historical list.
- Every visitor content image has a CMS media owner and ratio-aware crop/fit flow; keep source/output URLs and draft/live semantics. Read `docs/CMS_MEDIA.md` for Cloudinary setup and limits. Never hard-code replacements around Admin or revive Firebase Storage.
- Compare complete desktop/mobile composition, section density, optical logo size, equal collapsed peer cards and disclosure padding. Tablet should retain desktop-like composition with touch/mobile behavior. The owner requested roughly 3-4 viewports for this compact Home; measure actual comparable state, never force that by clipping content or shrinking text beyond readability.
- Latest owner-approved references govern visual direction; production governs existing behavior/data until an authorized migration. Use `docs/HANDOFF.md` to distinguish candidate evidence from production.
- The AIA logo uses the transparent red asset at `assets/logos/aia-logo.png`.
- Contact headings follow current CMS copy; keep compact, legible wrapping without restoring historical wording.
- Admin analytics remains a private admin module and route.
- Admin Home and Cases follow `docs/ADMIN_HOME_DESIGN.md` and `docs/ADMIN_CASES_V2.md`. Preserve real metrics/loading/error states, owner-only Cases access, explicit Save, version-conflict recovery and the mobile detail drawer. Legacy Leads/Tasks/Audit APIs are compatibility, not the current visible tabs.
- CMS editor Undo/Redo and Reset operate on Draft; Reset reads the newest published snapshot and remains undoable. Save Draft flushes autosave without clearing history. The separate 30-second post-Publish undo changes Live and must stay explicitly labeled. Use `docs/CMS_EDITOR_HISTORY.md` for buffers, identity-scoped history and failure behavior.
- Follow actual source ownership: visitor renderer in `src/visitor/runtime.js`, editor commands in `src/visitor/cms-controller.js`, history in `editor-history.js`, CMS persistence in `covermate-firebase.js`, and freshness in `covermate-freshness.mjs`. The controller extraction does not lazy-load the whole editor UI.
- GA4 measurement ID is `G-5TF3C235EF`; public analytics must not receive visitor names, phone numbers, LINE IDs, or freeform messages.
- Admin routes are private and `noindex`.

## When Producing A Design Handoff

Include:

- Source-of-truth precedence.
- The current route/surface map.
- Visitor section order and component map.
- Admin surface map, including login, Admin Portal shell, website content editor/control panel, analytics, operations, and settings.
- Typography, color, spacing, responsive, accessibility, assets, SEO, analytics, and Firestore CMS guardrails.
- Explicit acceptance checklist and `do not touch` constraints.
- Snapshot evidence paths when available.

Keep the handoff implementation-ready and clear about what is FACT, what is an inference from current code, and what is a recommendation.

The installed skill and repository `skills/covermate-design-spec/` are kept in
sync. Refresh the bundled `references/current-design-spec.md` from the canonical
repository spec when that spec changes. It is a fallback snapshot, not proof of
the current deployed version; consult `docs/HANDOFF.md` and release evidence.
