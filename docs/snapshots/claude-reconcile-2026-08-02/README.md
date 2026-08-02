# Claude Reconciliation Snapshot Set

Captured: 2026-08-02

Purpose: compare the latest Claude standalone reference with the real CoverMate
production product so future Claude Design exports preserve accepted production
decisions.

## Inputs

- Reference HTML:
  `/Users/point/Downloads/CoverMate Standalone (1).html`
- Reference SHA-256:
  `0bae1f0b89b43bf4836ae4ce81d3d3047cd6a256cc846baaee2679cfda853b73`
- Production URL:
  `https://covermate.vercel.app`
- Reconciliation doc:
  `/Users/point/CoverMate/docs/CLAUDE_DESIGN_RECONCILIATION.md`

## Key Images

- `comparison-public-desktop.png`: reference public desktop beside production
  public desktop.
- `comparison-public-mobile.png`: reference public mobile beside production
  public mobile.
- `comparison-admin-login.png`: reference demo login beside production Firebase
  login.
- `comparison-admin-analytics.png`: reference analytics beside production
  analytics.

## Read Before Reusing

The reference render has no visible raw `{{ ... }}` template markers and no
settled `Unpacking...` state, but it still logs a missing
`.image-slots.state.json` fetch when opened from `file://`. Treat the reference
as visual evidence, not production source of truth.

Production/product decisions remain authoritative for Firebase Auth, Firestore
live/draft publishing, admin labels, public/admin chrome separation, Analytics
privacy, SEO, and Google Sans typography.
