import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let playwright;

try {
  playwright = require("playwright");
} catch {
  playwright = require(
    "/Users/point/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
  );
}

const { chromium } = playwright;
const baseUrl = process.env.COVERMATE_URL || "http://localhost:4177";
const outDir = process.env.COVERMATE_OPS_QA_DIR || "/tmp/covermate-ops-qa";

const firebaseMock = `
  const session = () => JSON.parse(window.localStorage.getItem("covermate-admin-session") || "null");
  const user = {
    uid: "smoke-admin",
    email: "purich@example.com",
    displayName: "Purich N.",
    getIdToken: async () => "ops-regression-token"
  };
  window.CoverMateFirebase = {
    auth: { currentUser: user },
    waitForAuth: async () => user,
    syncSessionFromCurrentUser: async () => ({ ok: true, user, session: session() }),
    signOut: async () => {}
  };
  window.dispatchEvent(new CustomEvent("covermate-firebase-ready"));
  export {};
`;

const apiState = {
  leads: [
    {
      id: "lead-a",
      displayId: "CL-LEADA",
      name: "Live Lead A",
      phone: "080-111-2222",
      lineId: "live-a",
      email: "",
      contact: "080-111-2222",
      source: "Website form",
      interestKey: "motor",
      interestLabel: "Motor",
      status: "new",
      message: "Need motor comparison from contactLeads.",
      preferredContact: "Anytime",
      assigneeName: "Purich N.",
      consent: {
        given: true,
        method: "public form checkbox",
        at: "2026-08-10T08:00:00.000Z",
        source: "/contact",
        purpose: "Insurance advice and quotation"
      },
      timeline: [
        { id: "evt-a", kind: "created", text: "Lead captured", note: "", at: "2026-08-10T08:00:00.000Z", by: "System" }
      ],
      createdAt: "2026-08-10T08:00:00.000Z",
      updatedAt: "2026-08-10T08:00:00.000Z"
    },
    {
      id: "lead-b",
      displayId: "CL-LEADB",
      name: "Live Lead B",
      phone: "",
      lineId: "line-live-b",
      email: "",
      contact: "line-live-b",
      source: "LINE",
      interestKey: "health",
      interestLabel: "Health",
      status: "consultation",
      message: "Health review follow up.",
      assigneeName: "Purich N.",
      consent: {
        given: true,
        method: "public form checkbox",
        at: "2026-08-09T08:00:00.000Z",
        source: "/",
        purpose: "Insurance advice and quotation"
      },
      timeline: [],
      createdAt: "2026-08-09T08:00:00.000Z",
      updatedAt: "2026-08-09T08:00:00.000Z"
    }
  ],
  tasks: [
    {
      id: "lead-a:firstContact",
      leadId: "lead-a",
      kind: "firstContact",
      title: "First contact - Live Lead A",
      dueAt: "2026-08-10T10:00:00.000Z",
      priority: "High",
      relatedLabel: "Lead CL-LEADA",
      assigneeName: "Purich N.",
      completed: false,
      bucket: "today"
    }
  ],
  audit: [
    {
      id: "aud-a",
      kind: "Lead",
      subject: "Lead CL-LEADA - Live Lead A",
      from: "",
      to: "Created",
      actorName: "System",
      at: "2026-08-10T08:00:00.000Z"
    }
  ]
};

function json(rows, meta = {}) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(Array.isArray(rows) ? { rows, total: rows.length, source: meta.source || "mock-api", ...meta } : rows)
  };
}

function planned(resource) {
  return json([], {
    source: "not_wired",
    status: "planned",
    resource,
    label: `${resource} records`,
    message: `${resource} records are not wired to a production Operations API endpoint yet.`
  });
}

async function fulfillApi(route) {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace(/^\/api\/ops\/?/, "").split("/").filter(Boolean);
  const method = request.method();

  if (method === "GET" && path[0] === "leads" && path.length === 1) return route.fulfill(json(apiState.leads));
  if (method === "GET" && path[0] === "tasks" && path.length === 1) return route.fulfill(json(apiState.tasks));
  if (method === "GET" && path[0] === "audit" && path.length === 1) return route.fulfill(json(apiState.audit));
  if (method === "GET" && ["customers", "consultations", "quotes", "policies", "renewals", "documents", "insurers"].includes(path[0])) {
    return route.fulfill(planned(path[0]));
  }
  if (method === "POST" && path[0] === "leads" && path.length === 1) {
    const input = request.postDataJSON();
    const lead = {
      id: "lead-created",
      displayId: "CL-CREATED",
      name: input.name,
      phone: input.phone,
      lineId: input.lineId || "",
      email: input.email || "",
      contact: input.phone || input.lineId || input.email,
      source: input.source,
      interestKey: input.interestKey,
      interestLabel: "Motor",
      status: "new",
      message: input.message,
      preferredContact: input.preferredContact || "",
      assigneeName: "Purich N.",
      consent: { given: true, method: "manual", at: "2026-08-11T02:00:00.000Z", source: "/admin/ops", purpose: "Insurance advice and quotation" },
      timeline: [{ id: "evt-created", kind: "created", text: "Lead created", note: "", at: "2026-08-11T02:00:00.000Z", by: "Purich N." }],
      createdAt: "2026-08-11T02:00:00.000Z",
      updatedAt: "2026-08-11T02:00:00.000Z"
    };
    apiState.leads.unshift(lead);
    apiState.tasks.unshift({
      id: "lead-created:firstContact",
      leadId: "lead-created",
      kind: "firstContact",
      title: `First contact - ${input.name}`,
      dueAt: "2026-08-11T02:00:00.000Z",
      priority: "High",
      relatedLabel: "Lead CL-CREATED",
      assigneeName: "Purich N.",
      completed: false,
      bucket: "today"
    });
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ lead, taskId: "lead-created:firstContact", audit: { id: "aud-created", kind: "Lead", subject: "Lead CL-CREATED", to: "Created", actorName: "Purich N.", at: "2026-08-11T02:00:00.000Z" } })
    });
  }
  if (method === "PUT" && path[0] === "leads" && path[2] === "status") {
    const input = request.postDataJSON();
    const lead = apiState.leads.find((item) => item.id === path[1]);
    if (lead) lead.status = input.status;
    return route.fulfill(json({ audit: { id: "aud-status", kind: "Status", subject: path[1], from: "New", to: input.status, actorName: "Purich N.", at: "2026-08-11T02:10:00.000Z" } }));
  }
  if (method === "PATCH" && path[0] === "tasks") {
    const input = request.postDataJSON();
    const task = apiState.tasks.find((item) => item.id === decodeURIComponent(path[1]));
    if (task) task.completed = input.completed;
    return route.fulfill(json({ audit: { id: "aud-task", kind: "Task", subject: decodeURIComponent(path[1]), from: "Open", to: input.completed ? "Completed" : "Open", actorName: "Purich N.", at: "2026-08-11T02:10:00.000Z" } }));
  }
  return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not_found" }) });
}

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const unauthenticated = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  await unauthenticated.goto(`${baseUrl}/admin/ops/`, { waitUntil: "domcontentloaded" });
  await unauthenticated.waitForURL(/\/admin\/login\/?$/, { timeout: 5000 });
  await unauthenticated.close();

  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  await page.route("**/covermate-firebase.js", async (route) => {
    await route.fulfill({ status: 200, contentType: "text/javascript", body: firebaseMock });
  });
  await page.route("**/api/ops/**", fulfillApi);
  await page.addInitScript(() => {
    window.localStorage.setItem("covermate-admin-session", JSON.stringify({
      firebase: true,
      uid: "smoke-admin",
      email: "purich@example.com",
      name: "Purich N.",
      role: "admin",
      ts: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000
    }));
  });

  await page.goto(`${baseUrl}/admin/ops/`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
  await page.locator("#dataMode", { hasText: "Live: leads/tasks/audit" }).waitFor();
  const bodyText = await page.locator("body").innerText();
  if (/demo/i.test(bodyText)) throw new Error("Operations Portal rendered demo copy.");
  if (!bodyText.includes("Current data boundary") || !bodyText.includes("Planned modules stay labeled")) {
    throw new Error("Dashboard did not disclose the current live/planned data boundary.");
  }
  await page.screenshot({ path: `${outDir}/ops-dashboard-desktop.png`, fullPage: true });

  await page.getByRole("button", { name: /Customers/ }).first().click();
  await page.getByRole("heading", { name: "Customers", exact: true }).waitFor();
  await page.getByText("Not wired yet").first().waitFor();
  const customersText = await page.locator("body").innerText();
  if (!customersText.includes("No fake records are shown here")) {
    throw new Error("Planned customer module did not explain that no fake records are shown.");
  }
  await page.screenshot({ path: `${outDir}/ops-customers-planned-desktop.png`, fullPage: true });

  await page.getByRole("button", { name: /Leads/ }).first().click();
  await page.getByRole("heading", { name: "Leads" }).waitFor();
  await page.getByText("Live Lead A").waitFor();
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByText("1 records").waitFor();
  await page.getByText("Live Lead A").click();
  await page.getByRole("heading", { name: "Live Lead A" }).waitFor();
  await page.getByRole("button", { name: "All leads" }).click();
  await page.getByText("1 records").waitFor();

  await page.getByRole("button", { name: /New lead/ }).click();
  await page.getByLabel("Name").fill("Regression API Lead");
  await page.getByLabel("Phone", { exact: true }).fill("089-999-0000");
  await page.getByLabel("Submitted message").fill("Created by ops portal regression check.");
  await page.getByLabel(/PDPA consent/).check();
  await page.getByRole("button", { name: "Create lead" }).click();
  await page.getByRole("heading", { name: "Regression API Lead" }).waitFor();

  await page.getByRole("button", { name: /Tasks/ }).first().click();
  await page.getByRole("heading", { name: "Tasks and follow-ups" }).waitFor();
  await page.getByText("First contact - Regression API Lead").waitFor();

  await page.getByLabel("Preview role").selectOption("readonly");
  const newLeadDisabled = await page.getByRole("button", { name: /New lead/ }).isDisabled();
  if (!newLeadDisabled) throw new Error("Read-only role did not disable New lead.");

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.route("**/covermate-firebase.js", async (route) => {
    await route.fulfill({ status: 200, contentType: "text/javascript", body: firebaseMock });
  });
  await mobile.route("**/api/ops/**", fulfillApi);
  await mobile.addInitScript(() => {
    window.localStorage.setItem("covermate-admin-session", JSON.stringify({
      firebase: true,
      uid: "smoke-admin",
      email: "purich@example.com",
      name: "Purich N.",
      role: "admin",
      ts: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000
    }));
  });
  await mobile.goto(`${baseUrl}/admin/ops/#leads`, { waitUntil: "networkidle" });
  await mobile.getByRole("heading", { name: "Leads" }).waitFor();
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`Mobile horizontal overflow: ${overflow}px`);
  await mobile.screenshot({ path: `${outDir}/ops-leads-mobile.png`, fullPage: true });

  console.log(JSON.stringify({
    route: "/admin/ops/",
    unauthenticatedRedirect: true,
    desktopDashboard: true,
    apiLeadRead: true,
    noDemoCopy: true,
    filterPreservedAfterDetail: true,
    apiNewLeadCreatesTask: true,
    readonlyDisablesWrites: true,
    mobileOverflowPx: overflow,
    screenshots: outDir
  }, null, 2));
} finally {
  await browser.close();
}
