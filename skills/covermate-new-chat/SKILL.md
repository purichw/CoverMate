---
name: covermate-new-chat
description: Onboard a fresh Codex chat for the CoverMate project. Use when the user asks for a new-chat prompt, handoff prompt, context pickup checklist, required docs/skills/setup for CoverMate, or wants a future chat to know what to read before visitor, motor page, admin, CMS, Firebase, analytics, UAT, media/assets, QA, snapshot, push, deploy, or consistency work.
---

# CoverMate New Chat

## Purpose

Prepare a fresh Codex chat to work safely on CoverMate without relying on stale conversation memory. This skill is an onboarding router: read the current on-disk docs and skill files, then produce a concise starter prompt or context checklist for the next chat.

## Workflow

1. Treat the repo as:

```text
/Users/point/CoverMate
```

2. Inspect current state first:

```bash
git -C "/Users/point/CoverMate" status --short --branch
```

3. Read the shared new-chat shape:
   `/Users/point/.codex/skills/project-onboarding/references/new-chat-template.md`.
4. Read `references/new-chat-context.md` from this skill.
5. Read only the project docs relevant to the next task, using the required-doc order from the reference.
6. If the user asks for a prompt, return a copy-ready prompt for a new chat. If the user asks to continue work, summarize what was read and proceed with the relevant task.

## Required Discipline

- Start from the current `docs/HANDOFF.md` checkpoint. Distinguish source, protected preview, published CMS and deployed production; a generated build is not deployment evidence.
- Check the active checkout, upstream and uncommitted scope before applying an old patch. Refactor UAT evidence may use an older production baseline than current `origin/main`; preserve newer runtime, build and test changes when integrating it. Read `docs/REFACTOR_20260924.md` for the extraction and evidence boundaries.
- Primary origin is `https://covermateinsurance.com`. Read `docs/CMS_MEDIA.md` for the selected Cloudinary Free backend and current cost/security boundaries; Firebase Auth and Firestore remain in use, Firebase Storage does not.
- Home redesign work must read `docs/HOME_REDESIGN.md`: the approved compact composition and current Admin ownership supersede old expanded-section geometry. Do not revive superseded constraints from historical specs.
- Use current on-disk skill files when a skill is named. Do not rely on older remembered skill behavior.
- Do not commit, push, deploy, rollback, revert, remove, or undo work unless the user explicitly asks in the current task.
- Treat production repo files, current docs, and Firestore live CMS state as source of truth over older external prototypes/exports unless the owner explicitly reopens a product decision.
- Preserve existing routes, Firebase/Firestore contracts, localStorage keys, SEO/noindex boundaries, admin session behavior, responsive constraints, and owner-mode UI contracts unless the task explicitly changes them.
- Admin controls use natural Thai with familiar English workflow terms. Cases is owner-only; legacy Leads/Tasks/Audit APIs remain compatibility surfaces. Use `docs/ADMIN_LANGUAGE.md`, `docs/ADMIN_CASES_V2.md` and `docs/CMS_EDITOR_HISTORY.md` instead of historical English-only chrome or Operations-tab instructions.
- For UI work, provide snapshots or screenshots in the final handoff.
- For release work, use `$release-gate`; for deployed media/image changes, use `$production-asset-smoke` after deployment; for rollback-like requests, use `$rollback-guardrail` before changing files.
- Use UAT proportionally. Do not run hosted UAT smoke, create fresh UAT previews, or seed UAT data for small copy/CSS/docs/icon tweaks by default. Use UAT only when the diff touches Firebase/Auth, Firestore Rules, CMS data paths, Admin session/publish/save flows, lead capture, Operations/Analytics APIs, environment/routing/Vercel config, production-like routing behavior, or when the owner explicitly asks for UAT/regression.
- Project skill sources are versioned under `skills/` in the repository. When updating this skill, keep its installed copy and versioned copy aligned; `references/new-chat-context.md` routes to the living docs rather than storing deployment status in the skill.

## Reference

Read this when the skill triggers:

```text
/Users/point/.codex/skills/covermate-new-chat/references/new-chat-context.md
```

Use the shared starter-prompt shape from:

```text
/Users/point/.codex/skills/project-onboarding/references/new-chat-template.md
```
