# CoverMate Site Map

Last updated: 2026-07-29

## Routes

| Route | Audience | Purpose | Source |
| --- | --- | --- | --- |
| `/` | Visitor | Main public landing page | `index.html` |
| `/#motor` | Visitor | Alias to the main site's motor-insurance / insurer section | `index.html` |
| `/admin/login` | Owner | Admin login gate | `admin/login/index.html` |
| `/admin` | Owner | Post-login "Manage your site" launcher | `admin/index.html` |
| `/admin/analytics` | Owner | Private analytics dashboard for leads and GA4 reporting readiness | `admin/analytics/index.html` |
| `/#edit` | Owner | Inline text editing mode | `index.html` |
| `/#admin` | Owner | Control panel mode | `index.html` |
| `/#preview` | Owner | Preview mode | `index.html` |

## Indexing Map

| URL | Indexing | Canonical |
| --- | --- | --- |
| `/` | `index,follow` | `https://covermate.vercel.app/` |
| `/#motor` | Same document as `/`; do not sitemap hash URLs | `https://covermate.vercel.app/` |
| `/admin/login` | `noindex,nofollow` | `https://covermate.vercel.app/admin/login/` |
| `/admin` | `noindex,nofollow` | `https://covermate.vercel.app/admin/` |
| `/admin/analytics` | `noindex,nofollow` | `https://covermate.vercel.app/admin/analytics/` |
| `/#edit`, `/#admin`, `/#preview` | Runtime `noindex,nofollow` owner modes | `https://covermate.vercel.app/` |

SEO implementation details live in [`SEO.md`](SEO.md).

## Visitor Sections

The public site is a single-page landing experience. Exact implementation
details live inside the exported bundle, so inspect the DOM before renaming
section IDs or anchors.

Expected visible sections:

| Section | Role |
| --- | --- |
| Hero | Main offer, audience fit, and primary contact CTA. |
| Trust bar | Fast credibility markers such as licensed broker, AIA care, LINE support, and insurer count. |
| Coverage/products | Insurance categories and protection options. |
| Fit/calculator | Helps visitors estimate or choose suitable coverage. |
| Process/how | Explains consultation, information gathering, comparison, and follow-up. |
| Motor insurers | Shows insurer-logo animation, AIA/Srikrung proof cards, and broker/license proof. |
| Testimonials | Customer proof and reassurance. |
| About/license | Brand, owner/broker role, language support, and OIC verification. |
| FAQ | Answers common objections. |
| Contact/footer | LINE, phone, email, location, form, and legal copy. |

## Admin Sections

| Surface | Route | Role |
| --- | --- | --- |
| Login | `/admin/login` | Firebase Google sign-in and Firestore admin allowlist check before creating the browser-local session cache. |
| Launcher | `/admin` | Choose between editing, arranging, analytics, or viewing the public site. |
| Analytics | `/admin/analytics` | Owner-only Firestore lead reporting plus GA4 Data API/export readiness view. |
| Inline editor | `/#edit` | Tap editable copy directly on the public page. |
| Control panel | `/#admin` | Manage sections, content, brand/chrome, theme/data, export/restore, and publish. |

## Navigation Contracts

Visitor navigation should move through coverage, motor, calculator, steps, FAQ,
and contact sections.

`/#motor` currently keeps the same global navigation as `/` and re-aims to
`#insurers` after hydration. The older focused motor variant is preserved in
the bundle behind `ENABLE_MOTOR_VARIANT = false`; do not expose its compact nav
unless a separate `/motor` or campaign route is intentionally restored.

Admin login must land on `/admin` after sign-in.

The `/admin` launcher actions must stay aligned with the reference:

- "Edit the words" opens `/#edit`
- "Arrange & customise" opens `/#admin`
- "Analytics" opens `/admin/analytics`
- "View public site" opens `/`

Unauthenticated direct access to `/admin`, `/admin/analytics`, `/#edit`,
`/#admin`, and `/#preview` must redirect to `/admin/login`.

## Insurer Assets

Insurer logo files live in `assets/ins`.

Current committed files:

- `01-viriyah.png`
- `02-bangkok.png`
- `03-tokio-marine.png`
- `04-allianz.png`
- `05-deves.png`
- `06-muang-thai.png`
- `07-thanachart.png`
- `08-dhipaya.png`
- `09-chubb.png`
- `10-axa.png`
- `11-msig.png`
- `12-navakij.png`
- `13-thaivivat.png`
- `14-sompo.png`

The bundle currently expects these numbered filenames. Do not rename them
without updating bundle references and smoke expectations together.

The latest standalone reference also renders relationship proof cards in the
insurer section. `assets/logos/aia-logo.png` is present as a loose repo file and
embedded in the bundle. `assets/logos/srikrung-logo.png` is present in the
embedded bundle resource map, but is not currently present as a loose repo file.
