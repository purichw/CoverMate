import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

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
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const remoteUrl = process.env.COVERMATE_BOOT_URL || "";
const firebaseDelayMs = Number(process.env.COVERMATE_BOOT_FIREBASE_DELAY_MS || 700);

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js" || ext === ".mjs") return "application/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".ico") return "image/x-icon";
  if (ext === ".json" || ext === ".webmanifest") return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function safeFilePath(urlPath) {
  let pathname = decodeURIComponent(urlPath).replace(/^\/+/, "");
  pathname = pathname.replace(/^"+|"+$/g, "");
  if (!pathname || pathname === "admin" || pathname.startsWith("admin/")) {
    pathname = "index.html";
  }
  const filePath = path.resolve(rootDir, pathname);
  if (!filePath.startsWith(rootDir + path.sep) && filePath !== rootDir) {
    return null;
  }
  return filePath;
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const filePath = safeFilePath(url.pathname);
      if (!filePath) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const data = await fs.readFile(filePath);
      res.writeHead(200, { "content-type": contentType(filePath) });
      res.end(data);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

function firebaseMock() {
  return `
    window.CoverMateFirebase = {
      hydrateLocalContent: async () => null
    };
    window.dispatchEvent(new CustomEvent("covermate-firebase-ready"));
    export {};
  `;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const local = remoteUrl ? null : await startServer();
  const url = remoteUrl || `${local.baseUrl}/?bootGuardCheck=1`;
  const browser = await chromium.launch({ headless: true });

  try {
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
      failed.push(`${requestUrl} ${request.failure()?.errorText || "failed"}`);
    });
    page.on("response", (response) => {
      const requestUrl = response.url();
      if (response.status() < 400 || requestUrl.endsWith("/favicon.ico")) return;
      badResponses.push(`${response.status()} ${requestUrl}`);
    });

    await page.route("**/covermate-firebase.js", async (route) => {
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
    await page.goto(url, { waitUntil: "commit", timeout: 30000 });
    await page.waitForTimeout(120);
    const early = await page.evaluate(() => {
      const text = document.body ? document.body.innerText.slice(0, 160) : "";
      const style = document.body ? getComputedStyle(document.body) : null;
      return {
        textLength: text.length,
        rawSlashN: text.includes("\\n\\n"),
        htmlBooting: document.documentElement.hasAttribute("data-covermate-booting"),
        bodyVisibility: style ? style.visibility : ""
      };
    });

    await page.waitForFunction(
      () => document.body && document.body.innerText.length > 200 && getComputedStyle(document.body).visibility === "visible",
      null,
      { timeout: 30000 }
    );
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
      url,
      elapsedMs: Date.now() - start,
      early,
      settled,
      pageErrors,
      failed,
      badResponses
    };
    console.log(JSON.stringify(result, null, 2));

    assert.equal(early.textLength, 0, "first paint keeps body text hidden");
    assert.equal(early.rawSlashN, false, "first paint does not show raw slash-n text");
    assert.equal(early.htmlBooting, true, "boot attribute is active during delayed hydration");
    assert.equal(early.bodyVisibility, "hidden", "body is hidden during delayed hydration");
    assert.equal(settled.rawSlashN, false, "settled page does not show raw slash-n text");
    assert.equal(settled.htmlBooting, false, "boot attribute is removed after hydration");
    assert.equal(settled.guard, false, "hydration guard is removed after hydration");
    assert.equal(settled.bodyVisibility, "visible", "body is visible after hydration");
    assert.equal(pageErrors.length, 0, "no page errors");
    assert.equal(failed.length, 0, "no failed requests");
    assert.equal(badResponses.length, 0, "no 4xx/5xx asset responses");
  } finally {
    await browser.close();
    if (local) await new Promise((resolve) => local.server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
