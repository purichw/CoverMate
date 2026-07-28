# CoverMate Release Runbook

Last updated: 2026-07-28

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
COVERMATE_URL=http://127.0.0.1:4177 npm run smoke
```

`npm run smoke` defaults to `http://localhost:4177`.

## Production Smoke

After production deployment:

```bash
COVERMATE_URL=https://covermate.vercel.app npm run smoke
```

Minimum checks:

- `/` loads public visitor site
- first paint does not show exported placeholder UI or raw `<x-dc>` template
  content
- no rendered `[object Object]` placeholder text appears on visitor or admin
  surfaces
- insurer logos render
- insurer relationship proof cards render
- contact form enquiry-type and coverage selects render
- `/#motor` keeps the same global navbar as `/`, does not expose the hidden
  motor-variant nav, and lands on `#insurers` below the sticky header
- `/admin/login` loads
- Firebase Auth login UI renders; real Google popup login is verified manually
  with an allowlisted admin account before production release
- Firestore Rules are published for project `covermate-purich` before relying on
  real admin authorization
- an owner UID exists at `admins/<uid>` with `active: true` before real admin
  login acceptance is expected
- `/admin` shows the "Manage your site" launcher
- launcher links open `/#edit`, `/#admin`, and `/`
- `/#admin` renders all admin tabs without clipping, including Content,
  Brand & chrome, Theme & data, and Versions
- `/#admin` close button hides the drawer and exposes an owner bar that can
  reopen `Panel`, enter `Edit text`, return to `Main`, or `Log out`
- `/#admin` keeps sign-out reachable without using a lone ambiguous drawer-header
  "ออก" control
- `/#edit` renders click-to-edit mode with editable text fields
- `/#edit` toolbar can open `Panel`, return to `Main`, finish editing with
  `Done`, and `Log out`
- finishing edit mode removes `contenteditable` affordances
- unauthenticated owner routes redirect to `/admin/login`
- body/UI/form text uses the Google Sans family in both Thai and English
- visible Admin chrome/action labels are English-only: `Panel`, `Edit text`,
  `Main`, `Done`, `Save draft`, `Preview`, `Publish`, `Success`, and `Log out`
- Firestore live content hydrates before public/admin launcher rendering; stale
  local cache must not override a successful `states/live` read
- owner modes hydrate Firestore draft/version data as needed, and publish writes
  `states/live`, `states/draft`, and a version document
- `/`, including `/#motor`, remains indexable with canonical
  `https://covermate.vercel.app/`
- `/admin`, `/admin/login`, `/#admin`, `/#edit`, and `/#preview` remain
  `noindex`
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, Open Graph/Twitter metadata,
  and JSON-LD structured data render and parse
- Firestore live content updates SEO title/description/JSON-LD after hydration;
  stale local cache must not win
- no horizontal overflow on covered viewports
- admin controls meet mobile touch-target expectations on covered viewports

## Bundle Parse Check

Before deploying manual edits to exported HTML bundles, run:

```bash
node - <<'NODE'
const fs = require('fs');
for (const file of ['index.html', 'admin/login/index.html', 'admin/index.html']) {
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

## Deploy

Only run this section after the user explicitly approves commit, push, and
deploy in the current task.

Deploy production:

```bash
vercel deploy --prod --yes
```

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
- route/navigation changes reflected in [SITE_MAP.md](SITE_MAP.md)
- SEO/indexing changes reflected in [SEO.md](SEO.md)
- visual/font/asset changes reflected in [DESIGN_ASSETS.md](DESIGN_ASSETS.md)
- local smoke run for code changes
- production smoke run after deploy
