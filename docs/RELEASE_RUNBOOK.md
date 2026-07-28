# CoverMate Release Runbook

Last updated: 2026-07-28

## Production

Production URL:

[https://covermate.vercel.app](https://covermate.vercel.app)

Vercel project:

`covermate`

GitHub remote:

`https://github.com/purichw/CoverMate.git`

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
- first paint does not show exported placeholder UI
- insurer logos render
- insurer relationship proof cards render
- contact form enquiry-type and coverage selects render
- `/#motor` header links target visible motor-route sections
- `/admin/login` loads
- demo/Google login redirects to `/admin`
- `/admin` shows the "Manage your site" launcher
- launcher links open `/#edit`, `/#admin`, and `/`
- unauthenticated owner routes redirect to `/admin/login`
- Thai text uses Google Sans Thai
- no horizontal overflow on covered viewports

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
  const bodyStart = start + marker.length;
  const end = html.indexOf('</script>', bodyStart);
  JSON.parse(html.slice(bodyStart, end).trim());
  console.log(file, 'parse ok');
}
NODE
```

## Deploy

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

Then commit and push.

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
- visual/font/asset changes reflected in [DESIGN_ASSETS.md](DESIGN_ASSETS.md)
- local smoke run for code changes
- production smoke run after deploy
