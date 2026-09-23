# CoverMate Needs Calculator Contract

Last updated: 2026-09-23

## Home V2 Candidate (Current, Local Only)

The owner approved implementing the research-backed calculator and recommendation
infrastructure on September 23, with actual AIA product names/terms to be supplied
and checked together later. No production publish, database write, push or deploy
is included. The three Home tabs and existing contact consent/submission flow stay
in place; Motor receives no calculator.

### Ownership And Compatibility

- `covermate-calculator.mjs` owns v2 fields, pure formulas, eligibility/PA inputs
  and snapshot validation. Browser and lead API share the exact code. Frozen v1
  validation remains for already-open tabs; v1 arithmetic is not reinterpreted.
- `covermate-recommendations.mjs` owns deterministic eligibility, coverage fit,
  catalog validation and explicit record approval. No product data is seeded.
- `src/visitor/calculator.html` reuses one field renderer for Life, CI, Health and
  the optional planning/PA step. Desktop/mobile/TH/EN use the same models.
- CMS v16 adds missing copy only. Existing translations, blanks, visibility,
  illustrations and owner data survive. No form, consent or routing contract was
  changed. `index.html` is generated with `npm run build:visitor`.

### Calculation Rules

Initial required inputs are blank, not illustrative personal answers. Explicit
`0`, empty (`null`) and `unknown` are distinct. Negative, fractional, malformed,
invalid-duration and unsafe-integer calculations cannot produce a final result.
Amounts above soft review thresholds are not silently capped. Durations are
bounded to 1–60 years/months. Zero monthly spending is valid for debt-only needs.

Life retains the exact 4.8M example from v1. Unknown existing cover produces
`shortfall:null`, `calculationStatus:partial`, and a separately labelled
`provisionalGap` before existing cover. Debt/instalment and asset/income overlap
warnings are explicit. Optional present-value mode uses user-entered integer
inflation/net-return percentages, 0–20, with start-of-year spending:

```text
supportCost = round(sum(netMonthly * 12 * ((1 + inflation)/(1 + return))^year))
              for year = 0 ... supportYears-1
```

These are user scenarios, not forecasts or recommended rates. Simple mode is the
default. Only fractional baht in the final PV total are rounded.

CI adds a separate optional `medicalOOPBuffer`, without reintroducing implicit
medical or transition buffers. Existing cover means the next available qualifying
CI payout, not a lifetime multi-pay total. Health limits never offset CI cash needs.

Health starts with rights/care preference and personal benefit structure. Annual
target is optional. Annual deltas require comparable annual personal cover (or an
explicitly absent policy); itemised/unknown policies remain review-required.
Room gaps are separate daily figures. Public/employer rights stay contextual,
never an invented cash deduction. Even matching dimensions do not establish whole
policy adequacy. Optional expense scenarios explicitly assume deductible, then
co-pay, then remaining eligible limit. They are not cost forecasts or claim quotes.

PA is optional in the planning step, not a fourth tab. Accident death, medical per
episode and recovery-income gaps stay separate and are never added to Life.

### Handoff And Privacy

- Calculations remain local with 275ms debounce, independent tab drafts and
  tab-local reset. No financial/profile fields are sent to analytics or URLs.
- An unchecked opt-in allows only calculator inputs/tab/details/reference ID in
  sessionStorage. Contact/profile/PA intake and attachments are excluded. Without
  opt-in refresh clears entries; storage denial never prevents calculation.
- Main CTA opens optional local eligibility intake. Visitors can skip it and use
  the existing contact form. No request is sent by either calculator CTA.
- Attaching captures an immutable active-tab snapshot plus optional validated
  profile/PA. Unknown results may be attached with their status. Subsequent edits
  do not change the attachment until the visitor attaches again.
- Only checked attachment + existing contact consent + explicit form submission
  send the snapshot. Server recomputes Life/CI/Health/PA and whitelists fields.
  Product rankings/approval claims are not accepted in visitor lead payloads.

### Product And Source Review

CMS > Needs calculator > AIA Product catalog & review edits:

```text
sections.@fit.calculator.productCatalog = {version:'aia-candidates-v1', products:[]}
sections.@fit.calculator.referenceCatalog = []
```

JSON edits validate on explicit save, with errors preserving the draft text.
Saving changed record content invalidates its previous review. Approval requires
a reviewer and complete fields. Approval still only updates the CMS draft;
publishing uses the existing owner workflow. Details/schema are in
`docs/NEEDS_PRODUCT_REVIEW.md`.

Unapproved, changed, expired, unavailable or unauthorized product records never
become automatic candidates. Eligibility is checked before fit. Missing age,
occupation, exact rider/base-plan compatibility, horizon or income-rule data is
not a pass. Budget comparison cannot rewrite need. Insufficient product bands
do not turn into an invented recommendation. Health matches the full annual/room
targets, cost-sharing tolerance and territory/OPD, not just an additive gap.
Itemised product schedules need adviser review; no scalar conversion is invented.

The existing dated room reference remains available with its source/date notice.
Additional hospital records require owner review and validity dates. A selected
record that expires/changes requires reselection; it never silently switches to
another hospital. Real additional sources and real AIA products are intentionally
absent until reviewed, not replaced with mock content.

### Evidence

- `npm run check:needs-v2`: formulas, unknown/blank, PV, health/PA, v1 compatibility,
  source validity, approval invalidation, hard filters and product fit.
- `npm run check:needs-contract`: real runtime + actual lead handler with local
  dependency doubles; consent, opt-out, immutable summaries and recomputation.
- `npm run check:needs`, `check:cms`, `check:types`, `check:contact`.
- `npm run check:calculator-design`: local network-isolated responsive journeys
  and TH/EN screenshots; fake local receipts, never real enquiries.
- `node scripts/admin-structure-browser.mjs --needs`: local in-memory CMS draft,
  validation, approval, changed-record invalidation, reload and mobile evidence.

Research inputs: the owner's three September 23 research reports. The broad
needs-versus-resources methodology was cross-checked with
[ASIC MoneySmart](https://moneysmart.gov.au/how-life-insurance-works/life-insurance-calculator).
Foreign default economic assumptions were not imported. Product benefits, prices,
underwriting rules and Thai legal claims were not inferred from research citations.

## Home V1 Candidate (Historical)

The owner's September 23 pasted v1 behavior spec supersedes the legacy model
documented below. Local only: no deployment or production CMS write this turn.
The owner explicitly approved enabling Home `#fit` at the next deploy. Motor
keeps its original sections and never receives this Home-only calculator.

### Shared Owners

- `covermate-calculator.mjs`: pure field definitions, integer parsing, the three
  models and versioned summary validation. Embedded by the visitor generator;
  the lead API imports the same functions and recomputes results.
- `src/visitor/calculator.html` and `calculator.css`: one shared tab, input,
  result, breakdown and methodology layout. No copied Life/CI/Health forms.
- `src/visitor/runtime.js`: isolated per-tab draft/committed values, 275ms
  debounce, keyboard tab navigation, tab-local reset, help and local attachment.
- `calculatorDesign.*`: TH/EN labels, explanations, statuses, privacy copy,
  optional photo, botanical background and icon overrides. Admin crop uses
  4:3 for the optional photo, 2:3 for botanical art and 1:1 for icons.
- `sections.@fit.calculator.health.selectedRoomReference`: existing CMS room
  amount and provenance. Custom room rates are session inputs, not CMS writes.

### Models

```text
lifeNet = max(0, monthlyNeed - otherMonthlyIncome)
life = max(0, lifeNet * 12 * yearsToSupport + debtToClear
           + extraLumpSum - earmarkedAssets - existingLifeCover)

ciNet = max(0, monthlyRecoveryNeed - otherSupportIncome)
ci = max(0, ciNet * recoveryMonths + extraRecoveryBudget
         - availableEmergencyFunds - existingCriticalIllnessCover)
```

No automatic rounding or implicit transition/medical buffers. The supplied
50,000 / 20,000 / 10-year example with 1M debt, 500K obligations and 300K assets
returns exactly 4.8M. Optional amounts initially equal zero, not the mock's
illustrative balances. Life core examples are 50K/20K/10; CI is 50K/6 months.

Health reviews a selected dated CMS reference or a custom daily rate, existing
room benefit, deductible/co-pay, employer/personal cover and per-episode own-pay
budget. Missing/unknown details show incomplete. A room gap, cost sharing, or no
existing cover prompts further review. The most positive status is specifically
"room benefit matches the reference", never overall policy adequacy. Own-pay
budget is not subtracted from a daily rate. Treatment costs, claims eligibility
and policy payout guarantees are not inferred.

### Interaction And Privacy

- Numeric keypad, comma formatting on blur, integer parsing including Thai
  numerals. Negative amounts become zero; periods are positive whole numbers.
  Optional blanks mean zero; missing core fields withhold a final calculation.
  Extreme valid numbers receive a soft warning, not a hidden cap. Broken formats
  and arithmetic outside safe integer precision do not generate a final result.
- Life/CI state is independent. Tabs retain values; reset affects only that tab.
  Refresh may reset everything. No financial values in local/session storage,
  analytics events, URL, autosave or lead system while calculating.
- CTA prepares an immutable active-tab snapshot and scrolls to existing `#talk`.
  Includes type, language, whitelisted inputs, calculated result, timestamp,
  `/`, source `home_needs_calculator`, and model version. It does not submit.
  Contact details/consent remain untouched. The visitor can uncheck the summary
  attachment; it is omitted from the payload. Later calculator edits never
  silently alter a previously attached snapshot; click CTA again to replace it.
- Only explicit consent plus contact-form submit sends the selected snapshot.
  `covermate-public.mjs` and `api/leads.js` validate it. Server recalculates rather
  than trusting browser-supplied results; existing rate limits/idempotency apply.
- Methodology expands inline with each field's meaning and exclusions. No empty
  advanced accordion, duplicate contact form, new route or modal was added.
- Desktop/tablet use two columns; mobile stacks. Existing botanical artwork is
  reused. The optional family-photo CMS slot is empty rather than inventing a
  family testimonial or adding a paid/generated asset.

### CMS And Release Follow-Up

Schema v13 adds the design fields without replacing existing owner copy, blank
images or visibility choices. Legacy situations, support-year list, transition
cost and CI buffers remain in stored content for compatibility, but are not
used by v1 formulas. Inactive legacy numeric controls are no longer offered as
if they affected the new model. Scenario data remains editable/retained but the
old situation/recommendation UI is not part of Home v1.

The saved live fixture has `fit.on:false` and stale hidden income-multiplier
intro copy. The preview enables fit and uses new canonical intro copy locally.
At the next authorized release, reconcile published intro text conditionally
against that known stale version and enable Home fit as approved. Back up and
update live/draft independently with revision checks; do not publish an unrelated
draft or blindly overwrite owner edits. Production has not been changed here.

### Targeted Evidence

`npm run check:needs`, `check:needs-contract`, `check:calculator-design` cover
the exact models, overflow/blank/invalid/extreme values, shared component/CMS,
tab isolation/reset, explicit attachment/removal, real client serialization and
the actual API handler with local dependency doubles. Browser checks use local
fixtures and fake receipts, not actual lead writes. Chromium covers 1440/820/
390/320px and mobile EN; `BROWSER=webkit` or `BROWSER=firefox` runs mobile TH.
Ignored evidence lives in `uat-results/calculator-design/`.

## Historical Model (Inactive)

Everything below records the previous model for migration/recovery context,
not the current v1 interface or financial formula. Do not restore these hidden
assumptions into v1. The dated hospital reference remains CMS data, not a claim
that its price has been reverified in September.

## Unreleased Admin Parity

Content > Needs calculator > Calculator data & sources now edits bilingual
situation/recommendation copy, hospital/room/note, source URL, date, confidence,
daily reference, support-year options and consumed numeric assumptions. The
support-years slider follows the configured option count. Source URL/note are
rendered rather than merely stored. Absent grade/name do not invent replacements.
The mathematical models below are unchanged. Calculator content icons can also
use cropped uploaded images through Brand & contact > Images & crop.

## Purpose

The visitor `#fit` calculator is an advisory starting point, not a quotation,
policy recommendation, medical-cost guarantee, or affordability gate. It helps a
visitor prepare rough numbers before talking to the adviser.

The current methodology comes from:

- `/Users/point/Downloads/covermate-reference-data-v0.1`
- dataset version: `2026-08-15-v0.1`
- source package: `covermate-reference-data-v0.1`

## Source Of Truth

The calculator payload is stored under the public CMS `fit` section as
`sections[].calculator`.

Firestore remains canonical:

1. If Firestore `states/live` in the active runtime namespace loads
   successfully, its calculator values are used.
2. Runtime normalization fills only missing nested calculator fields from
   `DEFAULT_NEEDS_CALCULATOR`.
3. Existing live/draft Firestore values must prevail over defaults.
4. LocalStorage and embedded defaults are cold-start/offline fallback only.

The shared default and sanitizer live in:

- `/Users/point/CoverMate/covermate-contract.js`

The embedded public bundle currently mirrors the same default so the static site
can render without a remote document, but it must not override loaded database
content.

## Public Inputs

Current public inputs:

| Input | Meaning |
| --- | --- |
| Situation card | Advisory scenario from `fit.calculator.situations`; it does not apply a salary multiplier. |
| Essential monthly spending | Core monthly household spending the visitor wants covered. |
| Support years | Number of years to support dependents or household obligations. |
| Debts and future obligations | Remaining debts and near-future obligations. |
| Liquid assets and existing cover | Earmarked resources that can reduce the gap. |
| Current room benefit | Existing eligible daily room benefit for health-gap context. |
| Recovery period | Number of months of spending to fund for critical illness/recovery. |

Situation cards, icons, short descriptions, and recommendation bullets are part
of the calculator payload under `fit.calculator.situations`. The visitor UI
renders the first enabled/configured situation by default so the output cards
are visible on initial load. Firestore custom situation copy and recommendation
content must prevail over embedded defaults.

## Output Model

### Life Starting Need

Formula:

```text
essential_monthly_household_spending * 12 * support_years
+ outstanding_debts
+ future_obligations
+ transition_final_costs
- earmarked_liquid_assets
- existing_death_benefits
```

Current default `transition_final_costs`: `200,000 THB`.

Guardrails:

- Do not use hospital treatment costs in the core life-sum calculation.
- Do not use arbitrary salary multipliers as the authoritative model.
- Willingness to pay must not reduce calculated need.

### Health Reference Gap

Model:

```text
max(0, selected_hospital_fixed_daily_components - known_eligible_daily_benefit)
```

Current reference:

| Field | Value |
| --- | --- |
| Hospital | BNH Hospital |
| Room type | Regent Adult |
| Fixed daily reference | `10,550 THB/day` |
| Source | `https://www.bnhhospital.com/th/the-bnh-wards/` |
| Last checked | `2026-08-15` |
| Confidence | `A` |

Guardrails:

- Do not output one authoritative required health sum insured.
- Do not call the reference difference the amount the user will definitely pay.
- Show source, last-checked date, and confidence for medical references.
- Do not derive P50/P75/P90 from promotional or package pages.

### Critical Illness / Recovery Buffer

Formula:

```text
essential_monthly_spending * recovery_months
+ one_off_recovery_non_medical_budget
+ chosen_medical_oop_buffer
- earmarked_emergency_assets
- existing_ci_lump_sum_cover
```

Current defaults:

| Field | Value |
| --- | --- |
| Default recovery months | `6` |
| One-off non-medical recovery budget | `100,000 THB` |
| Chosen medical OOP buffer | `250,000 THB` |

Guardrails:

- Recovery period must be explicitly user-selected.
- Do not map a disease name to a fixed critical-illness sum.
- Health treatment scenarios may contextualize the chosen buffer, but must not
  dictate it.

## Admin Sync

Admin and visitor must use the same section payload.

- Inline text edit can change visible labels/copy where the page renders them.
- The control panel should preserve the `fit.calculator` object on draft save,
  publish, export, restore, and version history.
- Any future CMS controls for calculator assumptions must edit the nested
  `fit.calculator` object rather than introducing hard-coded values in the UI.
- Situation-card labels, helper copy, icons, tint, and recommendation bullets
  belong in `fit.calculator.situations`; do not recreate them as separate
  runtime-only constants.
- If the database contains an older `fit` section without `calculator`,
  normalization fills the missing object without overwriting existing copy.

## Verification

Targeted regression:

```bash
npm run check:needs
```

Smoke suite:

```bash
COVERMATE_URL=http://127.0.0.1:4177 npm run smoke
```

The needs regression checks:

- dataset version and BNH reference metadata;
- removal of old salary/dependency multiplier model;
- presence of new visitor inputs;
- data-driven situation cards and first-situation default rendering;
- life, health, and critical-illness formulas;
- Firestore/custom nested calculator values prevailing over defaults.
