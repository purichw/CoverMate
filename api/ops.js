const crypto = require("node:crypto");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { fetchWithTimeout, reportFailure, readBody } = require('../server/http.cjs');

const { PROJECT_ID, FIRESTORE_ROOT, IDENTITY_ROOT } = require('../server/firebase-rest.cjs');

const MAX_LIMIT = 200;
const STATUSES = new Set(["new", "contacting", "contacted", "consultation", "quotation", "considering", "converted", "later", "notinterested", "lost"]);
const INTERESTS = new Set(["motor", "life", "health", "accident", "savings", "unsure"]);
const PLANNED_RESOURCES = new Set(["customers", "consultations", "quotes", "policies", "renewals", "documents", "insurers"]);

const ROLE_ALIASES = {
  admin: "owner",
  administrator: "owner",
  owner: "owner",
  adviser: "advisor",
  advisor: "advisor",
  ops: "ops",
  operations: "ops",
  readonly: "readonly",
  "read-only": "readonly",
  read: "readonly"
};

const PERMISSIONS = {
  view_records: new Set(["owner", "advisor", "ops", "readonly"]),
  edit_records: new Set(["owner", "advisor", "ops"]),
  change_status: new Set(["owner", "advisor", "ops"]),
  view_id_documents: new Set(["owner", "advisor"])
};

let environmentModulePromise = null;

module.exports = async function opsApi(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  try {
    const method = String(req.method || "GET").toUpperCase();
    const path = requestPath(req);
    const environment = await resolveRequestEnvironment(req);
    const actor = await authorize(req, "view_records", environment);
    actor.environment = environment;

    if (["cases", "notifications", "notification-preferences", "notification-capabilities", "notification-test-email"].includes(path[0])) {
      return send(res, method === "POST" && path[0] === "cases" ? 201 : 200, await require('../server/cases-service.cjs').handle(req, actor, path));
    }

    if (method === "GET" && path[0] === "leads" && path.length === 1) {
      return send(res, 200, await listLeads(req, actor));
    }
    if (method === "POST" && path[0] === "leads" && path.length === 1) {
      requirePermission(actor, "edit_records");
      return send(res, 201, await createLead(req, actor));
    }
    if (method === "GET" && path[0] === "leads" && path[1]) {
      const lead = await getLead(path[1], actor);
      if (!lead) return send(res, 404, { error: "not_found", message: "Lead not found." });
      return send(res, 200, lead);
    }
    if (method === "PATCH" && path[0] === "leads" && path[1] && path.length === 2) {
      requirePermission(actor, "edit_records");
      return send(res, 200, await patchLead(path[1], req, actor));
    }
    if (method === "PUT" && path[0] === "leads" && path[1] && path[2] === "status") {
      requirePermission(actor, "change_status");
      return send(res, 200, await updateLeadStatus(path[1], req, actor));
    }
    if (method === "POST" && path[0] === "leads" && path[1] && path[2] === "notes") {
      requirePermission(actor, "edit_records");
      return send(res, 201, await addLeadNote(path[1], req, actor));
    }
    if (method === "GET" && path[0] === "tasks" && path.length === 1) {
      return send(res, 200, await listTasks(req, actor));
    }
    if (method === "PATCH" && path[0] === "tasks" && path[1] && path.length === 2) {
      requirePermission(actor, "edit_records");
      return send(res, 200, await patchTask(path[1], req, actor));
    }
    if (method === "GET" && path[0] === "audit" && path.length === 1) {
      return send(res, 200, await listAudit(req, actor));
    }
    if (method === "GET" && PLANNED_RESOURCES.has(path[0])) {
      return send(res, 200, plannedResource(path[0]));
    }

    return send(res, 404, { error: "not_found", message: "Unknown operations endpoint." });
  } catch (error) {
    const status = Number(error.status || 500);
    if (status >= 500) reportFailure('ops', error);
    return send(res, status, {
      error: error.code || (status === 500 ? "server_error" : "request_error"),
      code: error.code || "server_error",
      message: status === 500 ? "Operations API failed." : error.message,
      field: error.field,
      fieldErrors: error.fieldErrors,
      requiredPermission: error.requiredPermission
    });
  }
};

function requestPath(req) {
  const url = new URL(req.url || "/", "https://covermate.local");
  const explicit = url.searchParams.get("path");
  const raw = explicit || url.pathname.replace(/^\/api\/ops\/?/, "");
  return raw.split("/").filter(Boolean).map(decodeURIComponent);
}

async function resolveRequestEnvironment(req) {
  const { resolveCoverMateEnvironment } = await loadEnvironmentModule();
  return resolveCoverMateEnvironment({
    url: req.url || "/",
    headers: req.headers || {},
    vercelEnv: process.env.VERCEL_ENV || ""
  });
}

function loadEnvironmentModule() {
  if (!environmentModulePromise) {
    environmentModulePromise = import(pathToFileURL(path.join(__dirname, "..", "covermate-environment.mjs")).href);
  }
  return environmentModulePromise;
}

function leadCollectionFor(actor) {
  return actor && actor.environment && actor.environment.leadCollection || "contactLeads";
}

function firestoreSource(actor) {
  return actor && actor.environment && actor.environment.isUat ? "firestore-uat" : "firestore";
}

function environmentName(actor) {
  return actor && actor.environment && actor.environment.name || "production";
}

async function authorize(req, permission, environment) {
  const token = bearerToken(req);
  if (!token) throw httpError(401, "unauthorized", "Missing Firebase ID token.");

  const account = await identityLookup(token);
  const uid = account && account.localId;
  if (!uid) throw httpError(401, "unauthorized", "Firebase ID token is invalid.");

  const adminDoc = await firestoreGet(`admins/${encodeURIComponent(uid)}`, token).catch((error) => {
    if (error.status === 404 || error.status === 403) return null;
    throw error;
  });
  const admin = adminDoc ? docFields(adminDoc) : null;
  if (!admin || admin.active !== true) throw httpError(403, "forbidden", "This account is not on the active CoverMate admin allowlist.", permission);
  if (admin.uatOnly === true && !(environment && environment.isUat)) {
    throw httpError(403, "forbidden", "This UAT-only admin account cannot access production Operations data.", permission);
  }

  const actor = {
    uid,
    email: account.email || "",
    emailVerified: account.emailVerified === true,
    name: stringValue(admin.name) || account.displayName || account.email || "CoverMate admin",
    role: normalizeRole(admin.role),
    token,
    uatOnly: admin.uatOnly === true
  };
  requirePermission(actor, permission);
  return actor;
}

function requirePermission(actor, permission) {
  const allowed = PERMISSIONS[permission];
  if (!allowed || !allowed.has(actor.role)) {
    throw httpError(403, "forbidden", "This role cannot perform the requested operation.", permission);
  }
}

function bearerToken(req) {
  const header = req.headers && (req.headers.authorization || req.headers.Authorization);
  const match = String(header || "").match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

async function identityLookup(token) {
  const response = await fetchWithTimeout(IDENTITY_ROOT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw httpError(401, "unauthorized", payload.error && payload.error.message || "Firebase ID token could not be verified.");
  return Array.isArray(payload.users) ? payload.users[0] : null;
}

async function listLeads(req, actor) {
  const url = new URL(req.url || "/", "https://covermate.local");
  const limit = clampLimit(url.searchParams.get("limit"));
  const leads = await readLeads(actor, limit);
  const status = url.searchParams.get("status");
  const interest = url.searchParams.get("interest");
  const q = clean(url.searchParams.get("q"), 120).toLowerCase();
  let rows = leads;
  if (status && status !== "all") rows = rows.filter((lead) => lead.status === normalizeStatus(status));
  if (interest && interest !== "all") rows = rows.filter((lead) => lead.interestKey === normalizeInterest(interest));
  if (q) rows = rows.filter((lead) => JSON.stringify(lead).toLowerCase().includes(q));
  return { rows, total: rows.length, source: firestoreSource(actor), environment: environmentName(actor) };
}

async function getLead(id, actor) {
  const doc = await firestoreGet(`${leadCollectionFor(actor)}/${encodeURIComponent(id)}`, actor.token).catch((error) => {
    if (error.status === 404) return null;
    throw error;
  });
  return doc ? normalizeLead(doc) : null;
}

async function createLead(req, actor) {
  const body = await readJson(req);
  const name = clean(body.name, 120);
  const phone = clean(body.phone, 80);
  const lineId = clean(body.lineId, 80);
  const email = clean(body.email, 160);
  const contact = phone || lineId || email;
  const interestKey = normalizeInterest(body.interestKey || body.coverage || "unsure");
  const message = clean(body.message || body.topic || "", 2000);
  const now = new Date().toISOString();
  const id = randomDocId();
  const displayId = `CL-${id.slice(0, 7).toUpperCase()}`;

  if (!name) throw validationError("name", "Name is required.");
  if (!contact) throw validationError("phone", "At least one contact channel is required.");
  if (body.consent !== true) throw validationError("consent", "PDPA consent is required.");

  const writes = [
    {
      update: {
        name: docName(`${leadCollectionFor(actor)}/${id}`),
        fields: toFields({
          name,
          contact,
          topic: message,
          qtype: "general",
          coverage: interestKey,
          consent: true,
          language: "th",
          summary: clean(message || `${name} requested ${interestLabel(interestKey)} advice.`, 1200),
          sourcePath: "/admin/ops",
          status: "new",
          read: false
        })
      },
      currentDocument: { exists: false },
      updateTransforms: [
        { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
        { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }
      ]
    }
  ];

  const audit = auditEntry("Lead", `Lead ${displayId} - ${name}`, "", "Created", actor, now);
  const timeline = [timelineEntry("created", "Lead created", "", actor, now)];
  const ops = {
    displayId,
    phone,
    lineId,
    email,
    preferredContact: clean(body.preferredContact, 120),
    source: clean(body.source, 60) || "Operations",
    interestKey,
    interestLabel: clean(body.interestLabel, 120) || interestLabel(interestKey),
    assigneeId: actor.uid,
    assigneeName: actor.name,
    followUpAt: "",
    tasks: {
      firstContact: {
        title: `First contact - ${name}`,
        dueAt: now,
        priority: "High",
        completedAt: "",
        updatedAt: now
      }
    },
    audit: [audit]
  };

  Object.assign(writes[0].update.fields, toFields({ ops, timeline }));
  await firestoreCommit(actor.token, writes);

  const lead = await getLead(id, actor);
  return { lead, taskId: `${id}:firstContact`, audit };
}

async function patchLead(id, req, actor) {
  const body = await readJson(req);
  const doc = await requireLeadDoc(id, actor);
  checkClientRevision(req, doc);
  const data = docFields(doc);
  const ops = objectValue(data.ops);
  const now = new Date().toISOString();
  const updates = {};
  const auditItems = [];

  if (Object.prototype.hasOwnProperty.call(body, "followUpAt")) {
    const previous = clean(ops.followUpAt, 40);
    const next = clean(body.followUpAt, 40);
    ops.followUpAt = next;
    ops.tasks = objectValue(ops.tasks);
    ops.tasks.followUp = {
      ...(objectValue(ops.tasks.followUp)),
      title: `Follow up - ${clean(data.name, 120) || id}`,
      dueAt: next,
      priority: "Medium",
      updatedAt: now
    };
    auditItems.push(auditEntry("Follow-up", `Lead ${displayIdFor(id, ops)} - ${clean(data.name, 120)}`, previous, next || "Cleared", actor, now));
  }

  if (Object.prototype.hasOwnProperty.call(body, "assigneeId")) {
    const previous = clean(ops.assigneeId, 120);
    const next = clean(body.assigneeId, 120);
    ops.assigneeId = next;
    auditItems.push(auditEntry("Assign", `Lead ${displayIdFor(id, ops)} - ${clean(data.name, 120)}`, previous, next || "Unassigned", actor, now));
  }

  if (!auditItems.length) throw validationError("body", "Send one supported field to update.");
  ops.audit = auditItems.concat(arrayValue(ops.audit)).slice(0, 120);
  updates.ops = ops;
  updates.timeline = auditItems.map((entry) => timelineEntry("status", entry.kind, `${entry.from} -> ${entry.to}`, actor, now)).concat(arrayValue(data.timeline)).slice(0, 120);
  await updateLeadDocument(id, actor, updates, doc.updateTime);
  return { audit: auditItems[0], lead: await getLead(id, actor) };
}

async function updateLeadStatus(id, req, actor) {
  const body = await readJson(req);
  const next = normalizeStatus(body.status);
  if (!STATUSES.has(next)) throw validationError("status", "Unknown lead status.");

  const doc = await requireLeadDoc(id, actor);
  checkClientRevision(req, doc);
  const data = docFields(doc);
  const previous = normalizeStatus(data.status);
  const ops = objectValue(data.ops);
  if (previous === next) return { audit: null, lead: normalizeLead(doc) };

  const now = new Date().toISOString();
  const audit = auditEntry("Status", `Lead ${displayIdFor(id, ops)} - ${clean(data.name, 120)}`, statusLabel(previous), statusLabel(next), actor, now);
  ops.audit = [audit].concat(arrayValue(ops.audit)).slice(0, 120);

  await updateLeadDocument(id, actor, {
    status: next,
    read: next !== "new",
    ops,
    timeline: [timelineEntry("status", "Status changed", `${statusLabel(previous)} -> ${statusLabel(next)}`, actor, now)].concat(arrayValue(data.timeline)).slice(0, 120)
  }, doc.updateTime);

  return { audit, lead: await getLead(id, actor) };
}

async function addLeadNote(id, req, actor) {
  const body = await readJson(req);
  const note = clean(body.note, 2000);
  if (!note) throw validationError("note", "Note is required.");

  const doc = await requireLeadDoc(id, actor);
  checkClientRevision(req, doc);
  const data = docFields(doc);
  const ops = objectValue(data.ops);
  const now = new Date().toISOString();
  const audit = auditEntry("Note", `Lead ${displayIdFor(id, ops)} - ${clean(data.name, 120)}`, "", `${note.length} chars`, actor, now);
  ops.audit = [audit].concat(arrayValue(ops.audit)).slice(0, 120);

  await updateLeadDocument(id, actor, {
    ops,
    timeline: [timelineEntry("note", "Internal note", note, actor, now)].concat(arrayValue(data.timeline)).slice(0, 120)
  }, doc.updateTime);

  return { audit, lead: await getLead(id, actor) };
}

async function listTasks(req, actor) {
  const leads = await readLeads(actor, MAX_LIMIT);
  const url = new URL(req.url || "/", "https://covermate.local");
  const bucket = clean(url.searchParams.get("bucket"), 40);
  let rows = leads.flatMap(tasksForLead);
  if (bucket && bucket !== "all") rows = rows.filter((task) => task.bucket === bucket);
  rows.sort((a, b) => timestampMs(a.dueAt) - timestampMs(b.dueAt));
  return { rows, total: rows.length, source: firestoreSource(actor), environment: environmentName(actor) };
}

async function patchTask(taskId, req, actor) {
  const body = await readJson(req);
  if (typeof body.completed !== "boolean") throw validationError("completed", "completed must be a boolean.");
  const parsed = parseTaskId(taskId);
  if (!parsed) throw validationError("id", "Unknown task id.");

  const doc = await requireLeadDoc(parsed.leadId, actor);
  checkClientRevision(req, doc);
  const data = docFields(doc);
  const ops = objectValue(data.ops);
  ops.tasks = objectValue(ops.tasks);
  const task = {
    ...objectValue(ops.tasks[parsed.kind]),
    completedAt: body.completed ? new Date().toISOString() : "",
    updatedAt: new Date().toISOString()
  };
  ops.tasks[parsed.kind] = task;
  const audit = auditEntry("Task", `Task ${taskId}`, body.completed ? "Open" : "Completed", body.completed ? "Completed" : "Open", actor, task.updatedAt);
  ops.audit = [audit].concat(arrayValue(ops.audit)).slice(0, 120);
  await updateLeadDocument(parsed.leadId, actor, {
    ops,
    timeline: [timelineEntry("note", body.completed ? "Task completed" : "Task reopened", task.title || taskId, actor, task.updatedAt)].concat(arrayValue(data.timeline)).slice(0, 120)
  }, doc.updateTime);
  return { audit, taskId };
}

async function listAudit(req, actor) {
  const leads = await readLeads(actor, MAX_LIMIT);
  const rows = leads
    .flatMap((lead) => arrayValue(lead.audit || lead.ops && lead.ops.audit).map((entry) => ({ ...entry, leadId: lead.id })))
    .sort((a, b) => timestampMs(b.at) - timestampMs(a.at))
    .slice(0, clampLimit(new URL(req.url || "/", "https://covermate.local").searchParams.get("limit")));
  return { rows, total: rows.length, source: firestoreSource(actor), environment: environmentName(actor) };
}

async function readLeads(actor, limit = MAX_LIMIT) {
  const payload = await firestoreRunQuery(actor.token, {
    structuredQuery: {
      from: [{ collectionId: leadCollectionFor(actor) }],
      orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      limit: clampLimit(limit)
    }
  });
  return payload
    .map((item) => item.document)
    .filter(Boolean)
    .map(normalizeLead);
}

async function requireLeadDoc(id, actor) {
  const doc = await firestoreGet(`${leadCollectionFor(actor)}/${encodeURIComponent(id)}`, actor.token).catch((error) => {
    if (error.status === 404) throw httpError(404, "not_found", "Lead not found.");
    throw error;
  });
  if (!doc) throw httpError(404, "not_found", "Lead not found.");
  return doc;
}

async function updateLeadDocument(id, actor, data, expectedUpdateTime) {
  const payload = {
    writes: [
      {
        update: {
          name: docName(`${leadCollectionFor(actor)}/${id}`),
          fields: toFields(data)
        },
        updateMask: { fieldPaths: Object.keys(data) },
        currentDocument: expectedUpdateTime ? { updateTime: expectedUpdateTime } : { exists: true },
        updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }]
      }
    ]
  };
  await firestoreCommit(actor.token, payload.writes);
}

async function firestoreGet(path, token) {
  const response = await fetchWithTimeout(`${FIRESTORE_ROOT}/${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw httpError(response.status, "firestore_error", payload.error && payload.error.message || "Firestore read failed.");
  return payload;
}

async function firestoreRunQuery(token, query) {
  const response = await fetchWithTimeout(`${FIRESTORE_ROOT}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(query)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw httpError(response.status, "firestore_error", payload.error && payload.error.message || "Firestore query failed.");
  return Array.isArray(payload) ? payload : [];
}

async function firestoreCommit(token, writes) {
  const response = await fetchWithTimeout(`${FIRESTORE_ROOT}:commit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ writes })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok && ['FAILED_PRECONDITION', 'ABORTED'].includes(payload.error && payload.error.status)) throw httpError(409, 'edit_conflict', 'This record changed in another session. Refresh it before trying again.');
  if (!response.ok) throw httpError(response.status, "firestore_error", payload.error && payload.error.message || "Firestore write failed.");
  return payload;
}

function normalizeLead(doc) {
  const id = doc.name ? doc.name.split("/").pop() : "";
  const data = docFields(doc);
  const ops = objectValue(data.ops);
  const displayId = displayIdFor(id, ops);
  const contact = clean(data.contact, 160);
  const phone = clean(ops.phone, 80) || (/^0/.test(contact) ? contact : "");
  const lineId = clean(ops.lineId, 80) || (!phone && contact && !/@/.test(contact) ? contact : "");
  const email = clean(ops.email, 160) || (/@/.test(contact) ? contact : "");
  const status = normalizeStatus(data.status);
  const interestKey = normalizeInterest(ops.interestKey || data.coverage || data.qtype);
  const source = clean(ops.source, 80) || sourceLabel(data.sourcePath);
  const audit = arrayValue(ops.audit);
  return {
    id,
    revision: doc.updateTime,
    displayId,
    name: clean(data.name, 120) || "Unnamed lead",
    phone,
    lineId,
    email,
    contact,
    source,
    sourcePath: clean(data.sourcePath, 220),
    interestKey,
    interestLabel: clean(ops.interestLabel, 120) || interestLabel(interestKey),
    status,
    message: clean(data.topic || data.summary, 2000),
    preferredContact: clean(ops.preferredContact, 120),
    assigneeId: clean(ops.assigneeId, 160),
    assigneeName: clean(ops.assigneeName, 160),
    followUpAt: clean(ops.followUpAt, 40),
    consent: {
      given: data.consent === true,
      method: objectValue(ops.consent).method || "public form checkbox",
      at: objectValue(ops.consent).at || timestampIso(data.createdAt),
      source: objectValue(ops.consent).source || clean(data.sourcePath, 220),
      purpose: objectValue(ops.consent).purpose || "Insurance advice and quotation"
    },
    timeline: arrayValue(data.timeline),
    audit,
    ops,
    read: data.read === true,
    createdAt: timestampIso(data.createdAt),
    updatedAt: timestampIso(data.updatedAt),
    nextAction: status === "new" ? "First contact" : ops.followUpAt ? `Follow up ${ops.followUpAt}` : "",
    ...(data.caseRecord ? {
      canonicalCase: true,
      displayId: data.caseRecord.caseNumber,
      name: data.caseRecord.contact.name,
      phone: data.caseRecord.contact.phone || "",
      lineId: data.caseRecord.contact.lineId || "",
      email: data.caseRecord.contact.email || "",
      contact: data.caseRecord.contact.rawContact || data.caseRecord.contact.phone || data.caseRecord.contact.lineId || data.caseRecord.contact.email || "",
      source: data.caseRecord.source === "manual" ? "Manual" : "Website",
      status: data.caseRecord.status,
      interestKey: data.caseRecord.interestType,
      interestLabel: interestLabel(data.caseRecord.interestType),
      followUpAt: data.caseRecord.followUp?.dueAt || "",
      createdAt: data.caseRecord.submittedAt,
      updatedAt: data.caseRecord.updatedAt,
      message: data.caseRecord.originalSubmission?.message || "",
      consent: { given: Boolean(data.caseRecord.privacyReceipt), at: data.caseRecord.privacyReceipt?.acceptedAt || "", method: data.caseRecord.privacyReceipt ? "Verified website notice" : "Unavailable", purpose: data.caseRecord.privacyReceipt?.noticeText || "" },
      nextAction: ""
    } : {})
  };
}

function tasksForLead(lead) {
  if (lead.canonicalCase) return [];
  const tasks = [];
  const opsTasks = objectValue(lead.ops && lead.ops.tasks);
  const first = objectValue(opsTasks.firstContact);
  if (["new", "contacting"].includes(lead.status)) {
    tasks.push(taskFromLead(lead, "firstContact", {
      title: first.title || `First contact - ${lead.name}`,
      dueAt: first.dueAt || lead.followUpAt || lead.createdAt,
      priority: first.priority || "High",
      completedAt: first.completedAt || ""
    }));
  }
  if (lead.followUpAt) {
    const follow = objectValue(opsTasks.followUp);
    tasks.push(taskFromLead(lead, "followUp", {
      title: follow.title || `Follow up - ${lead.name}`,
      dueAt: follow.dueAt || lead.followUpAt,
      priority: follow.priority || "Medium",
      completedAt: follow.completedAt || ""
    }));
  }
  return tasks.filter((task) => task.dueAt);
}

function taskFromLead(lead, kind, input) {
  const completed = Boolean(input.completedAt);
  const due = timestampMs(input.dueAt);
  return {
    id: `${lead.id}:${kind}`,
    leadId: lead.id,
    revision: lead.revision,
    kind,
    title: input.title,
    dueAt: timestampIso(input.dueAt),
    priority: input.priority,
    relatedLabel: `Lead ${lead.displayId}`,
    assigneeName: lead.assigneeName,
    completed,
    completedAt: input.completedAt || "",
    bucket: completed ? "completed" : due && due < Date.now() ? "overdue" : sameDay(due, new Date()) ? "today" : "upcoming"
  };
}

function parseTaskId(taskId) {
  const decoded = decodeURIComponent(String(taskId || ""));
  const index = decoded.lastIndexOf(":");
  if (index < 1) return null;
  const leadId = decoded.slice(0, index);
  const kind = decoded.slice(index + 1);
  if (!["firstContact", "followUp"].includes(kind)) return null;
  return { leadId, kind };
}

async function readJson(req) {
  return readBody(req);
}

function checkClientRevision(req, doc) {
  const expected = req.headers['if-match'];
  if (expected && expected !== doc.updateTime) throw httpError(409, 'edit_conflict', 'This record changed in another session. Your input is unchanged; refresh the record before retrying.');
}

function send(res, status, payload) {
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}

function plannedResource(resource) {
  const labels = {
    customers: "Customer 360 records",
    consultations: "Consultation records",
    quotes: "Quote records",
    policies: "Policy records",
    renewals: "Renewal workflows",
    documents: "Document library",
    insurers: "Insurer/product catalogue"
  };
  return {
    rows: [],
    total: 0,
    source: "not_wired",
    status: "planned",
    resource,
    label: labels[resource] || resource,
    message: `${labels[resource] || resource} are not wired to a production Operations API endpoint yet.`
  };
}

function httpError(status, code, message, requiredPermission) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.requiredPermission = requiredPermission;
  return error;
}

function validationError(field, message) {
  const error = httpError(422, "validation_failed", message);
  error.field = field;
  return error;
}

function randomDocId() {
  return crypto.randomBytes(15).toString("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
}

function docName(path) {
  return `projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
}

function docFields(doc) {
  return fromFields(doc && doc.fields || {});
}

function toFields(input) {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, toValue(value)]));
}

function fromFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, fromValue(value)]));
}

function toValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  if (typeof value === "object") return { mapValue: { fields: toFields(value) } };
  return { stringValue: String(value) };
}

function fromValue(value) {
  if (!value || typeof value !== "object") return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromValue);
  if ("mapValue" in value) return fromFields(value.mapValue.fields || {});
  return null;
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}

function clean(value, max = 600) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeRole(value) {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return Object.hasOwn(ROLE_ALIASES, key) ? ROLE_ALIASES[key] : "none";
}

function normalizeStatus(value) {
  const status = clean(value, 40).toLowerCase().replace(/[^a-z]/g, "");
  return STATUSES.has(status) ? status : "new";
}

function normalizeInterest(value) {
  const interest = clean(value, 40).toLowerCase().replace(/[^a-z]/g, "");
  return INTERESTS.has(interest) ? interest : "unsure";
}

function interestLabel(value) {
  return {
    motor: "Motor",
    life: "Life",
    health: "Health",
    accident: "Accident",
    savings: "Savings",
    unsure: "Unsure"
  }[normalizeInterest(value)] || "Unsure";
}

function statusLabel(value) {
  return {
    new: "New",
    contacting: "Contacting",
    contacted: "Contacted",
    consultation: "Consultation",
    quotation: "Quotation",
    considering: "Considering",
    converted: "Converted",
    later: "Follow-up later",
    notinterested: "Not interested",
    lost: "Lost"
  }[normalizeStatus(value)] || "New";
}

function sourceLabel(path) {
  const value = clean(path, 220);
  if (/line/i.test(value)) return "LINE";
  if (/referral/i.test(value)) return "Referral";
  if (/google/i.test(value)) return "Google search";
  if (value === "/admin/ops") return "Operations";
  return "Website form";
}

function displayIdFor(id, ops) {
  return clean(ops && ops.displayId, 40) || `CL-${String(id || "").slice(0, 7).toUpperCase()}`;
}

function auditEntry(kind, subject, from, to, actor, at) {
  return {
    id: `aud-${crypto.randomUUID()}`,
    kind,
    subject,
    from,
    to,
    actorId: actor.uid,
    actorName: actor.name,
    at
  };
}

function timelineEntry(kind, text, note, actor, at) {
  return {
    id: `evt-${crypto.randomUUID()}`,
    kind,
    text,
    note,
    at,
    by: actor.name
  };
}

function timestampIso(value) {
  const ms = timestampMs(value);
  return ms ? new Date(ms).toISOString() : "";
}

function timestampMs(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

function sameDay(value, date) {
  const ms = timestampMs(value);
  if (!ms) return false;
  const item = new Date(ms);
  return item.getFullYear() === date.getFullYear() && item.getMonth() === date.getMonth() && item.getDate() === date.getDate();
}

function clampLimit(value) {
  const limit = Number(value) || 50;
  return Math.max(1, Math.min(MAX_LIMIT, limit));
}
