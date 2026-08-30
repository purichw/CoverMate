import fs from "node:fs";

import {
  BUNDLER_TEMPLATE_OPEN,
  serializeBundlerTemplate
} from "./bundler-template.mjs";

export const VISITOR_TEMPLATE_SLOT = "<!-- COVERMATE_BUNDLER_TEMPLATE -->";
export const VISITOR_RUNTIME_SLOT = "<!-- COVERMATE_TEXT_X_DC_RUNTIME -->";
export const VISITOR_DEFAULTS_SLOT = "// COVERMATE_DEFAULTS_SOURCE";

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
    runtime: readText(VISITOR_SOURCE_PATHS.runtime).replace(/\s*$/, "\n")
  };
}

export function buildVisitorRuntime(sources = readVisitorSources()) {
  assertSingleSlot(sources.runtime, VISITOR_DEFAULTS_SLOT, "src/visitor/runtime.js");
  return sources.runtime.replace(VISITOR_DEFAULTS_SLOT, () => sources.defaults.trimEnd());
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
