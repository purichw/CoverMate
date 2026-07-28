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
  ["/admin/login", "main"]
];

const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath
});

const failures = [];

for (const [name, width, height] of viewports) {
  const page = await browser.newPage({
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
    if (url.includes("%7B%7B") || url.includes("{{")) return;
    if (failureText === "net::ERR_ABORTED" && (url.startsWith("blob:") || url.includes("/admin/login"))) {
      return;
    }
    failedRequests.push(`${url} :: ${failureText}`);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const [route, selector] of routes) {
    const url = new URL(route, baseUrl).toString();
    await page.goto(url, { waitUntil: "commit", timeout: 30000 });
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
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.waitForTimeout(600);
    if (route === "/" || route === "/#motor") {
      const insurers = page.locator("#insurers");
      if (await insurers.count()) {
        await insurers.scrollIntoViewIfNeeded();
        await page.waitForTimeout(900);
      }
    }

    const state = await page.evaluate((targetSelector) => {
      const root = document.documentElement;
      const target = document.querySelector(targetSelector);
      const visibleInsurerImages = Array.from(document.querySelectorAll("#insurers img"))
        .filter((img) => {
          const rect = img.getBoundingClientRect();
          const style = window.getComputedStyle(img);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        });
      const logos = visibleInsurerImages.map(
        (img) => ({
          src: img.getAttribute("src"),
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        })
      );
      const bodyText = document.body.innerText;
      const insurerText = document.querySelector("#insurers")?.innerText || "";
      const selectOptions = Array.from(document.querySelectorAll("select")).map((select) =>
        Array.from(select.options).map((option) => option.textContent || "").join(" ")
      );
      const navHrefs = Array.from(document.querySelectorAll("header a[href], nav a[href]"))
        .map((anchor) => anchor.getAttribute("href"))
        .filter(Boolean);
      const missingAnchors = navHrefs.filter(
        (href) => href.startsWith("#") && !document.getElementById(href.slice(1))
      );
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
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        bodyFont: window.getComputedStyle(document.body).fontFamily,
        h1Font: document.querySelector("h1")
          ? window.getComputedStyle(document.querySelector("h1")).fontFamily
          : "",
        logos,
        bodyText,
        insurerText,
        hasQueryTypeSelect: selectOptions.some((text) =>
          /ขอใบเสนอราคา|Request a quote|Compare plans|เปรียบเทียบแผน/.test(text)
        ),
        hasCoverageSelect: selectOptions.some((text) =>
          /ประกันรถยนต์|Motor|Life|ประกันชีวิต/.test(text)
        ),
        hasRelationshipProof: /AIA|Srikrung|ศรีกรุง/i.test(insurerText),
        missingAnchors,
        splashVisible
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
    if (state.bodyText.includes("[object Object]")) {
      failures.push(`${name} ${route}: rendered object placeholder text`);
    }
    if (route === "/#motor" && state.missingAnchors.length) {
      failures.push(`${name} ${route}: header links target missing anchors ${state.missingAnchors.join(", ")}`);
    }
    if ((route === "/" || route === "/#motor") && state.logos.length < 14) {
      failures.push(`${name} ${route}: expected at least 14 visible insurer logos, got ${state.logos.length}`);
    }
    if ((route === "/" || route === "/#motor") && !state.hasRelationshipProof) {
      failures.push(`${name} ${route}: insurer relationship proof cards missing AIA/Srikrung copy`);
    }
    if ((route === "/" || route === "/#motor") && !state.hasQueryTypeSelect) {
      failures.push(`${name} ${route}: contact form is missing enquiry-type select options`);
    }
    if ((route === "/" || route === "/#motor") && !state.hasCoverageSelect) {
      failures.push(`${name} ${route}: contact form is missing coverage select options`);
    }
    const brokenLogo = state.logos.find((logo) => !logo.complete || !logo.naturalWidth);
    if (brokenLogo) failures.push(`${name} ${route}: broken logo ${brokenLogo.src}`);
  }

  const adminUrl = new URL("/admin", baseUrl).toString();
  await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => {
    window.localStorage.removeItem("covermate-admin-session");
    window.localStorage.removeItem("purich-admin-ever-v7");
  });
  await page.goto(adminUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(500);
  if (!page.url().includes("/admin/login")) {
    failures.push(`${name} /admin: expected unauthenticated redirect to /admin/login, got ${page.url()}`);
  }
  for (const ownerRoute of ["/#admin", "/#edit", "/#preview"]) {
    await page.goto(new URL(ownerRoute, baseUrl).toString(), { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(500);
    if (!page.url().includes("/admin/login")) {
      failures.push(
        `${name} ${ownerRoute}: expected unauthenticated redirect to /admin/login, got ${page.url()}`
      );
    }
  }

  await page.goto(new URL("/admin/login", baseUrl).toString(), { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => window.localStorage.removeItem("covermate-admin-session"));
  await page.getByText("Sign in with Google").click();
  await page.waitForTimeout(900);
  const loginPath = new URL(page.url()).pathname.replace(/\/$/, "");
  const loginFlowState = await page.evaluate(() => ({
    text: document.body.innerText,
    bodyFont: window.getComputedStyle(document.body).fontFamily,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  if (loginPath !== "/admin") {
    failures.push(`${name} login: expected redirect to /admin, got ${page.url()}`);
  }
  if (!loginFlowState.text.includes("Manage your site")) {
    failures.push(`${name} login: admin launcher did not render after sign-in`);
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

  await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => {
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
  await page.goto(adminUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(700);
  const adminState = await page.evaluate(() => ({
    text: document.body.innerText,
    bodyFont: window.getComputedStyle(document.body).fontFamily,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  if (!adminState.text.includes("Manage your site")) {
    failures.push(`${name} /admin: authenticated launcher did not render`);
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

  await page.goto(new URL("/#admin", baseUrl).toString(), { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(900);
  const ownerPanelState = await page.evaluate(() => ({
    text: document.body.innerText,
    bodyFont: window.getComputedStyle(document.body).fontFamily,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    adminTabs: ["Sections", "Content", "Brand & chrome", "Theme & data", "Versions"].map((label) => {
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
    })
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
  if (
    !ownerPanelState.text.includes("Edit text") ||
    !ownerPanelState.text.includes("Main") ||
    !ownerPanelState.text.includes("Log out") ||
    !ownerPanelState.text.includes("Publish")
  ) {
    failures.push(`${name} /#admin: admin utility actions are missing`);
  }

  for (const [tabName, expectedText] of [
    ["Content", "รูปภาพทั้งหมดลากวาง"],
    ["Brand & chrome", "IDENTITY"],
    ["Theme & data", "BACKUP & RESTORE"],
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
  await page.waitForTimeout(500);
  const closedAdminState = await page.evaluate(() => {
    const bar = document.querySelector('[data-admin-owner-bar="reopen"]');
    const rect = bar ? bar.getBoundingClientRect() : null;
    const style = bar ? window.getComputedStyle(bar) : null;
    return {
      hasAside: Boolean(document.querySelector("aside")),
      hasBar: Boolean(bar),
      barVisible: Boolean(
        bar &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          rect.width > 0 &&
          rect.height > 0
      ),
      text: document.body.innerText,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  });
  if (closedAdminState.hasAside) {
    failures.push(`${name} /#admin close: drawer stayed visible after X`);
  }
  if (!closedAdminState.hasBar || !closedAdminState.barVisible) {
    failures.push(`${name} /#admin close: owner reopen bar did not render`);
  }
  if (
    !closedAdminState.text.includes("Panel") ||
    !closedAdminState.text.includes("Edit text") ||
    !closedAdminState.text.includes("Main") ||
    !closedAdminState.text.includes("Log out")
  ) {
    failures.push(`${name} /#admin close: owner reopen actions are incomplete`);
  }
  if (closedAdminState.scrollWidth > closedAdminState.clientWidth) {
    failures.push(`${name} /#admin close: horizontal overflow ${closedAdminState.scrollWidth} > ${closedAdminState.clientWidth}`);
  }
  await page.getByRole("button", { name: "Panel" }).click();
  await page.waitForTimeout(500);
  if (!(await page.locator("aside").count())) {
    failures.push(`${name} /#admin reopen: owner bar did not reopen the control panel`);
  }

  await page.goto(new URL("/#edit", baseUrl).toString(), { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(900);
  const editState = await page.evaluate(() => ({
    text: document.body.innerText,
    bodyFont: window.getComputedStyle(document.body).fontFamily,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    editableCount: document.querySelectorAll('[contenteditable="true"], textarea, input').length,
    contentEditableCount: document.querySelectorAll('[contenteditable="true"]').length,
    toolbarVisible: Boolean(document.querySelector('[data-admin-owner-bar="edit"]'))
  }));
  if (!editState.text.includes("Text edit")) {
    failures.push(`${name} /#edit: edit mode toolbar did not render`);
  }
  if (!editState.toolbarVisible) {
    failures.push(`${name} /#edit: owner edit toolbar is missing`);
  }
  if (
    !editState.text.includes("Panel") ||
    !editState.text.includes("Main") ||
    !editState.text.includes("Log out") ||
    !editState.text.includes("Done")
  ) {
    failures.push(`${name} /#edit: edit toolbar owner actions are missing`);
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

  await page.getByRole("button", { name: "Done" }).click();
  await page.waitForTimeout(500);
  const exitEditState = await page.evaluate(() => {
    const bar = document.querySelector('[data-admin-owner-bar="reopen"]');
    const rect = bar ? bar.getBoundingClientRect() : null;
    const style = bar ? window.getComputedStyle(bar) : null;
    return {
      contentEditableCount: document.querySelectorAll('[contenteditable="true"]').length,
      editToolbarVisible: Boolean(document.querySelector('[data-admin-owner-bar="edit"]')),
      reopenBarVisible: Boolean(
        bar &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          rect.width > 0 &&
          rect.height > 0
      ),
      text: document.body.innerText,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  });
  if (exitEditState.contentEditableCount !== 0) {
    failures.push(`${name} /#edit done: contenteditable fields remained active`);
  }
  if (exitEditState.editToolbarVisible) {
    failures.push(`${name} /#edit done: edit toolbar stayed visible`);
  }
  if (!exitEditState.reopenBarVisible) {
    failures.push(`${name} /#edit done: owner reopen bar did not appear`);
  }
  if (exitEditState.scrollWidth > exitEditState.clientWidth) {
    failures.push(`${name} /#edit done: horizontal overflow ${exitEditState.scrollWidth} > ${exitEditState.clientWidth}`);
  }

  await page.goto(adminUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForTimeout(500);
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
