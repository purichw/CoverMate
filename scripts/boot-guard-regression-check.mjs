import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { loadPlaywright } from "./lib/playwright.mjs";
import { startStaticServer } from "./lib/static-server.mjs";

const playwright = loadPlaywright();
const { chromium } = playwright;
const remoteUrl = process.env.COVERMATE_BOOT_URL || "";
const firebaseDelayMs = Number(process.env.COVERMATE_BOOT_FIREBASE_DELAY_MS || 700);
const maxVisibleMs = Number(process.env.COVERMATE_BOOT_MAX_VISIBLE_MS || 0);

function firebaseMock() {
  return `
    window.CoverMateFirebase = {
      hydrateLocalContent: async () => null
    };
    window.dispatchEvent(new CustomEvent("covermate-firebase-ready"));
    export const hydrateLocalContent = async () => null;
  `;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAllowedBrowserBeaconFailure(requestUrl) {
  const url = new URL(requestUrl);
  return url.hostname === "www.google-analytics.com" && url.pathname === "/g/collect";
}

async function main() {
  const local = remoteUrl ? null : await startStaticServer();
  const targets = remoteUrl
    ? [{ name: "remote", url: remoteUrl }]
    : [
        { name: "home", url: `${local.baseUrl}/?bootGuardCheck=1` },
        { name: "motor", url: `${local.baseUrl}/motor?bootGuardCheck=1` }
      ];
  const browser = await chromium.launch({ headless: true });

  try {
    for (const target of targets) {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true
      });
      const pageErrors = [];
      const failed = [];
      const badResponses = [];

      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("requestfailed", (request) => {
        const requestUrl = request.url();
        if (requestUrl.endsWith("/favicon.ico")) return;
        if (isAllowedBrowserBeaconFailure(requestUrl)) return;
        failed.push(`${requestUrl} ${request.failure()?.errorText || "failed"}`);
      });
      page.on("response", (response) => {
        const requestUrl = response.url();
        if (response.status() < 400 || requestUrl.endsWith("/favicon.ico")) return;
        badResponses.push(`${response.status()} ${requestUrl}`);
      });

      if (!remoteUrl) {
        const rootIndex = fileURLToPath(new URL("../index.html", import.meta.url));
        await page.route(/\/motor(?:[?#].*)?$/, (route) =>
          route.fulfill({ status: 200, contentType: "text/html", path: rootIndex })
        );
      }

      await page.route("**/covermate-public.mjs", async (route) => {
        await delay(firebaseDelayMs);
        if (remoteUrl) {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: firebaseMock()
        });
      });

      const start = Date.now();
      await page.goto(target.url, { waitUntil: "commit", timeout: 30000 });
      await page.waitForTimeout(120);
      const early = await page.evaluate(() => {
        const text = document.body ? document.body.innerText.slice(0, 160) : "";
        const style = document.body ? getComputedStyle(document.body) : null;
        const bootBefore = getComputedStyle(document.documentElement, "::before");
        const bootBeforeContent = bootBefore ? bootBefore.content : "";
        const bootBeforeVisible = Boolean(
          bootBefore &&
          bootBeforeContent &&
          bootBeforeContent !== "none" &&
          bootBeforeContent !== '""' &&
          Number(bootBefore.opacity || 0) > 0 &&
          bootBefore.display !== "none" &&
          bootBefore.visibility !== "hidden"
        );
        return {
          textLength: text.length,
          rawSlashN: text.includes("\\n\\n"),
          htmlBooting: document.documentElement.hasAttribute("data-covermate-booting"),
          bodyVisibility: style ? style.visibility : "",
          bootBeforeContent,
          bootBeforeVisible
        };
      });

      await page.waitForFunction(
        () => document.body && document.body.innerText.length > 200 && getComputedStyle(document.body).visibility === "visible",
        null,
        { timeout: 30000 }
      );
      const visibleMs = Date.now() - start;
      await page.waitForTimeout(700);

      const settled = await page.evaluate(() => {
        const text = document.body.innerText.slice(0, 400);
        return {
          textLength: text.length,
          rawSlashN: text.includes("\\n\\n"),
          hasRiskCopy: text.includes("ความเสี่ยง"),
          htmlBooting: document.documentElement.hasAttribute("data-covermate-booting"),
          guard: !!document.getElementById("covermate-hydration-guard"),
          bodyVisibility: getComputedStyle(document.body).visibility,
          title: document.title
        };
      });

      const result = {
        target: remoteUrl ? "remote" : "local",
        route: target.name,
        url: target.url,
        visibleMs,
        elapsedMs: Date.now() - start,
        early,
        settled,
        pageErrors,
        failed,
        badResponses
      };
      console.log(JSON.stringify(result, null, 2));

      assert.equal(early.textLength, 0, `${target.name}: first paint keeps body text hidden`);
      assert.equal(early.rawSlashN, false, `${target.name}: first paint does not show raw slash-n text`);
      assert.equal(early.htmlBooting, true, `${target.name}: boot attribute is active during delayed hydration`);
      assert.equal(early.bodyVisibility, "hidden", `${target.name}: body is hidden during delayed hydration`);
      assert.notEqual(early.bootBeforeContent, '"CoverMate"', `${target.name}: boot shell does not paint standalone CoverMate text`);
      assert.equal(early.bootBeforeVisible, false, `${target.name}: boot pseudo-element is not visible`);
      assert.equal(settled.rawSlashN, false, `${target.name}: settled page does not show raw slash-n text`);
      assert.equal(settled.htmlBooting, false, `${target.name}: boot attribute is removed after hydration`);
      assert.equal(settled.guard, false, `${target.name}: hydration guard is removed after hydration`);
      assert.equal(settled.bodyVisibility, "visible", `${target.name}: body is visible after hydration`);
      if (maxVisibleMs > 0) {
        assert.ok(
          visibleMs <= maxVisibleMs,
          `${target.name}: body becomes visible within ${maxVisibleMs}ms (actual ${visibleMs}ms)`
        );
      }
      assert.equal(pageErrors.length, 0, `${target.name}: no page errors`);
      assert.equal(failed.length, 0, `${target.name}: no failed requests`);
      assert.equal(badResponses.length, 0, `${target.name}: no 4xx/5xx asset responses`);
      await page.close();
    }
  } finally {
    await browser.close();
    if (local) await new Promise((resolve) => local.server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
