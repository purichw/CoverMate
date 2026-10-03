import fs from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildSync, transformSync } from "esbuild";
import { createSeoModel, renderSeoHead } from "../../covermate-seo.mjs";
import { sanitizeStateDoc } from "../../covermate-contract.js";
import { readBootSurface } from './boot-surface.mjs';

import {
  BUNDLER_TEMPLATE_OPEN,
  serializeBundlerTemplate
} from "./bundler-template.mjs";

export const VISITOR_TEMPLATE_SLOT = "<!-- COVERMATE_BUNDLER_TEMPLATE -->";
export const VISITOR_RUNTIME_SLOT = "<!-- COVERMATE_TEXT_X_DC_RUNTIME -->";
export const VISITOR_DEFAULTS_SLOT = "// COVERMATE_DEFAULTS_SOURCE";
export const VISITOR_ASSET_VERSIONS_SLOT = "/* COVERMATE_ASSET_VERSIONS */ {}";

const ROOT = new URL("../../", import.meta.url);
const DESIGN_SYSTEM_STYLE = /<style>(\/\* Organic[^]*?)<\/style>/;
const EDITOR_TOOLS_STYLE = /<style id="covermate-owner-dock-ui">([\s\S]*?)<\/style>/;
const LAYOUT_STYLE = /<style id="covermate-layout">([\s\S]*?)<\/style>/;

export const VISITOR_SOURCE_PATHS = Object.freeze({
  index: new URL("index.html", ROOT),
  publicIndex: new URL("server/visitor-public.html", ROOT),
  shell: new URL("src/visitor/shell.html", ROOT),
  template: new URL("src/visitor/template.html", ROOT),
  defaults: new URL("src/visitor/defaults.js", ROOT),
  runtime: new URL("src/visitor/runtime.js", ROOT)
});

function readText(url) {
  return fs.readFileSync(url, "utf8");
}

export function readVisitorStyleAssets() {
  const template = readText(VISITOR_SOURCE_PATHS.template);
  const designSystem = template.match(DESIGN_SYSTEM_STYLE)?.[1];
  const editorTools = template.match(EDITOR_TOOLS_STYLE)?.[1];
  const layout = template.match(LAYOUT_STYLE)?.[1];
  if (!designSystem) throw new Error('Visitor design-system stylesheet is missing.');
  if (!editorTools) throw new Error('Editor tools stylesheet is missing.');
  if (!layout) throw new Error('Visitor layout stylesheet is missing.');
  return ['organic', 'layout', 'home', 'service-page', 'articles-index', 'article-detail', 'line-contact', 'calculator', 'submission', 'select', 'editor-tools', 'editor-panel'].map(name => {
    const source = name === 'organic' ? designSystem : name === 'layout' ? layout : name === 'editor-tools' ? editorTools : readText(new URL(`src/${name === 'select' ? 'shared' : 'visitor'}/${name}.css`, ROOT));
    const css = transformSync(source, { loader:'css', minifyWhitespace:true }).code;
    const hash = createHash('sha256').update(css).digest('hex').slice(0,16);
    return { name, css, file:new URL(`assets/visitor/${name}.css`, ROOT), link:`<link rel="stylesheet" href="/assets/visitor/${name}.css?v=${hash}">` };
  });
}

// Keep the narrow contact-assets API for existing tooling.
export function readContactStyleAssets() {
  return readVisitorStyleAssets().filter(asset => ['line-contact', 'submission'].includes(asset.name));
}

export function readSelectAsset() {
  const code = buildSync({entryPoints:[fileURLToPath(new URL('src/shared/select.js', ROOT))],bundle:true,write:false,minify:true,format:'esm',target:'es2022'}).outputFiles[0].text;
  const hash = createHash('sha256').update(code).digest('hex').slice(0,16);
  return { code, file:new URL('assets/visitor/select.js', ROOT), url:`/assets/visitor/select.js?v=${hash}` };
}

export function readAnalyticsAsset() {
  const code = transformSync(readText(new URL('covermate-analytics.js', ROOT)), { minify:true, target:'es2022', charset:'utf8' }).code;
  const hash = createHash('sha256').update(code).digest('hex').slice(0,16);
  return { code, file:new URL('assets/visitor/analytics.js', ROOT), url:`/assets/visitor/analytics.js?v=${hash}` };
}

export function readEditorPreviewAsset() {
  const code = transformSync(readText(new URL('src/visitor/editor-preview.js', ROOT)), { minify:true, format:'esm', target:'es2022' }).code;
  const hash = createHash('sha256').update(code).digest('hex').slice(0,16);
  return { code, file:new URL('assets/visitor/editor-preview.js', ROOT), url:`/assets/visitor/editor-preview.js?v=${hash}` };
}

export function readEditorVersionsAsset() {
  const code = transformSync(readText(new URL('src/visitor/editor-versions.js', ROOT)), { minify:true, format:'esm', target:'es2022', charset:'utf8' }).code;
  const hash = createHash('sha256').update(code).digest('hex').slice(0,16);
  return { code, file:new URL('assets/visitor/editor-versions.js', ROOT), url:`/assets/visitor/editor-versions.js?v=${hash}` };
}

export function readPublicContractAsset() {
  const code = transformSync(readText(new URL('covermate-contract.js', ROOT)), {
    minify: true, format: 'esm', target: 'es2022', charset: 'utf8'
  }).code;
  return { code, file: new URL('assets/visitor/contract.js', ROOT) };
}

// Keep canonical root URLs and module identity; only shipped formatting changes.
// Adapter imports intentionally resolve relative to its root output file.
export function readPublicRuntimeAssets() {
  return [['adapter', 'covermate-public.mjs'], ['environment', 'covermate-environment.mjs']].map(([source, output]) => ({
    code: transformSync(readText(new URL(`src/public/${source}.mjs`, ROOT)), {
      minify: true, format: 'esm', target: 'es2022', charset: 'utf8'
    }).code,
    file: new URL(output, ROOT)
  }));
}

export function readContactPayloadAsset() {
  const file = new URL('assets/visitor/contact-payload.js', ROOT);
  const code = buildSync({
    entryPoints: [fileURLToPath(new URL('covermate-contact-payload.mjs', ROOT))],
    outfile: fileURLToPath(file), bundle: true, write: false, minify: true,
    format: 'esm', target: 'es2022', charset: 'utf8',
    // Already loaded by the public adapter; keep every other dependency in one
    // retryable module so failed nested imports cannot poison browser recovery.
    external: [fileURLToPath(new URL('covermate-contract.js', ROOT))]
  }).outputFiles[0].text;
  return { code, file };
}

const ARTICLE_READER_HELPERS = ['articleDetailSlug', 'readArticleDetail', 'articleShareUrl', 'articleSaved', 'toggleSavedArticle'];
const HOME_ARTICLE_HELPERS = ['articlePublicHref', 'readHomeArticleFeed', 'projectPublishedArticles', 'projectHomeArticles', 'homeArticleInsertionIndex'];
const ARTICLE_READER_BINDINGS = `const {installContentProtection,registerArticleDocument,registerArticleCarousel,${ARTICLE_READER_HELPERS.join(',')}} = CoverMateArticleReader;`;
const HOME_ARTICLE_BINDINGS = `const {${HOME_ARTICLE_HELPERS.join(',')}} = CoverMateArticleReader;`;
export function readArticleReaderAsset({ feedOnly = false } = {}) {
  const helpers = ARTICLE_READER_HELPERS;
  // Non-detail public routes need cards, not the rich-document renderer.
  // Keep identical bindings; detail, owner and static fallback use the full asset.
  const documentRegistration = feedOnly ? 'export function registerArticleDocument() {}' : "export {registerArticleDocument} from './article-document.mjs';";
  const name = feedOnly ? 'article-feed' : 'article-reader';
  const code = buildSync({
    stdin: { contents: `${documentRegistration} export {installContentProtection} from './src/visitor/content-protection.mjs'; export {registerArticleCarousel} from './src/visitor/article-carousel.mjs'; export {${helpers.join(',')}} from './src/visitor/article-detail.mjs'; export {${HOME_ARTICLE_HELPERS.join(',')}} from './src/visitor/home-articles.mjs';`, resolveDir: fileURLToPath(ROOT), sourcefile: name + '.mjs' },
    bundle: true, write: false, treeShaking: true, minify: true, format: 'iife',
    globalName: 'CoverMateArticleReader', target: 'es2022', charset: 'utf8'
  }).outputFiles[0].text;
  const hash = createHash('sha256').update(code).digest('hex').slice(0,16);
  return {code,file:new URL(`assets/visitor/${name}.js`,ROOT),url:`/assets/visitor/${name}.js?v=${hash}`};
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
  const boot = readBootSurface();
  const contract = readText(new URL('covermate-contract.js', ROOT));
  const visitorStyles = Object.fromEntries(readVisitorStyleAssets().map(asset => [asset.name, asset.link]));
  assertSingleSlot(contract, '// COVERMATE_CMS_SCHEMA_BEGIN', 'covermate-contract.js');
  assertSingleSlot(contract, '// COVERMATE_CMS_SCHEMA_END', 'covermate-contract.js');
  return {
    shell: readText(VISITOR_SOURCE_PATHS.shell)
      .replace('<!-- COVERMATE_BOOT_SURFACE -->', () => boot.html)
      .replace('/* COVERMATE_BOOT_STYLES */', () => boot.css)
      .replace('// COVERMATE_BOOT_SCRIPT', () => boot.script),
    template: readText(VISITOR_SOURCE_PATHS.template)
      .replace(DESIGN_SYSTEM_STYLE, () => visitorStyles.organic)
      .replace(EDITOR_TOOLS_STYLE, () => visitorStyles['editor-tools'])
      .replace(LAYOUT_STYLE, () => visitorStyles.layout)
      .replace('<!-- COVERMATE_SUBMISSION_TEMPLATE -->', () => readText(new URL('src/visitor/submission.html', ROOT)))
      .replace('<style>/* COVERMATE_SUBMISSION_STYLES */</style>', () => visitorStyles.submission)
      .replace('<!-- COVERMATE_CALCULATOR_TEMPLATE -->', () => readText(new URL('src/visitor/calculator.html', ROOT)))
      .replace('<style>/* COVERMATE_CALCULATOR_STYLES */</style>', () => visitorStyles.calculator)
      .replace('<!-- COVERMATE_HOME_TEMPLATE -->', () => readText(new URL('src/visitor/home.html', ROOT)))
      .replace('<!-- COVERMATE_SERVICE_PAGE_TEMPLATE -->', () => readText(new URL('src/visitor/service-page.html', ROOT)))
      .replace('<!-- COVERMATE_HOME_ARTICLES_TEMPLATE -->', () => readText(new URL('src/visitor/home-articles.html', ROOT)))
      .replace('<!-- COVERMATE_ARTICLES_INDEX_TEMPLATE -->', () => readText(new URL('src/visitor/articles-index.html', ROOT)))
      .replace('<!-- COVERMATE_ARTICLE_DETAIL_TEMPLATE -->', () => readText(new URL('src/visitor/article-detail.html', ROOT)))
      .replaceAll('<!-- COVERMATE_ARTICLE_CTA -->', () => readText(new URL('src/visitor/article-cta.html', ROOT)))
      .replaceAll('<!-- COVERMATE_ARTICLE_CARD -->', () => readText(new URL('src/visitor/article-card.html', ROOT)))
      .replaceAll('<!-- COVERMATE_ARTICLE_SORT -->', () => readText(new URL('src/visitor/article-sort.html', ROOT)))
      .replaceAll('<!-- COVERMATE_TIER_CELL -->', () => readText(new URL('src/visitor/tier-cell.html', ROOT)))
      .replaceAll('<!-- COVERMATE_PROOF_CREDENTIALS -->', () => readText(new URL('src/visitor/proof-credentials.html', ROOT)))
      .replace('<!-- COVERMATE_EDITOR_CONTENT -->', () => readText(new URL('src/visitor/editor-content.html', ROOT)))
      .replace('<!-- COVERMATE_EDITOR_BRAND -->', () => readText(new URL('src/visitor/editor-brand.html', ROOT)))
      .replace('<!-- COVERMATE_EDITOR_VERSIONS -->', () => readText(new URL('src/visitor/editor-versions.html', ROOT)))
      .replace('<!-- COVERMATE_EDITOR_VERSION_DETAIL -->', () => readText(new URL('src/visitor/editor-version-detail.html', ROOT)))
      .replaceAll('<!-- COVERMATE_EDITOR_BRAND_LOCATION -->', () => readText(new URL('src/visitor/editor-brand-location.html', ROOT)))
      .replaceAll('<!-- COVERMATE_EDITOR_CMS_FIELD -->', () => readText(new URL('src/visitor/editor-cms-field.html', ROOT)))
      .replaceAll('<!-- COVERMATE_EDITOR_CMS_INPUT -->', () => readText(new URL('src/visitor/editor-cms-input.html', ROOT)))
      .replaceAll('<!-- COVERMATE_EDITOR_CONTACT -->', () => readText(new URL('src/visitor/editor-contact.html', ROOT)))
      .replaceAll('<!-- COVERMATE_EDITOR_PREVIEW -->', () => readText(new URL('src/visitor/editor-preview.html', ROOT)))
      .replace('<!-- COVERMATE_EDITOR_HERO -->', () => readText(new URL('src/visitor/editor-hero.html', ROOT)))
      .replaceAll('<!-- COVERMATE_EDITOR_FIELD -->', () => readText(new URL('src/visitor/editor-field.html', ROOT)))
      .replaceAll('<!-- COVERMATE_EDITOR_LANGUAGE -->', () => readText(new URL('src/visitor/editor-language.html', ROOT)))
      .replaceAll('<!-- COVERMATE_EDITOR_PAGE -->', () => readText(new URL('src/visitor/editor-page.html', ROOT)))
      .replace('<style>/* COVERMATE_EDITOR_PANEL_STYLES */</style>', () => visitorStyles['editor-panel'])
      .replace('<style>/* COVERMATE_HOME_STYLES */</style>', () => visitorStyles.home)
      .replace('<style>/* COVERMATE_SERVICE_PAGE_STYLES */</style>', () => visitorStyles['service-page'])
      .replace('<style>/* COVERMATE_ARTICLES_INDEX_STYLES */</style>', () => visitorStyles['articles-index'])
      .replace('<style>/* COVERMATE_ARTICLE_DETAIL_STYLES */</style>', () => visitorStyles['article-detail'])
      .replace('<!-- COVERMATE_LINE_CONTACT -->', () => readText(new URL('src/visitor/line-contact.html', ROOT)))
      .replace('<style>/* COVERMATE_LINE_STYLES */</style>', () => visitorStyles['line-contact'])
      .replace('<!-- COVERMATE_SELECT_STYLES -->', () => visitorStyles.select)
      .replaceAll('<!-- COVERMATE_LINE_MARK -->', () => readText(new URL('src/visitor/line-mark.html', ROOT))),
    defaults: readText(VISITOR_SOURCE_PATHS.defaults).replace(/\s*$/, "\n"),
    runtime: readText(VISITOR_SOURCE_PATHS.runtime).replace(/\s*$/, "\n").replace('/assets/visitor/select.js',readSelectAsset().url).replace('/assets/visitor/editor-preview.js',readEditorPreviewAsset().url),
    logoVariantsSource: readText(new URL('src/visitor/logo-variants.mjs', ROOT)).replace(/^export /gm, ''),
    adminLabels: readText(new URL('src/visitor/admin-labels.js', ROOT)),
    cmsController: buildSync({
      entryPoints: [fileURLToPath(new URL('src/visitor/cms-controller.js', ROOT))],
      bundle: true, write: false, minify: true, format: 'iife', globalName: 'CoverMateCms',
      target: 'es2022', charset: 'utf8'
    }).outputFiles[0].text.replace('/assets/visitor/editor-versions.js',readEditorVersionsAsset().url),
    calculatorSource: readText(new URL('covermate-calculator.mjs', ROOT)).replace(/^export /gm, ''),
    recommendationSource: readText(new URL('covermate-recommendations.mjs', ROOT)).replace(/^export /gm, ''),
    submissionSource: readText(new URL('covermate-submission.mjs', ROOT)).replace(/^export /gm, ''),
    homeArticlesSource: ['article-image-assets.mjs','article-media.mjs','src/visitor/home-articles.mjs'].map(file=>readText(new URL(file,ROOT)).replace(/^import .*;\n/gm, '').replace(/^export /gm, '')).join('\n'),
    servicePageSource: readText(new URL('src/visitor/service-page.mjs', ROOT)).replace(/^import .*;\n/gm, '').replace(/^export /gm, ''),
    articlesIndexSource: readText(new URL('src/visitor/articles-index.mjs', ROOT)).replace(/^import .*;\n/gm, '').replace(/^export /gm, ''),
    articleDetailSource: readArticleReaderAsset().code + '\n' + ARTICLE_READER_BINDINGS,
    cmsSchema: contract.split('// COVERMATE_CMS_SCHEMA_BEGIN')[1].split('// COVERMATE_CMS_SCHEMA_END')[0],
    seoSource: readText(new URL('covermate-seo.mjs', ROOT)).split('\nexport function renderSeoHead')[0].replace(/^import .*service-page\.mjs.*;\n/gm, '').replace(/^export /gm, ''),
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
    .replace('// COVERMATE_LOGO_VARIANTS_SOURCE', () => sources.logoVariantsSource)
    .replace('// COVERMATE_ADMIN_LABELS_SOURCE', () => sources.adminLabels)
    .replace('// COVERMATE_CMS_CONTROLLER_SOURCE', () => sources.cmsController)
    .replace('// COVERMATE_CALCULATOR_SOURCE', () => sources.calculatorSource)
    .replace('// COVERMATE_RECOMMENDATION_SOURCE', () => sources.recommendationSource)
    .replace('// COVERMATE_SUBMISSION_SOURCE', () => sources.submissionSource)
    .replace('// COVERMATE_HOME_ARTICLES_SOURCE', () => sources.homeArticlesSource)
    .replace('// COVERMATE_SERVICE_PAGE_SOURCE', () => sources.servicePageSource)
    .replace('// COVERMATE_ARTICLES_INDEX_SOURCE', () => sources.articlesIndexSource)
    .replace('// COVERMATE_ARTICLE_DETAIL_SOURCE', () => sources.articleDetailSource)
    .replace('// COVERMATE_SEO_SOURCE', () => sources.seoSource)
    .replace(VISITOR_ASSET_VERSIONS_SLOT, () => JSON.stringify(sources.imageVersions || readImageVersions()));
}

function publicVisitorSources(sources) {
  // Explicit source boundaries fail closed when the shared template changes.
  const replaceRegion = (source, start, end, replacement = '') => {
    assertSingleSlot(source, start, 'public build');
    assertSingleSlot(source, end, 'public build');
    const a = source.indexOf(start), b = source.indexOf(end);
    if (b < a) throw new Error('Invalid owner boundary: ' + start);
    return source.slice(0, a) + replacement + source.slice(b + end.length);
  };
  let runtime = sources.runtime;
  for (const label of ['LISTENERS', 'FIELDS', 'OUTLINE', 'DIRTY', 'BRAND_VALUES', 'VALUES']) {
    runtime = replaceRegion(runtime, '// COVERMATE_OWNER_' + label + '_BEGIN', '// COVERMATE_OWNER_' + label + '_END');
  }
  runtime = replaceRegion(runtime, '/* COVERMATE_OWNER_BASE_BEGIN */', '/* COVERMATE_OWNER_BASE_END */', 'DCLogic');
  const template = replaceRegion(sources.template, '<!-- COVERMATE_OWNER_UI_BEGIN -->', '<!-- COVERMATE_OWNER_UI_END -->')
    .replace(/<link rel="stylesheet" href="\/assets\/visitor\/editor-(?:tools|panel)\.css[^"]*">/g, '')
    .replace('<html ', '<html data-covermate-surface="public" ');
  return { ...sources, runtime, template, cmsController: '', adminLabels: '',
    shell: sources.shell.replace('<html ', '<html data-covermate-surface="public" ') };
}

export function buildVisitorTemplate(sources = readVisitorSources()) {
  assertSingleSlot(sources.template, VISITOR_RUNTIME_SLOT, "src/visitor/template.html");
  const defaults = JSON.parse(vm.runInNewContext(sources.defaults + '\nJSON.stringify(DEFAULTS)'));
  // Keep source and diagnostic builds readable; compact only shipped output.
  // No output format: esbuild retains top-level Component while compacting locals.
  const runtime = transformSync(buildVisitorRuntime({ ...sources, articleDetailSource: ARTICLE_READER_BINDINGS, homeArticlesSource: HOME_ARTICLE_BINDINGS, defaults: 'const DEFAULTS = ' + JSON.stringify(defaults) + ';' }), {
    minifyWhitespace: true, minifyIdentifiers: true, charset: 'utf8'
  }).code
    // Existing seed/export tools use these two boundaries in the generated HTML.
    .replace(/\bconst (DEFAULTS|SCHEMA)=/g, 'const $1 =');
  // Compact the static CSS blocks before inserting the runtime script.
  // The component runtime scans inert scripts as soon as it loads, so its
  // reader dependency must execute before the first runtime script.
  const template = sources.template.replace('<script src=', `<script src="${readArticleReaderAsset().url}" data-covermate-article-feed="${readArticleReaderAsset({ feedOnly: true }).url}"></script>\n<script src=`).replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_, open, css, close) => open + transformSync(css, { loader: 'css', minifyWhitespace: true }).code + close)
    // Omit source-only comments and tag indentation from shipped HTML. Keep
    // integration markers, word separators and raw-text blocks verbatim.
    .replace(/(<(pre|textarea|script|style)\b[^>]*>[\s\S]*?<\/\2>)|<!--[\s\S]*?-->|^[\t ]+(?=<)/gim,
      (match, rawText) => rawText || (match.startsWith('<!-- COVERMATE_') ? match : ''));
  return withDefaultSeo(template.replace(VISITOR_RUNTIME_SLOT, () => runtime.trimEnd()), sources);
}

function withDefaultSeo(html, sources) {
  const raw = JSON.parse(vm.runInNewContext(sources.defaults + '\nJSON.stringify(DEFAULTS)'));
  const site = sanitizeStateDoc({ config: raw, text: {}, revision: 1 }).config;
  return html.replace('<!-- COVERMATE_SEO_HEAD -->', () => '<!-- COVERMATE_SEO_START -->\n' + renderSeoHead(createSeoModel(site)) + '\n<!-- COVERMATE_SEO_END -->');
}

export function buildVisitorIndex(sources = readVisitorSources(), { publicOnly = false } = {}) {
  if (publicOnly) sources = publicVisitorSources(sources);
  assertSingleSlot(sources.shell, VISITOR_TEMPLATE_SLOT, "src/visitor/shell.html");
  const template = buildVisitorTemplate(sources);
  const serializedTemplate = `${BUNDLER_TEMPLATE_OPEN}${serializeBundlerTemplate(template)}</script>`;
  // The template is inert until CMS hydration finishes. Discover its exact CSS
  // URLs during the outer HTML parse instead of starting a second waterfall at
  // the document swap. Preloads do not apply template styles to the boot UI.
  const stylePreloads = [...new Set([...template.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map(match => match[1]))]
    .filter(href => href.startsWith('/assets/') && !sources.shell.includes('href="' + href + '"'))
    .map(href => `<link rel="preload" as="style" href="${href}">`).join('\n');
  // Brand names and numbers use this subset in both languages. Thai is already
  // discovered by the localized loading copy; do not preload unused subsets.
  const startupHints = stylePreloads + '\n<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/google-sans-latin.woff2" crossorigin>';
  // Keep the readable bootstrap source, without shipping its comments/whitespace.
  const shell = sources.shell.replace('/covermate-analytics.js', readAnalyticsAsset().url).replace(/(<script id="covermate-bootstrap">)([\s\S]*?)(<\/script>)/,
    (_, open, script, close) => open + transformSync(script, { minifyWhitespace: true }).code + close);
  return withDefaultSeo(shell, sources).replace('</head>', () => startupHints + '\n</head>').replace(VISITOR_TEMPLATE_SLOT, () => serializedTemplate);
}
