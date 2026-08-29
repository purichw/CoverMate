# CoverMate Design And Assets

Last updated: 2026-08-29

## Visual Source

The maintained visual source is the production implementation in this repository
plus current product docs and Firestore-backed CMS data. Historical screenshots,
offline prototypes, or downloaded references may be used only when the owner
explicitly supplies them for the current task, and they must be reconciled
against current product decisions before implementation.

Archived/reference inputs that can still inform implementation when explicitly
supplied or reopened by the owner:

- `/Users/point/Downloads/SPEC.md`
- `/Users/point/Downloads/SPEC (1).md`
- `/Users/point/Downloads/SPEC (2).md`
- `/Users/point/Downloads/SPEC (3).md`
- `/Users/point/Downloads/SPEC (4).md`
- `/Users/point/Downloads/SPEC (5).md`
- `/Users/point/Downloads/organic.css`
- screenshots supplied in the Codex thread
- `/Users/point/Downloads/assets/`
- `/Users/point/Downloads/covermate-reference-data-v0.1`

## Offline Prototype Policy

Offline prototype HTML files are archival inputs, not production source of truth.
A file is a valid portable prototype only when all of these are true:

- it opens directly from `file://` without a dev server;
- all required runtime files are embedded or shipped beside the HTML;
- the console has no missing-file errors for `support.js`, `image-slot.js`, or
  `_ds/*/_ds_bundle.js`;
- the visible page never shows raw template markers such as `{{ brandName }}`,
  `{{ n.label }}`, `sc-if`, `sc-for`, `x-dc`, or `[object Object]`;
- public, admin, edit, preview, and relevant route states render after reload.

If an offline prototype fails these checks, fix the prototype/export itself
before using it as evidence. Do not make production emulate a broken prototype.

## Brand Direction

CoverMate should feel like a warm, calm, licensed insurance advisor:

- cream background
- pale green proof/trust areas
- warm orange actions
- deep brown contact/footer areas
- soft rounded panels
- concise advisory copy
- visual spacing that stays calm on mobile

Avoid replacing this with a generic SaaS dashboard, purple/blue gradient theme,
or decorative illustration-first landing page.

## Brand Logos

Committed primary display logo files:

| File | Use |
| --- | --- |
| `assets/brand/covermate-advisory-logo-th.png` | Thai public logo, including the Thai advisory line. |
| `assets/brand/covermate-advisory-logo-en.png` | English public logo and English-only admin chrome. |
| `assets/brand/covermate-footer-logo-th.png` | Thai footer-only logo with a light outline for the dark footer. |
| `assets/brand/covermate-footer-logo-en.png` | English footer-only logo with a light outline for the dark footer. |

The public renderer selects display logos from the active language. Header/admin
chrome use the primary advisory files. Footer uses the footer-only files directly
on the dark footer surface, with no white logo plate/background.
`assets/brand/covermate-wordmark.png` remains a legacy fallback/reference asset,
not the current primary display logo.

## Font Policy

All visible website text must use the Google Sans family across both Thai and
English versions.

Admin chrome/action labels are intentionally English-only so owner controls do
not mix Thai and English. Keep labels like `Main`, `Publish`, `Success`, and
`Log out` in English even when the public site is viewing Thai copy.

This includes:

- visitor site
- motor route/section
- admin login
- Admin Portal
- admin analytics
- inline edit mode
- control panel
- form fields, buttons, tabs, footers, and legal text

The current stack is Google Sans, Google Sans Thai, Noto Sans Thai, then system
fallbacks. Headings, logo text, admin controls, analytics charts, form text,
footer/legal copy, and English UI labels should all stay on that same family.

The current HTML bundles include a historical `covermate-thai-font-policy`
patch. Keep it unless replacing it with equivalent source-level CSS coverage.

`/admin/analytics` is source-authored rather than imported from an offline prototype.
It keeps the CoverMate warm organic palette, rounded owner-tool language,
Google Sans type stack, 44px-class controls, and
responsive admin dashboard density. Its charts should remain quiet
operator-facing data views, not decorative fake metrics.

## Mobile Touch Policy

The current HTML bundles also include `covermate-responsive-touch-policy` in
every surface. On mobile/coarse-pointer contexts it raises controls, form
fields, owner/admin tools, and navigation/footer links to 44px-class touch
targets while leaving desktop density intact.

## Reference Stylesheet

`organic.css` is the project design-system reference
copied from the supplied CSS update.

Use it when extracting source components or rebuilding the exported UI.

## Insurer Logos

Committed insurer logo files:

| File | Notes |
| --- | --- |
| `assets/ins/01-viriyah.png` | Referenced by bundle |
| `assets/ins/02-bangkok.png` | Referenced by bundle |
| `assets/ins/03-tokio-marine.png` | Referenced by bundle |
| `assets/ins/04-allianz.png` | Referenced by bundle |
| `assets/ins/05-deves.png` | Referenced by bundle |
| `assets/ins/06-muang-thai.png` | Referenced by bundle |
| `assets/ins/07-thanachart.png` | Referenced by bundle |
| `assets/ins/08-dhipaya.png` | Referenced by bundle |
| `assets/ins/09-chubb.png` | Referenced by bundle |
| `assets/ins/10-axa.png` | Referenced by bundle |
| `assets/ins/11-msig.png` | Referenced by bundle |
| `assets/ins/12-navakij.png` | Referenced by bundle |
| `assets/ins/13-thaivivat.png` | Referenced by bundle |
| `assets/ins/14-sompo.png` | Referenced by bundle |

The visible grid currently uses 14 committed insurer logos, plus broker/agency
proof cards for AIA and Srikrung Broker supplied by current product reference
data. The renderer is data-driven from `insurers.items[]`; `item.logo` is
preferred and older/stale names resolve through the built-in logo map. The
displayed insurer count must follow the active logo data. With the current
committed logo set, product copy should say `14`; do not add a separate
hard-coded logo count or revive stale higher-count claims.

Relationship-card logo paths in the current product reference:

| Path | Role |
| --- | --- |
| `assets/logos/aia-logo.png` | Life/health representative proof card; committed PNG with transparent background and embedded into the bundle resource map. |
| `assets/logos/srikrung-logo.png` | Motor broker proof card; committed PNG with transparent background and embedded into the bundle resource map. |

Admin media controls manage references and metadata only. Owners can set an
existing `assets/...` path or HTTPS image URL and provide alt text where the CMS
supports it. Direct binary upload, Firebase Storage upload, base64/data-image
storage, drag/drop image processing, and media-library behavior are outside the
approved CoverMate surface until explicitly approved.

## Favicon

`favicon.svg` is the current transparent CoverMate mark browser icon referenced
by page heads. Do not add a colored square, rounded rectangle, or filled
background behind the mark. `favicon.ico` is generated from the same transparent
source so browsers that probe the legacy icon URL do not hit a 404.

## Social And App Icons

The Open Graph/social preview image is:

- `assets/covermate-og.svg` - editable source
- `assets/covermate-og.png` - rendered 1200 x 630 PNG referenced by page
  metadata and JSON-LD

Browser/app icons:

- `assets/apple-touch-icon.png`
- `assets/icon-192.png`
- `assets/icon-512.png`
- `site.webmanifest`

These app icons intentionally use `purpose: "any"` rather than `maskable`
because the CoverMate icon should appear as the logo mark itself, not as a
full-bleed background tile.

When changing these assets, visually inspect `assets/covermate-og.png` so text
does not crop in social previews.

## Logo Animation Contract

The motor-insurance section should show insurer logos in a calm animation area.

Animation requirements:

- never leave the logo strip blank after load
- keep the logo list editable through the Admin Content tab rather than a
  parallel hard-coded grid
- support reduced-motion users gracefully
- avoid layout shift when logos load
- keep logos legible on mobile
- do not blur, darken, crop, or mask logos in a way that makes them hard to read
- keep the relationship proof cards below the animated logo grid visible on
  desktop and mobile

## Screenshot QA

For visual changes, capture at least:

- desktop visitor site
- mobile visitor site
- visitor motor/insurer section
- visitor claim, renewal, fee, and privacy/PDPA sections when those areas
  change
- admin login
- Admin Portal
- admin control panel
- admin inline edit mode
- admin analytics

Use snapshots or contact sheets when comparing against supplied references.
Generated reference extraction/audit artifacts may live locally under `.reference-artifacts/`; that directory should remain ignored so heavy screenshot evidence does not get committed accidentally.
