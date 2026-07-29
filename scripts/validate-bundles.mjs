import fs from "node:fs";

const htmlFiles = [
  "index.html",
  "admin/index.html",
  "admin/login/index.html",
  "admin/analytics/index.html"
];

const jsFiles = [
  "covermate-firebase.js",
  "covermate-analytics.js",
  "admin/session.js",
  "admin/analytics-data.js"
];

const failures = [];

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
    } catch (error) {
      failures.push(`${file}: template JSON parse failed: ${error.message}`);
    }
  }
  if (/\[object Object\]/.test(html)) {
    failures.push(`${file}: literal [object Object] found in source`);
  }
}

for (const file of jsFiles) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  if (/\[object Object\]/.test(source)) {
    failures.push(`${file}: literal [object Object] found in source`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Validated ${htmlFiles.length} HTML surfaces and ${jsFiles.length} scripts.`);
