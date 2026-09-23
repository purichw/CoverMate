import { cacheSiteState, validStateDoc, sanitizeStateDoc, cleanText, cleanLeadChoice, isAdminNamespacePath, isOwnerHash, LIVE_CONFIG_KEY, LIVE_TEXT_KEY } from './covermate-contract.js';
import { resolveCoverMateEnvironment } from './covermate-environment.mjs';
import { publicFirestoreRoot, emulatorEnabled, firebaseConfig, FIREBASE_VERSION } from './covermate-firebase-config.mjs';

const environment = resolveCoverMateEnvironment();
let appCheckPromise;
const pendingIds = new Map();
export const LIVE_REFRESH_INTERVAL_MS = 60000;
const MIN_REFRESH_GAP_MS = 5000;
let inFlight, lastSignature, lastAttempt = 0, failures = 0, timer, syncing = false, queued = false;
let routeGeneration = 0;

function publicRoute() {
  return !isAdminNamespacePath(location.pathname) && !isOwnerHash(location.hash);
}
function canRefresh() {
  return publicRoute() && document.visibilityState !== 'hidden' && navigator.onLine !== false;
}
function stableJSON(value) {
  if (Array.isArray(value)) return '[' + value.map(stableJSON).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableJSON(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}
function scheduleRefresh(delay = LIVE_REFRESH_INTERVAL_MS) {
  clearTimeout(timer);
  if (!syncing || !canRefresh()) return;
  const retryDelay = failures ? Math.min(300000, LIVE_REFRESH_INTERVAL_MS * 2 ** (failures - 1)) : MIN_REFRESH_GAP_MS;
  timer = setTimeout(() => {
    if (canRefresh()) hydrateLocalContent().catch(() => {});
  }, Math.max(delay, lastAttempt + retryDelay - Date.now()));
}
function requestRefresh() {
  clearTimeout(timer);
  if (!canRefresh()) return;
  if (inFlight) { queued = true; return; }
  scheduleRefresh(0);
}
function onOnline() { failures = 0; requestRefresh(); }
function onPageShow(event) { if (event.persisted) requestRefresh(); }
function onStorage(event) {
  if ([LIVE_CONFIG_KEY, LIVE_TEXT_KEY].includes(event.key)) requestRefresh();
}
function onRouteChange() {
  routeGeneration++;
  requestRefresh();
}

// Public live state only. Drafts and previews keep their own revision/conflict flow.
export function startLiveContentSync() {
  if (syncing) return;
  syncing = true;
  window.addEventListener('focus', requestRefresh);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', requestRefresh);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('storage', onStorage);
  window.addEventListener('popstate', onRouteChange);
  window.addEventListener('hashchange', onRouteChange);
  document.addEventListener('visibilitychange', requestRefresh);
  scheduleRefresh();
}

export function stopLiveContentSync() {
  syncing = false;
  queued = false;
  clearTimeout(timer);
  window.removeEventListener('focus', requestRefresh);
  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', requestRefresh);
  window.removeEventListener('pageshow', onPageShow);
  window.removeEventListener('storage', onStorage);
  window.removeEventListener('popstate', onRouteChange);
  window.removeEventListener('hashchange', onRouteChange);
  document.removeEventListener('visibilitychange', requestRefresh);
}

function decodeValue(value) {
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('nullValue' in value) return null;
  return value.stringValue ?? value.booleanValue ?? value.timestampValue ?? null;
}
function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

// AbortController also works in WebViews without AbortSignal.timeout. Keep the
// timeout active through body decoding, then release it on every outcome.
async function fetchJSON(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return { response, data: await response.json() };
  } finally {
    clearTimeout(timer);
  }
}

export function hydrateLocalContent() {
  if (!publicRoute()) return Promise.resolve({ live: false, source: 'skipped' });
  if (inFlight) return inFlight;
  lastAttempt = Date.now();
  // Reuse the same public state that produced this response's SEO. The next
  // scheduled refresh still verifies the live document, including direct edits.
  const seed = document.getElementById('covermate-published-state');
  if (seed) {
    seed.remove();
    try {
      const snapshot = JSON.parse(seed.textContent);
      const live = sanitizeStateDoc(snapshot.state);
      if (snapshot.siteId === environment.siteId && validStateDoc(live)) {
        cacheSiteState('live', live);
        lastSignature = stableJSON({ config: live.config, text: live.text });
        failures = 0;
        const result = { live: true, publicLive: true, changed: true, draft: false, versions: false, source: 'server', environment: environment.name, siteId: environment.siteId };
        window.__covermateRemoteContent = result;
        window.dispatchEvent(new CustomEvent('covermate:remote-content-ready', { detail: result }));
        scheduleRefresh();
        return Promise.resolve(result);
      }
    } catch { /* Invalid/mismatched snapshots use the existing remote fallback. */ }
  }
  const generation = routeGeneration;
  inFlight = (async () => {
    const { response, data: snapshot } = await fetchJSON(`${publicFirestoreRoot()}/sites/${environment.siteId}/states/live`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Published content unavailable (${response.status}).`);
    const live = sanitizeStateDoc(decodeFields(snapshot.fields || {}));
    if (!validStateDoc(live)) throw new Error('Invalid published content. Keeping the last known good state.');
    if (!publicRoute() || generation !== routeGeneration) return { live: false, source: 'skipped' };
    // Compare content too: direct database edits need not bump the CMS revision.
    const signature = stableJSON({ config: live.config, text: live.text });
    const changed = signature !== lastSignature;
    cacheSiteState('live', live);
    lastSignature = signature;
    failures = 0;
    const result = { live: true, publicLive: true, changed, updateTime: snapshot.updateTime || '', draft: false, versions: false, source: 'remote', environment: environment.name, siteId: environment.siteId };
    window.__covermateRemoteContent = result;
    if (changed) window.dispatchEvent(new CustomEvent('covermate:remote-content-ready', { detail: result }));
    return result;
  })().catch(error => {
    failures++;
    throw error;
  }).finally(() => {
    inFlight = null;
    scheduleRefresh(queued ? 0 : LIVE_REFRESH_INTERVAL_MS);
    queued = false;
  });
  return inFlight;
}

async function appCheckToken() {
  if (emulatorEnabled()) return '';
  if (!appCheckPromise) appCheckPromise = (async () => {
    const { response, data: settings } = await fetchJSON('/api/leads');
    if (!response.ok || !settings.siteKey) throw new Error('Lead protection is unavailable.');
    const [app, check] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-check.js`)
    ]);
    const instance = app.getApps().length ? app.getApp() : app.initializeApp(firebaseConfig());
    return { check, instance: check.initializeAppCheck(instance, { provider: new check.ReCaptchaEnterpriseProvider(settings.siteKey), isTokenAutoRefreshEnabled: true }) };
  })().catch(error => { appCheckPromise = null; throw error; });
  const { check, instance } = await appCheckPromise;
  return (await check.getToken(instance)).token;
}

export async function submitContactLead(input = {}) {
  const payload = {
    name: cleanText(input.name, 120), contact: cleanText(input.contact, 160),
    topic: cleanText(input.topic, 2000), summary: cleanText(input.summary, 1200),
    qtype: cleanLeadChoice(input.qtype, new Set(['', 'quote', 'compare', 'general', 'review', 'claim'])),
    coverage: cleanLeadChoice(input.coverage, new Set(['', 'life', 'health', 'motor', 'accident', 'savings', 'unsure'])),
    language: input.language === 'en' ? 'en' : 'th', consent: input.consent === true,
    sourcePath: new URL(input.sourcePath || location.pathname, location.origin).pathname
  };
  const signature = JSON.stringify(payload);
  if (!pendingIds.has(signature)) pendingIds.set(signature, crypto.randomUUID());
  let tokenTimer;
  const token = await Promise.race([
    appCheckToken(),
    new Promise((_, reject) => { tokenTimer = setTimeout(() => reject(new DOMException('Verification timed out.', 'TimeoutError')), 15000); })
  ]).finally(() => clearTimeout(tokenTimer));
  const { response, data: result } = await fetchJSON(`/api/leads?cm_env=${environment.name}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Firebase-AppCheck': token, 'Idempotency-Key': pendingIds.get(signature) },
    body: signature
  }, 15000);
  if (!response.ok) throw new Error(result.message || 'Could not send your enquiry.');
  if (typeof result.id !== 'string' || !/^[a-f0-9]{64}$/.test(result.id)) throw new DOMException('Receipt was not confirmed.', 'UnconfirmedReceipt');
  pendingIds.delete(signature);
  return result;
}

window.CoverMateEnvironment = environment;
