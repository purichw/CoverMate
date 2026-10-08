# Shared dropdowns

Owners: `src/shared/select.js` and `src/shared/select.css`. Run
`npm run build:visitor` after changes; the generated assets are shared by the
visitor/CMS template and Admin shell. Visitor loads the module near a visible
form control, including text-only CMS panels; Admin loads it with the shell. Native selects remain the fallback when
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
- Selected values and option labels are centered. Trigger insets are symmetric,
  reserving at least 32px on both sides for the chevron; menu options reserve
  36px on both sides for the selected checkmark. Single-select native fallbacks use
  centered text where supported by the browser. The associated field label is
  centered too (`cm-field-label`, derived from native `labels` associations).
  Wrapping labels and separate `for` labels follow the same rule; refresh also
  removes stale markers when associations or input types change. Text-input,
  textarea and file-field names use the same marker so a mixed form has one
  consistent label alignment. Entered text and helper prose retain left
  alignment; checkbox/radio/switch captions are excluded. Article character
  counters remain below their fields so they do not displace centered names.
- Native date/time/month/week pickers share the stylesheet, keeping native
  editing, validation, and calendar behavior. Balanced calendar insets and the
  WebKit date-value rules center both empty and populated fields. Field owners
  still own width, height, font, borders, and state; do not fork date centering
  in Customers, Cases, or Articles.
- The painted native field and overlaid trigger must share their vertical bounds;
  center text and indicators against that visible field, not a taller hit layer.
  Chevron and selected-check indicators use the bundled Lucide icons. Mobile and
  coarse-pointer fields keep a visible minimum height of 44px. Calculator unit
  suffix styles must exclude `.cm-select-shell`.
- Screens that replace their form asynchronously must preserve the currently
  focused control on every render. Operations captures the active filter before
  replacing its loading/completed list, refreshes its shared dropdown, and
  restores that filter only if the user has not already moved focus elsewhere.

## Contact topics

The current order and default translations are owned by `covermate-contract.js`.
Admin Content's `Form choices` group edits `formOptions.query.<id>.th` and `.en`;
the prompt is `formOptions.topicPrompt` (TH: `— เลือกหัวข้อ —`,
EN: `— Select a topic —`). Published owner copy takes precedence over defaults.

| ID | Thai default | English default |
| --- | --- | --- |
| `quote` | ขอใบเสนอราคา / เปรียบเทียบแผน | Request a quote / compare plans |
| `assess` | ประเมินความคุ้มครองที่เหมาะสม | Assess suitable coverage |
| `review` | ตรวจ / ทบทวนกรมธรรม์ที่มีอยู่ | Check / review an existing policy |
| `renewal` | ต่ออายุประกัน | Renew insurance |
| `service` | บริการหลังการขาย / แก้ไขกรมธรรม์ | After-sales service / policy changes |
| `claim` | สอบถาม / ขอความช่วยเหลือเรื่องเคลม | Claims questions / assistance |
| `general` | คำถามทั่วไป / เรื่องอื่น ๆ | General questions / other enquiries |

`quote` includes plan comparison. Legacy `compare` is not an eighth visible
choice, but is still accepted by intake/analytics and labelled in historic
Admin/email records.
CMS version 19 updates previous default labels and seeds new translations;
owner-authored labels and intentional blanks are retained. No live CMS writes
or customer-record rewrites are required.

## Verification

`node scripts/custom-select-check.mjs` checks the exact topic order, CMS migration,
client/server enums, public keyboard/pointer flows, language changes, error/edit
preservation, calculator/renewal selection, Admin navigation, scoped axe checks,
and component edge cases using local fixtures only. Admin coverage holds a Cases
response until after the loading render, then verifies final focus and the
no-focus-stealing case. `--admin-only` runs that focused regression.
`--serve` starts a read-only
preview (contact submission disabled). `BROWSER=webkit` chooses another installed
Playwright engine. Screenshots/reports are in `uat-results/custom-select/`.

`node scripts/select-spacing-check.mjs` checks rendered control insets on the
articles index (TH/EN, 320/390/1440px), CMS list, Editor, contact, calculator,
and renewal controls. The article sort owns its native select styling, including
12px left padding; the shared trigger balances its insets to center the value.
It measures painted/overlay bounds, text and icon centers, edge clearance, mobile
touch height, default filter-label fit, and adjacent Editor toolbar icons. It also
exercises sort selection, open-menu indicators, Escape and restored focus.
`--center-only` scopes the check to
desktop/mobile Articles and CMS controls, including the Cases status dropdown.
Local fixture evidence is in
`uat-results/select-spacing/`; this does not certify production publication.

`node scripts/alignment-browser-check.mjs` covers Customers profile/policy,
Consent and Service editors, Cases date/time entry, Article fields/settings/date
filters, CMS summary cards, and
public contact/calculator/renewal controls at 1440/390/320px. It uses read-only
synthetic data, preserves text-input alignment, exercises empty/filled dates and
dialog Escape, and captures contextual screenshots in `uat-results/alignment/`.
`BROWSER=webkit` checks the 390px native-picker rendering in WebKit;
`--serve` exposes the same synthetic preview without production access.

`node scripts/field-labels-site-check.mjs` checks Home/Motor CMS section fields,
Brand/contact TH/EN and media dialogs at 1440/390px, with outbound requests and
writes blocked. Evidence is in `uat-results/field-labels-site/`.

See [the September 24 release](RELEASE_SELECT_MOBILE_LINE_20260924.md) for the
exact deployed SHA, CI and hosted evidence; local fixtures alone do not prove
production behavior.
