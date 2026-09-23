import { ADMIN_LOGIN_PATH, requireVerifiedAdminSession, signOutAdmin } from "/admin/session.js";
import { createCasesWorkspace } from "/admin/ops/cases.js";
import { homeView } from "/admin/home-view.js";
import {
  adminPortalRouteStateFromLocation,
  adminPortalUrl,
  ownerPathForMode
} from "/covermate-contract.js";

const K_ADMIN_EVER = "purich-admin-ever-v7";
const OWNER_CONTENT_PATH = ownerPathForMode("admin");
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

const MODULES = [
  { id: "home", label: "หน้าแรก", icon: "home" },
  { id: "operations", label: "งานลูกค้า", icon: "users", count: () => leadCounts().needsContact },
  { id: "content", label: "จัดการเว็บไซต์", icon: "edit" },
  { id: "analytics", label: "Analytics", icon: "chart" },
  { id: "settings", label: "ตั้งค่า", icon: "settings" }
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
  role: "none",
  sessionRole: "none",
  home: { loading: true, error: '', summary: null, items: [], checkedAt: null },
  filters: {
    leadStatus: "all",
    leadInterest: "all",
    customerHold: "all",
    policyStatus: "all",
    policyType: "all",
    renewalWindow: "all",
    taskView: "all",
    documentCategory: "all",
    analyticsTab: "overview",
    settingsTab: "roles"
  }
};
let casesWorkspace;

const screen = document.getElementById("screen");
const sideNav = document.getElementById("sideNav");
const roleSelect = document.getElementById("roleSelect");
const mobileModuleSelect = document.getElementById("mobileModuleSelect");
const globalSearch = document.getElementById("globalSearch");
const modalRoot = document.getElementById("modalRoot");
const dataMode = document.getElementById("dataMode");
const newLeadButton = document.getElementById("newLeadButton");
const toastRoot = document.getElementById("toastRoot");

init();

async function init() {
  clearOwnerMarker();
  try {
    state.session = await requireVerifiedAdminSession({ redirectTo: ADMIN_LOGIN_PATH });
    if (!state.session) return;
  } finally {
    document.body.dataset.boot = "ready";
  }

  state.sessionRole = normalizeRole(state.session.role);
  state.role = state.sessionRole;
  casesWorkspace = createCasesWorkspace({ root: screen, api: apiFetch, session: { ...state.session, role: state.sessionRole }, searchInput: globalSearch, navigate: setModule, getCurrentModule: () => state.module });
  const bell = document.createElement('button');
  bell.type = 'button'; bell.className = 'case-button case-icon-button case-top-bell'; bell.dataset.caseAction = 'notifications'; bell.setAttribute('aria-label', 'การแจ้งเตือน');
  bell.addEventListener('click', () => casesWorkspace.openNotifications());
  document.querySelector('.topbar').append(bell);
  const menu = document.createElement('button'); menu.type = 'button'; menu.className = 'case-button case-icon-button case-menu-trigger'; menu.setAttribute('aria-label', 'เปิดเมนู Admin');
  menu.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
  menu.addEventListener('click', () => casesWorkspace.openNavigation()); document.querySelector('.mobilebar').append(menu);
  applySessionChrome();
  bindEvents();
  render();
  await loadAllData();
}

function applySessionChrome() {
  const name = (state.session && (state.session.name || state.session.email)) || "ผู้ดูแล CoverMate";
  const initials = name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CM";
  document.getElementById("userName").textContent = name;
  document.getElementById("userAvatar").textContent = initials;
  document.getElementById("userMeta").textContent = `${displayRole(normalizeRole(state.session.role))} · ยืนยันสิทธิ์แล้ว`;
}

function bindEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("keydown", handleKeydown);
  roleSelect.addEventListener("change", () => {
    state.role = roleSelect.value;
    render();
  });
  mobileModuleSelect.addEventListener("change", () => setModule(mobileModuleSelect.value));
  globalSearch.addEventListener("input", () => {
    if (state.module === 'operations') { casesWorkspace.setSearch(globalSearch.value); return; }
    state.query = globalSearch.value.trim().toLowerCase();
    state.recordId = null;
    if (state.module !== 'home') renderScreen();
  });
  globalSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (state.module === 'operations') return;
    openHomeCases({ search: globalSearch.value });
  });
  window.addEventListener("hashchange", syncRouteFromLocation);
  window.addEventListener("popstate", syncRouteFromLocation);
}

async function loadAllData() {
  if (state.module === 'operations') { state.loading.clear(); return; }
  if (state.module === 'home') { state.loading.clear(); return loadHomeData(); }
  await Promise.all(DATA_RESOURCES.map((resource) => loadResource(resource)));
  render();
}

let homeLoadGeneration = 0;
async function loadHomeData() {
  const generation = ++homeLoadGeneration;
  state.home = { loading: true, error: '', summary: null, items: [], checkedAt: null };
  if (state.module === 'home') renderHome();
  casesWorkspace.refreshNotifications();
  const results = await Promise.allSettled([
    apiFetch('cases/summary'),
    apiFetch('cases?scope=all&sort=newest&limit=3')
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

function handleClick(event) {
  if (event.target.closest("[data-public-site]")) {
    clearOwnerMarker();
    return;
  }

  const actionEl = event.target.closest("[data-action]");
  if (actionEl) {
    if (actionEl.tagName === "A") event.preventDefault();
    const action = actionEl.dataset.action;
    if (action === "logout") signOutAdmin();
    if (action === 'home-refresh' && !state.home.loading) loadHomeData();
    if (action === 'home-cases') openHomeCases();
    if (action === 'home-follow-ups') openHomeCases({ followUp: 'due' });
    if (action === 'home-case') openHomeCases({ id: actionEl.dataset.id });
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
    if (action === "settings-tab") {
      state.filters.settingsTab = actionEl.dataset.value;
      renderScreen();
    }
    if (action === "analytics-tab") {
      state.filters.analyticsTab = actionEl.dataset.value;
      renderScreen();
    }
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
  globalSearch.placeholder = ['home', 'operations'].includes(state.module) ? 'ค้นหาชื่อ เบอร์โทร LINE อีเมล หรือเลขเคส…' : 'ค้นหาข้อมูล';
  const sidebarLogo = document.querySelector('.sidebar .brand-logo');
  sidebarLogo.src = state.module === 'home' ? '/assets/brand/covermate-footer-logo-en.png?v=20260913-mate-gold' : '/assets/brand/covermate-advisory-logo-en.png?v=20260913-mate-gold';
  sideNav.innerHTML = MODULES.map((item) => {
    const count = 0;
    const navBadge = count
      ? `<span class="badge">${count}</span>`
      : "";
    return `
      <button class="nav-button ${item.id === state.module ? "active" : ""}" type="button" data-action="module" data-module="${item.id}" ${item.id === state.module ? 'aria-current="page"' : ""}>
        <span class="nav-icon" aria-hidden="true">${iconSvg(item.icon)}</span>
        <span>${escapeHTML(item.label)}</span>
        ${navBadge}
      </button>
    `;
  }).join("");
  mobileModuleSelect.innerHTML = MODULES.map((item) => `<option value="${item.id}" ${item.id === state.module ? "selected" : ""}>${escapeHTML(item.label)}</option>`).join("");
  roleSelect.value = state.role;
  newLeadButton.hidden = state.module !== "operations";
  newLeadButton.disabled = !canWrite() || Boolean(state.pending);
  newLeadButton.title = canWrite() ? "สร้างเคสลูกค้าใหม่" : "สิทธิ์นี้ไม่สามารถสร้างเคสได้";
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
  dataMode.className = `pill${errorCount ? " error" : loading ? " warn" : ""}`;
  dataMode.innerHTML = `<span class="dot"></span>${escapeHTML(text)}`;
}

function renderScreen() {
  if (!screen) return;
  if (state.module === "home") return renderHome();
  if (state.module === "operations") {
    return casesWorkspace?.mount();
  }
  if (state.module === "content") return renderContent();
  if (state.module === "analytics") return renderAnalytics();
  if (state.module === "settings") return renderSettings();
  return renderHome();
}

function renderHome() {
  // A data refresh must preserve the exact focused card/link, not just its action.
  const focusKey = element => JSON.stringify([element.tagName, element.getAttribute('href'), element.dataset.action, element.dataset.module, element.dataset.id, element.getAttribute('aria-label')]);
  const activeKey = screen.contains(document.activeElement) ? focusKey(document.activeElement) : null;
  screen.innerHTML = homeView({
    home: state.home,
    name: state.session?.name || state.session?.email || 'ผู้ดูแล CoverMate',
    role: displayRole(state.sessionRole),
    editPath: OWNER_EDIT_PATH,
    previewPath: OWNER_PREVIEW_PATH,
    icon: iconSvg
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

function renderContent() {
  const editDisabled = state.role === "readonly";
  screen.innerHTML = `
    ${pageHead("จัดการเว็บไซต์", "แก้ไขข้อความและส่วนต่าง ๆ ของเว็บไซต์ พร้อม Preview และ Publish ผ่าน CMS", connectionPill("เชื่อมต่อ CMS แล้ว"))}
    <div class="notice" style="margin-bottom:18px;">
      <strong>เครื่องมือจัดการเว็บไซต์</strong>
      <div>เริ่มจากคลิกแก้ไขข้อความบนหน้าเว็บ เมนูเครื่องมือจะเปิดแผงเครื่องมือลำดับและการแสดงผล ตั้งค่าแบรนด์ ท้ายเว็บ พร้อม Preview และ Publish</div>
    </div>
    <div class="grid three">
      ${contentCard("แก้ไขเนื้อหา", "คลิกแก้ไขหัวข้อ ข้อความ และป้ายกำกับได้บนหน้าเว็บ เปิดเมนูเครื่องมือ → แผงเครื่องมือ เพื่อจัดลำดับและซ่อนส่วนต่าง ๆ ตั้งค่าแบรนด์ ท้ายเว็บ สำรองและกู้คืนข้อมูล", OWNER_EDIT_PATH, editDisabled)}
      ${contentCard("Preview ฉบับร่าง", "ดูฉบับร่างก่อน Publish โดยผู้เข้าชมยังเห็นเว็บไซต์เวอร์ชันที่เผยแพร่อยู่", OWNER_PREVIEW_PATH, false)}
      ${contentCard("เวอร์ชันที่เผยแพร่แล้ว", "ดูประวัติเวอร์ชันและกู้คืนข้อมูลได้ในแผงเครื่องมือ", OWNER_CONTENT_PATH, editDisabled)}
    </div>
    <section class="panel" style="margin-top:18px;">
      <h2>ส่วนที่ผู้ดูแลแก้ไขได้</h2>
      ${simpleTable(["ส่วนที่จัดการ", "สิทธิ์การแก้ไข"], [
        ["คำถามที่พบบ่อย (FAQ)", status("แก้ไขได้", "editable")],
        ["ข้อมูลและรูปที่ปรึกษา", status("แก้ไขได้", "editable")],
        ["รายละเอียดบริการ", status("แก้ไขได้", "editable")],
        ["ข้อมูลติดต่อและเวลาทำการ", status("แก้ไขได้", "editable")],
        ["ประกาศหน้าแรก", status("แก้ไขได้", "editable")],
        ["โลโก้บริษัทประกัน", status("แก้ไขได้", "editable")],
        ["ลำดับ การแสดงผล และสีของแต่ละส่วน", status("แก้ไขได้", "editable")],
        ["Layout ระยะห่าง และองค์ประกอบ", status("แก้ไขผ่านโค้ด", "code-owned")],
        ["เลขใบอนุญาตและข้อความตัวแทน/นายหน้า", status("ล็อกข้อความตามข้อกำหนด", "locked-legal-surface")],
        ["การเปิดเผยค่าตอบแทนและข้อกำหนดเรื่องตัวอย่างการเคลม", status("ล็อกข้อความตามข้อกำหนด", "locked-legal-surface")],
        ["รีวิวลูกค้า", status("ปิดอยู่", "off")]
      ], true)}
    </section>
  `;
}

function renderAnalytics() {
  const counts = leadCounts();
  const known = rowsFor("leads").length;
  const tab = state.filters.analyticsTab;
  screen.innerHTML = `
    ${pageHead("Analytics", "สถิติการทำงานจากข้อมูลเคสลูกค้าใน CoverMate", connectionPill("ข้อมูลจากระบบ CoverMate"))}
    ${errorNotice()}
    <div class="filterbar">
      <div class="filter-row">
        ${["overview", "conversion-funnel", "services", "leads"].map((value) => `
          <button class="chip ${tab === value ? "active" : ""}" type="button" data-action="analytics-tab" data-value="${value}">${({ overview: "ภาพรวม", "conversion-funnel": "ลำดับความคืบหน้า", services: "ประเภทบริการ", leads: "เคสลูกค้า" })[value]}</button>
        `).join("")}
      </div>
    </div>
    <div class="grid four">
      ${analyticMetric("เคสทั้งหมด", known, "เคสที่บันทึกไว้ใน CoverMate")}
      ${analyticMetric("ติดต่อแล้ว", counts.contacted, "เคสที่ผ่านขั้นตอนรับเรื่องใหม่แล้ว")}
      ${analyticMetric("ให้คำปรึกษา", counts.consultation, "เคสที่เข้าสู่ขั้นตอนให้คำปรึกษา")}
      ${analyticMetric("เสนอราคา", counts.quoted, "เคสที่เข้าสู่ขั้นตอนเสนอราคา")}
      ${analyticMetric("ออกกรมธรรม์แล้ว", counts.converted, "เคสที่ยืนยันการออกกรมธรรม์แล้ว")}
    </div>
    <section class="panel" style="margin-top:18px;">
      <h2>จากเคสลูกค้าสู่กรมธรรม์</h2>
      <div class="progress-list">
        ${pipelineRow("เคสทั้งหมด", known, 100)}
        ${pipelineRow("ติดต่อแล้ว", counts.contacted, percent(counts.contacted, known))}
        ${pipelineRow("ให้คำปรึกษา", counts.consultation, percent(counts.consultation, known))}
        ${pipelineRow("เสนอราคา", counts.quoted, percent(counts.quoted, known))}
        ${pipelineRow("ออกกรมธรรม์แล้ว", counts.converted, percent(counts.converted, known), true)}
      </div>
    </section>
  `;
}

function renderSettings() {
  const tab = state.filters.settingsTab;
  const tabs = [
    ["roles", "บทบาทและสิทธิ์"],
    ["statuses", "สถานะเคส"],
    ["consent", "PDPA และความยินยอม"],
    ["audit", "ประวัติการทำงาน"]
  ];
  screen.innerHTML = `
    ${pageHead("ตั้งค่า", "บทบาท สถานะ การคุ้มครองข้อมูล และประวัติการทำงาน", connectionPill("ข้อมูลอ้างอิง · ระบบตรวจสอบสิทธิ์จริง"))}
    <div class="tabs">
      ${tabs.map(([value, label]) => `<button class="chip ${tab === value ? "active" : ""}" type="button" data-action="settings-tab" data-value="${value}">${escapeHTML(label)}</button>`).join("")}
    </div>
    ${tab === "roles" ? settingsRoles() : ""}
    ${tab === "statuses" ? settingsStatuses() : ""}
    ${tab === "consent" ? settingsConsent() : ""}
    ${tab === "audit" ? settingsAudit() : ""}
  `;
}

function settingsRoles() {
  return `
    <section class="panel">
      <h2>บทบาทและสิทธิ์</h2>
      <p class="lede" style="font-size:16px;margin-bottom:20px;">ตัวเลือกบทบาทใช้ Preview ว่าแต่ละสิทธิ์เข้าถึงอะไรได้บ้าง ระบบยังตรวจสอบสิทธิ์จริงทุกครั้งที่ทำรายการ</p>
      <div class="table-shell permission-table">
        <table>
          <thead><tr><th>การทำงาน</th><th>เจ้าของ</th><th>ที่ปรึกษา</th><th>ทีมงาน</th><th>ดูอย่างเดียว</th></tr></thead>
          <tbody>
            ${[
              ["ดูเคสและข้อมูลลูกค้า", 1, 1, 1, 1],
              ["สร้างและแก้ไขข้อมูล", 1, 1, 1, 0],
              ["เปลี่ยนสถานะเคสหรือกรมธรรม์", 1, 1, 1, 0],
              ["ดูเอกสารยืนยันตัวตน", 1, 1, 0, 0],
              ["จัดการหรือถอนความยินยอม", 1, 0, 0, 0],
              ["Export ข้อมูลลูกค้า", 1, 0, 0, 0],
              ["ลบข้อมูล", 1, 0, 0, 0],
              ["จัดการผู้ใช้และบทบาท", 1, 0, 0, 0],
              ["แก้ไขเนื้อหาเว็บไซต์", 1, 0, 0, 0],
              ["แก้ไขข้อความตามข้อกำหนด", 0, 0, 0, 0]
            ].map((row) => `<tr>${row.map((cell, index) => index ? `<td data-label="${["เจ้าของ", "ที่ปรึกษา", "ทีมงาน", "ดูอย่างเดียว"][index - 1]}">${cell ? "<span class=\"yes\">✓</span>" : "<span class=\"no\">-</span>"}</td>` : `<td data-label="การทำงาน"><strong>${escapeHTML(cell)}</strong></td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function settingsStatuses() {
  return `
    <section class="panel">
      <h2>สถานะเคส</h2>
      ${simpleTable(["สถานะ", "ความหมาย", "สถานะถัดไปที่เลือกได้"], STATUS_OPTIONS.filter(([id]) => id !== "all").map(([id, label]) => [
        status(label, id),
        statusMeaning(id),
        nextStatuses(id).map(([value, name]) => name).join(", ")
      ]), true)}
    </section>
  `;
}

function settingsConsent() {
  return `
    <section class="panel">
      <h2>PDPA และความยินยอม</h2>
      <div class="notice">ระบบเพิ่มบันทึกความยินยอมโดยเก็บประวัติเดิมไว้ การถอนความยินยอมจะบันทึกเป็นเหตุการณ์ใหม่ พร้อมผู้ดำเนินการ ที่มา วัตถุประสงค์ และเวลา</div>
      ${simpleTable(["เหตุการณ์", "ข้อมูลที่จัดเก็บ"], [
        ["ยินยอมผ่านฟอร์มเว็บไซต์", "รหัสเคส วัตถุประสงค์ หน้าที่ส่งฟอร์ม วันเวลา และภาษา"],
        ["บันทึกความยินยอมเอง", "รหัสลูกค้า วัตถุประสงค์ ผู้บันทึก วันเวลา และหลักฐาน"],
        ["ถอนความยินยอม", "รหัสลูกค้า รหัสความยินยอมเดิม ผู้บันทึก วันเวลา และเหตุผล"]
      ], true)}
    </section>
  `;
}

function settingsAudit() {
  const rows = rowsFor("audit").slice(0, 50);
  return `
    <section class="panel">
      <h2>ประวัติการทำงาน</h2>
      ${errorNotice("audit")}
      ${rows.length ? simpleTable(["วันเวลา", "ผู้ดำเนินการ", "ประเภท", "รายการที่เกี่ยวข้อง", "การเปลี่ยนแปลง"], rows.map((row) => [
        formatDateTime(row.at),
        row.actorName || row.actorId || "",
        systemLabel(row.kind),
        auditSubject(row.subject || row.recordId),
        [row.from, row.to].filter(Boolean).map(systemLabel).join(" → ") || systemLabel(row.action)
      ]), false) : emptyBlock("ยังไม่มีประวัติการทำงาน")}
    </section>
  `;
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
  if (moduleId !== 'operations' && casesWorkspace?.active && !(await casesWorkspace.leave())) return;
  state.module = moduleId;
  state.recordId = null;
  writeRoute(options);
  render();
  if (moduleId === 'home') loadHomeData();
  else if (moduleId !== 'operations' && !state.data.leads.length && !state.loading.size) loadAllData();
}

function setOperationsTab(tabId, options = {}) {
  if (!isOperationsTab(tabId)) return;
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
    <section class="card metric">
      <span class="label"><span class="dot"></span>${escapeHTML(label)}</span>
      <span class="value">${escapeHTML(String(value))}</span>
      <p>${escapeHTML(copy)}</p>
      <button type="button" data-action="module" data-module="${escapeHTML(moduleId)}">${escapeHTML(cta)} -></button>
    </section>
  `;
}

function analyticMetric(label, value, copy) {
  return `
    <section class="card">
      <span class="field-label">${escapeHTML(label)}</span>
      <strong style="display:block;font-size:34px;line-height:1.1;margin:10px 0;">${escapeHTML(String(value))}</strong>
      <p class="note">${escapeHTML(copy)}</p>
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

function contentCard(title, copy, href, disabled) {
  return `
    <section class="card module-card">
      <span class="round-icon" aria-hidden="true">${iconSvg("edit")}</span>
      <h2>${escapeHTML(title)}</h2>
      <p class="note" style="margin-bottom:18px;">${escapeHTML(copy)}</p>
      ${disabled
        ? `<button class="ghost-button" type="button" disabled title="สิทธิ์นี้ไม่สามารถแก้ไขเนื้อหาเว็บไซต์ได้">ดูอย่างเดียว</button>`
        : `<a class="ghost-button" href="${escapeHTML(href)}" target="_blank" rel="noreferrer">เปิด</a>`}
    </section>
  `;
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
  return state.sessionRole !== "readonly" && state.role !== "readonly";
}

function isOperationsTab(value) {
  return OPERATIONS_TABS.some(([id]) => id === value);
}

function routeStateFromLocation() {
  return adminPortalRouteStateFromLocation(location.pathname, location.hash);
}

async function syncRouteFromLocation() {
  const next = routeStateFromLocation();
  if (next.module === state.module && next.operationsTab === state.operationsTab) return;
  if (next.module !== 'operations' && casesWorkspace?.active && !(await casesWorkspace.leave())) { writeRoute({ replace: true }); return; }
  state.module = next.module;
  state.operationsTab = next.operationsTab;
  state.recordId = null;
  render();
  if (next.module === 'home') loadHomeData();
}

function routeUrl() {
  return adminPortalUrl(state.module, state.operationsTab);
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

function statusMeaning(value) {
  const meanings = {
    new: "รับเรื่องแล้ว แต่ยังไม่ได้ติดต่อกลับ",
    contacting: "กำลังติดต่อกลับครั้งแรก",
    contacted: "ลูกค้าตอบกลับหรือได้พูดคุยกับ CoverMate แล้ว",
    consultation: "นัดหมายหรือให้คำปรึกษาแล้ว",
    quotation: "กำลังเตรียมหรือส่งข้อเสนอเปรียบเทียบ",
    considering: "ลูกค้ากำลังตัดสินใจหลังได้รับตัวเลือก",
    converted: "มีข้อมูลกรมธรรม์แล้ว",
    later: "ลูกค้าขอให้ติดตามอีกครั้งในภายหลัง",
    notinterested: "ลูกค้ายังไม่สนใจในขณะนี้",
    lost: "ปิดเคสโดยไม่ได้ออกกรมธรรม์"
  };
  return meanings[value] || "";
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
