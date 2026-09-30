import { ADMIN_LOGIN_PATH, adminRedirect, requireVerifiedAdminSession, signOutAdmin } from "/admin/session.js";
import { createCasesWorkspace } from "/admin/ops/cases.js";
import { homeView } from "/admin/home-view.js";
import { analyticsView } from "/admin/analytics-view.js";
import { contentView } from "/admin/content-view.js";
import { loadCmsOverview, cmsHubLinks } from "/admin/content-model.mjs";
import { deriveAnalytics } from "/admin/analytics-model.mjs";
import { ADMIN_MODULES as MODULES, adminNavigation, accountIdentity, adminAccountMenu, adminAccountDetails, bindAdminAccounts } from "/admin/shell.js";
import { createArticlesWorkspace } from "/admin/articles/workspace.mjs";
import { loadArticleCatalog, loadArticleForEditor, createCloudArticleRepository } from "/admin/articles/data.mjs";
import {
  adminPortalRouteStateFromLocation,
  adminPortalUrl,
  ownerPathForMode
} from "/covermate-contract.js";

const K_ADMIN_EVER = "purich-admin-ever-v7";
const OWNER_EDIT_PATH = ownerPathForMode("edit");
const OWNER_PREVIEW_PATH = ownerPathForMode("preview");

const STATUS_OPTIONS = [
  ["all", "ทั้งหมด"],
  ["new", "เคสใหม่"],
  ["contacting", "กำลังติดต่อ"],
  ["contacted", "ติดต่อแล้ว"],
  ["consultation", "ให้คำปรึกษา"],
  ["quotation", "เสนอราคา"],
  ["considering", "กำลังตัดสินใจ"],
  ["converted", "ออกกรมธรรม์แล้ว"],
  ["later", "ติดตามภายหลัง"],
  ["notinterested", "ไม่สนใจ"],
  ["lost", "ปิดเคสโดยไม่ได้ทำประกัน"]
];

const INTEREST_OPTIONS = [
  ["all", "ทั้งหมด"],
  ["motor", "รถยนต์"],
  ["life", "ชีวิต"],
  ["health", "สุขภาพ"],
  ["accident", "อุบัติเหตุ"],
  ["savings", "ออมทรัพย์"],
  ["unsure", "ยังไม่แน่ใจ"]
];

const TASK_FILTERS = [
  ["all", "ทั้งหมด"],
  ["today", "วันนี้"],
  ["upcoming", "กำลังจะถึง"],
  ["overdue", "เลยกำหนด"],
  ["completed", "เสร็จแล้ว"]
];

const OPERATIONS_TABS = [
  ["dashboard", "ภาพรวม"],
  ["leads", "เคสลูกค้า"],
  ["tasks", "งานติดตาม"],
  ["audit", "ประวัติการทำงาน"]
];

const DATA_RESOURCES = [
  "leads",
  "tasks",
  "audit"
];

const LIVE_RESOURCES = new Set(["leads", "tasks", "audit"]);

const EMPTY_DATA = Object.fromEntries(DATA_RESOURCES.map((key) => [key, []]));
const EMPTY_META = Object.fromEntries(DATA_RESOURCES.map((key) => [key, {}]));
const initialRoute = routeStateFromLocation();

const state = {
  module: initialRoute.module,
  operationsTab: initialRoute.operationsTab,
  recordId: null,
  query: "",
  session: null,
  data: structuredClone(EMPTY_DATA),
  meta: structuredClone(EMPTY_META),
  loading: new Set(DATA_RESOURCES),
  errors: {},
  pending: "",
  sessionRole: "none",
  home: { loading: true, error: '', summary: null, items: [], checkedAt: null },
  cms: { loading: true, error: '', connected: false, checkedAt: null, publishedAt: null, draftState: 'unknown', draftUpdatedAt: null, versionCount: null },
  cmsTipDismissed: false,
  analytics: { loading: true, error: '', rows: [], checkedAt: null, days: 30, view: 'overview' },
  filters: {
    leadStatus: "all",
    leadInterest: "all",
    customerHold: "all",
    policyStatus: "all",
    policyType: "all",
    renewalWindow: "all",
    taskView: "all",
    documentCategory: "all"
  }
};
let casesWorkspace;
let articlesWorkspace;

const screen = document.getElementById("screen");
const sideNav = document.getElementById("sideNav");
const globalSearch = document.getElementById("globalSearch");
const modalRoot = document.getElementById("modalRoot");
const dataMode = document.getElementById("dataMode");
const toastRoot = document.getElementById("toastRoot");

init().catch(() => window.CoverMateBoot?.fail());

async function init() {
  clearOwnerMarker();
  state.session = await requireVerifiedAdminSession({ redirectTo: ADMIN_LOGIN_PATH });
  if (!state.session) return;

  state.sessionRole = normalizeRole(state.session.role);
  articlesWorkspace = createArticlesWorkspace({ root: screen, load: loadArticleCatalog, loadArticle: loadArticleForEditor, repository:createCloudArticleRepository(), session: {...state.session,role:state.sessionRole}, icon: iconSvg, searchInput: globalSearch, loginUrl: adminRedirect(ADMIN_LOGIN_PATH) });
  casesWorkspace = createCasesWorkspace({ root: screen, api: apiFetch, session: { ...state.session, role: state.sessionRole }, searchInput: globalSearch, navigate: setModule,
    renderNavigation: () => adminNavigation(state.module, iconSvg, { mobile: true }),
    renderAccount: () => adminAccountMenu(state.session,displayRole(state.sessionRole),iconSvg,{mobile:true}),
    renderAccountDetails: () => adminAccountDetails(state.session,displayRole(state.sessionRole),iconSvg) });
  const bell = document.createElement('button');
  bell.type = 'button'; bell.className = 'case-button case-icon-button case-top-bell'; bell.dataset.caseAction = 'notifications'; bell.setAttribute('aria-label', 'การแจ้งเตือน');
  bell.addEventListener('click', () => casesWorkspace.openNotifications());
  document.querySelector('.topbar').append(bell);
  const menu = document.createElement('button'); menu.type = 'button'; menu.className = 'case-button case-icon-button case-menu-trigger'; menu.setAttribute('aria-label', 'เปิดเมนู Admin');
  menu.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
  menu.setAttribute('aria-haspopup', 'dialog'); menu.setAttribute('aria-expanded', 'false');
  menu.addEventListener('click', () => casesWorkspace.openNavigation()); document.querySelector('.mobilebar').append(menu);
  applySessionChrome();
  bindAdminAccounts({details:()=>casesWorkspace.openAccount(),preferences:()=>casesWorkspace.openPreferences(),notifications:()=>casesWorkspace.openNotifications()});
  bindEvents();
  normalizeRetiredSettingsUrl();
  render();
  if (!['home', 'operations'].includes(state.module)) casesWorkspace.refreshNotifications();
  document.body.dataset.boot = "ready";
  window.CoverMateBoot?.ready();
  await loadAllData();
}

function applySessionChrome() {
  document.querySelector('[data-admin-account-root]').innerHTML=adminAccountMenu(state.session,displayRole(state.sessionRole),iconSvg);
}

function bindEvents() {
  matchMedia('(min-width:1040px)').addEventListener('change', () => { if (state.module === 'content') renderContent({ resetGroups: true }); });
  document.addEventListener("click", handleClick);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener('change', event => {
    if (!event.target.matches('[data-analytics-period]')) return;
    const value = event.target.value;
    if (!['7', '30', '90', 'all'].includes(value)) return;
    state.analytics.days = value === 'all' ? 'all' : Number(value);
    renderAnalytics();
    screen.querySelector('[data-analytics-period]')?.focus({ preventScroll: true });
  });
  globalSearch.addEventListener("input", () => {
    if (state.module === 'articles') { articlesWorkspace.setSearch(globalSearch.value); return; }
    if (state.module === 'operations') { casesWorkspace.setSearch(globalSearch.value); return; }
    state.query = globalSearch.value.trim().toLowerCase();
    state.recordId = null;
  });
  globalSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (['operations', 'articles'].includes(state.module)) return;
    openHomeCases({ search: globalSearch.value });
  });
  window.addEventListener("hashchange", syncRouteFromLocation);
  window.addEventListener("popstate", syncRouteFromLocation);
}

async function loadAllData() {
  if (state.module === 'content') { state.loading.clear(); return loadContentData(); }
  if (['articles', 'operations'].includes(state.module)) { state.loading.clear(); return; }
  if (state.module === 'home') { state.loading.clear(); return loadHomeData(); }
  if (state.module === 'analytics') { state.loading.clear(); return loadAnalyticsData(); }
  await Promise.all(DATA_RESOURCES.map((resource) => loadResource(resource)));
  render();
}

let contentLoadGeneration = 0;
async function loadContentData() {
  const generation = ++contentLoadGeneration;
  state.cms = { ...state.cms, loading: true, error: '', connected: false };
  if (state.module === 'content') renderContent();
  try {
    const overview = await loadCmsOverview(await ensureFirebase());
    if (generation !== contentLoadGeneration) return;
    state.cms = overview;
  } catch {
    if (generation !== contentLoadGeneration) return;
    state.cms = { loading: false, connected: false, error: 'ยังเชื่อมต่อข้อมูล CMS ไม่ได้ กรุณาลองอีกครั้ง', checkedAt: null, publishedAt: null, draftState: 'unknown', draftUpdatedAt: null, versionCount: null };
  }
  if (state.module === 'content') renderContent();
  if (state.module === 'home') renderHome();
}

let analyticsLoadGeneration = 0;
async function loadAnalyticsData() {
  const generation = ++analyticsLoadGeneration;
  state.analytics.loading = true;
  state.analytics.error = '';
  if (state.module === 'analytics') renderAnalytics();
  try {
    const response = await apiFetch('leads?limit=200');
    const rows = Array.isArray(response) ? response : response.rows;
    if (!Array.isArray(rows)) throw new Error('โหลดรายงานไม่สำเร็จ กรุณาลองอีกครั้ง');
    if (generation !== analyticsLoadGeneration) return;
    state.analytics.rows = rows;
    state.analytics.checkedAt = Date.now();
  } catch (error) {
    if (generation !== analyticsLoadGeneration) return;
    state.analytics.error = error.message || 'โหลดรายงานไม่สำเร็จ กรุณาลองอีกครั้ง';
  } finally {
    if (generation === analyticsLoadGeneration) {
      state.analytics.loading = false;
      if (state.module === 'analytics') renderAnalytics();
    }
  }
}

let homeLoadGeneration = 0;
async function loadHomeData() {
  const generation = ++homeLoadGeneration;
  state.home = { loading: true, error: '', summary: null, items: [], checkedAt: null };
  if (state.module === 'home') renderHome();
  casesWorkspace.refreshNotifications();
  const cmsRequest = loadContentData();
  const results = await Promise.allSettled([
    apiFetch('cases/summary'),
    apiFetch('cases?scope=all&sort=newest&limit=5')
  ]);
  if (generation !== homeLoadGeneration) return;
  const error = results.find(result => result.status === 'rejected');
  state.home = {
    loading: false,
    error: error ? error.reason.message : '',
    summary: results[0].status === 'fulfilled' ? results[0].value : null,
    items: results[1].status === 'fulfilled' ? results[1].value.items || [] : [],
    checkedAt: error ? null : Date.now()
  };
  if (state.module === 'home') renderHome();
  await cmsRequest;
}

async function openHomeCases({ search = '', followUp = 'any', id } = {}) {
  if (!(await casesWorkspace.configureView({ search, followUp, scope: 'all' }))) return;
  await setModule('operations');
  if (id) casesWorkspace.openCase(id);
}

async function loadResource(resource) {
  state.loading.add(resource);
  delete state.errors[resource];
  renderTopStatus();
  try {
    const response = await apiFetch(resource);
    state.meta[resource] = Array.isArray(response) ? { source: "legacy" } : {
      source: response.source || "",
      status: response.status || "",
      message: response.message || "",
      label: response.label || "",
      resource: response.resource || resource
    };
    state.data[resource] = Array.isArray(response) ? response : Array.isArray(response.rows) ? response.rows : [];
  } catch (error) {
    state.data[resource] = [];
    state.meta[resource] = {};
    state.errors[resource] = error.message || "โหลดข้อมูลไม่ได้ กรุณาลองอีกครั้ง";
  } finally {
    state.loading.delete(resource);
    renderTopStatus();
  }
}

async function refresh(resources = DATA_RESOURCES) {
  await Promise.all(resources.map((resource) => loadResource(resource)));
  render();
}

async function apiFetch(path, options = {}) {
  const cm = await ensureFirebase();
  const user = cm.auth && cm.auth.currentUser ? cm.auth.currentUser : await cm.waitForAuth();
  if (!user || typeof user.getIdToken !== "function") {
    throw new Error("เซสชัน Admin หมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
  }
  const token = await user.getIdToken();
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (['PATCH', 'PUT', 'POST'].includes(options.method) && path.includes('/')) {
    const [resource, encodedId] = path.split('/');
    const row = (state.data[resource] || []).find(item => item.id === decodeURIComponent(encodedId));
    if (row?.revision) headers.set('If-Match', row.revision);
  }

  const response = await fetch(withEnvironmentQuery(`/api/ops/${path}`, cm.environment), {
    ...options,
    signal: options.signal || AbortSignal.timeout(15000),
    headers,
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
  }).catch((cause) => {
    if (cause.name === "AbortError") throw cause;
    throw new Error(cause.name === "TimeoutError" ? "การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองอีกครั้ง" : "เชื่อมต่อไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง", { cause });
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(apiErrorMessage(payload, response.status));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function apiErrorMessage(payload, statusCode) {
  const messages = {
    unauthorized: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง",
    forbidden: "บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้",
    not_found: "ไม่พบข้อมูลนี้ อาจถูกเปลี่ยนแปลงหรือลบไปแล้ว",
    edit_conflict: "ข้อมูลถูกแก้ไขจากที่อื่น กรุณาโหลดข้อมูลล่าสุดก่อนลองอีกครั้ง",
    version_conflict: "ข้อมูลถูกแก้ไขจากที่อื่น กรุณาโหลดข้อมูลล่าสุดก่อน Save",
    request_conflict: "คำขอนี้ซ้ำกับรายการอื่น กรุณาโหลดข้อมูลล่าสุดก่อนลองอีกครั้ง",
    validation: "กรุณาตรวจสอบข้อมูลในช่องที่ระบุ",
    validation_failed: "กรุณาตรวจสอบข้อมูลให้ครบถ้วนและถูกต้อง",
    invalid_cursor: "รายการมีการเปลี่ยนแปลง กรุณาโหลดใหม่",
    idempotency_required: "คำขอไม่ครบถ้วน กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง",
    reopen_required: "กรุณาเปิดเคสอีกครั้งก่อนเปลี่ยนสถานะ",
    legacy_status_review: "ต้องตรวจสอบสถานะของเคสเดิมก่อนใช้งาน",
    legacy_date_review: "ต้องตรวจสอบวันที่รับเรื่องของเคสเดิมก่อนใช้งาน",
    email_not_configured: "ยังไม่ได้ตั้งค่าการแจ้งเตือนทางอีเมล",
    firestore_error: "เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง",
    server_error: "ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้ง"
  };
  const code = payload.code || payload.error;
  if (messages[code]) return messages[code];
  if (statusCode === 401) return messages.unauthorized;
  if (statusCode === 403) return messages.forbidden;
  if (statusCode === 404) return messages.not_found;
  if (statusCode === 409) return messages.edit_conflict;
  if (statusCode === 400 || statusCode === 422) return messages.validation_failed;
  if (statusCode === 429) return "ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองอีกครั้ง";
  return "ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง";
}

function withEnvironmentQuery(url, environment) {
  if (!environment || environment.name !== "uat") return url;
  return `${url}${url.includes("?") ? "&" : "?"}cm_env=uat`;
}

async function ensureFirebase() {
  if (!window.CoverMateFirebase) {
    await import(window.location.origin + "/covermate-firebase.js");
  }
  if (!window.CoverMateFirebase) {
    throw new Error("เชื่อมต่อ Firebase ไม่สำเร็จ กรุณาลองโหลดหน้าใหม่");
  }
  return window.CoverMateFirebase;
}

async function handleClick(event) {
  if (event.target.closest("[data-public-site]")) {
    clearOwnerMarker();
    return;
  }

  const actionEl = event.target.closest("[data-action]");
  if (actionEl) {
    if (actionEl.tagName === "A") event.preventDefault();
    const action = actionEl.dataset.action;
    if (action === "logout") {
      if (articlesWorkspace?.active && !articlesWorkspace.canLeave()) return;
      if (!(await casesWorkspace.canLeave())) return;
      signOutAdmin();
      return;
    }
    if (action === 'account') return casesWorkspace.openAccount();
    if (action === 'cms-refresh' && !state.cms.loading) return loadContentData();
    if (action === 'cms-articles') return setModule('articles');
    if (action === 'cms-dismiss-tip') {
      state.cmsTipDismissed = true;
      screen.querySelector('.cms-tip')?.remove();
      screen.querySelector('[data-cms-group] summary')?.focus();
      return;
    }
    if (action === 'cms-toggle-groups') {
      const groups = [...screen.querySelectorAll('[data-cms-group]')];
      const expand = groups.some(group => !group.open);
      groups.forEach(group => { group.open = expand; });
      actionEl.setAttribute('aria-expanded', String(expand));
      actionEl.textContent = expand ? 'ย่อทั้งหมด' : 'ดูทั้งหมด';
      return;
    }
    if (action === 'home-refresh' && !state.home.loading && !state.cms.loading) loadHomeData();
    if (action === 'home-cases') openHomeCases();
    if (action === 'home-follow-ups') openHomeCases({ followUp: 'due' });
    if (action === 'home-case') openHomeCases({ id: actionEl.dataset.id });
    if (action === 'analytics-refresh' && !state.analytics.loading) loadAnalyticsData();
    if (action === 'analytics-cases') openHomeCases();
    if (action === 'analytics-view' && ['overview', 'status', 'services', 'sources'].includes(actionEl.dataset.value)) {
      state.analytics.view = actionEl.dataset.value;
      renderAnalytics();
      screen.querySelector(`[data-action="analytics-view"][data-value="${state.analytics.view}"]`)?.focus({ preventScroll: true });
    }
    if (action === "open-new-lead") openNewLeadModal();
    if (action === "close-modal") closeModal();
    if (action === "module") setModule(actionEl.dataset.module);
    if (action === "op-tab") setOperationsTab(actionEl.dataset.tab);
    if (action === "back-leads") {
      state.recordId = null;
      state.module = "operations";
      state.operationsTab = "leads";
      writeRoute({ replace: true });
      renderScreen();
    }
    if (action === "lead-filter") {
      state.filters[actionEl.dataset.filter] = actionEl.dataset.value;
      renderScreen();
    }
    if (action === "status-change") changeLeadStatus(actionEl.dataset.id, actionEl.dataset.status);
    if (action === "add-note") addLeadNote(actionEl.dataset.id);
    if (action === "save-followup") saveLeadFollowup(actionEl.dataset.id);
    if (action === "task-filter") {
      state.filters.taskView = actionEl.dataset.value;
      renderScreen();
    }
    if (action === "complete-task") patchTask(actionEl.dataset.id, true);
    if (action === "reopen-task") patchTask(actionEl.dataset.id, false);
    if (action === "policy-filter") {
      state.filters[actionEl.dataset.filter] = actionEl.dataset.value;
      renderScreen();
    }
    if (action === "renewal-filter") {
      state.filters.renewalWindow = actionEl.dataset.value;
      renderScreen();
    }
    if (action === "document-filter") {
      state.filters.documentCategory = actionEl.dataset.value;
      renderScreen();
    }
    if (action === "customer-filter") {
      state.filters.customerHold = actionEl.dataset.value;
      renderScreen();
    }
    if (action === "reload") refresh();
  }

  const leadRow = event.target.closest("[data-open-lead]");
  if (leadRow && !event.target.closest("button, a, input, select, textarea")) {
    openLead(leadRow.dataset.openLead);
  }
}

function clearOwnerMarker() {
  try {
    window.localStorage.removeItem(K_ADMIN_EVER);
  } catch {
    // Public navigation still proceeds.
  }
}

function handleSubmit(event) {
  const form = event.target.closest("[data-form]");
  if (!form) return;
  event.preventDefault();
  if (form.dataset.form === "new-lead") createLead(form);
}

function handleKeydown(event) {
  const analyticsTab = event.target.closest('[role="tab"][data-action="analytics-view"]');
  if (analyticsTab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const tabs = [...screen.querySelectorAll('[role="tab"][data-action="analytics-view"]')];
    const index = tabs.indexOf(analyticsTab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next]?.click();
    return;
  }
  const row = event.target.closest("[data-open-lead]");
  if (row && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openLead(row.dataset.openLead);
  }
  if (event.key === "Escape" && modalRoot.classList.contains("open")) {
    closeModal();
  }
}

function render() {
  renderChrome();
  renderTopStatus();
  renderScreen();
}

function renderChrome() {
  document.body.dataset.module = state.module;
  globalSearch.placeholder = state.module === 'articles' ? 'ค้นหาชื่อบทความ...' : ['home', 'operations'].includes(state.module) ? 'ค้นหาชื่อ เบอร์โทร LINE อีเมล หรือเลขเคส…' : 'ค้นหาเคส แล้วกด Enter';
  sideNav.innerHTML = adminNavigation(state.module, iconSvg);
  dataMode.hidden = true;
}

function renderTopStatus() {
  const loading = state.loading.size > 0;
  const errorCount = Object.keys(state.errors).length;
  const leadCount = rowsFor("leads").length;
  const text = loading
    ? "กำลังโหลดข้อมูล"
    : errorCount
      ? `การเชื่อมต่อมีปัญหา ${errorCount} รายการ`
      : `เชื่อมต่อข้อมูลแล้ว · ${leadCount} เคส`;
  dataMode.className = `pill admin-data-status${errorCount ? " error" : loading ? " warn" : ""}`;
  dataMode.innerHTML = `<span class="dot"></span>${escapeHTML(text)}`;
}

function renderScreen() {
  if (!screen) return;
  if (state.module === 'articles') return articlesWorkspace?.mount();
  if (articlesWorkspace?.active) { articlesWorkspace.leave(); globalSearch.value = state.query; }
  if (state.module === "home") return renderHome();
  if (state.module === "operations") {
    return casesWorkspace?.mount();
  }
  if (state.module === "content") return renderContent();
  if (state.module === "analytics") return renderAnalytics();
  return renderHome();
}

function renderHome() {
  // A data refresh must preserve the exact focused card/link, not just its action.
  const focusKey = element => JSON.stringify([element.tagName, element.getAttribute('href'), element.dataset.action, element.dataset.module, element.dataset.id, element.getAttribute('aria-label')]);
  const activeKey = screen.contains(document.activeElement) ? focusKey(document.activeElement) : null;
  screen.innerHTML = homeView({
    home: state.home,
    cms: state.cms,
    readonly: cmsHubLinks(state.sessionRole).readonly,
    name: state.session?.name || state.session?.email || 'ผู้ดูแล CoverMate',
    role: displayRole(state.sessionRole),
    editPath: OWNER_EDIT_PATH,
    previewPath: OWNER_PREVIEW_PATH,
    icon: iconSvg,
    account: accountIdentity(state.session, displayRole(state.sessionRole), iconSvg)
  });
  if (activeKey) [...screen.querySelectorAll('button:not(:disabled), a[href]')].find(element => focusKey(element) === activeKey)?.focus({ preventScroll: true });
}

function operationsTabs() {
  return `
    <div class="tabs" aria-label="มุมมองงานลูกค้า">
      ${OPERATIONS_TABS.map(([value, label]) => `
        <button class="chip ${state.operationsTab === value ? "active" : ""}" type="button" data-action="op-tab" data-tab="${value}" ${state.operationsTab === value ? 'aria-current="page"' : ""}>${escapeHTML(label)}</button>
      `).join("")}
    </div>
  `;
}

function renderDashboard() {
  const counts = leadCounts();
  const tasks = rowsFor("tasks");
  const overdue = tasks.filter((task) => !task.completed && isOverdue(task.dueAt || task.dueDate)).length;
  const activeTasks = tasks.filter((task) => !task.completed).slice(0, 5);
  const audit = rowsFor("audit").slice(0, 6);
  screen.innerHTML = `
    ${pageHead("ภาพรวม", "ดูงานที่ต้องจัดการวันนี้ พร้อมข้อมูลล่าสุดของงานลูกค้า", connectionPill())}
    ${operationsTabs()}
    ${errorNotice()}
    <div class="grid metrics">
      ${metric("รอติดต่อครั้งแรก", counts.needsContact, "เคสที่ยังรอการติดต่อครั้งแรก", "ดูเคสลูกค้า", "leads")}
      ${metric("งานติดตามที่เลยกำหนด", overdue, "งานที่เลยกำหนดและยังไม่เสร็จ", "ดูงานติดตาม", "tasks")}
      ${metric("เคสทั้งหมด", rowsFor("leads").length, "ข้อมูลเคสลูกค้าในระบบ CoverMate", "ดูเคสลูกค้า", "leads")}
      ${metric("รายการประวัติ", rowsFor("audit").length, "ประวัติการทำงานที่ระบบบันทึกไว้", "ดูประวัติ", "audit")}
    </div>
    <div class="grid two" style="margin-top:16px;">
      <section class="panel">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
          <h2>งานที่รอดำเนินการ</h2>
          <button class="ghost-button" type="button" data-action="module" data-module="tasks">งานทั้งหมด</button>
        </div>
        ${activeTasks.length ? timeline(activeTasks.map((task) => ({
          title: task.title || task.task || task.name || task.id,
          meta: `${formatDue(task.dueAt || task.dueDate)} · ${task.relatedLabel || task.related || "ไม่ได้เชื่อมกับเคส"}`
        }))) : emptyBlock("ไม่มีงานที่รอดำเนินการ")}
      </section>
      <section class="panel">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
          <h2>ลำดับความคืบหน้า</h2>
          <span class="cell-meta">ข้อมูลจากระบบ</span>
        </div>
        <div class="progress-list">
          ${pipelineRow("เคสทั้งหมด", rowsFor("leads").length, 100)}
          ${pipelineRow("ติดต่อแล้ว", counts.contacted, percent(counts.contacted, rowsFor("leads").length))}
          ${pipelineRow("ให้คำปรึกษา", counts.consultation, percent(counts.consultation, rowsFor("leads").length))}
          ${pipelineRow("เสนอราคาแล้ว", counts.quoted, percent(counts.quoted, rowsFor("leads").length))}
          ${pipelineRow("ออกกรมธรรม์แล้ว", counts.converted, percent(counts.converted, rowsFor("leads").length), true)}
        </div>
        <p class="note" style="margin-top:14px;">รายงานนี้นับตั้งแต่ผู้เข้าชมส่งข้อมูลเป็นเคสใน CoverMate</p>
      </section>
      <section class="panel">
        <h2>กิจกรรมล่าสุด</h2>
        ${audit.length ? timeline(audit.map((entry) => ({
          title: `${systemLabel(entry.kind) || "ประวัติการทำงาน"} — ${auditSubject(entry.subject || entry.recordId) || "รายการ"}`,
          meta: `${systemLabel(entry.to || entry.action)} · ${formatDateTime(entry.at)}`
        }))) : emptyBlock("ยังไม่มีประวัติการทำงาน")}
      </section>
    </div>
  `;
}

function renderLeads() {
  const rows = filteredLeads();
  screen.innerHTML = `
    ${pageHead("เคสลูกค้า", "จัดการคำถามจากเว็บไซต์และเคสที่เพิ่มเอง", resourcePill("leads"))}
    ${operationsTabs()}
    ${errorNotice("leads")}
    ${filterBar([
      ["สถานะ", "leadStatus", STATUS_OPTIONS],
      ["ความสนใจ", "leadInterest", INTEREST_OPTIONS]
    ], rows.length)}
    <div class="table-shell">
      <table>
        <thead>
          <tr>
            <th style="width:28%;">เคสลูกค้า</th>
            <th style="width:15%;">สถานะ</th>
            <th style="width:17%;">ความสนใจ</th>
            <th style="width:18%;">ติดต่อล่าสุด</th>
            <th>งานถัดไป</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map((lead) => leadRow(lead)).join("") : emptyRow("ไม่พบเคสตามตัวกรองที่เลือก")}
        </tbody>
      </table>
    </div>
  `;
}

function renderLeadDetail(id) {
  const lead = rowsFor("leads").find((item) => String(item.id) === String(id));
  if (!lead) {
    state.recordId = null;
    return renderLeads();
  }
  const history = Array.isArray(lead.timeline) && lead.timeline.length
    ? lead.timeline
    : derivedLeadTimeline(lead);
  screen.innerHTML = `
    <button class="ghost-button" type="button" data-action="back-leads">เคสทั้งหมด</button>
    <div class="page-head" style="margin-top:18px;">
      <div>
        <h1>${escapeHTML(lead.name || "ไม่ระบุชื่อ")}</h1>
        <p class="lede">${escapeHTML(lead.displayId || lead.id)} · ${interestLabel(lead.interestKey)} · จาก ${escapeHTML(systemLabel(lead.source) || "ไม่ระบุที่มา")}</p>
      </div>
      ${resourcePill("leads")}
    </div>
    ${operationsTabs()}
    ${errorNotice("leads")}
    <div class="split">
      <div class="grid">
        <section class="panel">
          <h2>ข้อมูลติดต่อ</h2>
          <div class="detail-grid">
            ${field("เบอร์โทร", lead.phone || lead.contact || "")}
            ${field("LINE ID", lead.lineId || "")}
            ${field("อีเมล", lead.email || "")}
            ${field("เวลาที่สะดวก", lead.preferredContact || "")}
            ${field("ที่มา", systemLabel(lead.source))}
            ${field("ผู้รับผิดชอบ", lead.assigneeName || lead.assigned || "")}
          </div>
          <div class="actions">
            ${lead.phone || lead.contact ? `<a class="primary-button" href="tel:${escapeHTML(lead.phone || lead.contact)}">โทร ${escapeHTML(lead.phone || lead.contact)}</a>` : `<button class="primary-button" type="button" disabled>โทร</button>`}
            ${lead.lineId ? `<a class="ghost-button" href="https://line.me/R/ti/p/${encodeURIComponent(lead.lineId)}" target="_blank" rel="noreferrer">เปิดใน LINE</a>` : `<button class="ghost-button" type="button" disabled>เปิดใน LINE</button>`}
            <button class="ghost-button" type="button" ${canWrite() ? "" : "disabled"} data-action="add-note" data-id="${escapeHTML(lead.id)}">บันทึกการติดต่อ</button>
          </div>
        </section>
        <section class="panel">
          <h2>ข้อความที่ส่งมา</h2>
          <p style="line-height:1.7;">${escapeHTML(lead.message || "ไม่มีข้อความที่ส่งมาในเคสนี้")}</p>
          <p class="note">รับข้อมูลเมื่อ ${formatDateTime(lead.createdAt)}</p>
        </section>
        <section class="panel">
          <h2>ประวัติการติดต่อ</h2>
          ${timeline(history.map((item) => ({
            title: item.text || item.title || item.kind || "กิจกรรม",
            meta: [item.note, formatDateTime(item.at), item.by].filter(Boolean).join(" · ")
          })))}
          <label style="margin-top:24px;">
            เพิ่มบันทึกภายใน <span class="cell-meta">ลูกค้าจะไม่เห็นบันทึกนี้</span>
            <textarea data-note="${escapeHTML(lead.id)}" placeholder="คุยเรื่องอะไร และต้องทำอะไรต่อ"></textarea>
          </label>
          <div class="actions">
            <button class="primary-button" type="button" ${canWrite() ? "" : "disabled"} data-action="add-note" data-id="${escapeHTML(lead.id)}">เพิ่มบันทึก</button>
            <span class="cell-meta">ระบบบันทึกความยาวของข้อความไว้ในประวัติการทำงาน</span>
          </div>
        </section>
      </div>
      <div class="grid">
        <section class="panel">
          <h2>สถานะ</h2>
          <div class="filter-row">
            ${STATUS_OPTIONS.filter(([value]) => value !== "all").map(([value, label]) => `
              <button class="chip ${lead.status === value ? "active" : ""}" type="button" ${canWrite() ? "" : "disabled"} data-action="status-change" data-id="${escapeHTML(lead.id)}" data-status="${value}">${escapeHTML(label)}</button>
            `).join("")}
          </div>
          <p class="note" style="margin-top:14px;">ระบบเก็บสถานะเดิม สถานะใหม่ ผู้แก้ไข และเวลาที่เปลี่ยนสถานะ</p>
        </section>
        <section class="panel">
          <h2>งานถัดไป</h2>
          <div class="form-grid">
            <label>
              วันที่ติดตาม
              <input type="date" data-followup="${escapeHTML(lead.id)}" value="${dateInput(lead.followUpAt)}" ${canWrite() ? "" : "disabled"} />
            </label>
            <label>
              ที่ปรึกษาที่รับผิดชอบ
              <input type="text" value="${escapeHTML(lead.assigneeName || lead.assigned || "ยังไม่มอบหมาย")}" disabled />
            </label>
          </div>
          <div class="actions">
            <button class="ghost-button" type="button" ${canWrite() ? "" : "disabled"} data-action="save-followup" data-id="${escapeHTML(lead.id)}">Save การติดตาม</button>
          </div>
        </section>
        <section class="panel" style="background:#f0f8e5;">
          <h2>ความยินยอม · PDPA</h2>
          <div class="detail-grid" style="grid-template-columns:1fr 1fr;">
            ${field("ให้ความยินยอม", lead.consent && lead.consent.given ? "ใช่" : "ไม่ใช่")}
            ${field("วิธีให้ความยินยอม", systemLabel(lead.consent && lead.consent.method))}
            ${field("ที่มา", lead.consent && lead.consent.source || lead.sourcePath || lead.source || "")}
            ${field("วันและเวลา", lead.consent && lead.consent.at ? formatDateTime(lead.consent.at) : formatDateTime(lead.createdAt))}
          </div>
          <p class="note" style="margin-top:14px;">การเปลี่ยนความยินยอมจะเพิ่มเป็นเหตุการณ์ใหม่ โดยเก็บประวัติเดิมไว้</p>
        </section>
      </div>
    </div>
  `;
}

function renderTasks() {
  const rows = filteredTasks();
  screen.innerHTML = `
    ${pageHead("งานและการติดตาม", "งานที่มีกำหนดเวลา พร้อมลิงก์ไปยังเคสที่เกี่ยวข้อง", resourcePill("tasks"))}
    ${operationsTabs()}
    ${errorNotice("tasks")}
    <div class="filterbar">
      <div class="filter-row">
        <span class="filter-label">มุมมอง</span>
        ${TASK_FILTERS.map(([value, label]) => `
          <button class="chip ${state.filters.taskView === value ? "active" : ""}" type="button" data-action="task-filter" data-value="${value}">${escapeHTML(label)}</button>
        `).join("")}
        <span class="record-count">${rows.length} รายการ</span>
      </div>
    </div>
    <div class="table-shell">
      <table>
        <thead>
          <tr>
            <th>งาน</th>
            <th style="width:16%;">กำหนดเวลา</th>
            <th style="width:14%;">ความสำคัญ</th>
            <th style="width:18%;">เคสที่เกี่ยวข้อง</th>
            <th style="width:14%;">ผู้รับผิดชอบ</th>
            <th style="width:130px;">การทำงาน</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map((task) => `
            <tr>
              <td data-label="งาน"><span class="cell-title">${escapeHTML(task.title || task.task || task.name || task.id)}</span></td>
              <td data-label="กำหนดเวลา"><span class="status ${task.completed ? "dim" : isOverdue(task.dueAt || task.dueDate) ? "overdue" : "completed"}">${escapeHTML(formatDue(task.dueAt || task.dueDate))}</span></td>
              <td data-label="ความสำคัญ"><strong>${escapeHTML(systemLabel(task.priority))}</strong></td>
              <td data-label="เคสที่เกี่ยวข้อง">${escapeHTML(task.relatedLabel || task.related || "")}</td>
              <td data-label="ผู้รับผิดชอบ">${escapeHTML(task.assigneeName || task.owner || "")}</td>
              <td data-label="การทำงาน">
                ${task.completed
                  ? `<button class="ghost-button" type="button" ${canWrite() ? "" : "disabled"} data-action="reopen-task" data-id="${escapeHTML(task.id)}">เปิดอีกครั้ง</button>`
                  : `<button class="ghost-button" type="button" ${canWrite() ? "" : "disabled"} data-action="complete-task" data-id="${escapeHTML(task.id)}">เสร็จแล้ว</button>`}
              </td>
            </tr>
          `).join("") : emptyRow("ไม่พบงานตามตัวกรองนี้")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAudit() {
  const rows = rowsFor("audit").slice(0, 80);
  screen.innerHTML = `
    ${pageHead("ประวัติการทำงาน", "ประวัติการทำงานที่ระบบบันทึกจากการจัดการงานลูกค้า", resourcePill("audit"))}
    ${operationsTabs()}
    ${errorNotice("audit")}
    ${rows.length ? simpleTable(["เวลา", "ประเภท", "รายการ", "การเปลี่ยนแปลง"], rows.map((entry) => [
      formatDateTime(entry.at),
      systemLabel(entry.kind || entry.action),
      auditSubject(entry.subject || entry.recordId),
      [entry.from, entry.to].filter(Boolean).map(systemLabel).join(" → ") || entry.note || entry.message || ""
    ]), false) : emptyBlock("ยังไม่มีประวัติการทำงาน")}
  `;
}

function renderContent({ resetGroups = false } = {}) {
  const openGroups = new Map([...screen.querySelectorAll('[data-cms-group]')].map(group => [group.dataset.cmsGroup, group.open]));
  const active = screen.contains(document.activeElement) ? document.activeElement : null;
  const focusAction = active?.dataset.action;
  const focusGroup = active?.closest('[data-cms-group]')?.dataset.cmsGroup;
  const desktop = matchMedia('(min-width:1040px)').matches;
  screen.innerHTML = contentView({ cms: state.cms, ...cmsHubLinks(state.session.role, location.search), icon: iconSvg });
  screen.querySelectorAll('[data-cms-group]').forEach(group => {
    group.open = resetGroups ? desktop : (openGroups.get(group.dataset.cmsGroup) ?? desktop);
  });
  if (state.cmsTipDismissed) screen.querySelector('.cms-tip')?.remove();
  const toggle = screen.querySelector('[data-action="cms-toggle-groups"]');
  const expanded = [...screen.querySelectorAll('[data-cms-group]')].every(group => group.open);
  if (toggle) { toggle.setAttribute('aria-expanded', String(expanded)); toggle.textContent = expanded ? 'ย่อทั้งหมด' : 'ดูทั้งหมด'; }
  if (focusAction) screen.querySelector('[data-action="' + focusAction + '"]')?.focus({ preventScroll: true });
  else if (focusGroup) screen.querySelector('[data-cms-group="' + focusGroup + '"] summary')?.focus({ preventScroll: true });
}

function renderAnalytics() {
  const active = document.activeElement;
  const restoreRefresh = active?.dataset.action === 'analytics-refresh';
  const restorePeriod = !!active?.closest('.analytics-period');
  const restoreTab = active?.getAttribute('role') === 'tab' ? active.dataset.value : '';
  const { rows, ...viewState } = state.analytics;
  screen.innerHTML = analyticsView({ ...viewState, model: deriveAnalytics(rows, { days: viewState.days, now: viewState.checkedAt || Date.now() }), icon: iconSvg, trafficPath: adminRedirect('/admin/analytics') });
  if (restoreRefresh) screen.querySelector('[data-action="analytics-refresh"]')?.focus({ preventScroll: true });
  else if (restorePeriod) screen.querySelector('[data-analytics-period]')?.focus({ preventScroll: true });
  else if (restoreTab) screen.querySelector(`[role="tab"][data-value="${restoreTab}"]`)?.focus({ preventScroll: true });
}

function openNewLeadModal() {
  if (!canWrite()) return;
  modalRoot.classList.add("open");
  modalRoot.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="newLeadTitle">
      <div class="modal-head">
        <div>
          <h2 id="newLeadTitle">เพิ่มเคส</h2>
          <p class="note" style="margin-top:0;">สร้างเคส บันทึกความยินยอม และเพิ่มงานติดต่อครั้งแรก</p>
        </div>
        <button class="ghost-button" type="button" data-action="close-modal">ปิด</button>
      </div>
      <form data-form="new-lead">
        <div class="modal-body">
          <div class="form-grid">
            <label>ชื่อ<input name="name" required autocomplete="name" placeholder="ชื่อลูกค้า" /></label>
            <label>เบอร์โทร<input name="phone" autocomplete="tel" placeholder="08X-XXX-XXXX" /></label>
            <label>LINE ID<input name="lineId" autocomplete="off" placeholder="LINE ID" /></label>
            <label>อีเมล<input name="email" type="email" autocomplete="email" placeholder="name@example.com" /></label>
            <label>ความสนใจ
              <select name="interestKey">
                ${INTEREST_OPTIONS.filter(([value]) => value !== "all").map(([value, label]) => `<option value="${value}">${escapeHTML(label)}</option>`).join("")}
              </select>
            </label>
            <label>ที่มา
              <select name="source">
                <option value="Website form">ฟอร์มเว็บไซต์</option>
                <option value="LINE">LINE</option>
                <option value="Referral">ผู้แนะนำ</option>
                <option value="Google search">ค้นหาผ่าน Google</option>
                <option value="Phone call">โทรศัพท์</option>
              </select>
            </label>
          </div>
          <label style="margin-top:14px;">เวลาที่สะดวกให้ติดต่อ<input name="preferredContact" placeholder="ช่วงบ่ายวันธรรมดา" /></label>
          <label style="margin-top:14px;">ข้อความที่ส่งมา<textarea name="message" placeholder="รายละเอียดที่ลูกค้าต้องการ"></textarea></label>
          <label class="checkbox" style="margin-top:14px;"><input name="consent" type="checkbox" required /> ได้รับความยินยอมตาม PDPA เพื่อให้คำปรึกษาและเสนอราคาประกันแล้ว</label>
        </div>
        <div class="modal-actions">
          <button class="ghost-button" type="button" data-action="close-modal">ยกเลิก</button>
          <button class="primary-button" type="submit">สร้างเคส</button>
        </div>
      </form>
    </div>
  `;
  modalRoot.querySelector("input[name='name']").focus();
}

function closeModal() {
  modalRoot.classList.remove("open");
  modalRoot.innerHTML = "";
}

async function createLead(form) {
  if (!canWrite() || state.pending) return;
  const data = new FormData(form);
  const body = {
    name: clean(data.get("name"), 120),
    phone: clean(data.get("phone"), 80),
    lineId: clean(data.get("lineId"), 80),
    email: clean(data.get("email"), 160),
    preferredContact: clean(data.get("preferredContact"), 120),
    interestKey: clean(data.get("interestKey"), 40),
    interestLabel: ({ motor: "Motor", life: "Life", health: "Health", accident: "Accident", savings: "Savings", unsure: "Unsure" })[clean(data.get("interestKey"), 40)] || "Unsure",
    source: clean(data.get("source"), 60),
    message: clean(data.get("message"), 2000),
    consent: data.get("consent") === "on"
  };
  if (!body.phone && !body.lineId && !body.email) {
    toast("กรุณาระบุช่องทางติดต่ออย่างน้อยหนึ่งช่องทาง", "error");
    return;
  }
  await withPending("create-lead", async () => {
    const result = await apiFetch("leads", { method: "POST", body });
    const nextId = result.lead && result.lead.id ? result.lead.id : null;
    closeModal();
    state.module = "operations";
    state.operationsTab = "leads";
    state.recordId = nextId;
    writeRoute({ replace: true });
    await refresh(["leads", "tasks", "audit"]);
    toast("สร้างเคสแล้ว");
  });
}

async function changeLeadStatus(id, statusValue) {
  if (!canWrite() || state.pending) return;
  await withPending(`status-${id}`, async () => {
    await apiFetch(`leads/${encodeURIComponent(id)}/status`, { method: "PUT", body: { status: statusValue } });
    await refresh(["leads", "tasks", "audit"]);
    toast("อัปเดตสถานะแล้ว");
  });
}

async function addLeadNote(id) {
  if (!canWrite() || state.pending) return;
  const input = screen.querySelector(`[data-note="${cssEscape(id)}"]`);
  const note = clean(input && input.value, 2000);
  if (!note) {
    toast("กรุณาเขียนบันทึกก่อนเพิ่ม", "error");
    return;
  }
  await withPending(`note-${id}`, async () => {
    await apiFetch(`leads/${encodeURIComponent(id)}/notes`, { method: "POST", body: { note } });
    if (input) input.value = "";
    await refresh(["leads", "audit"]);
    toast("บันทึกการติดต่อแล้ว");
  });
}

async function saveLeadFollowup(id) {
  if (!canWrite() || state.pending) return;
  const input = screen.querySelector(`[data-followup="${cssEscape(id)}"]`);
  const followUpAt = input ? input.value || null : null;
  await withPending(`followup-${id}`, async () => {
    await apiFetch(`leads/${encodeURIComponent(id)}`, { method: "PATCH", body: { followUpAt } });
    await refresh(["leads", "tasks", "audit"]);
    toast("บันทึกการติดตามแล้ว");
  });
}

async function patchTask(id, completed) {
  if (!canWrite() || state.pending) return;
  await withPending(`task-${id}`, async () => {
    await apiFetch(`tasks/${encodeURIComponent(id)}`, { method: "PATCH", body: { completed } });
    await refresh(["tasks", "audit"]);
    toast(completed ? "ทำเครื่องหมายว่าเสร็จแล้ว" : "เปิดงานอีกครั้งแล้ว");
  });
}

async function withPending(key, task) {
  state.pending = key;
  renderChrome();
  try {
    await task();
  } catch (error) {
    toast(error.message || "ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง", "error");
  } finally {
    state.pending = "";
    renderChrome();
    renderScreen();
  }
}

function openLead(id) {
  state.module = "operations";
  state.operationsTab = "leads";
  state.recordId = id;
  writeRoute({ replace: true });
  render();
  casesWorkspace?.openCase(id);
}

async function setModule(moduleId, options = {}) {
  if (isOperationsTab(moduleId)) {
    setOperationsTab(moduleId, options);
    return;
  }
  if (!MODULES.some((item) => item.id === moduleId)) return;
  if (moduleId !== 'articles' && articlesWorkspace?.active && !articlesWorkspace.canLeave()) return;
  if (moduleId !== 'operations' && casesWorkspace?.active && !(await casesWorkspace.leave())) return;
  state.module = moduleId;
  state.recordId = null;
  writeRoute(options);
  render();
  if (moduleId === 'home') loadHomeData();
  else if (moduleId === 'analytics') loadAnalyticsData();
  else if (moduleId === 'content') loadContentData();
  else if (moduleId !== 'operations' && !state.data.leads.length && !state.loading.size) loadAllData();
}

function setOperationsTab(tabId, options = {}) {
  if (!isOperationsTab(tabId)) return;
  if (articlesWorkspace?.active && !articlesWorkspace.canLeave()) return;
  state.module = "operations";
  state.operationsTab = tabId;
  state.recordId = null;
  writeRoute(options);
  render();
}

function rowsFor(resource) {
  return Array.isArray(state.data[resource]) ? state.data[resource] : [];
}

function filteredLeads() {
  return rowsFor("leads").filter((lead) => {
    const statusPass = state.filters.leadStatus === "all" || lead.status === state.filters.leadStatus;
    const interestPass = state.filters.leadInterest === "all" || lead.interestKey === state.filters.leadInterest;
    return statusPass && interestPass && matchesSearch(lead);
  }).sort((a, b) => timestampMs(b.createdAt || b.updatedAt) - timestampMs(a.createdAt || a.updatedAt));
}

function filteredTasks() {
  const view = state.filters.taskView;
  return rowsFor("tasks").filter((task) => {
    const due = task.dueAt || task.dueDate;
    if (view === "completed") return task.completed;
    if (task.completed) return view === "all";
    if (view === "today") return sameDay(due, new Date());
    if (view === "upcoming") return !isOverdue(due) && !sameDay(due, new Date());
    if (view === "overdue") return isOverdue(due);
    return true;
  }).filter(matchesSearch).sort((a, b) => timestampMs(a.dueAt || a.dueDate) - timestampMs(b.dueAt || b.dueDate));
}

function leadCounts() {
  const rows = rowsFor("leads");
  return {
    needsContact: rows.filter((lead) => ["new", "contacting"].includes(lead.status)).length,
    contacted: rows.filter((lead) => !["new"].includes(lead.status)).length,
    consultation: rows.filter((lead) => ["consultation", "quotation", "considering", "converted"].includes(lead.status)).length,
    quoted: rows.filter((lead) => ["quotation", "considering", "converted"].includes(lead.status)).length,
    converted: rows.filter((lead) => lead.status === "converted").length
  };
}

function pageHead(title, description, aside = "") {
  return `
    <div class="page-head">
      <div>
        <h1>${escapeHTML(title)}</h1>
        <p class="lede">${escapeHTML(description)}</p>
      </div>
      <div>${aside}</div>
    </div>
  `;
}

function connectionPill(text) {
  const errorCount = Object.keys(state.errors).length;
  const loading = state.loading.size > 0;
  const label = text || (errorCount ? "การเชื่อมต่อมีปัญหา" : loading ? "กำลังโหลด" : "เชื่อมต่อระบบแล้ว");
  return `<span class="pill${errorCount ? " error" : loading ? " warn" : ""}"><span class="dot"></span>${escapeHTML(label)}</span>`;
}

function resourcePill(resource) {
  if (state.errors[resource]) return `<span class="pill error"><span class="dot"></span>การเชื่อมต่อมีปัญหา</span>`;
  if (state.loading.has(resource)) return `<span class="pill warn"><span class="dot"></span>กำลังโหลด</span>`;
  if (LIVE_RESOURCES.has(resource)) return `<span class="pill"><span class="dot"></span>ข้อมูลล่าสุด</span>`;
  return connectionPill();
}

function errorNotice(resource) {
  const errors = resource
    ? (state.errors[resource] ? [[resource, state.errors[resource]]] : [])
    : Object.entries(state.errors);
  if (!errors.length) return "";
  return `
    <div class="notice error" style="margin-bottom:18px;">
      <strong>การเชื่อมต่อมีปัญหา</strong>
      <div>${errors.map(([key, message]) => `${escapeHTML(systemLabel(key))}: ${escapeHTML(message)}`).join("<br>")}</div>
      <div style="margin-top:12px;"><button class="ghost-button" type="button" data-action="reload">โหลดใหม่</button></div>
    </div>
  `;
}

function metric(label, value, copy, cta, moduleId) {
  return `
    <section class="card metric cm-stat-card">
      <span class="label"><span class="dot"></span>${escapeHTML(label)}</span>
      <span class="value">${escapeHTML(String(value))}</span>
      <p>${escapeHTML(copy)}</p>
      <button type="button" data-action="module" data-module="${escapeHTML(moduleId)}">${escapeHTML(cta)} -></button>
    </section>
  `;
}

function pipelineRow(label, value, pct, sage = false) {
  const width = Number.isFinite(Number(pct)) ? Math.max(0, Math.min(100, Number(pct))) : 0;
  const meta = value === "" ? "" : `${value} · ${Math.round(width)}%`;
  return `
    <div class="progress-row">
      <strong>${escapeHTML(label)}</strong>
      <span class="bar ${sage ? "sage" : ""}"><span style="width:${width}%;"></span></span>
      <span class="cell-meta">${escapeHTML(meta)}</span>
    </div>
  `;
}

function filterBar(groups, count) {
  return `
    <div class="filterbar">
      ${groups.map(([label, key, values]) => `
        <div class="filter-row">
          <span class="filter-label">${escapeHTML(label)}</span>
          ${values.map(([value, text]) => {
            const action = key.startsWith("policy") ? "policy-filter" : key === "documentCategory" ? "document-filter" : key === "customerHold" ? "customer-filter" : "lead-filter";
            return `<button class="chip ${state.filters[key] === value ? "active" : ""}" type="button" data-action="${action}" data-filter="${key}" data-value="${value}">${escapeHTML(text)}</button>`;
          }).join("")}
          ${label === groups[0][0] ? `<span class="record-count">${count} รายการ</span>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function leadRow(lead) {
  return `
    <tr data-open-lead="${escapeHTML(lead.id)}" tabindex="0" role="button" aria-label="เปิดเคส ${escapeHTML(lead.name || lead.id)}">
      <td data-label="เคสลูกค้า">${titleMeta(lead.name || "ไม่ระบุชื่อ", `${lead.phone || lead.contact || lead.lineId || "ไม่มีช่องทางติดต่อ"} · ${systemLabel(lead.source) || "ไม่ระบุ"}`)}</td>
      <td data-label="สถานะ">${status(labelFor(STATUS_OPTIONS, lead.status), lead.status)}</td>
      <td data-label="ความสนใจ"><strong>${interestLabel(lead.interestKey)}</strong></td>
      <td data-label="ติดต่อล่าสุด"><strong>${relativeTime(lead.updatedAt || lead.createdAt)}</strong></td>
      <td data-label="งานถัดไป">${titleMeta(lead.nextAction || nextActionLabel(lead), lead.assigneeName || lead.assigned || "ยังไม่มอบหมาย")}</td>
    </tr>
  `;
}

function simpleTable(headers, rows, raw = false) {
  return `
    <div class="table-shell">
      <table>
        <thead><tr>${headers.map((head) => `<th>${escapeHTML(head)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.length ? rows.map((cells) => `
            <tr>${cells.map((cell, index) => `<td data-label="${escapeHTML(headers[index])}">${raw ? cell : String(cell).includes("<") ? cell : escapeHTML(String(cell))}</td>`).join("")}</tr>
          `).join("") : emptyRow("ยังไม่มีข้อมูล")}
        </tbody>
      </table>
    </div>
  `;
}

function emptyRow(text) {
  return `<tr><td colspan="8"><div class="empty">${escapeHTML(text)}</div></td></tr>`;
}

function emptyBlock(text) {
  return `<div class="empty">${escapeHTML(text)}</div>`;
}

function field(label, value) {
  return `<div><span class="field-label">${escapeHTML(label)}</span><span class="field-value">${escapeHTML(String(value || "-"))}</span></div>`;
}

function titleMeta(title, meta) {
  return `<span class="cell-title">${escapeHTML(String(title || "-"))}</span>${meta ? `<span class="cell-meta">${escapeHTML(String(meta))}</span>` : ""}`;
}

function status(label, value) {
  const className = value || slug(label);
  return `<span class="status ${escapeHTML(className)}">${escapeHTML(label || "-")}</span>`;
}

function timeline(items) {
  if (!items.length) return emptyBlock("ยังไม่มีกิจกรรม");
  return `
    <ul class="timeline">
      ${items.map((item) => `
        <li>
          <strong>${escapeHTML(item.title || "กิจกรรม")}</strong>
          <span>${escapeHTML(item.meta || "")}</span>
        </li>
      `).join("")}
    </ul>
  `;
}

function derivedLeadTimeline(lead) {
  return [
    {
      text: "รับเรื่องแล้ว",
      at: lead.createdAt,
      by: systemLabel(lead.source) || "ระบบ"
    },
    {
      text: lead.consent && lead.consent.given ? "บันทึกความยินยอมแล้ว" : "ยังไม่มีบันทึกความยินยอม",
      at: lead.consent && lead.consent.at || lead.createdAt,
      by: systemLabel(lead.consent && lead.consent.method)
    }
  ];
}

function canWrite() {
  return state.sessionRole !== "readonly";
}

function isOperationsTab(value) {
  return OPERATIONS_TABS.some(([id]) => id === value);
}

function routeStateFromLocation() {
  const params = new URLSearchParams(location.search);
  const hash = !location.hash && (params.has('case') || params.get('followUp') === 'overdue') ? '#operations' : location.hash;
  return adminPortalRouteStateFromLocation(location.pathname, hash);
}

async function syncRouteFromLocation() {
  const next = routeStateFromLocation();
  if (next.module !== 'articles' && articlesWorkspace?.active && !articlesWorkspace.canLeave()) {writeRoute({replace:true});return;}
  if (next.module === state.module && next.operationsTab === state.operationsTab) {
    normalizeRetiredSettingsUrl();
    if (next.module === 'operations') await casesWorkspace?.syncLocation();
    return;
  }
  if (next.module !== 'operations' && casesWorkspace?.active && !(await casesWorkspace.leave())) { writeRoute({ replace: true }); casesWorkspace.restoreLocation(); return; }
  state.module = next.module;
  state.operationsTab = next.operationsTab;
  state.recordId = null;
  normalizeRetiredSettingsUrl();
  render();
  if (next.module === 'home') loadHomeData();
  if (next.module === 'analytics') loadAnalyticsData();
  if (next.module === 'content') loadContentData();
}

function normalizeRetiredSettingsUrl() {
  const hashKey = decodeURIComponent(location.hash.replace(/^#/, '')).trim().split(/[?&]/)[0];
  if (hashKey === 'settings') writeRoute({ replace: true });
}

function routeUrl() {
  const next = new URL(adminPortalUrl(state.module, state.operationsTab), location.origin);
  const current = new URLSearchParams(location.search);
  for (const key of state.module === 'operations' ? ['cm_env', 'case', 'followUp'] : ['cm_env']) {
    if (current.has(key)) next.searchParams.set(key, current.get(key));
  }
  return next.pathname + next.search + next.hash;
}

function writeRoute(options = {}) {
  const method = options.replace ? "replaceState" : "pushState";
  const nextUrl = routeUrl();
  if (`${location.pathname}${location.search}${location.hash}` === nextUrl) return;
  history[method](null, "", nextUrl);
}

function matchesSearch(row) {
  if (!state.query) return true;
  return JSON.stringify(row).toLowerCase().includes(state.query);
}

function clean(value, max = 600) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function escapeHTML(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));
  return String(value).replace(/["\\]/g, "\\$&");
}

function iconSvg(name) {
  const paths = {
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    logout: '<path d="M10 17v4H3V3h7v4M8 12h13m-5-5 5 5-5 5"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    home: '<path d="M3 11.5 12 4l9 7.5"></path><path d="M5 10.5V20h14v-9.5"></path><path d="M9 20v-6h6v6"></path>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"></path><circle cx="9.5" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.9"></path><path d="M16 3.2a4 4 0 0 1 0 7.6"></path>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
    message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M8 13h8"></path><path d="M8 17h6"></path>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path><path d="M3 21v-5h5"></path>',
    check: '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>',
    edit: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"></path>',
    building: '<path d="M4 21V8l8-5 8 5v13"></path><path d="M9 21v-6h6v6"></path><path d="M9 10h.01"></path><path d="M15 10h.01"></path>',
    chart: '<path d="M4 19V5"></path><path d="M4 19h16"></path><path d="M8 16v-5"></path><path d="M12 16V8"></path><path d="M16 16v-3"></path>',
    settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z"></path><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.home}</svg>`;
}

function slug(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function labelFor(list, value) {
  const found = list.find(([id]) => id === value);
  return found ? found[1] : systemLabel(value);
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, (char) => char.toUpperCase());
}

function systemLabel(value) {
  const labels = {
    leads: "เคสลูกค้า", tasks: "งานติดตาม", audit: "ประวัติการทำงาน",
    "Website form": "ฟอร์มเว็บไซต์", website: "เว็บไซต์", manual: "เพิ่มเอง",
    Referral: "ผู้แนะนำ", "Google search": "ค้นหาผ่าน Google", "Phone call": "โทรศัพท์",
    low: "ต่ำ", normal: "ปกติ", medium: "ปานกลาง", high: "สูง", urgent: "เร่งด่วน",
    Low: "ต่ำ", Normal: "ปกติ", Medium: "ปานกลาง", High: "สูง", Urgent: "เร่งด่วน",
    checkbox: "ช่องยืนยันความยินยอม", public_form: "ฟอร์มเว็บไซต์",
    "public form checkbox": "ยืนยันผ่านฟอร์มเว็บไซต์", "Verified website notice": "ยืนยันข้อความแจ้งบนเว็บไซต์แล้ว", Unavailable: "ไม่มีข้อมูล",
    Lead: "เคส", "Follow-up": "การติดตาม", Assign: "มอบหมาย", Status: "สถานะ", Note: "บันทึก", Task: "งาน",
    Created: "สร้างแล้ว", Cleared: "ล้างค่าแล้ว", Unassigned: "ยังไม่มอบหมาย", Open: "เปิดอยู่", Completed: "เสร็จแล้ว",
    New: "เคสใหม่", Contacting: "กำลังติดต่อ", Contacted: "ติดต่อแล้ว", Consultation: "ให้คำปรึกษา",
    Quotation: "เสนอราคา", Considering: "กำลังตัดสินใจ", Converted: "ออกกรมธรรม์แล้ว",
    "Follow-up later": "ติดตามภายหลัง", "Not interested": "ไม่สนใจ", Lost: "ปิดเคสโดยไม่ได้ทำประกัน", Operations: "เพิ่มจาก Admin",
    in_progress: "กำลังดำเนินการ", contacted_reachable: "ติดต่อได้แล้ว",
    contacted_no_answer: "ยังติดต่อไม่ได้", closed_completed: "ปิดเคส · ดำเนินการแล้ว",
    closed_declined: "ปิดเคส · ไม่ดำเนินการต่อ", other: "อื่น ๆ", unsure: "ยังไม่แน่ใจ",
    created: "สร้างข้อมูล", updated: "แก้ไขข้อมูล", completed: "เสร็จแล้ว", reopened: "เปิดอีกครั้ง",
    "lead.created": "สร้างเคส", "lead.updated": "แก้ไขเคส", "lead.status_changed": "เปลี่ยนสถานะเคส",
    "lead.note_added": "เพิ่มบันทึก", "task.completed": "งานเสร็จแล้ว", "task.reopened": "เปิดงานอีกครั้ง"
  };
  if (/^\d+ chars$/.test(String(value))) return `${String(value).split(" ")[0]} ตัวอักษร`;
  return labels[value] || STATUS_OPTIONS.find(([key]) => key === value)?.[1] || value || "";
}

function auditSubject(value) {
  return String(value || "").replace(/^Lead /, "เคส ").replace(/^Task /, "งาน ");
}

function interestLabel(value) {
  const found = INTEREST_OPTIONS.find(([id]) => id === value);
  return found ? found[1] : systemLabel(value || "unsure");
}

function normalizeRole(value) {
  const role = slug(value);
  if (["owner", "admin", "administrator"].includes(role)) return "owner";
  if (["adviser", "advisor"].includes(role)) return "advisor";
  if (["ops", "operations"].includes(role)) return "ops";
  if (["readonly", "read-only", "read"].includes(role)) return "readonly";
  return "none";
}

function displayRole(role) {
  const map = {
    owner: "เจ้าของ / Admin",
    admin: "เจ้าของ / Admin",
    advisor: "ที่ปรึกษา",
    ops: "ทีมงาน",
    readonly: "ดูอย่างเดียว"
  };
  return map[role] || role || "Admin";
}

function timestampMs(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sameDay(value, date) {
  const ms = timestampMs(value);
  if (!ms) return false;
  const item = new Date(ms);
  return item.getFullYear() === date.getFullYear() && item.getMonth() === date.getMonth() && item.getDate() === date.getDate();
}

function isOverdue(value) {
  const ms = timestampMs(value);
  return ms > 0 && ms < Date.now();
}

function relativeTime(value) {
  const ms = timestampMs(value);
  if (!ms) return "ไม่ระบุ";
  const delta = Math.max(0, Date.now() - ms);
  const hours = Math.floor(delta / 3600000);
  if (hours < 1) return "เมื่อสักครู่";
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "เมื่อวาน";
  if (days < 7) return `${days} วันที่แล้ว`;
  if (days < 35) return `${Math.floor(days / 7)} สัปดาห์ที่แล้ว`;
  return formatDate(ms);
}

function formatDue(value) {
  const ms = timestampMs(value);
  if (!ms) return "-";
  if (sameDay(ms, new Date())) {
    return `วันนี้ ${new Intl.DateTimeFormat("th-TH-u-ca-gregory", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(ms)}`;
  }
  return formatDate(value);
}

function formatDate(value) {
  const ms = timestampMs(value);
  if (!ms) return "-";
  return new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(ms);
}

function formatDateTime(value) {
  const ms = timestampMs(value);
  if (!ms) return "";
  return new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(ms);
}

function dateInput(value) {
  const ms = timestampMs(value);
  if (!ms) return "";
  return new Date(ms).toISOString().slice(0, 10);
}

function percent(value, total) {
  return total > 0 ? value / total * 100 : 0;
}

function nextStatuses(value) {
  const map = {
    new: ["contacting", "notinterested", "lost"],
    contacting: ["contacted", "later", "notinterested"],
    contacted: ["consultation", "quotation", "later"],
    consultation: ["quotation", "considering", "lost"],
    quotation: ["considering", "converted", "lost"],
    considering: ["converted", "later", "lost"],
    converted: ["later"],
    later: ["contacting", "lost"],
    notinterested: ["later", "lost"],
    lost: ["later"]
  };
  return (map[value] || []).map((id) => [id, labelFor(STATUS_OPTIONS, id)]);
}

function nextActionLabel(lead) {
  if (lead.followUpAt) return `ติดตาม ${formatDate(lead.followUpAt)}`;
  if (["new", "contacting"].includes(lead.status)) return "ติดต่อครั้งแรก";
  return "-";
}

function arrayOf(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function initials(value) {
  return String(value || "CM").split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}

function toast(message, type = "") {
  toastRoot.innerHTML = `<div class="toast ${type === "error" ? "error" : ""}">${escapeHTML(message)}</div>`;
  window.setTimeout(() => {
    toastRoot.innerHTML = "";
  }, 3200);
}
