import assert from "node:assert/strict";

import { launchChromium, loadPlaywright } from "./lib/playwright.mjs";
import { startStaticServer } from "./lib/static-server.mjs";

const playwright = loadPlaywright();
const { chromium } = playwright;

const routes = [
  { path: "/", label: "home" },
  { path: "/motor", label: "motor" }
];

const viewports = [
  { label: "mobile", width: 390, height: 844, maxVisibleMs: 4500, maxLcpMs: 3500 },
  { label: "desktop", width: 1440, height: 900, maxVisibleMs: 3500, maxLcpMs: 3500 }
];

const maxCls = Number(process.env.COVERMATE_PERF_MAX_CLS || "0.1");
const maxHtmlBytes = Number(process.env.COVERMATE_PERF_MAX_HTML_BYTES || "750000");
const maxScriptBytes = Number(process.env.COVERMATE_PERF_MAX_SCRIPT_BYTES || "350000");

let server;
let baseUrl = process.env.COVERMATE_URL || "";
if (!baseUrl) {
  const started = await startStaticServer({ ownerRoutesToRoot: true });
  server = started.server;
  baseUrl = started.baseUrl;
}

const browser = await launchChromium(chromium, { headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    for (const route of routes) {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
        isMobile: viewport.label === "mobile"
      });
      const page = await context.newPage();
      const pageErrors = [];
      const failedRequests = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("requestfailed", (request) => {
        const url = request.url();
        if (/favicon\.ico/.test(url)) return;
        failedRequests.push(`${request.method()} ${url}: ${request.failure()?.errorText || "failed"}`);
      });
      await page.addInitScript(() => {
        window.__covermatePerf = { cls: 0, lcp: 0, longTasks: [] };
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) window.__covermatePerf.cls += entry.value || 0;
            }
          }).observe({ type: "layout-shift", buffered: true });
        } catch {}
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1];
            if (last) window.__covermatePerf.lcp = last.startTime || 0;
          }).observe({ type: "largest-contentful-paint", buffered: true });
        } catch {}
        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__covermatePerf.longTasks.push(Math.round(entry.duration || 0));
            }
          }).observe({ type: "longtask", buffered: true });
        } catch {}
      });

      const start = Date.now();
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        () => document.body && getComputedStyle(document.body).visibility !== "hidden" && (document.body.innerText || "").trim().length > 300,
        null,
        { timeout: 30000 }
      );
      const visibleMs = Date.now() - start;
      await page.waitForTimeout(1400);

      const state = await page.evaluate(() => {
        const resources = performance.getEntriesByType("resource").map((entry) => ({
          name: entry.name,
          initiatorType: entry.initiatorType,
          decodedBodySize: entry.decodedBodySize || 0,
          transferSize: entry.transferSize || 0
        }));
        const nav = performance.getEntriesByType("navigation")[0];
        const htmlBytes = nav ? (nav.decodedBodySize || nav.transferSize || 0) : 0;
        const scriptBytes = resources
          .filter((entry) => entry.initiatorType === "script")
          .reduce((sum, entry) => sum + Math.max(entry.decodedBodySize, entry.transferSize), 0);
        return {
          title: document.title,
          textLength: (document.body.innerText || "").trim().length,
          rawTemplateVisible: /\\n\\n\\n\\n|__COVERMATE_|sc-if|sc-for|\{\{/.test(document.body.innerText || ""),
          htmlBooting: document.documentElement.classList.contains("covermate-booting"),
          scrollOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          htmlBytes,
          scriptBytes,
          cls: window.__covermatePerf?.cls || 0,
          lcp: window.__covermatePerf?.lcp || 0,
          maxLongTask: Math.max(0, ...(window.__covermatePerf?.longTasks || []))
        };
      });

      results.push({
        route: route.label,
        viewport: viewport.label,
        visibleMs,
        lcp: Math.round(state.lcp),
        cls: Number(state.cls.toFixed(4)),
        htmlBytes: state.htmlBytes,
        scriptBytes: state.scriptBytes,
        maxLongTask: state.maxLongTask
      });

      assert.equal(pageErrors.length, 0, `${route.label} ${viewport.label}: page errors: ${pageErrors.join("; ")}`);
      assert.equal(failedRequests.length, 0, `${route.label} ${viewport.label}: request failures: ${failedRequests.join("; ")}`);
      assert.equal(state.rawTemplateVisible, false, `${route.label} ${viewport.label}: raw template text visible.`);
      assert.equal(state.htmlBooting, false, `${route.label} ${viewport.label}: boot cloak stayed active.`);
      assert.ok(state.scrollOverflow <= 1, `${route.label} ${viewport.label}: horizontal overflow ${state.scrollOverflow}px.`);
      assert.ok(visibleMs <= viewport.maxVisibleMs, `${route.label} ${viewport.label}: visible in ${visibleMs}ms, budget ${viewport.maxVisibleMs}ms.`);
      if (state.lcp > 0) {
        assert.ok(state.lcp <= viewport.maxLcpMs, `${route.label} ${viewport.label}: LCP ${state.lcp}ms, budget ${viewport.maxLcpMs}ms.`);
      }
      assert.ok(state.cls <= maxCls, `${route.label} ${viewport.label}: CLS ${state.cls}, budget ${maxCls}.`);
      if (state.htmlBytes > 0) {
        assert.ok(state.htmlBytes <= maxHtmlBytes, `${route.label} ${viewport.label}: HTML ${state.htmlBytes} bytes, budget ${maxHtmlBytes}.`);
      }
      assert.ok(state.scriptBytes <= maxScriptBytes, `${route.label} ${viewport.label}: scripts ${state.scriptBytes} bytes, budget ${maxScriptBytes}.`);

      await page.close();
      await context.close();
    }
  }
} finally {
  await browser.close().catch(() => {});
  if (server) await new Promise((resolve) => server.close(resolve));
}

console.log(JSON.stringify(results, null, 2));
console.log("CoverMate performance budget check passed");
