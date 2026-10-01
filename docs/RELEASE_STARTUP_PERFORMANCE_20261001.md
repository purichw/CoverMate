# Startup Performance and Article Filters Release

## Scope

- Eliminate duplicate boot/header logo downloads using the shared media URL policy.
- Discover boot dependencies earlier and defer footer images until they are near the viewport.
- Read public site and article data concurrently while preserving private-route isolation, article failure handling, and publication freshness.
- Keep Admin article author/date filters expanded initially and center the date controls. Update browser assertions for that default.
- Include the performance report and the earlier Admin/Visitor audit as records. The audit's outstanding application findings are not fixed by this release.

No CMS content, article publication, customer records, authentication settings, Rules, environment variables, or cache policy are changed.

## Release Evidence

Current-source local checks cover SEO/concurrent reads, freshness, generated bundles, startup resources, loading/retry, server boot, Admin auth-loading isolation, performance budgets, and article filtering. The exact release SHA must pass the existing GitHub `verify` job, including the full CI and emulator suite, before production aliasing.

Hosted preview and production checks are read-only. Verify matching static assets, boot resource URLs, rendered Visitor content, lazy footer images after scrolling, responsive fit, and anonymous Admin isolation. Do not represent these checks as real authenticated Admin performance or a production publishing test.

Record final commit, CI, deployment/alias readback, and smoke results under ignored `uat-results/startup-release-20261001/`. This document alone does not claim deployment success. Timing measurements remain lab samples, not real-user percentiles; see [PERFORMANCE_AUDIT_20261001.md](PERFORMANCE_AUDIT_20261001.md).

## Recovery

The preceding production source is `cd47b71705cfe6e7a9def89d324a62ab7a38bdaf`. There is no data migration to reverse. If a deployment regression is confirmed, prepare a scoped revert for owner approval and preserve the exact-SHA CI gate; do not force-promote or reset CMS/article drafts.
