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
  window.CoverMateFirebase = {
    waitForAuth: async () => ({ uid: "smoke-admin", email: "purich@example.com", displayName: "Purich N." }),
    syncSessionFromCurrentUser: async () => ({ ok: true, session: session() }),
    signOut: async () => {},
    loadOperationalLeads: async () => ([
      {
        id: "abc1234",
        name: "Live Lead A",
        contact: "080-111-2222",
        topic: "Need motor comparison from live contactLeads.",
        qtype: "quote",
        coverage: "motor",
        consent: true,
        language: "th",
        summary: "Motor quote",
        sourcePath: "/?utm_source=line",
        status: "new",
        read: false,
        createdAt: { seconds: 1786320000 },
        updatedAt: { seconds: 1786320000 }
      },
      {
        id: "def5678",
        name: "Live Lead B",
        contact: "line-live-b",
        topic: "Health review follow up.",
        qtype: "review",
        coverage: "health",
        consent: true,
        language: "en",
        summary: "Health review",
        sourcePath: "/contact",
        status: "consultation",
        read: true,
        createdAt: { seconds: 1786233600 },
        updatedAt: { seconds: 1786233600 }
      }
    ])
  };
  window.dispatchEvent(new CustomEvent("covermate-firebase-ready"));
  export {};
`;

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const unauthenticated = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  await unauthenticated.goto(`${baseUrl}/admin/ops/`, { waitUntil: "domcontentloaded" });
  await unauthenticated.waitForURL(/\/admin\/login\/?$/, { timeout: 5000 });
  await unauthenticated.close();

  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  await page.route("**/covermate-firebase.js", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: firebaseMock
    });
  });
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
  await page.screenshot({ path: `${outDir}/ops-dashboard-desktop.png`, fullPage: true });

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
  await page.getByLabel("Name").fill("Regression Local Lead");
  await page.getByLabel("Phone or contact").fill("089-999-0000");
  await page.getByLabel("Submitted message").fill("Created by ops portal regression check.");
  await page.getByLabel(/PDPA consent/).check();
  await page.getByRole("button", { name: "Create lead" }).click();
  await page.getByRole("heading", { name: "Regression Local Lead" }).waitFor();

  await page.getByRole("button", { name: /Tasks/ }).first().click();
  await page.getByRole("heading", { name: "Tasks and follow-ups" }).waitFor();
  await page.getByText("First contact — Regression Local Lead").waitFor();

  await page.getByLabel("Preview role").selectOption("readonly");
  const newLeadDisabled = await page.getByRole("button", { name: /New lead/ }).isDisabled();
  if (!newLeadDisabled) throw new Error("Read-only role did not disable New lead.");

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.route("**/covermate-firebase.js", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: firebaseMock
    });
  });
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
    liveLeadRead: true,
    filterPreservedAfterDetail: true,
    localNewLeadCreatesTask: true,
    readonlyDisablesWrites: true,
    mobileOverflowPx: overflow,
    screenshots: outDir
  }, null, 2));
} finally {
  await browser.close();
}
