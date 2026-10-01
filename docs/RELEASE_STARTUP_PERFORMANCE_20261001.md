# Startup Performance and Article Filters Release

## Scope

- Eliminate duplicate boot/header logo downloads using the shared media URL policy.
- Prefetch the public data adapter and defer footer images until they are near the viewport.
- Read public site and article data concurrently while preserving private-route isolation, article failure handling, and publication freshness.
- Keep Admin article author/date filters expanded initially and center the date controls. Update browser assertions for that default.
- Include the performance report and the earlier Admin/Visitor audit as records. The audit's outstanding application findings are not fixed by this release.

No CMS content, article publication, customer records, authentication settings, Rules, environment variables, or cache policy are changed.

## Release Evidence

Current-source local checks cover SEO/concurrent reads, freshness, generated bundles, startup resources, loading/retry, server boot, Admin auth-loading isolation, performance budgets, and article filtering. The exact release SHA must pass the existing GitHub `verify` job, including the full CI and emulator suite, before production aliasing.

Hosted preview and production checks are read-only. Verify matching static assets, boot resource URLs, rendered Visitor content, lazy footer images after scrolling, responsive fit, and anonymous Admin isolation. Do not represent these checks as real authenticated Admin performance or a production publishing test.

Record final commit, CI, deployment/alias readback, and smoke results under ignored `uat-results/startup-release-20261001/`. This document alone does not claim deployment success. Timing measurements remain lab samples, not real-user percentiles; see [PERFORMANCE_AUDIT_20261001.md](PERFORMANCE_AUDIT_20261001.md).

The first integrated CI run exposed a second one-request failure fixture in the runtime-error browser check. Preload and execution may make separate requests, so the fixture now rejects the resource throughout the initial navigation and restores it only for explicit Retry. The error/retry assertions and production behavior are unchanged; Chromium and WebKit both remain covered.

WebKit verification additionally showed a failed classic-script preload being reused across Retry without another network request. The release therefore omits the new React/ReactDOM preload hints instead of changing production retry semantics. Failure injection uses a fresh browser context and asserts both an actual blocked request and a restored request on Retry; failure diagnostics remain recorded. The public module hint, deduplicated logo, lazy footer and concurrent server reads remain.

The preceding upstream CI also exposed a Home-pin E2E synchronization bug: its broad save-text selector matched the saving-in-progress message, permitting reload to abort the request (`ECONNRESET`). The test now waits for the exact successful cloud-draft message before checking persistence. The application save contract and all persistence assertions are unchanged.

The new resource-count test initially disabled HTTP caching through Playwright routing, causing older Chromium to refetch identical image URLs. External HTTPS is now blocked via CDP without disabling the cache; the unchanged single-request assertion passes on CI's Chromium 141 as well as current Chrome. This test runs immediately after the Visitor build to expose startup regressions before the longer browser suite.

## Recovery

The preceding production source is `cd47b71705cfe6e7a9def89d324a62ab7a38bdaf`. There is no data migration to reverse. If a deployment regression is confirmed, prepare a scoped revert for owner approval and preserve the exact-SHA CI gate; do not force-promote or reset CMS/article drafts.
