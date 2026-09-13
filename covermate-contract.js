export const SESSION_KEY = "covermate-admin-session";
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export const ADMIN_EVER_KEY = "purich-admin-ever-v7";
export const LIVE_CONFIG_KEY = "purich-live-config-v3";
export const LIVE_TEXT_KEY = "purich-live-text-v3";
export const DRAFT_CONFIG_KEY = "purich-draft-config-v3";
export const DRAFT_TEXT_KEY = "purich-draft-text-v3";
export const HISTORY_KEY = "purich-history-v3";
export const HISTORY_LIMIT = 20;

export const ADMIN_ROOT_PATH = "/admin";
export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_OPERATIONS_PATH = "/admin/ops";
export const ADMIN_ANALYTICS_PATH = "/admin/analytics";
export const ADMIN_PUBLIC_EXIT_PATH = "/";
export const PUBLIC_HOME_PATH = "/";
export const PUBLIC_MOTOR_PATH = "/motor";
export const ADMIN_OWNER_PAGE_QUERY = "page";
export const PUBLIC_ROUTE_PATHS = new Set([PUBLIC_HOME_PATH, PUBLIC_MOTOR_PATH]);
export const ADMIN_OWNER_ROUTE_MAP = Object.freeze({
  "/admin/content": "admin",
  "/admin/edit": "edit",
  "/admin/preview": "preview"
});
export const ADMIN_OWNER_HASH_MAP = Object.freeze({
  "#admin": "admin",
  "#edit": "edit",
  "#preview": "preview"
});
export const ADMIN_OWNER_PATHS = Object.freeze(Object.keys(ADMIN_OWNER_ROUTE_MAP));
export const ADMIN_SHELL_PATHS = new Set([ADMIN_ROOT_PATH, ADMIN_LOGIN_PATH, ADMIN_OPERATIONS_PATH, ADMIN_ANALYTICS_PATH]);
export const OWNER_HASHES = new Set(Object.keys(ADMIN_OWNER_HASH_MAP));
export const OWNER_PATHS = new Set(ADMIN_OWNER_PATHS);
export const ROUTE_PAGE_HOME = "home";
export const ROUTE_PAGE_MOTOR = "motor";
export const ADMIN_PORTAL_MODULES = Object.freeze(["home", "operations", "content", "analytics", "settings"]);
export const ADMIN_PORTAL_OPERATIONS_TABS = Object.freeze(["dashboard", "leads", "tasks", "audit"]);

export function normalizePath(path = "") {
  const clean = String(path || "").replace(/\/+$/, "");
  return clean || "/";
}

export function isOwnerPath(path = "") {
  return Boolean(ownerModeFromPath(path));
}

export function isAdminNamespacePath(path = "") {
  const clean = normalizePath(path);
  return clean === ADMIN_ROOT_PATH || clean.startsWith(`${ADMIN_ROOT_PATH}/`);
}

export function isAdminShellPath(path = "") {
  return ADMIN_SHELL_PATHS.has(normalizePath(path));
}

export function ownerModeFromPath(path = "") {
  return ADMIN_OWNER_ROUTE_MAP[normalizePath(path)] || "";
}

export function ownerPathForMode(mode = "", page = "home") {
  const entry = Object.entries(ADMIN_OWNER_ROUTE_MAP).find(([, value]) => value === mode);
  if (!entry) return "";
  return normalizeRoutePage(page) === ROUTE_PAGE_MOTOR
    ? `${entry[0]}?${ADMIN_OWNER_PAGE_QUERY}=motor`
    : entry[0];
}

export function ownerModeFromHash(hash = "") {
  return ADMIN_OWNER_HASH_MAP[hash || ""] || "";
}

export function normalizeRoutePage(page = ROUTE_PAGE_HOME) {
  return page === ROUTE_PAGE_MOTOR ? ROUTE_PAGE_MOTOR : ROUTE_PAGE_HOME;
}

export function publicPathForRoutePage(page = ROUTE_PAGE_HOME) {
  return normalizeRoutePage(page) === ROUTE_PAGE_MOTOR ? PUBLIC_MOTOR_PATH : PUBLIC_HOME_PATH;
}

export function routePageFromLocationParts(path = "", search = "") {
  const clean = normalizePath(path);
  if (clean === PUBLIC_MOTOR_PATH) return ROUTE_PAGE_MOTOR;
  if (!ownerModeFromPath(clean)) return ROUTE_PAGE_HOME;
  try {
    const params = new URLSearchParams(String(search || ""));
    return normalizeRoutePage(params.get(ADMIN_OWNER_PAGE_QUERY));
  } catch {
    return ROUTE_PAGE_HOME;
  }
}

export function cleanPublicExitPath(path = PUBLIC_HOME_PATH) {
  const clean = normalizePath(path);
  return clean === PUBLIC_MOTOR_PATH ? PUBLIC_MOTOR_PATH : PUBLIC_HOME_PATH;
}

export function adminPortalRouteStateFromLocation(path = "", hash = "") {
  const rawHash = decodeURIComponent(String(hash || "").replace(/^#/, "")).trim();
  const hashKey = rawHash.split(/[?&]/)[0];
  const base = {
    module: normalizePath(path) === ADMIN_OPERATIONS_PATH ? "operations" : "home",
    operationsTab: "dashboard"
  };
  if (!hashKey) return base;
  if (ADMIN_PORTAL_OPERATIONS_TABS.includes(hashKey)) {
    return { module: "operations", operationsTab: hashKey };
  }
  if (hashKey === "operations") return { module: "operations", operationsTab: "dashboard" };
  if (ADMIN_PORTAL_MODULES.includes(hashKey)) {
    return { module: hashKey, operationsTab: "dashboard" };
  }
  return base;
}

export function adminPortalUrl(module = "home", operationsTab = "dashboard") {
  if (module === "home") return ADMIN_ROOT_PATH;
  if (module === "operations") {
    return operationsTab === "dashboard"
      ? `${ADMIN_ROOT_PATH}#operations`
      : `${ADMIN_ROOT_PATH}#${operationsTab}`;
  }
  return ADMIN_PORTAL_MODULES.includes(module) ? `${ADMIN_ROOT_PATH}#${module}` : ADMIN_ROOT_PATH;
}

function storage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function isOwnerHash(hash = "") {
  return Boolean(ownerModeFromHash(hash));
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
    role: admin.role || "none",
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

function motorLocalSections(config) {
  const page = config && config.motorPage;
  if (!page || typeof page !== "object") return [];
  return [page.hero, page.trust, page.cover].filter((section) =>
    section && typeof section === "object"
  );
}

export function editableContentSections(config) {
  const sections = Array.isArray(config && config.sections) ? config.sections : [];
  return sections.concat(motorLocalSections(config));
}

export function isVisibleSection(section) {
  return Boolean(section && typeof section === "object" && section.on !== false);
}

export function visiblePublicSections(config) {
  const sections = Array.isArray(config && config.sections) ? config.sections : [];
  return sections.filter(isVisibleSection);
}

function sectionHasVisibleItems(section) {
  return !Array.isArray(section && section.items) || section.items.some(isVisibleSection);
}

export function normalizeSectionHref(href = "") {
  const raw = String(href || "").trim();
  if (raw === "#motor") return "#insurers";
  if (raw === "#life") return "#cover";
  return raw;
}

export function isSectionHref(href = "") {
  return /^#[A-Za-z0-9_-]+$/.test(String(href || "").trim());
}

export function visibleSectionAnchorIds(config, options = {}) {
  const visible = visiblePublicSections(config);
  const ids = new Set(visible
    .filter((section) => section.id !== "cover" || sectionHasVisibleItems(section))
    .map((section) => section && section.id)
    .filter(Boolean));
  const heroVisible = visible.some((section) => section && section.type === "hero");
  const embeddedCover = (Array.isArray(config && config.sections) ? config.sections : [])
    .find((section) => section && section.id === "cover");
  const hasEmbeddedCoverAnchor = Boolean(
    heroVisible &&
    isVisibleSection(embeddedCover) &&
    Array.isArray(embeddedCover.items) &&
    embeddedCover.items.some(isVisibleSection)
  );
  if (hasEmbeddedCoverAnchor) ids.add("cover");
  if (options.aliases !== false) {
    if (ids.has("insurers")) ids.add("motor");
    if (ids.has("cover")) ids.add("life");
  }
  return ids;
}

export function sectionHrefAvailable(href = "", configOrAnchorIds = {}) {
  if (!isSectionHref(href)) return true;
  const target = normalizeSectionHref(href).replace(/^#/, "");
  if (target === "top") return true;
  const anchorIds = configOrAnchorIds instanceof Set
    ? configOrAnchorIds
    : visibleSectionAnchorIds(configOrAnchorIds);
  return anchorIds.has(target);
}

export function filterLinksByVisibleSections(links = [], configOrAnchorIds = {}) {
  const anchorIds = configOrAnchorIds instanceof Set
    ? configOrAnchorIds
    : visibleSectionAnchorIds(configOrAnchorIds);
  return (Array.isArray(links) ? links : []).filter((link) =>
    sectionHrefAvailable(link && link.href, anchorIds)
  );
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
  const sections = editableContentSections(next);
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

export function repeatableContentIndex(list, id, fallbackIndex) {
  if (!Array.isArray(list)) return -1;
  if (id) {
    const index = list.findIndex((entry) => entry && entry.id === id);
    if (index >= 0) return index;
  }
  return fallbackIndex >= 0 && fallbackIndex < list.length ? fallbackIndex : -1;
}

export const DEFAULT_ADVISOR_LOGO = "assets/logos/aia-logo.png";
export const DEFAULT_ADVISOR_LOGO_ALT = "AIA";
export const DEFAULT_CONTACT = {
  lineId: "",
  lineUrl: "",
  facebookName: "",
  facebookUrl: "",
  whatsapp: "",
  phone: "",
  email: ""
};

// COVERMATE_CMS_SCHEMA_BEGIN
// Also embedded by the visitor generator so offline and remote reads agree.
const CMS_CONTENT_VERSION = 2;
const CMS_CONTENT_FIELDS = [
  {"path":"publicCopy.consultationSummary","label":"Consultation summary","group":"Form messages","localized":true,"seed":{"th":"สนใจปรึกษาเรื่องประกัน — สถานการณ์: {{situation}} · รายได้ราว {{income}}/เดือน · ทุนชีวิตที่ควรมีประมาณ {{lifeNeed}}","en":"Hi — situation: {{situation}} · income about {{income}}/mo · suggested life cover around {{lifeNeed}}"}},
  {"path":"publicCopy.consultationIntro","label":"Consultation summary without calculator","group":"Form messages","localized":true,"seed":{"th":"สนใจปรึกษาเรื่องประกัน","en":"Hi — I would like to talk about cover."}},
  {"path":"publicCopy.summaryTopic","label":"Summary enquiry label","group":"Form messages","localized":true,"seed":{"th":"เรื่อง:","en":"Enquiry:"}},
  {"path":"publicCopy.summaryCoverage","label":"Summary coverage label","group":"Form messages","localized":true,"seed":{"th":"ความคุ้มครอง:","en":"Coverage:"}},
  {"path":"publicCopy.renewalSummary","label":"Renewal request summary","group":"Form messages","localized":true,"seed":{"th":"ตั้งเตือนต่ออายุ: {{policy}} · หมดอายุเดือน{{month}} · เตือนล่วงหน้า 60 วันพร้อมเทียบเบี้ยใหม่","en":"Renewal reminder: {{policy}} · expires in {{month}} · remind 60 days ahead with a fresh comparison"}},
  {"path":"publicCopy.renewalHint","label":"Renewal selection hint","group":"Form messages","localized":true,"seed":{"th":"เลือกประเภทและเดือนที่หมดอายุ แล้วเราจะเตือนล่วงหน้า 60 วัน","en":"Pick a policy and expiry month and we will remind you 60 days ahead."}},
  {"path":"publicCopy.renewalPreview","label":"Renewal summary preview","group":"Form messages","localized":true,"seed":{"th":"จะเตือนเรื่อง {{policy}} ล่วงหน้า 60 วันก่อนสิ้นเดือน{{month}} พร้อมเทียบเบี้ยใหม่ให้","en":"We will remind you about {{policy}} 60 days before the end of {{month}}, with a fresh comparison."}},
  {"path":"lifeFocus.kicker","label":"Eyebrow","group":"Life focus","localized":true,"legacyInline":true,"seed":{"th":"ชีวิต · สุขภาพ · ตัวแทน AIA","en":"Life · health · AIA agent"}},
  {"path":"lifeFocus.title","label":"Heading","group":"Life focus","localized":true,"legacyInline":true,"seed":{"th":"ตอนที่ต้องใช้จริง\nไม่มีใครอ่านกรมธรรม์ทัน","en":"Nobody reads the policy\nat the moment it matters"}},
  {"path":"lifeFocus.body","label":"Description","group":"Life focus","localized":true,"legacyInline":true,"seed":{"th":"ในฐานะตัวแทน AIA เราดูแลเรื่องชีวิตและสุขภาพเป็นหลัก — เลือกทุนให้พอกับภาระจริง เลือกค่าห้องให้พอกับโรงพยาบาลที่คุณใช้ และอธิบายข้อยกเว้นให้ครบก่อนเซ็น ไม่ใช่หลังเคลม","en":"As an AIA agent, life and health are my main work — matching the sum assured to real obligations, the room rate to the hospital you actually use, and explaining every exclusion before you sign rather than after you claim."}},
  {"path":"lifeFocus.cta1","label":"Primary button","group":"Life focus","localized":true,"legacyInline":true,"seed":{"th":"แอดไลน์ ปรึกษาฟรี","en":"Add me on LINE"}},
  {"path":"lifeFocus.cta2","label":"Secondary button","group":"Life focus","localized":true,"legacyInline":true,"seed":{"th":"คำนวณทุนที่ควรมี","en":"Estimate your cover"}},
  {"path":"lifeFocus.note","label":"Supporting note","group":"Life focus","localized":true,"legacyInline":true,"seed":{"th":"ไม่มีค่าที่ปรึกษา และเราไม่เสนอยูนิตลิงก์","en":"No advisory fee, and Unit-linked plans are not offered."}},
  {"path":"lifeFocus.noUnitLinked","label":"Trust: unit-linked policy","group":"Life focus","localized":true,"legacyInline":true,"seed":{"th":"ไม่เสนอยูนิตลิงก์","en":"No unit-linked plans"}},
  {"path":"lifeFocus.exclusions","label":"Trust: exclusions","group":"Life focus","localized":true,"legacyInline":true,"seed":{"th":"อธิบายข้อยกเว้นก่อนเซ็น","en":"Exclusions explained upfront"}},
  {"path":"lifeFocus.claims","label":"Trust: claims support","group":"Life focus","localized":true,"legacyInline":true,"seed":{"th":"ดูแลต่อเนื่องถึงการเคลม","en":"Support through claims"}},
  {"path":"formOptions.topicPrompt","label":"topicPrompt","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"— เลือกหัวข้อ —","en":"— Select a topic —"}},
  {"path":"formOptions.coveragePrompt","label":"coveragePrompt","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"— เลือกความคุ้มครอง —","en":"— Select coverage —"}},
  {"path":"formOptions.policyPrompt","label":"policyPrompt","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"— ประกันประเภทไหน —","en":"— Which policy —"}},
  {"path":"formOptions.monthPrompt","label":"monthPrompt","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"— หมดอายุเดือนไหน —","en":"— Expires which month —"}},
  {"path":"formOptions.query.quote","label":"query / quote","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"ขอใบเสนอราคา","en":"Request a quote"}},
  {"path":"formOptions.query.compare","label":"query / compare","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"เปรียบเทียบแผน","en":"Compare plans"}},
  {"path":"formOptions.query.general","label":"query / general","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"สอบถามทั่วไป","en":"General question"}},
  {"path":"formOptions.query.review","label":"query / review","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"ทบทวนกรมธรรม์เดิม","en":"Review my existing policy"}},
  {"path":"formOptions.query.claim","label":"query / claim","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"ช่วยเรื่องเคลม","en":"Help with a claim"}},
  {"path":"formOptions.coverage.life","label":"coverage / life","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"ประกันชีวิต","en":"Life"}},
  {"path":"formOptions.coverage.health","label":"coverage / health","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"ประกันสุขภาพ","en":"Health"}},
  {"path":"formOptions.coverage.motor","label":"coverage / motor","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"ประกันรถยนต์","en":"Motor"}},
  {"path":"formOptions.coverage.accident","label":"coverage / accident","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"ประกันอุบัติเหตุ","en":"Accident"}},
  {"path":"formOptions.coverage.savings","label":"coverage / savings","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"ประกันสะสมทรัพย์","en":"Savings & retirement"}},
  {"path":"formOptions.coverage.unsure","label":"coverage / unsure","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"ยังไม่แน่ใจ","en":"Not sure yet"}},
  {"path":"formOptions.renewal.motor","label":"renewal / motor","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"ประกันรถยนต์","en":"Motor"}},
  {"path":"formOptions.renewal.compulsory","label":"renewal / compulsory","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"พ.ร.บ. รถยนต์","en":"Compulsory (พ.ร.บ.)"}},
  {"path":"formOptions.renewal.health","label":"renewal / health","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"ประกันสุขภาพ","en":"Health"}},
  {"path":"formOptions.renewal.life","label":"renewal / life","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"ประกันชีวิต","en":"Life"}},
  {"path":"formOptions.renewal.accident","label":"renewal / accident","group":"Form choices","localized":true,"legacyInline":true,"seed":{"th":"ประกันอุบัติเหตุ","en":"Personal accident"}},
  {"path":"seo.areaServed","label":"Service area","group":"Business metadata","localized":false,"seed":"Bangkok Metropolitan Region, Thailand"},
  {"path":"seo.knowsAbout","label":"Expertise (one per line)","group":"Business metadata","localized":false,"seed":"AIA life insurance\nAIA health insurance\nMotor insurance comparison\nInsurance claims support"},
  {"path":"seo.homeServiceName","label":"Home service name","group":"Business metadata","localized":true,"seed":{"th":"ที่ปรึกษาประกันชีวิต สุขภาพ และรถยนต์","en":"Life, health, and motor insurance advisory"}},
  {"path":"seo.motorServiceName","label":"Motor service name","group":"Business metadata","localized":true,"seed":{"th":"ที่ปรึกษาและเปรียบเทียบประกันรถยนต์","en":"Motor insurance comparison advisory"}},
  {"path":"seo.homeServiceType","label":"Home service type","group":"Business metadata","localized":false,"seed":"Insurance advisory and motor insurance comparison"},
  {"path":"seo.motorServiceType","label":"Motor service type","group":"Business metadata","localized":false,"seed":"Motor insurance comparison and broker advisory"},
  {"path":"seo.homeAudience","label":"Home audience","group":"Business metadata","localized":false,"seed":"People comparing personal insurance in Thailand"},
  {"path":"seo.motorAudience","label":"Motor audience","group":"Business metadata","localized":false,"seed":"People comparing motor insurance in Thailand"},
  {"path":"publicCopy.calcSituation","label":"Situation","group":"Calculator labels","localized":true,"legacyInline":true,"seed":{"th":"1 · ตอนนี้คุณอยู่ช่วงไหน","en":"1 · Where are you right now?"}},
  {"path":"publicCopy.calcInputs","label":"Inputs","group":"Calculator labels","localized":true,"legacyInline":true,"seed":{"th":"2 · ข้อมูลสำหรับคำนวณเบื้องต้น","en":"2 · Inputs for the first estimate"}},
  {"path":"publicCopy.calcSpending","label":"Spending","group":"Calculator labels","localized":true,"legacyInline":true,"seed":{"th":"ค่าใช้จ่ายจำเป็นต่อเดือน","en":"Essential monthly spending"}},
  {"path":"publicCopy.calcYears","label":"Years","group":"Calculator labels","localized":true,"legacyInline":true,"seed":{"th":"ต้องดูแลต่ออีกกี่ปี","en":"Years of support"}},
  {"path":"publicCopy.calcDebt","label":"Debt","group":"Calculator labels","localized":true,"legacyInline":true,"seed":{"th":"หนี้และภาระอนาคต","en":"Debts and future obligations"}},
  {"path":"publicCopy.calcResources","label":"Resources","group":"Calculator labels","localized":true,"legacyInline":true,"seed":{"th":"เงินสำรอง + ทุนเดิม","en":"Liquid assets + existing cover"}},
  {"path":"publicCopy.calcRoomBenefit","label":"Room Benefit","group":"Calculator labels","localized":true,"legacyInline":true,"seed":{"th":"ค่าห้องในกรมธรรม์เดิม","en":"Current room benefit"}},
  {"path":"publicCopy.calcRecovery","label":"Recovery","group":"Calculator labels","localized":true,"legacyInline":true,"seed":{"th":"ระยะพักฟื้นที่ต้องมีเงินรองรับ","en":"Recovery period to fund"}},
  {"path":"publicCopy.calcHint","label":"Hint","group":"Calculator labels","localized":true,"legacyInline":false,"seed":{"th":"เลือกช่วงชีวิตหนึ่งข้อ แล้วปรับตัวเลขด้านซ้ายเพื่อดูฐานคุ้มครองเบื้องต้น","en":"Pick a situation, then adjust the inputs to see a starting estimate."}},
  {"path":"publicCopy.calcEstimateFor","label":"Estimate For","group":"Calculator labels","localized":true,"legacyInline":false,"seed":{"th":"ประมาณการสำหรับ","en":"Estimate for"}},
  {"path":"publicCopy.calcLifeNeed","label":"Life Need","group":"Calculator labels","localized":true,"legacyInline":false,"seed":{"th":"ทุนชีวิตที่ควรเริ่มจาก","en":"Life need starting point"}},
  {"path":"publicCopy.calcRoomGap","label":"Room Gap","group":"Calculator labels","localized":true,"legacyInline":false,"seed":{"th":"ส่วนต่างค่าห้องอ้างอิง","en":"Reference room gap"}},
  {"path":"publicCopy.calcCiBuffer","label":"Ci Buffer","group":"Calculator labels","localized":true,"legacyInline":false,"seed":{"th":"เงินก้อนโรคร้ายแรง","en":"CI recovery buffer"}},
  {"path":"publicCopy.calcReference","label":"Reference","group":"Calculator labels","localized":true,"legacyInline":false,"seed":{"th":"แหล่งข้อมูลอ้างอิง","en":"Reference source"}},
  {"path":"publicCopy.calcReview","label":"Review","group":"Calculator labels","localized":true,"legacyInline":false,"seed":{"th":"ข้อที่ควรตรวจต่อ","en":"What to review next"}},
  {"path":"publicCopy.calcSend","label":"Send","group":"Calculator labels","localized":true,"legacyInline":false,"seed":{"th":"ส่งตัวเลขนี้ให้เราดูต่อ","en":"Send us these numbers"}},
  {"path":"publicCopy.renewalTitle","label":"Title","group":"Renewal form labels","localized":true,"legacyInline":true,"seed":{"th":"ตั้งเตือนต่ออายุ","en":"Set a renewal reminder"}},
  {"path":"publicCopy.renewalPolicy","label":"Policy","group":"Renewal form labels","localized":true,"legacyInline":true,"seed":{"th":"กรมธรรม์ประเภทไหน","en":"Which policy"}},
  {"path":"publicCopy.renewalMonth","label":"Month","group":"Renewal form labels","localized":true,"legacyInline":true,"seed":{"th":"หมดอายุเดือนไหน","en":"Expires in"}},
  {"path":"publicCopy.renewalContact","label":"Contact","group":"Renewal form labels","localized":true,"legacyInline":true,"seed":{"th":"LINE ID หรือเบอร์โทร","en":"LINE ID or phone"}},
  {"path":"publicCopy.renewalConsent","label":"Consent","group":"Renewal form labels","localized":true,"legacyInline":false,"seed":{"th":"ยินยอมให้ติดต่อกลับเพื่อแจ้งเตือนต่ออายุ และใช้ข้อมูลนี้เฉพาะการติดตามกรมธรรม์ที่ระบุ","en":"I agree to be contacted about this renewal reminder and to use this information only for the selected policy follow-up."}},
  {"path":"publicCopy.renewalPrivacy","label":"Privacy","group":"Renewal form labels","localized":true,"legacyInline":false,"seed":{"th":"อ่านว่าข้อมูลถูกใช้อะไร","en":"Read how your data is used"}},
  {"path":"publicCopy.renewalSubmit","label":"Submit","group":"Renewal form labels","localized":true,"legacyInline":false,"seed":{"th":"ตั้งเตือนให้เราจำ","en":"Remind me"}},
  {"path":"publicCopy.renewalSuccess","label":"Success","group":"Renewal form labels","localized":true,"legacyInline":false,"seed":{"th":"ตั้งเตือนไว้แล้ว เราจะทักไปก่อน 60 วัน","en":"Set. We will message you 60 days ahead."}},
  {"path":"publicCopy.contactScan","label":"Scan","group":"Consultation form labels","localized":true,"legacyInline":true,"seed":{"th":"สแกนเพื่อแอดไลน์","en":"Scan to add on LINE"}},
  {"path":"publicCopy.contactTitle","label":"Title","group":"Consultation form labels","localized":true,"legacyInline":true,"seed":{"th":"สอบถามหรือขอใบเสนอราคา","en":"Ask a question or request a quotation"}},
  {"path":"publicCopy.contactName","label":"Name","group":"Consultation form labels","localized":true,"legacyInline":true,"seed":{"th":"ชื่อที่ให้เรียก","en":"What should I call you"}},
  {"path":"publicCopy.contactContact","label":"Contact","group":"Consultation form labels","localized":true,"legacyInline":true,"seed":{"th":"LINE ID หรือเบอร์โทร","en":"LINE ID or phone"}},
  {"path":"publicCopy.contactTopic","label":"Topic","group":"Consultation form labels","localized":true,"legacyInline":true,"seed":{"th":"เรื่องที่ต้องการสอบถาม","en":"Type of enquiry"}},
  {"path":"publicCopy.contactCoverage","label":"Coverage","group":"Consultation form labels","localized":true,"legacyInline":true,"seed":{"th":"ความคุ้มครองที่สนใจ","en":"Coverage of interest"}},
  {"path":"publicCopy.contactDetails","label":"Details","group":"Consultation form labels","localized":true,"legacyInline":true,"seed":{"th":"รายละเอียดเพิ่มเติม (ถ้ามี)","en":"Anything else? (optional)"}},
  {"path":"publicCopy.contactPrivacy","label":"Privacy","group":"Consultation form labels","localized":true,"legacyInline":false,"seed":{"th":"อ่านว่าข้อมูลถูกใช้อะไร","en":"Read how your data is used"}},
  {"path":"publicCopy.contactSubmit","label":"Submit","group":"Consultation form labels","localized":true,"legacyInline":false,"seed":{"th":"ส่งข้อความ","en":"Send message"}},
  { path: 'brand.media.headerLogo', label: 'Header logo', group: 'Brand images', localized: true, media: true, seed: { th: 'assets/brand/covermate-advisory-logo-th.png', en: 'assets/brand/covermate-advisory-logo-en.png' } },
  { path: 'brand.media.footerLogo', label: 'Footer logo', group: 'Brand images', localized: true, media: true, seed: { th: 'assets/brand/covermate-footer-logo-th.png', en: 'assets/brand/covermate-footer-logo-en.png' } },
  { path: 'brand.media.mark', label: 'Brand icon', group: 'Brand images', media: true, seed: 'assets/brand/covermate-mark.png' },
  { path: 'brand.media.photo', label: 'Advisor photo', group: 'Brand images', media: true, seed: '' },
  { path: 'brand.media.lineQr', label: 'LINE QR image', group: 'Brand images', media: true, seed: '' },
  { path: 'brand.media.favicon', label: 'Favicon', group: 'Brand images', media: true, seed: 'favicon.svg' },
  { path: 'seo.image', label: 'Social sharing image', group: 'Brand images', media: true, seed: 'assets/covermate-og.png' },
  { path: 'seo.imageAlt', label: 'Social image description', group: 'Brand images', localized: true, seed: { th: 'CoverMate ที่ปรึกษาประกันชีวิต สุขภาพ และรถยนต์', en: 'CoverMate insurance advisory for life, health, and motor cover' } },
  { path: 'licences.life.number', label: 'Life agent licence number', group: 'Licences', seed: '6401006221' },
  { path: 'licences.life.label', label: 'Life agent licence label', group: 'Licences', localized: true, seed: { th: 'ใบอนุญาตตัวแทนประกันชีวิต', en: 'Life agent licence' } },
  { path: 'licences.life.logo', label: 'Life provider logo', group: 'Licences', media: true, seed: 'assets/logos/aia-logo.png' },
  { path: 'licences.life.logoAlt', label: 'Life provider logo description', group: 'Licences', seed: 'AIA' },
  { path: 'licences.nonLife.number', label: 'Non-life broker licence number', group: 'Licences', seed: '6804008544' },
  { path: 'licences.nonLife.label', label: 'Non-life broker licence label', group: 'Licences', localized: true, seed: { th: 'ใบอนุญาตนายหน้าประกันวินาศภัย', en: 'Non-life broker licence' } },
  { path: 'licences.nonLife.logo', label: 'Non-life provider logo', group: 'Licences', media: true, seed: 'assets/logos/srikrung-logo.png' },
  { path: 'licences.nonLife.logoAlt', label: 'Non-life provider logo description', group: 'Licences', seed: 'Srikrung Broker' },
  { path: 'licences.broker.number', label: 'Placement broker licence number', group: 'Licences', seed: 'ว00287/2534' },
  { path: 'licences.verifyUrl', label: 'Licence verification link', group: 'Licences', url: true, seed: 'https://smart.oic.or.th/eservice/Menu1' },
  { path: 'licences.verifyLabel', label: 'Licence verification label', group: 'Licences', localized: true, seed: { th: 'ตรวจสอบใบอนุญาตกับ คปภ.', en: 'Verify licence with OIC' } },
  { path: 'footer.licenceHeading', label: 'Licence heading', group: 'Website labels', localized: true, seed: { th: 'ใบอนุญาต', en: 'Licences' } },
  { path: 'footer.navHeading', label: 'Navigation heading', group: 'Website labels', localized: true, seed: { th: 'ไปที่', en: 'Go to' } },
  { path: 'footer.contactHeading', label: 'Contact heading', group: 'Website labels', localized: true, seed: { th: 'ติดต่อ', en: 'Contact' } },
  { path: 'footer.privacyLabel', label: 'Privacy link', group: 'Website labels', localized: true, seed: { th: 'ข้อมูลของคุณถูกใช้ทำอะไร', en: 'How your information is used' } },
  { path: 'ui.advisorLabel', label: 'Advisor heading', group: 'Website labels', localized: true, seed: { th: 'ดูแลโดย', en: 'Advised by' } },
  { path: 'ui.coverageLabel', label: 'Coverage cards heading', group: 'Website labels', localized: true, seed: { th: 'วันนี้อยากให้ช่วยเรื่องไหน', en: 'What would you like help with today?' } },
  { path: 'ui.callLabel', label: 'Call button description', group: 'Website labels', localized: true, seed: { th: 'โทรหา CoverMate', en: 'Call CoverMate' } },
  { path: 'ui.consultationConsent', label: 'Consultation consent', group: 'Form messages', localized: true, seed: { th: 'ยินยอมให้ติดต่อกลับเรื่องที่ถามมา และให้ส่งข้อมูลต่อให้บริษัทประกันเฉพาะเมื่อขอใบเสนอราคาแล้ว', en: 'I agree to be contacted about this request and to share my details with insurers only when I request a quotation.' } },
  { path: 'ui.contactRequired', label: 'Contact required', group: 'Form messages', localized: true, seed: { th: 'กรุณาใส่ LINE ID หรือเบอร์โทรเพื่อให้ติดต่อกลับได้', en: 'Please add a LINE ID or phone number so we can reply.' } },
  { path: 'ui.consentRequired', label: 'Consent required', group: 'Form messages', localized: true, seed: { th: 'กรุณายืนยันการให้ติดต่อกลับและการใช้ข้อมูลก่อนส่งข้อความ', en: 'Please confirm consent before sending your enquiry.' } },
  { path: 'ui.submitError', label: 'Submission failed', group: 'Form messages', localized: true, seed: { th: 'ส่งไม่สำเร็จ กรุณาลองใหม่', en: 'Could not send yet. Please try again.' } },
  { path: 'ui.submitPending', label: 'Submission pending', group: 'Form messages', localized: true, seed: { th: 'กำลังบันทึกข้อมูล...', en: 'Saving your enquiry...' } },
  { path: 'ui.submitSuccess', label: 'Submission successful', group: 'Form messages', localized: true, seed: { th: 'ได้รับข้อมูลแล้ว เราจะติดต่อกลับโดยเร็วที่สุด', en: 'Thank you. We will reply as soon as possible.' } }
];

function cmsGet(config, path) {
  return path.split('.').reduce((value, key) => value && typeof value === 'object' ? value[key] : undefined, config);
}

function cmsSet(config, path, value) {
  const keys = path.split('.');
  if (keys.some(key => ['__proto__', 'constructor', 'prototype'].includes(key))) throw new Error('Invalid CMS field path');
  let target = config;
  keys.slice(0, -1).forEach(key => {
    if (!target[key] || typeof target[key] !== 'object') target[key] = {};
    target = target[key];
  });
  target[keys[keys.length - 1]] = value;
}

function cmsMedia(value) {
  const text = String(value || '').trim();
  if (/[\x00-\x1f<>"'\\]/.test(text) || text.includes('..')) return '';
  if (/^https:\/\//i.test(text)) {
    try { return new URL(text).protocol === 'https:' ? text : ''; } catch { return ''; }
  }
  const local = text.replace(/^\.\//, '').replace(/^\/+/, '');
  return /^(assets\/[A-Za-z0-9._~!$&()*+,;=:@/%-]+|favicon\.(svg|ico))$/.test(local) ? local : '';
}

function migrateCmsContent(config) {
  const next = JSON.parse(JSON.stringify(config || {}));
  if (Number(next.cmsContentVersion || 0) >= CMS_CONTENT_VERSION) return next;
  const previousVersion = Number(next.cmsContentVersion || 0);
  const pending = new Set(Array.isArray(next.cmsLegacyCopy) ? next.cmsLegacyCopy : []);
  CMS_CONTENT_FIELDS.forEach(field => {
    if (field.localized) {
      ['th', 'en'].forEach(lang => {
        const path = field.path + '.' + lang;
        if (cmsGet(next, path) === undefined) {
          cmsSet(next, path, field.seed[lang]);
          if (field.legacyInline) pending.add(path);
        }
      });
    } else if (cmsGet(next, field.path) === undefined) cmsSet(next, field.path, field.seed);
  });
  next.cmsLegacyCopy = [...pending];
  if (previousVersion < 1) {
    const legacyLicences = { '6401006221': '{{lifeLicence}}', '6804008544': '{{nonLifeLicence}}', 'ว00287/2534': '{{brokerLicence}}' };
    const migrateText = value => {
      if (typeof value === 'string') return value.replace(/6401006221|6804008544|ว00287\/2534/g, number => legacyLicences[number]);
      if (Array.isArray(value)) return value.map(migrateText);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, migrateText(entry)]));
      return value;
    };
    if (next.sections) next.sections = migrateText(next.sections);
    if (next.footer && next.footer.legal) next.footer.legal = migrateText(next.footer.legal);
    (next.sections || []).filter(section => section && section.id === 'hero').forEach(section => {
      if (section.cta2href === undefined) section.cta2href = '#fit';
      if (section.claimHref === undefined) section.claimHref = '#claim';
    });
    // Retire the exact legacy insurer entry once; later owner edits remain authoritative.
    (next.sections || []).filter(section => section && section.type === 'insurers').forEach(section => {
      (section.items || []).forEach(item => {
        if (!item || item.logo !== 'assets/ins/13-thaivivat.png') return;
        item.logo = 'assets/ins/13-aioi.png';
        if (item.th) item.th.name = 'ไอโออิ กรุงเทพ ประกันภัย';
        if (item.en) item.en.name = 'Aioi Bangkok Insurance';
        if (item.logoAlt) item.logoAlt = 'Aioi Bangkok Insurance';
      });
    });
  }
  next.cmsContentVersion = CMS_CONTENT_VERSION;
  return next;
}

function resolveCmsContent(value, config) {
  const fields = { lifeLicence: 'licences.life.number', nonLifeLicence: 'licences.nonLife.number', brokerLicence: 'licences.broker.number' };
  if (typeof value === 'string') return value.replace(/\{\{(lifeLicence|nonLifeLicence|brokerLicence)\}\}/g, (_, key) => cmsGet(config, fields[key]) || '');
  if (Array.isArray(value)) return value.map(entry => resolveCmsContent(entry, config));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, resolveCmsContent(entry, config)]));
  return value;
}

function sanitizeCmsFields(config) {
  const legacyPaths = new Set(CMS_CONTENT_FIELDS.filter(field => field.legacyInline).flatMap(field => ['th', 'en'].map(lang => field.path + '.' + lang)));
  config.cmsLegacyCopy = [...new Set(Array.isArray(config.cmsLegacyCopy) ? config.cmsLegacyCopy.filter(path => legacyPaths.has(path)) : [])];
  CMS_CONTENT_FIELDS.forEach(field => {
    const paths = field.localized ? ['th', 'en'].map(lang => field.path + '.' + lang) : [field.path];
    paths.forEach(path => {
      const value = cmsGet(config, path);
      let text = String(value == null ? '' : value).trim().slice(0, field.media || field.url ? 500 : 2000);
      if (field.media) text = cmsMedia(text);
      if (field.url) { try { if (new URL(text).protocol !== 'https:') text = ''; } catch { text = ''; } }
      cmsSet(config, path, text);
    });
  });
  ['header', 'motorPage'].forEach(key => {
    const owner = config[key];
    if (!owner || !Array.isArray(owner.nav)) return;
    owner.nav = owner.nav.filter(item => item && typeof item === 'object').map(item => {
      const href = String(item.href || '').trim();
      const label = typeof item.label === 'string' ? item.label : { th: String(item.label && item.label.th || '').trim().slice(0, 80), en: String(item.label && item.label.en || '').trim().slice(0, 80) };
      return { ...item, label, href: /^(#[A-Za-z0-9_-]+|\/(?:motor)?(?:#[A-Za-z0-9_-]+)?)$/.test(href) ? href : '' };
    });
  });
  return config;
}

function setCmsCopy(config, path, value) {
  cmsSet(config, path, value);
  config.cmsLegacyCopy = (Array.isArray(config.cmsLegacyCopy) ? config.cmsLegacyCopy : []).filter(key => key !== path);
}
// COVERMATE_CMS_SCHEMA_END

export { CMS_CONTENT_VERSION, CMS_CONTENT_FIELDS, cmsGet, cmsSet, cmsMedia, migrateCmsContent, resolveCmsContent, sanitizeCmsFields };
export const DEFAULT_SEO = {
  title: { th: "", en: "" },
  description: { th: "", en: "" }
};
export const PRODUCT_HEADER_NAV = [
  { label: { th: "ความคุ้มครอง", en: "Cover" }, href: "#cover" },
  { label: { th: "ตรวจกรมธรรม์", en: "Policy review" }, href: "#review" },
  { label: { th: "ประกันรถยนต์", en: "Motor" }, href: "#insurers" },
  { label: { th: "เครื่องมือ", en: "Resources" }, href: "#fit" },
  { label: { th: "คำถามที่พบบ่อย", en: "FAQ" }, href: "#faq" }
];
export const PRODUCT_HEADER_CTA = { th: "ติดต่อทาง LINE", en: "Contact on LINE" };
export const PRODUCT_SECTION_ORDER = [
  "hero",
  "trust",
  "cover",
  "review",
  "how",
  "insurers",
  "fit",
  "tiers",
  "claim",
  "renew",
  "guides",
  "voices",
  "about",
  "faq",
  "fees",
  "privacy",
  "talk"
];
export const LEGACY_SECTION_ORDER = [
  "hero",
  "trust",
  "cover",
  "review",
  "fit",
  "how",
  "insurers",
  "tiers",
  "claim",
  "renew",
  "guides",
  "voices",
  "about",
  "faq",
  "fees",
  "privacy",
  "talk"
];
export const DEFAULT_NEEDS_CALCULATOR = {
  datasetVersion: "2026-08-15-v0.1",
  sourcePackage: "covermate-reference-data-v0.1",
  situations: {
    start: {
      th: "เพิ่งเริ่มทำงาน",
      en: "Just started working",
      icon: "sprout",
      recs: [
        {
          th: "เริ่มจากค่ารักษาและอุบัติเหตุ",
          en: "Start with health and accident cover",
          wth: "ช่วงเริ่มทำงานควรรักษาสภาพคล่องไว้ก่อน เครื่องมือนี้จึงแยกเงินก้อนชีวิตออกจากค่ารักษาและเงินพักฟื้น",
          wen: "Early-career planning should protect cash flow first, so this tool separates life need, medical room gap and recovery buffer."
        },
        {
          th: "เพิ่มทุนชีวิตเมื่อมีคนพึ่งพารายได้",
          en: "Increase life cover when others depend on you",
          wth: "ทุนชีวิตควรอิงค่าใช้จ่ายจำเป็นและจำนวนปีที่ต้องดูแล ไม่ใช่ตัวคูณรายได้แบบตายตัว",
          wen: "Life cover should follow essential spending and support years, not a fixed salary multiplier."
        },
        {
          th: "เช็กค่าห้องกับโรงพยาบาลที่ใช้จริง",
          en: "Check room benefits against likely hospitals",
          wth: "ส่วนต่างค่าห้องเป็นข้อมูลอ้างอิง ไม่ใช่จำนวนเงินที่ต้องจ่ายแน่นอน เพราะขึ้นกับเงื่อนไขกรมธรรม์",
          wen: "The room gap is a reference, not a guaranteed bill, because policy terms decide the actual outcome."
        }
      ]
    },
    family: {
      th: "มีครอบครัว มีลูก",
      en: "Family with kids",
      icon: "users",
      recs: [
        {
          th: "คุ้มครองรายจ่ายบ้านหลายปี",
          en: "Protect household spending for several years",
          wth: "ใส่ค่าใช้จ่ายจำเป็นต่อเดือนและจำนวนปีที่อยากให้ครอบครัวยืนต่อได้ แล้วค่อยหักเงินสำรองหรือทุนเดิมที่กันไว้แล้ว",
          wen: "Enter essential monthly spending and the years your family needs support, then subtract liquid assets and existing cover."
        },
        {
          th: "หนี้และค่าเรียนควรถูกนับแยก",
          en: "Debts and education should be explicit",
          wth: "หนี้บ้าน รถ หรือภาระอนาคตควรเป็นตัวเลขแยกจากค่าใช้จ่ายรายเดือน เพื่อไม่ให้ทุนชีวิตต่ำกว่าภาระจริง",
          wen: "Mortgage, car debt and future obligations should be entered separately from monthly spending so life need is not understated."
        },
        {
          th: "โรคร้ายแรงคือเงินพักฟื้น",
          en: "Critical illness is a recovery buffer",
          wth: "เงินก้อนโรคร้ายแรงในเครื่องมือนี้อิงเดือนพักฟื้น ไม่ได้ผูกโรคใดโรคหนึ่งกับทุนตายตัว",
          wen: "The CI figure is based on recovery months, not a disease-to-sum-insured shortcut."
        }
      ]
    },
    business: {
      th: "เจ้าของธุรกิจ",
      en: "Business owner",
      icon: "briefcase",
      recs: [
        {
          th: "แยกภาระบ้านกับภาระธุรกิจ",
          en: "Separate household and business obligations",
          wth: "ภาระธุรกิจที่ครอบครัวต้องรับต่อควรถูกใส่เป็นภาระอนาคต ไม่รวมปนกับค่าใช้จ่ายประจำบ้าน",
          wen: "Business obligations that would fall to the family should be added as future obligations, not blended into household spending."
        },
        {
          th: "เงินสดสำรองช่วยลดช่องว่างได้",
          en: "Earmarked liquidity reduces the gap",
          wth: "เงินสำรองที่ตั้งใจใช้เพื่อครอบครัวหรือธุรกิจในกรณีฉุกเฉินสามารถนำมาหักได้ แต่เงินทุนหมุนเวียนที่ต้องใช้ทำงานไม่ควรนับซ้ำ",
          wen: "Earmarked emergency liquidity can reduce the gap, but working capital needed by the business should not be double-counted."
        },
        {
          th: "ตรวจ health limit แยกจากทุนชีวิต",
          en: "Review health limits separately from life cover",
          wth: "ค่ารักษาไม่ควรถูกนำไปคูณเป็นทุนชีวิต แต่ควรตรวจเป็น room gap และเงื่อนไขกรมธรรม์แยกต่างหาก",
          wen: "Medical costs should not drive life cover. Review room gap and policy wording separately."
        }
      ]
    },
    retire: {
      th: "ใกล้เกษียณ",
      en: "Near retirement",
      icon: "clock",
      recs: [
        {
          th: "ลดทุนชีวิตเมื่อภาระลดลง",
          en: "Reduce life cover as obligations fall",
          wth: "ถ้าหนี้และคนพึ่งพิงลดลง ทุนชีวิตอาจไม่ต้องสูงเท่าช่วงสร้างครอบครัว แต่สุขภาพและเงินพักฟื้นยังควรตรวจละเอียด",
          wen: "As debts and dependants fall, life cover may not need to be as high as before, while health and recovery buffers deserve closer review."
        },
        {
          th: "ค่าห้องควรตรงกับโรงพยาบาลที่ใช้จริง",
          en: "Room benefits should match likely hospitals",
          wth: "เลือกค่าห้องจากโรงพยาบาลที่มีแนวโน้มใช้จริง แล้วดูว่าส่วนต่างที่ต้องเตรียมรับได้หรือไม่",
          wen: "Choose a likely hospital reference and check whether the resulting room gap is acceptable."
        },
        {
          th: "กันเงินพักฟื้นที่ไม่ใช่ค่ารักษา",
          en: "Set aside non-medical recovery cash",
          wth: "ช่วงพักฟื้นยังมีค่าเดินทาง คนดูแล และรายได้ที่อาจลดลง ซึ่งไม่ใช่ค่ารักษาโดยตรง",
          wen: "Recovery may require transport, caregiving and income replacement beyond hospital bills."
        }
      ]
    }
  },
  life: {
    engineVersion: "1.0.0",
    formula: "essential_monthly_household_spending * 12 * support_years + outstanding_debts + future_obligations + transition_final_costs - earmarked_liquid_assets - existing_death_benefits",
    supportYears: [1, 3, 5, 10, 15],
    transitionFinalCosts: 200000,
    guardrails: [
      "Do not use hospital treatment costs in the core life-sum calculation.",
      "Do not use arbitrary salary multipliers as the authoritative model.",
      "Willingness to pay must not reduce calculated need."
    ]
  },
  health: {
    engineVersion: "1.0.0",
    model: "coverage_fit_and_out_of_pocket_reference",
    selectedRoomReference: {
      hospitalId: "bnh",
      hospitalName: { th: "โรงพยาบาล BNH", en: "BNH Hospital" },
      roomType: { th: "Regent Adult", en: "Regent Adult" },
      totalFixedDaily: 10550,
      currency: "THB",
      priceUnit: "day",
      sourceUrl: "https://www.bnhhospital.com/th/the-bnh-wards/",
      lastChecked: "2026-08-15",
      confidenceLevel: "A",
      note: {
        th: "ข้อมูลค่าห้องอ้างอิงจากหน้าโรงพยาบาล ไม่ใช่จำนวนเงินที่ผู้เอาประกันต้องจ่ายแน่นอน",
        en: "Published room reference from the hospital page, not a guaranteed out-of-pocket amount."
      }
    },
    guardrails: [
      "Do not output one authoritative required sum insured.",
      "Do not call the reference difference the amount the user will definitely pay.",
      "Every medical reference must expose source, last_checked and confidence.",
      "Do not derive P50/P75/P90 from promotional/package pages."
    ]
  },
  criticalIllness: {
    engineVersion: "1.0.0",
    formula: "essential_monthly_spending * recovery_months + one_off_recovery_non_medical_budget + chosen_medical_oop_buffer - earmarked_emergency_assets - existing_ci_lump_sum_cover",
    recoveryMonths: [3, 6, 12, 18, 24],
    defaultRecoveryMonths: 6,
    oneOffRecoveryNonMedicalBudget: 100000,
    chosenMedicalOopBuffer: 250000,
    guardrails: [
      "Recovery period must be explicitly user-selected.",
      "Do not map a disease name to a fixed CI sum.",
      "Health treatment scenarios may contextualize the user's chosen medical OOP buffer but must not dictate it."
    ]
  }
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
  return count;
}

function normalizeMotorCountCopy(value, count = 0) {
  if (typeof value !== "string") return value;
  const text = value;
  const isMotorCountCopy =
    /ประกันรถยนต์|บริษัท|นายหน้า|เทียบ|motor|insurer|broker|compare/i.test(text) &&
    /(\d+\+?|\d+\s*เจ้า)/.test(text);
  if (!isMotorCountCopy) return text;
  return text
    .replace(/บริษัทประกันภัย\s*\d+\+?\s*แห่ง/g, `บริษัทประกันภัย ${count} แห่ง`)
    .replace(/เทียบ(เบี้ย)?ได้\s*\d+\+?\s*เจ้า/g, (_, premium) => `เทียบ${premium || ''}ได้ ${count} เจ้า`)
    .replace(/บริษัทประกันภัยกว่า\s*\d+\s*แห่ง/g, `บริษัทประกันภัย ${count} แห่ง`)
    .replace(/บริษัทกว่า\s*\d+\s*เจ้า/g, `บริษัทประกันภัย ${count} แห่ง`)
    .replace(/เทียบเบี้ยกว่า\s*\d+\s*บริษัท/g, `จาก ${count} บริษัทประกันภัย`)
    .replace(/เทียบได้กว่า\s*\d+\s*เจ้า/g, `เทียบได้ ${count} เจ้า`)
    .replace(/เทียบเบี้ยได้กว่า\s*\d+\s*เจ้า/g, `เทียบเบี้ยได้ ${count} เจ้า`)
    .replace(/กว่า\s*\d+\s*เจ้า/g, `${count} เจ้า`)
    .replace(/กว่า\s*\d+\s*บริษัท/g, `${count} บริษัท`)
    .replace(/more than\s*\d+\s*insurers?/gi, `${count} insurers`)
    .replace(/over\s*\d+\s*insurers?/gi, `${count} insurers`)
    .replace(/\b\d+\+\s*insurers?\b/gi, `${count} insurers`)
    .replace(/\b\d+\s*insurers?\b/gi, `${count} insurers`)
    .replace(/across\s*\d+\+?/gi, `across ${count}`)
    .replace(/through\s*\d+\+?\s*insurers/gi, `through ${count} insurers`)
    .replace(/compared across\s*\d+\+?/gi, `compared across ${count}`);
}

function normalizeInsurerCountFields(target, count) {
  if (!target || typeof target !== 'object') return;
  Object.keys(target).forEach(key => {
    if (typeof target[key] === 'string') target[key] = normalizeMotorCountCopy(target[key], count);
    else normalizeInsurerCountFields(target[key], count);
  });
}

function mergeDeepDefaults(defaults, value) {
  if (Array.isArray(defaults)) return Array.isArray(value) ? cloneJSON(value) : cloneJSON(defaults);
  if (!defaults || typeof defaults !== "object") return value === undefined ? defaults : value;
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const next = cloneJSON(defaults);
  Object.keys(source).forEach((key) => {
    next[key] = mergeDeepDefaults(defaults[key], source[key]);
  });
  return next;
}

function ensureNeedsCalculatorSection(section) {
  if (!section || section.type !== "fit") return;
  section.calculator = mergeDeepDefaults(DEFAULT_NEEDS_CALCULATOR, section.calculator);
}

function reorderKnownLegacySections(sections) {
  if (!Array.isArray(sections)) return sections;
  const currentOrder = sections.map((section) => section && section.id).join("|");
  if (currentOrder !== LEGACY_SECTION_ORDER.join("|")) return sections;
  const byId = new Map(sections.map((section) => [section && section.id, section]));
  return PRODUCT_SECTION_ORDER.map((id) => byId.get(id)).filter(Boolean);
}

function storyTextChunks(item) {
  if (!item || typeof item !== "object" || item.on === false) return [];
  const chunks = [];
  ["th", "en"].forEach((lang) => {
    const bucket = item[lang] || {};
    ["quote", "body", "title", "value", "label", "meta"].forEach((field) => {
      if (bucket[field]) chunks.push(String(bucket[field]));
    });
  });
  return chunks;
}

function hasRealStoryContent(section) {
  const items = Array.isArray(section && section.items) ? section.items : [];
  const placeholderPattern =
    /รอความคิดเห็นจริง|เผยแพร่เมื่อได้รับอนุญาต|ความคิดเห็นจากลูกค้าจะเผยแพร่ที่นี่|ตัวอย่างโครงสร้าง|เสียงจากลูกค้า|ยังไม่ได้ใส่รีวิวจริง|ใส่คำรีวิวจริง|ชื่อลูกค้า|อาชีพ\s*·\s*ประกันที่ทำ|Awaiting real feedback|Published with permission|Client feedback will appear here|Placeholder structure|Customer voice|Customer name|Role\s*·\s*policy|sample review/i;
  return items.some((item) => {
    const allText = storyTextChunks(item).join(" ").trim();
    if (!allText || placeholderPattern.test(allText)) return false;
    const meaningful = [];
    ["th", "en"].forEach((lang) => {
      const bucket = (item && item[lang]) || {};
      ["quote", "body", "title"].forEach((field) => {
        if (bucket[field]) meaningful.push(String(bucket[field]));
      });
    });
    return meaningful.join(" ").trim().length >= 20;
  });
}

function suppressPlaceholderStories(section) {
  if (!section || (section.id !== "voices" && section.type !== "stories" && section.type !== "testimonials")) {
    return;
  }
  if (!hasRealStoryContent(section)) section.on = false;
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

export function sanitizeCmsControlsConfig(config, options = {}) {
  const next = options.mutate ? (config || {}) : cloneJSON(config || {});
  next.brand = next.brand && typeof next.brand === "object" ? next.brand : {};
  next.contact = next.contact && typeof next.contact === "object" ? next.contact : {};
  next.footer = next.footer && typeof next.footer === "object" ? next.footer : {};
  next.seo = next.seo && typeof next.seo === "object" ? next.seo : {};

  next.brand.advisorLogo = cleanMediaReference(next.brand.advisorLogo, "");
  next.brand.advisorLogoAlt = cleanText(next.brand.advisorLogoAlt, 120);
  next.brand.credential = next.brand.credential && typeof next.brand.credential === "object"
    ? next.brand.credential
    : {};
  next.brand.credential.th = cleanText(next.brand.credential.th, 180);
  next.brand.credential.en = cleanText(next.brand.credential.en, 180);

  next.contact.lineId = cleanText(next.contact.lineId, 80);
  next.contact.lineUrl = cleanHttpsUrl(next.contact.lineUrl, "");
  next.contact.facebookName = cleanText(next.contact.facebookName || "", 120);
  next.contact.facebookUrl = cleanHttpsUrl(next.contact.facebookUrl, "");
  next.contact.whatsapp = cleanPhoneLike(next.contact.whatsapp, "");
  next.contact.phone = /x{2,}/i.test(next.contact.phone || "") ? "" : cleanPhoneLike(next.contact.phone, "");
  next.contact.email = /@example\.(com|org|net)$/i.test(next.contact.email || "") ? "" : cleanEmailAddress(next.contact.email, "");

  next.seo.title = cleanLocalizedSeo(next.seo.title, 68);
  next.seo.description = cleanLocalizedSeo(next.seo.description, 155);

  next.footer.legal = next.footer.legal && typeof next.footer.legal === "object"
    ? next.footer.legal
    : {};
  next.footer.legal.th = cleanText(next.footer.legal.th, 2000);
  next.footer.legal.en = cleanText(next.footer.legal.en, 2000);
  sanitizeCmsFields(next);

  editableContentSections(next).forEach((section) => {
    if (!section || typeof section !== "object") return;
    if (Array.isArray(section.items)) {
      section.items.forEach((item) => {
        if (!item || typeof item !== "object") return;
        if (Object.prototype.hasOwnProperty.call(item, "logo")) {
          item.logo = cleanMediaReference(item.logo, "");
        }
        if (Object.prototype.hasOwnProperty.call(item, "logoAlt")) {
          item.logoAlt = cleanText(item.logoAlt || "", 120);
        }
      });
    }
    if (Array.isArray(section.cards)) {
      section.cards.forEach((card) => {
        if (!card || typeof card !== "object") return;
        if (Object.prototype.hasOwnProperty.call(card, "logo")) {
          card.logo = cleanMediaReference(card.logo, "");
        }
        if (Object.prototype.hasOwnProperty.call(card, "logoAlt")) {
          card.logoAlt = cleanText(card.logoAlt || "", 120);
        }
      });
    }
  });

  if (next.motorPage && typeof next.motorPage === "object") {
    next.motorPage.seo = next.motorPage.seo && typeof next.motorPage.seo === "object"
      ? next.motorPage.seo
      : {};
    next.motorPage.seo.title = cleanLocalizedSeo(next.motorPage.seo.title, 68);
    next.motorPage.seo.description = cleanLocalizedSeo(next.motorPage.seo.description, 155);
    if (!Array.isArray(next.motorPage.sections)) {
      next.motorPage.sections = [];
    }

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
    if (/^(08X-XXX-XXXX|purich@example\.com)$/i.test(value.trim())) { delete next[key]; return; }
    const isInsurerInlineText = /^insurers:\d+:(th|en)$/.test(key);
    const isContactTitleText = /^talk:\d+:(th|en)$/.test(key);
    next[key] = value;
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
  const isLegacy = Number(config && config.cmsContentVersion || 0) < 1;
  const next = migrateCmsContent(config);
  next.header = next.header && typeof next.header === "object" ? next.header : {};
  if (next.header.nav === undefined) next.header.nav = cloneJSON(PRODUCT_HEADER_NAV);
  if (next.header.cta === undefined) next.header.cta = cloneJSON(PRODUCT_HEADER_CTA);
  if (Array.isArray(next.sections)) {
    if (isLegacy) next.sections = reorderKnownLegacySections(next.sections);
    const count = motorInsurerLogoCount(next);
    ['header', 'brand', 'footer', 'contact', 'seo', 'motorPage', 'sections'].forEach(key => normalizeInsurerCountFields(next[key], count));
    editableContentSections(next).forEach((section) => {
      if (!section) return;
      ensureNeedsCalculatorSection(section);
      suppressPlaceholderStories(section);
    });
    editableContentSections(next).forEach((section) => {
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

export function sanitizeStateDoc(state, options = {}) {
  if (!state || !state.config) return state;
  const input = cloneJSON(state.config);
  const text = { ...(state.text || {}) };
  CMS_CONTENT_FIELDS.filter(field => field.localized).forEach(field => ['th', 'en'].forEach(lang => {
    const path = field.path + '.' + lang;
    if (!Object.prototype.hasOwnProperty.call(text, 'cms:' + path)) return;
    setCmsCopy(input, path, text['cms:' + path]);
    delete text['cms:' + path];
  }));
  const config = sanitizeMotorCountConfig(input, options);
  return {
    ...state,
    config,
    text: sanitizeMotorCountText(text, config)
  };
}

export function cacheSiteState(name, state) {
  const clean = sanitizeStateDoc(state);
  if (!validStateDoc(clean)) return false;
  if (name === "live") {
    if (typeof window !== "undefined") window.__covermateLiveState = clean;
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

export function versionedAssetUrl(ref, versions = {}, origin = "") {
  if (!ref || /^(data:|blob:)/i.test(ref)) return ref;
  try {
    const path = ref.startsWith("assets/") ? "/" + ref : ref;
    const url = new URL(path, origin);
    const version = versions[url.pathname];
    // Leave external/signed media URLs untouched, including their query order.
    if (url.origin !== origin || !version) return ref;
    url.searchParams.set("cm_asset", version);
    return url.pathname + url.search + url.hash;
  } catch { return ref; }
}

export function cacheVersions(versions, limit = HISTORY_LIMIT) {
  if (!Array.isArray(versions)) return false;
  writeJSON(HISTORY_KEY, versions.slice(0, limit));
  return true;
}

const contract = {
  CMS_CONTENT_VERSION,
  CMS_CONTENT_FIELDS,
  cmsGet,
  cmsSet,
  cmsMedia,
  migrateCmsContent,
  resolveCmsContent,
  sanitizeCmsFields,
  SESSION_KEY,
  SESSION_MS,
  ADMIN_EVER_KEY,
  LIVE_CONFIG_KEY,
  LIVE_TEXT_KEY,
  DRAFT_CONFIG_KEY,
  DRAFT_TEXT_KEY,
  HISTORY_KEY,
  HISTORY_LIMIT,
  ADMIN_ROOT_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_OPERATIONS_PATH,
  ADMIN_ANALYTICS_PATH,
  ADMIN_PUBLIC_EXIT_PATH,
  PUBLIC_HOME_PATH,
  PUBLIC_MOTOR_PATH,
  ADMIN_OWNER_PAGE_QUERY,
  PUBLIC_ROUTE_PATHS,
  ADMIN_OWNER_ROUTE_MAP,
  ADMIN_OWNER_HASH_MAP,
  ADMIN_OWNER_PATHS,
  ADMIN_SHELL_PATHS,
  OWNER_HASHES,
  OWNER_PATHS,
  ROUTE_PAGE_HOME,
  ROUTE_PAGE_MOTOR,
  ADMIN_PORTAL_MODULES,
  ADMIN_PORTAL_OPERATIONS_TABS,
  normalizePath,
  isAdminNamespacePath,
  isAdminShellPath,
  isOwnerHash,
  isOwnerPath,
  ownerModeFromPath,
  ownerPathForMode,
  ownerModeFromHash,
  normalizeRoutePage,
  publicPathForRoutePage,
  routePageFromLocationParts,
  cleanPublicExitPath,
  adminPortalRouteStateFromLocation,
  adminPortalUrl,
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
  editableContentSections,
  isVisibleSection,
  visiblePublicSections,
  normalizeSectionHref,
  isSectionHref,
  visibleSectionAnchorIds,
  sectionHrefAvailable,
  filterLinksByVisibleSections,
  validRepeatableContentId,
  createRepeatableContentId,
  ensureRepeatableContentIds,
  repeatableContentIndex,
  motorInsurerLogoCount,
  DEFAULT_ADVISOR_LOGO,
  DEFAULT_ADVISOR_LOGO_ALT,
  DEFAULT_CONTACT,
  DEFAULT_SEO,
  PRODUCT_HEADER_NAV,
  PRODUCT_HEADER_CTA,
  PRODUCT_SECTION_ORDER,
  LEGACY_SECTION_ORDER,
  DEFAULT_NEEDS_CALCULATOR,
  sanitizeMotorCountText,
  sanitizeCmsControlsConfig,
  sanitizeMotorCountConfig,
  sanitizeStateDoc,
  cacheSiteState,
  versionedAssetUrl,
  cacheVersions
};

if (typeof window !== "undefined") {
  window.CoverMateContract = contract;
}

export default contract;
