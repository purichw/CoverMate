# CoverMate Design And Assets

Last updated: 2026-07-28

## Visual Source

The current implementation reconciles these supplied references:

- `/Users/point/Downloads/SPEC.md`
- `/Users/point/Downloads/SPEC (1).md`
- `/Users/point/Downloads/organic.css`
- `/Users/point/Downloads/Purich Insurance Site.dc.html`
- `/Users/point/Downloads/export/Admin Login.dc.html`
- `/Users/point/Downloads/export/admin.dc.html`
- `/Users/point/Downloads/Purich Insurance Site (standalone).html`
- screenshots supplied in the Codex thread
- `/Users/point/Downloads/assets/`

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

Thai text everywhere must use Google Sans Thai.

This includes:

- visitor site
- motor route/section
- admin login
- admin launcher
- inline edit mode
- control panel
- form fields, buttons, tabs, footers, and legal text

The current HTML bundles include a `covermate-thai-font-policy` patch. Keep it
unless replacing it with equivalent source-level CSS coverage.

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

The section copy says "26+" insurers. The visible grid currently uses 14
committed insurer logos, plus broker/agency proof cards for AIA and Srikrung
Broker supplied by the latest standalone reference. Do not change the "26+"
claim or logo treatment without reconciling the legal/business copy first.

Relationship-card logo paths in the latest reference:

| Path | Role |
| --- | --- |
| `assets/logos/aia-logo.png` | Life/health representative proof card |
| `assets/logos/srikrung-logo.png` | Motor broker proof card |

## Logo Animation Contract

The motor-insurance section should show insurer logos in a calm animation area.

Animation requirements:

- never leave the logo strip blank after load
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
- admin login
- admin launcher
- admin control panel

Use snapshots or contact sheets when comparing against supplied references.
