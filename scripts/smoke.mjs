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
      const logos = Array.from(document.querySelectorAll("#insurers img")).map(
        (img) => ({
          src: img.getAttribute("src"),
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        })
      );

      return {
        title: document.title,
        hasTarget: Boolean(target),
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        logos
      };
    }, selector);

    if (!state.hasTarget) failures.push(`${name} ${route}: missing ${selector}`);
    if (state.scrollWidth > state.clientWidth) {
      failures.push(
        `${name} ${route}: horizontal overflow ${state.scrollWidth} > ${state.clientWidth}`
      );
    }
    if (route === "/" && state.logos.length !== 14) {
      failures.push(`${name} ${route}: expected 14 insurer logos, got ${state.logos.length}`);
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
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  if (!adminState.text.includes("Manage your site")) {
    failures.push(`${name} /admin: authenticated launcher did not render`);
  }
  if (adminState.scrollWidth > adminState.clientWidth) {
    failures.push(`${name} /admin: horizontal overflow ${adminState.scrollWidth} > ${adminState.clientWidth}`);
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
