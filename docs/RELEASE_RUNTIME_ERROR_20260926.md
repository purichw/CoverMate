# Visitor Runtime Error Guard

## Scope

Fix the public `[bundle] Script error.` debug overlay reported on mobile. The
error listener no longer creates a visitor-facing diagnostic panel. Known
errors during startup retain the existing localized retry screen. Opaque
`Script error.` events without an error object or source do not immediately
mark startup failed; existing readiness deadlines and critical-script failure
handling remain in place. No reload, form reset, CMS write or consent change.

This fixes the inappropriate overlay, not the unidentified original exception.
The one-off screenshot lacks a source/stack and cannot establish its cause.

## Diagnostics

Runtime telemetry adds only allowlisted error class, source category, boot/ready
phase, browser-engine family and bounded numeric line/column. It does not send
error messages, stacks, source URLs, full user agents or form values. The API
sanitizes the new fields again. Repeats deduplicate by structured diagnostics; the
existing maximum of 12 events per page remains. A failed beacon is nonfatal.
The diagnostic classifier loads only after an error so it does not add to the
normal first-page script budget; a failed import falls back to the basic count.

## Verification And Release

- `node scripts/runtime-error-check.mjs`: privacy and dedup units plus
  Chromium/WebKit mobile Home/Motor, FAQ/TH/EN, preserved input, repeated errors,
  startup and retry. Included in the existing CI gate.
- Build visitor and telemetry outputs; run types, NFR, bundle and boot/loading
  regression checks. Exact-SHA GitHub `verify` remains required for production.
- No real iPhone, WhatsApp or LINE-app reproduction is claimed.
- Runtime source/build changes only; unrelated root-checkout work is excluded.
- Local result: PASS in Chromium 154 and WebKit 26 at 390 x 844, including
  the built telemetry asset and lazy diagnostic module. Both engines preserve
  typed contact data and recover from an intentionally failed critical script.
- Types, NFR, bundles, boot/loading and performance checks: PASS. Existing
  performance budgets remain unchanged. The live deployment-gate audit passed.
- Production release still requires exact-SHA CI and deployed asset readback;
  local synthetic tests do not reproduce the original unidentified exception.

Recovery: redeploy the prior production revision `d8d130a` through the normal
release gate if needed. No data migration or production content publish.
