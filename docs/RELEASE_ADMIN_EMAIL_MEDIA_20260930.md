# Admin cards, email and original-image uploads — 2026-09-30

The owner authorized push and production deployment of this chat's work only.
Active checkout: `.tools/center-admin-cards`; base/main at scope review:
`5d72b2cc6d6b5815818f928922c02659e56c3c98`. All staged paths must belong to this
chat. Unrelated work in the primary checkout is excluded.

## Included behavior

- Center headings, chips and actions on Admin entry cards.
- Align Admin/customer email copy with the website; use Gregorian years for
  Thai and English. Center reference/hours, use a short LINE action with helper
  copy outside the button, and ship the responsive customer email composition
  and its small decorative assets.
- Device images upload full originals directly through a signed Cloudinary
  request before draft apply. Cloudinary URLs open directly; other public HTTPS
  sources import through the provider. Crop/fit confirmation is shared by all
  editable CMS image slots and article cover/body/paste/drop flows.
- Persist original URLs, bounded source metadata and native crop coordinates;
  re-crop uploads only the derivative. Keep binaries out of CMS/Firestore.
  Original limits are 8 MB and 20 MP, including valid panoramic dimensions.
- Keep the owner/UAT security boundary, immutable assets and Free-plan guard.
  Provider selection is extensible, with Cloudinary the implemented adapter.
- Include source, generated bundles/asset hashes, documentation and focused
  regression checks. CI includes the new media and email cases.

## Required evidence

Local checks cover email templates/rendering/assets, Admin card geometry, media
auth/limits/provider protocol, CMS metadata and reload, article metadata and
paste/drop, mobile crop geometry, source/bundle consistency, types, contracts,
security and performance. Reuse current matching evidence instead of repeating
unrelated whole-site browser suites locally. The repository's complete GitHub
`verify` job (including emulator E2E) remains mandatory for the exact release SHA.

The final shared-contract/lazy-editor extraction passes the unchanged response
size caps: Home 909,793 raw / 234,767 gzip bytes and Motor 909,775 / 234,754.
Local browser timing varied between runs (Home desktop 3,937 ms against 3,500;
Motor mobile 5,639 ms against 4,500). Overall performance is not claimed as a
local PASS. The same performance gate must pass in exact-SHA CI before production
acceptance; no threshold or assertion is relaxed.

Hosted UAT uses the exact preview source and a temporary `uatOnly` owner. The
focused `scripts/media-source-hosted-check.mjs --write-uat --password-auth --url=...` harness
creates one public synthetic original and two crop outputs under the UAT media
prefix. Its apply callback stays local; it does not save/publish CMS or send
emails. UAT state timestamps are compared, and the temporary allowlist/Auth
identity is deactivated/disabled in cleanup. Test images remain immutable.

Before claiming completion verify canonical-domain alias, deployed SHA, changed
bundle/asset hashes, source-upload CSP, unauthorized media rejection and rendered
public assets on desktop/mobile. No production enquiry, email send or content
write is needed. Evidence and exact deployment IDs are written under ignored
`uat-results/admin-email-media-release/`; local completion alone is not release.

## Recovery

Prior production: `dpl_D5Nh8CW6VL9DMJhSUixZ1dttLaAQ`,
`covermate-jxmufaa8v-purich-w.vercel.app`, SHA
`5d72b2cc6d6b5815818f928922c02659e56c3c98`.

Prefer a forward fix. Do not delete originals or restore CMS data as routine
rollback: retained drafts/history may reference uploaded assets. Earlier code
does not retain the new crop metadata consistently; editing/saving with old code
can lose it. Any rollback or data restoration requires explicit authorization.
