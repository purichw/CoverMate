import assert from "node:assert/strict";
import fs from "node:fs";

import { loadPlaywright } from "./lib/playwright.mjs";

const playwright = loadPlaywright();
const { chromium } = playwright;
const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");

const analyticsHarness = `<!doctype html>
<html>
<head>
  <title>CoverMate Analytics Harness</title>
  <script type="module" src="/covermate-contract.js"></script>
  <script src="/covermate-analytics.js" defer></script>
</head>
<body>
  <a id="line" href="https://line.me/ti/p/~covermate" onclick="event.preventDefault()">LINE</a>
  <a id="phone" href="tel:0891234567" onclick="event.preventDefault()">Phone</a>
  <a id="email" href="mailto:owner@covermate.example" onclick="event.preventDefault()">Email</a>
  <button id="lang-en" type="button">EN</button>
  <input id="calc" type="range" min="0" max="10" value="4">
  <section id="talk">
    <form id="consultation" onsubmit="event.preventDefault()">
      <input id="lead-name" name="name">
      <input id="lead-contact" name="contact">
      <textarea id="lead-topic" name="topic"></textarea>
      <button type="submit">Submit consultation</button>
    </form>
  </section>
  <section id="renew">
    <form id="renewal" onsubmit="event.preventDefault()">
      <input id="renew-contact" name="contact">
      <button type="submit">Submit renewal</button>
    </form>
  </section>
</body>
</html>`;

function eventRows(dataLayer) {
  return dataLayer
    .filter((row) => row && row[0] === "event")
    .map((row) => ({ name: row[1], params: row[2] || {} }));
}

function countEvents(events, name) {
  return events.filter((event) => event.name === name).length;
}

function assertNoPii(value, label) {
  const text = JSON.stringify(value);
  for (const pattern of [
    /\bAri\b/i,
    /\bBen\b/i,
    /0891234567/,
    /081-234-5678/,
    /point@example\.com/i,
    /lineid/i,
    /secret freeform/i
  ]) {
    assert.equal(pattern.test(text), false, `${label} leaked PII/freeform value: ${pattern}`);
  }
}

async function routeStatic(page, firebaseBody = "export {};", analyticsPayload = null, harnessOnly = false) {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "www.googletagmanager.com") {
      return route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
    }
    if ((harnessOnly && route.request().isNavigationRequest()) || url.pathname === "/" || url.pathname === "/index.html") {
      return route.fulfill({ status: 200, contentType: "text/html", body: analyticsHarness });
    }
    if (url.pathname === "/covermate-contract.js") {
      return route.fulfill({ status: 200, contentType: "application/javascript", body: read("covermate-contract.js") });
    }
    if (url.pathname === "/covermate-environment.mjs") {
      return route.fulfill({ status: 200, contentType: "application/javascript", body: read("covermate-environment.mjs") });
    }
    if (url.pathname === "/covermate-analytics.js") {
      return route.fulfill({ status: 200, contentType: "application/javascript", body: read("covermate-analytics.js") });
    }
    if (url.pathname === "/covermate-firebase.js") {
      return route.fulfill({ status: 200, contentType: "application/javascript", body: firebaseBody });
    }
    if (url.pathname === "/admin/session.js") {
      return route.fulfill({ status: 200, contentType: "application/javascript", body: read("admin/session.js") });
    }
    if (url.pathname === "/admin/analytics-data.js") {
      return route.fulfill({ status: 200, contentType: "application/javascript", body: read("admin/analytics-data.js") });
    }
    if (url.pathname === "/api/analytics") {
      return route.fulfill({
        status: analyticsPayload ? 200 : 404,
        contentType: "application/json",
        body: JSON.stringify(analyticsPayload || { error: "not_found" })
      });
    }
    if (url.pathname.startsWith("/assets/")) {
      const file = new URL(`.${url.pathname}`, root);
      if (fs.existsSync(file)) {
        const contentType = url.pathname.endsWith(".png") ? "image/png"
          : url.pathname.endsWith(".svg") ? "image/svg+xml"
            : "application/octet-stream";
        return route.fulfill({ status: 200, contentType, body: fs.readFileSync(file) });
      }
    }
    if (url.pathname === "/admin/analytics" || url.pathname === "/admin/analytics/") {
      return route.fulfill({ status: 200, contentType: "text/html", body: read("admin/analytics/index.html") });
    }
    if (url.pathname === "/admin/login") {
      return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Login</title><h1>Login</h1>" });
    }
    return route.fulfill({ status: 404, contentType: "text/plain", body: "not found" });
  });
}

async function verifyPublicEvents(browser) {
  const page = await browser.newPage();
  await routeStatic(page);
  await page.goto("https://covermate.vercel.app/?name=Ari&email=point@example.com&phone=0891234567", {
    waitUntil: "domcontentloaded"
  });
  await page.waitForFunction(() =>
    Array.isArray(window.dataLayer) && window.dataLayer.some((row) => row && row[0] === "event" && row[1] === "page_view")
  );

  await page.locator("#line").click();
  await page.locator("#line").click();
  await page.locator("#phone").click();
  await page.locator("#email").click();
  await page.locator("#lang-en").click();
  await page.locator("#calc").evaluate((input) => {
    input.value = "8";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator("#lead-name").fill("Ari Customer");
  await page.locator("#lead-contact").fill("LINEID ari 081-234-5678");
  await page.locator("#lead-topic").fill("secret freeform message");
  await page.locator("#renew-contact").fill("Ben 0891234567");
  await page.locator("#consultation").evaluate((form) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await page.locator("#renewal").evaluate((form) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await page.evaluate(() => {
    window.CoverMateAnalytics.trackEvent("quote_submit_success", {
      form_type: "consultation",
      enquiry_type: "quote",
      coverage: "motor",
      name: "Ari Customer",
      contact: "point@example.com 0891234567",
      topic: "secret freeform message"
    });
    window.CoverMateAnalytics.trackEvent("quote_submit_error", {
      form_type: "renewal_reminder",
      error_message: "Ben 081-234-5678 lineid"
    });
    window.CoverMateAnalytics.trackEvent("custom_event", {
      name: "Ari Customer",
      contact: "point@example.com 0891234567"
    });
  });
  await page.waitForTimeout(250);

  const events = eventRows(await page.evaluate(() => window.dataLayer || []));
  assert.equal(countEvents(events, "page_view"), 1, "page_view fires once");
  assert.equal(countEvents(events, "line_click"), 1, "line_click is debounced");
  assert.equal(countEvents(events, "phone_click"), 1, "phone_click fires");
  assert.equal(countEvents(events, "email_click"), 1, "email_click fires");
  assert.equal(countEvents(events, "language_change"), 1, "language_change fires");
  assert.equal(countEvents(events, "calculator_interaction"), 1, "calculator_interaction fires");
  assert.equal(countEvents(events, "custom_event"), 0, "unknown events are not forwarded");
  assert.equal(
    events.filter((event) => event.name === "form_start" && event.params.form_type === "consultation").length,
    1,
    "consultation form_start fires once"
  );
  assert.equal(
    events.filter((event) => event.name === "form_start" && event.params.form_type === "renewal_reminder").length,
    1,
    "renewal form_start fires once"
  );
  assert.equal(
    events.filter((event) => event.name === "quote_submit" && event.params.form_type === "consultation").length,
    1,
    "consultation quote_submit fires"
  );
  assert.equal(
    events.filter((event) => event.name === "quote_submit" && event.params.form_type === "renewal_reminder").length,
    1,
    "renewal quote_submit fires"
  );
  const success = events.find((event) => event.name === "quote_submit_success");
  assert.deepEqual(
    Object.keys(success.params).sort(),
    ["coverage", "enquiry_type", "form_type", "page_location", "page_path"].sort(),
    "quote_submit_success keeps only safe parameters"
  );
  assert.equal(success.params.coverage, "motor");
  assert.equal(success.params.enquiry_type, "quote");
  const pageView = events.find((event) => event.name === "page_view");
  assert.equal(pageView.params.page_location, "https://covermate.vercel.app/");
  assert.equal(pageView.params.page_path, "/");
  assertNoPii(events, "public analytics events");
  await page.close();
}

async function verifyTrackingBoundaries(browser) {
  for (const withoutContract of [false, true]) {
    for (const [path, expected] of [
      ['/admin', 'admin-path'], ['/admin/', 'admin-path'],
      ['/admin/edit', 'admin-path'], ['/admin/content', 'admin-path'],
      ['/admin/preview?page=motor', 'admin-path'], ['/admin/login', 'admin-path'],
      ['/admin/analytics', 'admin-path'], ['/admin/ops', 'admin-path'],
      ['/#admin', 'owner-hash'], ['/#edit', 'owner-hash'], ['/#preview', 'owner-hash'],
      ['/motor', 'enabled'], ['/administrator', 'enabled']
    ]) {
      const page = await browser.newPage();
      await routeStatic(page, 'export {};', null, true);
      if (withoutContract) await page.route('**/covermate-contract.js', route => route.fulfill({ contentType: 'application/javascript', body: 'export {};' }));
      await page.goto(`https://covermate.vercel.app${path}`);
      await page.waitForFunction(() => window.CoverMateAnalytics?.reason !== 'not-initialized');
      await page.locator('#line').click();
      const state = await page.evaluate(() => ({
        reason: window.CoverMateAnalytics.reason,
        hasTag: Boolean(document.querySelector('script[src*="googletagmanager"]')),
        events: window.dataLayer || []
      }));
      assert.equal(state.reason, expected, `${path}: suppression reason (fallback=${withoutContract})`);
      assert.equal(state.hasTag, expected === 'enabled', `${path}: tag loading boundary`);
      if (expected !== 'enabled') assert.deepEqual(state.events, [], `${path}: owner interactions must not be tracked`);
      await page.close();
    }
  }
}

async function verifyAnalyticsRouteAuth(browser) {
  const validSession = {
    email: "owner@example.com",
    name: "Owner",
    ts: Date.now(),
    exp: Date.now() + 60 * 60 * 1000
  };

  async function openWith(firebaseBody, session = validSession, analyticsPayload = null) {
    const page = await browser.newPage();
    await routeStatic(page, firebaseBody, analyticsPayload);
    if (session) {
      await page.addInitScript((cached) => {
        window.localStorage.setItem("covermate-admin-session", JSON.stringify(cached));
      }, session);
    }
    await page.goto("https://covermate.vercel.app/admin/analytics", { waitUntil: "domcontentloaded" });
    return page;
  }

  const signedOut = await openWith("export {};", null);
  await signedOut.waitForURL(/\/admin\/login$/, { timeout: 5000 });
  await signedOut.close();

  const localOnly = await openWith(`
    window.CoverMateFirebase = {
      waitForAuth: async () => null,
      syncSessionFromCurrentUser: async () => ({ ok: false }),
      signOut: async () => {}
    };
    export {};
  `);
  await localOnly.waitForURL(/\/admin\/login$/, { timeout: 5000 });
  assert.equal((await localOnly.locator("body").innerText()).includes("Recent leads"), false, "localStorage-only auth did not expose analytics shell");
  await localOnly.close();

  const unauthorized = await openWith(`
    window.CoverMateFirebase = {
      waitForAuth: async () => ({ uid: 'not-admin' }),
      syncSessionFromCurrentUser: async () => ({ ok: false, reason: 'not-admin' }),
      signOut: async () => {}
    };
    export {};
  `);
  await unauthorized.waitForURL(/\/admin\/login$/, { timeout: 5000 });
  await unauthorized.close();

  const analyticsPayload = {
    status: "live",
    source: "ga4_data_api",
    measurementId: "G-5TF3C235EF",
    propertyId: "123456789",
    range: { days: 30, startDate: "30daysAgo", endDate: "today" },
    metrics: {
      sessions: 123,
      activeUsers: 45,
      screenPageViews: 321,
      eventCount: 250,
      engagementRate: 0.64,
      contactIntent: 12,
      formStarts: 5,
      quoteSubmits: 4,
      leadSubmitSuccess: 2,
      submitErrors: 0
    },
    timeline: [
      { date: "20260819", label: "19 Aug", sessions: 60, activeUsers: 20, pageViews: 160, contactIntent: 6, formStarts: 3, leadSubmitSuccess: 1 },
      { date: "20260820", label: "20 Aug", sessions: 63, activeUsers: 25, pageViews: 161, contactIntent: 6, formStarts: 2, leadSubmitSuccess: 1 }
    ],
    events: [
      { eventName: "line_click", count: 7 },
      { eventName: "phone_click", count: 3 },
      { eventName: "email_click", count: 2 },
      { eventName: "form_start", count: 5 },
      { eventName: "quote_submit_success", count: 2 }
    ],
    acquisition: [
      { channel: "Organic Search", sessions: 80, activeUsers: 30, pageViews: 190, eventCount: 150 },
      { channel: "Direct", sessions: 43, activeUsers: 15, pageViews: 131, eventCount: 100 }
    ],
    devices: [
      { device: "mobile", sessions: 90, activeUsers: 33 },
      { device: "desktop", sessions: 33, activeUsers: 12 }
    ],
    topPages: [
      { path: "/", pageViews: 280, activeUsers: 40 },
      { path: "/#cover", pageViews: 41, activeUsers: 10 }
    ]
  };

  const authorized = await openWith(`
    window.CoverMateFirebase = {
      waitForAuth: async () => ({ uid: 'owner' }),
      syncSessionFromCurrentUser: async () => ({ ok: true, session: { email: 'owner@example.com' } }),
      getAdminIdToken: async () => 'analytics-regression-token',
      loadContactLeads: async () => ([
        { id: 'lead-a', name: 'Test Lead', contact: 'LINE test', qtype: 'quote', coverage: 'motor', read: false, status: 'new', createdAt: Date.now(), topic: 'secret freeform message', summary: 'secret freeform message' },
        { id: 'lead-b', name: 'Second Lead', contact: 'Phone test', qtype: 'review', coverage: 'life', read: true, status: 'new', createdAt: Date.now() - 86400000, sourcePath: '/?email=point@example.com' }
      ]),
      signOut: async () => {}
    };
    export {};
  `, validSession, analyticsPayload);
  await authorized.getByRole("heading", { name: "Analytics" }).waitFor({ timeout: 5000 });
  await authorized.getByText("Test Lead").waitFor({ timeout: 5000 });
  await authorized.getByText("Organic Search").waitFor({ timeout: 5000 });
  const state = await authorized.evaluate(() => ({
    text: document.body.innerText,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") || "",
    hasVisitorGa: Boolean(document.querySelector('script[src*="googletagmanager"], script[src*="google-analytics"]')),
    authState: document.body.getAttribute("data-auth-state"),
    leadKpi: document.querySelector('[data-kpi="leads"]')?.textContent || "",
    sessionsKpi: document.querySelector('[data-kpi="sessions"]')?.textContent || "",
    dataApiStatus: document.querySelector("#data-api-status")?.textContent || ""
  }));
  assert.equal(state.authState, "ready");
  assert.equal(state.leadKpi, "2");
  assert.equal(state.sessionsKpi, "123");
  assert.equal(state.dataApiStatus, "Connected");
  assert.match(state.robots, /^noindex/);
  assert.equal(state.hasVisitorGa, false, "admin analytics does not load visitor GA script");
  assert.equal(/Operations|\/admin\/ops/.test(state.text), false, "admin analytics does not introduce Operations");
  assertNoPii(state.text.replace(/Test Lead|Second Lead|LINE test|Phone test/g, ""), "admin analytics non-rendered fields");
  if (process.env.COVERMATE_ANALYTICS_SNAPSHOT_OUT) {
    await authorized.setViewportSize({ width: 1280, height: 900 });
    await authorized.screenshot({ path: process.env.COVERMATE_ANALYTICS_SNAPSHOT_OUT, fullPage: false });
  }
  await authorized.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await verifyPublicEvents(browser);
  await verifyTrackingBoundaries(browser);
  await verifyAnalyticsRouteAuth(browser);
} finally {
  await browser.close();
}

console.log("CoverMate analytics regression check passed");
