# Admin Home: reference-led dashboard

Implemented locally on 2026-09-23. Scope is `/admin#home` and its Home shell
variant. No production publish, deployment, database migration or authorization
change is included.

## Direction and ownership

The user's desktop and mobile Admin Portal mockups are the visual authority.
Preserve their warm cream surfaces, dark olive-brown sidebar, restrained orange
actions, sage status treatments, four equal module cards, welcome band, compact
utility panels and quiet mountain imagery. Keep CoverMate's approved shield-heart
logo artwork and existing Google Sans / Google Sans Thai fonts. Controls use
natural Thai, with established terms such as Admin Portal, CMS, Analytics,
Preview and Publish retained.

| Owner | Responsibility |
| --- | --- |
| `admin/index.html` | Existing authenticated shell and Home-only public-site links/sidebar note |
| `admin/home.css` | Home composition and `body[data-module="home"]` shell variant |
| `admin/home-view.js` | Escaped, presentation-only Home markup |
| `admin/ops/app.js` | Verified session, Home read lifecycle, navigation and existing CMS destinations |
| `admin/ops/cases.js` | Shared Cases menu/notification overlays, guarded list configuration |

Other Admin modules retain their existing presentation. Home reuses the Cases
overlay owner for focus management, Escape, scroll locking and draft guards.
`configureView({search, followUp, scope})` clears conflicting filters, preserves
an unsaved-draft decision, and configures a list before it mounts. A due filter
always uses open cases. Home search and “ดูทั้งหมด” use all cases.

## Product translations from the mockup

- The four module cards navigate to existing Operations, website tools, Analytics
  and Settings modules. CMS shortcuts use `ownerPathForMode` without inventing
  alternative editor routes.
- Home reads `cases/summary` and `cases?scope=all&sort=newest&limit=3` through the
  existing authenticated Operations API. It does not use the capped legacy
  `leads` row count as the canonical case count.
- “Recent activity” becomes **เคสที่รับเข้ามาล่าสุด**, ordered by actual submission
  time. Current APIs do not expose a combined CMS/settings/case audit feed.
  Each row opens the corresponding canonical case.
- The connection badge means the Home case reads succeeded. The verified session
  has its own status. CMS/Analytics rows describe their source, in a neutral style;
  they are not green health checks. No universal “all systems operational” claim.
- “ตรวจสอบ HH:mm” is the actual completion time of the successful Home reads in
  Bangkok time. Failed reads clear the success timestamp and show retry. Loading,
  ready, empty and error states all preserve navigation.
- The notification bell uses the existing notifications endpoint. The mobile
  menu reflects the current module rather than always highlighting Operations.
- “View all actions” is omitted because the four supported actions are already
  visible and no separate action directory exists.

## Responsive composition

- Wide desktop: 256px sidebar, four module columns, then paired utility panels.
- Intermediate desktop: 220px sidebar, two module columns, stacked utilities.
- At 1039px and below: mobile header and hamburger, full-width search, connection
  badge above the heading, two module columns, stacked utilities and account footer.
- At phone widths: welcome quote moves beneath the greeting. Cards retain readable
  text and natural wrapping; decorative artwork never controls card height.
- The recent-case section remains available on mobile even though omitted from
  the illustrative mobile mockup. This is an intentional capability-preserving
  adaptation and makes the mobile page longer.
- The original reference phone artwork includes presentation framing. Comparison
  removes only the outer frame (x125, width690) and labels its CSS scale as inferred.
  The actual 390px browser screenshot is separate responsive evidence.

## Decorative asset

`assets/brand/admin-landscape-v1.webp` is a reusable decorative brand asset, not a
CMS content slot. It is used with CSS masks/crops in the header and encouragement
panel, has no product text, and cannot intercept pointer events. It was generated
with the built-in imagegen tool, then resized to 1600px wide and encoded as WebP.
Existing logo artwork was not generated or recolored.

Final generation prompt:

> Use case: stylized-concept. Asset type: subtle decorative landscape for the
> CoverMate Admin dashboard, to be reused as a wide background behind real HTML
> text. Create one landscape illustration, aspect ratio 3:1, high resolution.
> Quiet premium watercolor on warm ivory paper (#f8f3e9). Very pale sage and warm
> gray rolling mountains layered into the distance, a few softly painted clusters
> of trees at the bottom, a small hazy pale apricot sun near the upper right.
> Main mountains and sun concentrated on the right half; left half almost empty
> warm ivory with a graceful feathered transition. Low contrast, subdued, airy,
> sophisticated Thai insurance advisory brand. Soft organic contours and fine
> paper grain. Muted olive foreground with very light terracotta warmth on a
> distant ridge, no hard lines. Bottom has an ivory mist edge rather than a harsh
> cutoff. No text, no letters, no logo, no frame, no UI, no people, no buildings,
> no saturated colors.

## Verification

`scripts/admin-home-browser-check.mjs` uses an isolated static server, verified
Firebase-session fixture and canonical Cases-contract fixtures. External network
and case mutations are blocked. A notification-read POST is handled only by the
local fixture to exercise the Home-to-case journey. Screenshots show synthetic
data, not live clients.

Checks cover module navigation, canonical counts, CMS route ownership, exact
search transfer, due filtering, recent-case detail, bell/menu Escape and focus,
exact keyboard focus across asynchronous refresh, reload-and-Back to Home,
notification-to-case draft retention, loading/empty/error/retry, local image
decoding, Axe checks and overflow at
320/390/690/1024/1448px. Source SHA-256 hashes and screenshot provenance are saved
in `uat-results/admin-home/report.json`. Existing Cases browser checks also pass
after the shared integration change, including draft retention, save failure,
conflict and responsive detail panels.

Local command:

```sh
CHROME_PATH="$PWD/.tools/playwright-browsers/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium" node scripts/admin-home-browser-check.mjs
```

No whole-site, production-auth, production-data, backend/emulator or release
suite is implied by this Home-only verification.
