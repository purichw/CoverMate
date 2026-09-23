# CoverMate Production Snapshot Suite

Use the full matrix when the user requests a complete archive/handoff or an audit
where all screens matter. A narrow release needs evidence for its touched risks,
not this entire matrix. Personally inspect captures before claiming visual parity.

## Snapshot Types

Ad-hoc evidence:

- Use for one narrow bug, one component, or one interaction state.
- Save under the project's ignored `uat-results/` or a clearly labeled temporary directory.
- Label it as partial evidence.
- Include URL, route/hash, viewport, auth/data state, scroll position, and whether the screenshot is `fullPage`.

Complete production suite:

- Use for an explicitly complete full-site visual archive or design handoff.
- Capture the full matrix below.
- Save into a stable timestamped directory, for example `/tmp/covermate-production-snapshots-YYYYMMDD-HHMMSS/`.
- Write `manifest.json` with every screenshot path and provenance.
- If a route/state is unavailable, include it in `manifest.json` as `status: "missing"` with a reason.

## Stabilization Rules

Before every capture:

1. Navigate to the intended URL, not a reused tab with unknown state.
2. Wait for `domcontentloaded`.
3. Wait for `document.fonts.ready`.
4. Wait for the surface's actual hydrated/data state. Firestore listeners may keep the network active; network idle alone is not readiness.
5. Ensure fonts and relevant images have settled, and metrics are numbers or a genuine explicit empty/error state rather than pending dashes.
6. Disable non-essential animations for deterministic review when the task is not motion-specific.
7. Record console errors and failed network requests in the manifest.

For Firestore-backed pages, record whether content came from live Firestore, cached fallback, or unavailable data if the app exposes that signal. If it does not expose a signal, record that the data source is inferred from the route/session only.

## Viewports

Use these as the default matrix:

| Name | Size | Use |
| --- | --- | --- |
| desktop | `1440x900` | Primary design/release view |
| tablet | `834x1112` | Mid-width layout |
| mobile | `390x844` | iPhone-class mobile |

Use device scale factor `1` unless a pixel-density issue is the subject.

## Public Visitor Matrix

Capture these in Thai:

| ID | URL | Viewports | Mode |
| --- | --- | --- | --- |
| `public-home-full` | `/` | desktop, tablet, mobile | `fullPage: true` |
| `public-motor-full` | `/motor` | desktop, tablet, mobile | `fullPage: true` |
| `public-motor-hero` | `/motor` | desktop, mobile | viewport/context |
| `public-cover-anchor` | `/#cover` | desktop, mobile | viewport/context |
| `public-fit-anchor` | `/#fit` | desktop, mobile | viewport/context |
| `public-insurers-anchor` | `/#insurers` | desktop, mobile | viewport/context |
| `public-motor-alias` | `/#motor` | desktop, mobile | viewport/context + behavior proof |
| `public-claim-anchor` | `/#claim` | desktop, mobile | viewport/context |
| `public-talk-anchor` | `/#talk` | desktop, mobile | viewport/context |

For `public-motor-full`, prove that the route is the dedicated motor page with:

- requested URL `/motor`;
- canonical `https://covermateinsurance.com/motor`;
- local motor-page nav including `Home`;
- CMS-enabled sections among `motor`, `motor-trust`, `motor-cover`, `insurers`,
  `tiers`, `how`, `claim`, `renew`, `faq` and `talk`. Guides now belong to FAQ;
  do not force disabled sections visible merely for a screenshot.

For `public-motor-alias`, prove the backward-compatible home alias contract with behavior evidence:

- requested URL;
- final URL/hash after app handling;
- `scrollY`;
- bounding rect or visible heading for `#insurers`;
- screenshot of the resulting viewport.

Capture English when the task affects copy, typography, nav labels, language switching, or SEO/translation:

| ID | URL | Viewports | Mode |
| --- | --- | --- | --- |
| `public-home-en-full` | `/` after switching to EN | desktop, mobile | `fullPage: true` |
| `public-nav-en` | `/` after switching to EN | desktop, mobile | viewport/context |

## Public Form And Interaction States

Capture these when the task touches forms, analytics, validation, or conversion:

| ID | State | Viewports | Evidence |
| --- | --- | --- | --- |
| `contact-empty` | Contact form untouched | desktop, mobile | viewport/context |
| `contact-validation` | Required fields missing/invalid | desktop, mobile | screenshot + validation text |
| `contact-success-or-safe-mock` | Successful submit or mocked success state | desktop, mobile | screenshot + no PII in analytics |
| `renew-empty` | Renewal form untouched | desktop, mobile | viewport/context |
| `renew-validation` | Required fields missing/invalid | desktop, mobile | screenshot + validation text |

Never submit real personal data to production just to obtain a screenshot. Use an allowed test account/test payload only when the owner explicitly authorizes it.

## Admin Matrix

Signed-out:

| ID | URL | Viewports | Mode |
| --- | --- | --- | --- |
| `admin-login` | `/admin/login` | desktop, mobile | viewport/context |
| `admin-redirect` | `/admin` without session | desktop, mobile | behavior proof to login |

Signed-in/admin session:

| ID | URL | Viewports | Mode |
| --- | --- | --- | --- |
| `admin-launcher` | `/admin` | desktop, tablet, mobile | viewport/context |
| `admin-cases` | `/admin#operations` | desktop, mobile | list/search/filter state with settled summary |
| `admin-case-detail` | `/admin#operations` with synthetic case | desktop, mobile | detail drawer and reachable Save |
| `admin-case-conflict` | real or labeled fixture conflict | desktop, mobile when touched | retained draft and visible conflict/reload message |
| `admin-analytics` | `/admin/analytics` | desktop, mobile | `fullPage: true` if long |
| `owner-edit` | `/#edit` | desktop, mobile | viewport/context |
| `owner-panel-sections` | `/#admin` Sections tab | desktop, mobile | viewport/context |
| `owner-panel-content` | `/#admin` Content tab | desktop | viewport/context |
| `owner-panel-brand` | `/#admin` Brand & chrome tab | desktop | viewport/context |
| `owner-panel-theme` | `/#admin` Theme & data tab | desktop | viewport/context |
| `owner-panel-closed-reopen` | close the `/#admin` drawer | desktop, mobile | screenshot + reopen/Main controls |
| `owner-preview` | `/#preview` | desktop, mobile | viewport/context |
| `owner-history` | `/admin/edit` or `/admin/content` | desktop, mobile when touched | Undo/Redo state and Reset confirmation/recovery |

Use `docs/ADMIN_LANGUAGE.md` for current Thai controls and familiar English
workflow terms; older screenshots are not authority for English-only Admin.
Cases requires an owner identity. Use clearly synthetic UAT records and filter
captures to those records; do not expose customer details in shared evidence.
Scroll the drawer so the state named in the evidence (such as a conflict
message) is actually visible. Label body/detail scroll positions separately.

Use a real admin session for production release evidence when available. If using a mocked localStorage session to bypass the gate, label it clearly as `authState: "mock-admin-session"` in the manifest and do not call it a real login flow.

## Manifest Contract

Create `manifest.json` in the snapshot directory:

```json
{
  "site": "CoverMate",
  "capturedAt": "2026-07-31T00:00:00.000Z",
  "baseUrl": "https://covermateinsurance.com",
  "commit": "97181c7",
  "browser": "chromium",
  "notes": [],
  "captures": [
    {
      "id": "public-home-full",
      "path": "/tmp/covermate-production-snapshots-YYYYMMDD-HHMMSS/public-home-full-desktop.png",
      "requestedUrl": "https://covermateinsurance.com/",
      "finalUrl": "https://covermateinsurance.com/",
      "viewport": { "name": "desktop", "width": 1440, "height": 900 },
      "fullPage": true,
      "authState": "signed-out",
      "language": "th",
      "dataState": "production-live-or-unverified",
      "scrollY": 0,
      "status": "captured"
    }
  ]
}
```

Required per capture:

- `id`
- absolute `path`
- `requestedUrl`
- `finalUrl`
- viewport name/width/height
- `fullPage`
- `authState`
- language
- data state
- scroll position for viewport captures
- `status`
- errors or warnings when present

## Rejection Criteria

Reject the suite as incomplete if:

- it only captures first viewports of long pages;
- desktop/mobile/tablet are mixed inconsistently without labels;
- admin signed-out and signed-in states are mixed without auth labels;
- `/#edit`, `/#admin`, `/admin`, or `/admin/analytics` are missing when admin is in scope;
- `/#motor` is missing when public nav/routing is in scope;
- screenshots show pre-hydrated/loading/template states;
- no manifest exists;
- the final response lists paths but does not state what was captured and what is missing.
