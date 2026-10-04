# Owner Tools Panel - 2026-10-04

## Scope And Design

- Follow the supplied dark desktop / light mobile Admin Panel mock. Retain the
  actual bottom tools trigger and existing page selector, editor routes, and data ownership.
- Desktop uses two columns: current page, Draft status and editing actions on the
  left; actual navigation and separated logout on the right. Mobile uses a light,
  single-column panel with internal scrolling above the persistent editor dock.
- Keep Preview, Save draft, Publish, Reset draft, the control panel, Admin, and
  public-site navigation. Do not invent users, categories, system data or settings.
- Preserve Save/Publish/Reset confirmations and the distinction between website
  drafts and independently managed articles.

## Shared Logout

`admin/sign-out-confirm.js` owns the accessible native confirmation dialog.
`admin/session.js` owns the confirmation-before-cleanup sequence and waits for
Firebase sign-out before navigating. The portal, Analytics, website editor tools
and footer, and login account switch consume this helper. Automatic authorization
failure cleanup is intentionally not an interactive logout.

Cancel and Escape retain the session and restore focus. Portal article/case
unsaved-change guards run after logout confirmation, before cleanup. Repeated
requests share one pending dialog and sign-out operation.

## Verification

Passed:

- `npm run build:visitor`
- `npm run check:visitor-source`
- `npm run check:contracts`
- `npm run check:bundles`
- `node scripts/admin-account-check.mjs`
- `node scripts/admin-owner-panel-check.mjs`

Browser checks use synthetic authentication and blocked external writes. They
exercise desktop grouping, Save/Reset cancellation, Escape and focus restoration,
390px and 320px mobile overflow/scrolling, logout cancel/confirm, editor footer,
login account switch, and portal unsaved-change guards. Analytics consumes the
same helper but its standalone page was not separately browser-tested this pass.

Personally reviewed current screenshots at desktop 1440x1000 and mobile 390/320x844,
including the logout dialog. Evidence and viewport/route provenance are under
`uat-results/admin-owner-panel/` and `uat-results/admin-account/` (ignored artifacts).
The reference comparison uses labeled, uniformly scaled contextual crops; it is
an adaptation, not a pixel-perfect claim. Mobile retains Reset draft, which is not
shown in the mock, so its complete menu can require scrolling.

No production mutation, emulator suite, full-site audit, commit, push or deploy was
performed for this change. Existing Article Editor work was preserved.
