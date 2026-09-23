// Published caches are separate; their maximum staleness can accumulate.
export const PUBLISHED_READER_TTL_MS = 30000;
export const PUBLIC_HTML_TTL_SECONDS = 30;
export const PUBLIC_HTML_CACHE_CONTROL = `public, max-age=0, s-maxage=${PUBLIC_HTML_TTL_SECONDS}`;

export const LIVE_REFRESH_INTERVAL_MS = 60000;
export const MIN_REFRESH_GAP_MS = 5000;
export const MAX_REFRESH_BACKOFF_MS = 300000;

// Caller owns lifecycle; signals respect the last-attempt gap/backoff.
export function liveRefreshDelay({ now, lastAttempt, failures, delay = LIVE_REFRESH_INTERVAL_MS }) {
  const retryDelay = failures
    ? Math.min(MAX_REFRESH_BACKOFF_MS, LIVE_REFRESH_INTERVAL_MS * 2 ** (failures - 1))
    : MIN_REFRESH_GAP_MS;
  return Math.max(delay, lastAttempt + retryDelay - now);
}
