# CoverMate Site Map

Last updated: 2026-08-10

## Routes

| Route | Audience | Purpose | Source |
| --- | --- | --- | --- |
| `/` | Visitor | Main public landing page | `index.html` |
| `/#motor` | Visitor | Alias to the main site's motor-insurance / insurer section | `index.html` |
| `/#life` | Visitor | Alias to the main site's coverage section | `index.html` |
| `/#motor-focus` | Visitor | Unexposed motor campaign variant preserved from the latest reference | `index.html` |
| `/#life-focus` | Visitor | Unexposed life/health campaign variant preserved from the latest reference | `index.html` |
| `/admin/login` | Owner | Admin login gate | `admin/login/index.html` |
| `/admin` | Owner | Post-login "Manage your site" launcher | `admin/index.html` |
| `/admin/analytics` | Owner | Private analytics dashboard for leads and GA4 reporting readiness | `admin/analytics/index.html` |
| `/admin/ops` | Owner / operations | Separate Operations Portal Phase A for authenticated lead intake and workflow planning | `admin/ops/index.html` |
| `/#edit` | Owner | Inline text editing mode | `index.html` |
| `/#admin` | Owner | Control panel mode | `index.html` |
| `/#preview` | Owner | Preview mode | `index.html` |

## Indexing Map

| URL | Indexing | Canonical |
| --- | --- | --- |
| `/` | `index,follow` | `https://covermate.vercel.app/` |
| `/#motor` | Same document as `/`; do not sitemap hash URLs | `https://covermate.vercel.app/` |
| `/#life` | Same document as `/`; do not sitemap hash URLs | `https://covermate.vercel.app/` |
| `/#motor-focus`, `/#life-focus` | Same document as `/`; unexposed campaign hash states, not sitemap URLs | `https://covermate.vercel.app/` |
| `/admin/login` | `noindex,nofollow` | `https://covermate.vercel.app/admin/login/` |
| `/admin` | `noindex,nofollow` | `https://covermate.vercel.app/admin/` |
| `/admin/analytics` | `noindex,nofollow` | `https://covermate.vercel.app/admin/analytics/` |
| `/admin/ops` | `noindex,nofollow` | `https://covermate.vercel.app/admin/ops/` |
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
| Policy review | Explains the free policy review offer and what visitors can send in. |
| Fit/calculator | Helps visitors estimate or choose suitable coverage. |
| Process/how | Explains consultation, information gathering, comparison, and follow-up. |
| Motor insurers | Shows insurer-logo animation, AIA/Srikrung proof cards, and broker/license proof. |
| Motor tier comparison | Explains Class 1, 2+, 2, 3+, and 3 across five coverage axes with desktop table and mobile cards. |
| Claim help | Explains accident/claim assistance and emergency support expectations. |
| Renewal reminders | Lets visitors request renewal reminders without replacing the consultation form. |
| Guides | Educational checklist cards for policy review, comparison, and claim readiness. |
| Claim stories | Customer proof focused on realistic claim/support scenarios. |
| About/license | Brand, owner/broker role, language support, and OIC verification. |
| FAQ | Answers common objections. |
| Fee transparency | Explains broker compensation and how recommendations should stay aligned with visitor needs. |
| Privacy/PDPA | Explains what happens to submitted information and what is not sent to Analytics. |
| Contact/footer | LINE, phone, email, location, form, and legal copy. |

## Admin Sections

| Surface | Route | Role |
| --- | --- | --- |
| Login | `/admin/login` | Firebase Google sign-in and Firestore admin allowlist check before creating the browser-local session cache. |
| Launcher | `/admin` | Choose between editing, arranging, analytics, or viewing the public site. |
| Analytics | `/admin/analytics` | Owner-only Firestore lead reporting plus GA4 Data API/export readiness view. |
| Operations Portal | `/admin/ops` | Authenticated Phase A operations workspace. Reads real `contactLeads/*` for lead intake; customers, policies, renewals, documents, settings, and workflow mutations are marked backend-required until the ops data model and audit API ship. |
| Inline editor | `/#edit` | Tap editable copy directly on the public page. |
| Control panel | `/#admin` | Manage sections, content, brand/chrome, theme/data, export/restore, and publish. |
| Draft preview | `/#preview` | Authenticated draft-only visitor rendering with one preview top bar. |

## Navigation Contracts

Visitor navigation should move through coverage, motor, claim help, calculator,
steps, FAQ, and contact entry points.

`/#motor` keeps the same global navigation as `/` and re-aims to `#insurers`
after hydration. `/#life` behaves the same way and re-aims to `#cover`.

`/#motor-focus` and `/#life-focus` render focused campaign variants from the
latest Claude reference. They stay unexposed in the header nav and sitemap.

Admin login must land on `/admin` after sign-in.

The `/admin` launcher actions must stay aligned with the reference:

- "Edit the words" opens `/#edit`
- "Arrange & customise" opens `/#admin`; the control panel also remains
  reachable from editor mode through `Tools -> Panel`
- "Analytics" opens `/admin/analytics`
- "Public site" opens `/`

Unauthenticated direct access to `/admin`, `/admin/analytics`, `/admin/ops`,
`/#edit`, `/#admin`, and `/#preview` must redirect to `/admin/login`.

`/#preview` renders draft content only after owner authentication. Its top bar
contains `Open editor`, `Public site`, and `Publish`; edit docks, admin drawers,
screen switchers, public reopen controls, and legacy owner markers must not
appear there.

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
