# CoverMate Production Snapshot Suite - 2026-07-31

This folder contains production visual evidence captured from `https://covermate.vercel.app` for the CoverMate public visitor site and private admin surfaces.

Source baseline:

- Production URL: `https://covermate.vercel.app`
- Production commit at capture time: `97181c7`
- Capture date: 2026-07-31
- Browser: Chromium / Google Chrome
- Image type: JPEG, quality 82

Summary:

- 47 screenshots captured.
- 2 success states intentionally marked missing in `manifest.json` because this run did not submit real production lead data.
- Public long pages use `fullPage: true`.
- Anchor, form, owner drawer, and admin states use viewport/context captures.
- Signed-in admin and owner-hash states use a mocked `covermate-admin-session`; the manifest labels these as `mock-admin-session`.

Primary references:

- `manifest.json` is the source of truth for route, final URL, viewport, auth state, data state, scroll position, full-page flag, and missing-state reasons.
- `public-home-full-desktop.jpg`, `public-home-full-tablet.jpg`, and `public-home-full-mobile.jpg` are the full public-page captures.
- `public-motor-alias-desktop.jpg` and `public-motor-alias-mobile.jpg` prove `/#motor` lands on the `#insurers` section, not a separate page.
- `admin-launcher-*`, `admin-analytics-*`, `owner-edit-*`, and `owner-panel-*` cover private/admin visual states.
