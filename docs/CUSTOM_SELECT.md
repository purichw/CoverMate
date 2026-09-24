# Shared dropdowns

Owners: `src/shared/select.js` and `src/shared/select.css`. Run
`npm run build:visitor` after changes; the generated assets are shared by the
visitor/CMS template and Admin shell. Visitor loads the module near a visible
select; Admin loads it with the shell. Native selects remain the fallback when
JavaScript cannot load.
The generator refreshes content-hashed URLs in the marked Admin asset block as
well as the visitor; do not edit that generated block by hand.

## Contract

- The native single-select owns options, values, name, disabled/required state,
  validation and existing `input`/`change` handlers. No duplicate application state.
- React/DCLogic templates must put the native select inside a stable
  `<span class="cm-select-shell">`. Do not move a React-owned node after render.
  Vanilla Admin selects are wrapped automatically.
- The shared surface supplies a labelled combobox, keyboard navigation,
  typeahead, selected/active/disabled states, focus restoration and a scrolling
  viewport-aware listbox. Escape cancels; Enter/click commits. Tab and outside
  clicks close without committing.
- Call `window.CoverMateSelect?.refresh()` after property-only programmatic
  changes. DOM/option changes, reset and resize are observed. Visitor's existing
  render sweep also refreshes controlled values, localization and layout.
- Multiple-select/listbox controls are intentionally not converted.
- Screens that replace their form asynchronously must preserve the currently
  focused control on every render. Operations captures the active filter before
  replacing its loading/completed list, refreshes its shared dropdown, and
  restores that filter only if the user has not already moved focus elsewhere.

## Contact topics

The seven current IDs are `quote`, `assess`, `review`, `renewal`, `service`,
`claim`, `general`. `quote` now includes plan comparison. Legacy `compare` is
still accepted by intake/analytics and labelled in historic Admin/email records.
CMS version 19 updates previous default labels and seeds new translations;
owner-authored labels and intentional blanks are retained. No live CMS writes
or customer-record rewrites are required.

`node scripts/custom-select-check.mjs` checks the exact topic order, CMS migration,
client/server enums, public keyboard/pointer flows, language changes, error/edit
preservation, calculator/renewal selection, Admin navigation, scoped axe checks,
and component edge cases using local fixtures only. Admin coverage holds a Cases
response until after the loading render, then verifies final focus and the
no-focus-stealing case. `--admin-only` runs that focused regression.
`--serve` starts a read-only
preview (contact submission disabled). `BROWSER=webkit` chooses another installed
Playwright engine. Screenshots/reports are in `uat-results/custom-select/`.
