# CoverMate Site Map

Last updated: 2026-09-24. This map describes source routes. See
[HANDOFF.md](HANDOFF.md) for deployed versus candidate status; route presence
in the working tree is not deployment evidence.

## Routes

| Route | Audience | Purpose | Source |
| --- | --- | --- | --- |
| `/` | Visitor | Compact Home | `src/visitor/home.html`, `home.css`, generated `index.html`; `api/page.js` head wrapper |
| `/motor` | Visitor | Dedicated motor-insurance campaign page for motor-specific ads/search | `src/visitor/template.html`, generated `index.html`; `api/page.js` head wrapper |
| `/#motor` | Visitor | Public Home motor-insurance anchor; same insurer section | `index.html` |
| `/#insurers` | Visitor | Compatibility URL, replaced with `/#motor` without adding history | `index.html` |
| `/#life` | Visitor | Alias to the Home `#cover` section | `index.html` |
| `/#guides` | Visitor | Legacy alias to consolidated `#faq` | `covermate-contract.js`, `src/visitor/runtime.js` |
| `/#motor-focus` | Visitor | Unexposed motor campaign variant preserved from the legacy reference set | `index.html` |
| `/#life-focus` | Visitor | Unexposed life/health campaign variant preserved from the legacy reference set | `index.html` |
| `/admin/login` | Owner | Admin login gate | `admin/login/index.html` |
| `/admin` | Owner / operations | Post-login Admin Portal Home for Operations, Website content, Analytics, and Settings | `admin/index.html` |
| `/admin/ops` | Verified admin; Cases owner-only | Compatibility entry into the same Admin Portal shell, defaulting to Operations | `admin/ops/index.html`, `admin/ops/app.js`, `/api/ops/*` |
| `/#edit`, `/#admin`, `/#preview` | Owner | Session-gated compatibility aliases for editor, panel, preview; do not generate new links | `covermate-contract.js`, `src/visitor/runtime.js` |
| `/admin/content?page=home\|motor` | Owner | Control panel for the selected page | Shared visitor runtime/controller; private boot head via `api/page.js` |
| `/admin/edit?page=home\|motor` | Owner | Inline editor; panel can open without leaving it | Shared visitor runtime/controller; private boot head via `api/page.js` |
| `/admin/preview?page=home\|motor` | Owner | Private draft preview | Shared visitor runtime; private boot head via `api/page.js` |

## Indexing Map

| URL | Indexing | Canonical |
| --- | --- | --- |
| `/` | `index,follow` | `https://covermateinsurance.com/` |
| `/motor` | `index,follow` | `https://covermateinsurance.com/motor` |
| `/?lang=en` | `index,follow` | `https://covermateinsurance.com/?lang=en` |
| `/motor?lang=en` | `index,follow` | `https://covermateinsurance.com/motor?lang=en` |
| `/#motor` | Same document as `/`; do not sitemap hash URLs | `https://covermateinsurance.com/` |
| `/#life` | Same document as `/`; do not sitemap hash URLs | `https://covermateinsurance.com/` |
| `/#motor-focus`, `/#life-focus` | Same document as `/`; unexposed campaign hash states, not sitemap URLs | `https://covermateinsurance.com/` |
| `/admin/login` | `noindex,nofollow` | `https://covermateinsurance.com/admin/login/` |
| `/admin` | `noindex,nofollow` | `https://covermateinsurance.com/admin/` |
| `/admin/ops` | `noindex,nofollow` | `https://covermateinsurance.com/admin/ops/` |
| `/#edit`, `/#admin`, `/#preview` | Runtime `noindex,nofollow` owner modes | `https://covermateinsurance.com/` |

SEO implementation details live in [`SEO.md`](SEO.md).

## Visitor Sections

The public home is a single-page landing experience. The product also includes
`/motor`, a dedicated motor-insurance page in the same bundle and brand system.
Authored templates and runtime live in `src/visitor/`; inspect those sources
and the rendered DOM before renaming section IDs or anchors.

Supported section roles, not a promise that every section is visible: CMS order
and `on` values win. The Home direction is documented in [HOME_REDESIGN.md](HOME_REDESIGN.md).

| Section | Role |
| --- | --- |
| Hero | Main offer, audience fit, and primary contact CTA. |
| Trust bar | Fast credibility markers such as licensed broker, AIA care, LINE support, and insurer count. |
| Coverage | Compact standalone `#cover` grid with expandable category details and matching Admin section controls. |
| Policy review | Explains the free policy review offer and what visitors can send in. |
| Fit/calculator | Home Life/CI/Health planning with explicit blank/unknown states, optional eligibility/PA intake, reviewed sources, and opt-in contact attachment. |
| Process/how | Explains consultation, information gathering, comparison, and follow-up. |
| Motor insurers | Home static logo grid with disclosed AIA/Srikrung relationship proof; Motor retains its own presentation. |
| Motor tier comparison | Home and Motor share three CMS-ID-selected illustrated classes, a desktop class-by-topic table and mobile topic disclosures. Cell statuses and localized remarks are owner-editable. |
| Claim help | Explains accident/claim assistance and emergency support expectations. |
| Renewal reminders | Lets visitors request renewal reminders without replacing the consultation form. |
| Claim stories | Customer proof focused on realistic claim/support scenarios. |
| About/license | Brand, owner/broker role, language support, and OIC verification. |
| FAQ | Common questions plus former Guides items; one public/Admin owner with stable IDs. |
| Fee transparency | Explains broker compensation and how recommendations should stay aligned with visitor needs. |
| Privacy/PDPA | Explains what happens to submitted information and what is not sent to Analytics. |
| Contact/footer | LINE, phone, email, location, form, and legal copy. |

## Dedicated Motor Page

`/motor` is the current motor-specific campaign route, not an old hidden hash
variant. It shares Firestore CMS data with Home where appropriate and adds
local page blocks under `motorPage.*`.

Supported Motor route sections; visibility remains CMS-owned:

| Section | Role |
| --- | --- |
| Motor hero | Motor-only offer, advisor proof card, and LINE CTA. |
| Motor trust bar | Motor-specific credibility chips. |
| Motor coverage accordions | Insurance-category accordion cards for motor-oriented intent. |
| Motor insurers | Shared `insurers.items` 14-logo grid and AIA/Srikrung proof cards. |
| Motor tier comparison | Shared desktop comparison table / mobile topic disclosures. See [Motor comparison](MOTOR_COMPARISON.md). |
| Process/how | Shared consultation workflow. |
| Claim help | Shared accident/claim assistance section. |
| Renewal reminders | Shared renewal reminder form/benefits. |
| FAQ | Shared questions, including migrated Guides. No separate Guides section in v4+. |
| Contact/footer | Shared contact panel, lead form, and footer. |

## Admin Sections

| Surface | Route | Role |
| --- | --- | --- |
| Login | `/admin/login` | Firebase Google sign-in and Firestore admin allowlist check before creating the browser-local session cache. |
| Admin Portal Home | `/admin` | Unified private gateway for Operations, Website content, Analytics, Settings, public-site exit, and log out. |
| Analytics | `/admin` | First-party admin reporting inside the shared shell. The legacy `/admin/analytics` route may remain reachable for older bookmarks, but new navigation stays in the shell. |
| Cases workspace (งานลูกค้า) | `/admin#operations` or compatibility `/admin/ops` | Owner-only case inbox/detail, follow-up, activity, and in-app notifications through `/api/ops/*`. Legacy Dashboard/Leads/Tasks/Audit APIs remain compatibility code, not visible tabs. Planned modules remain hidden. See [ADMIN_CASES_V2.md](ADMIN_CASES_V2.md). |
| Inline editor | `/admin/edit` | Tap editable copy directly on the page; whole-Draft Undo/Redo and owner commands. |
| Control panel | `/admin/content` | Manage sections, content, brand/chrome, media, SEO, theme/data, export/restore, Draft, and Publish. |
| Draft preview | `/admin/preview` | Authenticated draft-only visitor rendering with one preview top bar. |

## Navigation Contracts

Visitor navigation should move through coverage, policy
review, motor insurers, resources/calculator, and FAQ entry points. Claim help,
process, contact, and other content sections remain on the continuous page but
are not all primary header nav items.

`/motor` uses dedicated motor-page navigation with a `Home` link and local
anchors. Home links use `/#motor`, which keeps the global navigation and scrolls
to the unchanged DOM/CMS section ID `insurers`. Old `/#insurers` URLs are replaced
with `/#motor`, preserving query parameters and history position. `/#life`
re-aims to `#cover`. Hidden destinations are not exposed as dead links.
Same-page anchor clicks scroll smoothly once, retain the rendered content and
update browser history. Reduced motion uses an instant landing. Back/Forward,
menu closure and anchor focus must not cause repeated jumps; `#top` only returns
to the top and does not expand any section.

`/#motor-focus` and `/#life-focus` render focused campaign variants from the
legacy reference set. They stay unexposed in the header nav and sitemap.

Admin login must land on `/admin` after sign-in.

The `/admin` home actions must stay aligned with the live admin product:

- `งานลูกค้า` switches to owner-only Cases inside the shared `/admin`
  shell; `/admin/ops` is accepted as a compatibility entry
- `จัดการเว็บไซต์` switches to the content module inside the shared
  shell. Its primary action opens `/admin/edit`; the editor dock's `เครื่องมือ →
  แผงเครื่องมือ` command opens the control panel for section order, visibility, brand,
  footer, backup, restore, preview, and publish.
- `Analytics` switches to the Analytics module inside the shared shell
- `ตั้งค่า` switches to the Settings module inside the shared shell
- `ดูเว็บจริง` opens clean `/` in a new tab and keeps the current Admin tab

Admin chrome is Thai with conventional English terms; the TH/EN selector
changes website content only. See [ADMIN_LANGUAGE.md](ADMIN_LANGUAGE.md).

Inside the Admin Portal shell, unbuilt modules must stay hidden and must not show
fake records, not-wired tables, or browser-local workflow data.

Unauthenticated direct access to `/admin`, `/admin/analytics`, `/admin/ops`,
`/admin/edit`, `/admin/content`, `/admin/preview`, and their legacy owner hashes
must redirect to `/admin/login`.

`/admin/preview` renders draft content only after owner authentication. Its top bar
contains editor, public-site, and Publish actions; edit docks, admin drawers,
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
- `13-aioi.png`
- `14-sompo.png`

The default set uses these numbered filenames. Slot 13 was migrated to Aioi by
the one-time v1 migration of the exact legacy asset; later Admin values win.
Do not impose filenames or count on owner-edited arrays. Update asset references
and relevant checks together when deliberately changing the default set.

The latest historical reference also renders relationship proof cards in the
insurer section. `assets/logos/aia-logo.png` is present as a loose repo file and
embedded in the bundle. `assets/logos/srikrung-logo.png` is present in the
embedded bundle resource map and as a loose repo file.
