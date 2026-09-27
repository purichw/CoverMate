# Shared Admin Shell

Original shell implementation and release preparation: 2026-09-26. The
2026-09-28 Settings removal below supersedes its navigation and Role Preview
scope. The [September 26 release record](RELEASE_ADMIN_SHELL_20260926.md) is
historical; `HANDOFF.md` and subsequent release records own deployment status.

## Ownership

The original consolidation addressed different sidebars on Home, Cases,
Content, Analytics and the former Settings module. They shared one document,
but Home and Cases overrode its geometry, branding and controls.
Module-specific shell overrides are removed.

| Source | Responsibility |
| --- | --- |
| `admin/index.html` | One persistent sidebar, mobile header, topbar and workspace |
| `admin/shell.css` | Chrome dimensions, logo treatment, navigation, account footer and responsive breakpoint |
| `admin/shell.js` | Canonical module list and shared desktop/mobile navigation markup |
| `admin/ops/app.js` | Verified identity, routing and contextual search |
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

## Single-owner navigation update — 2026-09-28

The user removed the Settings page for the current single-owner workflow.
Settings is absent from desktop navigation, the mobile menu and Home module
cards. Home now has three primary cards: Operations, website content and
Analytics. Legacy `#settings` links return to Home. The UI-only Role Preview
control is removed; the account area continues to show the verified role.

Notification settings remain available through the bell →
**ตั้งค่าการแจ้งเตือน**, including system-inbox status and the existing test-email
action. Removing Settings does not remove this notification panel or change
its delivery behavior.

## Preserved Behavior

- Existing CMS URLs and public-site destinations; legacy Settings hashes resolve
  to Home instead of opening a removed page.
- Verified session/allowlist and server-side authorization, including owner-only Cases.
- Search/filter behavior, case draft guard, save/error/conflict flows and notifications.
- Backend role normalization, permission checks, active-admin allowlist,
  Firestore Rules and UAT isolation remain. Current Cases and notification APIs
  are owner-only. Retaining the role infrastructure does not claim a complete
  multi-admin workflow or provide a role-management UI.
- Module connection status is outside the fixed-height topbar. Home and Cases
  retain their own loading/error states; legacy status counts are not substituted
  for canonical Cases counts.

## Verification

Run `node scripts/admin-shell-browser-check.mjs` for the retained modules at
320/390/768/1024/1100/1448px, equal computed chrome geometry, asset loading,
active navigation, mobile drawer/focus, removed Settings/Role Preview entry
points, legacy Settings fallback, read-only Cases gating,
API-error navigation and scoped axe checks. It saves source hashes and screenshot
provenance in `uat-results/admin-shell/report.json` and blocks external requests
and all mutations. Fixtures are synthetic, not production data.

Also run `node scripts/admin-home-browser-check.mjs` and
`node scripts/cases-browser-check.mjs` for the existing Home/Cases journeys.
No whole-site, real-login, production-data or backend/emulator coverage is implied.

Historical local verification completed on September 26: shared-shell browser checks,
Home browser checks, Cases browser checks, Cases contract checks and Admin
loading checks passed in Chromium. Scoped shell/menu and Home axe checks passed.
`git diff --check` and the release typecheck passed. The shared-shell check is
included in `scripts/ci-check.mjs`; deployment requires the exact-SHA CI gate.
Those results predate the Settings removal and do not verify or establish
deployment of the September 28 change.

Local verification for the September 28 removal: shared-shell and Home browser
checks passed with synthetic fixtures, including the retired Settings fallback,
three Home cards, responsive navigation and retained read-only restrictions.
Contract regression, service-boundary permissions, generated visitor bundle
parity, JavaScript syntax and `git diff --check` also passed. Desktop Home and
mobile Home/menu screenshots were inspected. Full-site, emulator and production
checks were not rerun for this scoped UI removal; it has not been pushed or deployed.
