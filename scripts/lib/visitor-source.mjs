import fs from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildSync, transformSync } from "esbuild";
import { createSeoModel, renderSeoHead } from "../../covermate-seo.mjs";
import { sanitizeStateDoc } from "../../covermate-contract.js";

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

export function readContactStyleAssets() {
  return ['line-contact', 'submission'].map(name => {
    const css = transformSync(readText(new URL(`src/visitor/${name}.css`, ROOT)), { loader:'css', minifyWhitespace:true }).code;
    const hash = createHash('sha256').update(css).digest('hex').slice(0,16);
    return { name, css, file:new URL(`assets/visitor/${name}.css`, ROOT), link:`<link rel="stylesheet" href="/assets/visitor/${name}.css?v=${hash}">` };
  });
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
  for (const name of ["favicon.svg", "favicon.ico"]) {
    const file = new URL("../" + name, root);
    if (fs.existsSync(file)) versions["/" + name] = createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 16);
  }
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
  const contract = readText(new URL('covermate-contract.js', ROOT));
  const contactStyles = Object.fromEntries(readContactStyleAssets().map(asset => [asset.name, asset.link]));
  assertSingleSlot(contract, '// COVERMATE_CMS_SCHEMA_BEGIN', 'covermate-contract.js');
  assertSingleSlot(contract, '// COVERMATE_CMS_SCHEMA_END', 'covermate-contract.js');
  return {
    shell: readText(VISITOR_SOURCE_PATHS.shell)
      .replace('/* COVERMATE_BOOT_STYLES */', () => transformSync(readText(new URL('src/visitor/boot.css', ROOT)), { loader: 'css', minify: true }).code)
      .replace('// COVERMATE_BOOT_SCRIPT', () => transformSync(readText(new URL('src/visitor/boot.js', ROOT)), { minify: true }).code),
    template: readText(VISITOR_SOURCE_PATHS.template)
      .replace('<!-- COVERMATE_SUBMISSION_TEMPLATE -->', () => readText(new URL('src/visitor/submission.html', ROOT)))
      .replace('<style>/* COVERMATE_SUBMISSION_STYLES */</style>', () => contactStyles.submission)
      .replace('<!-- COVERMATE_CALCULATOR_TEMPLATE -->', () => readText(new URL('src/visitor/calculator.html', ROOT)))
      .replace('/* COVERMATE_CALCULATOR_STYLES */', () => readText(new URL('src/visitor/calculator.css', ROOT)))
      .replace('<!-- COVERMATE_HOME_TEMPLATE -->', () => readText(new URL('src/visitor/home.html', ROOT)))
      .replaceAll('<!-- COVERMATE_PROOF_CREDENTIALS -->', () => readText(new URL('src/visitor/proof-credentials.html', ROOT)))
      .replace('/* COVERMATE_HOME_STYLES */', () => readText(new URL('src/visitor/home.css', ROOT)))
      .replace('<!-- COVERMATE_LINE_CONTACT -->', () => readText(new URL('src/visitor/line-contact.html', ROOT)))
      .replace('<style>/* COVERMATE_LINE_STYLES */</style>', () => contactStyles['line-contact'])
      .replaceAll('<!-- COVERMATE_LINE_MARK -->', () => readText(new URL('src/visitor/line-mark.html', ROOT))),
    defaults: readText(VISITOR_SOURCE_PATHS.defaults).replace(/\s*$/, "\n"),
    runtime: readText(VISITOR_SOURCE_PATHS.runtime).replace(/\s*$/, "\n"),
    adminLabels: readText(new URL('src/visitor/admin-labels.js', ROOT)),
    cmsController: buildSync({
      entryPoints: [fileURLToPath(new URL('src/visitor/cms-controller.js', ROOT))],
      bundle: true, write: false, format: 'iife', globalName: 'CoverMateCms',
      target: 'es2022', charset: 'utf8'
    }).outputFiles[0].text,
    calculatorSource: readText(new URL('covermate-calculator.mjs', ROOT)).replace(/^export /gm, ''),
    recommendationSource: readText(new URL('covermate-recommendations.mjs', ROOT)).replace(/^export /gm, ''),
    submissionSource: readText(new URL('covermate-submission.mjs', ROOT)).replace(/^export /gm, ''),
    cmsSchema: contract.split('// COVERMATE_CMS_SCHEMA_BEGIN')[1].split('// COVERMATE_CMS_SCHEMA_END')[0],
    seoSource: readText(new URL('covermate-seo.mjs', ROOT)).split('\nexport function renderSeoHead')[0].replace(/^export /gm, ''),
    imageVersions: readImageVersions()
  };
}

export function buildVisitorRuntime(sources = readVisitorSources()) {
  assertSingleSlot(sources.runtime, VISITOR_DEFAULTS_SLOT, "src/visitor/runtime.js");
  assertSingleSlot(sources.runtime, VISITOR_ASSET_VERSIONS_SLOT, "src/visitor/runtime.js");
  assertSingleSlot(sources.runtime, '// COVERMATE_CMS_SCHEMA_SOURCE', 'src/visitor/runtime.js');
  assertSingleSlot(sources.runtime, '// COVERMATE_CMS_CONTROLLER_SOURCE', 'src/visitor/runtime.js');
  return sources.runtime.replace(VISITOR_DEFAULTS_SLOT, () => sources.defaults.trimEnd())
    .replace('// COVERMATE_CMS_SCHEMA_SOURCE', () => sources.cmsSchema)
    .replace('// COVERMATE_ADMIN_LABELS_SOURCE', () => sources.adminLabels)
    .replace('// COVERMATE_CMS_CONTROLLER_SOURCE', () => sources.cmsController)
    .replace('// COVERMATE_CALCULATOR_SOURCE', () => sources.calculatorSource)
    .replace('// COVERMATE_RECOMMENDATION_SOURCE', () => sources.recommendationSource)
    .replace('// COVERMATE_SUBMISSION_SOURCE', () => sources.submissionSource)
    .replace('// COVERMATE_SEO_SOURCE', () => sources.seoSource)
    .replace(VISITOR_ASSET_VERSIONS_SLOT, () => JSON.stringify(sources.imageVersions || readImageVersions()));
}

export function buildVisitorTemplate(sources = readVisitorSources()) {
  assertSingleSlot(sources.template, VISITOR_RUNTIME_SLOT, "src/visitor/template.html");
  const defaults = JSON.parse(vm.runInNewContext(sources.defaults + '\nJSON.stringify(DEFAULTS)'));
  // Keep source and diagnostic builds readable; compact only shipped output.
  // No output format: esbuild retains top-level Component while compacting locals.
  const runtime = transformSync(buildVisitorRuntime({ ...sources, defaults: 'const DEFAULTS = ' + JSON.stringify(defaults) + ';' }), {
    minifyWhitespace: true, minifyIdentifiers: true, charset: 'utf8'
  }).code
    // Existing seed/export tools use these two boundaries in the generated HTML.
    .replace(/\bconst (DEFAULTS|SCHEMA)=/g, 'const $1 =');
  // Compact the static CSS blocks before inserting the runtime script.
  const template = sources.template.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_, open, css, close) => open + transformSync(css, { loader: 'css', minifyWhitespace: true }).code + close)
    // Remove tag indentation only. Keep newlines/word separators and preserve
    // raw-text blocks verbatim so textareas, code and preformatted copy are safe.
    .replace(/(<(pre|textarea|script|style)\b[^>]*>[\s\S]*?<\/\2>)|^[\t ]+(?=<)/gim,
      (match, rawText) => rawText || '');
  return withDefaultSeo(template.replace(VISITOR_RUNTIME_SLOT, () => runtime.trimEnd()), sources);
}

function withDefaultSeo(html, sources) {
  const raw = JSON.parse(vm.runInNewContext(sources.defaults + '\nJSON.stringify(DEFAULTS)'));
  const site = sanitizeStateDoc({ config: raw, text: {}, revision: 1 }).config;
  return html.replace('<!-- COVERMATE_SEO_HEAD -->', () => '<!-- COVERMATE_SEO_START -->\n' + renderSeoHead(createSeoModel(site)) + '\n<!-- COVERMATE_SEO_END -->');
}

export function buildVisitorIndex(sources = readVisitorSources()) {
  assertSingleSlot(sources.shell, VISITOR_TEMPLATE_SLOT, "src/visitor/shell.html");
  const template = buildVisitorTemplate(sources);
  const serializedTemplate = `${BUNDLER_TEMPLATE_OPEN}${serializeBundlerTemplate(template)}</script>`;
  // Keep the readable bootstrap source, without shipping its comments/whitespace.
  const shell = sources.shell.replace(/(<script id="covermate-bootstrap">)([\s\S]*?)(<\/script>)/,
    (_, open, script, close) => open + transformSync(script, { minifyWhitespace: true }).code + close);
  return withDefaultSeo(shell, sources).replace(VISITOR_TEMPLATE_SLOT, () => serializedTemplate);
}
