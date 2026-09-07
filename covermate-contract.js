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

function normalizeProductDecisionCopy(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/ไม่ต้องจัดการคนเดียว/g, "ไม่จำเป็นต้องจัดการเพียงลำพัง")
    .replace(/สู้คนเดียว/g, "จัดการเพียงลำพัง")
    .replace(/ประกันชีวิตและสุขภาพ\s*เราให้บริการผ่าน AIA โดยตรง/g, "ประกันชีวิตและสุขภาพดำเนินการผ่าน AIA")
    .replace(/ชีวิตและสุขภาพ\s*เราให้บริการผ่าน AIA โดยตรง/g, "ชีวิตและสุขภาพดำเนินการผ่าน AIA")
    .replace(/ชีวิตและสุขภาพ\s*ผมเป็นตัวแทน AIA โดยเฉพาะ/g, "ชีวิตและสุขภาพดำเนินการผ่าน AIA")
    .replace(/เราให้บริการผ่าน AIA โดยตรง/g, "ดำเนินการผ่าน AIA")
    .replace(/เราให้บริการผ่าน AIA/g, "ดำเนินการผ่าน AIA")
    .replace(/ผมเป็นตัวแทน AIA โดยเฉพาะ/g, "ดำเนินการผ่าน AIA")
    .replace(/ผมเป็นตัวแทน AIA/g, "ดำเนินการผ่าน AIA")
    .replace(/ผมจัดผ่าน/g, "เราจัดผ่าน")
    .replace(/ผมเทียบ/g, "เราเปรียบเทียบ")
    .replace(/ผมสรุป/g, "เราสรุป")
    .replace(/ผมดูแล/g, "เราดูแล")
    .replace(/ผมตอบกลับ/g, "เราตอบกลับ")
    .replace(/ผมตอบทุกข้อความเอง/g, "เราตอบทุกข้อความด้วยตนเอง")
    .replace(/ผมจะติดต่อกลับ/g, "เราจะติดต่อกลับ")
    .replace(/ผมจะทัก/g, "เราจะทัก")
    .replace(/ผมจะเตือน/g, "เราจะเตือน")
    .replace(/ติดต่อผม/g, "ติดต่อเรา")
    .replace(/ส่งตัวเลขนี้ให้ผมดูต่อ/g, "ส่งตัวเลขนี้ให้เราดูต่อ")
    .replace(/ตั้งเตือนให้ผมจำ/g, "ตั้งเตือนให้เราจำ")
    .replace(/เกี่ยวกับผม/g, "เกี่ยวกับเรา")
    .replace(/ค่าตอบแทนของผม/g, "ค่าตอบแทนของเรา")
    .replace(/ไม่ขายเกิน/g, "ไม่เสนอเกินความจำเป็น")
    .replace(/ยิงเทียบ/g, "เปรียบเทียบ")
    .replace(/ยิงเบี้ย/g, "เปรียบเทียบเบี้ย")
    .replace(/สนใจปรึกษาครับ\/ค่ะ\s*—\s*สถานการณ์:/g, "สนใจปรึกษาเรื่องประกัน — สถานการณ์:")
    .replace(/สนใจปรึกษาครับ\/ค่ะ/g, "สนใจปรึกษาเรื่องประกัน")
    .replace(/แอดไลน์ ปรึกษาฟรี/g, "ติดต่อเราทาง LINE")
    .replace(/แอดไลน์ ขอเทียบเบี้ย/g, "ติดต่อเราทาง LINE")
    .replace(/Send me these numbers/g, "Send us these numbers")
    .replace(/What I did/g, "What we do")
    .replace(/What I get paid/g, "How CoverMate is compensated")
    .replace(/How I get paid/g, "How CoverMate is compensated")
    .replace(/About me/g, "About us")
    .replace(/contact me directly on LINE/g, "contact us directly on LINE")
    .replace(/contact me/gi, "contact us")
    .replace(/As a broker I compare/g, "As a broker, we compare")
    .replace(/I compare/g, "We compare")
    .replace(/I do not offer unit-linked plans/g, "Unit-linked plans are not offered")
    .replace(/Set\. I will message you 60 days ahead\./g, "Set. We will message you 60 days ahead.")
    .replace(/Thank you\. I will reply as soon as possible\./g, "Thank you. We will reply as soon as possible.")
    .replace(/Pick a policy and expiry month and I will remind you 60 days ahead\./g, "Pick a policy and expiry month and we will remind you 60 days ahead.")
    .replace(/I will remind you about/g, "We will remind you about")
    .replace(/hard sell/gi, "sales pressure")
    .replace(/chase the insurer/gi, "coordinate with the insurer")
    .replace(/fight it alone/gi, "handle it alone")
    .replace(/someone answers the phone/gi, "you know who to contact")
    .replace(/savings are thin/gi, "the difference is limited")
    .replace(/ตั้งตัวไม่ทัน/g, "กรณีเร่งด่วน")
    .replace(/ผม/g, "เรา")
    .replace(/ครับ\/ค่ะ/g, "")
    .replace(/ครับ/g, "")
    .replace(/ค่ะ/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeLocalizedStrings(target, count) {
  if (!target || typeof target !== "object") return;
  Object.keys(target).forEach((key) => {
    const value = target[key];
    if (typeof value === "string") {
      target[key] = normalizeProductDecisionCopy(normalizeMotorCountCopy(value, count));
    } else if (value && typeof value === "object") {
      normalizeLocalizedStrings(value, count);
    }
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
    if (Array.isArray(next.motorPage.nav)) {
      next.motorPage.nav = next.motorPage.nav
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          label: {
            th: cleanText(item.label && item.label.th, 40),
            en: cleanText(item.label && item.label.en, 40)
          },
          href: cleanText(item.href || "", 80)
        }))
        .filter((item) =>
          item.label.th &&
          item.label.en &&
          (/^#[-A-Za-z0-9_]+$/.test(item.href) || item.href === "/")
        );
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
    const value = normalizeProductDecisionCopy(String(next[key] || ""));
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
  const next = cloneJSON(config || {});
  next.header = next.header && typeof next.header === "object" ? next.header : {};
  if (Array.isArray(next.header.nav)) {
    next.header.nav = cloneJSON(PRODUCT_HEADER_NAV);
  }
  next.header.cta = cloneJSON(PRODUCT_HEADER_CTA);
  if (Array.isArray(next.sections)) {
    next.sections = reorderKnownLegacySections(next.sections);
    const insurerCount = motorInsurerLogoCount(next);
    ["header", "brand", "footer", "contact", "seo", "motorPage"].forEach((key) => {
      normalizeLocalizedStrings(next[key], insurerCount);
    });
    editableContentSections(next).forEach((section) => {
      if (!section) return;
      ensureNeedsCalculatorSection(section);
      normalizeLocalizedStrings(section, insurerCount);
      normalizeLocalizedStrings(section.th, insurerCount);
      normalizeLocalizedStrings(section.en, insurerCount);
      normalizeLocalizedStrings(section.items, insurerCount);
      normalizeLocalizedStrings(section.cards, insurerCount);
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
  MOTOR_INSURER_LOGO_COUNT_FALLBACK,
  motorInsurerLogoCount,
  DEFAULT_ADVISOR_LOGO,
  DEFAULT_ADVISOR_LOGO_ALT,
  DEFAULT_CONTACT,
  DEFAULT_SEO,
  PROTECTED_BRAND_CREDENTIAL,
  PROTECTED_FOOTER_LEGAL,
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
