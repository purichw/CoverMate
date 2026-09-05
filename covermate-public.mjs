import { cacheSiteState, validStateDoc, cleanText, cleanLeadChoice } from './covermate-contract.js';
import { resolveCoverMateEnvironment } from './covermate-environment.mjs';
import { publicFirestoreRoot, emulatorEnabled, firebaseConfig, FIREBASE_VERSION } from './covermate-firebase-config.mjs';

const environment = resolveCoverMateEnvironment();
let appCheckPromise;
const pendingIds = new Map();

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

export async function hydrateLocalContent() {
  const response = await fetch(`${publicFirestoreRoot()}/sites/${environment.siteId}/states/live`, {
    cache: 'no-store', signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Published content unavailable (${response.status}).`);
  const live = decodeFields((await response.json()).fields || {});
  const result = { live: validStateDoc(live) && cacheSiteState('live', live), draft: false, versions: false, source: 'remote', environment: environment.name, siteId: environment.siteId };
  window.__covermateRemoteContent = result;
  window.dispatchEvent(new CustomEvent('covermate:remote-content-ready', { detail: result }));
  return result;
}

async function appCheckToken() {
  if (emulatorEnabled()) return '';
  if (!appCheckPromise) appCheckPromise = (async () => {
    const response = await fetch('/api/leads', { signal: AbortSignal.timeout(10000) });
    const settings = await response.json();
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
  const token = await appCheckToken();
  const response = await fetch(`/api/leads?cm_env=${environment.name}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Firebase-AppCheck': token, 'Idempotency-Key': pendingIds.get(signature) },
    body: signature, signal: AbortSignal.timeout(15000)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Could not send your enquiry.');
  pendingIds.delete(signature);
  return result;
}

window.CoverMateEnvironment = environment;
