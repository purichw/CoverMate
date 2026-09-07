import fs from "node:fs";
import { createHash } from "node:crypto";

import {
  BUNDLER_TEMPLATE_OPEN,
  serializeBundlerTemplate
} from "./bundler-template.mjs";

export const VISITOR_TEMPLATE_SLOT = "<!-- COVERMATE_BUNDLER_TEMPLATE -->";
export const VISITOR_RUNTIME_SLOT = "<!-- COVERMATE_TEXT_X_DC_RUNTIME -->";
export const VISITOR_DEFAULTS_SLOT = "// COVERMATE_DEFAULTS_SOURCE";
export const VISITOR_ASSET_VERSIONS_SLOT = "/* COVERMATE_ASSET_VERSIONS */ {}";

const ROOT = new URL("../../", import.meta.url);

export const VISITOR_SOURCE_PATHS = Object.freeze({
  index: new URL("index.html", ROOT),
  shell: new URL("src/visitor/shell.html", ROOT),
  template: new URL("src/visitor/template.html", ROOT),
  defaults: new URL("src/visitor/defaults.js", ROOT),
  runtime: new URL("src/visitor/runtime.js", ROOT)
});

function readText(url) {
  return fs.readFileSync(url, "utf8");
}

export function readImageVersions(root = new URL("assets/", ROOT)) {
  const versions = {};
  function visit(directory, prefix) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
      const key = prefix + entry.name;
      if (entry.isDirectory()) visit(file, key + "/");
      else if (/\.(png|jpe?g|webp|avif|gif|svg|ico)$/i.test(entry.name)) {
        versions[key] = createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 16);
      }
    }
  }
  visit(root, "/assets/");
  return versions;
}

function assertSingleSlot(source, slot, label) {
  const first = source.indexOf(slot);
  if (first < 0) throw new Error(`${label}: missing ${slot}`);
  if (source.indexOf(slot, first + slot.length) >= 0) {
    throw new Error(`${label}: duplicate ${slot}`);
  }
}

export function readVisitorSources() {
  return {
    shell: readText(VISITOR_SOURCE_PATHS.shell),
    template: readText(VISITOR_SOURCE_PATHS.template),
    defaults: readText(VISITOR_SOURCE_PATHS.defaults).replace(/\s*$/, "\n"),
    runtime: readText(VISITOR_SOURCE_PATHS.runtime).replace(/\s*$/, "\n"),
    imageVersions: readImageVersions()
  };
}

export function buildVisitorRuntime(sources = readVisitorSources()) {
  assertSingleSlot(sources.runtime, VISITOR_DEFAULTS_SLOT, "src/visitor/runtime.js");
  assertSingleSlot(sources.runtime, VISITOR_ASSET_VERSIONS_SLOT, "src/visitor/runtime.js");
  return sources.runtime.replace(VISITOR_DEFAULTS_SLOT, () => sources.defaults.trimEnd())
    .replace(VISITOR_ASSET_VERSIONS_SLOT, () => JSON.stringify(sources.imageVersions || readImageVersions()));
}

export function buildVisitorTemplate(sources = readVisitorSources()) {
  assertSingleSlot(sources.template, VISITOR_RUNTIME_SLOT, "src/visitor/template.html");
  const runtime = buildVisitorRuntime(sources);
  return sources.template.replace(VISITOR_RUNTIME_SLOT, () => runtime.trimEnd());
}

export function buildVisitorIndex(sources = readVisitorSources()) {
  assertSingleSlot(sources.shell, VISITOR_TEMPLATE_SLOT, "src/visitor/shell.html");
  const template = buildVisitorTemplate(sources);
  const serializedTemplate = `${BUNDLER_TEMPLATE_OPEN}${serializeBundlerTemplate(template)}</script>`;
  return sources.shell.replace(VISITOR_TEMPLATE_SLOT, () => serializedTemplate);
}
