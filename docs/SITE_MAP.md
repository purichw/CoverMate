# CoverMate Site Map

Last updated: 2026-08-29

## Routes

| Route | Audience | Purpose | Source |
| --- | --- | --- | --- |
| `/` | Visitor | Main public home page | `index.html` |
| `/motor` | Visitor | Dedicated motor-insurance campaign page for motor-specific ads/search | `index.html`, Vercel rewrite to `/` |
| `/#motor` | Visitor | Legacy alias to the home motor-insurance / insurer section | `index.html` |
| `/#life` | Visitor | Alias to the hero coverage accordion cluster | `index.html` |
| `/#motor-focus` | Visitor | Unexposed motor campaign variant preserved from the legacy reference set | `index.html` |
| `/#life-focus` | Visitor | Unexposed life/health campaign variant preserved from the legacy reference set | `index.html` |
| `/admin/login` | Owner | Admin login gate | `admin/login/index.html` |
| `/admin` | Owner / operations | Post-login Admin Portal Home for Operations, Website content, Analytics, and Settings | `admin/index.html` |
| `/admin/ops` | Owner / operations | Compatibility entry into the same Admin Portal shell, defaulting to Operations | `admin/ops/index.html`, `admin/ops/app.js`, `/api/ops/*` |
| `/#edit` | Owner | Inline text editing mode | `index.html` |
| `/#admin` | Owner | Control panel mode | `index.html` |
| `/#preview` | Owner | Preview mode | `index.html` |
| `/admin/content?page=motor` | Owner | Control panel mode scoped to `/motor` | `index.html`, Vercel rewrite to `/` |
| `/admin/edit?page=motor` | Owner | Inline text editing mode scoped to `/motor` | `index.html`, Vercel rewrite to `/` |
| `/admin/preview?page=motor` | Owner | Draft preview mode scoped to `/motor` | `index.html`, Vercel rewrite to `/` |

## Indexing Map

| URL | Indexing | Canonical |
| --- | --- | --- |
| `/` | `index,follow` | `https://covermate.vercel.app/` |
| `/motor` | `index,follow` | `https://covermate.vercel.app/motor` |
| `/#motor` | Same document as `/`; do not sitemap hash URLs | `https://covermate.vercel.app/` |
| `/#life` | Same document as `/`; do not sitemap hash URLs | `https://covermate.vercel.app/` |
| `/#motor-focus`, `/#life-focus` | Same document as `/`; unexposed campaign hash states, not sitemap URLs | `https://covermate.vercel.app/` |
| `/admin/login` | `noindex,nofollow` | `https://covermate.vercel.app/admin/login/` |
| `/admin` | `noindex,nofollow` | `https://covermate.vercel.app/admin/` |
| `/admin/ops` | `noindex,nofollow` | `https://covermate.vercel.app/admin/ops/` |
| `/#edit`, `/#admin`, `/#preview` | Runtime `noindex,nofollow` owner modes | `https://covermate.vercel.app/` |

SEO implementation details live in [`SEO.md`](SEO.md).

## Visitor Sections

The public home is a single-page landing experience. The product also includes
`/motor`, a dedicated motor-insurance page in the same bundle and brand system.
Exact implementation details live inside the exported bundle, so inspect the
DOM before renaming section IDs or anchors.

Expected visible sections:

| Section | Role |
| --- | --- |
| Hero | Main offer, audience fit, and primary contact CTA. |
| Trust bar | Fast credibility markers such as licensed broker, AIA care, LINE support, and insurer count. |
| Hero coverage accordions | Insurance categories and protection details embedded inside the hero assist-card cluster. The `#cover` anchor lands here; it is not a standalone public band. |
| Policy review | Explains the free policy review offer and what visitors can send in. |
| Fit/calculator | Helps visitors estimate life starting need, health room-reference gap, and critical-illness/recovery buffer from explicit inputs. |
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

## Dedicated Motor Page

`/motor` is the current motor-specific campaign route, not an old hidden hash
variant. It shares Firestore CMS data with Home where appropriate and adds
local page blocks under `motorPage.*`.

Expected visible motor route sections:

| Section | Role |
| --- | --- |
| Motor hero | Motor-only offer, advisor proof card, and LINE CTA. |
| Motor trust bar | Motor-specific credibility chips. |
| Motor coverage accordions | Insurance-category accordion cards for motor-oriented intent. |
| Motor insurers | Shared `insurers.items` 14-logo grid and AIA/Srikrung proof cards. |
| Motor tier comparison | Shared class comparison table/cards. |
| Process/how | Shared consultation workflow. |
| Claim help | Shared accident/claim assistance section. |
| Renewal reminders | Shared renewal reminder form/benefits. |
| Guides | Shared buying guides. |
| FAQ | Shared objections. |
| Contact/footer | Shared contact panel, lead form, and footer. |

## Admin Sections

| Surface | Route | Role |
| --- | --- | --- |
| Login | `/admin/login` | Firebase Google sign-in and Firestore admin allowlist check before creating the browser-local session cache. |
| Admin Portal Home | `/admin` | Unified private gateway for Operations, Website content, Analytics, Settings, public-site exit, and log out. |
| Analytics | `/admin` | First-party admin reporting inside the shared shell. The legacy `/admin/analytics` route may remain reachable for older bookmarks, but new navigation stays in the shell. |
| Operations Portal | `/admin` or `/admin/ops` | Authenticated operations workspace inside the shared shell. Dashboard, Leads, Tasks, and Audit are live through `/api/ops/*`; Customers, Consultations, Quotes, Policies, Renewals, Documents, and Insurers stay hidden until real API contracts exist. The API verifies Firebase admin identity, checks role permissions server-side, and stores supported lead workflow/audit state in the active runtime lead collection. |
| Inline editor | `/#edit` | Tap editable copy directly on the public page. |
| Control panel | `/#admin` | Manage sections, content, brand/chrome, theme/data, export/restore, and publish. |
| Draft preview | `/#preview` | Authenticated draft-only visitor rendering with one preview top bar. |

## Navigation Contracts

Visitor navigation should move through the hero coverage accordions, policy
review, motor insurers, resources/calculator, and FAQ entry points. Claim help,
process, contact, and other content sections remain on the continuous page but
are not all primary header nav items.

`/motor` uses dedicated motor-page navigation with a `Home` link and local
anchors. `/#motor` keeps the same global navigation as `/` and re-aims to
`#insurers` after hydration for backward compatibility. `/#life` behaves the
same way and re-aims to the hero accordion cluster at `#cover`.

`/#motor-focus` and `/#life-focus` render focused campaign variants from the
legacy reference set. They stay unexposed in the header nav and sitemap.

Admin login must land on `/admin` after sign-in.

The `/admin` home actions must stay aligned with the live admin product:

- "Operations" switches to the Operations workspace inside the shared `/admin`
  shell; `/admin/ops` is accepted as a compatibility entry
- "Website content" switches to the Website content module inside the shared
  shell. Its primary action opens `/admin/edit`; the editor dock's `Tools ->
  Panel` command opens the control panel for section order, visibility, brand,
  footer, backup, restore, preview, and publish.
- "Analytics" switches to the Analytics module inside the shared shell
- "Settings" switches to the Settings module inside the shared shell
- "Public site" clears owner markers and opens clean `/`

Inside the Admin Portal shell, unbuilt modules must stay hidden and must not show
fake records, not-wired tables, or browser-local workflow data.

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

The latest historical reference also renders relationship proof cards in the
insurer section. `assets/logos/aia-logo.png` is present as a loose repo file and
embedded in the bundle. `assets/logos/srikrung-logo.png` is present in the
embedded bundle resource map, but is not currently present as a loose repo file.
