# Local snapshots: Admin/public sync regression

Captured from local `http://127.0.0.1:4177` after fixing owner-mode leakage,
legacy Firestore content normalization, and the admin owner toolbar `Public site`
action.

Files:

- `public-insurers-desktop.png` — public insurer section, desktop, real
  Firestore live hydration, normalized to `26 เจ้า`.
- `public-insurers-mobile.png` — public insurer section, mobile, real Firestore
  live hydration, normalized to `26 เจ้า`.
- `admin-reopen-bar-desktop.png` — signed-in owner reopen bar after closing the
  `/#admin` panel, showing `Public site` with desktop spacing.
- `public-return-after-admin-desktop.png` — visitor route after clicking
  `Public site`; no owner bar or admin marker remains.
- `manifest.json` — capture provenance and DOM state assertions.
