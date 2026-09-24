# Shared LINE Contact

Local implementation, not a deployment record.

## Ownership

- `src/visitor/line-contact.html` and `.css`: one floating contact disclosure on
  Home and Motor. `runtime.js` owns state, dismissal, focus and dock measurement.
- `src/visitor/line-mark.html`: shared official brand mark, composed by
  `scripts/lib/visitor-source.mjs` into header/menu, heroes, contact CTAs,
  mobile dock, submission states and the floating control.
- Contact and footer retain their existing editable CMS image slots. Migration
  v17 replaces only the exact bundled `assets/brand/line-icon.svg`, preserving
  custom uploads and intentional blanks.
- Official source and usage restrictions: `assets/brand/LINE-ASSET.md`.
- The visitor build emits LINE and submission styles to `assets/visitor/` with
  content-hashed URLs. Both remain source-owned in `src/visitor/`; the source
  check verifies these generated files too. This keeps the shell within its
  existing HTML budget without increasing that budget.

## Behavior And CMS

- Closed initially. Click to open; close button, Escape, outside pointer or
  focus leaving the component close it. Explicit close restores trigger focus.
- Non-modal, no focus trap, auto-popup, fake presence, conversation input,
  third-party chat script, or new storage/cookie requirement.
- Only the CTA opens LINE, in a new tab, with the exact `contact.lineUrl`.
  `contact.lineId`, localized `contact.hours`, and `brand.name` remain CMS-owned.
- Five TH/EN copy fields live in Admin Content under `LINE contact` (Thai label:
  `ปุ่ม LINE ลอย`). Existing intentional blanks are preserved.
- Existing `stickyBar` toggle controls persistent contact affordances: mobile
  dock plus floating LINE. Its Admin label now identifies both surfaces.
- Hidden if LINE URL is absent, in owner/edit/preview mode, while menu or cookie
  settings is open, or when usable viewport space is under 430px (including
  mobile keyboard/expanded consent). Existing inline contact links remain.
- Fixed at the right edge above the measured visitor dock and safe area.
  No new form, consent, destination or analytics logic. Existing delegated
  analytics counts an outgoing LINE link, not opening this disclosure.

## Verification

```bash
npm run build:visitor
npm run check:visitor-source
node scripts/line-contact-check.mjs
npm run check:cms
npm run check:contact
npm run check:contact:browser -- --visual
npm run check:analytics
```

The dedicated browser test covers Home/Motor, TH/EN, 320/390/1440px, fixed
scroll position, dock clearance, keyboard dismissal/focus, preservation of
form entries, CMS copy/hours/destination and disabled/missing-link states.
It blocks external traffic and disables lead/admin writes. Screenshots and
the result report go to `uat-results/line-contact/`.

`node scripts/line-contact-check.mjs --serve` starts the same read-only local
preview. It uses the local transparency fixture when present, defaults
otherwise, not a live production content fetch. It does not send enquiries.
