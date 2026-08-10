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
  sanitizeMotorCountConfig,
  sanitizeMotorCountText,
  validStateDoc,
  writeAdminSession as writeSession
} from "./covermate-contract.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDpHoXdw0T8UUqNH6-OAhqT-XEJgwmzGIM",
  authDomain: "covermate-purich.firebaseapp.com",
  projectId: "covermate-purich",
  storageBucket: "covermate-purich.firebasestorage.app",
  messagingSenderId: "7468452473",
  appId: "1:7468452473:web:52b47eef5362d4029fe2a8",
  measurementId: "G-5TF3C235EF"
};

const FIREBASE_VERSION = "12.16.0";
const LEAD_LIMIT = 250;

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
  return admin.active === true ? admin : null;
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
  return firestoreMod.doc(db, "sites", "covermate", "states", name);
}

async function loadSiteState(name) {
  const snap = await firestoreMod.getDoc(stateRef(name));
  return snap.exists() ? (snap.data() || null) : null;
}

async function saveSiteState(name, config, text) {
  const user = auth.currentUser || await waitForAuth();
  const admin = await readAdmin(user);
  if (!admin) throw new Error("Not authorized to save CoverMate content.");
  const cleanConfig = sanitizeMotorCountConfig(config, { repeatableIds: true });
  const cleanText = sanitizeMotorCountText(text || {}, cleanConfig);
  const payload = {
    config: cleanConfig,
    text: cleanText,
    updatedAt: firestoreMod.serverTimestamp(),
    updatedBy: {
      uid: user.uid,
      email: user.email || "",
      role: admin.role || "admin"
    }
  };
  await firestoreMod.setDoc(stateRef(name), payload, { merge: true });
  cacheState(name, payload);
}

function versionRef() {
  return firestoreMod.doc(firestoreMod.collection(db, "sites", "covermate", "versions"));
}

async function appendVersion(config, text, metadata = {}) {
  const user = auth.currentUser || await waitForAuth();
  const admin = await readAdmin(user);
  if (!admin) throw new Error("Not authorized to publish CoverMate content.");
  const cleanConfig = sanitizeMotorCountConfig(config, { repeatableIds: true });
  const cleanText = sanitizeMotorCountText(text || {}, cleanConfig);
  const ref = versionRef();
  const version = {
    config: cleanConfig,
    text: cleanText,
    ts: Date.now(),
    createdAt: firestoreMod.serverTimestamp(),
    createdBy: {
      uid: user.uid,
      email: user.email || "",
      role: admin.role || "admin"
    },
    ...metadata
  };
  await firestoreMod.setDoc(ref, version);
  return { id: ref.id, ...version };
}

async function publishSiteState(config, text, metadata = {}) {
  const user = auth.currentUser || await waitForAuth();
  const admin = await readAdmin(user);
  if (!admin) throw new Error("Not authorized to publish CoverMate content.");
  const cleanConfig = sanitizeMotorCountConfig(config, { repeatableIds: true });
  const cleanText = sanitizeMotorCountText(text || {}, cleanConfig);
  const ref = versionRef();
  const ts = Date.now();
  const by = {
    uid: user.uid,
    email: user.email || "",
    role: admin.role || "admin"
  };
  const livePayload = {
    config: cleanConfig,
    text: cleanText,
    updatedAt: firestoreMod.serverTimestamp(),
    updatedBy: by
  };
  const version = {
    config: cleanConfig,
    text: cleanText,
    ts,
    createdAt: firestoreMod.serverTimestamp(),
    createdBy: by,
    ...metadata
  };
  const batch = firestoreMod.writeBatch(db);
  batch.set(stateRef("live"), livePayload, { merge: true });
  batch.set(stateRef("draft"), livePayload, { merge: true });
  batch.set(ref, version);
  await batch.commit();
  cacheState("live", livePayload);
  cacheState("draft", livePayload);
  const cachedHistory = readJSON(HISTORY_KEY);
  if (Array.isArray(cachedHistory)) {
    cachedHistory.unshift({ id: ref.id, ...version });
    cacheVersions(cachedHistory);
  }
  return { id: ref.id, ...version };
}

async function loadVersions(limitCount = HISTORY_LIMIT) {
  const q = firestoreMod.query(
    firestoreMod.collection(db, "sites", "covermate", "versions"),
    firestoreMod.orderBy("ts", "desc"),
    firestoreMod.limit(limitCount)
  );
  const snap = await firestoreMod.getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }));
}

async function submitContactLead(input = {}) {
  const sourcePath = cleanText(
    input.sourcePath || window.location.pathname + window.location.search + window.location.hash,
    220
  );
  const payload = {
    name: cleanText(input.name, 120),
    contact: cleanText(input.contact, 160),
    topic: cleanText(input.topic, 2000),
    qtype: cleanLeadChoice(input.qtype, LEAD_QTYPES),
    coverage: cleanLeadChoice(input.coverage, LEAD_COVERAGES),
    consent: input.consent === true,
    language: cleanLeadChoice(input.language, LEAD_LANGS) || "th",
    summary: cleanText(input.summary, 1200),
    sourcePath,
    status: "new",
    read: false,
    createdAt: firestoreMod.serverTimestamp(),
    updatedAt: firestoreMod.serverTimestamp()
  };
  const ref = await firestoreMod.addDoc(firestoreMod.collection(db, "contactLeads"), payload);
  return { id: ref.id, ...payload };
}

async function loadContactLeads(limitCount = LEAD_LIMIT) {
  const user = auth.currentUser || await waitForAuth();
  const admin = await readAdmin(user);
  if (!admin) throw new Error("Not authorized to read CoverMate leads.");
  const q = firestoreMod.query(
    firestoreMod.collection(db, "contactLeads"),
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

async function hydrateLocalContent(options = {}) {
  const mode = {
    draft: options.draft === true,
    versions: options.versions === true
  };
  const result = {
    live: false,
    draft: false,
    versions: false,
    source: "remote"
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

window.CoverMateFirebase = {
  app,
  auth,
  db,
  config: FIREBASE_CONFIG,
  readSession,
  clearSession,
  waitForAuth,
  syncSessionFromCurrentUser,
  signInAdmin,
  signOut,
  userIsAdmin,
  loadSiteState,
  saveSiteState,
  appendVersion,
  publishSiteState,
  loadVersions,
  submitContactLead,
  loadContactLeads,
  hydrateLocalContent
};

window.dispatchEvent(new CustomEvent("covermate-firebase-ready"));
