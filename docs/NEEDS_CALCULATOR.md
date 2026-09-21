# CoverMate Needs Calculator Contract

Last updated: 2026-09-21

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
