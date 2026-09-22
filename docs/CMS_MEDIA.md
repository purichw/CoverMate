# CMS Images And Cropping

Updated: 2026-09-21. Cloudinary Free is the selected upload backend. The owner
authorized the complete production release; see `HANDOFF.md` for current evidence.

## Backend Decision And Cost Boundary

**Owner decision: use Cloudinary Free, not Firebase Storage.**
The requirement to replace/crop all visitor content images through Admin remains.
Firebase Auth, Firestore CMS, semantic media owners and browser cropping are not
being retired. `server/cloudinary.cjs` replaces the Firebase Storage adapter.

Infrastructure readback on September 21:

- Google Cloud reports `billingEnabled: false` with no linked billing account.
  It was already disabled at readback; this task did not perform a downgrade.
- The Firebase Storage API was enabled and empty default bucket
  `covermate-purich.firebasestorage.app` was created in `ASIA-SOUTHEAST3`.
- No files were uploaded by this attempt, and no production CMS media was changed.
- Bangkok is not a Cloud Storage Always Free region. Empty storage is not a
  guarantee of no charges from operations or other billed services. Budget
  alerts and the app's upload rate limit are not spending caps.

Do not re-enable Blaze or delete the unused bucket as routine cleanup. There is
no fallback to Firebase Storage. Auth and Firestore continue on existing paths.

Cloudinary cloud `software-dev-projects` was verified as **Free** with 0.27 of
25 shared credits used (1.08%) before testing. This is a point-in-time account-wide
reading, not a reservation or a guarantee about future traffic. A later
September 21 readback reported 0.08/25 (0.32%), still Free. References:
[Cloudinary](https://cloudinary.com/documentation/billing_and_plans),
[Supabase](https://supabase.com/pricing),
[R2](https://developers.cloudflare.com/r2/pricing/),
[Firebase](https://firebase.google.com/pricing),
[Storage locations](https://firebase.google.com/docs/storage/locations).

## Provider Configuration And Cost Guard

- Vercel Preview and Production use sensitive server-only variables:
  `COVERMATE_CLOUDINARY_CLOUD_NAME`, `COVERMATE_CLOUDINARY_API_KEY`, and
  `COVERMATE_CLOUDINARY_API_SECRET`. Never copy their values into Git, browser
  code, screenshots, docs or logs. No unsigned upload preset is required.
- Each save checks Cloudinary's Admin usage endpoint. Uploads fail closed when
  the plan is not Free, usage cannot be read, or shared credits reach 80%.
  This is an upload guard, not a CDN bandwidth cap; existing delivery and other
  projects can continue consuming credits. Do not promise unlimited free use.
- Crop/fit runs locally. Server Sharp normalizes PNGs; no Cloudinary
  transformation, AI add-on or automatic paid-plan upgrade is requested.
- Signed uploads use SHA-256, unique IDs, `overwrite=false` and versioned HTTPS
  delivery URLs. CSP permits `res.cloudinary.com` for source recropping.
- Free-plan exhaustion can suspend asset delivery. Review account usage and
  retained originals/history before adding more artwork. Never silently upgrade.

## Preserved Acceptance

- Preserve ratio-locked crop/fit, cancel/retry/clear, source recropping, TH/EN
  media owners, explicit blanks, semantic IDs, and draft/live separation.
- Keep owner authorization and server-resolved UAT isolation; provider secrets
  stay server-side. Never allow anonymous unsigned uploads as a shortcut.
- Keep image binaries out of Firestore. Store public artwork only, not customer
  identity, policies or medical records. Draft image URLs may be publicly readable.
- Account for both source and output plus retained versions. Small files alone
  do not bound delivery traffic. Source limits and 60 saves/hour are not monthly
  storage/download limits. Consider optimized outputs without damaging alpha,
  brand typography or the approved logo colors.
- Verify failures do not replace a valid CMS image; hosted upload/recrop and
  draft reload evidence is recorded separately from isolated unit/UI checks.

## Operator Flow

1. In `/admin/edit`, click a visible logo/image (outlined with a small pencil)
   to open its crop/upload dialog. Keyboard users can activate the named
   `Edit image: ...` button. Background artwork has an `Edit background` button.
   The September 23 inline-entry release is tracked in `HANDOFF.md`.
   The existing alternative is Tools > Panel > Brand & contact > Images & crop;
   use it for favicon, social sharing images, absent images and the full inventory.
   The language selector chooses the independent Thai or English logo owner.
2. Choose a slot. Select a local PNG/JPEG/WebP/SVG, or load the current asset
   path/HTTPS URL. Remote sources must permit CORS for browser canvas access;
   otherwise select a local file. There is no unrestricted server URL proxy.
3. Crop by dragging, zooming, or using the keyboard-focusable movement buttons.
   The aspect ratio is locked to the slot. Fit whole image adds transparent
   padding and keeps a logo or QR code intact. Inspect before saving.
4. Use image in draft uploads a new source/output pair and changes only the
   selected CMS owner. Save draft and Publish keep their existing semantics.
   Cancel makes no change; Clear image removes the optional image reference.

The inline buttons use explicit `data-cms-image`/`data-cms-background` owners,
validated against `cmsImageSlots()`. Repeated logos retain their own semantic
IDs even when two owners use the same file or a list is reordered. Controls
exist only in edit mode; preview and visitor routes retain normal links and
disclosures. The overlay leaves public image markup/layout unchanged and
reuses the same owner-authorized upload endpoint, source metadata, conflict
check and draft save path as the panel. It does not bypass Publish.

Local inline-entry verification (2026-09-23): Home/Motor, Thai/English owners,
desktop/mobile, keyboard/cancel focus, background controls, upload failure/retry,
Draft save/reload/source recrop, reordered item IDs and public/preview exclusion
passed with isolated Auth/CMS/storage adapters. No production CMS or Cloudinary
write was made. Evidence: `uat-results/inline-media/report.json` and screenshots.

All public image owners are enumerated by `cmsImageSlots()` in
`covermate-contract.js`: localized Header/Footer, brand mark, advisor logo/photo,
QR, favicon, social preview, licence logos, Home artwork, insurer items/cards,
tier illustrations, testimonial photos and content/calculator icon overrides.
Technical control symbols (menu, close, plus, disclosure, validation status)
remain code-owned. Content icons retain their selected vector icon when a custom
image is absent. Existing image references are not silently replaced or cropped.

## Output Sizes

| Slot | PNG output |
| --- | --- |
| Header / Footer logo | 1200 x 375 |
| Hero artwork | 1800 x 600 |
| Social preview | 1200 x 630 |
| Insurer tile | 416 x 288 |
| Relationship-card logo | 600 x 240 |
| Favicon, mark, QR, photo, content icon, tier illustration | 512 x 512 |

These are export resolutions, not public CSS dimensions. Existing responsive
layout and compact spacing are preserved. Shared images displayed in several
containers use contain-fit; the Home backdrop retains its responsive art crop.
Changing the favicon or social image updates the existing CMS metadata owners.
The `api/page.js` SEO wrapper also reads published media for initial HTML.
See `SEO.md` and `HANDOFF.md` for deployed revision/readback evidence.

## Hosted Verification

September 21 protected preview `covermate-nztf447jg-purich-w.vercel.app`:
real UAT-only owner upload returned 201; draft reloaded without altering live;
the original could be opened for a second crop on mobile; Publish changed the
isolated live document and a fresh visitor received the Cloudinary favicon.
The source/output PNGs returned 200. Original UAT states were restored and the
temporary owner deactivated. No production media was changed by this test.
Report: ignored `uat-results/media-hosted/report.json`; backups are private.
Both desktop and mobile crop screenshots were personally inspected.

## Data And Security

- Editor source: `src/admin/media-editor.js`, Cropper.js 1.6.2, lazy-loaded only
  after an owner opens it. Build with `npm run build:media`; committed output is
  `admin/media-editor.js` and `admin/cropper.css`.
- CMS media fields remain path/URL strings. `mediaEdits[path]` retains only the
  source URL and matching output URL for a subsequent recrop. Replacing the URL
  directly invalidates old crop-source metadata. No base64 enters Firestore.
- `/api/media` validates revoked/expired Firebase tokens and the current active
  owner allowlist. Advisor, ops, readonly, inactive and unauthenticated users
  cannot upload. UAT-only accounts cannot write production, even with a forged
  UAT query on the production host. Server-resolved environment owns the prefix.
- Cloudinary uses `covermate/cms-media/{siteId}/{uuid}/source` and `/image` public IDs.
  Immutable new objects never overwrite existing assets. Server Sharp decoding
  and PNG re-encoding remove metadata. Only public website artwork belongs here,
  never customer IDs, policies, medical records or other sensitive documents.
- Marketing asset download URLs are public bearer links, including draft assets;
  only the CMS draft is unpublished. Do not describe media upload as private.
- Input: 8 MB client file limit, 20 MP decode limit, normalized source <=2048px.
  Server: <=4.1 MB JSON, <=1.5 MB per PNG, <=4.2 MP, <=2048px per dimension.
  Output exceeding the limit fails without changing the current CMS reference.
- Rate limit: 60 image saves per owner/site/hour. No automatic image deletion or
  bucket-wide lifecycle policy: retained versions may still reference assets.
  A failed request may leave an unreferenced immutable object; orphan cleanup
  requires a separately reviewed inventory against live/draft/history references.

## Release Evidence

Follow `HANDOFF.md` for preview/production status. `check:media` exercises active
owner authorization, UAT separation, decoding limits, signed immutable uploads,
trusted URLs, quota/plan rejection and provider failures with isolated adapters.
Hosted evidence must additionally exercise real upload and browser recropping;
local PASS alone does not prove deployed credentials or future zero-cost operation.

## Checks

```sh
npm run build:media
npm run build:visitor
npm run check:media
npm run check:media:inline
npm run check:cms:site:browser -- /path/to/covermate-home-codex-handoff-v1.0
```

Evidence lives under ignored `uat-results/cms-site-audit/`. The browser flow
exercises upload failure/retry, fixed crop dimensions, fit, original-source
recropping, cancel, clear, content-icon rendering, favicon/social references,
draft reload and mobile dialog layout. No production uploads or publishes.
