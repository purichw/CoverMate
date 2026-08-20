import fs from "node:fs";
import vm from "node:vm";
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
const smokeSuite = process.env.COVERMATE_SMOKE_SUITE || "all";
const chromePath =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const viewports = [
  ["desktop", 1440, 900],
  ["tablet", 820, 1180],
  ["mobile", 390, 844]
];

const routes = [
  ["/", "main"],
  ["/#motor", "main"],
  ["/#life", "main"],
  ["/#motor-focus", "main"],
  ["/#life-focus", "main"],
  ["/admin/login", "main"]
];

const mainVisitorRoutes = new Set(["/", "/#motor", "/#life"]);
const motorSectionRoutes = new Set(["/", "/#motor", "/#motor-focus"]);
const visitorRoutes = new Set(["/", "/#motor", "/#life", "/#motor-focus", "/#life-focus"]);

function extractDefaultSiteConfig() {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const templateMatch = html.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
  if (!templateMatch) throw new Error("index.html: embedded template missing");
  const template = JSON.parse(templateMatch[1]);
  const scriptMatch = template.match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error("index.html: text/x-dc script missing");
  const scriptSource = scriptMatch[1];
  new vm.Script(scriptSource, { filename: "index.html text/x-dc" });
  const defaultsEnd = scriptSource.indexOf("const SCHEMA =");
  if (defaultsEnd < 0) throw new Error("index.html: DEFAULTS boundary missing");
  const sandbox = { result: null };
  vm.runInNewContext(`${scriptSource.slice(0, defaultsEnd)}\nresult = DEFAULTS;`, sandbox);
  return sandbox.result;
}

const defaultSiteConfig = extractDefaultSiteConfig();

function renamedConfig(name) {
  const config = structuredClone(defaultSiteConfig);
  config.brand.name = { th: name, en: name };
  config.brand.fullName = { th: name, en: name };
  config.seo = config.seo || {};
  config.seo.title = { th: `${name} | CoverMate smoke`, en: `${name} | CoverMate smoke` };
  config.seo.description = {
    th: `Smoke description for ${name} with 14 insurer logos and live Firestore content.`,
    en: `Smoke description for ${name} with 14 insurer logos and live Firestore content.`
  };
  return config;
}

function remoteContentMock(remoteConfig, remoteText = {}) {
  return `
    const remoteConfig = ${JSON.stringify(remoteConfig)};
    const remoteText = ${JSON.stringify(remoteText)};
    window.CoverMateFirebase = {
      hydrateLocalContent: async (opts = {}) => {
        window.__covermateHydrateCount = (window.__covermateHydrateCount || 0) + 1;
        window.__covermateHydrateOpts = opts;
        window.localStorage.setItem("purich-live-config-v3", JSON.stringify(remoteConfig));
        window.localStorage.setItem("purich-live-text-v3", JSON.stringify(remoteText));
        if (opts.draft === true) {
          window.localStorage.setItem("purich-draft-config-v3", JSON.stringify(remoteConfig));
          window.localStorage.setItem("purich-draft-text-v3", JSON.stringify(remoteText));
        }
        if (opts.versions === true) {
          window.localStorage.setItem("purich-history-v3", JSON.stringify([
            { id: "remote-smoke-version", ts: Date.now(), config: remoteConfig, text: remoteText }
          ]));
        }
        window.__covermateRemoteContent = {
          live: true,
          draft: opts.draft === true,
          versions: opts.versions === true,
          source: "remote-smoke"
        };
        return window.__covermateRemoteContent;
      },
      signOut: async () => {}
    };
    window.dispatchEvent(new CustomEvent("covermate-firebase-ready"));
    export {};
  `;
}

function adminPortalSessionMock() {
  return `
    const user = {
      uid: "smoke-owner",
      email: "owner@example.com",
      displayName: "Owner Smoke",
      photoURL: "",
      getIdToken: async () => "smoke-token"
    };
    const session = {
      email: user.email,
      name: user.displayName,
      pic: "",
      role: "owner",
      ts: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
    window.CoverMateFirebase = {
      auth: { currentUser: user },
      waitForAuth: async () => user,
      syncSessionFromCurrentUser: async () => {
        window.localStorage.setItem("covermate-admin-session", JSON.stringify(session));
        return { ok: true, user, admin: { role: "owner", active: true }, session };
      },
      hydrateLocalContent: async () => null,
      signOut: async () => {}
    };
    window.dispatchEvent(new CustomEvent("covermate-firebase-ready"));
    export {};
  `;
}

function adminOpsApiMock(route) {
  const url = new URL(route.request().url());
  const resource = url.pathname.replace(/^\/api\/ops\/?/, "").split("/").filter(Boolean)[0];
  const rows = {
    leads: [
      {
        id: "smoke-lead",
        displayId: "CL-SMOKE",
        name: "Smoke Lead",
        phone: "080-000-0000",
        source: "Smoke",
        interestKey: "motor",
        status: "new",
        message: "Smoke lead for admin shell.",
        assigneeName: "Owner Smoke",
        consent: { given: true },
        createdAt: "2026-08-10T08:00:00.000Z",
        updatedAt: "2026-08-10T08:00:00.000Z"
      }
    ],
    tasks: [
      {
        id: "smoke-lead:firstContact",
        title: "First contact - Smoke Lead",
        dueAt: "2026-08-10T10:00:00.000Z",
        priority: "High",
        relatedLabel: "Lead CL-SMOKE",
        assigneeName: "Owner Smoke",
        completed: false
      }
    ],
    audit: [
      {
        id: "smoke-audit",
        kind: "Lead",
        subject: "Lead CL-SMOKE - Smoke Lead",
        from: "",
        to: "Created",
        actorName: "System",
        at: "2026-08-10T08:00:00.000Z"
      }
    ]
  }[resource] || [];
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ rows, total: rows.length, source: "smoke-api" })
  });
}

function adminActionContentMock(liveConfig, draftConfig, liveText = {}, draftText = {}) {
  return `
    let liveConfig = ${JSON.stringify(liveConfig)};
    let draftConfig = ${JSON.stringify(draftConfig)};
    let liveText = ${JSON.stringify(liveText)};
    let draftText = ${JSON.stringify(draftText)};
    const pause = () => new Promise((resolve) => setTimeout(resolve, 180));
    window.__covermateSaveCalls = [];
    window.__covermatePublishCalls = [];
    window.CoverMateFirebase = {
      hydrateLocalContent: async (opts = {}) => {
        window.__covermateHydrateOpts = opts;
        window.localStorage.setItem("purich-live-config-v3", JSON.stringify(liveConfig));
        window.localStorage.setItem("purich-live-text-v3", JSON.stringify(liveText));
        if (opts.draft === true) {
          window.localStorage.setItem("purich-draft-config-v3", JSON.stringify(draftConfig));
          window.localStorage.setItem("purich-draft-text-v3", JSON.stringify(draftText));
        }
        if (opts.versions === true) {
          window.localStorage.setItem("purich-history-v3", JSON.stringify([
            { id: "mock-live-version", ts: Date.now() - 1000, config: liveConfig, text: liveText }
          ]));
        }
        window.__covermateRemoteContent = {
          live: true,
          draft: opts.draft === true,
          versions: opts.versions === true,
          source: "admin-action-smoke"
        };
        return window.__covermateRemoteContent;
      },
      saveSiteState: async (name, config, text) => {
        await pause();
        window.__covermateSaveCalls.push({ name, config, text, ts: Date.now() });
        if (name === "draft") {
          draftConfig = config;
          draftText = text || {};
          window.localStorage.setItem("purich-draft-config-v3", JSON.stringify(draftConfig));
          window.localStorage.setItem("purich-draft-text-v3", JSON.stringify(draftText));
        }
        return { ok: true };
      },
      publishSiteState: async (config, text, metadata = {}) => {
        await pause();
        const id = "mock-publish-" + (window.__covermatePublishCalls.length + 1);
        const version = { id, ts: Date.now(), config, text: text || {}, ...metadata };
        window.__covermatePublishCalls.push(version);
        liveConfig = config;
        draftConfig = config;
        liveText = text || {};
        draftText = text || {};
        window.localStorage.setItem("purich-live-config-v3", JSON.stringify(liveConfig));
        window.localStorage.setItem("purich-live-text-v3", JSON.stringify(liveText));
        window.localStorage.setItem("purich-draft-config-v3", JSON.stringify(draftConfig));
        window.localStorage.setItem("purich-draft-text-v3", JSON.stringify(draftText));
        return version;
      },
      signOut: async () => {}
    };
    window.dispatchEvent(new CustomEvent("covermate-firebase-ready"));
    export {};
  `;
}

async function waitForBodyText(page, pattern, timeout = 30000) {
  await page.waitForFunction(
    ({ source, flags }) => new RegExp(source, flags).test(document.body.innerText || ""),
    { source: pattern.source, flags: pattern.flags },
    { timeout }
  );
}

async function readDraftSection(page, id) {
  return page.evaluate((sectionId) => {
    try {
      const config = JSON.parse(window.localStorage.getItem("purich-draft-config-v3") || "{}");
      return (config.sections || []).find((section) => section.id === sectionId) || null;
    } catch {
      return null;
    }
  }, id);
}

async function clickAdminTab(page, label) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForTimeout(180);
}

function adminAsideLocator(page) {
  return page.locator("aside").filter({ hasText: "Admin portal" }).last();
}

async function changeField(locator, value) {
  const field = locator.first();
  await field.scrollIntoViewIfNeeded();
  await field.click();
  await field.fill(value);
  await field.press("Tab").catch(async () => {
    await field.evaluate((el) => el.blur());
  });
  await field.evaluate((el) => {
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function selectAdminSection(page, id) {
  await clickAdminTab(page, "Sections");
  const row = page.locator(`[data-admin-section-row="${id}"]`).first();
  await row.scrollIntoViewIfNeeded();
  await row.locator(`[data-admin-section-edit="${id}"]`).click();
  await page.waitForFunction(
    (sectionId) => Array.from(document.querySelectorAll("aside"))
      .some((aside) => /Admin portal/.test(aside.innerText || "") && (aside.innerText || "").includes(`#${sectionId}`)),
    id,
    { timeout: 5000 }
  );
}

async function clickSectionColumnControl(page, id, direction) {
  await clickAdminTab(page, "Sections");
  const row = page.locator(`[data-admin-section-row="${id}"]`).first();
  await row.scrollIntoViewIfNeeded();
  const details = row.locator("details").first();
  if (await details.count()) {
    await details.evaluate((node) => { node.open = true; });
  }
  const selector = direction === "increase" ? `[data-admin-cols-plus="${id}"]` : `[data-admin-cols-minus="${id}"]`;
  await row.locator(selector).click();
}

const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath
});

const failures = [];

async function newSmokePage(options) {
  const page = await browser.newPage(options);
  await page.addInitScript(() => {
    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && rect.width > 0 && rect.height > 0;
    };
    window.__covermateVisibleOwnerBarCount = () => Array.from(document.querySelectorAll("[data-admin-owner-bar]")).filter(isVisible).length;
    window.__covermateVisibleAdminAside = () => Array.from(document.querySelectorAll("aside")).some((el) =>
      isVisible(el) && /Admin portal/.test(el.innerText || "")
    );
  });
  return page;
}

async function verifyRemoteHydrationContract() {
  const remoteName = "Remote Live Smoke";
  const staleName = "Stale Cache Smoke";
  const remoteConfig = renamedConfig(remoteName);
  remoteConfig.header.nav.splice(3, 0, {
    label: { th: "ประกันรถยนต์", en: "Motor" },
    href: "#motor"
  });
  const staleConfig = renamedConfig(staleName);
  const staleRemoteText = {
    "insurers:1:th": "ประกันรถยนต์\nเทียบได้กว่า 20 เจ้า",
    "insurers:2:th": "เฉพาะประกันรถยนต์ ผมจัดผ่านบริษัทกว่า 26 เจ้า จึงเสนอตามที่เหมาะกับคุณ ส่วนชีวิตและสุขภาพ ผมเป็นตัวแทน AIA โดยเฉพาะ"
  };

  const publicPage = await newSmokePage({ viewport: { width: 1024, height: 800 } });
  await publicPage.route("**/covermate-firebase.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: remoteContentMock(remoteConfig, staleRemoteText)
    })
  );
  await publicPage.addInitScript(({ config }) => {
    window.localStorage.setItem("purich-live-config-v3", JSON.stringify(config));
    window.localStorage.setItem("purich-live-text-v3", JSON.stringify({}));
  }, { config: staleConfig });
  await publicPage.goto(new URL("/", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
  await publicPage.waitForFunction(() => Boolean(document.body), null, { timeout: 10000 });
  await waitForBodyText(publicPage, new RegExp(remoteName));
  const publicState = await publicPage.evaluate(() => ({
    text: document.body.innerText,
    insurerText: document.querySelector("#insurers")?.innerText || "",
    navHrefs: Array.from(document.querySelectorAll("header nav a[href]")).map((a) => a.getAttribute("href")),
    cachedBrand: JSON.parse(window.localStorage.getItem("purich-live-config-v3") || "{}")?.brand?.name?.th || "",
    opts: window.__covermateHydrateOpts || null,
    seoTitle: document.title,
    seoJsonName: (() => {
      try {
        const data = JSON.parse(document.getElementById("covermate-jsonld")?.textContent || "{}");
        const org = (data["@graph"] || []).find((entry) =>
          Array.isArray(entry["@type"]) && entry["@type"].includes("InsuranceAgency")
        );
        return org?.name || "";
      } catch {
        return "";
      }
    })()
  }));
  if (!publicState.text.includes(remoteName) || publicState.text.includes(staleName)) {
    failures.push("remote hydration: public route did not let Firestore live content override stale local cache");
  }
  if (
    publicState.insurerText.includes("20 เจ้า") ||
    publicState.insurerText.includes("26 เจ้า") ||
    /กว่า\s*14/.test(publicState.insurerText) ||
    !/14\s*(เจ้า|แห่ง|บริษัท)/.test(publicState.insurerText)
  ) {
    failures.push("remote hydration: insurer count did not normalize to the current 14-logo product copy");
  }
  if (
    publicState.navHrefs.includes("#motor") ||
    publicState.navHrefs.filter((href) => href === "#insurers").length !== 1
  ) {
    failures.push(`remote hydration: motor nav alias was not normalized (${publicState.navHrefs.join(", ")})`);
  }
  if (publicState.cachedBrand !== remoteName) {
    failures.push(`remote hydration: local live cache was not rewritten from remote (${publicState.cachedBrand})`);
  }
  if (!publicState.opts || publicState.opts.draft === true || publicState.opts.versions === true) {
    failures.push("remote hydration: public route fetched draft/version data unnecessarily");
  }
  if (!publicState.seoTitle.includes(remoteName) || publicState.seoJsonName !== remoteName) {
    failures.push("remote hydration: SEO metadata did not sync from remote live content");
  }
  await publicPage.evaluate(() => {
    const main = document.querySelector("main");
    if (main) main.__covermateSmokeStable = true;
  });
  await publicPage.locator('header nav a[href="#fit"]').first().click();
  await publicPage.waitForTimeout(700);
  const anchorState = await publicPage.evaluate(() => ({
    hash: window.location.hash,
    mainStable: document.querySelector("main")?.__covermateSmokeStable === true,
    hasOwnerBar: (window.__covermateVisibleOwnerBarCount ? window.__covermateVisibleOwnerBarCount() > 0 : false),
    text: document.body.innerText
  }));
  if (anchorState.hash !== "#fit") {
    failures.push(`anchor navigation: expected #fit after clicking Resources, got ${anchorState.hash}`);
  }
  if (!anchorState.mainStable) {
    failures.push("anchor navigation: main DOM was rebuilt during a same-page navbar jump");
  }
  if (anchorState.hasOwnerBar || /Admin portal|Text edit/.test(anchorState.text)) {
    failures.push("anchor navigation: admin UI leaked while using public navbar anchors");
  }
  await publicPage.close();

  const ownerPage = await newSmokePage({ viewport: { width: 1024, height: 800 } });
  await ownerPage.route("**/covermate-firebase.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: remoteContentMock(remoteConfig, staleRemoteText)
    })
  );
  await ownerPage.addInitScript(() => {
    window.localStorage.setItem(
      "covermate-admin-session",
      JSON.stringify({
        email: "owner@example.com",
        name: "Owner",
        pic: "",
        ts: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      })
    );
  });
  await ownerPage.goto(new URL("/#admin", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
  await ownerPage.waitForFunction(() => Boolean(document.body), null, { timeout: 10000 });
  await waitForBodyText(ownerPage, /Admin portal/);
  const ownerState = await ownerPage.evaluate(() => ({
    text: document.body.innerText,
    insurerText: document.querySelector("#insurers")?.innerText || "",
    opts: window.__covermateHydrateOpts || null,
    history: JSON.parse(window.localStorage.getItem("purich-history-v3") || "[]")
  }));
  if (!ownerState.text.includes("Admin portal")) {
    failures.push("remote hydration: owner route did not render admin panel under mocked remote content");
  }
  if (
    ownerState.insurerText.includes("20 เจ้า") ||
    ownerState.insurerText.includes("26 เจ้า") ||
    /กว่า\s*14/.test(ownerState.insurerText) ||
    !/14\s*(เจ้า|แห่ง|บริษัท)/.test(ownerState.insurerText)
  ) {
    failures.push("remote hydration: owner route did not normalize stale insurer copy to 14 logos");
  }
  if (!ownerState.opts || ownerState.opts.draft !== true || ownerState.opts.versions !== true) {
    failures.push("remote hydration: owner route did not request draft and versions");
  }
  if (!Array.isArray(ownerState.history) || ownerState.history[0]?.id !== "remote-smoke-version") {
    failures.push("remote hydration: owner route did not cache remote version history");
  }
  await ownerPage.close();
}

async function verifyAdminActionWorkflow() {
  const liveConfig = renamedConfig("Live Action Smoke");
  const draftConfig = renamedConfig("Draft Action Smoke");
  const page = await newSmokePage({ viewport: { width: 1280, height: 900 } });
  const nativeDialogs = [];
  const pageErrors = [];
  page.on("dialog", async (dialog) => {
    nativeDialogs.push(dialog.message());
    await dialog.dismiss().catch(() => {});
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/covermate-firebase.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: adminActionContentMock(liveConfig, draftConfig)
    })
  );
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "covermate-admin-session",
      JSON.stringify({
        email: "owner@example.com",
        name: "Owner",
        pic: "",
        ts: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      })
    );
  });
  await page.goto(new URL("/#admin", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForBodyText(page, /Admin portal/);
  await waitForBodyText(page, /Draft Action Smoke/);

  const actionAdminAside = adminAsideLocator(page);
  const saveButton = actionAdminAside.locator("button").filter({ hasText: /^Save draft$/ }).last();
  await saveButton.click();
  await page.locator('[data-admin-confirm="true"]').waitFor({ state: "visible", timeout: 5000 });
  let dialogText = await page.locator('[data-admin-confirm="true"]').innerText();
  if (!dialogText.includes("Save draft?") || !dialogText.includes("Visitors will keep seeing")) {
    failures.push("admin actions: Save draft did not open the custom confirmation dialog");
  }
  await page.locator('[data-admin-confirm="true"]').getByRole("button", { name: "Cancel" }).click();
  await page.waitForTimeout(200);
  const saveAfterCancel = await page.evaluate(() => window.__covermateSaveCalls.length);
  if (saveAfterCancel !== 0) {
    failures.push("admin actions: cancelling Save draft still wrote to Firestore mock");
  }

  await saveButton.click();
  await page.locator('[data-admin-confirm="true"]').waitFor({ state: "visible", timeout: 5000 });
  await page.locator('[data-admin-confirm="true"]').getByRole("button", { name: "Save draft" }).click();
  await page.locator('[data-admin-progress="true"]').waitFor({ state: "visible", timeout: 3000 }).catch(() =>
    failures.push("admin actions: Save draft did not show an in-progress status")
  );
  await waitForBodyText(page, /Draft saved/);
  let actionState = await page.evaluate(() => ({
    saveCalls: window.__covermateSaveCalls.length,
    publishCalls: window.__covermatePublishCalls.length,
    toastText: document.querySelector('[data-admin-toast="true"]')?.innerText || "",
    confirmVisible: Boolean(document.querySelector('[data-admin-confirm="true"]'))
  }));
  if (actionState.confirmVisible) {
    failures.push("admin actions: Save draft confirmation stayed visible after success");
  }
  if (actionState.saveCalls !== 1 || actionState.publishCalls !== 0) {
    failures.push(`admin actions: Save draft expected 1 save and 0 publishes, got ${actionState.saveCalls}/${actionState.publishCalls}`);
  }
  if (!/Draft saved/.test(actionState.toastText) || !/Undo/.test(actionState.toastText)) {
    failures.push("admin actions: Save draft success toast with Undo is missing");
  }
  await page.locator('[data-admin-toast="true"]').getByRole("button", { name: "Undo" }).click();
  await waitForBodyText(page, /Draft restored/);
  actionState = await page.evaluate(() => ({
    saveCalls: window.__covermateSaveCalls.length,
    toastText: document.querySelector('[data-admin-toast="true"]')?.innerText || ""
  }));
  if (actionState.saveCalls !== 2 || !/Draft restored/.test(actionState.toastText)) {
    failures.push(`admin actions: Save draft undo did not restore the previous draft (${actionState.saveCalls}, ${actionState.toastText})`);
  }
  await page.getByLabel("Close notification").click();
  await page.locator('[data-admin-toast="true"]').waitFor({ state: "detached", timeout: 5000 });

  const publishButton = actionAdminAside.locator("button").filter({ hasText: /^Publish$/ }).last();
  await publishButton.click();
  await page.locator('[data-admin-confirm="true"]').waitFor({ state: "visible", timeout: 5000 });
  dialogText = await page.locator('[data-admin-confirm="true"]').innerText();
  if (!dialogText.includes("Publish changes?") || !dialogText.includes("live visitor site")) {
    failures.push("admin actions: Publish did not open the custom confirmation dialog");
  }
  await page.locator('[data-admin-confirm="true"]').getByRole("button", { name: "Publish" }).click();
  await page.locator('[data-admin-progress="true"]').waitFor({ state: "visible", timeout: 3000 }).catch(() =>
    failures.push("admin actions: Publish did not show an in-progress status")
  );
  await waitForBodyText(page, /Published/);
  actionState = await page.evaluate(() => ({
    saveCalls: window.__covermateSaveCalls.length,
    publishCalls: window.__covermatePublishCalls.length,
    toastText: document.querySelector('[data-admin-toast="true"]')?.innerText || "",
    liveName: JSON.parse(window.localStorage.getItem("purich-live-config-v3") || "{}")?.brand?.name?.th || ""
  }));
  if (actionState.publishCalls !== 1 || actionState.liveName !== "Draft Action Smoke") {
    failures.push(`admin actions: Publish did not update live mock content (${actionState.publishCalls}, ${actionState.liveName})`);
  }
  if (!/Published/.test(actionState.toastText) || !/Undo/.test(actionState.toastText)) {
    failures.push("admin actions: Publish success toast with Undo is missing");
  }
  await page.locator('[data-admin-toast="true"]').getByRole("button", { name: "Undo" }).click();
  await waitForBodyText(page, /Publish undone/);
  actionState = await page.evaluate(() => ({
    publishCalls: window.__covermatePublishCalls.length,
    lastPublish: window.__covermatePublishCalls[window.__covermatePublishCalls.length - 1],
    liveName: JSON.parse(window.localStorage.getItem("purich-live-config-v3") || "{}")?.brand?.name?.th || "",
    toastText: document.querySelector('[data-admin-toast="true"]')?.innerText || ""
  }));
  if (actionState.publishCalls !== 2 || actionState.liveName !== "Live Action Smoke" || !actionState.lastPublish?.undoOf) {
    failures.push(`admin actions: Publish undo did not restore previous live content (${JSON.stringify(actionState)})`);
  }
  if (!/Publish undone/.test(actionState.toastText)) {
    failures.push("admin actions: Publish undo toast is missing");
  }
  await page.getByLabel("Close notification").click();
  await page.locator('[data-admin-toast="true"]').waitFor({ state: "detached", timeout: 5000 });

  if (nativeDialogs.length) {
    failures.push(`admin actions: native browser dialogs were used (${nativeDialogs.join(" | ")})`);
  }
  if (pageErrors.length) {
    failures.push(`admin actions: ${pageErrors.join(" | ")}`);
  }
  await page.close();
}

async function verifyAdminBuilderControls() {
  const liveConfig = renamedConfig("Live Builder Smoke");
  const draftConfig = renamedConfig("Draft Builder Smoke");
  const page = await newSmokePage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/covermate-firebase.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: adminActionContentMock(liveConfig, draftConfig)
    })
  );
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "covermate-admin-session",
      JSON.stringify({
        email: "owner@example.com",
        name: "Owner",
        pic: "",
        ts: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      })
    );
  });

  await page.goto(new URL("/#admin", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForBodyText(page, /Admin portal/);
  await waitForBodyText(page, /Draft Builder Smoke/);

  await clickAdminTab(page, "Sections");
  const heroContentEditCount = await page.locator('[data-admin-section-row="hero"] [data-admin-section-edit="hero"]').count();
  if (heroContentEditCount !== 0) {
    failures.push("admin builder: hero still exposes structured Edit content even though hero copy is inline-edit only");
  }

  await clickAdminTab(page, "Brand & contact");
  const adminAside = adminAsideLocator(page);
  const brandPanelText = await adminAside.innerText();
  if (/Upload logo|Logo uploaded|file upload|drag .*logo/i.test(brandPanelText)) {
    failures.push("admin builder: brand panel still exposes legacy upload language");
  }
  const legacyUploadControls = await adminAside.locator('input[type="file"], [data-admin-logo-upload="true"]').count();
  if (legacyUploadControls !== 0) {
    failures.push(`admin builder: legacy binary upload controls are still rendered (${legacyUploadControls})`);
  }
  const complianceControlState = await page.evaluate(() => ({
    credentialInputs: document.querySelectorAll('[data-admin-compliance-lock="brand-credential"] input, [data-admin-compliance-lock="brand-credential"] textarea').length,
    footerLegalInputs: document.querySelectorAll('[data-admin-compliance-lock="footer-legal"] input, [data-admin-compliance-lock="footer-legal"] textarea').length,
    mediaControls: document.querySelectorAll('[data-admin-media-control="advisor-logo"]').length,
    seoGuards: document.querySelectorAll('[data-admin-seo-guard="true"]').length
  }));
  if (complianceControlState.credentialInputs || complianceControlState.footerLegalInputs) {
    failures.push("admin builder: protected compliance/legal copy is still directly editable");
  }
  if (complianceControlState.mediaControls !== 1) {
    failures.push("admin builder: advisor media metadata control is missing");
  }

  await changeField(page.locator('[data-admin-logo-path="true"]'), "data:image/svg+xml,bad");
  await waitForBodyText(page, /Invalid media path/);
  const rejectedLogoState = await page.evaluate(() => {
    const config = JSON.parse(window.localStorage.getItem("purich-draft-config-v3") || "{}");
    return {
      logo: config?.brand?.advisorLogo || "",
      toast: document.querySelector('[data-admin-toast="true"]')?.innerText || ""
    };
  });
  if (rejectedLogoState.logo.startsWith("data:")) {
    failures.push("admin builder: invalid data-image logo was stored in draft config");
  }
  if (!/Invalid media path/.test(rejectedLogoState.toast)) {
    failures.push("admin builder: invalid media path toast is missing");
  }
  await changeField(page.locator('[data-admin-logo-path="true"]'), "assets/logos/srikrung-logo.png");
  await changeField(page.locator('[data-admin-logo-alt="true"]'), "Srikrung broker logo");
  await changeField(adminAside.locator("label").filter({ hasText: "LINE link" }).locator("input"), "http://bad.example");
  await waitForBodyText(page, /Invalid contact link/);
  await changeField(adminAside.locator("label").filter({ hasText: "LINE link" }).locator("input"), "https://line.me/ti/p/~covermate-smoke");
  await changeField(adminAside.locator("label").filter({ hasText: "Email" }).locator("input"), "not-an-email");
  await waitForBodyText(page, /Invalid email/);
  await changeField(adminAside.locator("label").filter({ hasText: "Email" }).locator("input"), "owner@covermate.example");
  await clickAdminTab(page, "Theme & data");
  await changeField(page.locator('[data-admin-seo-title="true"]'), "CoverMate smoke SEO title");
  await changeField(page.locator('[data-admin-seo-description="true"]'), "Smoke-tested guarded SEO description for the CoverMate admin rebuild.");
  const cmsControlState = await page.evaluate(() => {
    const config = JSON.parse(window.localStorage.getItem("purich-draft-config-v3") || "{}");
    return {
      logo: config?.brand?.advisorLogo || "",
      logoAlt: config?.brand?.advisorLogoAlt || "",
      lineUrl: config?.contact?.lineUrl || "",
      email: config?.contact?.email || "",
      seoTitle: config?.seo?.title?.th || "",
      seoDescription: config?.seo?.description?.th || "",
      seoGuard: document.querySelector('[data-admin-seo-guard="true"]')?.innerText || "",
      footerLegal: config?.footer?.legal?.th || "",
      credential: config?.brand?.credential?.th || ""
    };
  });
  if (cmsControlState.logo !== "assets/logos/srikrung-logo.png" || cmsControlState.logoAlt !== "Srikrung broker logo") {
    failures.push(`admin builder: advisor logo metadata did not persist (${cmsControlState.logo} / ${cmsControlState.logoAlt})`);
  }
  if (cmsControlState.lineUrl !== "https://line.me/ti/p/~covermate-smoke" || cmsControlState.email !== "owner@covermate.example") {
    failures.push(`admin builder: contact controls did not persist validated values (${cmsControlState.lineUrl} / ${cmsControlState.email})`);
  }
  if (
    cmsControlState.seoTitle !== "CoverMate smoke SEO title" ||
    cmsControlState.seoDescription !== "Smoke-tested guarded SEO description for the CoverMate admin rebuild."
  ) {
    failures.push("admin builder: guarded SEO title/description did not persist");
  }
  if (!cmsControlState.seoGuard.includes("Canonical: https://covermate.vercel.app/") || !/admin, edit, and preview stay noindex/i.test(cmsControlState.seoGuard)) {
    failures.push("admin builder: SEO canonical/robots guard copy is missing");
  }
  if (!cmsControlState.footerLegal.includes("6401006221") || !cmsControlState.footerLegal.includes("6804008544") || !cmsControlState.footerLegal.includes("ว00287/2534")) {
    failures.push("admin builder: protected footer legal identifiers are missing");
  }
  if (!cmsControlState.credential.includes("AIA") || !cmsControlState.credential.includes("นายหน้า")) {
    failures.push("admin builder: protected brand credential was not preserved");
  }

  await clickAdminTab(page, "Sections");
  const coverageAccordionState = await page.evaluate(() => {
    const anchor = document.querySelector("#cover");
    return {
      adminCoverRows: document.querySelectorAll('[data-admin-section-row="cover"]').length,
      standaloneCoverSections: document.querySelectorAll("section#cover").length,
      anchorTag: anchor?.tagName || "",
      accordionCount: document.querySelectorAll("[data-hero-cover-card]").length
    };
  });
  if (coverageAccordionState.adminCoverRows !== 0) {
    failures.push("admin builder: embedded #cover still appears as a standalone admin section");
  }
  if (coverageAccordionState.standaloneCoverSections !== 0 || coverageAccordionState.anchorTag !== "DIV") {
    failures.push(`admin builder: #cover should be the hero accordion anchor, not a standalone section (${JSON.stringify(coverageAccordionState)})`);
  }
  if (coverageAccordionState.accordionCount < 6) {
    failures.push(`admin builder: hero coverage accordions are missing (${coverageAccordionState.accordionCount})`);
  }
  const firstCoverageAccordion = page.locator("[data-hero-cover-card]").first();
  await firstCoverageAccordion.scrollIntoViewIfNeeded();
  await firstCoverageAccordion.locator("summary").click();
  await page.waitForFunction(
    () => Boolean(document.querySelector("[data-hero-cover-card]")?.open),
    null,
    { timeout: 5000 }
  ).catch(() => failures.push("admin builder: first hero coverage accordion did not open"));
  const firstCoverageText = await firstCoverageAccordion.innerText();
  if (!/แบบตลอดชีพ|Whole-life/.test(firstCoverageText) || !/ยูนิตลิงก์|Unit-linked/.test(firstCoverageText)) {
    failures.push("admin builder: hero coverage accordion did not render the coverage details from #cover data");
  }

  await selectAdminSection(page, "insurers");
  const insurersBefore = await readDraftSection(page, "insurers");
  const insurerCardCountBefore = (insurersBefore?.cards || []).length;
  await adminAsideLocator(page).locator("button").filter({ hasText: /^\+ Add insurer card$/ }).click();
  await page.waitForFunction(
    ({ id, expected }) => {
      const config = JSON.parse(window.localStorage.getItem("purich-draft-config-v3") || "{}");
      const section = (config.sections || []).find((item) => item.id === id);
      return (section?.cards || []).length === expected;
    },
    { id: "insurers", expected: insurerCardCountBefore + 1 },
    { timeout: 5000 }
  ).catch(() => failures.push("admin builder: + Add insurer card did not append an insurers card"));

  await selectAdminSection(page, "tiers");
  const tiersBefore = await readDraftSection(page, "tiers");
  const tierHeadCountBefore = (tiersBefore?.heads || []).length;
  const tierItemCountBefore = (tiersBefore?.items || []).length;
  await adminAsideLocator(page).locator("button").filter({ hasText: /^\+ Add column$/ }).click();
  await page.waitForFunction(
    ({ id, expected }) => {
      const config = JSON.parse(window.localStorage.getItem("purich-draft-config-v3") || "{}");
      const section = (config.sections || []).find((item) => item.id === id);
      const heads = section?.heads || [];
      return heads.length === expected && (section?.items || []).every((item) => (item.st || []).length === expected);
    },
    { id: "tiers", expected: tierHeadCountBefore + 1 },
    { timeout: 5000 }
  ).catch(() => failures.push("admin builder: + Add column did not sync coverage cells across all tier rows"));

  await adminAsideLocator(page).locator("button").filter({ hasText: /^\+ Add tier$/ }).click();
  await page.waitForFunction(
    ({ id, expectedItems, expectedHeads }) => {
      const config = JSON.parse(window.localStorage.getItem("purich-draft-config-v3") || "{}");
      const section = (config.sections || []).find((item) => item.id === id);
      const items = section?.items || [];
      return (
        items.length === expectedItems &&
        (items[items.length - 1]?.st || []).length === expectedHeads
      );
    },
    { id: "tiers", expectedItems: tierItemCountBefore + 1, expectedHeads: tierHeadCountBefore + 1 },
    { timeout: 5000 }
  ).catch(() => failures.push("admin builder: + Add tier did not append a row with coverage state cells"));

  await page.waitForTimeout(900);
  const builderState = await page.evaluate(() => {
    const config = JSON.parse(window.localStorage.getItem("purich-draft-config-v3") || "{}");
    const section = (id) => (config.sections || []).find((item) => item.id === id) || {};
    const tiers = section("tiers");
    const lastSave = window.__covermateSaveCalls[window.__covermateSaveCalls.length - 1] || null;
    const lastSaveSection = (id) => (lastSave?.config?.sections || []).find((item) => item.id === id) || {};
    return {
      text: document.body.innerText || "",
      insurerCards: (section("insurers").cards || []).length,
      tierHeads: (tiers.heads || []).length,
      tierItems: (tiers.items || []).length,
      tierCellsSynced: (tiers.items || []).every((item) => (item.st || []).length === (tiers.heads || []).length),
      saveCalls: window.__covermateSaveCalls.length,
      lastSaveName: lastSave?.name || "",
      lastSaveInsurerCards: (lastSaveSection("insurers").cards || []).length,
      lastSaveTierHeads: (lastSaveSection("tiers").heads || []).length,
      lastSaveTierItems: (lastSaveSection("tiers").items || []).length
    };
  });
  if (builderState.text.includes("[object Object]")) {
    failures.push("admin builder: rendered object placeholder text after builder mutations");
  }
  if (builderState.insurerCards !== insurerCardCountBefore + 1) {
    failures.push(`admin builder: expected insurers cards ${insurerCardCountBefore + 1}, got ${builderState.insurerCards}`);
  }
  if (builderState.tierHeads !== tierHeadCountBefore + 1 || builderState.tierItems !== tierItemCountBefore + 1 || !builderState.tierCellsSynced) {
    failures.push(`admin builder: tier rows/columns ended inconsistent (${JSON.stringify(builderState)})`);
  }
  if (
    builderState.saveCalls < 1 ||
    builderState.lastSaveName !== "draft" ||
    builderState.lastSaveInsurerCards !== insurerCardCountBefore + 1 ||
    builderState.lastSaveTierHeads !== tierHeadCountBefore + 1 ||
    builderState.lastSaveTierItems !== tierItemCountBefore + 1
  ) {
    failures.push(`admin builder: debounced draft save did not include final builder mutations (${JSON.stringify(builderState)})`);
  }
  if (pageErrors.length) {
    failures.push(`admin builder: ${pageErrors.join(" | ")}`);
  }
  await page.close();
}

async function verifyPublicRouteSuppressesStaleOwnerChrome() {
  const remoteConfig = renamedConfig("Public Chrome Guard Smoke");
  const page = await newSmokePage({ viewport: { width: 1280, height: 900 } });
  await page.route("**/covermate-firebase.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: remoteContentMock(remoteConfig)
    })
  );
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "covermate-admin-session",
      JSON.stringify({
        email: "owner@example.com",
        name: "Owner",
        pic: "",
        ts: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      })
    );
    window.localStorage.setItem("purich-admin-ever-v7", "1");
  });

  await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Public Chrome Guard Smoke/);
  const stalePublicState = await page.evaluate(() => ({
    route: window.location.pathname + window.location.search + window.location.hash,
    marker: window.localStorage.getItem("purich-admin-ever-v7"),
    visibleOwnerBars: Array.from(document.querySelectorAll("[data-admin-owner-bar]")).filter((el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && rect.width > 0 && rect.height > 0;
    }).length,
    text: document.body.innerText
  }));
  if (stalePublicState.route !== "/" || stalePublicState.visibleOwnerBars || stalePublicState.marker) {
    failures.push(`public chrome guard: stale admin marker leaked owner chrome on / (${JSON.stringify(stalePublicState)})`);
  }
  if (/Admin\s+Panel|Text edit|Save draft|Publish/.test(stalePublicState.text)) {
    failures.push("public chrome guard: owner action text was visible on a clean public route");
  }

  await page.goto(new URL("/#admin", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Admin portal/);
  await page.getByLabel("Close admin panel").click();
  await page.waitForFunction(
    () => window.location.pathname === "/" && !window.location.search && !window.location.hash,
    null,
    { timeout: 10000 }
  ).catch(() => {});
  await waitForBodyText(page, /Public Chrome Guard Smoke/);
  const closedState = await page.evaluate(() => ({
    route: window.location.pathname + window.location.search + window.location.hash,
    hasReopen: Boolean(document.querySelector('[data-admin-owner-bar="reopen"]')),
    marker: window.localStorage.getItem("purich-admin-ever-v7"),
    text: document.body.innerText
  }));
  if (
    closedState.route !== "/" ||
    closedState.hasReopen ||
    closedState.marker ||
    /Admin Portal|Admin portal|Text edit|Save draft|Publish|Manage your site/.test(closedState.text)
  ) {
    failures.push(`public chrome guard: closing #admin did not return to clean public / (${JSON.stringify(closedState)})`);
  }

  await page.goto(new URL("/#admin", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Admin portal/);
  await page.getByRole("button", { name: "Public site" }).last().click();
  await page.waitForFunction(
    () => window.location.pathname === "/" && !window.location.search && !window.location.hash,
    null,
    { timeout: 10000 }
  ).catch(() => {});
  await waitForBodyText(page, /Public Chrome Guard Smoke/);
  const publicReturnState = await page.evaluate(() => ({
    route: window.location.pathname + window.location.search + window.location.hash,
    marker: window.localStorage.getItem("purich-admin-ever-v7"),
    hasOwnerBar: (window.__covermateVisibleOwnerBarCount ? window.__covermateVisibleOwnerBarCount() > 0 : false),
    hasAdminAside: (window.__covermateVisibleAdminAside ? window.__covermateVisibleAdminAside() : false),
    text: document.body.innerText
  }));
  if (
    publicReturnState.route !== "/" ||
    publicReturnState.marker ||
    publicReturnState.hasOwnerBar ||
    publicReturnState.hasAdminAside ||
    /Admin Portal|Admin portal|Text edit|Save draft|Publish|Manage your site/.test(publicReturnState.text)
  ) {
    failures.push(`public chrome guard: Public site did not leave owner mode for clean public / (${JSON.stringify(publicReturnState)})`);
  }

  await page.goto(new URL("/#edit", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Editing on page/);
  await page.evaluate(() => {
    const toggle = document.getElementById("covermate-owner-tools-toggle");
    if (toggle) {
      toggle.checked = true;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await page.getByRole("button", { name: "Public site" }).last().click();
  await page.waitForFunction(
    () => window.location.pathname === "/" && !window.location.search && !window.location.hash,
    null,
    { timeout: 10000 }
  ).catch(() => {});
  await waitForBodyText(page, /Public Chrome Guard Smoke/);
  const editPublicState = await page.evaluate(() => ({
    route: window.location.pathname + window.location.search + window.location.hash,
    marker: window.localStorage.getItem("purich-admin-ever-v7"),
    editableCount: document.querySelectorAll("[contenteditable=true], .om-editable").length,
    hasOwnerBar: (window.__covermateVisibleOwnerBarCount ? window.__covermateVisibleOwnerBarCount() > 0 : false),
    text: document.body.innerText
  }));
  if (
    editPublicState.route !== "/" ||
    editPublicState.marker ||
    editPublicState.editableCount ||
    editPublicState.hasOwnerBar ||
    /Editing on page|Admin Portal|Admin portal|Text edit|Save draft|Publish|Manage your site/.test(editPublicState.text)
  ) {
    failures.push(`public chrome guard: Public site from #edit did not leave owner mode for clean public / (${JSON.stringify(editPublicState)})`);
  }

  await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await page.reload({ waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Public Chrome Guard Smoke/);
  await page.waitForTimeout(500);
  const reloadState = await page.evaluate(() => ({
    route: window.location.pathname + window.location.search + window.location.hash,
    marker: window.localStorage.getItem("purich-admin-ever-v7"),
    hasOwnerBar: (window.__covermateVisibleOwnerBarCount ? window.__covermateVisibleOwnerBarCount() > 0 : false),
    text: document.body.innerText
  }));
  if (reloadState.route !== "/" || reloadState.hasOwnerBar || reloadState.marker || /Admin\s+Panel|Text edit|Save draft|Publish/.test(reloadState.text)) {
    failures.push(`public chrome guard: clean public reload restored owner chrome (${JSON.stringify(reloadState)})`);
  }
  await page.close();

  const unauthPreview = await newSmokePage({ viewport: { width: 1024, height: 800 } });
  await unauthPreview.goto(new URL("/#preview", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await unauthPreview.waitForURL(/\/admin\/login(?:\/)?$/, { timeout: 10000 }).catch(() => {});
  const previewGateState = await unauthPreview.evaluate(() => ({
    route: window.location.pathname + window.location.search + window.location.hash,
    text: document.body.innerText
  }));
  if (!/^\/admin\/login\/?$/.test(previewGateState.route)) {
    failures.push(`public chrome guard: unauthenticated #preview did not redirect to /admin/login (${JSON.stringify(previewGateState)})`);
  }
  await unauthPreview.close();
}

async function verifyPreviewIsolationContract() {
  const liveConfig = renamedConfig("Live Preview Smoke");
  const draftConfig = renamedConfig("Draft Preview Smoke");
  const page = await newSmokePage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/covermate-firebase.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: adminActionContentMock(liveConfig, draftConfig)
    })
  );
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "covermate-admin-session",
      JSON.stringify({
        email: "owner@example.com",
        name: "Owner",
        pic: "",
        ts: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      })
    );
    window.localStorage.removeItem("purich-admin-ever-v7");
  });

  await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForBodyText(page, /Live Preview Smoke/);
  const publicState = await page.evaluate(() => ({
    route: window.location.pathname + window.location.search + window.location.hash,
    text: document.body.innerText,
    opts: window.__covermateHydrateOpts || null,
    marker: window.localStorage.getItem("purich-admin-ever-v7"),
    hasPreviewBar: Boolean(document.querySelector("[data-admin-preview-bar]")),
    hasEditDock: Boolean(document.querySelector('[data-admin-owner-bar="edit"]')),
    hasAdminAside: (window.__covermateVisibleAdminAside ? window.__covermateVisibleAdminAside() : false),
    hasReopenBar: Boolean(document.querySelector('[data-admin-owner-bar="reopen"]')),
    htmlPreviewMode: document.documentElement.getAttribute("data-covermate-preview")
  }));
  if (publicState.route !== "/" || !publicState.text.includes("Live Preview Smoke") || publicState.text.includes("Draft Preview Smoke")) {
    failures.push(`preview isolation: public / did not render live-only content (${JSON.stringify(publicState)})`);
  }
  if (publicState.opts?.draft === true || publicState.opts?.versions === true) {
    failures.push(`preview isolation: public / requested private draft/version hydration (${JSON.stringify(publicState.opts)})`);
  }
  if (
    publicState.marker ||
    publicState.hasPreviewBar ||
    publicState.hasEditDock ||
    publicState.hasAdminAside ||
    publicState.hasReopenBar ||
    publicState.htmlPreviewMode
  ) {
    failures.push(`preview isolation: public / leaked owner preview state (${JSON.stringify(publicState)})`);
  }

  await page.goto(new URL("/#preview", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForBodyText(page, /Draft Preview Smoke/);
  await page.locator("[data-admin-preview-bar]").waitFor({ state: "visible", timeout: 10000 });
  const previewState = await page.evaluate(() => ({
    route: window.location.pathname + window.location.search + window.location.hash,
    text: document.body.innerText,
    opts: window.__covermateHydrateOpts || null,
    marker: window.localStorage.getItem("purich-admin-ever-v7"),
    previewBarCount: document.querySelectorAll("[data-admin-preview-bar]").length,
    previewBarText: document.querySelector("[data-admin-preview-bar]")?.innerText || "",
    ownerBars: Array.from(document.querySelectorAll("[data-admin-owner-bar]")).map((el) => el.getAttribute("data-admin-owner-bar")),
    hasEditDock: Boolean(document.querySelector('[data-admin-owner-bar="edit"]')),
    hasAdminAside: (window.__covermateVisibleAdminAside ? window.__covermateVisibleAdminAside() : false),
    hasReopenBar: Boolean(document.querySelector('[data-admin-owner-bar="reopen"]')),
    htmlPreviewMode: document.documentElement.getAttribute("data-covermate-preview"),
    bodyPaddingTop: window.getComputedStyle(document.body).paddingTop,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") || ""
  }));
  if (previewState.route !== "/#preview" || !previewState.text.includes("Draft Preview Smoke") || previewState.text.includes("Live Preview Smoke")) {
    failures.push(`preview isolation: #preview did not render draft-only content (${JSON.stringify(previewState)})`);
  }
  if (!previewState.opts || previewState.opts.draft !== true || previewState.opts.versions !== true) {
    failures.push(`preview isolation: #preview did not request draft/version hydration (${JSON.stringify(previewState.opts)})`);
  }
  if (
    previewState.marker ||
    previewState.previewBarCount !== 1 ||
    previewState.hasEditDock ||
    previewState.hasAdminAside ||
    previewState.hasReopenBar ||
    previewState.ownerBars.length ||
    previewState.htmlPreviewMode !== "true"
  ) {
    failures.push(`preview isolation: #preview leaked editing/admin chrome or marker (${JSON.stringify(previewState)})`);
  }
  if (
    !previewState.previewBarText.includes("Draft preview") ||
    !previewState.previewBarText.includes("Open editor") ||
    !previewState.previewBarText.includes("Public site") ||
    !previewState.previewBarText.includes("Publish")
  ) {
    failures.push(`preview isolation: #preview top bar actions are incomplete (${JSON.stringify(previewState.previewBarText)})`);
  }
  if (previewState.scrollWidth > previewState.clientWidth) {
    failures.push(`preview isolation: #preview horizontal overflow ${previewState.scrollWidth} > ${previewState.clientWidth}`);
  }
  if (!/^noindex/.test(previewState.robots)) {
    failures.push(`preview isolation: #preview metadata is not noindex (${previewState.robots})`);
  }

  await page.locator("[data-admin-preview-bar]").getByRole("button", { name: "Open editor" }).click();
  await page.waitForFunction(() => window.location.hash === "#edit", null, { timeout: 10000 }).catch(() => {});
  await page.locator('[data-admin-owner-bar="edit"]').waitFor({ state: "visible", timeout: 10000 }).catch(() =>
    failures.push("preview isolation: Open editor did not resolve to #edit with edit dock")
  );

  await page.goto(new URL("/#preview", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForBodyText(page, /Draft Preview Smoke/);
  await page.locator("[data-admin-preview-bar]").getByRole("button", { name: "Public site" }).click();
  await page.waitForFunction(
    () => window.location.pathname === "/" && !window.location.search && !window.location.hash,
    null,
    { timeout: 10000 }
  ).catch(() => {});
  await waitForBodyText(page, /Live Preview Smoke/);
  const exitState = await page.evaluate(() => ({
    route: window.location.pathname + window.location.search + window.location.hash,
    text: document.body.innerText,
    marker: window.localStorage.getItem("purich-admin-ever-v7"),
    hasPreviewBar: Boolean(document.querySelector("[data-admin-preview-bar]")),
    hasEditDock: Boolean(document.querySelector('[data-admin-owner-bar="edit"]')),
    hasAdminAside: (window.__covermateVisibleAdminAside ? window.__covermateVisibleAdminAside() : false),
    hasReopenBar: Boolean(document.querySelector('[data-admin-owner-bar="reopen"]')),
    htmlPreviewMode: document.documentElement.getAttribute("data-covermate-preview")
  }));
  if (
    exitState.route !== "/" ||
    !exitState.text.includes("Live Preview Smoke") ||
    exitState.text.includes("Draft Preview Smoke") ||
    exitState.marker ||
    exitState.hasPreviewBar ||
    exitState.hasEditDock ||
    exitState.hasAdminAside ||
    exitState.hasReopenBar ||
    exitState.htmlPreviewMode
  ) {
    failures.push(`preview isolation: Public site from preview did not return to clean live / (${JSON.stringify(exitState)})`);
  }
  if (pageErrors.length) {
    failures.push(`preview isolation: ${pageErrors.join(" | ")}`);
  }
  await page.close();
}

async function verifyStaticSeoFiles() {
  const robotsResponse = await fetch(new URL("/robots.txt", baseUrl));
  const robots = await robotsResponse.text();
  if (!robotsResponse.ok) failures.push(`seo /robots.txt: HTTP ${robotsResponse.status}`);
  if (!/Sitemap:\s*https:\/\/covermate\.vercel\.app\/sitemap\.xml/.test(robots)) {
    failures.push("seo /robots.txt: missing production sitemap directive");
  }
  if (!/Disallow:\s*\/admin\/?/.test(robots)) {
    failures.push("seo /robots.txt: admin routes are not disallowed");
  }

  const sitemapResponse = await fetch(new URL("/sitemap.xml", baseUrl));
  const sitemap = await sitemapResponse.text();
  if (!sitemapResponse.ok) failures.push(`seo /sitemap.xml: HTTP ${sitemapResponse.status}`);
  const locs = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map((match) => match[1]);
  if (!locs.includes("https://covermate.vercel.app/")) {
    failures.push("seo /sitemap.xml: missing canonical public root");
  }
  if (locs.some((loc) => /#|\/admin/.test(loc))) {
    failures.push("seo /sitemap.xml: sitemap includes hash or admin URLs");
  }

  const manifestResponse = await fetch(new URL("/site.webmanifest", baseUrl));
  const manifest = await manifestResponse.json().catch(() => null);
  if (!manifestResponse.ok) failures.push(`seo /site.webmanifest: HTTP ${manifestResponse.status}`);
  if (!manifest || manifest.name !== "CoverMate" || manifest.start_url !== "/") {
    failures.push("seo /site.webmanifest: invalid name or start_url");
  }
  const manifestIcons = Array.isArray(manifest?.icons)
    ? manifest.icons.map((icon) => new URL(icon.src, baseUrl).pathname)
    : [];
  for (const icon of ["/favicon.svg", "/assets/icon-192.png", "/assets/icon-512.png"]) {
    if (!manifestIcons.includes(icon)) failures.push(`seo /site.webmanifest: missing icon ${icon}`);
  }

  for (const asset of ["/favicon.ico", "/favicon.svg", "/covermate-contract.js", "/covermate-firebase.js", "/covermate-analytics.js", "/admin/session.js", "/admin/analytics-data.js", "/assets/covermate-og.png", "/assets/apple-touch-icon.png", "/assets/icon-192.png", "/assets/icon-512.png"]) {
    const response = await fetch(new URL(asset, baseUrl));
    if (!response.ok) failures.push(`seo ${asset}: HTTP ${response.status}`);
  }
}

if (smokeSuite === "admin-builder") {
  await verifyAdminBuilderControls();
  await browser.close();
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(`CoverMate admin builder smoke passed for ${baseUrl}`);
  process.exit(0);
}

await verifyStaticSeoFiles();
await verifyRemoteHydrationContract();
await verifyAdminActionWorkflow();
await verifyAdminBuilderControls();
await verifyPublicRouteSuppressesStaleOwnerChrome();
await verifyPreviewIsolationContract();

for (const [name, width, height] of viewports) {
  const page = await newSmokePage({
    viewport: { width, height },
    deviceScaleFactor: 1
  });

  const failedRequests = [];
  const pageErrors = [];

  page.on("requestfailed", (request) => {
    const url = request.url();
    const failureText = request.failure()?.errorText || "failed";
    if (url.endsWith("/favicon.ico")) return;
    if (url.endsWith("/.image-slots.state.json")) return;
    if (
      failureText === "net::ERR_ABORTED" &&
      (url.endsWith("/favicon.svg") || url.endsWith("/covermate-firebase.js"))
    ) {
      return;
    }
    if (
      url.includes("firestore.googleapis.com/google.firestore") &&
      (failureText === "net::ERR_ABORTED" ||
        failureText === "net::ERR_NETWORK_CHANGED" ||
        failureText.startsWith("net::ERR_QUIC_PROTOCOL_ERROR"))
    ) {
      return;
    }
    if (failureText === "net::ERR_ABORTED" && url.includes("www.gstatic.com/firebasejs/")) {
      return;
    }
    if (failureText === "net::ERR_ABORTED" && url.includes("google-analytics.com/g/collect")) {
      return;
    }
    if (failureText === "net::ERR_ABORTED" && (url.startsWith("blob:") || url.includes("/admin/login"))) {
      return;
    }
    failedRequests.push(`${url} :: ${failureText}`);
  });
  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    if (status < 400) return;
    if (url.endsWith("/favicon.ico")) return;
    if (url.endsWith("/.image-slots.state.json")) return;
    failedRequests.push(`${url} :: HTTP ${status}`);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const [route, selector] of routes) {
    const url = new URL(route, baseUrl).toString();
    await page.goto(url, { waitUntil: "commit", timeout: 30000 });
    await page.waitForFunction(() => Boolean(document.body), null, { timeout: 10000 });
    const firstPaintState = await page.evaluate(() => {
      const isVisible = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const splashVisible = ["#__bundler_thumbnail", "#__bundler_loading"].some((selector) =>
        isVisible(document.querySelector(selector))
      );
      const xdc = document.querySelector("x-dc");
      const visibleText = document.body.innerText || "";
      return {
        splashVisible,
        rawTemplateVisible: Boolean(xdc && isVisible(xdc) && /{{|}}/.test(xdc.textContent || "")),
        rawVisibleText: /{{|}}/.test(visibleText),
        visibleText: visibleText.slice(0, 140)
      };
    });
    if (firstPaintState.splashVisible) {
      failures.push(`${name} ${route}: exported bundler splash is visible on first paint`);
    }
    if (firstPaintState.rawTemplateVisible || firstPaintState.rawVisibleText) {
      failures.push(
        `${name} ${route}: raw template is visible on first paint (${firstPaintState.visibleText})`
      );
    }
    await page.waitForFunction(
      (targetSelector) => Boolean(document.querySelector(targetSelector)) && (document.body.innerText || "").trim().length > 40,
      selector,
      { timeout: 30000 }
    );
    await page.waitForTimeout(600);
    if (route === "/#motor" || route === "/#life") {
      const aliasState = await page.evaluate((targetId) => {
        const header = document.querySelector("header");
        const target = document.getElementById(targetId);
        const headerRect = header ? header.getBoundingClientRect() : null;
        const targetRect = target ? target.getBoundingClientRect() : null;
      const navHrefs = Array.from(document.querySelectorAll("header nav a[href]"))
        .map((anchor) => anchor.getAttribute("href"))
        .filter(Boolean);
      const navText = Array.from(document.querySelectorAll("header nav a[href]"))
        .map((anchor) => (anchor.textContent || "").trim())
        .filter(Boolean)
        .join(" | ");
      const navLabels = Array.from(document.querySelectorAll("header nav a[href]"))
        .map((anchor) => (anchor.textContent || "").trim())
        .filter(Boolean);
      return {
        navHrefs,
        navText,
        navLabels,
        bodyText: document.body.innerText,
        headerBottom: headerRect ? headerRect.bottom : 0,
        targetTop: targetRect ? targetRect.top : null,
        viewportHeight: window.innerHeight,
          targetScrollMarginTop: target ? window.getComputedStyle(target).scrollMarginTop : ""
        };
      }, route === "/#motor" ? "insurers" : "cover");
      const expectedMainNav = ["#cover", "#review", "#insurers", "#fit", "#faq"];
      const missingMainNav = expectedMainNav.filter((href) => !aliasState.navHrefs.includes(href));
      if (missingMainNav.length) {
        failures.push(`${name} ${route}: alias should keep main nav, missing ${missingMainNav.join(", ")}`);
      }
      if (aliasState.navHrefs.includes("#motor-cover") || aliasState.navHrefs.includes("#life-cover")) {
        failures.push(`${name} ${route}: alias exposed hidden focus-variant nav`);
      }
      const duplicateNavLabels = aliasState.navLabels.filter(
        (label, index, labels) => labels.indexOf(label) !== index
      );
      if (duplicateNavLabels.length) {
        failures.push(`${name} ${route}: duplicate header nav labels ${duplicateNavLabels.join(", ")}`);
      }
      if (/เบี้ยรถคันเดิม|One car, every insurer compared|ตอนที่ต้องใช้จริง|Nobody reads the policy/.test(aliasState.bodyText)) {
        failures.push(`${name} ${route}: hidden focus landing variant rendered`);
      }
      if (
        aliasState.targetTop == null ||
        aliasState.targetTop < aliasState.headerBottom + 4 ||
        aliasState.targetTop > aliasState.viewportHeight * 0.72
      ) {
        failures.push(
          `${name} ${route}: alias did not land on the intended main section below the sticky header ` +
            `(top=${aliasState.targetTop}, headerBottom=${aliasState.headerBottom})`
        );
      }
      if (!aliasState.targetScrollMarginTop || aliasState.targetScrollMarginTop === "0px") {
        failures.push(`${name} ${route}: alias target anchor is missing scroll-margin-top`);
      }
    }
    if (motorSectionRoutes.has(route)) {
      const insurers = page.locator("#insurers");
      if (await insurers.count()) {
        await insurers.scrollIntoViewIfNeeded();
        await page.waitForTimeout(900);
      }
    }

    const state = await page.evaluate((targetSelector) => {
      const root = document.documentElement;
      const target = document.querySelector(targetSelector);
      const visibleInsurerLogoEls = Array.from(
        document.querySelectorAll("#insurers img, #insurers [role='img']")
      ).filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      });
      const logos = visibleInsurerLogoEls.map((el) => {
        const style = window.getComputedStyle(el);
        const isImg = el.tagName === "IMG";
        return {
          src: isImg ? el.getAttribute("src") : style.backgroundImage,
          complete: isImg ? el.complete : style.backgroundImage !== "none",
          naturalWidth: isImg ? el.naturalWidth : Math.round(el.getBoundingClientRect().width),
          naturalHeight: isImg ? el.naturalHeight : Math.round(el.getBoundingClientRect().height)
        };
      });
      const bodyText = document.body.innerText;
      const insurerText = document.querySelector("#insurers")?.innerText || "";
      const selectOptions = Array.from(document.querySelectorAll("select")).map((select) =>
        Array.from(select.options).map((option) => option.textContent || "").join(" ")
      );
      const navHrefs = Array.from(document.querySelectorAll("header a[href], nav a[href]"))
        .map((anchor) => anchor.getAttribute("href"))
        .filter(Boolean);
      const headerNavLabels = Array.from(document.querySelectorAll("header nav a[href]"))
        .map((anchor) => (anchor.textContent || "").trim())
        .filter(Boolean);
      const headerCtaText = Array.from(document.querySelectorAll("header a[href]"))
        .map((anchor) => (anchor.textContent || "").replace(/\s+/g, " ").trim())
        .filter((text) => /LINE|ไลน์/i.test(text))
        .join(" | ");
      const missingAnchors = navHrefs.filter(
        (href) => href.startsWith("#") && !document.getElementById(href.slice(1))
      );
      const jsonLdText = document.getElementById("covermate-jsonld")?.textContent || "";
      let jsonLd = null;
      try {
        jsonLd = jsonLdText ? JSON.parse(jsonLdText) : null;
      } catch {
        jsonLd = null;
      }
      const splashVisible = ["#__bundler_thumbnail", "#__bundler_loading"].some((selector) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          rect.width > 0 &&
          rect.height > 0
        );
      });

      return {
        title: document.title,
        hasTarget: Boolean(target),
        sectionIds: Array.from(document.querySelectorAll("section[id]")).map((section) => section.id),
        h1Text: Array.from(document.querySelectorAll("h1")).map((heading) =>
          (heading.textContent || "").trim()
        ).join(" | "),
        contactHeadingText: document.querySelector("#talk h2")?.textContent || "",
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        bodyFont: window.getComputedStyle(document.body).fontFamily,
        h1Font: document.querySelector("h1")
          ? window.getComputedStyle(document.querySelector("h1")).fontFamily
          : "",
        logos,
        bodyText,
        insurerText,
        headerCtaText,
        placeholderStoriesVisible:
          Array.from(document.querySelectorAll("section#voices")).some((section) => {
            const rect = section.getBoundingClientRect();
            const style = window.getComputedStyle(section);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              style.opacity !== "0"
            );
          }) ||
          /รอความคิดเห็นจริง|ความคิดเห็นจากลูกค้าจะเผยแพร่ที่นี่|ยังไม่ได้ใส่รีวิวจริง|ใส่คำรีวิวจริง|Awaiting real feedback|Client feedback will appear here|Customer name|sample review/i.test(bodyText),
        hasQueryTypeSelect: selectOptions.some((text) =>
          /ขอใบเสนอราคา|Request a quote|Compare plans|เปรียบเทียบแผน/.test(text)
        ),
        hasCoverageSelect: selectOptions.some((text) =>
          /ประกันรถยนต์|Motor|Life|ประกันชีวิต/.test(text)
        ),
        adminMarker: window.localStorage.getItem("purich-admin-ever-v7"),
        hasPreviewBar: Boolean(document.querySelector("[data-admin-preview-bar]")),
        hasEditDock: Boolean(document.querySelector('[data-admin-owner-bar="edit"]')),
        hasAdminAside: (window.__covermateVisibleAdminAside ? window.__covermateVisibleAdminAside() : false),
        hasReopenBar: Boolean(document.querySelector('[data-admin-owner-bar="reopen"]')),
        htmlPreviewMode: document.documentElement.getAttribute("data-covermate-preview"),
        requiredConsentCheckboxCount:
          document.querySelectorAll('form input[type="checkbox"][aria-required="true"]').length,
        hasRelationshipProof: /AIA|Srikrung|ศรีกรุง/i.test(insurerText),
        missingAnchors,
        duplicateHeaderNavLabels: headerNavLabels.filter(
          (label, index, labels) => labels.indexOf(label) !== index
        ),
        splashVisible,
        seo: {
          htmlLang: document.documentElement.lang,
          description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
          robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") || "",
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
          ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "",
          ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute("content") || "",
          ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "",
          twitterCard: document.querySelector('meta[name="twitter:card"]')?.getAttribute("content") || "",
          jsonLdValid: Boolean(jsonLd && Array.isArray(jsonLd["@graph"])),
          jsonLdTypes: jsonLd && Array.isArray(jsonLd["@graph"])
            ? jsonLd["@graph"].flatMap((entry) => Array.isArray(entry["@type"]) ? entry["@type"] : [entry["@type"]]).filter(Boolean)
            : []
        }
      };
    }, selector);

    if (!state.hasTarget) failures.push(`${name} ${route}: missing ${selector}`);
    if (state.scrollWidth > state.clientWidth) {
      failures.push(
        `${name} ${route}: horizontal overflow ${state.scrollWidth} > ${state.clientWidth}`
      );
    }
    if (!state.bodyFont.includes("Google Sans Thai")) {
      failures.push(`${name} ${route}: body font is not Google Sans Thai (${state.bodyFont})`);
    }
    if (state.h1Font && !state.h1Font.includes("Google Sans Thai")) {
      failures.push(`${name} ${route}: heading font is not Google Sans Thai (${state.h1Font})`);
    }
    if (state.splashVisible) {
      failures.push(`${name} ${route}: exported bundler splash is visible`);
    }
    if (mainVisitorRoutes.has(route)) {
      if (!/^th($|-TH$)/i.test(state.seo.htmlLang)) {
        failures.push(`${name} ${route}: missing Thai html lang (${state.seo.htmlLang})`);
      }
      if (!state.title.includes("CoverMate") || state.title.length > 70) {
        failures.push(`${name} ${route}: SEO title is missing or too long (${state.title})`);
      }
      if (state.seo.description.length < 70 || state.seo.description.length > 170) {
        failures.push(`${name} ${route}: SEO description length is out of range (${state.seo.description.length})`);
      }
      if (!/^index,follow/.test(state.seo.robots)) {
        failures.push(`${name} ${route}: public route is not indexable (${state.seo.robots})`);
      }
      if (state.seo.canonical !== "https://covermate.vercel.app/") {
        failures.push(`${name} ${route}: canonical is not production root (${state.seo.canonical})`);
      }
      if (!state.seo.ogTitle || !state.seo.ogDescription || state.seo.ogImage !== "https://covermate.vercel.app/assets/covermate-og.png") {
        failures.push(`${name} ${route}: Open Graph metadata incomplete`);
      }
      if (
        /26/.test(state.seo.description) ||
        /26/.test(state.seo.ogDescription) ||
        /กว่า\s*14/.test(state.seo.description) ||
        /กว่า\s*14/.test(state.seo.ogDescription) ||
        /เทียบเบี้ยกว่า/.test(state.seo.description) ||
        /เทียบเบี้ยกว่า/.test(state.seo.ogDescription)
      ) {
        failures.push(`${name} ${route}: SEO fallback still contains stale or over-claiming insurer copy`);
      }
      if (state.seo.twitterCard !== "summary_large_image") {
        failures.push(`${name} ${route}: Twitter summary_large_image card missing`);
      }
      for (const type of ["WebSite", "WebPage", "InsuranceAgency", "Service"]) {
        if (!state.seo.jsonLdTypes.includes(type)) {
          failures.push(`${name} ${route}: JSON-LD missing ${type}`);
        }
      }
      if (!state.seo.jsonLdValid) {
        failures.push(`${name} ${route}: JSON-LD is missing or invalid`);
      }
    }
    if (route === "/admin/login" && !/^noindex/.test(state.seo.robots)) {
      failures.push(`${name} ${route}: admin login route is not noindex (${state.seo.robots})`);
    }
    if (state.bodyText.includes("[object Object]")) {
      failures.push(`${name} ${route}: rendered object placeholder text`);
    }
    if (mainVisitorRoutes.has(route) && !/ติดต่อทาง LINE|Contact on LINE/.test(state.headerCtaText)) {
      failures.push(`${name} ${route}: header CTA drifted from product copy (${state.headerCtaText})`);
    }
    if (mainVisitorRoutes.has(route) && state.placeholderStoriesVisible) {
      failures.push(`${name} ${route}: placeholder client stories/testimonials rendered publicly`);
    }
    if (route === "/") {
      const reviewIndex = state.sectionIds.indexOf("review");
      const howIndex = state.sectionIds.indexOf("how");
      const insurersIndex = state.sectionIds.indexOf("insurers");
      const fitIndex = state.sectionIds.indexOf("fit");
      if (!(reviewIndex >= 0 && howIndex > reviewIndex && insurersIndex > howIndex && fitIndex > insurersIndex)) {
        failures.push(`${name} ${route}: public section order should be review > how > insurers > resources (${state.sectionIds.join(", ")})`);
      }
    }
    if ((route === "/#motor" || route === "/#life") && state.missingAnchors.length) {
      failures.push(`${name} ${route}: header links target missing anchors ${state.missingAnchors.join(", ")}`);
    }
    if (visitorRoutes.has(route) && state.duplicateHeaderNavLabels.length) {
      failures.push(
        `${name} ${route}: duplicate header nav labels ${state.duplicateHeaderNavLabels.join(", ")}`
      );
    }
    if (
      visitorRoutes.has(route) &&
      (state.adminMarker ||
        state.hasPreviewBar ||
        state.hasEditDock ||
        state.hasAdminAside ||
        state.hasReopenBar ||
        state.htmlPreviewMode)
    ) {
      failures.push(`${name} ${route}: owner/admin chrome leaked into visitor route (${JSON.stringify({
        marker: state.adminMarker,
        hasPreviewBar: state.hasPreviewBar,
        hasEditDock: state.hasEditDock,
        hasAdminAside: state.hasAdminAside,
        hasReopenBar: state.hasReopenBar,
        htmlPreviewMode: state.htmlPreviewMode
      })})`);
    }
    if (route === "/#motor-focus") {
      for (const id of ["motor", "motor-trust", "motor-cover", "insurers", "how", "talk"]) {
        if (!state.sectionIds.includes(id)) {
          failures.push(`${name} ${route}: missing focused motor section #${id}`);
        }
      }
      if (!/เบี้ยรถคันเดิม|One car, every insurer compared/.test(state.h1Text)) {
        failures.push(`${name} ${route}: focused motor hero did not render`);
      }
      if (state.sectionIds.includes("hero") || state.sectionIds.includes("cover")) {
        failures.push(`${name} ${route}: focused motor route leaked main hero/cover sections`);
      }
    }
    if (route === "/#life-focus") {
      for (const id of ["life", "life-trust", "life-cover", "fit", "review", "how", "faq", "talk", "privacy"]) {
        if (!state.sectionIds.includes(id)) {
          failures.push(`${name} ${route}: missing focused life section #${id}`);
        }
      }
      if (!/ตอนที่ต้องใช้จริง|Nobody reads the policy/.test(state.h1Text)) {
        failures.push(`${name} ${route}: focused life hero did not render`);
      }
      if (state.sectionIds.includes("hero") || state.sectionIds.includes("insurers")) {
        failures.push(`${name} ${route}: focused life route leaked main hero/insurers sections`);
      }
    }
    if (motorSectionRoutes.has(route) && state.logos.length < 14) {
      failures.push(`${name} ${route}: expected at least 14 visible insurer logos, got ${state.logos.length}`);
    }
    const hasExactMotorCount = /14\s*(เจ้า|แห่ง|บริษัท)/.test(state.insurerText);
    if (motorSectionRoutes.has(route) && (!hasExactMotorCount || /26\s*เจ้า|26\s*แห่ง|26\s*บริษัท|กว่า\s*14/.test(state.insurerText))) {
      failures.push(`${name} ${route}: insurer section count copy is not aligned to the 14 visible logos`);
    }
    if (motorSectionRoutes.has(route) && !state.hasRelationshipProof) {
      failures.push(`${name} ${route}: insurer relationship proof cards missing AIA/Srikrung copy`);
    }
    if (visitorRoutes.has(route) && !state.hasQueryTypeSelect) {
      failures.push(`${name} ${route}: contact form is missing enquiry-type select options`);
    }
    if (visitorRoutes.has(route) && !state.hasCoverageSelect) {
      failures.push(`${name} ${route}: contact form is missing coverage select options`);
    }
    const expectedConsentCheckboxes = mainVisitorRoutes.has(route) ? 2 : 1;
    if (visitorRoutes.has(route) && state.requiredConsentCheckboxCount < expectedConsentCheckboxes) {
      failures.push(
        `${name} ${route}: public lead forms are missing required consent checkboxes (${state.requiredConsentCheckboxCount}/${expectedConsentCheckboxes})`
      );
    }
    if (mainVisitorRoutes.has(route) && !/เกิดอุบัติเหตุ|Claim help/i.test(state.bodyText)) {
      failures.push(`${name} ${route}: claim help section is missing`);
    }
    if (mainVisitorRoutes.has(route) && !/ไม่ต้องจำวันหมดอายุ|renewal dates/i.test(state.bodyText)) {
      failures.push(`${name} ${route}: renewal reminder section is missing`);
    }
    if (mainVisitorRoutes.has(route) && !/เราได้ค่าตอบแทน|ค่าตอบแทนของเรา|How CoverMate is compensated|commission comes from/i.test(state.bodyText)) {
      failures.push(`${name} ${route}: fee transparency section is missing`);
    }
    if (mainVisitorRoutes.has(route) && !/ข้อมูลที่คุณส่งมา|What happens to/i.test(state.bodyText)) {
      failures.push(`${name} ${route}: privacy / PDPA section is missing`);
    }
    if (mainVisitorRoutes.has(route) && /ขอรับ\s*\n\s*คำปรึกษา|Request a\s*\n\s*consultation/.test(state.contactHeadingText)) {
      failures.push(`${name} ${route}: contact heading uses a forced line break instead of the one-line product copy`);
    }
    const brokenLogo = state.logos.find((logo) => !logo.complete || !logo.naturalWidth);
    if (brokenLogo) failures.push(`${name} ${route}: broken logo ${brokenLogo.src}`);
  }

  const adminUrl = new URL("/admin", baseUrl).toString();
  const analyticsUrl = new URL("/admin/analytics", baseUrl).toString();
  await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await page.evaluate(() => {
    window.localStorage.removeItem("covermate-admin-session");
    window.localStorage.removeItem("purich-admin-ever-v7");
  });
  await page.goto(adminUrl, { waitUntil: "load", timeout: 30000 });
  await page.waitForURL(/\/admin\/login\/?$/, { timeout: 5000 }).catch(() => {});
  if (!page.url().includes("/admin/login")) {
    failures.push(`${name} /admin: expected unauthenticated redirect to /admin/login, got ${page.url()}`);
  }
  await page.goto(analyticsUrl, { waitUntil: "load", timeout: 30000 });
  await page.waitForURL(/\/admin\/login\/?$/, { timeout: 5000 }).catch(() => {});
  if (!page.url().includes("/admin/login")) {
    failures.push(`${name} /admin/analytics: expected unauthenticated redirect to /admin/login, got ${page.url()}`);
  }

  for (const ownerRoute of ["/#admin", "/#edit", "/#preview"]) {
    await page.goto(new URL(ownerRoute, baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
    await page.waitForURL(/\/admin\/login\/?$/, { timeout: 5000 }).catch(() => {});
    if (!page.url().includes("/admin/login")) {
      failures.push(
        `${name} ${ownerRoute}: expected unauthenticated redirect to /admin/login, got ${page.url()}`
      );
    }
  }

  await page.goto(new URL("/admin/login", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Sign in with Google/);
  await page.evaluate(() => window.localStorage.removeItem("covermate-admin-session"));
  const loginFlowState = await page.evaluate(() => ({
    text: document.body.innerText,
    bodyFont: window.getComputedStyle(document.body).fontFamily,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") || ""
  }));
  if (!loginFlowState.text.includes("Sign in with Google")) {
    failures.push(`${name} login: Google sign-in button did not render`);
  }
  if (!loginFlowState.text.includes("Firebase Auth")) {
    failures.push(`${name} login: Firebase Auth allowlist copy is missing`);
  }
  if (/Failed to resolve module|Firebase could not initialise|Firebase sign-in could not start/.test(loginFlowState.text)) {
    failures.push(`${name} login: Firebase module/load error is visible`);
  }
  if (loginFlowState.text.includes("[object Object]")) {
    failures.push(`${name} login: rendered object placeholder text`);
  }
  if (!loginFlowState.bodyFont.includes("Google Sans Thai")) {
    failures.push(`${name} login: launcher body font is not Google Sans Thai (${loginFlowState.bodyFont})`);
  }
  if (loginFlowState.scrollWidth > loginFlowState.clientWidth) {
    failures.push(`${name} login: horizontal overflow ${loginFlowState.scrollWidth} > ${loginFlowState.clientWidth}`);
  }
  if (!/^noindex/.test(loginFlowState.robots)) {
    failures.push(`${name} login: admin login metadata is not noindex (${loginFlowState.robots})`);
  }

  await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await page.evaluate(() => {
    window.localStorage.setItem(
      "covermate-admin-session",
      JSON.stringify({
        email: "owner@example.com",
        name: "Owner Smoke",
        pic: "",
        role: "owner",
        ts: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      })
    );
  });
  await page.route("**/covermate-firebase.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: adminPortalSessionMock()
    })
  );
  await page.route("**/api/ops/**", adminOpsApiMock);
  await page.goto(adminUrl, { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Admin Portal/);
  const adminState = await page.evaluate(() => ({
    text: document.body.innerText,
    moduleCards: Array.from(document.querySelectorAll("[data-admin-home-card]")).map((el) => ({
      kind: el.getAttribute("data-admin-home-card"),
      text: el.innerText,
      tag: el.tagName.toLowerCase(),
      action: el.getAttribute("data-action"),
      module: el.getAttribute("data-module")
    })),
    bodyFont: window.getComputedStyle(document.body).fontFamily,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") || ""
  }));
  if (!adminState.text.includes("Admin Portal") || !adminState.text.includes("Owner / Administrator · verified")) {
    failures.push(`${name} /admin: authenticated Admin Portal Home did not render`);
  }
  if (
    !adminState.text.includes("Live: leads/tasks/audit") ||
    !adminState.text.includes("Website CMS") ||
    !adminState.text.includes("First-party CoverMate records")
  ) {
    failures.push(`${name} /admin: single-shell live system status copy is missing`);
  }
  const launcherLabels = adminState.moduleCards.map((card) => {
    const firstLine = card.text.split("\n").map((part) => part.trim()).filter(Boolean)[0] || "";
    return firstLine;
  });
  const expectedLauncherLabels = ["Operations", "Website content", "Analytics", "Settings"];
  if (JSON.stringify(launcherLabels) !== JSON.stringify(expectedLauncherLabels)) {
    failures.push(`${name} /admin: expected module labels ${expectedLauncherLabels.join(" / ")}, got ${JSON.stringify(launcherLabels)}`);
  }
  if (adminState.moduleCards.length !== 4) {
    failures.push(`${name} /admin: expected 4 primary module cards, got ${adminState.moduleCards.length}`);
  }
  if (!adminState.moduleCards.some((card) => card.kind === "operations" && card.tag === "button" && card.action === "module" && card.module === "operations")) {
    failures.push(`${name} /admin: Operations card is not a same-shell module action`);
  }
  if (!adminState.moduleCards.some((card) => card.kind === "content" && card.tag === "button" && card.action === "module" && card.module === "content")) {
    failures.push(`${name} /admin: Website content card is not a same-shell module action`);
  }
  if (!adminState.moduleCards.some((card) => card.kind === "analytics" && card.tag === "button" && card.action === "module" && card.module === "analytics")) {
    failures.push(`${name} /admin: Analytics card is not a same-shell module action`);
  }
  if (!adminState.moduleCards.some((card) => card.kind === "settings" && card.tag === "button" && card.action === "module" && card.module === "settings")) {
    failures.push(`${name} /admin: Settings card is not a same-shell module action`);
  }
  if (/Manage your site|Edit the words|Arrange & customise|Unpacking/.test(adminState.text)) {
    failures.push(`${name} /admin: legacy launcher copy is visible`);
  }
  if (!adminState.text.includes("Public site") || !adminState.text.includes("Log out")) {
    failures.push(`${name} /admin: supporting Public site or Log out action is missing`);
  }
  if (adminState.text.includes("[object Object]")) {
    failures.push(`${name} /admin: rendered object placeholder text`);
  }
  if (!adminState.bodyFont.includes("Google Sans Thai")) {
    failures.push(`${name} /admin: launcher body font is not Google Sans Thai (${adminState.bodyFont})`);
  }
  if (adminState.scrollWidth > adminState.clientWidth) {
    failures.push(`${name} /admin: horizontal overflow ${adminState.scrollWidth} > ${adminState.clientWidth}`);
  }
  if (!/^noindex/.test(adminState.robots)) {
    failures.push(`${name} /admin: admin launcher metadata is not noindex (${adminState.robots})`);
  }

  await page.getByRole("link", { name: "Public site" }).click();
  await page.waitForFunction(
    () => window.location.pathname === "/" && !window.location.search && !window.location.hash,
    null,
    { timeout: 10000 }
  ).catch(() => {});
  await waitForBodyText(page, /CoverMate/);
  await page.waitForTimeout(500);
  const launcherPublicState = await page.evaluate(() => ({
    route: window.location.pathname + window.location.search + window.location.hash,
    marker: window.localStorage.getItem("purich-admin-ever-v7"),
    hasOwnerBar: (window.__covermateVisibleOwnerBarCount ? window.__covermateVisibleOwnerBarCount() > 0 : false),
    hasAdminAside: (window.__covermateVisibleAdminAside ? window.__covermateVisibleAdminAside() : false),
    text: document.body.innerText
  }));
  if (
    launcherPublicState.route !== "/" ||
    launcherPublicState.marker ||
    launcherPublicState.hasOwnerBar ||
    launcherPublicState.hasAdminAside ||
    /Manage your site|Admin Portal|Website content|Operations|Settings|Save draft|Publish/.test(launcherPublicState.text)
  ) {
    failures.push(`${name} /admin Public site: did not leave owner mode for clean public / (${JSON.stringify(launcherPublicState)})`);
  }
  await page.goto(adminUrl, { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Admin Portal/);

  const leadNow = Math.floor(Date.now() / 1000);
  const analyticsLocalOnlyMock = `
    window.CoverMateFirebase = {
      waitForAuth: async () => null,
      syncSessionFromCurrentUser: async () => ({ ok: false }),
      signOut: async () => {}
    };
    export {};
  `;
  const analyticsLocalOnlyPage = await newSmokePage({
    viewport: { width, height },
    deviceScaleFactor: 1
  });
  const analyticsLocalOnlyErrors = [];
  analyticsLocalOnlyPage.on("pageerror", (error) => analyticsLocalOnlyErrors.push(error.message));
  await analyticsLocalOnlyPage.route("**/covermate-firebase.js", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: analyticsLocalOnlyMock })
  );
  await analyticsLocalOnlyPage.addInitScript(() => {
    window.localStorage.setItem(
      "covermate-admin-session",
      JSON.stringify({
        email: "owner@example.com",
        name: "Owner",
        pic: "",
        ts: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      })
    );
  });
  await analyticsLocalOnlyPage.goto(analyticsUrl, { waitUntil: "load", timeout: 30000 });
  await analyticsLocalOnlyPage.waitForURL(/\/admin\/login\/?$/, { timeout: 5000 }).catch(() => {});
  const analyticsLocalOnlyState = {
    url: analyticsLocalOnlyPage.url(),
    text: await analyticsLocalOnlyPage.locator("body").innerText().catch(() => "")
  };
  await analyticsLocalOnlyPage.close();
  if (!analyticsLocalOnlyState.url.includes("/admin/login")) {
    failures.push(`${name} /admin/analytics: localStorage-only session was not rejected (${analyticsLocalOnlyState.url})`);
  }
  if (/Recent leads|Leads saved|Visitor funnel/.test(analyticsLocalOnlyState.text)) {
    failures.push(`${name} /admin/analytics: localStorage-only session exposed analytics dashboard text`);
  }
  if (analyticsLocalOnlyErrors.length) {
    failures.push(`${name} /admin/analytics localStorage-only auth: ${analyticsLocalOnlyErrors.join(" | ")}`);
  }

  const analyticsMock = `
    window.CoverMateFirebase = {
      waitForAuth: async () => ({ uid: "owner-smoke", email: "owner@example.com" }),
      syncSessionFromCurrentUser: async () => ({
        ok: true,
        session: {
          email: "owner@example.com",
          name: "Owner",
          pic: "",
          ts: Date.now(),
          exp: Date.now() + 7 * 24 * 60 * 60 * 1000
        }
      }),
      loadContactLeads: async () => [
        { id: "lead-1", name: "Ari", contact: "LINE ari", qtype: "quote", coverage: "motor", topic: "Motor quote", summary: "Motor quote", status: "new", read: false, createdAt: { seconds: ${leadNow} } },
        { id: "lead-2", name: "Ben", contact: "088-000-0000", qtype: "compare", coverage: "health", topic: "Health compare", summary: "Health compare", status: "new", read: true, createdAt: { seconds: ${leadNow - 86400 * 3} } }
      ],
      signOut: async () => {}
    };
    export {};
  `;
  const analyticsPage = await newSmokePage({
    viewport: { width, height },
    deviceScaleFactor: 1
  });
  const analyticsFailedRequests = [];
  const analyticsPageErrors = [];
  analyticsPage.on("requestfailed", (request) => {
    const url = request.url();
    if (url.endsWith("/favicon.ico")) return;
    analyticsFailedRequests.push(`${url} ${request.failure()?.errorText || "failed"}`);
  });
  analyticsPage.on("pageerror", (error) => analyticsPageErrors.push(error.message));
  await analyticsPage.route("**/covermate-firebase.js", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: analyticsMock })
  );
  await analyticsPage.addInitScript(() => {
    window.localStorage.setItem(
      "covermate-admin-session",
      JSON.stringify({
        email: "owner@example.com",
        name: "Owner",
        pic: "",
        ts: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      })
    );
  });
  await analyticsPage.goto(analyticsUrl, { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(analyticsPage, /Analytics/);
  await analyticsPage.waitForTimeout(900);
  const analyticsState = await analyticsPage.evaluate(() => ({
    text: document.body.innerText,
    leadKpi: document.querySelector('[data-kpi="leads"]')?.textContent?.trim() || "",
    leadNames: Array.from(document.querySelectorAll("#recent-leads td:nth-child(2)")).map((cell) =>
      (cell.textContent || "").trim()
    ),
    bodyFont: window.getComputedStyle(document.body).fontFamily,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") || "",
    hasGtag: Boolean(document.querySelector('script[src*="googletagmanager"], script[src*="google-analytics"]')),
    chartCount: document.querySelectorAll("svg[role='img']").length,
    rows: document.querySelectorAll("#recent-leads tr").length
  }));
  await analyticsPage.close();
  if (!analyticsState.text.includes("G-5TF3C235EF") || !analyticsState.text.includes("Visitor funnel") || !analyticsState.text.includes("Lead trend")) {
    failures.push(`${name} /admin/analytics: analytics dashboard core sections missing`);
  }
  if (analyticsState.leadKpi !== "2" || !analyticsState.leadNames.includes("Ari") || !analyticsState.leadNames.includes("Ben")) {
    failures.push(`${name} /admin/analytics: mocked Firestore lead data did not render`);
  }
  if (analyticsState.hasGtag) {
    failures.push(`${name} /admin/analytics: admin analytics page loaded visitor GA scripts`);
  }
  if (analyticsState.chartCount < 2) {
    failures.push(`${name} /admin/analytics: expected funnel and lead trend SVG charts`);
  }
  if (analyticsState.rows < 2) {
    failures.push(`${name} /admin/analytics: recent leads table did not render mocked rows`);
  }
  if (analyticsState.text.includes("[object Object]")) {
    failures.push(`${name} /admin/analytics: rendered object placeholder text`);
  }
  if (!analyticsState.bodyFont.includes("Google Sans Thai")) {
    failures.push(`${name} /admin/analytics: body font is not Google Sans Thai (${analyticsState.bodyFont})`);
  }
  if (analyticsState.scrollWidth > analyticsState.clientWidth) {
    failures.push(`${name} /admin/analytics: horizontal overflow ${analyticsState.scrollWidth} > ${analyticsState.clientWidth}`);
  }
  if (!/^noindex/.test(analyticsState.robots)) {
    failures.push(`${name} /admin/analytics: analytics metadata is not noindex (${analyticsState.robots})`);
  }
  if (analyticsFailedRequests.length) failures.push(`${name} /admin/analytics: ${analyticsFailedRequests.join(" | ")}`);
  if (analyticsPageErrors.length) failures.push(`${name} /admin/analytics: ${analyticsPageErrors.join(" | ")}`);

  await page.goto(new URL("/#admin", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Admin portal/);
  const ownerPanelState = await page.evaluate(() => ({
    text: document.body.innerText,
    bodyFont: window.getComputedStyle(document.body).fontFamily,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    adminTabs: ["Sections", "Content", "Brand & contact", "Theme & data", "Versions"].map((label) => {
      const button = Array.from(document.querySelectorAll("button")).find(
        (el) => (el.textContent || "").trim() === label
      );
      if (!button) return { label, exists: false };
      const rect = button.getBoundingClientRect();
      return {
        label,
        exists: true,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height
      };
    }),
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") || ""
  }));
  if (!ownerPanelState.text.includes("Admin portal")) {
    failures.push(`${name} /#admin: owner control panel did not render`);
  }
  if (!ownerPanelState.text.includes("Versions")) {
    failures.push(`${name} /#admin: versions/history tab is missing`);
  }
  if (ownerPanelState.text.includes("[object Object]")) {
    failures.push(`${name} /#admin: rendered object placeholder text`);
  }
  for (const tab of ownerPanelState.adminTabs) {
    if (!tab.exists) {
      failures.push(`${name} /#admin: missing admin tab ${tab.label}`);
    } else if (
      tab.left < 0 ||
      tab.right > ownerPanelState.clientWidth ||
      tab.width < 44 ||
      tab.height < 36
    ) {
      failures.push(`${name} /#admin: admin tab ${tab.label} is clipped or too small`);
    }
  }
  if (!ownerPanelState.bodyFont.includes("Google Sans Thai")) {
    failures.push(`${name} /#admin: owner panel body font is not Google Sans Thai (${ownerPanelState.bodyFont})`);
  }
  if (ownerPanelState.scrollWidth > ownerPanelState.clientWidth) {
    failures.push(`${name} /#admin: horizontal overflow ${ownerPanelState.scrollWidth} > ${ownerPanelState.clientWidth}`);
  }
  if (!/^noindex/.test(ownerPanelState.robots)) {
    failures.push(`${name} /#admin: owner panel metadata is not noindex (${ownerPanelState.robots})`);
  }
  if (
    !ownerPanelState.text.includes("Edit text") ||
    !ownerPanelState.text.includes("Main") ||
    !ownerPanelState.text.includes("Public site") ||
    !ownerPanelState.text.includes("Log out") ||
    !ownerPanelState.text.includes("Publish")
  ) {
    failures.push(`${name} /#admin: admin utility actions are missing`);
  }

  for (const [tabName, expectedText] of [
    ["Content", "ITEM 1"],
    ["Brand & contact", "Credential line"],
    ["Theme & data", "SEO"],
    ["Versions", "Every Publish is saved here"]
  ]) {
    await page.getByRole("button", { name: tabName, exact: true }).click();
    await page.waitForTimeout(500);
    const tabState = await page.evaluate(() => ({
      text: document.body.innerText,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    if (!tabState.text.includes(expectedText)) {
      failures.push(`${name} /#admin ${tabName}: expected tab content missing`);
    }
    if (tabState.text.includes("[object Object]")) {
      failures.push(`${name} /#admin ${tabName}: rendered object placeholder text`);
    }
    if (tabState.scrollWidth > tabState.clientWidth) {
      failures.push(`${name} /#admin ${tabName}: horizontal overflow ${tabState.scrollWidth} > ${tabState.clientWidth}`);
    }
  }

  await page.getByLabel("Close admin panel").click();
  await page.waitForFunction(
    () => window.location.pathname === "/" && !window.location.search && !window.location.hash,
    null,
    { timeout: 10000 }
  ).catch(() => {});
  await waitForBodyText(page, /CoverMate/);
  await page.waitForTimeout(500);
  const closedAdminState = await page.evaluate(() => {
    const bar = document.querySelector('[data-admin-owner-bar="reopen"]');
    const rect = bar ? bar.getBoundingClientRect() : null;
    const style = bar ? window.getComputedStyle(bar) : null;
    return {
      hasAside: (window.__covermateVisibleAdminAside ? window.__covermateVisibleAdminAside() : false),
      hasBar: Boolean(bar),
      barVisible: Boolean(
        bar &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          rect.width > 0 &&
          rect.height > 0
      ),
      adminMarker: window.localStorage.getItem("purich-admin-ever-v7"),
      route: window.location.pathname + window.location.search + window.location.hash,
      text: document.body.innerText,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  });
  if (closedAdminState.hasAside) {
    failures.push(`${name} /#admin close: drawer stayed visible after X`);
  }
  if (closedAdminState.hasBar || closedAdminState.barVisible) {
    failures.push(`${name} /#admin close: owner chrome marker/bar leaked after closing (${JSON.stringify(closedAdminState)})`);
  }
  if (
    closedAdminState.route !== "/" ||
    closedAdminState.adminMarker ||
    /Admin Portal|Admin portal|Text edit|Save draft|Publish|Manage your site/.test(closedAdminState.text)
  ) {
    failures.push(`${name} /#admin close: did not return to clean public / (${JSON.stringify(closedAdminState)})`);
  }
  if (closedAdminState.scrollWidth > closedAdminState.clientWidth) {
    failures.push(`${name} /#admin close: horizontal overflow ${closedAdminState.scrollWidth} > ${closedAdminState.clientWidth}`);
  }
  await page.goto(new URL("/#admin", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Admin portal/);
  await page.getByRole("button", { name: "Public site" }).last().click();
  await page.waitForFunction(
    () => window.location.pathname === "/" && !window.location.search && !window.location.hash,
    null,
    { timeout: 10000 }
  ).catch(() => {});
  await waitForBodyText(page, /CoverMate/);
  await page.waitForTimeout(500);
  const publicReturnState = await page.evaluate(() => ({
    route: window.location.pathname + window.location.search + window.location.hash,
    hasOwnerBar: (window.__covermateVisibleOwnerBarCount ? window.__covermateVisibleOwnerBarCount() > 0 : false),
    hasAdminAside: (window.__covermateVisibleAdminAside ? window.__covermateVisibleAdminAside() : false),
    adminMarker: window.localStorage.getItem("purich-admin-ever-v7"),
    text: document.body.innerText
  }));
  if (
    publicReturnState.route !== "/" ||
    publicReturnState.hasOwnerBar ||
    publicReturnState.hasAdminAside ||
    publicReturnState.adminMarker ||
    /Admin Portal|Admin portal|Text edit|Save draft|Publish|Manage your site/.test(publicReturnState.text)
  ) {
    failures.push(`${name} /#admin Public site: did not leave owner mode for clean public / (${JSON.stringify(publicReturnState)})`);
  }

  await page.goto(new URL("/#preview", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Draft preview · visitors don’t see this until you publish/);
  const previewState = await page.evaluate(() => ({
    route: window.location.pathname + window.location.search + window.location.hash,
    text: document.body.innerText,
    marker: window.localStorage.getItem("purich-admin-ever-v7"),
    previewBarCount: document.querySelectorAll("[data-admin-preview-bar]").length,
    previewBarText: document.querySelector("[data-admin-preview-bar]")?.innerText || "",
    ownerBars: Array.from(document.querySelectorAll("[data-admin-owner-bar]")).map((el) => el.getAttribute("data-admin-owner-bar")),
    hasPreviewBar: Boolean(document.querySelector('[data-admin-owner-bar="preview"], [data-admin-preview-bar]')),
    hasEditDock: Boolean(document.querySelector('[data-admin-owner-bar="edit"]')),
    hasAdminAside: (window.__covermateVisibleAdminAside ? window.__covermateVisibleAdminAside() : false),
    hasReopenBar: Boolean(document.querySelector('[data-admin-owner-bar="reopen"]')),
    htmlPreviewMode: document.documentElement.getAttribute("data-covermate-preview"),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  if (previewState.route !== "/#preview") {
    failures.push(`${name} /#preview: expected preview hash, got ${previewState.route}`);
  }
  if (
    !previewState.text.includes("Draft preview · visitors don’t see this until you publish") ||
    !previewState.text.includes("Open editor") ||
    !previewState.text.includes("Public site") ||
    !previewState.text.includes("Publish")
  ) {
    failures.push(`${name} /#preview: draft preview top bar actions missing`);
  }
  if (
    previewState.marker ||
    previewState.previewBarCount !== 1 ||
    previewState.hasEditDock ||
    previewState.hasAdminAside ||
    previewState.hasReopenBar ||
    previewState.ownerBars.length ||
    previewState.htmlPreviewMode !== "true"
  ) {
    failures.push(`${name} /#preview: editor dock/admin drawer leaked into preview mode`);
  }
  if (previewState.scrollWidth > previewState.clientWidth) {
    failures.push(`${name} /#preview: horizontal overflow ${previewState.scrollWidth} > ${previewState.clientWidth}`);
  }

  await page.goto(new URL("/#edit", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await page.locator('[data-admin-owner-bar="edit"]').waitFor({ state: "visible", timeout: 10000 });
  const editState = await page.evaluate(() => ({
    text: document.body.innerText,
    toolbarText: document.querySelector('[data-admin-owner-bar="edit"]')?.innerText || "",
    bodyFont: window.getComputedStyle(document.body).fontFamily,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    editableCount: document.querySelectorAll('[contenteditable="true"], textarea, input').length,
    contentEditableCount: document.querySelectorAll('[contenteditable="true"]').length,
    toolbarVisible: Boolean(document.querySelector('[data-admin-owner-bar="edit"]')),
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") || ""
  }));
  if (!editState.toolbarVisible) {
    failures.push(`${name} /#edit: owner edit toolbar is missing`);
  }
  if (
    !editState.toolbarText.includes("Editing") ||
    editState.toolbarText.includes("Mode") ||
    editState.toolbarText.includes("Text edit") ||
    editState.toolbarText.includes("Panel open") ||
    !editState.toolbarText.includes("Tools") ||
    editState.toolbarText.includes("Close")
  ) {
    failures.push(`${name} /#edit: compact edit toolbar should show Editing + Tools, without Mode/Text edit/Close`);
  }
  await page.locator('[data-admin-owner-bar="edit"] .cm-owner-dock__summary').click();
  await page.waitForTimeout(150);
  const editToolsState = await page.evaluate(() => {
    const bar = document.querySelector('[data-admin-owner-bar="edit"]');
    const toggle = bar?.querySelector("#covermate-owner-tools-toggle");
    const panel = bar?.querySelector("#covermate-owner-tools-panel");
    const panelStyle = panel ? window.getComputedStyle(panel) : null;
    return {
      open: Boolean(toggle?.checked) && panelStyle?.visibility !== "hidden" && panelStyle?.opacity !== "0",
      toolbarText: bar?.innerText || ""
    };
  });
  if (!editToolsState.open) {
    failures.push(`${name} /#edit: edit toolbar tools did not expand`);
  }
  if (
    !editToolsState.toolbarText.includes("Panel") ||
    !editToolsState.toolbarText.includes("Main") ||
    !editToolsState.toolbarText.includes("Public site") ||
    !editToolsState.toolbarText.includes("Save draft") ||
    !editToolsState.toolbarText.includes("Preview") ||
    !editToolsState.toolbarText.includes("Publish") ||
    !editToolsState.toolbarText.includes("Log out") ||
    editToolsState.toolbarText.includes("Close")
  ) {
    failures.push(`${name} /#edit: expanded edit toolbar owner actions are missing or still show Close`);
  }
  if (editState.contentEditableCount < 20) {
    failures.push(`${name} /#edit: expected editable page text, got ${editState.contentEditableCount}`);
  }
  if (editState.editableCount < 20) {
    failures.push(`${name} /#edit: expected editable text controls, got ${editState.editableCount}`);
  }
  if (editState.text.includes("[object Object]")) {
    failures.push(`${name} /#edit: rendered object placeholder text`);
  }
  if (!editState.bodyFont.includes("Google Sans Thai")) {
    failures.push(`${name} /#edit: body font is not Google Sans Thai (${editState.bodyFont})`);
  }
  if (editState.scrollWidth > editState.clientWidth) {
    failures.push(`${name} /#edit: horizontal overflow ${editState.scrollWidth} > ${editState.clientWidth}`);
  }
  if (!/^noindex/.test(editState.robots)) {
    failures.push(`${name} /#edit: edit mode metadata is not noindex (${editState.robots})`);
  }

  await page.locator('[data-admin-owner-bar="edit"]').getByRole("button", { name: "Panel" }).click();
  await page.waitForTimeout(400);
  const editPanelState = await page.evaluate(() => ({
    toolbarText: document.querySelector('[data-admin-owner-bar="edit"]')?.innerText || "",
    hasAdminAside: (window.__covermateVisibleAdminAside ? window.__covermateVisibleAdminAside() : false),
    toolsOpen: Boolean(document.querySelector('[data-admin-owner-bar="edit"] #covermate-owner-tools-toggle')?.checked),
    contentEditableCount: document.querySelectorAll('[contenteditable="true"]').length
  }));
  if (!editPanelState.hasAdminAside) {
    failures.push(`${name} /#edit panel: admin drawer did not open from Tools`);
  }
  if (!editPanelState.toolbarText.includes("Panel") || !editPanelState.toolbarText.includes("Editing")) {
    failures.push(`${name} /#edit panel: owner dock did not show editing + panel status (${editPanelState.toolbarText})`);
  }
  if (editPanelState.toolsOpen) {
    failures.push(`${name} /#edit panel: Tools menu stayed expanded after opening Panel`);
  }
  if (editPanelState.contentEditableCount < 20) {
    failures.push(`${name} /#edit panel: text editing stopped while panel was open`);
  }

  await page.getByRole("button", { name: "Close admin panel" }).click();
  await page.waitForFunction(
    () => window.location.pathname === "/" && !window.location.search && !window.location.hash,
    null,
    { timeout: 10000 }
  ).catch(() => {});
  await waitForBodyText(page, /CoverMate/);
  await page.waitForTimeout(400);
  const editPanelClosedState = await page.evaluate(() => ({
    route: window.location.pathname + window.location.search + window.location.hash,
    adminMarker: window.localStorage.getItem("purich-admin-ever-v7"),
    toolbarVisible: Boolean(document.querySelector('[data-admin-owner-bar="edit"]')),
    hasOwnerBar: (window.__covermateVisibleOwnerBarCount ? window.__covermateVisibleOwnerBarCount() > 0 : false),
    hasAdminAside: (window.__covermateVisibleAdminAside ? window.__covermateVisibleAdminAside() : false),
    contentEditableCount: document.querySelectorAll('[contenteditable="true"]').length,
    text: document.body.innerText,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  if (editPanelClosedState.contentEditableCount !== 0) {
    failures.push(`${name} /#edit panel close: contenteditable fields remained active`);
  }
  if (
    editPanelClosedState.route !== "/" ||
    editPanelClosedState.adminMarker ||
    editPanelClosedState.toolbarVisible ||
    editPanelClosedState.hasOwnerBar ||
    editPanelClosedState.hasAdminAside ||
    /Editing on page|Admin Portal|Admin portal|Text edit|Save draft|Publish|Manage your site/.test(editPanelClosedState.text)
  ) {
    failures.push(`${name} /#edit panel close: did not exit to clean public / (${JSON.stringify(editPanelClosedState)})`);
  }
  if (editPanelClosedState.scrollWidth > editPanelClosedState.clientWidth) {
    failures.push(`${name} /#edit panel close: horizontal overflow ${editPanelClosedState.scrollWidth} > ${editPanelClosedState.clientWidth}`);
  }

  await page.goto(adminUrl, { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Admin Portal/);
  await page.getByRole("button", { name: "Log out" }).first().click();
  await page.waitForURL(/\/admin\/login\/?$/, { timeout: 5000 }).catch(() => {});
  if (!page.url().includes("/admin/login")) {
    failures.push(`${name} /admin sign out: expected /admin/login, got ${page.url()}`);
  }

  if (failedRequests.length) failures.push(`${name}: ${failedRequests.join(" | ")}`);
  if (pageErrors.length) failures.push(`${name}: ${pageErrors.join(" | ")}`);
  await page.close();
}

await browser.close();

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`CoverMate smoke passed for ${baseUrl}`);
process.exit(0);
