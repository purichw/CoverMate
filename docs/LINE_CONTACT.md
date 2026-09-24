# Shared LINE Contact

Current behavior and source ownership. Deployment evidence is recorded
separately in [the September 24 release](RELEASE_SELECT_MOBILE_LINE_20260924.md).

## Ownership

- `src/visitor/line-contact.html` and `.css`: shared floating contact disclosure
  on Home and Motor at widths of at least 768px. `runtime.js` owns state,
  dismissal, focus and dock measurement.
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
- Below 768px, both the floating launcher and its panel are hidden. The existing
  bottom LINE CTA remains; no second mobile chat button is added. Resizing an
  open panel below the breakpoint closes it, so returning to 768px or wider
  does not reopen it automatically. CSS also enforces the mobile exclusion.
- At 768px and wider, the floating control remains subject to the visibility
  conditions below. A tablet may also retain the existing bottom CTA; the
  floating panel clears the measured dock rather than covering it.
- Hidden if LINE URL is absent, in owner/edit/preview mode, while menu or cookie
  settings is open, while the keyboard is detected, or when usable viewport
  space after the dock is under 430px. Existing inline contact links remain.
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

The dedicated browser test covers Home/Motor, TH/EN, mobile absence at
320/390px, desktop behavior at 1440px and closing across the 767/768px boundary.
It also covers fixed scroll position, dock clearance, keyboard dismissal/focus,
preservation of form entries, CMS copy/hours/destination and disabled/missing-link states.
It blocks external traffic and disables lead/admin writes. Screenshots and
the result report go to `uat-results/line-contact/`.

`node scripts/line-contact-check.mjs --serve` starts the same read-only local
preview. It uses the local transparency fixture when present, defaults
otherwise, not a live production content fetch. It does not send enquiries.
