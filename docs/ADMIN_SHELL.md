# Shared Admin Shell

Implementation and release preparation, 2026-09-26. See
[release record](RELEASE_ADMIN_SHELL_20260926.md) for deployment status.

## Ownership

The user reported different sidebars on Home, Cases, Content, Analytics and
Settings. All five already used one document, but Home and Cases overrode its
geometry, branding and controls. Module-specific shell overrides are removed.

| Source | Responsibility |
| --- | --- |
| `admin/index.html` | One persistent sidebar, mobile header, topbar and workspace |
| `admin/shell.css` | Chrome dimensions, logo treatment, navigation, account footer and responsive breakpoint |
| `admin/shell.js` | Canonical module list and shared desktop/mobile navigation markup |
| `admin/ops/app.js` | Verified identity, routing, contextual search and role Preview |
| `admin/ops/cases.js` | Existing guarded navigation/notification overlays, focus trap and Escape restoration |
| `admin/home.css`, `admin/ops/cases.css` | Module content only; must not override chrome |

Desktop uses a 256px sidebar and 76px topbar. At widths below 1040px all modules
use the same 68px mobile header and 64px search/notification bar. Sidebar logo,
navigation spacing, selected color and signed-in account placement remain stable
when changing modules. Mobile uses the same canonical navigation, real session
role and logout action. The decorative Home sidebar note is removed so it no
longer pushes the account off-screen.

The real CoverMate logo and Google Sans remain unchanged. Page contents retain
their own layouts; this is not a dashboard, CMS or Cases redesign. There is one
visible notification bell and one public-site link at each breakpoint.

## Preserved Behavior

- Existing hashes, compatibility routes, CMS URLs and public-site destinations.
- Verified session/allowlist and server-side authorization, including owner-only Cases.
- Search/filter behavior, case draft guard, save/error/conflict flows and notifications.
- Role Preview is moved into Settings > roles. It is still UI-only and never
  changes the verified role shown in the account area or server authorization.
- Module connection status is outside the fixed-height topbar. Home and Cases
  retain their own loading/error states; legacy status counts are not substituted
  for canonical Cases counts.

## Verification

Run `node scripts/admin-shell-browser-check.mjs` for all five modules at
320/390/768/1024/1100/1448px, equal computed chrome geometry, asset loading,
active navigation, mobile drawer/focus, role Preview, read-only Cases gating,
API-error navigation and scoped axe checks. It saves source hashes and screenshot
provenance in `uat-results/admin-shell/report.json` and blocks external requests
and all mutations. Fixtures are synthetic, not production data.

Also run `node scripts/admin-home-browser-check.mjs` and
`node scripts/cases-browser-check.mjs` for the existing Home/Cases journeys.
No whole-site, real-login, production-data or backend/emulator coverage is implied.

Local verification completed on September 26: shared-shell browser checks,
Home browser checks, Cases browser checks, Cases contract checks and Admin
loading checks passed in Chromium. Scoped shell/menu and Home axe checks passed.
`git diff --check` and the release typecheck passed. The shared-shell check is
included in `scripts/ci-check.mjs`; deployment requires the exact-SHA CI gate.
