const productionOrigin = 'https://covermateinsurance.com';
const bypassHeader = 'x-vercel-protection-bypass';

export function uptimeAccess(env = process.env) {
  let base;
  try { base = new URL(env.COVERMATE_URL || productionOrigin); }
  catch { throw new Error('COVERMATE_URL must be a valid origin URL.'); }
  const secret = (env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();
  if (base.username || base.password || base.search || base.hash || base.pathname !== '/') {
    throw new Error('COVERMATE_URL must be an origin without credentials, path, query or fragment.');
  }
  if (secret && base.origin !== productionOrigin) {
    throw new Error('The availability automation credential is restricted to the exact production HTTPS origin.');
  }
  if (env.COVERMATE_REQUIRE_BYPASS === '1' && !secret) {
    throw new Error('Missing VERCEL_AUTOMATION_BYPASS_SECRET; configure the dedicated availability credential in GitHub Actions secrets.');
  }
  return { origin: base.origin, secret };
}

export async function installUptimeBypass(context, { origin, secret }) {
  const failures = [];
  if (!secret) return failures;
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) return route.continue();
    try {
      // Header overrides in route.continue can follow cross-origin redirects.
      // Fetch one hop only, then let the browser process the real response.
      const response = await route.fetch({
        headers: { ...request.headers(), [bypassHeader]: secret },
        maxRedirects: 0, maxRetries: 0, timeout: 30000
      });
      if (response.status() >= 300 && response.status() < 400 && response.headers().location) {
        // Playwright does not route the browser's redirected request again.
        // Preserve the response but fail the canonical-URL check explicitly.
        failures.push('A protected availability request redirected; verify the canonical production URL before changing monitor access.');
      }
      await route.fulfill({ response });
    } catch {
      // Playwright's fetch error can include request headers. Never rethrow it.
      failures.push('A protected availability request failed before a response was received.');
      await route.abort().catch(() => {});
    }
  });
  return failures;
}
