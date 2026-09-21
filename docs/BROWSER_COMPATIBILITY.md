# Browser Compatibility

Last updated: 2026-09-21. Engine checks are not real-device certification.
See [HANDOFF.md](HANDOFF.md) for deployed revision and production smoke evidence.

## Support Target

CoverMate's public Home and Motor pages target current and previous stable
Chrome, Safari, Firefox and Edge on their supported desktop/mobile platforms.
LINE's in-app browser on iOS and Android is a priority visitor surface, not an
optional desktop-only check. iPad and Samsung tablets keep desktop-like
composition with touch menus and disclosures. This is a support target, not
evidence that every listed app/version/device has already passed.

Use feature detection rather than user-agent branches. An older OS or embedded
WebView is not guaranteed to implement every API found in desktop Chrome.
IE and arbitrary obsolete WebViews are not in the support target. CSS `:has`,
`inert`, modern Grid and color functions remain part of the current-browser
baseline; the targeted request-timeout repair is not a complete legacy polyfill.

## Visitor Contracts

- Published CMS content and explicit blanks remain authoritative. Successful
  reads also populate in-memory live state when persistent storage is blocked.
- Public fetch deadlines use AbortController and timers, not a required
  AbortSignal.timeout implementation. Both connection and response-body waits
  are bounded. All timers are cleared after success or failure.
- LINE links remain CMS-owned HTTPS URLs, navigated directly from a user click
  in the same browsing context. Do not change these into popup-only JavaScript,
  deprecated `line://` URLs, or hard-coded account identities.
- Do not automatically force visitors out of LINE. The normal website is not a
  LIFF app and must not require LIFF login or SDK APIs. A user-controlled external
  browser escape can be added deliberately if a real-device failure requires it.
- Menu focus returns to its actual trigger even when Safari did not focus that
  button on pointer activation. Escape, focus trapping and inert background
  must continue to work.
- Keep viewport zoom enabled, text inputs at least 16px on touch surfaces,
  safe-area padding, local table scrolling and touch-accessible actions.
- Failed or uncertain submissions retain entered data and do not show success.
  A confirmed receipt is required; retries retain their idempotency identity.
  Never bypass App Check, auth or consent for browser compatibility.

## Repeatable Local Check

Install only the missing test engines into the ignored project directory:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/.tools/playwright-browsers" npx playwright install chromium firefox webkit
npm run check:public-request
npm run check:browsers
```

The browser harness starts its own ephemeral local server. It uses repository
defaults as a synthetic CMS fixture, replaces the LINE destination with a
test-only HTTPS account URL, intercepts the destination before leaving the test,
and blocks unexpected remote requests. Lead API, CMS and App Check are mocked;
no account login, real enquiry, publish or production write occurs.

For the current Home proposal, pass the reviewed handoff directory:

```sh
npm run check:browsers -- /path/to/covermate-home-codex-handoff-v1.0
```

Default matrix: Chromium/Chrome, Firefox and WebKit, each at 1440x900 desktop,
390x844 phone, 820x1180 tablet and restricted-storage phone. All cases check
Home/Motor and Thai/English, visible assets, overflow, disclosures, route/back
navigation, contact form failure/uncertain/success, and direct LINE links.
Touch cases also check menu/focus behavior. Restricted cases disable persistent
storage, window.open and AbortSignal.timeout; this is capability testing, not
an emulation of the real LINE app. Firefox's narrow/touch context is not an
Android Firefox installation or Playwright `isMobile` emulation.

Results and viewport screenshots: `uat-results/browser-compatibility/`.
Full runs write `report.json`; narrowed runs write a profile-specific report so
they do not overwrite the matrix evidence. The fast `check:public-request`
deadline/storage unit check is included in the existing CI gate. The full
cross-browser suite is deliberately not added to every CI run.
No full-page screenshots are used for touch Chromium because the local Chrome
build changes its emulated pointer media during full-page capture.

To narrow a follow-up or explicitly test installed Edge:

```sh
COVERMATE_BROWSERS=webkit COVERMATE_BROWSER_PROFILES=phone npm run check:browsers
COVERMATE_BROWSERS=edge npm run check:browsers
```

Missing requested engines fail the check; they are not reported as passes.
Chrome uses the existing shared launcher; Firefox/WebKit use project-local
Playwright downloads by default, or PLAYWRIGHT_BROWSERS_PATH if explicitly set.
Edge must already be installed and uses Playwright's `msedge` channel.

Do not run this full matrix for every copy, spacing or icon edit. Use it for
shared navigation/forms/bootstrap/API/CSS-capability changes, explicit browser
work, and relevant releases. Tiny visual work still uses one targeted check.

## Real-Device Release Checklist

Engine checks cannot certify branded Safari/Edge, OS-level app links, actual
keyboards, tracking protection or LINE's app lifecycle. Before sending paid
LINE traffic to the redesigned release, check an authorized hosted UAT URL on
actual iPhone/iPad Safari, Android Chrome, LINE iOS and LINE Android, plus a
desktop Edge smoke. Use test data only in the isolated UAT namespace.

1. Open Home and Motor URLs from a real LINE conversation. Check cold load,
   language, fonts/images, scrolling, safe areas and portrait/landscape.
2. Use menu, disclosure, Home/Motor links and native Back. Background/resume
   LINE and return from the chat without an unusable overlay or blank page.
3. Focus contact inputs with the real keyboard. Ensure the focused field,
   consent and submit action can be reached and no sticky bar obscures them.
4. Exercise an authorized synthetic enquiry with actual App Check. Confirm
   server receipt and Admin UAT readback; never infer persistence from the local
   mocked success state. Retry after a network interruption without duplicate
   enquiries or erased fields.
5. Tap the configured LINE CTA, confirm the correct account/chat, then return.
   Check desktop QR/web fallback where LINE is not installed. Do not send a
   message merely to test link navigation.

Record app, OS and browser versions with PASS/FAIL/NOT_RUN. Do not relabel a
Chromium pass as an Edge-device pass or a WebKit pass as an iPhone/LINE pass.

## Local Evidence, 2026-09-21

- Chrome 153.0.8010.50, Playwright Firefox 142.0.1 and WebKit 26.0 were exercised
  on macOS. These recorded versions are evidence, not a claim that every
  current/previous branded browser release was covered.
- The 12-profile matrix covered Home/Motor, TH/EN and the flows listed above.
  The final broad run passed 11 cases; Chromium restricted-phone hit a test
  synchronization defect (pending was incorrectly accepted as success). After
  changing the check to wait for `ui.submitSuccess`, that case passed in
  `report-chromium-restricted-phone.json`. Keep both reports; no failed run was
  relabeled as a passing full run.
- The default repository fixture also passed Chromium restricted-phone before
  the final proposal run. The full proposal uses the owner's reviewed handoff.
- Request deadline/cleanup units, UAT environment boundaries, generated bundle
  checks, live CMS refresh regression and `git diff --check` passed.
- Home desktop Chrome, tablet Firefox and phone WebKit snapshots were personally
  inspected. No visual overflow or broken assets was observed in those captures.
- Real LINE iOS/Android, branded Safari/Edge, hosted App Check, production lead
  persistence and Admin cross-engine journeys remain NOT_RUN in this pass.
  No deploy, CMS publish, real enquiry or cloud-data migration occurred.

## References

- [Playwright browser support and engine limitations](https://playwright.dev/docs/browsers)
- [Official LINE HTTPS URL schemes and external-browser parameters](https://developers.line.biz/en/docs/messaging-api/using-line-url-scheme/)
- [LINE in-app browser versus LIFF browser](https://developers.line.biz/en/docs/liff/differences-between-liff-browser-and-line-in-app-browser/)
