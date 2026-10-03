# Public content protection

Updated 2026-10-03. This is layered deterrence for ordinary copying and automated
collection, not DRM or a promise that publicly readable material cannot be copied.

## Current rollout

- **Live:** CoverMate Vercel Firewall configuration `waf_ucezBoNI3aLw`, version 2,
  in project `prj_AraOMyb7pLZrYhcxu70cpRhqfH1F` / team
  `team_YrvoFhGxq1xp83XzkHci5rNx`. No code deployment was made for this change.
- Browser copy guards and the restrictive `robots.txt` policy ship with this
  source revision. They follow the normal Git/CI promotion gate; confirm the
  served bundle and robots text before claiming deployment. At the initial
  firewall activation, production still used the earlier general robots policy.
- No paid feature, plan upgrade, rate-limit charge, Attack Mode, IP/system
  mitigation bypass, Firestore permission change or CMS publication was enabled.

## Edge policy and ordering

The three custom rules use the Hobby allowance, in this order:

1. `Authenticated notification scheduler`: bypass only the exact normalized
   `/api/notification-worker` path. The handler accepts GET only and still
   checks the existing secret with a timing-safe comparison before doing work.
   Missing credentials return 401. There is no general `/api/` bypass.
2. `Deny training and bulk content scrapers`: deny identified GPTBot, CCBot,
   ClaudeBot, Claude-User, ChatGPT-User, Perplexity-User, Bytespider,
   anthropic-ai, cohere-ai, Diffbot, ImagesiftBot, meta-externalagent,
   meta-externalfetcher, FacebookBot, Scrapy, HTTrack, python-requests,
   python-urllib, curl and Wget signatures (common capitalization variants).
3. `Public SEO discovery metadata`: bypass only `/robots.txt`, `/sitemap.xml`
   and `/api/article-sitemap`. These expose discovery metadata, not article
   bodies. The preceding deny still applies to explicitly blocked agents.

Managed **Bot Protection = Challenge** then challenges non-browser clients,
including clients that merely claim to be Chrome or Googlebot. Vercel verifies
legitimate bots independently; no User-Agent-only search bypass was added.
The blanket **AI Bots** switch remains Allow because that managed category also
includes search indexing agents. The selective deny rule preserves those
search agents while rejecting identified non-search collection.

`robots.txt` allows explicit search/indexing, SEO audit and link-preview groups,
excludes API routes except the exact article sitemap, explicitly opts out of
Google-Extended/Applebot-Extended training and defaults other agents to Disallow.
These are cooperative crawl instructions, never an authorization boundary.
Admin login HTML remains readable to permitted indexers so its noindex can be
processed; private endpoints still require their existing authorization.

## Browser behavior

`src/visitor/content-protection.mjs` deters copy/cut, select-all copying, text/image
dragging and image context menus inside public main content. It leaves text
selection and ordinary link/text context menus available, shows a brief TH/EN
share-link notice and releases listeners/timers on unmount. Admin, CMS editing,
Draft Preview and article canvas are excluded. Forms, contact details,
calculator results, links and manual share-URL fallback remain copyable.

## Verification and limits

Evidence is in `uat-results/content-protection-20261003/` (local QA output):

- Before: an unverified automated request obtained Home HTML with 200.
- After: unverified requests, fake Googlebot and fake Chrome received a 429
  JavaScript challenge; GPTBot and curl received 403 Deny. Direct
  `/api/page?route=/articles` also received a challenge.
- All three discovery endpoints returned 200 without a challenge; the scheduler
  still returned 401 with no credential. No email was sent by these checks.
- A real browser loaded Home and navigated to an article after activation.
- Local article browser tests cover guard cancellation/exemptions, share fallback,
  TH/EN feedback and lifecycle cleanup; a native clipboard check also preserved
  the clipboard sentinel. Build, bundle boundaries, SEO and performance budgets
  passed. Real-device iOS long-press is not proven by desktop emulation.

Verified search-bot allowances are the platform's documented behavior, not proof
of a new Google crawl. Facebook/LINE share buttons remain usable; fresh unfurling
from their real servers has not been separately verified. Unverified preview
clients may be challenged even when robots permits them. Do not fix that with
a spoofable User-Agent-only bypass.

Public browser automation that passes verification, screenshots/OCR, DevTools,
disabled JavaScript and copying by hand remain possible. Public Cloudinary
images and the existing public Firestore CMS live document are outside this
Vercel firewall; article/admin records retain their existing authenticated
boundary. Do not describe this as preventing every method of extraction.

## Maintenance and release checks

- Inspect active configuration and any draft before changing rules. The dashboard
  stages changes for Review/Publish, but REST PATCH applies directly to the active
  configuration; never assume it creates a review draft.
- Preserve the scheduler exception and its application authentication. Do not
  widen exceptions to all APIs, public page HTML, static source or entire hosts.
- Search agents and scraper signatures evolve; update the selective rule after
  checking the provider's current identity and purpose.
- Raw hosted `fetch`/curl release probes now intentionally receive 403/429 on
  protected routes. Do not misreport that as an application 503 or weaken a
  release assertion. Use ordinary browser request context for authorized hosted
  checks, keep app-layer API authorization tests in the local/emulator suites,
  and separately verify that unverified collection remains blocked.
- Rollback, if authorized, should change only these rules/managed setting after
  re-reading current state. Do not disable the entire firewall or erase another
  operator's intervening changes. Pre-change state had no custom rules and Bot
  Protection Off; evidence of the activated configuration is saved locally.

References: [Vercel bot management](https://vercel.com/docs/bot-management),
[WAF custom rules](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules),
[Google crawler controls](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers).
