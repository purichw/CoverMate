# CoverMate Design And Assets

Last updated: 2026-08-02

## Visual Source

The current implementation reconciles these supplied references:

- `/Users/point/Downloads/SPEC.md`
- `/Users/point/Downloads/SPEC (1).md`
- `/Users/point/Downloads/organic.css`
- `/Users/point/Downloads/Purich Insurance Site.dc.html`
- `/Users/point/Downloads/export/Admin Login.dc.html`
- `/Users/point/Downloads/export/admin.dc.html`
- `/Users/point/Downloads/Purich Insurance Site (standalone).html`
- `/Users/point/Downloads/CoverMate Standalone.html`
- `/Users/point/Downloads/CoverMate Standalone BUILD SOURCE (do not open).dc.html`
- `/Users/point/Downloads/SPEC (2).md`
- `/Users/point/Downloads/SPEC (3).md`
- `/Users/point/Downloads/SPEC (4).md`
- `/Users/point/Downloads/SPEC (5).md`
- screenshots supplied in the Codex thread
- `/Users/point/Downloads/assets/`

## Standalone / Claude Export Policy

Standalone Claude HTML files are useful as visual references, archival demos,
or Claude Design handoff inputs, but the production repository and this document
set remain the source of truth.

A file is a valid portable standalone only when all of these are true:

- it opens directly from `file://` without a dev server
- all required runtime files are embedded or shipped beside the HTML
- the console has no missing-file errors for `support.js`, `image-slot.js`, or
  `_ds/*/_ds_bundle.js`
- the visible page never shows raw template markers such as `{{ brandName }}`,
  `{{ n.label }}`, `sc-if`, `sc-for`, `x-dc`, or `[object Object]`
- `#admin`, `#edit`, and relevant public hash states render after reload

`/Users/point/Downloads/CoverMate Standalone BUILD SOURCE (do not open).dc.html`
is the runtime-dependent Claude build source. When opened alone from
`/Downloads`, it can show raw `{{ ... }}` placeholders because its sidecar
runtime files are absent. Treat that file as reference source material only.
`/Users/point/Downloads/CoverMate Standalone.html` is the candidate packaged
standalone demo, but it still needs the standalone validation checklist before
being shared as evidence. A 2026-08-02 quick check found no visible raw template
markers in that packaged file, but Chrome still reports a `file://` fetch error
for `.image-slots.state.json`; resolve or explicitly waive that before calling
it fully portable. If a new portable standalone is needed, ask Claude to
compile/export a self-contained HTML or provide a complete folder manifest with
every dependency.

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
- admin launcher
- admin analytics
- inline edit mode
- control panel
- form fields, buttons, tabs, footers, and legal text

The current stack is Google Sans, Google Sans Thai, Noto Sans Thai, then system
fallbacks. Headings, logo text, admin controls, analytics charts, form text,
footer/legal copy, and English UI labels should all stay on that same family.

The current HTML bundles include a historical `covermate-thai-font-policy`
patch. Keep it unless replacing it with equivalent source-level CSS coverage.

`/admin/analytics` is source-authored rather than exported from Claude Design.
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
proof cards for AIA and Srikrung Broker supplied by the latest standalone
reference. The renderer is data-driven from `insurers.items[]`; `item.logo` is
preferred and older/stale names resolve through the built-in logo map. The
2026-08-10 rebuild decision allows `26+` as the Srikrung panel-availability
claim while the grid remains a 14-logo selection; do not add a separate
hard-coded logo count.

Relationship-card logo paths in the latest reference:

| Path | Role |
| --- | --- |
| `assets/logos/aia-logo.png` | Life/health representative proof card; committed PNG with transparent background and embedded into the bundle resource map. |
| `assets/logos/srikrung-logo.png` | Motor broker proof card; currently embedded in the bundle resource map, not present as a loose repo file. |

## Favicon

`favicon.svg` is the current CoverMate shield browser icon referenced by page
heads. `favicon.ico` is also generated from the same source so browsers that
probe the legacy icon URL do not hit a 404.

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
- admin launcher
- admin control panel
- admin inline edit mode
- admin analytics

Use snapshots or contact sheets when comparing against supplied references.
Generated Claude-reference extraction/audit artifacts may live locally under
`.claude-reference/`; that directory is ignored so heavy screenshot evidence
does not get committed accidentally.
