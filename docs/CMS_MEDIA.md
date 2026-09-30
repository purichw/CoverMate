# CMS Images And Cropping

Updated: 2026-09-30. Cloudinary Free remains the selected upload backend.
The full-original upload and shared article/CMS crop flow below is a **local
implementation, not deployment evidence**. The September 21/23 hosted and
inline-entry records remain historical evidence for the previous flow. See
`HANDOFF.md` for the separately verified deployed revision.

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

- The server is configured with:
  `COVERMATE_CLOUDINARY_CLOUD_NAME`, `COVERMATE_CLOUDINARY_API_KEY`, and
  `COVERMATE_CLOUDINARY_API_SECRET`. Keep configuration values out of Git and
  logs. The secret stays server-only; the signed-upload response necessarily
  contains the public cloud name/API key and a scoped signature. No unsigned
  upload preset is required.
- `server/media-provider.cjs` selects `COVERMATE_MEDIA_PROVIDER`, defaulting to
  `cloudinary`. Unknown names fail closed. The registry is an extension point,
  not support for another provider; a future adapter must implement equivalent
  source verification, immutable storage, limits and cost controls.
- Source preparation and crop-output storage check Cloudinary's Admin usage
  endpoint. Uploads fail closed when
  the plan is not Free, usage cannot be read, or shared credits reach 80%.
  This is an upload guard, not a CDN bandwidth cap; existing delivery and other
  projects can continue consuming credits. Do not promise unlimited free use.
- Crop/fit runs locally. Server Sharp normalizes the **output** PNG; the new
  original upload is retained at its native size. No Cloudinary
  transformation, AI add-on or automatic paid-plan upgrade is requested.
- Signed uploads use SHA-256, unique IDs, `overwrite=false` and versioned HTTPS
  delivery URLs. Delivery/recropping uses `res.cloudinary.com`; the new browser
  upload also requires `api.cloudinary.com` in CSP `connect-src`.
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
  do not bound delivery traffic. Source limits and 60 media operations/hour are
  not monthly storage/download limits. Consider optimized outputs without damaging alpha,
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
2. Choose a slot. Selecting a local PNG/JPEG/WebP/SVG checks its size/dimensions,
   then immediately uploads the full original directly to the signed provider
   destination. After server verification, the dialog loads that original and
   displays its dimensions. No CMS image changes at this stage.
   Existing Cloudinary HTTPS URLs and local `assets/...`, `/assets/...`,
   `favicon.svg`/`favicon.ico` paths can be opened directly. A newly entered
   HTTPS URL from another host is imported through Cloudinary, avoiding the
   source host's browser-canvas CORS requirement. The app is not a general URL
   proxy. The raw CMS image URL control also opens this crop flow before apply.
3. Crop by dragging, zooming, or using the keyboard-focusable movement buttons.
   The aspect ratio is locked to the slot. Fit whole image adds transparent
   padding and keeps a logo or QR code intact. Inspect before saving.
4. Use image in draft uploads only the resulting PNG and changes only the
   selected CMS owner. Reopening uses the retained original and native crop
   coordinates, so another crop does not create another original upload.
   Save draft and Publish keep their existing semantics. Cancel leaves the
   CMS reference unchanged, although an already uploaded original may remain
   unreferenced. Clear image removes the optional image reference.

Article cover and body-image controls use the same upload/crop dialog; see
`ARTICLES_PUBLISHING.md`. New images must pass through crop or Fit whole image
before they are applied. Existing content is not automatically migrated.
An existing URL that already points to a resized derivative cannot recreate
pixels discarded before this flow; reselect the original file when necessary.
An old external URL may need reimport if its host blocks canvas access.

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

## Historical Hosted Verification

September 21 protected preview `covermate-nztf447jg-purich-w.vercel.app`:
real UAT-only owner upload returned 201; draft reloaded without altering live;
the original could be opened for a second crop on mobile; Publish changed the
isolated live document and a fresh visitor received the Cloudinary favicon.
The source/output PNGs returned 200. Original UAT states were restored and the
temporary owner deactivated. No production media was changed by this test.
Report: ignored `uat-results/media-hosted/report.json`; backups are private.
Both desktop and mobile crop screenshots were personally inspected.
This used the earlier normalized-source pair upload and does not verify the new
direct-original prepare/complete flow.

## Source Upload Protocol (Local, 2026-09-30)

`src/admin/media-client.js` coordinates these authenticated `/api/media` POSTs:

| Action | Input and result |
| --- | --- |
| `prepare` | `kind: "source"` is optional; accept one declared `{name,type,size}` file or `remoteUrl`. Return `{provider,upload:{url,fields},ticket}` after the usage guard. |
| Browser upload | Send the file or remote URL to the returned signed Cloudinary image endpoint. No resizing/conversion is requested for the original. |
| `complete` | Submit `{ticket,result}`. Verify the HMAC ticket and read the expected asset through Cloudinary's authenticated Admin API; return `{sourceUrl,provider,sourceAsset}` only after validation. |
| `crop` | Accept a normalized PNG, the retained `sourceUrl`, and optional public `sourceAsset`/`crop`; upload only the output and return `{url,sourceUrl,width,height,provider,sourceAsset,crop}`. |

The ten-minute ticket binds actor, server-resolved site, nonce and immutable
source public ID. Completion verifies format, size, dimensions, image/upload
resource type, exact version and delivery URL using trusted provider metadata,
not browser-reported dimensions. File names are not used in public IDs, and
provider filename/display-name fields use generic values.

Remote preparation rejects credentials, non-HTTPS URLs, IP literal hosts,
private host names and non-public DNS results. Cloudinary's signed upload
protocol excludes `file` from its signature, so this application check does not
cryptographically bind the remote URL. Its upload signature validity is also
separate from the ten-minute completion ticket. The source byte/pixel limits
are enforced after trusted confirmation; there is no claimed provider-side
`max_file_size` upload parameter or pre-storage hard cap. A rejected original
can remain in storage without becoming a CMS image.

Compatibility: POST `{image,source}` still accepts the previous normalized PNG
pair and returns the legacy response. That older flow downscaled the retained
source to 2048 px; its saved source URLs remain usable, but their missing native
pixels cannot be restored automatically.

## Data And Security

- Editor source: `src/admin/media-editor.js`, Cropper.js 1.6.2, lazy-loaded only
  after an owner opens it. Build with `npm run build:media`; committed output is
  `admin/media-editor.js` and `admin/cropper.css`.
- CMS media fields remain path/URL strings. `mediaEdits[path]` retains the
  matching `output`, original `source`, provider identifier, optional public
  `sourceAsset: {publicId,version,width,height,bytes,format}`, and native-pixel
  `crop: {mode,x,y,width,height,rotate,scaleX,scaleY,sourceWidth,sourceHeight}`.
  Metadata is retained only while its output matches the current owner URL;
  replacement invalidates stale source associations. No base64 enters Firestore.
- `/api/media` validates revoked/expired Firebase tokens and the current active
  owner allowlist. Advisor, ops, readonly, inactive and unauthenticated users
  cannot upload. UAT-only accounts cannot write production, even with a forged
  UAT query on the production host. Server-resolved environment owns the prefix.
- Cloudinary uses `covermate/cms-media/{siteId}/{uuid}/source` and `/image` public IDs.
  Immutable new objects never overwrite existing assets. Recrops create new
  output IDs while reusing the source ID. Server Sharp decoding and PNG
  re-encoding remove output metadata; full originals may retain embedded data.
  Only public website artwork belongs here, never customer IDs, policies,
  medical records or other sensitive documents.
- Marketing asset download URLs are public bearer links, including draft assets;
  only the CMS draft is unpublished. Do not describe media upload as private.
- New original: <=8,000,000 bytes and <=20,000,000 pixels; no 2048 px source
  downscale. Local files are checked before upload; completion applies the same
  limits to trusted metadata, including imported remote originals. Existing
  direct URL references are reused rather than uploaded/verified as new sources.
- Crop output: <=1,500,000 bytes, <=2048 px per dimension, Sharp decode/re-encode;
  API JSON remains <=4,100,000 bytes. Coordinates are finite and bounded against
  the declared native size. Supplied crop/source metadata is descriptive public
  data, never authorization to read, replace or delete a provider asset.
- Rate limit: 60 media operations per owner/site/hour. Prepare, complete and
  crop each reserve one operation; completion reads the provider Admin API.
  No automatic image deletion or bucket-wide lifecycle policy: retained versions
  may still reference assets.
  Cancellation, a failed request or a rejected original may leave an unreferenced
  immutable object; orphan cleanup requires a separately reviewed inventory
  against live/draft/history references.

## Release Evidence

Follow `HANDOFF.md` for preview/production status. `check:media` exercises active
owner authorization, UAT separation, decoding limits, signed immutable uploads,
trusted URLs, quota/plan rejection and provider failures with isolated adapters.
Hosted evidence must additionally exercise real upload and browser recropping;
local PASS alone does not prove deployed credentials or future zero-cost operation.

Local September 30 backend checks passed with synthetic credentials and injected
provider/identity/storage dependencies: `scripts/media-provider-check.mjs` and
the unchanged `scripts/media-editor-check.mjs`. They cover ticket tampering,
actor/site/expiry isolation, trusted full-size metadata, limits, URL/DNS rejection,
provider/quota failures and output-only recropping. No live provider or CMS write
was made.

Local September 30 browser checks also passed against the real editor/API
validation with isolated Auth, CMS and provider adapters. A 4000 × 2400 original
is uploaded before crop confirmation; native crop/source metadata survives a
real CMS sanitizer and draft reload, and re-cropping uploads only the output.
Cloudinary URL reuse, external URL import, raw CMS URL confirmation/cancel,
failed uploads/retry, stale async cancellation and 390 px layout were exercised.
Desktop and mobile screenshots under `uat-results/inline-media/` were inspected;
`uat-results/media-upload/report.json` records the focused source-upload flow.
This is local evidence; no real Cloudinary upload or production write occurred.

## Checks

```sh
npm run build:media
npm run build:visitor
npm run check:media
node scripts/media-provider-check.mjs
node scripts/media-upload-browser-check.mjs
npm run check:media:inline
npm run check:cms:site:browser -- /path/to/covermate-home-codex-handoff-v1.0
```

Evidence lives under ignored `uat-results/cms-site-audit/`. The browser flow
exercises upload failure/retry, fixed crop dimensions, fit, original-source
recropping, cancel, clear, content-icon rendering, favicon/social references,
draft reload and mobile dialog layout. No production uploads or publishes.
The new focused upload/browser harness writes its own evidence under
`uat-results/media-upload/`; consult the actual generated report for current
results rather than treating these commands as proof they ran.
