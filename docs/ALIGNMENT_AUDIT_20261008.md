# Choice Controls And Summary Alignment

Scope: public site and Admin alignment, not a redesign or production release.
User preference: center all above-field names consistently, choice-control
values/options, native dates, and stat-card content. Preserve ordinary text
entry, helper prose, checkbox/radio captions, and data rows.

## Shared Owners

- `src/shared/select.js` derives centered labels from native label associations;
  observes dynamic fields, changed types and label associations without moving
  framework-owned nodes. Values/events/validation remain native-owned.
- `src/shared/select.css` owns select/menu alignment and native date/time picker
  geometry. The calendar slot has balanced left/right space; no custom calendar.
  Removed the isolated Articles date rules and Customers-only label rule.
- `admin/articles/editor.css` accounts for the adjacent clear-date button so
  the field label centers on the input rather than the entire action row.
- `admin/stat-card.css` already centers Cases, Articles and Analytics. The CMS
  overview now uses this owner too, with balanced padding and centered groups.
- `src/visitor/calculator.css` centers choice-field headings above their fields
  with balanced icon/help slots, and centers the result heading/value. Numeric
  entry and the result breakdown remain aligned for reading and comparison.

Source inventory also covered Home summary/navigation cards (already centered),
standalone Analytics, legacy Operations, article sort, owner CMS templates,
and all Customers field definitions. Navigation/status rows and policy detail
lists are not stat cards and retain their task-appropriate layout.

## Rendered Verification

Local built routes with synthetic fixtures, not production customer data:

- Customers Profile and Policy editor: empty/filled dates, centered labels,
  retained left-aligned text inputs, bilingual open options, dialog Escape.
- Articles: list filters/dates, editor category and publication date/clear action.
- Cases: new-case selects and follow-up date/time; filter focus after rerenders.
- CMS overview, Cases, Articles, Analytics: stat-card layout and no overflow.
- Public Home/Motor contact, calculator and renewal: choice menus, TH/EN, keyboard,
  selection retention, cancel/reset, helper text and scoped accessibility checks.
- Article index TH/EN: sort selection, text/icon geometry and overlay bounds.
- Article writing toolbar: menu geometry, glyph centers and restored focus.

Widths: 1440, 390 and 320 CSS pixels in Chromium. Screenshots are in
`uat-results/alignment/after-chromium/`, `uat-results/select-spacing/`, and
`uat-results/stat-cards/`. Contextual desktop/mobile images were opened and
visually inspected, not just captured. The public contact fixture uses the sage
section theme; fixture state is not published to CMS.

Commands: `npm run check:alignment`, `node scripts/custom-select-check.mjs`,
`node scripts/select-spacing-check.mjs`, `node scripts/stat-card-browser-check.mjs`,
`npm run check:visitor-source`, and `git diff --check`.

## Whole-Site Field-Name Follow-Up

The follow-up applies the same centered name to text, textarea, file, range and
color controls, not just selects/dates. Native `labels` associations remain the
single shared source. Checkbox/radio captions, section headings, helper text and
entered text retain their existing reading alignment. Article counters stay
below fields rather than displacing centered names.

The visitor/CMS loader now detects any nearby form control. Text-only CMS panels
previously did not necessarily load the shared label behavior until a select
became visible. Generated visitor and Article Editor artifacts were rebuilt.

Current follow-up verification:

- `node scripts/alignment-browser-check.mjs`: 51 surface/viewport checks and
  29 captures at 1440/390/320px. Added Consent, Service History, article cover,
  summary, quotation, sources and settings to the existing form coverage.
- `node scripts/field-labels-site-check.mjs`: 76 section/state/viewport checks
  across Home/Motor CMS content, Brand/contact TH/EN, media dialogs, Login and
  legacy Analytics; 6 captures at 1440/390px. Login and legacy Analytics have no
  independent text-entry fields. These counts are states, not distinct pages.
- `node scripts/custom-select-check.mjs`: native association/type changes,
  textarea/text labels, checkbox exclusions, dropdown keyboard/pointer behavior,
  option state, focus and cleanup passed.
- `npm run check:bundles`: source/generated parity, script validation, public
  bundle boundaries and budgets passed.

Customers desktop/mobile, Consent, Service History, article fields/settings,
public contact/calculator, CMS contact and media-dialog captures were personally
opened and inspected. Long text/URLs can scroll inside native inputs; that is
not page overflow. No customer/CMS writes were performed.

The user's `ui-ux-expert` skill now records above-field-name centering separately
from text-entry alignment, including the exceptions above; its validator passed.

## Limits

- WebKit launch was blocked by the missing local Playwright WebKit executable.
  Responsive Chromium screenshots do not certify Safari or physical iPhone UI.
  No native OS calendar popup styling is claimed; it remains platform-owned.
- Standalone/legacy consumers listed in the source inventory were not all opened
  independently. Rendered coverage focuses on active shared owners and variants.
- No backend/emulator suite, full CI, commit, push, deploy, real data writes,
  document-storage activation, or billing changes in this pass.
