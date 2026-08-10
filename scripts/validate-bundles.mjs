import fs from "node:fs";

const htmlFiles = [
  "index.html",
  "admin/index.html",
  "admin/login/index.html",
  "admin/analytics/index.html",
  "admin/ops/index.html"
];

const jsFiles = [
  "covermate-contract.js",
  "covermate-firebase.js",
  "covermate-analytics.js",
  "admin/session.js",
  "admin/analytics-data.js",
  "admin/ops/app.js",
  "api/ops.js"
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
    const match = html.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
    if (!match) {
      failures.push(`${file}: embedded template tag is malformed`);
      continue;
    }
    try {
      const template = JSON.parse(match[1]);
      if (/<\/script/i.test(match[1].replace(/<\\\/script/gi, ""))) {
        failures.push(`${file}: unescaped closing script marker inside template JSON`);
      }
      if (!template.includes("<!DOCTYPE html>")) {
        failures.push(`${file}: embedded template does not look like HTML`);
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
