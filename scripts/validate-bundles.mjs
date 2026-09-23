import fs from "node:fs";

import { parseBundlerTemplateParts } from "./lib/bundler-template.mjs";

const htmlFiles = [
  "index.html",
  "admin/index.html",
  "admin/login/index.html",
  "admin/analytics/index.html",
  "admin/ops/index.html",
  "src/visitor/shell.html",
  "src/visitor/template.html"
];

const jsFiles = [
  "src/visitor/defaults.js",
  "src/visitor/runtime.js",
  "src/visitor/cms-controller.js",
  "src/visitor/editor-history.js",
  "covermate-freshness.mjs",
  "covermate-environment.mjs",
  "covermate-contract.js",
  "covermate-firebase.js",
  "covermate-firebase-config.mjs",
  "covermate-public.mjs",
  "covermate-roles.mjs",
  "src/telemetry.js",
  "covermate-analytics.js",
  "admin/session.js",
  "admin/analytics-data.js",
  "admin/ops/app.js",
  "api/analytics.js",
  "api/ops.js",
  "api/leads.js",
  "api/telemetry.js",
  "server/firebase.cjs",
  "server/firebase-rest.cjs",
  "server/ops-access.cjs",
  "server/ops-firestore.cjs",
  "server/legacy-ops-service.cjs",
  "server/cases-handler.cjs",
  "server/cases-repository.cjs",
  "server/cases-service.cjs",
  "server/http.cjs",
  "server/telemetry.cjs",
  "scripts/lib/visitor-source.mjs",
  "scripts/lib/contract-loader.mjs",
  "scripts/generate-visitor-bundle.mjs",
  "scripts/contract-regression-check.mjs"
];

const cssFiles = [
  "organic.css",
  "assets/fonts/covermate-fonts.css"
];

const failures = [];

const forbiddenPatterns = [
  { pattern: /--space-(5|7)\b/, message: "forbidden spacing token --space-5/--space-7" },
  { pattern: /letter-spacing\s*:\s*-\d/i, message: "negative letter-spacing" },
  { pattern: /\b(Caprasimo|Chonburi|Figtree)\b/, message: "non-product font reference" }
];

const inlineEventPattern = /\son[a-z]+\s*=/gi;

function readBundlerTemplate(html) {
  const parts = parseBundlerTemplateParts(html, {
    fileLabel: "HTML",
    requireComplete: false,
    completePredicate: () => true
  });
  if (parts.length > 1) {
    throw new Error(`expected exactly one embedded template, found ${parts.length}`);
  }
  return parts[0].rawJson;
}

function checkSource(file, source, label = "source") {
  if (/\[object Object\]/.test(source)) {
    failures.push(`${file}: literal [object Object] found in ${label}`);
  }
  for (const rule of forbiddenPatterns) {
    if (rule.pattern.test(source)) {
      failures.push(`${file}: ${rule.message} found in ${label}`);
    }
  }
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  if (/<script type="__bundler\/template">/.test(html)) {
    try {
      const templateJson = readBundlerTemplate(html);
      const template = JSON.parse(templateJson);
      if (/<\/script/i.test(templateJson.replace(/<\\\/script/gi, ""))) {
        failures.push(`${file}: unescaped closing script marker inside template JSON`);
      }
      if (!template.includes("<!DOCTYPE html>")) {
        failures.push(`${file}: embedded template does not look like HTML`);
      }
      if (!template.includes("</html>")) {
        failures.push(`${file}: embedded template is incomplete`);
      }
      if (!template.includes('type="text/x-dc"')) {
        failures.push(`${file}: embedded template is missing text/x-dc payload`);
      }
      if (templateJson.includes("__COVERMATE_SCRIPT_OPEN__") && !html.includes("replace(/__COVERMATE_SCRIPT_OPEN__/g")) {
        failures.push(`${file}: embedded template masks <script> markers but the wrapper does not restore them`);
      }
      if (templateJson.includes("__COVERMATE_RESOURCE_") && !html.includes("restoreTemplateResourceRefs")) {
        failures.push(`${file}: embedded template masks resource refs but the wrapper does not restore them`);
      }
      if (file === "index.html" && !template.includes("const DEFAULTS =")) {
        failures.push(`${file}: embedded template is missing DEFAULTS payload`);
      }
      const inlineEvents = template.match(inlineEventPattern) || [];
      if (inlineEvents.length) {
        failures.push(`${file}: inline event handler(s) found in embedded template: ${[...new Set(inlineEvents.map(v => v.trim().replace(/\s*=.*/, "")))].join(", ")}`);
      }
      checkSource(file, template, "embedded template");
    } catch (error) {
      failures.push(`${file}: template JSON parse failed: ${error.message}`);
    }
  }
  checkSource(file, html);
}

for (const file of jsFiles) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  checkSource(file, source);
}

for (const file of cssFiles) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  checkSource(file, source);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Validated ${htmlFiles.length} HTML surfaces, ${jsFiles.length} scripts, and ${cssFiles.length} CSS files.`);
