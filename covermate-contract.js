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
  if (raw === "#guides") return "#faq";
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
// Status remains positional for backwards compatibility. Remarks are keyed by
// the durable coverage ID, so reordering or hiding an axis cannot move its copy.
function normalizeTierRemarks(config, options = {}) {
  const next = options.mutate ? (config || {}) : JSON.parse(JSON.stringify(config || {}));
  const sections = [...(Array.isArray(next.sections) ? next.sections : []), ...['hero','trust','cover'].map(key => next.motorPage?.[key])];
  sections.filter(section => section?.type === 'tiers').forEach(section => {
    const tags = {
      '1': {th:'คุ้มครองครบที่สุด',en:'Broadest cover'},
      '2+': {th:'คุ้มค่า คุ้มครองรอบด้าน',en:'Value and wider protection'},
      '2': {th:'เหมาะกับรถที่อายุเยอะขึ้น',en:'For older vehicles'},
      '3+': {th:'ประหยัด คุ้มครองคู่กรณี',en:'Budget-friendly protection'},
      '3': {th:'คุ้มครองพื้นฐาน',en:'Basic cover'}
    };
    const heads = Array.isArray(section.heads) ? section.heads : [];
    heads.forEach(head => {
      if (!head || head.icon !== undefined) return;
      const label = `${head.th || ''} ${head.en || ''}`;
      head.icon = /คู่กรณี|third party/i.test(label) ? 'users' : /อุบัติเหตุส่วนบุคคล|personal accident/i.test(label) ? 'user'
        : /ธรรมชาติ|flood|natural disaster/i.test(label) ? 'cloudRain' : /หาย|ไฟไหม้|theft|fire/i.test(label) ? 'shieldCheck'
        : /รถของผู้เอาประกัน|own car|own vehicle/i.test(label) ? 'car' : 'shield';
    });
    (section.items || []).forEach(item => {
      if (!item || typeof item !== 'object') return;
      item.cellRemarks = item.cellRemarks && typeof item.cellRemarks === 'object' && !Array.isArray(item.cellRemarks) ? item.cellRemarks : {};
      const classLabel = [item.th?.label,item.en?.label].map(value => /^(?:ชั้น|Class)\s*(1|2\+?|3\+?)$/i.exec(String(value || '').trim())).find(Boolean);
      ['th','en'].forEach(lang => {
        item[lang] = item[lang] && typeof item[lang] === 'object' ? item[lang] : {};
        if (item[lang].tag === undefined) item[lang].tag = classLabel ? tags[classLabel[1]][lang] : '';
      });
      heads.forEach((head,index) => {
        if (typeof head?.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{1,96}$/.test(head.id)) return;
        const saved = item.cellRemarks[head.id];
        const remark = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
        ['th','en'].forEach(lang => {
          if (remark[lang] === undefined) remark[lang] = item.st?.[index] === 'p' ? String(item[lang]?.note || '') : '';
          else if (typeof remark[lang] !== 'string') remark[lang] = '';
          remark[lang] = remark[lang].slice(0,1000);
        });
        item.cellRemarks[head.id] = remark;
      });
    });
  });
  return next;
}

const CMS_CONTENT_VERSION = 18;
function localizedCmsFields(prefix,group,entries) {
  return entries.map(([key,label,th,en])=>({path:prefix+'.'+key,label,group,localized:true,seed:{th,en}}));
}
const CMS_CONTENT_FIELDS = [
  {path:'advisor.fullName',label:'Full name (real advisor only)',group:'Advisor profile',localized:true,seed:{th:'',en:''}},
  {path:'advisor.role',label:'Personal role',group:'Advisor profile',localized:true,seed:{th:'',en:''}},
  {path:'advisor.photo',label:'Home advisor portrait',group:'Advisor profile',media:true,seed:''},
  {path:'advisor.photoAlt',label:'Portrait description',group:'Advisor profile',localized:true,seed:{th:'',en:''}},
  {path:'advisor.heading',label:'Hero advisor heading',group:'Advisor profile',localized:true,seed:{th:'ผู้ให้คำปรึกษา',en:'Your advisor'}},
  {path:'advisor.licenceLabel',label:'Advisor introduction before licence cards',group:'Advisor profile',localized:true,seed:{th:'ผู้ให้คำปรึกษา:',en:'Your advisor:'}},
  {path:'advisor.contactBefore',label:'Contact introduction before name',group:'Advisor profile',localized:true,seed:{th:'พูดคุยกับ',en:'Speak with'}},
  {path:'advisor.contactAfter',label:'Contact introduction after name',group:'Advisor profile',localized:true,seed:{th:'ผ่าน LINE หรือฝากคำถามให้ติดต่อกลับ',en:'on LINE, or leave a question and we will get back to you.'}},
  ...[
    ['submittingTitle','กำลังส่งคำขอของคุณ','Sending your request'],
    ['submittingBody','กรุณารอสักครู่ ระหว่างที่เรารอการยืนยันจากระบบ','Please wait while we confirm your submission.'],
    ['slowTitle','กำลังรอการยืนยันจากระบบ','Still waiting for confirmation'],
    ['slowBody','การเชื่อมต่อใช้เวลานานกว่าปกติ กรุณาอย่าส่งคำขอซ้ำระหว่างรอผล','This is taking longer than usual. Please avoid submitting the same request again while you wait.'],
    ['successTitle','ได้รับคำขอของคุณแล้ว','Your request has been received'],
    ['successBody','เราบันทึกข้อมูลเรียบร้อยแล้ว และจะติดต่อกลับตามช่องทางที่คุณระบุ','Your request has been saved. We will contact you using the details you provided.'],
    ['successIntro','เล่าเรื่องที่ต้องการให้ช่วยเพิ่มเติมได้ทาง LINE','Continue on LINE to tell us more about your enquiry.'],
    ['successLine','คุยต่อทาง LINE','Continue on LINE'],
    ['successOptional','ไม่สะดวกคุยตอนนี้ก็ได้ คำขอของคุณถูกส่งแล้ว','Chatting now is optional. Your request has already been submitted.'],
    ['failureTitle','ยังส่งคำขอไม่สำเร็จ','Your request could not be submitted'],
    ['failureBody','ระบบยังไม่ได้รับคำขอของคุณ ข้อมูลที่กรอกยังอยู่ในแบบฟอร์มนี้','Your request has not been received. Your entries are still available in this form.'],
    ['failureIntro','ติดต่อเราได้อีกทางผ่าน LINE เพื่อแจ้งเรื่องที่ต้องการสอบถาม','You can contact us through LINE instead.'],
    ['failureLine','ติดต่อผ่าน LINE แทน','Contact us on LINE instead'],
    ['unknownTitle','ยังยืนยันการส่งคำขอไม่ได้','We could not confirm your submission'],
    ['unknownBody','การเชื่อมต่อขัดข้องระหว่างรอผล คำขออาจถูกบันทึกแล้ว คุณสามารถคุยกับเราทาง LINE และแจ้งว่าเพิ่งส่งแบบฟอร์ม','The connection was interrupted before we could confirm the result. Your request may have been saved. Please tell us on LINE that you recently submitted the form.'],
    ['unknownIntro','แจ้งว่าเพิ่งส่งแบบฟอร์ม เพื่อช่วยตรวจคำขอเดิม','Let us know you recently submitted the form so we can check your enquiry.'],
    ['unknownLine','คุยกับเราทาง LINE','Talk to us on LINE'],
    ['limitedTitle','ยังส่งคำขอไม่ได้ในขณะนี้','We cannot accept another submission right now'],
    ['limitedBody','กรุณาลองใหม่ภายหลัง หรือติดต่อเราทาง LINE','Please try again later or contact us on LINE.'],
    ['retry','ลองส่งอีกครั้ง','Try submitting again'],['edit','กลับไปแก้ไขข้อมูล','Edit your details'],
    ['viewDraft','กลับไปดูข้อมูล','View your entries'],['hideDraft','กลับไปดูผลการส่ง','Back to submission status'],
    ['services','ดูบริการอื่น','Explore our services'],['newRequest','ส่งคำขอเรื่องอื่น','Start another enquiry'],
    ['lineHelp','เปิด LINE ไม่ได้?','Having trouble opening LINE?'],['waitingLine','ติดต่อทาง LINE ระหว่างรอ','Contact us on LINE while you wait'],
    ['reference','หมายเลขคำขอ','Request reference'],['hours','เวลาติดต่อ','Contact hours'],
    ['support','อีกช่องทางสำหรับติดต่อเรา','Another way to contact us'],
    ['privacyLink','อ่านว่าข้อมูลของคุณถูกใช้อย่างไร','How we use your information'],
    ['unavailable','ช่องทางติดต่อออนไลน์ยังไม่พร้อม กรุณาลองใหม่ภายหลัง','Online contact is currently unavailable. Please try again later.'],
    ['nameRequired','กรุณากรอกชื่อที่ให้เรียก','Please enter your name.'],
    ['contactRequired','กรุณากรอก LINE ID หรือเบอร์โทร','Please enter your LINE ID or phone number.'],
    ['consentRequired','กรุณายืนยันความยินยอมก่อนส่งคำขอ','Please confirm your consent before submitting.'],
    ['consentChanged','ข้อความความยินยอมมีการเปลี่ยนแปลง กรุณาอ่านและยืนยันใหม่','The consent notice has changed. Please read it and confirm again.'],
    ['topicTooLong','กรุณาระบุรายละเอียดไม่เกิน 500 ตัวอักษร','Please keep your message within 500 characters.'],
    ['invalidFields','กรุณาตรวจสอบข้อมูลในแบบฟอร์มก่อนส่งอีกครั้ง','Please review the form before submitting again.']
  ].map(([key,th,en])=>({path:'contactSubmission.'+key,label:key,group:'Contact submission',localized:true,seed:{th,en}})),
  ...[
    ['inputs','ข้อมูลของคุณ','Your information'],['inputsHelp','กรอกข้อมูลที่สะดวก เพื่อประเมินความคุ้มครองเบื้องต้น','Use your approximate figures to explore a starting estimate.'],
    ['life','ประกันชีวิต','Life'],['ci','โรคร้ายแรง','Critical illness'],['health','สุขภาพ','Health'],
    ['lifeSubtitle','ดูแลคนข้างหลัง','Support those you love'],['ciSubtitle','เงินใช้ระหว่างพักฟื้น','Support during recovery'],['healthSubtitle','ค่ารักษาพยาบาล','Medical cover review'],
    ['statement','วางแผนวันนี้\nเพื่อคนสำคัญในวันหน้า','Plan today\nfor those you love'],['resultStatement','เพื่อความอุ่นใจ\nของคนที่คุณรัก','For the people\nyou care about'],
    ['result','ผลการประเมิน (โดยประมาณ)','Your estimate'],['breakdown','สรุปรายการคำนวณ','Calculation breakdown'],['total','รวมส่วนที่ยังขาด','Remaining shortfall'],
    ['supportCost','เงินที่ต้องใช้ดูแล','Support costs'],['transition','ค่าใช้จ่ายช่วงเปลี่ยนผ่าน','Transition costs'],['recoveryCost','ค่าใช้จ่ายระหว่างพักฟื้น','Recovery spending'],
    ['recoveryOneOff','งบพักฟื้นที่ไม่ใช่ค่ารักษา','One-off non-medical recovery budget'],['medicalBuffer','เงินสำรองค่ารักษาส่วนที่จ่ายเอง','Chosen medical out-of-pocket buffer'],['roomDaily','ค่าห้องอ้างอิงต่อวัน','Daily room reference'],
    ['details','รายละเอียดเพิ่มเติม (ถ้ามี)','Additional details (optional)'],['adviceTitle','คำแนะนำจาก CoverMate','A note from CoverMate'],
    ['adviceBody','นี่เป็นเพียงการประเมินเบื้องต้น ไม่ใช่ใบเสนอราคา ผลลัพธ์แตกต่างกันตามข้อมูลและสถานการณ์จริง ควรพิจารณาเป้าหมายชีวิต สุขภาพ อายุ และความคุ้มครองเดิมประกอบ','A starting estimate, not a quote. Results depend on your inputs and circumstances. Consider your goals, health, age and existing cover before choosing a plan.'],
    ['method','ดูวิธีคำนวณ','How this is calculated'],['methodBody','ตัวเลขแสดงตามค่าที่คำนวณได้ ไม่ปัดเป็นหลักแสน ผลลัพธ์ไม่ต่ำกว่าศูนย์ เป็นแนวทางวางแผน ไม่ใช่การรับประกันความเพียงพอ','Amounts are calculated without rounding to a lump sum and cannot be negative. This is a planning guide, not a guarantee of sufficient cover.'],
    ['cta','ให้ CoverMate ช่วยดูต่อ','Talk it through with CoverMate'],['baht','บาท','THB'],['perMonth','บาท/เดือน','THB/mo'],['years','ปี','years'],['months','เดือน','months'],['perDay','บาท/วัน','THB/day'],
    ['spendingHelp','ค่าใช้จ่ายจำเป็นของครอบครัวที่ต้องการให้มีเงินรองรับ ไม่ใช่รายได้ทั้งหมด','Essential household spending to support, not your total income.'],
    ['yearsHelp','เลือกระยะเวลาจากตัวเลือกที่กำหนดไว้สำหรับการวางแผน','Choose a planning period from the configured options.'],
    ['debtHelp','รวมยอดหนี้คงเหลือและภาระในอนาคตที่ต้องการเตรียมไว้','Remaining debt and future obligations you want to fund.'],
    ['resourcesHelp','รวมเงินสำรองและทุนประกันเดิมที่กันไว้ใช้กับความต้องการนี้ โดยไม่หักซ้ำ','Earmarked assets and existing cover for this need. Do not deduct them twice.'],
    ['roomHelp','ค่าห้องต่อวันที่กรมธรรม์เดิมมีสิทธิคุ้มครองตามเงื่อนไข','Eligible daily room benefit under your existing policy terms.'],
    ['recoveryHelp','จำนวนเดือนที่ต้องการให้เงินรองรับค่าใช้จ่ายระหว่างพักฟื้น','Months of essential spending you want to fund during recovery.'],
    ['photoAlt','',''],
    ['lifeResult','ทุนประกันชีวิตส่วนที่ยังขาด','Life cover shortfall'],['ciResult','เงินก้อนโรคร้ายแรงส่วนที่ยังขาด','Critical illness funding shortfall'],['healthResult','ภาพรวมความคุ้มครองสุขภาพของคุณ','Your health cover overview'],
    ['netMonthlyNeed','ค่าใช้จ่ายสุทธิต่อเดือน','Net monthly spending'],['roomGap','ส่วนต่างค่าห้องต่อวัน','Daily room difference'],
    ['monthlyNeed','ค่าใช้จ่ายที่คนข้างหลังยังต้องใช้ต่อเดือน','Monthly spending for those you leave behind'],
    ['monthlyNeedHelp','นับเฉพาะค่าใช้จ่ายที่ยังมีต่อไป ไม่ใช่รายได้ทั้งหมด','Count ongoing spending, not your total income.'],
    ['otherMonthlyIncome','รายได้อื่นที่ครอบครัวยังได้รับต่อเดือน','Other monthly income your family will retain'],
    ['otherMonthlyIncomeHelp','รายได้ที่ยังได้รับแม้คุณไม่อยู่ ใส่ 0 ถ้าไม่มี','Income that continues without you. Enter 0 if none.'],
    ['yearsToSupport','ต้องการให้เงินก้อนนี้ดูแลต่ออีกกี่ปี','Years of financial support'],
    ['yearsToSupportHelp','ระยะเวลาที่ต้องการรองรับค่าใช้จ่าย เป็นจำนวนปีเต็ม','The number of whole years you want to fund.'],
    ['debtToClear','หนี้ที่ต้องการให้เงินก้อนนี้ชำระ','Debt you want to clear'],
    ['debtToClearHelp','ยอดหนี้คงเหลือที่ต้องการชำระ อย่านับซ้ำกับค่าใช้จ่ายรายเดือน','Outstanding debt to repay. Avoid counting it again in monthly spending.'],
    ['extraLumpSum','ภาระเงินก้อนเพิ่มเติม','Additional lump-sum obligations'],
    ['extraLumpSumHelp','เช่น ค่าเล่าเรียนหรือค่าใช้จ่ายสุดท้าย ที่ยังไม่รวมในช่องอื่น','For example, education or final expenses not included elsewhere.'],
    ['earmarkedAssets','เงินออม/สินทรัพย์ที่กันไว้ให้คนข้างหลัง','Assets earmarked for your family'],
    ['earmarkedAssetsHelp','นับเฉพาะส่วนที่พร้อมนำมาใช้กับเป้าหมายนี้','Only assets available for this purpose.'],
    ['existingLifeCover','เงินประกันชีวิตที่มีอยู่แล้ว','Existing life cover'],
    ['existingLifeCoverHelp','ทุนชีวิตเดิมที่จะจ่ายให้ผู้รับประโยชน์ตามเงื่อนไข อย่านับซ้ำกับสินทรัพย์','Existing eligible life cover. Do not include it again in assets.'],
    ['monthlyRecoveryNeed','ค่าใช้จ่ายจำเป็นต่อเดือนระหว่างพักฟื้น','Essential monthly recovery spending'],
    ['monthlyRecoveryNeedHelp','ค่าใช้จ่ายที่ยังต้องจ่ายระหว่างหยุดงานหรือพักฟื้น','Ongoing essential costs while away from work.'],
    ['recoveryMonths','ระยะเวลาที่ต้องการให้มีเงินรองรับ','Months of recovery support'],
    ['recoveryMonthsHelp','จำนวนเดือนเต็มที่ต้องการวางแผนรองรับ ไม่ใช่ระยะรักษาที่คาดการณ์','Whole months to plan for, not a prediction of treatment duration.'],
    ['otherSupportIncome','รายได้หรือเงินช่วยเหลือที่ยังได้รับต่อเดือน','Continuing monthly income or assistance'],
    ['otherSupportIncomeHelp','รายได้หรือความช่วยเหลือที่ยังได้รับระหว่างพักฟื้น','Income or support that continues during recovery.'],
    ['availableEmergencyFunds','เงินสำรองที่พร้อมใช้ในกรณีนี้','Emergency funds available for recovery'],
    ['availableEmergencyFundsHelp','เฉพาะเงินสำรองที่พร้อมใช้โดยไม่กระทบเป้าหมายอื่น','Funds available without compromising other commitments.'],
    ['existingCriticalIllnessCover','เงินก้อนโรคร้ายแรงที่มีอยู่แล้ว','Existing critical illness lump sum'],
    ['existingCriticalIllnessCoverHelp','ตรวจโรค ระยะโรค และเงื่อนไขการจ่ายของกรมธรรม์เดิม','Check covered conditions, disease stages and payout terms.'],
    ['extraRecoveryBudget','ค่าใช้จ่ายเพิ่มเติมระหว่างพักฟื้น (ถ้ามี)','Additional recovery costs (optional)'],
    ['extraRecoveryBudgetHelp','ค่าใช้จ่ายเพิ่มเติมที่ไม่ซ้ำกับรายเดือน เช่น เดินทางหรือผู้ดูแล','Additional costs such as travel or care, not already in monthly spending.'],
    ['roomReference','โรงพยาบาล / ระดับห้องที่คาดว่าจะใช้','Hospital or room level you expect to use'],
    ['roomReferenceHelp','เลือกข้อมูลอ้างอิงที่มีแหล่งที่มา หรือใส่ค่าห้องที่ตรวจสอบเอง','Select the dated reference or enter a room rate you have checked.'],
    ['customRoomDaily','ค่าห้องที่คาดว่าจะใช้ต่อวัน','Expected daily room rate'],
    ['customRoomDailyHelp','ใส่ราคาที่ตรวจสอบกับโรงพยาบาลแล้ว ไม่รวมค่ารักษาอื่น','Use a rate checked with the hospital. Other treatment costs are excluded.'],
    ['roomBenefit','ค่าห้องที่มีอยู่ในประกันเดิม','Existing daily room benefit'],
    ['roomBenefitHelp','สิทธิค่าห้องที่ใช้ได้จริงหลังตรวจเงื่อนไข ไม่บวกสิทธิซ้ำซ้อน','Eligible daily room benefit. Do not double-count overlapping entitlements.'],
    ['costSharing','มี deductible / co-pay หรือไม่','Deductible or co-pay'],
    ['costSharingHelp','ตรวจว่าต้องจ่ายส่วนแรกหรือร่วมจ่ายกี่เปอร์เซ็นต์ และมีเพดานหรือไม่','Check the deductible, co-pay percentage and any applicable caps.'],
    ['employerCover','มีสวัสดิการนายจ้างหรือไม่','Employer medical benefits'],
    ['employerCoverHelp','ตรวจวงเงินและระยะเวลาที่ใช้สิทธิได้ รวมถึงเมื่อเปลี่ยนงาน','Check benefit limits and what happens when employment changes.'],
    ['personalCover','มีประกันสุขภาพส่วนตัวหรือไม่','Personal health insurance'],
    ['personalCoverHelp','ตรวจตารางผลประโยชน์ ข้อยกเว้น และระยะรอคอย','Review benefits, exclusions and waiting periods.'],
    ['ownPayBudget','พร้อมจ่ายเองเพิ่มเติมได้ประมาณเท่าไร','Available out-of-pocket budget'],
    ['ownPayBudgetHelp','เงินที่พร้อมจ่ายเพิ่มต่อการรักษาครั้งหนึ่ง ไม่ได้นำไปหักค่าห้องรายวัน','Available per treatment episode. Not subtracted from a daily room rate.'],
    ['unknown','ยังไม่ทราบ / ยังไม่เลือก','Not sure / not selected'],['custom','ระบุค่าห้องเอง','Enter a room rate'],['none','ไม่มี','None'],['yes','มี','Yes'],['no','ไม่มี','No'],['deductible','มีค่าเสียหายส่วนแรก','Deductible'],['copay','มีส่วนร่วมจ่าย','Co-pay'],['both','มีทั้งสองแบบ','Both'],
    ['incomplete','ข้อมูลยังไม่พอ','More information needed'],['review','ควรตรวจเพิ่ม','Review further'],['roomAligned','พอใช้สำหรับค่าห้องอ้างอิง','Room benefit matches the reference'],
    ['healthAdvice','นี่เป็นเพียงการเทียบสิทธิค่าห้อง ไม่รับรองว่าความคุ้มครองทั้งหมดเพียงพอ ควรตรวจวงเงินรวม ค่ารักษา ข้อยกเว้น และเงื่อนไขร่วมจ่ายกับกรมธรรม์จริง','This compares room benefits only, not overall adequacy. Review total limits, treatment benefits, exclusions and cost-sharing terms in the actual policy.'],
    ['ciAdvice','เป็นแนวทางวางแผนเงินระหว่างพักฟื้น ไม่ได้หมายความว่ากรมธรรม์ทุกแบบจะจ่ายตามยอดนี้ การจ่ายขึ้นกับโรค ระยะโรค และเงื่อนไขของแต่ละกรมธรรม์','A recovery funding guide, not a promised payout. Eligibility depends on covered conditions, disease stages and each policy\'s terms.'],
    ['healthQuestions','สิ่งที่ควรถามต่อ','Questions to review'],
    ['lifeMethod','ค่าใช้จ่ายสุทธิ = ค่าใช้จ่ายต่อเดือน หักรายได้ที่ยังได้รับ (ขั้นต่ำ 0) คูณ 12 และจำนวนปี บวกหนี้และภาระเงินก้อน แล้วหักสินทรัพย์และทุนชีวิตเดิม ไม่รวมเงินเฟ้อ ผลตอบแทน หรือภาระที่ไม่ได้กรอก','Net spending is monthly spending minus continuing income, with a floor of 0. Multiply by 12 and years, add debt and additional obligations, then deduct earmarked assets and existing life cover. Inflation, investment returns and unentered obligations are excluded.'],
    ['ciMethod','ค่าใช้จ่ายต่อเดือน หักรายได้ที่ยังได้รับ (ขั้นต่ำ 0) คูณจำนวนเดือน บวกค่าใช้จ่ายเพิ่มเติม แล้วหักเงินสำรองและเงินก้อนโรคร้ายแรงเดิม ไม่ได้ประมาณค่ารักษาหรือสิทธิการเคลม','Subtract continuing support from monthly spending (minimum 0), multiply by months, add extra recovery costs, then deduct available funds and existing critical illness cover. This does not predict treatment bills or claim eligibility.'],
    ['healthMethod','เทียบค่าห้องอ้างอิงกับสิทธิค่าห้องเดิมเท่านั้น หากมีส่วนต่างหรือร่วมจ่าย ควรตรวจเพิ่ม หากข้อมูลไม่ครบ ยังสรุปไม่ได้ เงินที่พร้อมจ่ายเองไม่ถูกหักจากค่าห้องต่อวัน เพราะเป็นคนละหน่วย','Compare the reference room rate with existing daily room benefits. A gap or cost-sharing prompts further review; missing details prevent a conclusion. A per-episode budget is not deducted from a daily room rate.'],
    ['privacy','คำนวณได้โดยไม่ต้องให้ข้อมูลติดต่อ ข้อมูลอยู่บนหน้านี้เท่านั้น หากขอคำแนะนำต่อ สรุปจะถูกแนบไว้และส่งเมื่อคุณยินยอมและกดส่งฟอร์ม','No contact details are needed to calculate. Figures stay on this page. Continuing prepares an attachment that is sent only when you consent and submit the contact form.'],
    ['pending','กำลังคำนวณ','Updating estimate'],['completePrompt','กรอกข้อมูลหลักให้ครบเพื่อดูผลประเมิน','Complete the core fields to see your estimate'],
    ['invalid','กรุณาใส่ตัวเลขจำนวนเต็ม','Please enter a whole number'],['warning','ค่านี้สูงกว่าช่วงทั่วไป ลองตรวจสอบอีกครั้ง','Above the usual range. Please double-check.'],
    ['reset','เริ่มใหม่เฉพาะแท็บนี้','Reset this tab'],['attached','แนบสรุปจากเครื่องคำนวณแล้ว','Calculator summary attached']
  ].map(([key,th,en])=>({path:'calculatorDesign.'+key,label:key.replace(/([A-Z])/g,' $1'),group:'Calculator design',localized:true,seed:{th,en}})),
  ...[
    ['known','ระบุจำนวนเงิน','Enter amount'],['notSure','ไม่ทราบวงเงิน','I do not know the amount'],['notSureValue','ยังไม่ทราบ','Not sure'],['choose','เลือกคำตอบ','Choose an answer'],
    ['partial','ยังไม่ทราบส่วนขาดสุดท้าย','Final shortfall is not yet known'],['provisionalGap','ยอดก่อนหักประกันเดิม','Amount before existing cover'],
    ['partialNote','ยอดนี้ยังไม่ได้หักประกันเดิมที่คุณไม่ทราบ จึงยังไม่ใช่จำนวนที่ควรซื้อเพิ่ม','Unknown existing cover has not been deducted. This is not an amount to purchase.'],
    ['debtDoubleCount','หากรวมยอดปิดหนี้แล้ว อย่านับค่างวดหนี้เดียวกันซ้ำในค่าใช้จ่ายรายเดือน','If debt is cleared with the lump sum, do not also count its future instalments in monthly expenses.'],
    ['assetDoubleCount','อย่าหักเงินลงทุนทั้งก้อนพร้อมนับรายได้จากเงินก้อนเดียวกันต่อเนื่อง','Do not deduct investment capital while also counting ongoing income from that same capital.'],
    ['ciNextEvent','ใช้เงินก้อนที่ยังจ่ายได้สำหรับเหตุครั้งถัดไป ไม่ใช่ยอดเคลมสะสมสูงสุด และไม่หักวงเงินสุขภาพออกจากเงินพักฟื้น','Use the benefit available for the next qualifying event, not lifetime cumulative claims. Medical limits do not offset recovery cash needs.'],
    ['incomeCoversSpending','รายได้ที่ยังมีอยู่รองรับค่าใช้จ่ายรายเดือนส่วนนี้แล้ว','Continuing income covers this part of monthly spending.'],
    ['valuation','วิธีประเมินค่าใช้จ่ายในอนาคต','Future spending model'],['valuationHelp','แบบตรงใช้ค่าปัจจุบันทุกปี แบบมูลค่าปัจจุบันใช้สมมติฐานที่คุณกำหนดเอง','Simple repeats today’s amount. Present value uses your own assumptions.'],
    ['simple','ไม่ปรับเงินเฟ้อหรือผลตอบแทน','No inflation or return adjustment'],['presentValue','กำหนดสมมติฐานเอง','Use my assumptions'],
    ['inflationPercent','เงินเฟ้อต่อปีที่สมมติ','Assumed annual inflation'],['inflationPercentHelp','จำนวนเต็ม 0–20% ไม่ใช่อัตราที่ CoverMate คาดการณ์','Whole percentage 0–20. Not a CoverMate forecast.'],
    ['returnPercent','ผลตอบแทนสุทธิต่อปีที่สมมติ','Assumed net annual return'],['returnPercentHelp','หลังค่าใช้จ่ายและภาษี จำนวนเต็ม 0–20% ไม่ได้รับประกันผลตอบแทน','After costs and taxes, whole percentage 0–20. Returns are not guaranteed.'],
    ['valuationNote','มูลค่าปัจจุบันใช้ค่าใช้จ่ายต้นปี ปรับเงินเฟ้อและคิดลดตามอัตราที่กรอก ปัดเพียงเศษบาทเมื่อรวมเสร็จ','Present value uses start-of-year expenses, your inflation and discount rates, rounded only to whole baht after summing.'],
    ['medicalOOPBuffer','ค่ารักษาที่ตั้งใจออกเองเพิ่มเติม','Additional medical out-of-pocket buffer'],['medicalOOPBufferHelp','แยกจากผู้ดูแลและค่าเดินทาง อย่ารวมยอดเดียวกันในค่าใช้จ่ายพักฟื้นอีก','Separate from care and travel. Do not repeat the same amount in recovery expenses.'],
    ['publicHealthScheme','สิทธิรักษาหลักของคุณ','Your public treatment entitlement'],['publicHealthSchemeHelp','ใช้เป็นบริบท ไม่แปลงสิทธิรัฐเป็นวงเงินสดโดยอัตโนมัติ','Context only. Public entitlements are not converted into a cash amount.'],
    ['ucs','บัตรทอง','Universal Coverage'],['sso','ประกันสังคม','Social Security'],['civil','สิทธิข้าราชการ','Civil servant scheme'],['other','อื่น ๆ','Other'],
    ['careSetting','รูปแบบการรักษาที่ต้องการ','Preferred care setting'],['careSettingHelp','ใช้ประกอบการตรวจโรงพยาบาลและพื้นที่คุ้มครอง ไม่ใช่การคาดการณ์ค่ารักษา','For hospital and territory review, not a treatment-cost prediction.'],
    ['public','โรงพยาบาลรัฐ','Public hospital'],['private','โรงพยาบาลเอกชน','Private hospital'],['international','รวมการรักษาต่างประเทศ','Including overseas treatment'],
    ['existingHealthStructure','รูปแบบประกันสุขภาพส่วนตัวเดิม','Existing personal health structure'],['existingHealthStructureHelp','ดูจากตารางผลประโยชน์ ถ้าแยกรายการจะไม่แปลงเป็นวงเงินต่อปี','Check the benefit schedule. Itemised benefits are not converted into an annual limit.'],
    ['annual','วงเงินต่อปี','Annual aggregate'],['itemized','วงเงินแยกรายการ','Itemised limits'],
    ['existingAnnualLimit','วงเงินต่อปีของประกันส่วนตัวเดิม','Existing personal annual limit'],['existingAnnualLimitHelp','เฉพาะวงเงินรวมต่อปี ไม่บวกวงเงินรายโรคหรือสิทธิที่เบิกซ้ำไม่ได้','Annual aggregate only. Do not add per-disease limits or overlapping reimbursement.'],
    ['targetAnnualLimit','วงเงินต่อปีเป้าหมาย (ถ้าทราบ)','Target annual limit (if known)'],['targetAnnualLimitHelp','เป็นเป้าหมายที่คุณเลือก ไม่ใช่วงเงินที่ระบบแนะนำให้ทุกคน','Your own target, not a universal recommendation.'],
    ['annualGap','ส่วนต่างวงเงินต่อปี','Annual limit difference'],['percent','%','%'],['perYear','บาท/ปี','THB/year'],
    ['deductibleAmount','ค่าเสียหายส่วนแรก','Deductible amount'],['deductibleAmountHelp','จำนวนที่ต้องออกก่อนตามกรมธรรม์ เงื่อนไขต่อครั้งหรือต่อปีต้องตรวจแยก','Amount payable first. Check whether the policy applies it per episode or year.'],
    ['copayPercent','สัดส่วนร่วมจ่าย','Co-pay percentage'],['copayPercentHelp','เปอร์เซ็นต์จำนวนเต็ม 0–100 ตรวจฐานคำนวณและเพดานกับกรมธรรม์','Whole percentage 0–100. Check the calculation basis and caps in the policy.'],
    ['opdPreference','ต้องการผู้ป่วยนอก (OPD)','Outpatient cover preference'],['opdPreferenceHelp','ตรวจขอบเขตและวงเงินแยกจากผู้ป่วยใน','Review scope and limits separately from inpatient benefits.'],
    ['territory','พื้นที่คุ้มครองที่ต้องการ','Required coverage territory'],['territoryHelp','เงื่อนไขประเทศและข้อยกเว้นต้องตรวจตามแผนจริง','Country conditions and exclusions require policy review.'],['thailand','ประเทศไทย','Thailand'],['worldwide','รวมต่างประเทศ','Including overseas'],
    ['stressEnabled','ลองสถานการณ์ค่าใช้จ่ายที่กำหนดเอง','Explore a self-defined cost scenario'],['stressEnabledHelp','ไม่ใช่ราคาค่ารักษาคาดการณ์หรือการยืนยันสิทธิเรียกร้อง','Not a treatment-price forecast or claim entitlement.'],
    ['scenarioEligibleCost','ค่าใช้จ่ายที่เข้าเงื่อนไขในสถานการณ์นี้','Eligible costs in this scenario'],['scenarioEligibleCostHelp','กรอกเฉพาะค่าใช้จ่ายที่ทราบว่าเข้าเงื่อนไข ไม่ใช่ยอดบิลที่ยังไม่ได้ตรวจ','Only costs you know are eligible, not an unreviewed total bill.'],
    ['scenarioRemainingLimit','วงเงินที่เหลือใช้ได้ในสถานการณ์นี้','Remaining eligible limit for this scenario'],['scenarioRemainingLimitHelp','ตรวจวงเงินคงเหลือและวงเงินย่อยแล้ว ไม่ใช่ทุนตามหน้ากรมธรรม์เสมอไป','After checking remaining and sub-limits, not necessarily the policy headline limit.'],
    ['scenarioOwnPay','ส่วนที่ออกเองตามสมมติฐาน','Illustrative own-payment'],['scenarioBudgetGap','เกินงบออกเองที่กำหนด','Amount above your own-payment budget'],
    ['stressNote','สมมติหักส่วนแรกก่อน แล้วร่วมจ่าย และจำกัดด้วยวงเงินที่เหลือ กรมธรรม์จริงอาจคิดต่างกัน ต้องตรวจเงื่อนไขก่อนใช้ตัดสินใจ','Assumes deductible, then co-pay, then the remaining benefit cap. Actual policies may differ; verify the terms before deciding.'],
    ['healthResultV2','ภาพรวมความคุ้มครองสุขภาพ','Your health coverage review'],['reviewRequired','ยังต้องตรวจรายละเอียดเพิ่มเติม','Further details need review'],['dimensionsAligned','ค่าห้องและวงเงินตรงเป้าหมายที่กรอก','Room and annual limit match your inputs'],
    ['healthNotAdditive','ส่วนต่างวงเงินไม่ใช่จำนวนที่ต้องซื้อเพิ่ม ประกันต่างโครงสร้างอาจเบิกซ้อนกันไม่ได้','A limit difference is not an amount to buy. Different policies may not reimburse the same expense twice.'],
    ['employerContext','สิทธิรัฐและสวัสดิการนายจ้างใช้ประกอบการตรวจ ไม่ถูกหักเป็นเงินประกันส่วนตัวถาวร','Public and employer benefits provide context; they are not deducted as permanent personal cover.'],
    ['itemizedNote','ประกันเดิมแยกรายการ จึงไม่เปรียบเทียบเป็นวงเงินต่อปีตรง ๆ','Existing itemised cover cannot be compared directly as one annual limit.'],
    ['datedReference','ข้อมูลค่าห้องเป็นราคา ณ วันที่ระบุ โปรดยืนยันกับโรงพยาบาลอีกครั้ง','Room data is dated. Confirm the current rate with the hospital.'],
    ['referenceChoice','ข้อมูลโรงพยาบาลที่ตรวจแล้ว','Reviewed hospital reference'],['referenceChoiceHelp','แสดงเฉพาะรายการที่ผ่านการตรวจและยังไม่พ้นวันที่ทบทวน','Only approved records that are still within their review period.'],
    ['referenceUnavailable','รายการเดิมต้องตรวจใหม่ กรุณาเลือกข้อมูลอ้างอิงอีกครั้ง','Previous reference needs review. Please select another reference.'],
    ['healthMethodV2','เปรียบเทียบวงเงินต่อปีเฉพาะประกันโครงสร้างเดียวกัน ค่าห้องเทียบแยกเป็นรายวัน สิทธิรัฐและนายจ้างไม่ถูกแปลงเป็นเงิน หากข้อมูลไม่ทราบจะไม่สรุปว่าไม่มีความคุ้มครอง','Compare annual limits only on a comparable basis; compare rooms separately per day. Public and employer benefits are not converted to cash. Unknown never means no cover.'],
    ['lifeMethodV2','ค่าใช้จ่ายสุทธิต่อเดือน (ขั้นต่ำ 0) × 12 × ปี บวกหนี้และภาระเงินก้อน หักสินทรัพย์ที่กันไว้และประกันเดิม หากเลือกสมมติฐานเองจะคำนวณค่าใช้จ่ายรายปีเป็นมูลค่าปัจจุบันแทน','Net monthly expenses (minimum 0) × 12 × years, plus debt and lump sums, less earmarked assets and existing life cover. Custom assumptions replace the spending total with its present value.'],
    ['ciMethodV2','ค่าใช้จ่ายสุทธิต่อเดือน (ขั้นต่ำ 0) × เดือน บวกค่าใช้จ่ายพักฟื้นและค่ารักษาที่เลือกออกเอง หักเงินสำรองและเงินก้อนโรคร้ายแรงที่ยังจ่ายได้ครั้งถัดไป','Net monthly expenses (minimum 0) × months, plus recovery costs and chosen medical buffer, less earmarked funds and the next available CI benefit.'],
    ['healthAdviceV2','ตรวจวงเงินรายรายการ ค่าห้อง พื้นที่คุ้มครอง ค่าใช้จ่ายร่วม และข้อยกเว้นประกอบ ตัวเลขนี้ไม่ยืนยันว่าความคุ้มครองทั้งหมดเพียงพอ','Review sub-limits, rooms, territory, cost sharing and exclusions. These figures do not establish overall adequacy.'],
    ['planning','ข้อมูลสำหรับช่วยดูทางเลือก','Information for reviewing options'],['planningHelp','ระบุเท่าที่ทราบ หรือข้ามไปพูดคุยกับเราได้ ยังไม่ส่งข้อมูลจนกว่าจะยินยอมและส่งแบบฟอร์ม','Provide what you know, or continue to talk with us. Nothing is sent until you consent and submit the form.'],
    ['planNext','ดูข้อมูลสำหรับเลือกแผน','Review plan requirements'],['attachAndContinue','แนบสรุปและไปแบบฟอร์มติดต่อ','Attach summary and continue to contact'],['skipPlanning','ไปแบบฟอร์มโดยไม่แนบข้อมูลเลือกแผน','Continue without plan-review details'],
    ['age','อายุ','Age'],['ageHelp','อายุเต็มปี ใช้คัดกรองเบื้องต้น บริษัทอาจใช้เกณฑ์นับอายุต่างกัน','Age in full years for preliminary screening. Insurer age conventions may differ.'],
    ['occupationClass','ชั้นอาชีพตามบริษัทประกัน (ถ้าทราบ)','Insurer occupation class (if known)'],['occupationClassHelp','ไม่ต้องเดาชั้นอาชีพ หากไม่ทราบให้ผู้ให้คำปรึกษาตรวจ','Do not guess. An adviser can check the insurer’s classification.'],['class1','ชั้น 1','Class 1'],['class2','ชั้น 2','Class 2'],['class3','ชั้น 3','Class 3'],['class4','ชั้น 4','Class 4'],
    ['basePolicy','มีกรมธรรม์หลัก AIA อยู่แล้ว','Existing AIA base policy'],['basePolicyHelp','สัญญาเพิ่มเติมต้องตรวจรุ่นกรมธรรม์หลักที่แนบได้อีกครั้ง','Riders require a separate compatibility check for the exact base policy.'],
    ['basePolicyId','รหัสแบบกรมธรรม์หลัก (ไม่ใช่เลขกรมธรรม์)','Base plan code (not your policy number)'],['basePolicyIdHelp','ใส่เฉพาะรหัสแบบประกันถ้าทราบ ไม่ใส่เลขกรมธรรม์ส่วนบุคคล เว้นว่างให้ผู้ให้คำปรึกษาตรวจได้','Only the product code if known, never your personal policy number. Leave blank for adviser review.'],
    ['horizonYears','ต้องการคุ้มครองอีกกี่ปี','Desired coverage horizon'],['horizonYearsHelp','ระยะที่ต้องการรองรับภาระ ไม่ใช่ระยะจ่ายเบี้ย','The period to protect your obligations, not the premium payment term.'],
    ['monthlyBudget','งบเบี้ยต่อเดือน (ถ้าทราบ)','Monthly premium budget (if known)'],['monthlyBudgetHelp','ใช้เปรียบเทียบทางเลือก ไม่ลดตัวเลขความต้องการที่คำนวณไว้','Used to compare options, never to reduce the calculated need.'],
    ['annualIncome','รายได้ต่อปี (ถ้าทราบ)','Annual income (if known)'],['annualIncomeHelp','บางแผนมีเงื่อนไขวงเงินตามรายได้ ยังต้องตรวจหลักเกณฑ์จริง','Some plans have income-related limits requiring further verification.'],
    ['residence','ประเทศที่พำนัก','Residence'],['residenceHelp','ใช้ตรวจเงื่อนไขการสมัครเบื้องต้น','Used for preliminary eligibility screening.'],
    ['paInterest','ต้องการดูความคุ้มครองอุบัติเหตุด้วย','Also review accident protection'],['paInterestHelp','แยกการเสียชีวิต อุบัติเหตุค่ารักษา และรายได้ ไม่รวมเป็นยอดเดียวกับประกันชีวิต','Death, accident medical and income needs remain separate from the life total.'],
    ['motorcycle','ใช้รถจักรยานยนต์','Motorcycle exposure'],['motorcycleHelp','ตรวจเงื่อนไขอุบัติเหตุและข้อยกเว้นของแต่ละแผน','Check each plan’s accident terms and exclusions.'],
    ['accidentDeathTarget','เป้าหมายเงินก้อนกรณีเสียชีวิตจากอุบัติเหตุ','Accident-death target'],['existingAccidentDeath','เงินกรณีเสียชีวิตที่ใช้ได้กับอุบัติเหตุอยู่แล้ว','Existing death benefits applicable to accidents'],
    ['accidentMedicalTarget','เป้าหมายค่ารักษาอุบัติเหตุต่อครั้ง','Accident medical target per episode'],['existingAccidentMedical','ค่ารักษาอุบัติเหตุเดิมต่อครั้ง','Existing accident medical limit per episode'],
    ['accidentMonthlyNeed','ค่าใช้จ่ายต่อเดือนเมื่อพักจากอุบัติเหตุ','Monthly accident recovery spending'],['accidentContinuingIncome','รายได้ที่ยังได้รับต่อเดือน','Continuing monthly income'],
    ['accidentRecoveryMonths','เดือนที่ต้องการรองรับ','Months to support'],['existingAccidentIncome','เงินชดเชยรายได้ที่ใช้ได้ตลอดช่วงนี้','Income benefit available over this period'],
    ['paHelp','กรอกเฉพาะผลประโยชน์ที่เข้าเงื่อนไขเดียวกัน อย่านับสิทธิซ้ำ และไม่รวมส่วนต่าง PA เข้ากับยอดชีวิต','Use benefits for the same event only, without double counting. PA gaps are not added to the life total.'],
    ['paDeathGap','ส่วนต่างเงินกรณีเสียชีวิตจากอุบัติเหตุ','Accident-death difference'],['paMedicalGap','ส่วนต่างค่ารักษาอุบัติเหตุ','Accident medical difference'],['paIncomeGap','ส่วนต่างเงินพักฟื้นจากอุบัติเหตุ','Accident recovery income difference'],
    ['awaitingCatalog','ยังไม่มีรายชื่อแผนที่ผ่านการตรวจสำหรับผลนี้ ผู้ให้คำปรึกษาจะช่วยตรวจทางเลือกให้','No verified plan list is available for this result. An adviser can review the options with you.'],
    ['needsInformation','ยังต้องตรวจข้อมูลและเงื่อนไขก่อนแสดงรายชื่อแผน','More information and policy checks are needed before showing candidates.'],
    ['candidateNotice','ตัวเลือกเบื้องต้น ไม่ใช่การรับรองความเหมาะสมหรือการอนุมัติรับประกัน ต้องตรวจเบี้ยและเงื่อนไขจริง','Preliminary candidates, not suitability guarantees or underwriting approval. Verify actual premiums and policy terms.'],
    ['coverageFit','วงเงินตรงตามเป้าหมายที่กรอก','Coverage matches the entered target'],['eligibilityScreened','ผ่านเงื่อนไขเบื้องต้นที่ทราบ','Meets the known preliminary criteria'],['mechanismMatch','ประเภทผลประโยชน์ตรงกับความต้องการ','Benefit type matches the need'],
    ['budgetUnknown','ยังต้องตรวจเบี้ยและงบประมาณ','Premium and budget need review'],['withinBudget','อยู่ในงบที่ระบุ ตามข้อมูลเบี้ยที่ตรวจไว้','Within the stated budget using reviewed premium data'],['overBudget','สูงกว่างบที่ระบุ ไม่เปลี่ยนยอดความต้องการ','Above the stated budget; calculated need is unchanged'],
    ['rememberSession','จำข้อมูลในแท็บนี้จนปิดแท็บ','Remember entries in this tab until it closes'],['sessionUnavailable','เบราว์เซอร์ไม่อนุญาตให้จำข้อมูล ยังใช้คำนวณได้ตามปกติ','Browser storage is unavailable. You can still calculate.'],
    ['invalidV2','ใส่จำนวนเต็มตั้งแต่ 0 และอยู่ในช่วงที่ระบุ ระยะเวลาต้องมากกว่า 0','Enter a nonnegative whole number within the stated range. Durations must be above 0.'],
    ['privacyV2','คำนวณได้โดยไม่ให้ข้อมูลติดต่อ ข้อมูลไม่ถูกส่งระหว่างกรอก การแนบสรุปจะส่งเมื่อคุณยินยอมและกดส่งแบบฟอร์มเท่านั้น','Calculate without contact details. Entries are not transmitted while typing. An attached summary is sent only with your consent and form submission.']
  ].map(([key,th,en])=>({path:'calculatorDesign.'+key,label:key.replace(/([A-Z])/g,' $1'),group:'Calculator design',localized:true,seed:{th,en}})),
  {path:'calculatorDesign.background',label:'Calculator botanical background',group:'Calculator design',media:true,seed:'assets/brand/home-botanical-v1.webp'},
  {path:'calculatorDesign.photo',label:'Calculator optional photo',group:'Calculator design',media:true,seed:''},
  ...['life','ci','health'].map(key=>({path:'calculatorDesign.'+key+'Icon',label:key+' tab icon',group:'Calculator design',media:true,seed:''})),
  ...['monthlyNeed','otherMonthlyIncome','yearsToSupport','debtToClear','extraLumpSum','earmarkedAssets','existingLifeCover','monthlyRecoveryNeed','recoveryMonths','otherSupportIncome','availableEmergencyFunds','existingCriticalIllnessCover','extraRecoveryBudget','roomReference','customRoomDaily','roomBenefit','costSharing','employerCover','personalCover','ownPayBudget'].map(key=>({path:'calculatorDesign.'+key+'Icon',label:key+' input icon',group:'Calculator design',media:true,seed:''})),
  {path:'errorPage.illustration',label:'Error illustration (leave centre blank for status number)',group:'Error page',media:true,seed:'assets/brand/error-illustration-v1.webp'},
  ...[
    ['eyebrow','ขออภัย','Sorry about that'],
    ['missingTitle','ไม่พบหน้าที่คุณต้องการ','We couldn’t find that page'],
    ['missingBody','หน้านี้อาจถูกย้าย ถูกลบ หรือที่อยู่ไม่ถูกต้อง คุณสามารถกลับสู่หน้าหลัก หรือเลือกข้อมูลที่ต้องการด้านล่าง','This page may have moved, been removed, or the address may be incorrect. Return to the homepage or choose a link below.'],
    ['missingBodyMinimal','หน้านี้อาจถูกย้าย ถูกลบ หรือที่อยู่ไม่ถูกต้อง คุณสามารถกลับสู่หน้าหลักเพื่อเริ่มต้นใหม่','This page may have moved, been removed, or the address may be incorrect. Return to the homepage to start again.'],
    ['deniedTitle','ไม่สามารถเข้าถึงหน้านี้ได้','You can’t access this page'],
    ['deniedBody','คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณากลับสู่หน้าหลัก','You don’t have permission to access this page. Please return to the homepage.'],
    ['busyTitle','กรุณารอสักครู่ แล้วลองใหม่','Please wait a moment and try again'],
    ['busyBody','ขณะนี้มีคำขอเข้ามาหลายรายการ กรุณาลองอีกครั้งภายหลัง หรือกลับสู่หน้าหลัก','There are too many requests right now. Please try again later or return to the homepage.'],
    ['unavailableTitle','หน้านี้ยังไม่พร้อมให้บริการชั่วคราว','This page is temporarily unavailable'],
    ['unavailableBody','กรุณาลองอีกครั้งภายหลัง หรือกลับสู่หน้าหลัก','Please try again later or return to the homepage.'],
    ['serverTitle','เกิดข้อขัดข้องในการแสดงหน้านี้','Something went wrong'],
    ['serverBody','กรุณาลองอีกครั้ง หรือกลับสู่หน้าหลัก','Please try again or return to the homepage.'],
    ['timeoutTitle','การเชื่อมต่อใช้เวลานานกว่าปกติ','The connection took too long'],
    ['timeoutBody','กรุณาลองอีกครั้ง หรือกลับสู่หน้าหลัก','Please try again or return to the homepage.'],
    ['genericTitle','ไม่สามารถเปิดหน้านี้ได้','We couldn’t open this page'],
    ['genericBody','กรุณากลับสู่หน้าหลักเพื่อเริ่มต้นใหม่','Please return to the homepage to start again.'],
    ['home','กลับสู่หน้าหลัก','Back to home'],['back','ย้อนกลับหน้าก่อน','Back to previous page'],['retry','ลองอีกครั้ง','Try again'],
    ['retryPending','กำลังลองอีกครั้ง…','Trying again…'],['codeLabel','รหัสข้อผิดพลาด','Error code'],
    ['popular','หรือเลือกดูข้อมูลที่คุณต้องการ','Or explore these links'],
    ['motor','ประกันรถยนต์','Motor insurance'],['review','ตรวจกรมธรรม์','Policy review'],
    ['health','ประกันสุขภาพ','Health insurance'],['contact','ติดต่อเรา','Contact us'],
    ['helpTitle','ต้องการความช่วยเหลือเพิ่มเติม?','Need more help?'],
    ['helpBody','ติดต่อ CoverMate ผ่าน LINE เพื่อสอบถามข้อมูลเพิ่มเติม','Contact CoverMate on LINE for more information.'],
    ['statement','ให้เรื่องประกัน\nเป็นเรื่องที่เข้าใจได้','Making insurance\neasier to understand'],
    ['skip','ข้ามไปยังเนื้อหา','Skip to content']
  ].map(([key,th,en])=>({path:'errorPage.'+key,label:key.replace(/([A-Z])/g,' $1'),group:'Error page',localized:true,seed:{th,en}})),
  {path:'cookieConsent.title',label:'Banner heading',group:'Cookie consent',localized:true,seed:{th:'คุกกี้วิเคราะห์การใช้งาน',en:'Analytics cookies'}},
  {path:'cookieConsent.body',label:'Banner explanation',group:'Cookie consent',localized:true,seed:{th:'ขอใช้ Google Analytics เพื่อปรับปรุงเว็บไซต์ คุณปฏิเสธได้และยังใช้งานได้ตามปกติ',en:'May we use Google Analytics to improve this site? You can decline and still use everything.'}},
  {path:'cookieConsent.accept',label:'Allow analytics',group:'Cookie consent',localized:true,seed:{th:'อนุญาต',en:'Allow'}},
  {path:'cookieConsent.reject',label:'Decline analytics',group:'Cookie consent',localized:true,seed:{th:'ไม่อนุญาต',en:'Decline'}},
  {path:'cookieConsent.settings',label:'Footer settings button',group:'Cookie consent',localized:true,seed:{th:'ตั้งค่าคุกกี้',en:'Cookie settings'}},
  {path:'cookieConsent.details',label:'Details disclosure',group:'Cookie consent',localized:true,seed:{th:'รายละเอียด',en:'Details'}},
  {path:'cookieConsent.explanation',label:'Cookie details',group:'Cookie consent',localized:true,seed:{th:'เมื่ออนุญาต Google จะได้รับข้อมูลหน้าเว็บและการใช้งาน เช่น การคลิกและประเภทอุปกรณ์ เพื่อจัดทำสถิติ โดยเราไม่ส่งชื่อ เบอร์โทร LINE ID หรือข้อความในฟอร์มไปกับเหตุการณ์ GA4 คุกกี้ _ga และ _ga_* มีอายุสูงสุด 180 วัน Google อาจประมวลผลข้อมูลในต่างประเทศ',en:'If you allow analytics, Google receives page and usage information such as clicks and device type for statistics. Our GA4 events exclude names, phone numbers, LINE IDs and form messages. The _ga and _ga_* cookies last up to 180 days. Google may process data outside your country.'}},
  {path:'cookieConsent.retention',label:'Choice and withdrawal explanation',group:'Cookie consent',localized:true,seed:{th:'เราจำตัวเลือกนี้ในเบราว์เซอร์สูงสุด 180 วัน หากเบราว์เซอร์ไม่อนุญาตให้บันทึก จะจำได้เฉพาะหน้านี้ ถอนความยินยอมได้ที่ “ตั้งค่าคุกกี้” ท้ายเว็บ การถอนจะหยุดการเก็บข้อมูลใหม่ ไม่ลบข้อมูลที่ส่งไปแล้ว และไม่เปลี่ยนความยินยอมในฟอร์มติดต่อ',en:'We remember your choice in this browser for up to 180 days, or just this page if storage is blocked. Withdraw via Cookie settings in the footer. Withdrawal stops new collection, not data already sent, and does not change contact-form consent.'}},
  {path:'cookieConsent.googlePrivacy',label:'Google privacy link',group:'Cookie consent',localized:true,seed:{th:'นโยบายความเป็นส่วนตัวของ Google',en:'Google privacy policy'}},
  {path:'cookieConsent.allowed',label:'Allowed status',group:'Cookie consent',localized:true,seed:{th:'ปัจจุบัน: อนุญาตคุกกี้วิเคราะห์',en:'Current choice: analytics allowed'}},
  {path:'cookieConsent.denied',label:'Declined status',group:'Cookie consent',localized:true,seed:{th:'ปัจจุบัน: ไม่อนุญาตคุกกี้วิเคราะห์',en:'Current choice: analytics declined'}},
  {path:'cookieConsent.close',label:'Close without changes',group:'Cookie consent',localized:true,seed:{th:'ปิดโดยไม่เปลี่ยนตัวเลือก',en:'Close without changes'}},
  {path:'publicCopy.motorLogoNotice',label:'Motor insurer logo note',group:'Shared section labels',localized:true,legacyInline:true,seed:{th:'โลโก้เป็นเครื่องหมายการค้าของบริษัทนั้น ๆ · แสดงบริษัทที่จัดเบี้ยเทียบให้ได้',en:'Logos are trademarks of their owners · shown as the insurers I can quote and compare'}},
  {path:'publicCopy.tierClassLabel',label:'Comparison: class heading',group:'Shared section labels',localized:true,legacyInline:true,seed:{th:'ชั้นประกัน',en:'Class'}},
  {path:'publicCopy.tierBestLabel',label:'Comparison: suitability heading',group:'Shared section labels',localized:true,legacyInline:true,seed:{th:'เหมาะกับใคร',en:'Best for'}},
  {path:'publicCopy.storyEventLabel',label:'Story: event heading',group:'Shared section labels',localized:true,legacyInline:true,seed:{th:'เกิดอะไรขึ้น',en:'What happened'}},
  {path:'publicCopy.storyActionLabel',label:'Story: response heading',group:'Shared section labels',localized:true,legacyInline:true,seed:{th:'เราทำอะไร',en:'What we do'}},
  {path:'homeDesign.botanicalIllustration',label:'Hero background artwork',group:'Home design',media:true,seed:'assets/brand/home-hero-background-v2.webp'},
  {path:'homeDesign.licenceEyebrow',label:'Licence section: eyebrow',group:'Home licences',localized:true,seed:{th:'ABOUT COVERMATE',en:'ABOUT COVERMATE'}},
  {path:'homeDesign.licenceTitle',label:'Licence section: heading',group:'Home licences',localized:true,seed:{th:'ใบอนุญาตและบทบาทการให้บริการ',en:'Our licences and advisory roles'}},
  {path:'homeDesign.licenceStatement',label:'Licence section: statement',group:'Home licences',localized:true,seed:{th:'มั่นใจได้ เพราะเราดำเนินการ\nอย่างถูกต้องและโปร่งใส',en:'Confidence through\nprofessional, transparent service'}},
  {path:'homeDesign.licenceBackground',label:'Licence section: background artwork',group:'Home licences',media:true,seed:'assets/brand/home-hero-background-v2.webp'},
  ...localizedCmsFields("homeDesign","Home design",[
    ["heroStatement","Optional hero statement","",""],
    ["aboutTeaser","Optional about teaser","",""],
    ["detailsLabel","Read more","อ่านเพิ่มเติม","Read more"],
    ["comparisonLabel","Full comparison","เปรียบเทียบความคุ้มครองทุกชั้น","Compare all cover levels"],
    ["motorLabel","Motor page link","ดูประกันรถยนต์ทั้งหมด","Explore motor insurance"],
    ["menuLabel","Navigation menu","เมนู","Menu"],
    ["closeLabel","Close menu","ปิดเมนู","Close menu"],
    ["optionalLabel","Optional form details","รายละเอียดเพิ่มเติม (ไม่บังคับ)","Additional details (optional)"],
    ["contactChannelsLabel","Contact channels heading","ช่องทางติดต่อและเวลาทำการ","Contact details & hours"]
  ]),
  ...localizedCmsFields("homeDesign","Home contact",[
    ["contactFormHeading","Form heading","ส่งคำถามถึงเรา","Send us your question"],
    ["contactFormHelper","Form introduction","ฝากข้อมูลไว้ แล้วเราจะติดต่อกลับตามช่องทางที่คุณระบุ","Leave your details and we will reply through your chosen contact channel."],
    ["contactLineLabel","LINE label","พูดคุยกับเราได้ที่","Chat with us on LINE"],
    ["contactFacebookHelper","Facebook helper","ติดตามข่าวสารหรือส่งข้อความถึงเรา","Follow our updates or send us a message"],
    ["contactHoursLabel","Hours label","เวลาทำการ","Business hours"],
    ["contactAreaLabel","Service area label","พื้นที่ให้บริการ","Service area"],
    ["contactReassurance","Reassurance","สอบถามก่อนได้ ไม่จำเป็นต้องตัดสินใจทันที","Ask us first. There is no need to decide right away."],
    ["contactNamePlaceholder","Name placeholder","เช่น ชื่อเล่นของคุณ","For example, your preferred name"],
    ["contactContactPlaceholder","Contact placeholder","เช่น LINE ID หรือเบอร์โทรของคุณ","Your LINE ID or phone number"],
    ["contactDetailsPlaceholder","Details placeholder","เล่าเรื่องที่อยากให้เราช่วยดูเพิ่มเติม","Tell us what you would like help with"]
  ]),
  {path:'homeDesign.comparisonTitle',label:'หัวตารางเปรียบเทียบ',group:'Motor comparison',localized:true,seed:{th:'ตารางเปรียบเทียบความคุ้มครอง',en:'Compare motor coverage'}},
  {path:'homeDesign.comparisonSubtitle',label:'คำอธิบายหัวตาราง',group:'Motor comparison',localized:true,seed:{th:'เลือกความคุ้มครองที่ใช่ สำหรับคุณ',en:'Find the cover that fits you'}},
  {path:'homeDesign.comparisonMobileSubtitle',label:'คำแนะนำการเปิดหัวข้อบนมือถือ',group:'Motor comparison',localized:true,seed:{th:'เลือกหัวข้อเพื่อดูความคุ้มครองของแต่ละชั้น',en:'Choose a topic to compare each class'}},
  {path:'homeDesign.comparisonNotesLabel',label:'ชื่อแถวหมายเหตุ',group:'Motor comparison',localized:true,seed:{th:'หมายเหตุ',en:'Notes'}},
  {path:'homeDesign.comparisonStatement',label:'ข้อความปิดท้ายตาราง (ไม่บังคับ)',group:'Motor comparison',localized:true,seed:{th:'ขับขี่สบายใจ\nให้เราดูแล',en:'Drive with confidence.\nWe are here for you.'}},
  {path:'homeDesign.contactBackground',label:'Background artwork',group:'Home contact',media:true,seed:'assets/brand/home-hero-background-v2.webp'},
  ...['line','facebook','hours','area','reassurance','form'].map(key => ({path:'homeDesign.contactIcon'+key[0].toUpperCase()+key.slice(1),label:key+' icon override',group:'Home contact',media:true,seed:key==='line'?'assets/brand/LINE_Brand_icon.png':key==='facebook'?'assets/brand/facebook-icon.svg':''})),
  ...localizedCmsFields("lineContact","LINE contact",[
    ["launcher","Floating button label","ติดต่อ CoverMate ผ่าน LINE","Contact CoverMate on LINE"],
    ["intro","Introduction","ยินดีให้คำปรึกษาเรื่องประกัน","Here to help with your insurance questions"],
    ["title","Heading","มีเรื่องไหนให้ช่วยดูไหม?","What can we help you with?"],
    ["body","Description","ถามเรื่องความคุ้มครอง หรือให้ช่วยดูกรมธรรม์เดิม พูดคุยกับเราผ่าน LINE ได้เลย","Ask about coverage or your existing policy. Continue the conversation with us on LINE."],
    ["action","Contact button","คุยผ่าน LINE","Chat on LINE"]
  ]),
  ...localizedCmsFields("footer","Footer design",[
    ["licenceHelper","Licence introduction","ข้อมูลใบอนุญาตที่ตรวจสอบได้","Verifiable licence information"],
    ["navHelper","Navigation introduction","ข้อมูลที่คุณอาจสนใจ","Explore useful information"],
    ["contactHelper","Contact introduction","เราพร้อมดูแลคุณ","We are here to help"],
    ["statement","Closing statement","ดูแล...ในทุกช่วงของชีวิต","Here for every stage of life"],
    ["categoryLine","Closing brand line","LIFE · HEALTH · MOTOR · A BRIGHTER TOMORROW TOGETHER","LIFE · HEALTH · MOTOR · A BRIGHTER TOMORROW TOGETHER"]
  ]),
  {path:'footer.backgroundArt',label:'Background artwork',group:'Footer design',media:true,seed:'assets/brand/home-hero-background-v2.webp'},
  ...['licence','nav','contact','line','facebook','hours'].map(key => ({path:'footer.icon'+key[0].toUpperCase()+key.slice(1),label:key+' icon override',group:'Footer design',media:true,seed:key==='line'?'assets/brand/LINE_Brand_icon.png':key==='facebook'?'assets/brand/facebook-icon.svg':''})),
  {path:'homeDesign.consentChanged',label:'Updated consent notice',group:'Form messages',localized:true,seed:{th:'ข้อความยินยอมมีการอัปเดต กรุณาอ่านและยืนยันใหม่ก่อนส่ง ข้อมูลที่กรอกยังอยู่',en:'The consent text has changed. Please read and confirm it again before sending. Your entries are still here.'}},
  {path:'homeDesign.formUnavailable',label:'Form unavailable notice',group:'Form messages',localized:true,seed:{th:'แบบฟอร์มนี้ปิดรับชั่วคราว ข้อมูลของคุณยังไม่ได้ถูกส่ง สามารถติดต่อผ่านช่องทางที่แสดงบนเว็บไซต์',en:'This form is temporarily unavailable. Your information has not been sent. Please use the contact channels shown on the site.'}},
  {path:'homeDesign.returnLabel',label:'Return to consultation',group:'Home design',localized:true,seed:{th:'กลับไปที่แบบฟอร์ม',en:'Return to the form'}},
  {path:'homeDesign.feesStatement',label:'Fees: heading statement',group:'Transparency design',localized:true,seed:{th:'โปร่งใส\nและพูดตรงเสมอ',en:'Open and honest,\nalways'}},
  {path:'homeDesign.privacyStatement',label:'Privacy: heading statement',group:'Transparency design',localized:true,seed:{th:'ข้อมูลของคุณ\nเราดูแลอย่างจริงจัง',en:'Your information,\nhandled with care'}},
  {path:'homeDesign.feesSummaryLabel',label:'Fees: note heading',group:'Transparency design',localized:true,seed:{th:'สรุปสั้น ๆ',en:'In short'}},
  {path:'homeDesign.privacySummaryLabel',label:'Privacy: note heading',group:'Transparency design',localized:true,seed:{th:'การดูแลข้อมูลของคุณ',en:'Looking after your information'}},
  {path:'homeDesign.feesClosingStatement',label:'Fees: closing statement',group:'Transparency design',localized:true,seed:{th:'ดูแลคุณ\nอย่างจริงใจ',en:'Here for you,\nwith care'}},
  {path:'homeDesign.privacyClosingStatement',label:'Privacy: closing statement',group:'Transparency design',localized:true,seed:{th:'เป็นส่วนตัว\nและใส่ใจ',en:'Private,\nand personal'}},
  ...['fees','privacy','transparencyNote'].map(key => ({path:'homeDesign.'+key+'Icon',label:key+' icon override',group:'Transparency design',media:true,seed:''})),
  ...localizedCmsFields("homeDesign","Home design",[
    ["includeCalculator","Explicit calculator sharing","แนบผลประเมินนี้ในคำปรึกษา","Include this estimate in my enquiry"],
    ["logoNotice","Insurer logo note","โลโก้เป็นเครื่องหมายการค้าของแต่ละบริษัท","Logos are trademarks of their respective owners."],
    ["coveredLabel","Matrix: covered","คุ้มครอง","Covered"],
    ["conditionalLabel","Matrix: conditional","มีเงื่อนไข","Conditional"],
    ["notCoveredLabel","Matrix: not covered","ไม่คุ้มครอง","Not covered"],
    ["offlineError","Offline form message","ขณะนี้ออฟไลน์ ข้อมูลที่กรอกยังอยู่ กรุณาเชื่อมต่อแล้วลองอีกครั้ง","You are offline. Your entries are still here; reconnect and try again."],
    ["uncertainError","Unconfirmed submission","ยังยืนยันการรับข้อมูลไม่ได้ ข้อมูลที่กรอกยังอยู่ กรุณาลองอีกครั้งหรือติดต่อทาง LINE","We could not confirm receipt. Your entries are still here. Retry or contact us on LINE."]
  ]),
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
  { path: 'lifeFocus.licenceIcon', label: 'Life focus: licence icon', group: 'Life focus', media: true, seed: '' },
  { path: 'lifeFocus.noUnitLinkedIcon', label: 'Life focus: unit-linked policy icon', group: 'Life focus', media: true, seed: '' },
  { path: 'lifeFocus.exclusionsIcon', label: 'Life focus: exclusions icon', group: 'Life focus', media: true, seed: '' },
  { path: 'lifeFocus.claimsIcon', label: 'Life focus: claims icon', group: 'Life focus', media: true, seed: '' },
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
  return path.split('.').reduce((value, key) => Array.isArray(value) && key.startsWith('@') ? value.find(item => item && item.id === key.slice(1)) : value && typeof value === 'object' ? value[key] : undefined, config);
}

function cmsSet(config, path, value) {
  const keys = path.split('.');
  if (keys.some(key => ['__proto__', 'constructor', 'prototype'].includes(key))) throw new Error('Invalid CMS field path');
  let target = config;
  keys.slice(0, -1).forEach(key => {
    if (Array.isArray(target) && key.startsWith('@')) {
      target = target.find(item => item && item.id === key.slice(1));
      if (!target) throw new Error('Missing CMS content ID');
      return;
    }
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

// The same slot inventory drives Admin controls, crop ratios and media validation.
function cmsImageSlots(config, lang = 'th') {
  const slots = [];
  const add = (path, label, width = 512, height = 512) => slots.push({path, label, width, height, value:cmsMedia(cmsGet(config, path))});
  CMS_CONTENT_FIELDS.filter(field => field.media).forEach(field => {
    const size = /\.(headerLogo|footerLogo)$/.test(field.path) ? [1200,375]
      : field.path === 'seo.image' ? [1200,630]
      : field.path === 'calculatorDesign.photo' ? [800,600]
      : field.path === 'advisor.photo' ? [512,640]
      : field.path === 'calculatorDesign.background' ? [1024,1536]
      : ['homeDesign.botanicalIllustration','homeDesign.licenceBackground','homeDesign.contactBackground','footer.backgroundArt'].includes(field.path) ? [1800,600] : [512,512];
    add(field.path + (field.localized ? '.' + lang : ''), field.label + (field.localized ? ' (' + lang.toUpperCase() + ')' : ''), ...size);
  });
  add('brand.advisorLogo', 'Advisor logo');
  const sections = (config.sections || []).map(section => ({section, path:'sections.@' + section.id}));
  for (const key of ['hero','trust','cover']) if (config.motorPage?.[key]) sections.push({section:config.motorPage[key],path:'motorPage.' + key});
  for (const {section, path} of sections) {
    for (const [index, item] of (section.items || []).entries()) {
      const base = path + '.items.@' + item.id;
      const label = section.id + ' / ' + (item[lang]?.title || item[lang]?.label || item.name || String(index + 1));
      if (section.type === 'insurers' || Object.hasOwn(item,'logo')) add(base + '.logo',label + ' / logo',416,288);
      if (section.type === 'tiers') add(base + '.illustration',label + ' / illustration');
      if (section.type === 'testimonials') add(base + '.photo',label + ' / photo');
      if (['trust','products','review','steps','claim','renew','fees','pdpa'].includes(section.type)) add(base + '.iconImage',label + ' / icon');
    }
    for (const [index, card] of (section.cards || []).entries()) {
      if (section.type === 'insurers' || Object.hasOwn(card,'logo')) add(path + '.cards.@' + card.id + '.logo',section.id + ' / card ' + (index+1) + ' / logo',600,240);
      if (section.type === 'fees') add(path + '.cards.@' + card.id + '.iconImage',section.id + ' / ' + (card[lang]?.title || 'card ' + (index+1)) + ' / icon');
    }
    if (section.type === 'fit') for (const [id, situation] of Object.entries(section.calculator?.situations || {})) {
      if (/^[\w-]+$/.test(id)) add(path + '.calculator.situations.' + id + '.iconImage','Calculator / ' + (situation[lang] || id) + ' / icon');
    }
  }
  return slots;
}

function mergeGuidesIntoFaq(config) {
  const guides = (config.sections || []).find(section => section && section.id === 'guides' && section.type === 'guides');
  if (!guides) return config;
  let faq = config.sections.find(section => section && section.id === 'faq');
  if (!faq) {
    faq = { id:'faq', type:'faq', on:guides.on !== false, bg:guides.bg || 'bg', cols:1,
      th:{kicker:'',title:'คำถามที่พบบ่อย',body:''}, en:{kicker:'',title:'Frequently asked questions',body:''}, items:[] };
    config.sections.splice(config.sections.indexOf(guides), 0, faq);
  }
  if (!Array.isArray(faq.items)) faq.items = [];
  const used = new Set(faq.items.map(item => item && item.id));
  const imported = new Set(faq.items.map(item => item && item.sourceGuideId).filter(Boolean));
  (guides.items || []).filter(item => item && typeof item === 'object').forEach((item, index) => {
    const sourceId = item.id || 'guide-' + (index + 1);
    if (imported.has(sourceId)) return;
    const baseId = /^[\w-]{1,120}$/.test(sourceId) ? sourceId : 'guide-' + (index + 1);
    let id = baseId, suffix = 1;
    while (used.has(id)) id = baseId.slice(0, 110) + '-guide-' + suffix++;
    used.add(id);
    const entry = { ...item, id, sourceGuideId:sourceId, on:guides.on !== false && item.on !== false };
    ['th','en'].forEach(lang => {
      const { title = '', body = '', ...metadata } = item[lang] || {};
      entry[lang] = { ...metadata, q:title, a:body };
    });
    faq.items.push(entry);
    imported.add(sourceId);
  });
  // Recovery snapshot only; the FAQ items are the sole editable/rendered owners.
  config.cmsArchives = { ...config.cmsArchives, guides:JSON.parse(JSON.stringify(guides)) };
  config.sections = config.sections.filter(section => section !== guides);
  if (Array.isArray(config.motorPage?.sections)) config.motorPage.sections = config.motorPage.sections.filter(id => id !== 'guides');
  return config;
}

function migrateCmsContent(config) {
  const next = JSON.parse(JSON.stringify(config || {}));
  if (Number(next.cmsContentVersion || 0) >= CMS_CONTENT_VERSION) return mergeGuidesIntoFaq(next);
  const previousVersion = Number(next.cmsContentVersion || 0);
  // Replace only the bundled legacy mark, never a custom upload or an intentional blank.
  if (previousVersion < 17) ['homeDesign.contactIconLine','footer.iconLine'].forEach(path => {
    if (cmsGet(next,path) === 'assets/brand/line-icon.svg') cmsSet(next,path,'assets/brand/LINE_Brand_icon.png');
  });
  // Classify legacy relationship cards once; later copy/media edits keep this role.
  if (previousVersion < 11) (next.sections || []).filter(section => section.type === 'insurers').forEach(section => {
    (section.cards || []).forEach(card => {
      if (card.licenceRole !== undefined) return;
      const body = [card.th?.body, card.en?.body].filter(Boolean).join(' ');
      card.licenceRole = /\{\{brokerLicence\}\}/.test(body) || card.logo === 'assets/logos/srikrung-logo.png' ? 'broker'
        : /\{\{lifeLicence\}\}/.test(body) || card.logo === 'assets/logos/aia-logo.png' ? 'life' : '';
    });
  });
  // Assign presentation metadata once so icons follow stable item IDs after reordering.
  if (previousVersion < 9) (next.sections || []).forEach(section => {
    const icons = section.type === 'fees' ? ['chart','ban','chat','heartOutline'] : section.type === 'pdpa' ? ['file','settings','users','clock','user'] : null;
    if (!icons) return;
    (section.items || []).forEach((item,index) => {
      if (item.icon === undefined) item.icon = icons[index] || 'file';
      if (item.tone === undefined) item.tone = (section.type === 'fees' ? [1,2] : [2]).includes(index) ? 'sage' : 'accent';
    });
    if (section.type === 'fees') (section.cards || []).forEach((card,index) => {
      if (card.icon === undefined) card.icon = ['file','handCoins','shieldCheck'][index] || 'file';
      if (card.tone === undefined) card.tone = index === 2 ? 'sage' : 'accent';
    });
  });
  // Seed only newly introduced presentation fields; intentional blanks stay blank.
  if (previousVersion >= 5) {
    CMS_CONTENT_FIELDS.filter(field => (previousVersion < 18 && field.group === 'Motor comparison') || (previousVersion < 17 && field.group === 'LINE contact') || (previousVersion < 15 && field.group === 'Advisor profile') || (previousVersion < 14 && field.group === 'Contact submission') || field.group === 'Calculator design' || field.group === 'Error page' || field.group === 'Cookie consent' || field.group === 'Transparency design' || (previousVersion < 8 && field.group === 'Footer design') || (previousVersion < 7 && field.group === 'Home contact') || (previousVersion < 6 && field.group === 'Home licences')).forEach(field => {
      if (field.localized) ['th','en'].forEach(lang => {
        const path = field.path + '.' + lang;
        if (cmsGet(next, path) === undefined) cmsSet(next, path, field.seed[lang]);
      });
      else if (cmsGet(next, field.path) === undefined) cmsSet(next, field.path, field.seed);
    });
    next.cmsContentVersion = CMS_CONTENT_VERSION;
    return mergeGuidesIntoFaq(next);
  }
  if (previousVersion < 5) {
    ['header','motorPage'].forEach(key => (next[key]?.nav || []).forEach(item => {
      if (typeof item.label === 'string') item.label = {th:item.label,en:item.label};
    }));
    (next.sections || []).filter(section => ['review','renew'].includes(section.type)).forEach(section => {
      (section.items || []).forEach(item => ['th','en'].forEach(lang => {
        const copy = item[lang];
        if (copy && copy.title === undefined && typeof copy.label === 'string') copy.title = copy.label;
      }));
    });
  }
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
  next.homeDesign.schemaVersion = 1;
  next.homeDesign.preset = 'warm-advisory-no-portrait';
  ['featuredTierIds', 'previewAxisIds', 'taskLinks'].forEach(key => {
    if (!Array.isArray(next.homeDesign[key])) next.homeDesign[key] = [];
  });
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
  return mergeGuidesIntoFaq(next);
}

function resolveCmsContent(value, config) {
  const fields = { lifeLicence: 'licences.life.number', nonLifeLicence: 'licences.nonLife.number', brokerLicence: 'licences.broker.number' };
  if (typeof value === 'string') return value.replace(/\{\{(lifeLicence|nonLifeLicence|brokerLicence|activeMotorInsurerCount)\}\}/g, (_, key) => {
    if (key !== 'activeMotorInsurerCount') return cmsGet(config, fields[key]) || '';
    const section = (config.sections || []).find(item => item.id === 'insurers');
    return Array.isArray(section?.items) ? String(section.items.filter(item => item && item.on !== false).length) : '';
  });
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
  const design = config.homeDesign;
  for (const key of ['featuredTierIds', 'previewAxisIds']) {
    design[key] = [...new Set((Array.isArray(design[key]) ? design[key] : []).filter(id => typeof id === 'string' && /^[\w-]{1,120}$/.test(id)))].slice(0, 50);
  }
  const taskIds = new Set();
  design.taskLinks = (Array.isArray(design.taskLinks) ? design.taskLinks : []).filter(task => task && typeof task === 'object').slice(0, 20).map((task, index) => {
    let id = typeof task.id === 'string' && /^[\w-]{1,120}$/.test(task.id) ? task.id : 'home-task-' + index;
    while (taskIds.has(id)) id += '-copy';
    taskIds.add(id);
    const target = String(task.target || '').trim();
    return { id, on:task.on !== false, label:{ th:String(task.label?.th || '').trim().slice(0, 160), en:String(task.label?.en || '').trim().slice(0, 160) }, target:/^(#[A-Za-z0-9_-]+|\/(?:motor)?(?:#[A-Za-z0-9_-]+)?)$/.test(target) ? target : '' };
  });
  ['header', 'motorPage'].forEach(key => {
    const owner = config[key];
    if (!owner || !Array.isArray(owner.nav)) return;
    owner.nav = owner.nav.filter(item => item && typeof item === 'object').map(item => {
      let href = String(item.href || '').trim();
      if (key === 'header' && href === '#insurers') href = '#motor';
      const label = typeof item.label === 'string' ? item.label : { th: String(item.label && item.label.th || '').trim().slice(0, 80), en: String(item.label && item.label.en || '').trim().slice(0, 80) };
      return { ...item, label, href: /^(#[A-Za-z0-9_-]+|\/(?:motor)?(?:#[A-Za-z0-9_-]+)?)$/.test(href) ? href : '' };
    });
  });
  sanitizeCmsMediaAndLinks(config);
  return config;
}

function setCmsCopy(config, path, value) {
  cmsSet(config, path, value);
  config.cmsLegacyCopy = (Array.isArray(config.cmsLegacyCopy) ? config.cmsLegacyCopy : []).filter(key => key !== path);
}

function isSemanticCopyPath(config, path) {
  const section = /^(?:(?:sections\.@[\w-]+|motorPage\.(?:hero|trust|cover))\.(?:(?:items|cards)\.@[\w-]+\.)?(?:th|en)\.[A-Za-z][A-Za-z0-9]*|sections\.@[\w-]+\.heads\.@[\w-]+\.(?:th|en))$/;
  const shared = /^(?:(?:brand\.(?:name|fullName|role|credential)|contact\.(?:hours|area)|footer\.(?:tagline|legal)|header\.cta)\.(?:th|en)|(?:header|motorPage)\.nav\.\d+\.label\.(?:th|en)|homeDesign\.taskLinks\.@[\w-]+\.label\.(?:th|en))$/;
  const calculator = /^sections\.@[\w-]+\.calculator\.(?:situations\.[\w-]+\.(?:(?:th|en)|recs\.\d+\.(?:th|en|wth|wen))|health\.selectedRoomReference\.(?:hospitalName|roomType|note)\.(?:th|en))$/;
  const tierRemark = /^sections\.@[\w-]+\.items\.@[\w-]+\.cellRemarks\.[\w-]+\.(?:th|en)$/;
  return (section.test(path) || shared.test(path) || calculator.test(path) || tierRemark.test(path)) && typeof cmsGet(config, path) === 'string';
}

function adoptLegacyGuideCopy(next, text) {
  const faq = (next.sections || []).find(section => section && section.id === 'faq');
  (faq?.items || []).filter(item => item && item.sourceGuideId).forEach(item => {
    ['th','en'].forEach(lang => Object.entries({title:'q',body:'a',label:'label',meta:'meta'}).forEach(([oldField, field]) => {
      const oldKey = 'cms:sections.@guides.items.@' + item.sourceGuideId + '.' + lang + '.' + oldField;
      if (!Object.prototype.hasOwnProperty.call(text, oldKey)) return;
      const path = 'sections.@faq.items.@' + item.id + '.' + lang + '.' + field;
      setCmsCopy(next, path, String(text['cms:' + path] ?? text[oldKey]));
      delete text[oldKey];
    }));
  });
}

function sanitizeCmsMediaAndLinks(config) {
  const sections = [...(config.sections || []), ...['hero','trust','cover'].map(key => config.motorPage?.[key])].filter(Boolean);
  for (const section of sections) {
    if (section.type === 'insurers') (section.cards || []).forEach(card => {
      if (card.licenceRole !== undefined && !['','life','broker'].includes(card.licenceRole)) card.licenceRole = '';
    });
    for (const owner of [section,section.th,section.en].filter(Boolean)) for (const key of ['cta1href','cta2href','claimHref']) {
      if (Object.hasOwn(owner,key)) owner[key] = /^(#[A-Za-z0-9_-]+|\/(?:motor)?(?:#[A-Za-z0-9_-]+)?)$/.test(String(owner[key] || '')) ? owner[key] : '';
    }
  }
  const imageSlots = [...cmsImageSlots(config,'th'), ...cmsImageSlots(config,'en')];
  imageSlots.forEach(slot => { if (cmsGet(config,slot.path) !== undefined) cmsSet(config,slot.path,slot.value); });
  const edits = config.mediaEdits || {};
  config.mediaEdits = Object.fromEntries(imageSlots.filter(slot => edits[slot.path] && edits[slot.path].output === slot.value).map(slot => {
    const edit = edits[slot.path];
    return [slot.path,{output:slot.value,source:cmsMedia(edit.source)}];
  }));
}

// These three heading positions predate both layouts. Unknown positions are
// retained for review, never applied to a different text node in the new Home.
function adaptLegacyHomeCopy(config, overrides) {
  const next = JSON.parse(JSON.stringify(config));
  const text = { ...overrides };
  adoptLegacyGuideCopy(next, text);
  ['hero', 'insurers'].forEach(id => ['kicker','title','body'].forEach((field, index) => ['th','en'].forEach(lang => {
    const key = id + ':' + index + ':' + lang;
    const path = 'sections.@' + id + '.' + lang + '.' + field;
    if (!Object.prototype.hasOwnProperty.call(text, key) || !isSemanticCopyPath(next, path)) return;
    setCmsCopy(next, path, String(text[key]));
    delete text[key];
  })));
  // Legacy selector option ownership already covered by the CMS regression fixture.
  ['th','en'].forEach(lang => {
    const key = 'talk:13:' + lang;
    const path = 'formOptions.query.quote.' + lang;
    if (!(next.cmsLegacyCopy || []).includes(path) || !Object.prototype.hasOwnProperty.call(text, key)) return;
    const field = CMS_CONTENT_FIELDS.find(field => field.path === 'formOptions.query.quote');
    if (cmsGet(next, path) === field.seed[lang]) setCmsCopy(next, path, String(text[key]));
    delete text[key];
  });
  return { config: next, text };
}
// COVERMATE_CMS_SCHEMA_END

export { CMS_CONTENT_VERSION, CMS_CONTENT_FIELDS, normalizeTierRemarks, cmsGet, cmsSet, cmsMedia, cmsImageSlots, migrateCmsContent, resolveCmsContent, sanitizeCmsFields, isSemanticCopyPath, adaptLegacyHomeCopy };
export const DEFAULT_SEO = {
  title: { th: "", en: "" },
  description: { th: "", en: "" }
};
export const PRODUCT_HEADER_NAV = [
  { label: { th: "ความคุ้มครอง", en: "Cover" }, href: "#cover" },
  { label: { th: "ตรวจกรมธรรม์", en: "Policy review" }, href: "#review" },
  { label: { th: "ประกันรถยนต์", en: "Motor" }, href: "#motor" },
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
        if (Object.prototype.hasOwnProperty.call(item, "illustration")) {
          item.illustration = cleanMediaReference(item.illustration, "");
        }
        if (Object.prototype.hasOwnProperty.call(item, "photo")) item.photo = cleanMediaReference(item.photo, "");
        if (Object.prototype.hasOwnProperty.call(item, "photoAlt")) item.photoAlt = cleanText(item.photoAlt, 120);
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
    const isInsurerInlineText = /^(hero|insurers):\d+:(th|en)$/.test(key);
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
  normalizeTierRemarks(next, { mutate: true });
  return next;
}

export function sanitizeStateDoc(state, options = {}) {
  if (!state || !state.config) return state;
  const input = cloneJSON(state.config);
  const text = { ...(state.text || {}) };
  adoptLegacyGuideCopy(input, text);
  Object.keys(text).filter(key => key.startsWith('cms:')).forEach(key => {
    const path = key.slice(4);
    if (!isSemanticCopyPath(input, path)) return;
    setCmsCopy(input, path, String(text[key]).slice(0, 10000));
    delete text[key];
  });
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
  cmsImageSlots,
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
  normalizeTierRemarks,
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
