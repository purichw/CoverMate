export const SESSION_KEY = "covermate-admin-session";
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export const ADMIN_EVER_KEY = "purich-admin-ever-v7";
export const LIVE_CONFIG_KEY = "purich-live-config-v3";
export const LIVE_TEXT_KEY = "purich-live-text-v3";
export const DRAFT_CONFIG_KEY = "purich-draft-config-v3";
export const DRAFT_TEXT_KEY = "purich-draft-text-v3";
export const HISTORY_KEY = "purich-history-v3";
export const HISTORY_LIMIT = 20;

export const OWNER_HASHES = new Set(["#admin", "#edit", "#preview"]);

function storage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function isOwnerHash(hash = "") {
  return OWNER_HASHES.has(hash || "");
}

export function readJSON(key) {
  try {
    const store = storage();
    const raw = store ? store.getItem(key) : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key, value) {
  try {
    const store = storage();
    if (store) store.setItem(key, JSON.stringify(value));
  } catch {
    // Local cache is best effort; Firestore remains source of truth.
  }
}

export function removeKey(key) {
  try {
    const store = storage();
    if (store) store.removeItem(key);
  } catch {
    // best effort only
  }
}

export function readAdminSession(now = Date.now()) {
  const session = readJSON(SESSION_KEY);
  if (!session || Number(session.exp || 0) <= now) return null;
  return session;
}

export function buildAdminSession(user = {}, admin = {}, now = Date.now()) {
  return {
    firebase: true,
    uid: user.uid,
    email: user.email || "",
    name: user.displayName || "",
    pic: user.photoURL || "",
    role: admin.role || "admin",
    ts: now,
    exp: now + SESSION_MS
  };
}

export function writeAdminSession(user, admin) {
  const session = buildAdminSession(user, admin);
  writeJSON(SESSION_KEY, session);
  return session;
}

export function clearAdminChromeState() {
  removeKey(ADMIN_EVER_KEY);
}

export function clearAdminSession() {
  removeKey(SESSION_KEY);
  clearAdminChromeState();
}

export function cleanText(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.slice(0, limit);
}

export function cleanLeadChoice(value, allowed) {
  const text = cleanText(value, 40);
  return allowed.has(text) ? text : "";
}

export function validStateDoc(doc) {
  return Boolean(doc && doc.config && Array.isArray(doc.config.sections));
}

export function cloneJSON(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

export function sanitizeMotorCountText(text) {
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

export function sanitizeMotorCountConfig(config) {
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

export function sanitizeStateDoc(state) {
  if (!state || !state.config) return state;
  return {
    ...state,
    config: sanitizeMotorCountConfig(state.config),
    text: sanitizeMotorCountText(state.text || {})
  };
}

export function cacheSiteState(name, state) {
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

export function cacheVersions(versions, limit = HISTORY_LIMIT) {
  if (!Array.isArray(versions)) return false;
  writeJSON(HISTORY_KEY, versions.slice(0, limit));
  return true;
}

const contract = {
  SESSION_KEY,
  SESSION_MS,
  ADMIN_EVER_KEY,
  LIVE_CONFIG_KEY,
  LIVE_TEXT_KEY,
  DRAFT_CONFIG_KEY,
  DRAFT_TEXT_KEY,
  HISTORY_KEY,
  HISTORY_LIMIT,
  OWNER_HASHES,
  isOwnerHash,
  readJSON,
  writeJSON,
  removeKey,
  readAdminSession,
  buildAdminSession,
  writeAdminSession,
  clearAdminChromeState,
  clearAdminSession,
  cleanText,
  cleanLeadChoice,
  validStateDoc,
  cloneJSON,
  sanitizeMotorCountText,
  sanitizeMotorCountConfig,
  sanitizeStateDoc,
  cacheSiteState,
  cacheVersions
};

if (typeof window !== "undefined") {
  window.CoverMateContract = contract;
}

export default contract;
