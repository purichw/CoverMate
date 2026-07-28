# CoverMate Project Map

Purpose: make the static CoverMate visitor/admin site easy to navigate, verify,
and safely edit in later sessions.

Current state: this repo is a Vercel-hosted static export. The UI is built from
Claude Design `.dc.html` bundles, with small production patches applied in the
wrapper and embedded bundle strings. There is no backend API in this repo.

## How To Run / Verify

- Local static server: `python3 -m http.server 4177`
- Local smoke: `npm run smoke`
- Production smoke: `COVERMATE_URL=https://covermate.vercel.app npm run smoke`
- Production URL: `https://covermate.vercel.app`
- Vercel project: `covermate`
- GitHub remote: `https://github.com/purichw/CoverMate.git`

`scripts/smoke.mjs` covers desktop/tablet/mobile routes, insurer logos,
horizontal overflow, unauthenticated admin redirects, demo login to `/admin`,
and authenticated admin launcher rendering.

## Document Set

Detailed project documents:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/SITE_MAP.md`](docs/SITE_MAP.md)
- [`docs/INTERACTION_MAP.md`](docs/INTERACTION_MAP.md)
- [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md)
- [`docs/DESIGN_ASSETS.md`](docs/DESIGN_ASSETS.md)
- [`docs/RELEASE_RUNBOOK.md`](docs/RELEASE_RUNBOOK.md)
- [`docs/HANDOFF.md`](docs/HANDOFF.md)

## Top-Level Files

| Path | Purpose / ownership |
| --- | --- |
| `index.html` | Public visitor site and owner hash modes: `#motor`, `#admin`, `#edit`, `#preview`. This is the main bundled site surface. |
| `admin/login/index.html` | Admin login surface. Demo/Google sign-in writes `covermate-admin-session` and redirects to `/admin`. |
| `admin/index.html` | Private admin launcher: "Edit the words" and "Arrange & customise". Has an early session gate that redirects unauthenticated visitors to `/admin/login`. |
| `assets/ins/*.png` | Insurer logo assets used by the `#insurers` section. Current bundle expects `assets/ins/NN-name.png`. |
| `organic.css` | Organic visual token source copied from the supplied CSS reference. Kept for design-system reference and future extraction work. |
| `scripts/smoke.mjs` | Playwright smoke harness with local/runtime Playwright fallback. |
| `vercel.json` | Static Vercel settings, clean URLs, and long-lived cache headers for `/assets/*`. |
| `.image-slots.state.json` | Empty file kept to satisfy the exported image-slot runtime request. |
| `.gitignore` | Ignores `.vercel/` local project config. |

## Routes And Entry Points

```mermaid
flowchart LR
  "Visitor /" --> "Visitor #motor"
  "Visitor /" --> "Owner #edit"
  "Visitor /" --> "Owner #admin"
  "Visitor /" --> "Owner #preview"
  "Admin login /admin/login" --> "Admin launcher /admin"
  "Admin launcher /admin" --> "Owner #edit"
  "Admin launcher /admin" --> "Owner #admin"
```

Route contracts:

- `/` is the public visitor site.
- `/#motor` is the visitor motor-insurance route/anchor.
- `/#admin`, `/#edit`, and `/#preview` are owner modes inside `index.html`.
- `/admin/login` is the owner auth gate.
- `/admin` is the private admin launcher and must remain reachable after login.
- Direct unauthenticated access to `/admin` and owner modes must send the user to
  `/admin/login`.

## Data / Auth / Storage Flow

The current prototype persists all admin/session/site data in browser
`localStorage`. These keys are part of the product contract and must not be
renamed without a migration:

- `covermate-admin-session`
- `purich-live-config-v3`
- `purich-live-text-v3`
- `purich-draft-config-v3`
- `purich-draft-text-v3`
- `purich-history-v3`
- `purich-admin-ever-v7`
- `purich-scrub-copy-v2`
- `purich-site-config-v7`
- `covermate-text-v7`
- `purich-struct-cards-v2`

Important behavior:

- Admin login currently supports demo mode unless a real Google Client ID is
  configured in the bundle props.
- The session expires after 7 days based on the `exp` timestamp in
  `covermate-admin-session`.
- `/admin` reads live brand config from `purich-live-config-v3`.
- Visitor owner modes use the same browser-local draft/live/history store as the
  admin surfaces.

Current limitation: this is not server-backed auth or server-backed CMS
persistence. Treat it as a static/localStorage prototype until a backend is
added.

## Design Source Of Truth

Current implementation source of truth is the committed HTML/CSS in this repo.
Historical inputs used to create the current surfaces:

- Visitor/admin standalone reference:
  `/Users/point/Downloads/Purich Insurance Site (standalone).html`
- Earlier visitor reference: `/Users/point/Downloads/Purich Insurance Site.dc.html`
- Admin references: `/Users/point/Downloads/export/Admin Login.dc.html` and
  `/Users/point/Downloads/export/admin.dc.html`
- Design tokens/reference CSS: `/Users/point/Downloads/organic.css`
- Insurer logos: `/Users/point/Downloads/assets/ins/`
- Specs: `/Users/point/Downloads/SPEC.md`,
  `/Users/point/Downloads/SPEC (1).md`, and
  `/Users/point/Downloads/SPEC (2).md`

Production patches currently preserved in the bundles:

- `covermate-thai-font-policy` enforces `Google Sans Thai` first for body text,
  controls, and admin panel surfaces, with `Google Sans Thai` as heading fallback.
- `#__bundler_thumbnail` and `#__bundler_loading` are hidden to remove the
  exported "Unpacking..." splash.
- Admin login redirects to `/admin`, not directly to `/#admin`.
- Admin launcher has an early `/admin/login` session gate.
- `/#motor` header navigation targets only visible motor-route anchors:
  `#motor-cover`, `#insurers`, `#how`, and `#talk`.

## Asset Map

Current insurer logo files:

- `assets/ins/01-viriyah.png`
- `assets/ins/02-bangkok.png`
- `assets/ins/03-tokio-marine.png`
- `assets/ins/04-allianz.png`
- `assets/ins/05-deves.png`
- `assets/ins/06-muang-thai.png`
- `assets/ins/07-thanachart.png`
- `assets/ins/08-dhipaya.png`
- `assets/ins/09-chubb.png`
- `assets/ins/10-axa.png`
- `assets/ins/11-msig.png`
- `assets/ins/12-navakij.png`
- `assets/ins/13-thaivivat.png`
- `assets/ins/14-sompo.png`

The copy says "26+" insurers. The committed grid currently has 14 logo files,
and the latest standalone adds AIA/Srikrung Broker relationship proof cards in
the same section. Do not change the bundle paths or claim treatment without
updating smoke expectations and getting business-owner copy confirmation.

## Interaction Flows

### Visitor

1. Visitor lands on `/`.
2. Navigation anchors move through coverage, motor, calculator, steps, FAQ, and
   contact sections.
3. Language toggle switches Thai/English copy.
4. Insurer logos render in the motor/insurer section.
5. Contact CTAs link to LINE/tel/email placeholders from the current bundle.
6. The lead form includes enquiry type and coverage selects before the freeform
   detail field.

### Admin

1. Owner opens `/admin/login`.
2. Demo/Google sign-in writes `covermate-admin-session`.
3. Successful sign-in lands on `/admin`.
4. "Edit the words" opens `/#edit`.
5. "Open control panel" opens `/#admin`.
6. The owner panel can reorder/hide sections, edit content/brand/theme data, and
   publish local draft state to live state in the browser.
7. In the insurer section Content tab, the owner can edit relationship proof
   cards as structured card content.

## Do Not Break

- Keep `/admin` as the post-login launcher.
- Keep unauthenticated `/admin`, `/#admin`, `/#edit`, and `/#preview` gated.
- Keep `Google Sans Thai` font policy active across visitor and admin surfaces.
- Keep exported bundle JSON valid. When editing text inside
  `<script type="__bundler/template">`, quotes, newlines, and literal closing
  script tags must be JSON-safe.
- Keep `assets/ins/*` paths stable unless smoke tests and bundle references are
  updated together.
- Keep the localStorage keys listed above stable unless a migration plan exists.
- Keep OIC licence link and licence copy intact unless the business owner
  supplies updated verified text.

## Verification Matrix

| Change type | Minimum verification |
| --- | --- |
| HTML bundle route/auth/content changes | `npm run smoke`, plus targeted Playwright interaction for the changed flow. |
| Visual/font/responsive changes | `npm run smoke`, computed style or screenshot evidence, and desktop/mobile viewport checks. |
| Insurer logo changes | `npm run smoke`, asset 4xx check, count expectation update if needed. |
| Vercel/deploy changes | `vercel deploy --prod --yes`, then `COVERMATE_URL=https://covermate.vercel.app npm run smoke`. |
| Documentation-only changes | `git diff --check`; markdown lint only if the repo later adds one. |

## Relevant Skills

- `$project-onboarding`: read/map repo before broad changes.
- `$docs-cartographer`: update this map when routes, data, deploy, or source
  ownership changes.
- `$claude-to-a-tee`: preserve parity with the Claude Design references.
- `$admin-prototype-reconciliation`: reconcile admin reference behavior with
  visitor/static constraints.
- `$ui-ux-expert`: visual/product UI changes.
- `$mobile-web-qa`: responsive and mobile viewport verification.
- `$release-gate`: pre-push/pre-deploy verification.
- `$production-asset-smoke`: deployed asset/rendering checks.

## Known Risks / Future Work

- Static bundle maintainability: current HTML files are large exported bundles.
  Future source extraction to ordinary components would make edits safer.
- Auth/security: admin auth is browser-local prototype behavior, not real
  backend authorization.
- Persistence: draft/live/history state is local to each browser.
- Asset count: current insurer logo grid is 14 files while copy promises 26+;
  the latest reference supports that claim with relationship proof cards.
- Contact details and legal/licence copy should be checked by the business owner
  before public launch changes.

## Next Session Checklist

1. Read `README.md` and this `PROJECT_MAP.md`.
2. Check `git status --short --branch`.
3. For code/UI changes, inspect the target bundle and avoid unescaped edits inside
   JSON template strings.
4. Run the relevant verification from the matrix.
5. Push to GitHub and deploy to Vercel only when production behavior changes.
