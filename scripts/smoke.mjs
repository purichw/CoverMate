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
    if (url.endsWith("/favicon.ico")) return;
    if (url.includes("%7B%7B") || url.includes("{{")) return;
    failedRequests.push(`${url} :: ${request.failure()?.errorText || "failed"}`);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const [route, selector] of routes) {
    const url = new URL(route, baseUrl).toString();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
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
  await page.goto(adminUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(500);
  if (!page.url().includes("/admin/login")) {
    failures.push(`${name} /admin: expected unauthenticated redirect to /admin/login, got ${page.url()}`);
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
    clientWidth: document.documentElement.clientWidth
  }));
  if (!ownerPanelState.text.includes("Admin portal")) {
    failures.push(`${name} /#admin: owner control panel did not render`);
  }
  if (!ownerPanelState.text.includes("Versions")) {
    failures.push(`${name} /#admin: versions/history tab is missing`);
  }
  if (!ownerPanelState.bodyFont.includes("Google Sans Thai")) {
    failures.push(`${name} /#admin: owner panel body font is not Google Sans Thai (${ownerPanelState.bodyFont})`);
  }
  if (ownerPanelState.scrollWidth > ownerPanelState.clientWidth) {
    failures.push(`${name} /#admin: horizontal overflow ${ownerPanelState.scrollWidth} > ${ownerPanelState.clientWidth}`);
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
