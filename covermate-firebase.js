import {
  DRAFT_CONFIG_KEY,
  DRAFT_TEXT_KEY,
  HISTORY_KEY,
  HISTORY_LIMIT,
  cacheSiteState as cacheState,
  cacheVersions,
  cleanLeadChoice,
  cleanText,
  clearAdminSession as clearSession,
  readAdminSession as readSession,
  readJSON,
  removeKey,
  sanitizeStateDoc,
  validStateDoc,
  writeAdminSession as writeSession
} from "./covermate-contract.js";
import { resolveCoverMateEnvironment } from "./covermate-environment.mjs";
import { canEditContent, normalizeAdminRole } from "./covermate-roles.mjs";
import { assertCmsState } from './cms-validation.mjs';
import { firebaseConfig, emulatorEnabled, FIREBASE_VERSION } from './covermate-firebase-config.mjs';

const FIREBASE_CONFIG = firebaseConfig();
const LEAD_LIMIT = 250;
const COVERMATE_ENVIRONMENT = resolveCoverMateEnvironment();
const SITE_ID = COVERMATE_ENVIRONMENT.siteId;
const LEAD_COLLECTION = COVERMATE_ENVIRONMENT.leadCollection;

const LEAD_QTYPES = new Set(["", "quote", "compare", "general", "review", "claim"]);
const LEAD_COVERAGES = new Set(["", "life", "health", "motor", "accident", "savings", "unsure"]);
const LEAD_LANGS = new Set(["th", "en"]);

const [
  appMod,
  authMod,
  firestoreMod
] = await Promise.all([
  import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
  import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
  import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
]);

const app = appMod.getApps().length
  ? appMod.getApp()
  : appMod.initializeApp(FIREBASE_CONFIG);
const auth = authMod.getAuth(app);
const db = firestoreMod.getFirestore(app);
if (emulatorEnabled()) {
  authMod.connectAuthEmulator(auth, 'http://127.0.0.1:9098', { disableWarnings: true });
  firestoreMod.connectFirestoreEmulator(db, '127.0.0.1', 8088);
}
const loadedRevisions = new Map();
let pendingWrite = Promise.resolve();
function serializeWrite(operation) {
  const result = pendingWrite.then(operation);
  pendingWrite = result.catch(() => {});
  return result;
}

let unresolvedMutation;
async function writeCms(action, data = {}) {
  const user = auth.currentUser || await waitForAuth();
  const admin = await readAdmin(user);
  if (!admin || !canEditContent(admin.role)) throw new Error('Not authorized to save CoverMate content.');
  if (action !== 'reset') assertCmsState({config:data.config,text:data.text || {}});
  const payload = {action,...data,revisions:Object.fromEntries(loadedRevisions)};
  const signature = JSON.stringify(payload);
  // Reuse the same receipt after an uncertain response; publishing twice must
  // not create duplicate history or overwrite a newer revision.
  if (unresolvedMutation?.signature !== signature) unresolvedMutation = {signature,requestId:crypto.randomUUID()};
  const requestId = unresolvedMutation.requestId;
  const response = await fetch('/api/cms' + (COVERMATE_ENVIRONMENT.isUat ? '?cm_env=uat' : ''),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await user.getIdToken()},body:JSON.stringify({...payload,requestId}),signal:AbortSignal.timeout(30000)});
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.message),{code:result.error,fields:result.fields});
  unresolvedMutation = null;
  Object.entries(result.revisions).forEach(([name,revision]) => loadedRevisions.set(name,revision));
  return result;
}
const provider = new authMod.GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

function adminRef(uid) {
  return firestoreMod.doc(db, "admins", uid);
}

async function readAdmin(user) {
  if (!user) return null;
  const snap = await firestoreMod.getDoc(adminRef(user.uid));
  if (!snap.exists()) return null;
  const admin = snap.data() || {};
  if (admin.active !== true) return null;
  if (normalizeAdminRole(admin.role) === 'none') return null;
  if (admin.uatOnly === true && !COVERMATE_ENVIRONMENT.isUat) return null;
  return admin;
}

async function userIsAdmin(user) {
  return Boolean(await readAdmin(user));
}

async function syncSessionFromCurrentUser() {
  const user = auth.currentUser;
  if (!user) return { ok: false, reason: "signed-out" };
  const admin = await readAdmin(user);
  if (!admin) {
    clearSession();
    return { ok: false, reason: "not-admin", user };
  }
  return { ok: true, user, admin, session: writeSession(user, admin) };
}

async function signInAdmin() {
  const result = await authMod.signInWithPopup(auth, provider);
  const admin = await readAdmin(result.user);
  if (!admin) {
    clearSession();
    await authMod.signOut(auth).catch(() => {});
    return {
      ok: false,
      reason: "not-admin",
      user: result.user,
      message: `${result.user.email || "This account"} is not on the CoverMate admin allowlist yet.`
    };
  }
  return { ok: true, user: result.user, admin, session: writeSession(result.user, admin) };
}

async function signOut() {
  clearSession();
  await authMod.signOut(auth).catch(() => {});
}

function waitForAuth() {
  return new Promise((resolve) => {
    const stop = authMod.onAuthStateChanged(auth, (user) => {
      stop();
      resolve(user);
    });
  });
}

function stateRef(name) {
  // Website drafts/publications only. Articles have their own API, revisions
  // and collections; never include them in a website Save/Publish/Reset.
  return firestoreMod.doc(db, "sites", SITE_ID, "states", name);
}

async function loadSiteState(name, options = {}) {
  const read = options.source === 'server' ? firestoreMod.getDocFromServer : firestoreMod.getDoc;
  const snap = await read(stateRef(name));
  loadedRevisions.set(name, snap.exists() ? Number(snap.data().revision || 0) : 0);
  return snap.exists() ? (snap.data() || null) : null;
}

async function saveSiteState(name, config, text, options = {}) {
  return serializeWrite(() => saveSiteStateNow(name, config, text, options));
}

async function saveSiteStateNow(name, config, text, options = {}) {
  const result = await writeCms('save',{name,config,text:text || {}});
  const payload = {...sanitizeStateDoc({config,text:text || {}},{repeatableIds:true}),revision:result.revisions[name]};
  // Background editing owns its local Draft. A delayed acknowledgment must
  // never replace a newer local edit/Undo while the next write is queued.
  if (!(name === 'draft' && options.cache === false)) cacheState(name, payload);
}

// Reset is a Draft operation, not a publish or a restoration of a cached version.
// Transactions require the server and retry if Live changes during the copy.
async function resetDraftToPublished() {
  return serializeWrite(async () => {
    const result = await writeCms('reset');
    const payload = {config:result.config,text:result.text,revision:result.revisions.draft};
    cacheState('live', {...payload,revision:result.revisions.live});
    cacheState('draft', payload);
    return { config: payload.config, text: payload.text };
  });
}

async function appendVersion(config, text, metadata = {}) {
  return serializeWrite(async () => (await writeCms('version',{config,text:text || {},metadata})).version);
}

async function publishSiteState(config, text, metadata = {}) {
  return serializeWrite(() => publishSiteStateNow(config, text, metadata));
}

async function publishSiteStateNow(config, text, metadata = {}) {
  const {version,revisions} = await writeCms('publish',{config,text:text || {},metadata});
  const payload = {config:version.config,text:version.text};
  cacheState('live',{...payload,revision:revisions.live});
  cacheState('draft',{...payload,revision:revisions.draft});
  const cachedHistory = readJSON(HISTORY_KEY);
  if (Array.isArray(cachedHistory)) {
    cachedHistory.unshift(version);
    cacheVersions(cachedHistory);
  }
  return version;
}

async function loadVersions(limitCount = HISTORY_LIMIT, options = {}) {
  const q = firestoreMod.query(
    firestoreMod.collection(db, "sites", SITE_ID, "versions"),
    firestoreMod.orderBy("ts", "desc"),
    firestoreMod.limit(limitCount)
  );
  const read = options.source === 'server' ? firestoreMod.getDocsFromServer : firestoreMod.getDocs;
  const snap = await read(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }));
}

async function submitContactLead(input = {}) {
  return (await import('./covermate-public.mjs')).submitContactLead(input);
}

async function loadContactLeads(limitCount = LEAD_LIMIT) {
  const user = auth.currentUser || await waitForAuth();
  const admin = await readAdmin(user);
  if (!admin) throw new Error("Not authorized to read CoverMate leads.");
  const q = firestoreMod.query(
    firestoreMod.collection(db, LEAD_COLLECTION),
    firestoreMod.orderBy("createdAt", "desc"),
    firestoreMod.limit(Math.max(1, Math.min(LEAD_LIMIT, Number(limitCount) || LEAD_LIMIT)))
  );
  const snap = await firestoreMod.getDocs(q);
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      name: cleanText(data.name, 120),
      contact: cleanText(data.contact, 160),
      qtype: cleanLeadChoice(data.qtype, LEAD_QTYPES),
      coverage: cleanLeadChoice(data.coverage, LEAD_COVERAGES),
      status: cleanText(data.status, 40),
      read: data.read === true,
      createdAt: data.createdAt || null
    };
  });
}

async function getAdminIdToken(forceRefresh = false) {
  const user = auth.currentUser || await waitForAuth();
  const admin = await readAdmin(user);
  if (!admin) throw new Error("Not authorized to use CoverMate admin APIs.");
  if (!user || typeof user.getIdToken !== "function") {
    throw new Error("Firebase ID token is unavailable.");
  }
  return user.getIdToken(forceRefresh === true);
}

async function loadOperationalLeads(limitCount = LEAD_LIMIT) {
  const user = auth.currentUser || await waitForAuth();
  const admin = await readAdmin(user);
  if (!admin) throw new Error("Not authorized to read CoverMate operational leads.");
  const q = firestoreMod.query(
    firestoreMod.collection(db, LEAD_COLLECTION),
    firestoreMod.orderBy("createdAt", "desc"),
    firestoreMod.limit(Math.max(1, Math.min(LEAD_LIMIT, Number(limitCount) || LEAD_LIMIT)))
  );
  const snap = await firestoreMod.getDocs(q);
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      name: cleanText(data.name, 120),
      contact: cleanText(data.contact, 160),
      topic: cleanText(data.topic, 2000),
      qtype: cleanLeadChoice(data.qtype, LEAD_QTYPES),
      coverage: cleanLeadChoice(data.coverage, LEAD_COVERAGES),
      consent: data.consent === true,
      language: cleanLeadChoice(data.language, LEAD_LANGS) || "th",
      summary: cleanText(data.summary, 1200),
      sourcePath: cleanText(data.sourcePath, 220),
      status: cleanText(data.status, 40),
      read: data.read === true,
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null
    };
  });
}

async function hydrateLocalContent(options = {}) {
  const mode = {
    draft: options.draft === true,
    versions: options.versions === true
  };
  const result = {
    live: false,
    draft: false,
    versions: false,
    source: "remote",
    environment: COVERMATE_ENVIRONMENT.name,
    siteId: SITE_ID
  };
  const live = await loadSiteState("live");
  if (validStateDoc(live)) {
    result.live = cacheState("live", live);
  }
  if (mode.draft) {
    const draft = await loadSiteState("draft");
    if (validStateDoc(draft)) {
      result.draft = cacheState("draft", draft);
    } else if (result.live) {
      removeKey(DRAFT_CONFIG_KEY);
      removeKey(DRAFT_TEXT_KEY);
    }
  }
  if (mode.versions) {
    result.versions = cacheVersions(await loadVersions(HISTORY_LIMIT));
  }
  window.__covermateRemoteContent = result;
  try {
    window.dispatchEvent(new CustomEvent("covermate:remote-content-ready", { detail: result }));
  } catch {
    // Non-browser test contexts may not support CustomEvent; cache writes above
    // are still the authoritative hydration result.
  }
  return result;
}

window.CoverMateEnvironment = COVERMATE_ENVIRONMENT;
window.CoverMateFirebase = {
  app,
  auth,
  db,
  config: FIREBASE_CONFIG,
  environment: COVERMATE_ENVIRONMENT,
  readSession,
  clearSession,
  waitForAuth,
  syncSessionFromCurrentUser,
  signInAdmin,
  signOut,
  userIsAdmin,
  loadSiteState,
  saveSiteState,
  resetDraftToPublished,
  appendVersion,
  publishSiteState,
  loadVersions,
  submitContactLead,
  loadContactLeads,
  getAdminIdToken,
  loadOperationalLeads,
  hydrateLocalContent
};

window.dispatchEvent(new CustomEvent("covermate-firebase-ready"));
