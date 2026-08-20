import { requireVerifiedAdminSession, signOutAdmin } from "/admin/session.js";

const K_ADMIN_EVER = "purich-admin-ever-v7";

const STATUS_OPTIONS = [
  ["all", "All"],
  ["new", "New"],
  ["contacting", "Contacting"],
  ["contacted", "Contacted"],
  ["consultation", "Consultation"],
  ["quotation", "Quotation"],
  ["considering", "Considering"],
  ["converted", "Converted"],
  ["later", "Follow-up later"],
  ["notinterested", "Not interested"],
  ["lost", "Lost"]
];

const INTEREST_OPTIONS = [
  ["all", "All"],
  ["motor", "Motor"],
  ["life", "Life"],
  ["health", "Health"],
  ["accident", "Accident"],
  ["savings", "Savings"],
  ["unsure", "Unsure"]
];

const TASK_FILTERS = [
  ["all", "All"],
  ["today", "Today"],
  ["upcoming", "Upcoming"],
  ["overdue", "Overdue"],
  ["completed", "Completed"]
];

const MODULES = [
  { id: "home", label: "Home", icon: "home" },
  { id: "operations", label: "Operations", icon: "users", count: () => leadCounts().needsContact },
  { id: "content", label: "Website content", icon: "edit" },
  { id: "analytics", label: "Analytics", icon: "chart" },
  { id: "settings", label: "Settings", icon: "settings" }
];

const OPERATIONS_TABS = [
  ["dashboard", "Dashboard"],
  ["leads", "Leads"],
  ["tasks", "Tasks"],
  ["audit", "Audit"]
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
  role: "owner",
  sessionRole: "owner",
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
    state.session = await requireVerifiedAdminSession({ redirectTo: "/admin/login" });
    if (!state.session) return;
  } finally {
    document.body.dataset.boot = "ready";
  }

  state.sessionRole = normalizeRole(state.session.role || "owner");
  state.role = state.sessionRole;
  applySessionChrome();
  bindEvents();
  render();
  await loadAllData();
}

function applySessionChrome() {
  const name = (state.session && (state.session.name || state.session.email)) || "CoverMate admin";
  const initials = name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CM";
  document.getElementById("userName").textContent = name;
  document.getElementById("userAvatar").textContent = initials;
  document.getElementById("userMeta").textContent = `${state.session.role || "admin"} · verified`;
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
    state.query = globalSearch.value.trim().toLowerCase();
    state.recordId = null;
    renderScreen();
  });
  globalSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    setOperationsTab("leads");
  });
  window.addEventListener("hashchange", syncRouteFromLocation);
  window.addEventListener("popstate", syncRouteFromLocation);
}

async function loadAllData() {
  await Promise.all(DATA_RESOURCES.map((resource) => loadResource(resource)));
  render();
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
    state.errors[resource] = error.message || "Could not load this resource.";
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
    throw new Error("The Firebase admin session is not available.");
  }
  const token = await user.getIdToken();
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`/api/ops/${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || payload.error || `Request failed with ${response.status}.`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function ensureFirebase() {
  if (!window.CoverMateFirebase) {
    await import(window.location.origin + "/covermate-firebase.js");
  }
  if (!window.CoverMateFirebase) {
    throw new Error("Firebase helper is not loaded.");
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
  sideNav.innerHTML = MODULES.map((item) => {
    const count = item.count ? Number(item.count() || 0) : 0;
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
  newLeadButton.title = canWrite() ? "Create a lead through the operations API" : "This role cannot create leads";
}

function renderTopStatus() {
  const loading = state.loading.size > 0;
  const errorCount = Object.keys(state.errors).length;
  const leadCount = rowsFor("leads").length;
  const text = loading
    ? "Loading records"
    : errorCount
      ? `${errorCount} API issue${errorCount === 1 ? "" : "s"}`
      : `Live: leads/tasks/audit · ${leadCount} leads`;
  dataMode.className = `pill${errorCount ? " error" : loading ? " warn" : ""}`;
  dataMode.innerHTML = `<span class="dot"></span>${escapeHTML(text)}`;
}

function renderScreen() {
  if (!screen) return;
  if (state.module === "home") return renderHome();
  if (state.module === "operations") {
    if (state.operationsTab === "leads") return state.recordId ? renderLeadDetail(state.recordId) : renderLeads();
    if (state.operationsTab === "tasks") return renderTasks();
    if (state.operationsTab === "audit") return renderAudit();
    return renderDashboard();
  }
  if (state.module === "content") return renderContent();
  if (state.module === "analytics") return renderAnalytics();
  if (state.module === "settings") return renderSettings();
  return renderHome();
}

function renderHome() {
  screen.innerHTML = `
    ${pageHead("Admin Portal", "A single private entry point for operations, website content, analytics, and admin settings.", `<a class="ghost-button" href="/" target="_blank" rel="noopener noreferrer" data-public-site>Public site</a>`)}
    <div class="grid four">
      <button class="card module-card" type="button" data-action="module" data-module="operations" data-admin-home-card="operations">
        <span class="round-icon" aria-hidden="true">${iconSvg("users")}</span>
        <h2>Operations</h2>
        <span class="module-status">Live: leads/tasks/audit</span>
        <p>Lead intake, follow-ups, task completion, lead notes, status changes, and audit trail run through the Operations API.</p>
        <span class="module-action">Open workspace -></span>
      </button>

      <button class="card module-card sage" type="button" data-action="module" data-module="content" data-admin-home-card="content">
        <span class="round-icon" aria-hidden="true">${iconSvg("edit")}</span>
        <h2>Website content</h2>
        <span class="module-status">Live CMS</span>
        <p>Live copy, section order, visibility, contact details, brand settings, media, preview, and publish remain in the Firestore CMS.</p>
        <span class="module-action">Open controls -></span>
      </button>

      <button class="card module-card ink" type="button" data-action="module" data-module="analytics" data-admin-home-card="analytics">
        <span class="round-icon" aria-hidden="true">${iconSvg("chart")}</span>
        <h2>Analytics</h2>
        <span class="module-status">First-party live</span>
        <p>Private reporting from known CoverMate leads, consultation progress, quote stage, and confirmed policy outcomes.</p>
        <span class="module-action">Open analytics -></span>
      </button>

      <button class="card module-card sage" type="button" data-action="module" data-module="settings" data-admin-home-card="settings">
        <span class="round-icon" aria-hidden="true">${iconSvg("settings")}</span>
        <h2>Settings</h2>
        <span class="module-status">API enforced</span>
        <p>Roles, lead statuses, PDPA consent rules, permissions reference, and audit visibility. The API enforces real permissions.</p>
        <span class="module-action">Open settings -></span>
      </button>
    </div>

    <div class="grid two" style="margin-top:18px;">
      <section class="panel" aria-labelledby="quickActionsTitle">
        <h2 id="quickActionsTitle">Quick actions</h2>
        <ul class="rail-list">
          <li><a href="/admin/edit">Edit public-page words <span>Inline copy editor</span></a></li>
          <li><a href="/admin/preview">Preview website draft <span>Private draft view</span></a></li>
          <li><button class="rail-action" type="button" data-action="op-tab" data-tab="leads">Review lead intake <span>Operations list</span></button></li>
          <li><button class="rail-action" type="button" data-action="op-tab" data-tab="tasks">Open follow-ups <span>Task queue</span></button></li>
        </ul>
      </section>

      <section class="panel" aria-labelledby="statusTitle">
        <h2 id="statusTitle">System status</h2>
        <div class="rail-list">
          <div class="rail-row">Firebase admin session <span>${escapeHTML(displayRole(state.sessionRole))} · verified</span></div>
          <div class="rail-row">Operations backend <span>Leads, tasks, and audit live through /api/ops</span></div>
          <div class="rail-row">Website CMS <span>Firestore draft/live</span></div>
          <div class="rail-row">Analytics <span>First-party CoverMate records</span></div>
        </div>
        <div class="actions">
          <a class="ghost-button" href="https://smart.oic.or.th/eservice/Menu1" target="_blank" rel="noopener">Verify licence</a>
          <button class="ghost-button" type="button" data-action="logout">Log out</button>
        </div>
      </section>
    </div>
  `;
}

function operationsTabs() {
  return `
    <div class="tabs" aria-label="Operations views">
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
    ${pageHead("Dashboard", "What needs a decision today, and where the live Operations data is reliable.", connectionPill())}
    ${operationsTabs()}
    ${errorNotice()}
    <div class="grid metrics">
      ${metric("Needs first contact", counts.needsContact, "Enquiries that have not moved beyond first contact.", "Open leads", "leads")}
      ${metric("Overdue follow-ups", overdue, "Dated actions that have passed without being completed.", "Open tasks", "tasks")}
      ${metric("Known leads", rowsFor("leads").length, "Identified CoverMate records in the Operations API.", "Open leads", "leads")}
      ${metric("Audit entries", rowsFor("audit").length, "Server-produced activity entries visible to admins.", "Open audit", "audit")}
    </div>
    <div class="grid two" style="margin-top:16px;">
      <section class="panel">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
          <h2>Open work</h2>
          <button class="ghost-button" type="button" data-action="module" data-module="tasks">All tasks</button>
        </div>
        ${activeTasks.length ? timeline(activeTasks.map((task) => ({
          title: task.title || task.task || task.name || task.id,
          meta: `${formatDue(task.dueAt || task.dueDate)} · ${task.relatedLabel || task.related || "No linked record"}`
        }))) : emptyBlock("No open tasks.")}
      </section>
      <section class="panel">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
          <h2>Pipeline</h2>
          <span class="cell-meta">First-party records</span>
        </div>
        <div class="progress-list">
          ${pipelineRow("Known leads", rowsFor("leads").length, 100)}
          ${pipelineRow("Contacted", counts.contacted, percent(counts.contacted, rowsFor("leads").length))}
          ${pipelineRow("Consultation", counts.consultation, percent(counts.consultation, rowsFor("leads").length))}
          ${pipelineRow("Quoted", counts.quoted, percent(counts.quoted, rowsFor("leads").length))}
          ${pipelineRow("Converted", counts.converted, percent(counts.converted, rowsFor("leads").length), true)}
        </div>
        <p class="note" style="margin-top:14px;">The funnel starts only after a visitor becomes an identified CoverMate record.</p>
      </section>
      <section class="panel">
        <h2>Recent activity</h2>
        ${audit.length ? timeline(audit.map((entry) => ({
          title: `${entry.kind || "Audit"} — ${entry.subject || entry.recordId || "Record"}`,
          meta: `${entry.to || entry.action || ""} · ${formatDateTime(entry.at)}`
        }))) : emptyBlock("No audit entries yet.")}
      </section>
    </div>
  `;
}

function renderLeads() {
  const rows = filteredLeads();
  screen.innerHTML = `
    ${pageHead("Leads", "Website enquiries and manually created records are managed here.", resourcePill("leads"))}
    ${operationsTabs()}
    ${errorNotice("leads")}
    ${filterBar([
      ["Status", "leadStatus", STATUS_OPTIONS],
      ["Interest", "leadInterest", INTEREST_OPTIONS]
    ], rows.length)}
    <div class="table-shell">
      <table>
        <thead>
          <tr>
            <th style="width:28%;">Lead</th>
            <th style="width:15%;">Status</th>
            <th style="width:17%;">Interest</th>
            <th style="width:18%;">Last interaction</th>
            <th>Next action</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map((lead) => leadRow(lead)).join("") : emptyRow("No leads match the current filters.")}
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
    <button class="ghost-button" type="button" data-action="back-leads">All leads</button>
    <div class="page-head" style="margin-top:18px;">
      <div>
        <h1>${escapeHTML(lead.name || "Unnamed lead")}</h1>
        <p class="lede">${escapeHTML(lead.displayId || lead.id)} · ${interestLabel(lead.interestKey)} · from ${escapeHTML(lead.source || "Unknown source")}</p>
      </div>
      ${resourcePill("leads")}
    </div>
    ${operationsTabs()}
    ${errorNotice("leads")}
    <div class="split">
      <div class="grid">
        <section class="panel">
          <h2>Contact</h2>
          <div class="detail-grid">
            ${field("Phone", lead.phone || lead.contact || "")}
            ${field("LINE ID", lead.lineId || "")}
            ${field("Email", lead.email || "")}
            ${field("Preferred time", lead.preferredContact || "")}
            ${field("Source", lead.source || "")}
            ${field("Assigned", lead.assigneeName || lead.assigned || "")}
          </div>
          <div class="actions">
            ${lead.phone || lead.contact ? `<a class="primary-button" href="tel:${escapeHTML(lead.phone || lead.contact)}">Call ${escapeHTML(lead.phone || lead.contact)}</a>` : `<button class="primary-button" type="button" disabled>Call</button>`}
            ${lead.lineId ? `<a class="ghost-button" href="https://line.me/R/ti/p/${encodeURIComponent(lead.lineId)}" target="_blank" rel="noreferrer">Open in LINE</a>` : `<button class="ghost-button" type="button" disabled>Open in LINE</button>`}
            <button class="ghost-button" type="button" ${canWrite() ? "" : "disabled"} data-action="add-note" data-id="${escapeHTML(lead.id)}">Log interaction</button>
          </div>
        </section>
        <section class="panel">
          <h2>Submitted message</h2>
          <p style="line-height:1.7;">${escapeHTML(lead.message || "No submitted message stored on this lead.")}</p>
          <p class="note">Captured ${formatDateTime(lead.createdAt)}.</p>
        </section>
        <section class="panel">
          <h2>Communication history</h2>
          ${timeline(history.map((item) => ({
            title: item.text || item.title || item.kind || "Activity",
            meta: [item.note, formatDateTime(item.at), item.by].filter(Boolean).join(" · ")
          })))}
          <label style="margin-top:24px;">
            Add an internal note <span class="cell-meta">not visible to the customer</span>
            <textarea data-note="${escapeHTML(lead.id)}" placeholder="What was discussed, what happens next"></textarea>
          </label>
          <div class="actions">
            <button class="primary-button" type="button" ${canWrite() ? "" : "disabled"} data-action="add-note" data-id="${escapeHTML(lead.id)}">Add to history</button>
            <span class="cell-meta">The server records the note length in the audit trail.</span>
          </div>
        </section>
      </div>
      <div class="grid">
        <section class="panel">
          <h2>Status</h2>
          <div class="filter-row">
            ${STATUS_OPTIONS.filter(([value]) => value !== "all").map(([value, label]) => `
              <button class="chip ${lead.status === value ? "active" : ""}" type="button" ${canWrite() ? "" : "disabled"} data-action="status-change" data-id="${escapeHTML(lead.id)}" data-status="${value}">${escapeHTML(label)}</button>
            `).join("")}
          </div>
          <p class="note" style="margin-top:14px;">Status changes are written by the API with previous value, new value, actor and timestamp.</p>
        </section>
        <section class="panel">
          <h2>Next action</h2>
          <div class="form-grid">
            <label>
              Follow-up date
              <input type="date" data-followup="${escapeHTML(lead.id)}" value="${dateInput(lead.followUpAt)}" ${canWrite() ? "" : "disabled"} />
            </label>
            <label>
              Assigned adviser
              <input type="text" value="${escapeHTML(lead.assigneeName || lead.assigned || "Unassigned")}" disabled />
            </label>
          </div>
          <div class="actions">
            <button class="ghost-button" type="button" ${canWrite() ? "" : "disabled"} data-action="save-followup" data-id="${escapeHTML(lead.id)}">Save follow-up</button>
          </div>
        </section>
        <section class="panel" style="background:#f0f8e5;">
          <h2>Consent · PDPA</h2>
          <div class="detail-grid" style="grid-template-columns:1fr 1fr;">
            ${field("Given", lead.consent && lead.consent.given ? "Yes" : "No")}
            ${field("Method", lead.consent && lead.consent.method || "")}
            ${field("Source", lead.consent && lead.consent.source || lead.sourcePath || lead.source || "")}
            ${field("Timestamp", lead.consent && lead.consent.at ? formatDateTime(lead.consent.at) : formatDateTime(lead.createdAt))}
          </div>
          <p class="note" style="margin-top:14px;">Consent changes must be added as new events, never edited in place.</p>
        </section>
      </div>
    </div>
  `;
}

function renderTasks() {
  const rows = filteredTasks();
  screen.innerHTML = `
    ${pageHead("Tasks and follow-ups", "Anything with a date attached, connected to the record it came from.", resourcePill("tasks"))}
    ${operationsTabs()}
    ${errorNotice("tasks")}
    <div class="filterbar">
      <div class="filter-row">
        <span class="filter-label">View</span>
        ${TASK_FILTERS.map(([value, label]) => `
          <button class="chip ${state.filters.taskView === value ? "active" : ""}" type="button" data-action="task-filter" data-value="${value}">${escapeHTML(label)}</button>
        `).join("")}
        <span class="record-count">${rows.length} records</span>
      </div>
    </div>
    <div class="table-shell">
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th style="width:16%;">Due</th>
            <th style="width:14%;">Priority</th>
            <th style="width:18%;">Related record</th>
            <th style="width:14%;">Assigned</th>
            <th style="width:130px;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map((task) => `
            <tr>
              <td data-label="Task"><span class="cell-title">${escapeHTML(task.title || task.task || task.name || task.id)}</span></td>
              <td data-label="Due"><span class="status ${task.completed ? "dim" : isOverdue(task.dueAt || task.dueDate) ? "overdue" : "completed"}">${escapeHTML(formatDue(task.dueAt || task.dueDate))}</span></td>
              <td data-label="Priority"><strong>${escapeHTML(task.priority || "")}</strong></td>
              <td data-label="Related">${escapeHTML(task.relatedLabel || task.related || "")}</td>
              <td data-label="Assigned">${escapeHTML(task.assigneeName || task.owner || "")}</td>
              <td data-label="Action">
                ${task.completed
                  ? `<button class="ghost-button" type="button" ${canWrite() ? "" : "disabled"} data-action="reopen-task" data-id="${escapeHTML(task.id)}">Reopen</button>`
                  : `<button class="ghost-button" type="button" ${canWrite() ? "" : "disabled"} data-action="complete-task" data-id="${escapeHTML(task.id)}">Complete</button>`}
              </td>
            </tr>
          `).join("") : emptyRow("No tasks match this view.")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAudit() {
  const rows = rowsFor("audit").slice(0, 80);
  screen.innerHTML = `
    ${pageHead("Audit", "Server-produced activity entries from live Operations actions.", resourcePill("audit"))}
    ${operationsTabs()}
    ${errorNotice("audit")}
    ${rows.length ? simpleTable(["Time", "Kind", "Record", "Change"], rows.map((entry) => [
      formatDateTime(entry.at),
      entry.kind || entry.action || "",
      entry.subject || entry.recordId || "",
      [entry.from, entry.to].filter(Boolean).join(" -> ") || entry.note || entry.message || ""
    ]), false) : emptyBlock("No audit entries yet.")}
  `;
}

function renderContent() {
  const editDisabled = state.role === "readonly";
  screen.innerHTML = `
    ${pageHead("Website content", "The existing CMS remains the source of truth for public-site copy, sections, preview and publish.", connectionPill("CMS connected"))}
    <div class="notice" style="margin-bottom:18px;">
      <strong>Live CMS surface</strong>
      <div>These actions open the existing Firestore draft/live CMS. They are not part of the new Operations CRUD API.</div>
    </div>
    <div class="grid four">
      ${contentCard("Edit the words", "Open the current editor for headings, paragraphs and labels.", "/admin/edit", editDisabled)}
      ${contentCard("Arrange and customise", "Use the current control panel for section order, visibility, brand details, footer, backup and restore.", "/admin/content", editDisabled)}
      ${contentCard("Preview the draft", "Preview exactly what Publish would produce while visitors keep seeing the live version.", "/admin/preview", false)}
      ${contentCard("Published versions", "Open version history and restore controls in the existing control panel.", "/admin/content", editDisabled)}
    </div>
    <section class="panel" style="margin-top:18px;">
      <h2>Operator-editable surfaces</h2>
      ${simpleTable(["Surface", "Access"], [
        ["FAQ questions and answers", status("Editable")],
        ["Adviser information and photograph", status("Editable")],
        ["Service descriptions", status("Editable")],
        ["Contact details and office hours", status("Editable")],
        ["Homepage announcement", status("Editable")],
        ["Insurer logos on the panel", status("Editable")],
        ["Section order, visibility and colour", status("Editable")],
        ["Layout, spacing, components", status("Code owned")],
        ["Licence numbers and agent/broker wording", status("Locked legal surface")],
        ["Commission disclosure and claim-story rules", status("Locked legal surface")],
        ["Customer testimonials", status("Off")]
      ], true)}
    </section>
  `;
}

function renderAnalytics() {
  const counts = leadCounts();
  const known = rowsFor("leads").length;
  const tab = state.filters.analyticsTab;
  screen.innerHTML = `
    ${pageHead("Analytics", "Operational metrics from identified CoverMate records.", connectionPill("First-party live"))}
    ${errorNotice()}
    <div class="filterbar">
      <div class="filter-row">
        ${["overview", "conversion-funnel", "services", "leads"].map((value) => `
          <button class="chip ${tab === value ? "active" : ""}" type="button" data-action="analytics-tab" data-value="${value}">${titleCase(value.replace(/-/g, " "))}</button>
        `).join("")}
      </div>
    </div>
    <div class="grid four">
      ${analyticMetric("Known leads", known, "Records stored in CoverMate.")}
      ${analyticMetric("Contacted", counts.contacted, "Leads beyond the new stage.")}
      ${analyticMetric("Consultations", counts.consultation, "Leads that reached consultation.")}
      ${analyticMetric("Quotes", counts.quoted, "Leads that reached quotation.")}
      ${analyticMetric("Policies issued", counts.converted, "Confirmed conversion stage.")}
    </div>
    <section class="panel" style="margin-top:18px;">
      <h2>Lead to policy</h2>
      <div class="progress-list">
        ${pipelineRow("Known leads", known, 100)}
        ${pipelineRow("Contacted", counts.contacted, percent(counts.contacted, known))}
        ${pipelineRow("Consultations", counts.consultation, percent(counts.consultation, known))}
        ${pipelineRow("Quotes", counts.quoted, percent(counts.quoted, known))}
        ${pipelineRow("Policies issued", counts.converted, percent(counts.converted, known), true)}
      </div>
    </section>
  `;
}

function renderSettings() {
  const tab = state.filters.settingsTab;
  const tabs = [
    ["roles", "Roles & permissions"],
    ["statuses", "Lead statuses"],
    ["consent", "PDPA & consent"],
    ["audit", "Audit trail"]
  ];
  screen.innerHTML = `
    ${pageHead("Settings", "Roles, statuses, data protection and the audit trail.", connectionPill("Reference · API enforced"))}
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
      <h2>Roles and permissions</h2>
      <p class="lede" style="font-size:16px;margin-bottom:20px;">The role selector previews interface availability. Every operation is re-checked by the API.</p>
      <div class="table-shell permission-table">
        <table>
          <thead><tr><th>Operation</th><th>Owner</th><th>Adviser</th><th>Ops</th><th>Read-only</th></tr></thead>
          <tbody>
            ${[
              ["View leads and customers", 1, 1, 1, 1],
              ["Create and edit records", 1, 1, 1, 0],
              ["Change lead or policy status", 1, 1, 1, 0],
              ["View identification documents", 1, 1, 0, 0],
              ["Edit or withdraw consent records", 1, 0, 0, 0],
              ["Export customer data", 1, 0, 0, 0],
              ["Delete records", 1, 0, 0, 0],
              ["Manage users and roles", 1, 0, 0, 0],
              ["Edit website content", 1, 0, 0, 0],
              ["Edit compliance copy", 0, 0, 0, 0]
            ].map((row) => `<tr>${row.map((cell, index) => index ? `<td data-label="${["Owner", "Adviser", "Ops", "Read-only"][index - 1]}">${cell ? "<span class=\"yes\">✓</span>" : "<span class=\"no\">-</span>"}</td>` : `<td data-label="Operation"><strong>${escapeHTML(cell)}</strong></td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function settingsStatuses() {
  return `
    <section class="panel">
      <h2>Lead statuses</h2>
      ${simpleTable(["Status", "Meaning", "Allowed next statuses"], STATUS_OPTIONS.filter(([id]) => id !== "all").map(([id, label]) => [
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
      <h2>PDPA and consent</h2>
      <div class="notice">Consent records are append-only. A withdrawal creates a new event carrying actor, source, purpose and timestamp.</div>
      ${simpleTable(["Event", "Stored fields"], [
        ["Given from public form", "leadId, purpose, sourcePath, timestamp, language"],
        ["Manual consent", "customerId, purpose, actor, timestamp, evidence note"],
        ["Withdrawal", "customerId, previous consent id, actor, timestamp, reason"]
      ], true)}
    </section>
  `;
}

function settingsAudit() {
  const rows = rowsFor("audit").slice(0, 50);
  return `
    <section class="panel">
      <h2>Audit trail</h2>
      ${errorNotice("audit")}
      ${rows.length ? simpleTable(["When", "Actor", "Kind", "Subject", "Change"], rows.map((row) => [
        formatDateTime(row.at),
        row.actorName || row.actorId || "",
        row.kind || "",
        row.subject || row.recordId || "",
        [row.from, row.to].filter(Boolean).join(" -> ") || row.action || ""
      ]), false) : emptyBlock("No audit entries yet.")}
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
          <h2 id="newLeadTitle">New lead</h2>
          <p class="note" style="margin-top:0;">Creates a lead record, captures consent, and opens a first-contact task.</p>
        </div>
        <button class="ghost-button" type="button" data-action="close-modal">Close</button>
      </div>
      <form data-form="new-lead">
        <div class="modal-body">
          <div class="form-grid">
            <label>Name<input name="name" required autocomplete="name" placeholder="Customer name" /></label>
            <label>Phone<input name="phone" autocomplete="tel" placeholder="08X-XXX-XXXX" /></label>
            <label>LINE ID<input name="lineId" autocomplete="off" placeholder="LINE ID" /></label>
            <label>Email<input name="email" type="email" autocomplete="email" placeholder="name@example.com" /></label>
            <label>Interest
              <select name="interestKey">
                ${INTEREST_OPTIONS.filter(([value]) => value !== "all").map(([value, label]) => `<option value="${value}">${escapeHTML(label)}</option>`).join("")}
              </select>
            </label>
            <label>Source
              <select name="source">
                <option>Website form</option>
                <option>LINE</option>
                <option>Referral</option>
                <option>Google search</option>
                <option>Phone call</option>
              </select>
            </label>
          </div>
          <label style="margin-top:14px;">Preferred contact time<input name="preferredContact" placeholder="Weekday afternoon" /></label>
          <label style="margin-top:14px;">Submitted message<textarea name="message" placeholder="What the customer asked for"></textarea></label>
          <label class="checkbox" style="margin-top:14px;"><input name="consent" type="checkbox" required /> PDPA consent was given for insurance advice and quotation</label>
        </div>
        <div class="modal-actions">
          <button class="ghost-button" type="button" data-action="close-modal">Cancel</button>
          <button class="primary-button" type="submit">Create lead</button>
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
    interestLabel: interestLabel(clean(data.get("interestKey"), 40)),
    source: clean(data.get("source"), 60),
    message: clean(data.get("message"), 2000),
    consent: data.get("consent") === "on"
  };
  if (!body.phone && !body.lineId && !body.email) {
    toast("Enter at least one contact channel.", "error");
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
    toast("Lead created.");
  });
}

async function changeLeadStatus(id, statusValue) {
  if (!canWrite() || state.pending) return;
  await withPending(`status-${id}`, async () => {
    await apiFetch(`leads/${encodeURIComponent(id)}/status`, { method: "PUT", body: { status: statusValue } });
    await refresh(["leads", "tasks", "audit"]);
    toast("Status updated.");
  });
}

async function addLeadNote(id) {
  if (!canWrite() || state.pending) return;
  const input = screen.querySelector(`[data-note="${cssEscape(id)}"]`);
  const note = clean(input && input.value, 2000);
  if (!note) {
    toast("Write a note before adding it.", "error");
    return;
  }
  await withPending(`note-${id}`, async () => {
    await apiFetch(`leads/${encodeURIComponent(id)}/notes`, { method: "POST", body: { note } });
    if (input) input.value = "";
    await refresh(["leads", "audit"]);
    toast("Interaction logged.");
  });
}

async function saveLeadFollowup(id) {
  if (!canWrite() || state.pending) return;
  const input = screen.querySelector(`[data-followup="${cssEscape(id)}"]`);
  const followUpAt = input ? input.value || null : null;
  await withPending(`followup-${id}`, async () => {
    await apiFetch(`leads/${encodeURIComponent(id)}`, { method: "PATCH", body: { followUpAt } });
    await refresh(["leads", "tasks", "audit"]);
    toast("Follow-up saved.");
  });
}

async function patchTask(id, completed) {
  if (!canWrite() || state.pending) return;
  await withPending(`task-${id}`, async () => {
    await apiFetch(`tasks/${encodeURIComponent(id)}`, { method: "PATCH", body: { completed } });
    await refresh(["tasks", "audit"]);
    toast(completed ? "Task completed." : "Task reopened.");
  });
}

async function withPending(key, task) {
  state.pending = key;
  renderChrome();
  try {
    await task();
  } catch (error) {
    toast(error.message || "The operation failed.", "error");
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
}

function setModule(moduleId, options = {}) {
  if (isOperationsTab(moduleId)) {
    setOperationsTab(moduleId, options);
    return;
  }
  if (!MODULES.some((item) => item.id === moduleId)) return;
  state.module = moduleId;
  state.recordId = null;
  writeRoute(options);
  render();
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
  const label = text || (errorCount ? "API needs attention" : loading ? "Loading" : "Backend connected");
  return `<span class="pill${errorCount ? " error" : loading ? " warn" : ""}"><span class="dot"></span>${escapeHTML(label)}</span>`;
}

function resourcePill(resource) {
  if (state.errors[resource]) return `<span class="pill error"><span class="dot"></span>API issue</span>`;
  if (state.loading.has(resource)) return `<span class="pill warn"><span class="dot"></span>Loading</span>`;
  if (LIVE_RESOURCES.has(resource)) return `<span class="pill"><span class="dot"></span>Live data</span>`;
  return connectionPill();
}

function errorNotice(resource) {
  const errors = resource
    ? (state.errors[resource] ? [[resource, state.errors[resource]]] : [])
    : Object.entries(state.errors);
  if (!errors.length) return "";
  return `
    <div class="notice error" style="margin-bottom:18px;">
      <strong>API issue</strong>
      <div>${errors.map(([key, message]) => `${escapeHTML(titleCase(key))}: ${escapeHTML(message)}`).join("<br>")}</div>
      <div style="margin-top:12px;"><button class="ghost-button" type="button" data-action="reload">Reload</button></div>
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
          ${label === groups[0][0] ? `<span class="record-count">${count} records</span>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function leadRow(lead) {
  return `
    <tr data-open-lead="${escapeHTML(lead.id)}" tabindex="0" role="button" aria-label="Open ${escapeHTML(lead.name || lead.id)}">
      <td data-label="Lead">${titleMeta(lead.name || "Unnamed lead", `${lead.phone || lead.contact || lead.lineId || "No contact"} · ${lead.source || "Unknown"}`)}</td>
      <td data-label="Status">${status(labelFor(STATUS_OPTIONS, lead.status), lead.status)}</td>
      <td data-label="Interest"><strong>${interestLabel(lead.interestKey)}</strong></td>
      <td data-label="Last interaction"><strong>${relativeTime(lead.updatedAt || lead.createdAt)}</strong></td>
      <td data-label="Next action">${titleMeta(lead.nextAction || nextActionLabel(lead), lead.assigneeName || lead.assigned || "Unassigned")}</td>
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
          `).join("") : emptyRow("No records yet.")}
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
        ? `<button class="ghost-button" type="button" disabled title="This role cannot edit website content">Read-only</button>`
        : `<a class="ghost-button" href="${escapeHTML(href)}" target="_blank" rel="noreferrer">Open</a>`}
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
  if (!items.length) return emptyBlock("No activity yet.");
  return `
    <ul class="timeline">
      ${items.map((item) => `
        <li>
          <strong>${escapeHTML(item.title || "Activity")}</strong>
          <span>${escapeHTML(item.meta || "")}</span>
        </li>
      `).join("")}
    </ul>
  `;
}

function derivedLeadTimeline(lead) {
  return [
    {
      text: "Lead captured",
      at: lead.createdAt,
      by: lead.source || "System"
    },
    {
      text: lead.consent && lead.consent.given ? "Consent captured" : "Consent not captured",
      at: lead.consent && lead.consent.at || lead.createdAt,
      by: lead.consent && lead.consent.method || ""
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
  const rawHash = decodeURIComponent((location.hash || "").replace(/^#/, "")).trim();
  const hash = rawHash.split(/[?&]/)[0];
  const base = {
    module: location.pathname.replace(/\/$/, "") === "/admin/ops" ? "operations" : "home",
    operationsTab: "dashboard"
  };
  if (!hash) return base;
  if (isOperationsTab(hash)) {
    return { module: "operations", operationsTab: hash };
  }
  if (hash === "operations") return { module: "operations", operationsTab: "dashboard" };
  if (MODULES.some((item) => item.id === hash)) {
    return { module: hash, operationsTab: "dashboard" };
  }
  return base;
}

function syncRouteFromLocation() {
  const next = routeStateFromLocation();
  if (next.module === state.module && next.operationsTab === state.operationsTab) return;
  state.module = next.module;
  state.operationsTab = next.operationsTab;
  state.recordId = null;
  render();
}

function routeUrl() {
  if (state.module === "home") return "/admin";
  if (state.module === "operations") {
    return state.operationsTab === "dashboard" ? "/admin#operations" : `/admin#${state.operationsTab}`;
  }
  return `/admin#${state.module}`;
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
  return found ? found[1] : titleCase(String(value || "").replace(/-/g, " "));
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, (char) => char.toUpperCase());
}

function interestLabel(value) {
  const found = INTEREST_OPTIONS.find(([id]) => id === value);
  return found ? found[1] : titleCase(value || "unsure");
}

function normalizeRole(value) {
  const role = slug(value);
  if (["owner", "admin", "administrator"].includes(role)) return "owner";
  if (["adviser", "advisor"].includes(role)) return "advisor";
  if (["ops", "operations"].includes(role)) return "ops";
  if (["readonly", "read-only", "read"].includes(role)) return "readonly";
  return "owner";
}

function displayRole(role) {
  const map = {
    owner: "Owner / Administrator",
    admin: "Owner / Administrator",
    advisor: "Adviser",
    ops: "Operations",
    readonly: "Read-only"
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
  if (!ms) return "Unknown";
  const delta = Math.max(0, Date.now() - ms);
  const hours = Math.floor(delta / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 35) return `${Math.floor(days / 7)} weeks ago`;
  return formatDate(ms);
}

function formatDue(value) {
  const ms = timestampMs(value);
  if (!ms) return "-";
  if (sameDay(ms, new Date())) {
    return `Today ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(ms)}`;
  }
  return formatDate(value);
}

function formatDate(value) {
  const ms = timestampMs(value);
  if (!ms) return "-";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(ms);
}

function formatDateTime(value) {
  const ms = timestampMs(value);
  if (!ms) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(ms);
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
    new: "Arrived but no outbound contact has happened.",
    contacting: "A first contact attempt is underway.",
    contacted: "Customer has replied or spoken with CoverMate.",
    consultation: "Advice session is booked or completed.",
    quotation: "A comparison or proposal is being prepared or sent.",
    considering: "Customer is deciding after receiving options.",
    converted: "Policy record exists.",
    later: "Customer asked to pause until a future date.",
    notinterested: "Customer declined for now.",
    lost: "Closed without a policy."
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
  if (lead.followUpAt) return `Follow up ${formatDate(lead.followUpAt)}`;
  if (["new", "contacting"].includes(lead.status)) return "First contact";
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
