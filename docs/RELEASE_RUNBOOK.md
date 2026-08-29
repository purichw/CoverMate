# CoverMate Release Runbook

Last updated: 2026-08-29

## Production

Production URL:

[https://covermate.vercel.app](https://covermate.vercel.app)

Vercel project:

`covermate`

GitHub remote:

`https://github.com/purichw/CoverMate.git`

Production can lag behind this local workspace while the release guardrail is
active. Treat production claims as deployed-state checks, not proof that local
uncommitted changes are live.

## Release Permission Guardrail

Do not commit, push, or deploy until the user explicitly says to do so in the
current task. Local fixes, local verification, screenshots, and documentation
updates are allowed while this guardrail is active, but GitHub and Vercel must
stay untouched until the user gives a direct release instruction.

## Local Verification

Install dependencies:

```bash
npm install
```

Run a local static server:

```bash
python3 -m http.server 4177
```

Run smoke checks against local:

```bash
npm run check:bundles
npm run check:needs
npm run smoke:admin-builder
COVERMATE_URL=http://127.0.0.1:4177 npm run smoke
```

`npm run smoke` defaults to `http://localhost:4177`.
`npm run smoke:admin-builder` runs only the dedicated Admin builder flow for
section structure, embedded hero coverage accordions, relationship cards,
insurer logo items, and tier rows/columns.

## Production Smoke

After production deployment:

```bash
COVERMATE_URL=https://covermate.vercel.app npm run smoke
```

Minimum checks:

- `/` loads public visitor site
- first paint does not show exported placeholder UI or raw `<x-dc>` template
  content
- no visible raw template markers such as `{{ brandName }}`,
  `{{ n.label }}`, `sc-if`, or `sc-for` appear after hydration
- no rendered `[object Object]` placeholder text appears on visitor or admin
  surfaces
- insurer logos render from editable insurer items, including background-image
  logo tiles
- insurer relationship proof cards render
- motor tier comparison renders as a desktop table and mobile stacked cards
- policy review, claim help, renewal reminders, guides, fee transparency, and
  privacy/PDPA sections render when present in the live schema
- contact form enquiry-type and coverage selects render
- renewal reminder form renders, validates required contact, and writes only
  through the shared Firestore lead path
- contact form lead-submit code is present and does not send personal contact
  details to GA event parameters
- `/#motor` keeps the same global navbar as `/`, does not expose the hidden
  motor-variant nav, includes the current `#review`, `#insurers`, `#fit`, and
  `#faq` anchors, and lands on
  `#insurers` below the sticky header
- `/motor` renders the dedicated motor-insurance campaign page with its own
  local motor-page nav, `Home` link, 14-logo insurer grid, motor tier
  comparison, claim/renewal/guides/FAQ/contact sections, and canonical
  `https://covermate.vercel.app/motor`
- public navbar anchor jumps, including `#fit`, scroll in-place without
  rebuilding the main visitor DOM or flashing the page
- `/admin/login` loads
- Firebase Auth login UI renders; real Google popup login is verified manually
  with an allowlisted admin account before production release
- Firestore Rules are published for project `covermate-purich` before relying on
  real admin authorization
- an owner UID exists at `admins/<uid>` with `active: true` before real admin
  login acceptance is expected
- `/admin` shows the Admin Portal Home inside the shared admin shell
- portal sidebar links switch Home, Operations, Website content, Analytics,
  Settings, quick actions, and clean `/` without a full document reload
- `/admin/ops` remains a compatibility entry into the same shell and defaults to
  Operations
- Customers, Consultations, Quotes, Policies, Renewals, Documents, and Insurers
  remain hidden until real API contracts exist
- admin `Public site` actions open the clean public route in a new tab without
  generating `/?view=public` or showing owner chrome in that public tab
- a signed-in browser with a stale `purich-admin-ever-v7` marker can load `/`
  and reload `/` without showing owner chrome
- `/admin/analytics` renders private analytics without loading visitor GA
  scripts and without horizontal overflow
- `/admin/analytics` recent leads remain readable on mobile as labeled cards,
  not a clipped horizontal table
- `/#admin` renders all admin tabs without clipping, including Content,
  Brand & contact, Theme & data, and Versions
- `/#admin` Content tab can edit structured card sets, including insurer
  relationship cards, claim cards, and fee cards
- `/#admin` Brand & contact tab manages advisor logo path/alt metadata and
  global contact values without exposing binary upload, Firebase Storage upload,
  base64/data-image storage, drag/drop image processing, or a media library
- `/#admin` Brand & contact displays credential and footer legal identity copy
  as protected owner-readable content, with required licence identifiers intact
- `/#admin` Theme & data exposes guarded SEO title/description controls only;
  canonical, robots, social image, JSON-LD claim boundaries, and owner-route
  noindex behavior remain code-owned
- `/#admin` builder controls can increase section columns, add insurer
  relationship cards, add coverage table columns, add tier rows, keep tier cell
  state aligned to the coverage headers, and persist the final mutation to the
  debounced draft save path
- `/#admin` `Save draft` and `Publish` use custom confirmation dialogs, not
  native browser dialogs
- `Save draft` success waits for the Firestore draft write, then shows a
  dismissible toast with a 30-second `Undo` that restores the previous draft
- `Publish` success waits for the Firestore live/draft/version writes, then
  shows a dismissible toast with a 30-second `Undo` that republishes the
  previous live snapshot
- direct `/admin/content` close returns to `/admin`; a panel opened from
  `/admin/edit` closes back into the same editor context and does not expose
  owner chrome on the visitor route
- `/#admin` drawer appears above visitor sticky header on mobile and must not
  fade in over the header chrome
- `/#admin` keeps sign-out reachable without using a lone ambiguous drawer-header
  "ออก" control
- `/#edit` renders click-to-edit mode with editable text fields
- `/#edit` owner dock is compact by default: `Editing on page` and `Tools`
  stay visible; opening `Tools → Panel` keeps text editing active and changes
  the status to `Editing on page · Panel open`. Expanding `Tools` opens the
  warm-ink command palette with `Draft` (`Save draft`, `Preview`, `Publish`) and
  `Go to` (`Panel`, `Main`, `Public site`, `Log out`) groups. `Publish` is the
  only terracotta-filled dock action
- `Tools → Public site` in edit mode opens the clean public route in a new tab
  without owner chrome
- unauthenticated owner routes redirect to `/admin/login`
- body/UI/form text uses the Google Sans family in both Thai and English
- visible Admin chrome/action labels are English-only: `Panel`, `Edit text`,
  `Main`, `Public site`, `Save draft`, `Preview`, `Publish`,
  `Success`, and `Log out`
- Firestore live content hydrates before public/Admin Portal rendering; stale
  local cache must not override a successful `states/live` read
- the `#fit` Needs Calculator uses the current `fit.calculator` methodology
  payload, exposes essential spending/support years/obligations/resources/room
  benefit/recovery inputs, and does not reintroduce salary/dependency
  multipliers
- legacy Firestore content that conflicts with product decisions is normalized
  on render/save/publish: duplicate `#motor` nav, stale insurer-count copy, and
  forced-line-break contact headings. The current insurer-count decision follows
  the active `insurers.items` logo data; with the committed logo set, the count
  is `14`
- owner modes hydrate Firestore draft/version data as needed, and publish writes
  `states/live`, `states/draft`, and a version document
- `/` and `/motor` remain indexable with canonicals
  `https://covermate.vercel.app/` and `https://covermate.vercel.app/motor`;
  `/#motor` remains a hash alias with the home canonical
- `/admin`, `/admin/login`, `/#admin`, `/#edit`, and `/#preview` remain
  `noindex`
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, Open Graph/Twitter metadata,
  and JSON-LD structured data render and parse
- Firestore live content updates SEO title/description/JSON-LD after hydration;
  stale local cache must not win
- `covermate-analytics.js` loads as a static asset, uses GA4 measurement ID
  `G-5TF3C235EF`, runs only on `covermate.vercel.app`, and suppresses owner
  hashes/admin sessions
- `admin/session.js`, `admin/analytics-data.js`, and `scripts/validate-bundles.mjs`
  parse as source-authored refactor helpers
- Vercel security headers are present in `vercel.json`; CSP remains Report-Only
  until exported inline/blob bundle requirements are removed
- no horizontal overflow on covered viewports
- admin controls meet mobile touch-target expectations on covered viewports

## Bundle Parse Check

Before deploying manual edits to exported HTML bundles, run:

```bash
npm run check:bundles
```

The historical inline parse snippet is still useful for debugging:

```bash
node - <<'NODE'
const fs = require('fs');
for (const file of ['index.html', 'admin/login/index.html', 'admin/index.html', 'admin/analytics/index.html']) {
  const html = fs.readFileSync(file, 'utf8');
  const marker = '<script type="__bundler/template">';
  const start = html.indexOf(marker);
  if (start === -1) {
    console.log(file, 'no embedded template');
    continue;
  }
  const match = html.match(/<script type="__bundler\\/template">([\\s\\S]*?)<\\/script>/);
  if (!match) throw new Error(`${file}: embedded template script missing`);
  JSON.parse(match[1]);
  console.log(file, 'parse ok');
}
NODE
```

## Offline Prototype Export Check

The production site does not require a portable offline prototype artifact. Treat
downloaded prototype HTML as reference material unless the current task
explicitly asks for a shareable offline demo.

If an offline demo is requested, validate it separately from production:

1. Open it directly from `file://`, not only through a local server.
2. Reload `/`, admin, edit, preview, and any requested hash/route states.
3. Confirm the browser console has no missing-file errors for `support.js`,
   `image-slot.js`, or `_ds/*/_ds_bundle.js`.
4. Search visible body text for raw template markers:

```js
document.body.innerText.match(/\{\{[^}]+\}\}|sc-if|sc-for|x-dc|\[object Object\]/g)
```

The expression should return `null`.

5. If the file renders raw `{{ ... }}` placeholders, do not patch production
   around it. Fix or regenerate the offline prototype as a self-contained file
   or provide a complete folder bundle with every runtime dependency.

## Deploy

Only run this section after the user explicitly approves commit, push, and
deploy in the current task.

Deploy production:

```bash
firebase deploy --only firestore:rules
vercel deploy --prod --yes
```

When a change touches public lead payloads or `firestore.rules`, deploy the
Firestore rules before the Vercel production deploy so the browser payload and
remote validator stay in lockstep.

Inspect production deployment:

```bash
vercel inspect covermate.vercel.app
```

Confirm the production deployment points to the expected commit before closing
the release.

## Docs-Only Changes

For documentation-only changes, Vercel deployment is not required.

Run:

```bash
git diff --check
```

Then commit and push only if the user explicitly approves that action in the
current task.

## Rollback Guidance

Do not use destructive git commands unless the user explicitly asks for them.

For a bad production deploy:

1. Identify the last good commit or Vercel deployment.
2. Prefer a forward fix when small and safe.
3. If rollback is required, use Vercel's deployment promotion/rollback flow or
   create an explicit revert commit.
4. Re-run production smoke checks.

## Pre-Release Checklist

- `git status` reviewed
- relevant docs updated
- storage key changes reflected in [DATA_CONTRACT.md](DATA_CONTRACT.md)
- Firestore rules deployed when lead/CMS payload validation changes
- route/navigation changes reflected in [SITE_MAP.md](SITE_MAP.md)
- SEO/indexing changes reflected in [SEO.md](SEO.md)
- visual/font/asset changes reflected in [DESIGN_ASSETS.md](DESIGN_ASSETS.md)
- local smoke run for code changes
- production smoke run after deploy
