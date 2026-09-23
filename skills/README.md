# CoverMate project skills

These are versioned copies of the two project-specific Codex skills:

- [covermate-new-chat](covermate-new-chat/SKILL.md): context pickup, source
  ownership, relevant reading, setup and release boundaries.
- [covermate-design-spec](covermate-design-spec/SKILL.md): current product/design
  contracts and proportional screenshot evidence.

The installed copies live under `/Users/point/.codex/skills/`. Changes to a skill
must be synchronized with its matching folder here before a project push. This
repository does not auto-install skills or change global Codex configuration.
Other generic skills referenced by these files are dependencies of the local
Codex environment, not bundled CoverMate sources.

The canonical design specification is
[docs/covermate-website-full-design-spec.md](../docs/covermate-website-full-design-spec.md).
After editing it, refresh the content-matched fallback at
`covermate-design-spec/references/current-design-spec.md` in both locations.
Resolve its local Markdown links to `/Users/point/CoverMate/docs/` so they keep
working outside the canonical document's directory. Apart from that link
resolution, the fallback must match the canonical specification.
Current source, deployment and CMS publication status belong in
[HANDOFF.md](../docs/HANDOFF.md), not in a skill's cached release claim.

Before handoff, validate each skill with the installed skill-creator
`scripts/quick_validate.py`, compare installed/versioned file contents, and
check that local references resolve. Keep credentials, private test evidence,
generated UAT results and historical export bundles out of these folders.
