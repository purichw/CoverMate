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
const SESSION_KEY = "covermate-admin-session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const LIVE_CONFIG_KEY = "purich-live-config-v3";
const LIVE_TEXT_KEY = "purich-live-text-v3";
const DRAFT_CONFIG_KEY = "purich-draft-config-v3";
const DRAFT_TEXT_KEY = "purich-draft-text-v3";
const HISTORY_KEY = "purich-history-v3";
const HISTORY_LIMIT = 20;
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

function readSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    const session = raw ? JSON.parse(raw) : null;
    if (!session || session.exp <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function writeSession(user, admin) {
  const session = {
    firebase: true,
    uid: user.uid,
    email: user.email || "",
    name: user.displayName || "",
    pic: user.photoURL || "",
    role: admin.role || "admin",
    ts: Date.now(),
    exp: Date.now() + SESSION_MS
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem("purich-admin-ever-v7");
  } catch {
    // best effort only
  }
}

function readJSON(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best effort only; remote state remains the source of truth
  }
}

function removeKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // best effort only
  }
}

function cleanText(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.slice(0, limit);
}

function cleanLeadChoice(value, allowed) {
  const text = cleanText(value, 40);
  return allowed.has(text) ? text : "";
}

function validStateDoc(doc) {
  return Boolean(doc && doc.config && Array.isArray(doc.config.sections));
}

function cloneJSON(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function sanitizeMotorCountText(text) {
  const next = cloneJSON(text || {});
  Object.keys(next).forEach((key) => {
    const value = String(next[key] || "");
    const isInsurerInlineText = /^insurers:\d+:(th|en)$/.test(key);
    const isContactTitleText = /^talk:\d+:(th|en)$/.test(key);
    if (isInsurerInlineText && (
      /เทียบได้กว่า\s*(14|20)\s*เจ้า/.test(value) ||
      /บริษัทกว่า\s*(14|20)\s*เจ้า/.test(value) ||
      /compared across\s*(14|20)\+?/i.test(value) ||
      /through\s*(14|20)\+?\s*insurers/i.test(value)
    )) {
      delete next[key];
    }
    if (isContactTitleText &&
      (/ขอรับ\s*\n\s*คำปรึกษา/.test(value) || /Request a\s*\n\s*consultation/i.test(value))
    ) {
      delete next[key];
    }
  });
  return next;
}

function sanitizeMotorCountConfig(config) {
  const next = cloneJSON(config || {});
  if (next.header && Array.isArray(next.header.nav)) {
    const seen = new Set();
    next.header.nav = next.header.nav.reduce((items, item) => {
      if (!item) return items;
      const normalized = cloneJSON(item);
      if (normalized.href === "#motor") normalized.href = "#insurers";
      const key = normalized.href || JSON.stringify(normalized.label || {});
      if (seen.has(key)) return items;
      seen.add(key);
      items.push(normalized);
      return items;
    }, []);
  }
  if (Array.isArray(next.sections)) {
    next.sections.forEach((section) => {
      if (!section || (section.id !== "insurers" && section.type !== "insurers")) return;
      if (section.th) {
        if (/เทียบได้กว่า\s*(14|20)\s*เจ้า/.test(String(section.th.title || ""))) {
          section.th.title = "ประกันรถยนต์\nเทียบได้กว่า 26 เจ้า";
        }
        if (/บริษัทกว่า\s*(14|20)\s*เจ้า/.test(String(section.th.body || ""))) {
          section.th.body = "เฉพาะประกันรถยนต์ ผมจัดผ่านบริษัทกว่า 26 เจ้า จึงเสนอตามที่เหมาะกับคุณ ส่วนชีวิตและสุขภาพ ผมเป็นตัวแทน AIA โดยเฉพาะ";
        }
      }
      if (section.en) {
        if (/compared across\s*(14|20)\+?/i.test(String(section.en.title || ""))) {
          section.en.title = "Motor insurance\ncompared across 26+";
        }
        if (/through\s*(14|20)\+?\s*insurers/i.test(String(section.en.body || ""))) {
          section.en.body = "For motor insurance I place through 26+ insurers and recommend what suits you. Life and health I represent AIA exclusively.";
        }
      }
    });
    next.sections.forEach((section) => {
      if (!section || (section.id !== "talk" && section.type !== "contact")) return;
      if (section.th && /ขอรับ\s*\n\s*คำปรึกษา/.test(String(section.th.title || ""))) {
        section.th.title = "ขอรับคำปรึกษา";
      }
      if (section.en && /Request a\s*\n\s*consultation/i.test(String(section.en.title || ""))) {
        section.en.title = "Request a consultation";
      }
    });
  }
  return next;
}

function sanitizeStateDoc(state) {
  if (!state || !state.config) return state;
  return {
    ...state,
    config: sanitizeMotorCountConfig(state.config),
    text: sanitizeMotorCountText(state.text || {})
  };
}

function cacheState(name, state) {
  const clean = sanitizeStateDoc(state);
  if (!validStateDoc(clean)) return false;
  if (name === "live") {
    writeJSON(LIVE_CONFIG_KEY, clean.config);
    writeJSON(LIVE_TEXT_KEY, clean.text || {});
    return true;
  }
  if (name === "draft") {
    writeJSON(DRAFT_CONFIG_KEY, clean.config);
    writeJSON(DRAFT_TEXT_KEY, clean.text || {});
    return true;
  }
  return false;
}

function cacheVersions(versions) {
  if (!Array.isArray(versions)) return false;
  writeJSON(HISTORY_KEY, versions.slice(0, HISTORY_LIMIT));
  return true;
}

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
  const cleanConfig = sanitizeMotorCountConfig(config);
  const cleanText = sanitizeMotorCountText(text || {});
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
  const cleanConfig = sanitizeMotorCountConfig(config);
  const cleanText = sanitizeMotorCountText(text || {});
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
  const cleanConfig = sanitizeMotorCountConfig(config);
  const cleanText = sanitizeMotorCountText(text || {});
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
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }));
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
