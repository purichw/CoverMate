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

const REPEATABLE_COLLECTION_KEYS = ["items", "cards", "heads"];
const REPEATABLE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{1,96}$/;

function repeatableSlug(value, fallback = "item") {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return slug || fallback;
}

function randomRepeatableToken() {
  const cryptoRef = typeof globalThis !== "undefined" ? globalThis.crypto : null;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") {
    return cryptoRef.randomUUID().replace(/-/g, "").slice(0, 14);
  }
  if (cryptoRef && typeof cryptoRef.getRandomValues === "function") {
    const values = new Uint32Array(2);
    cryptoRef.getRandomValues(values);
    return Array.from(values, (value) => value.toString(36).padStart(7, "0")).join("").slice(0, 14);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 14);
}

export function validRepeatableContentId(value) {
  return typeof value === "string" && REPEATABLE_ID_RE.test(value.trim());
}

export function createRepeatableContentId(section, collectionKey, used = new Set()) {
  const sectionSlug = repeatableSlug(
    (section && (section.id || section.type)) || "section",
    "section"
  );
  const collectionSlug = repeatableSlug(collectionKey, "items");
  let id = "";
  do {
    id = `cmr-${sectionSlug}-${collectionSlug}-${randomRepeatableToken()}`;
  } while (used.has(id));
  used.add(id);
  return id;
}

export function ensureRepeatableContentIds(config, options = {}) {
  const next = options.mutate ? (config || {}) : cloneJSON(config || {});
  const sections = Array.isArray(next.sections) ? next.sections : [];
  sections.forEach((section) => {
    if (!section || typeof section !== "object") return;
    REPEATABLE_COLLECTION_KEYS.forEach((collectionKey) => {
      const list = section[collectionKey];
      if (!Array.isArray(list) || !list.length) return;
      const used = new Set();
      list.forEach((entry) => {
        if (!entry || typeof entry !== "object") return;
        const current = typeof entry.id === "string" ? entry.id.trim() : "";
        if (validRepeatableContentId(current) && !used.has(current)) {
          entry.id = current;
          used.add(current);
          return;
        }
        entry.id = createRepeatableContentId(section, collectionKey, used);
      });
    });
  });
  return next;
}

export const MOTOR_INSURER_LOGO_COUNT_FALLBACK = 14;
export const DEFAULT_ADVISOR_LOGO = "assets/logos/aia-logo.png";
export const DEFAULT_ADVISOR_LOGO_ALT = "AIA";
export const DEFAULT_CONTACT = {
  lineId: "@CoverMate",
  lineUrl: "https://line.me/ti/p/~purich",
  facebookName: "CoverMate Insurance",
  facebookUrl: "https://www.facebook.com/covermate",
  whatsapp: "",
  phone: "08X-XXX-XXXX",
  email: "purich@example.com"
};
export const DEFAULT_SEO = {
  title: { th: "", en: "" },
  description: { th: "", en: "" }
};
export const PROTECTED_BRAND_CREDENTIAL = {
  th: "ตัวแทน AIA · นายหน้าประกันรถยนต์ · ดูแลถึงการเคลม",
  en: "AIA agent · motor broker · support through claims"
};
export const PROTECTED_FOOTER_LEGAL = {
  th: "CoverMate · ตัวแทนประกันชีวิตและนายหน้าประกันวินาศภัยที่ได้รับใบอนุญาต · ใบอนุญาตตัวแทนประกันชีวิต 6401006221 · ใบอนุญาตนายหน้าประกันวินาศภัย 6804008544 · ประกันรถยนต์จัดผ่านศรีกรุงโบรคเกอร์ ใบอนุญาตนายหน้าประกันวินาศภัยเลขที่ ว00287/2534 · เนื้อหาบนหน้านี้เป็นข้อมูลเบื้องต้น ไม่ใช่ใบเสนอราคา",
  en: "CoverMate — insurance advisory · Licensed life agent (No. 6401006221) and non-life broker (No. 6804008544) · Motor cover placed through Srikrung Broker, non-life broker licence No. ว00287/2534 · Information here is indicative and is not a quotation."
};

export function motorInsurerLogoCount(config) {
  const sections = Array.isArray(config && config.sections) ? config.sections : [];
  const insurerSection = sections.find((section) =>
    section && (section.id === "insurers" || section.type === "insurers")
  );
  const items = Array.isArray(insurerSection && insurerSection.items)
    ? insurerSection.items
    : [];
  const count = items.filter((item) => item && item.on !== false && String(item.logo || "").trim()).length;
  return count || MOTOR_INSURER_LOGO_COUNT_FALLBACK;
}

function normalizeMotorCountCopy(value, count = MOTOR_INSURER_LOGO_COUNT_FALLBACK) {
  if (typeof value !== "string") return value;
  const text = value;
  const isMotorCountCopy =
    /ประกันรถยนต์|บริษัท|นายหน้า|เทียบ|motor|insurer|broker|compare/i.test(text) &&
    /(\d+\+?|\d+\s*เจ้า)/.test(text);
  if (!isMotorCountCopy) return text;
  return text
    .replace(/กว่า\s*\d+\s*เจ้า/g, `กว่า ${count} เจ้า`)
    .replace(/บริษัทกว่า\s*\d+\s*เจ้า/g, `บริษัทกว่า ${count} เจ้า`)
    .replace(/เทียบได้กว่า\s*\d+\s*เจ้า/g, `เทียบได้กว่า ${count} เจ้า`)
    .replace(/เทียบเบี้ยได้กว่า\s*\d+\s*เจ้า/g, `เทียบเบี้ยได้กว่า ${count} เจ้า`)
    .replace(/กว่า\s*\d+\s*บริษัท/g, `กว่า ${count} บริษัท`)
    .replace(/\b\d+\+\s*insurers?\b/gi, `${count} insurers`)
    .replace(/\b\d+\s*insurers?\b/gi, `${count} insurers`)
    .replace(/across\s*\d+\+?/gi, `across ${count}`)
    .replace(/through\s*\d+\+?\s*insurers/gi, `through ${count} insurers`)
    .replace(/compared across\s*\d+\+?/gi, `compared across ${count}`);
}

function normalizeLocalizedStrings(target, count) {
  if (!target || typeof target !== "object") return;
  Object.keys(target).forEach((key) => {
    const value = target[key];
    if (typeof value === "string") {
      target[key] = normalizeMotorCountCopy(value, count);
    } else if (value && typeof value === "object") {
      normalizeLocalizedStrings(value, count);
    }
  });
}

function cleanMediaReference(value, fallback = "") {
  const text = cleanText(value, 500);
  if (!text) return fallback;
  if (/^(data|javascript|vbscript|file):/i.test(text)) return fallback;
  if (/[\u0000-\u001f<>"'\\]/.test(text) || text.includes("..")) return fallback;
  if (/^https:\/\//i.test(text)) return text;
  const normalized = text.replace(/^\.\//, "").replace(/^\/+/, "");
  if (/^assets\/[A-Za-z0-9._~!$&()*+,;=:@/%-]+$/.test(normalized)) return normalized;
  return fallback;
}

function cleanHttpsUrl(value, fallback = "") {
  const text = cleanText(value, 500);
  if (!text) return fallback;
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.href : fallback;
  } catch {
    return fallback;
  }
}

function cleanPhoneLike(value, fallback = "") {
  const text = cleanText(value, 80).replace(/[^0-9+() xX-]/g, "").trim();
  return text || fallback;
}

function cleanEmailAddress(value, fallback = "") {
  const text = cleanText(value, 160);
  if (!text) return fallback;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return text;
  return fallback;
}

function cleanLocalizedSeo(value, limit) {
  const source = value && typeof value === "object" ? value : {};
  return {
    th: cleanText(source.th, limit),
    en: cleanText(source.en, limit)
  };
}

function protectCredential(value, lang) {
  const text = cleanText(value, 180);
  if (!text) return PROTECTED_BRAND_CREDENTIAL[lang];
  if (lang === "th") {
    return /AIA/.test(text) && /นายหน้า|ประกันรถยนต์/.test(text)
      ? text
      : PROTECTED_BRAND_CREDENTIAL.th;
  }
  return /AIA/i.test(text) && /(broker|motor)/i.test(text)
    ? text
    : PROTECTED_BRAND_CREDENTIAL.en;
}

function protectFooterLegal(value, lang) {
  const text = cleanText(value, 1200).split("5704011570").join("ว00287/2534");
  const required = ["6401006221", "6804008544", "ว00287/2534"];
  if (required.every((token) => text.includes(token))) return text;
  return PROTECTED_FOOTER_LEGAL[lang];
}

export function sanitizeCmsControlsConfig(config, options = {}) {
  const next = options.mutate ? (config || {}) : cloneJSON(config || {});
  next.brand = next.brand && typeof next.brand === "object" ? next.brand : {};
  next.contact = next.contact && typeof next.contact === "object" ? next.contact : {};
  next.footer = next.footer && typeof next.footer === "object" ? next.footer : {};
  next.seo = next.seo && typeof next.seo === "object" ? next.seo : {};

  next.brand.advisorLogo = cleanMediaReference(next.brand.advisorLogo, DEFAULT_ADVISOR_LOGO);
  next.brand.advisorLogoAlt = cleanText(next.brand.advisorLogoAlt || DEFAULT_ADVISOR_LOGO_ALT, 120) || DEFAULT_ADVISOR_LOGO_ALT;
  next.brand.credential = next.brand.credential && typeof next.brand.credential === "object"
    ? next.brand.credential
    : {};
  next.brand.credential.th = protectCredential(next.brand.credential.th, "th");
  next.brand.credential.en = protectCredential(next.brand.credential.en, "en");

  next.contact.lineId = cleanText(next.contact.lineId || DEFAULT_CONTACT.lineId, 80) || DEFAULT_CONTACT.lineId;
  next.contact.lineUrl = cleanHttpsUrl(next.contact.lineUrl, DEFAULT_CONTACT.lineUrl);
  next.contact.facebookName = cleanText(next.contact.facebookName || "", 120);
  next.contact.facebookUrl = cleanHttpsUrl(next.contact.facebookUrl, "");
  next.contact.whatsapp = cleanPhoneLike(next.contact.whatsapp, "");
  next.contact.phone = cleanPhoneLike(next.contact.phone, DEFAULT_CONTACT.phone);
  next.contact.email = cleanEmailAddress(next.contact.email, DEFAULT_CONTACT.email);

  next.seo.title = cleanLocalizedSeo(next.seo.title, 68);
  next.seo.description = cleanLocalizedSeo(next.seo.description, 155);

  next.footer.legal = next.footer.legal && typeof next.footer.legal === "object"
    ? next.footer.legal
    : {};
  next.footer.legal.th = protectFooterLegal(next.footer.legal.th, "th");
  next.footer.legal.en = protectFooterLegal(next.footer.legal.en, "en");

  if (Array.isArray(next.sections)) {
    next.sections.forEach((section) => {
      if (!section || typeof section !== "object") return;
      if (section.type === "insurers") {
        if (Array.isArray(section.items)) {
          section.items.forEach((item) => {
            if (!item || typeof item !== "object") return;
            item.logo = cleanMediaReference(item.logo, "");
          });
        }
        if (Array.isArray(section.cards)) {
          section.cards.forEach((card) => {
            if (!card || typeof card !== "object") return;
            card.logo = cleanMediaReference(card.logo, "");
            card.logoAlt = cleanText(card.logoAlt || "", 120);
          });
        }
      }
    });
  }
  return next;
}

export function sanitizeMotorCountText(text, configOrCount) {
  const next = cloneJSON(text || {});
  const count = typeof configOrCount === "number"
    ? configOrCount
    : motorInsurerLogoCount(configOrCount || {});
  Object.keys(next).forEach((key) => {
    const value = String(next[key] || "");
    const isInsurerInlineText = /^insurers:\d+:(th|en)$/.test(key);
    const isContactTitleText = /^talk:\d+:(th|en)$/.test(key);
    if (isInsurerInlineText) {
      next[key] = normalizeMotorCountCopy(value, count);
    }
    if (isContactTitleText &&
      (/ขอรับ\s*\n\s*คำปรึกษา/.test(value) || /Request a\s*\n\s*consultation/i.test(value))
    ) {
      next[key] = value
        .replace(/ขอรับ\s*\n\s*คำปรึกษา/g, "ขอรับคำปรึกษา")
        .replace(/Request a\s*\n\s*consultation/gi, "Request a consultation");
    }
  });
  return next;
}

export function sanitizeMotorCountConfig(config, options = {}) {
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
    const insurerCount = motorInsurerLogoCount(next);
    next.sections.forEach((section) => {
      if (!section || (section.id !== "insurers" && section.type !== "insurers")) return;
      normalizeLocalizedStrings(section.th, insurerCount);
      normalizeLocalizedStrings(section.en, insurerCount);
      normalizeLocalizedStrings(section.items, insurerCount);
      normalizeLocalizedStrings(section.cards, insurerCount);
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
  sanitizeCmsControlsConfig(next, { mutate: true });
  if (options && options.repeatableIds) {
    ensureRepeatableContentIds(next, { mutate: true });
  }
  return next;
}

export function sanitizeStateDoc(state) {
  if (!state || !state.config) return state;
  const config = sanitizeMotorCountConfig(state.config);
  return {
    ...state,
    config,
    text: sanitizeMotorCountText(state.text || {}, config)
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
  validRepeatableContentId,
  createRepeatableContentId,
  ensureRepeatableContentIds,
  MOTOR_INSURER_LOGO_COUNT_FALLBACK,
  motorInsurerLogoCount,
  DEFAULT_ADVISOR_LOGO,
  DEFAULT_ADVISOR_LOGO_ALT,
  DEFAULT_CONTACT,
  DEFAULT_SEO,
  PROTECTED_BRAND_CREDENTIAL,
  PROTECTED_FOOTER_LEGAL,
  sanitizeMotorCountText,
  sanitizeCmsControlsConfig,
  sanitizeMotorCountConfig,
  sanitizeStateDoc,
  cacheSiteState,
  cacheVersions
};

if (typeof window !== "undefined") {
  window.CoverMateContract = contract;
}

export default contract;
