# Admin refresh release — 2026-09-30

Status: release preparation. The owner authorized push and production deployment
of this chat's work from `.tools/motor-comparison-20260924`. Source changes and
this document do not establish a passing gate or deployment. Preserve prior
committed article features and exclude the untracked `node_modules` symlink.

## Scope

- Public Home Articles layout, centered shared dropdown labels/options and table
  headings across Visitor, Admin and article documents.
- Shared Admin account menu/details and Logout, retaining verified identity,
  notification entry points and unsaved Article/Cases guards. Logout awaits
  Firebase sign-out before navigation so the redirect cannot interrupt it.
- CMS hub with server reads of Live, Draft and bounded version history;
  explicit unknown/error states and links to existing authenticated CMS tools.
  Optional server reads preserve existing Firebase reader defaults.
  Hub entry selection loads privately from `admin/cms-entry.mjs`, keeping it
  out of the public page payload while retaining verified-session checks.
- Admin Home composition, real Cases/CMS summaries and existing navigation.
- Cases list composition, local/global search, filters, responsive cards/table,
  empty/loading/error states and retained detail/save behavior.

No production CMS Publish, customer mutation, real email send, Firestore Rules,
stored schema or credential change is included. Role enforcement and existing
backend contracts remain. Code deployment does not publish the current CMS Draft.

The release branch incorporates main through `d70dd02` to preserve concurrent
repository updates. Scope is the diff from that main baseline; its existing
email/media and publishing-scope changes are not new work attributed to this chat. The final receipt
must distinguish main's production status from candidate build readiness.

## Required gates and evidence

All outcomes below are **pending** until recorded against the final source/SHA.

1. **Local:** current targeted account, CMS hub/entry, Home refresh and Cases
   checks; existing shell/Home/Cases regression; Home Articles and shared
   dropdown/table checks. Inspect desktop/mobile screenshots, console and asset
   failures. Run type/bundle/source parity and whitespace checks. Regenerate
   `index.html`, Visitor CSS and the Admin shared-select asset slot from source.
2. **Exact-SHA CI:** the final candidate must pass GitHub `verify`, including
   the repository CI and emulator gates. New portable targeted checks must be
   wired into CI or have separately recorded current results; a queued run is
   not a pass.
3. **Hosted UAT:** verify the exact candidate's real authentication, CMS
   server reads, tool destinations/context and account navigation/Logout.
   Record URL, SHA, data/auth scope, limitations and cleanup for any temporary
   UAT identity. Do not Publish production CMS or send customer notifications.
4. **Production:** after authorized promotion, verify the canonical
   `https://covermateinsurance.com` alias against the candidate deployment/SHA,
   read back changed served assets and check representative Visitor/Admin
   routes. Record terminal results before declaring completion.

The Cases design harness always runs its behavioral assertions and captures
current screenshots in normal mode. Reference comparison assembly requires
local reference PNGs and prior screenshots; missing inputs are reported as
skipped even with `--comparison`. Existing local comparison images are preserved
and must not be presented as evidence from a run that skipped assembly.

## Release receipt and recovery

Keep exact commit/deployment IDs, URLs, command results and screenshots in the
ignored `uat-results/admin-release-20260930/` receipt directory. Before promotion,
record the verified prior production deployment/SHA there for recovery; it is
not inferred from the checkout or historical documentation. Final terminal
results belong in that receipt. If rollback is
needed, restore the recorded deployment without changing CMS/customer data.
