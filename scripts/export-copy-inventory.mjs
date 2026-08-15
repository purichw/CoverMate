import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const indexPath = path.join(repoRoot, "index.html");
const outDir = path.join(repoRoot, "docs", "content");
const jsonOut = path.join(outDir, "covermate-text-inventory.json");
const mdOut = path.join(outDir, "covermate-text-inventory.md");

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg.startsWith("--")) {
    args.set(arg.slice(2), process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[++i] : true);
  }
}

const liveCapturePath = args.get("live") || "";
const includeAdmin = args.has("include-admin");
const includeDefaults = args.has("include-defaults");
const includeJsLiterals = args.has("include-js-literals");
const includeSeo = args.has("include-seo");
const includeRawOverrides = args.has("include-raw-overrides");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function extractTemplateFromBundledHtml(html, fileLabel) {
  const open = '<script type="__bundler/template">';
  const starts = [];
  let cursor = 0;
  while ((cursor = html.indexOf(open, cursor)) >= 0) {
    starts.push(cursor);
    cursor += open.length;
  }
  if (!starts.length) throw new Error(`${fileLabel}: embedded template missing`);

  const parsed = starts.map((start) => {
    const jsonStart = start + open.length;
    if (html[jsonStart] !== '"') throw new Error(`${fileLabel}: embedded template is not a JSON string`);
    let escaped = false;
    let jsonEnd = -1;
    for (let i = jsonStart + 1; i < html.length; i += 1) {
      const ch = html[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        jsonEnd = i + 1;
        break;
      }
    }
    if (jsonEnd < 0) throw new Error(`${fileLabel}: embedded template JSON is unterminated`);
    const template = JSON.parse(html.slice(jsonStart, jsonEnd));
    return {
      template,
      complete: template.includes("</html>") && template.includes("const DEFAULTS =")
    };
  });

  const chosen = [...parsed].reverse().find((part) => part.complete) || parsed.at(-1);
  if (!chosen.complete) throw new Error(`${fileLabel}: embedded template is incomplete`);
  return chosen.template;
}

function extractDefaultConfig() {
  const template = extractTemplateFromBundledHtml(read(indexPath), "index.html");
  const scriptMatch = template.match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error("index.html: text/x-dc script missing");
  const scriptSource = scriptMatch[1];
  const defaultsEnd = scriptSource.indexOf("const SCHEMA =");
  if (defaultsEnd < 0) throw new Error("index.html: DEFAULTS boundary missing");
  const sandbox = { result: null };
  vm.runInNewContext(`${scriptSource.slice(0, defaultsEnd)}\nresult = DEFAULTS;`, sandbox);
  return { config: sandbox.result, template, scriptSource };
}

function loadLiveCapture(file) {
  if (!file) return null;
  if (!fs.existsSync(file)) throw new Error(`Live capture not found: ${file}`);
  const capture = JSON.parse(read(file));
  const liveConfig = capture?.payload?.liveConfig ? JSON.parse(capture.payload.liveConfig) : null;
  const liveText = capture?.payload?.liveText ? JSON.parse(capture.payload.liveText) : {};
  return { capture, liveConfig, liveText };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasThai(value) {
  return /[\u0E00-\u0E7F]/.test(value);
}

function detectLanguage(pathParts, value) {
  const last = pathParts[pathParts.length - 1];
  if (last === "th") return "th";
  if (last === "en") return "en";
  if (hasThai(value) && /[A-Za-z]/.test(value)) return "mixed";
  if (hasThai(value)) return "th";
  if (/[A-Za-z]/.test(value)) return "en";
  return "neutral";
}

function isAssetOrUrl(pathParts, value) {
  const key = pathParts[pathParts.length - 1] || "";
  if (/logo|image|icon|url|href|path|src/i.test(key)) return true;
  return /^(https?:\/\/|\/|assets\/|#|mailto:|tel:|line:)/i.test(value);
}

function isImplementationToken(pathParts, value) {
  const key = pathParts[pathParts.length - 1] || "";
  if (/^(id|type|bg|tone|icon|st|on|cols|columns|href|show|sticky|showNav|showCta|showFooter|stickyBar)$/i.test(key)) {
    return true;
  }
  if (/^(hero|trust|products|review|fit|steps|insurers|tiers|claim|renew|guides|stories|testimonials|about|faq|fees|pdpa|contact|bg|dark|surface|accent|sage|ink|neutral|y|n|p)$/i.test(value)) {
    return true;
  }
  return false;
}

function isProtected(pathParts, value) {
  const keyPath = pathParts.join(".");
  return (
    /credential|legal|licen[cs]e|oic/i.test(keyPath) ||
    /6401006221|6804008544|5704011570|ว00287\/2534/.test(value)
  );
}

function classifySurface(pathParts) {
  if (pathParts[0] === "sections") return "public-section";
  if (pathParts[0] === "header") return "public-header";
  if (pathParts[0] === "footer") return "public-footer";
  if (pathParts[0] === "seo") return "seo";
  if (pathParts[0] === "brand") return "brand";
  if (pathParts[0] === "contact") return "contact";
  if (pathParts[0] === "theme") return "theme";
  return "site-config";
}

function findSectionMeta(rootConfig, pathParts) {
  if (pathParts[0] !== "sections") return {};
  const sectionIndex = Number(pathParts[1]);
  const section = rootConfig.sections?.[sectionIndex];
  if (!section) return {};
  let repeatable = null;
  let repeatableIndex = null;
  let repeatableId = null;
  for (const key of ["items", "cards", "heads"]) {
    const idx = pathParts.indexOf(key);
    if (idx >= 0) {
      repeatable = key;
      repeatableIndex = Number(pathParts[idx + 1]);
      repeatableId = section[key]?.[repeatableIndex]?.id || section[key]?.[repeatableIndex]?.n || null;
      break;
    }
  }
  return {
    sectionId: section.id || null,
    sectionType: section.type || null,
    sectionOrder: sectionIndex + 1,
    routeAnchor: section.id ? `#${section.id}` : null,
    repeatable,
    repeatableIndex: Number.isFinite(repeatableIndex) ? repeatableIndex : null,
    repeatableId
  };
}

function editableLocation(pathParts, sectionId) {
  if (isProtected(pathParts, "")) return "Protected compliance copy";
  if (pathParts[0] === "brand" || pathParts[0] === "contact" || pathParts[0] === "footer" || pathParts[0] === "seo") {
    return "Owner CMS > Brand & chrome";
  }
  if (pathParts[0] === "header") return "Owner CMS > Brand & chrome / public nav";
  if (pathParts[0] === "sections") {
    if (sectionId === "cover") return "Inline editor on hero coverage accordions";
    return "Inline editor / Owner CMS > Content where structured controls exist";
  }
  return "Implementation metadata";
}

function copyKind(pathParts, value) {
  if (isImplementationToken(pathParts, value)) return "implementation-token";
  if (isProtected(pathParts, value)) return "protected";
  if (isAssetOrUrl(pathParts, value)) return "asset-or-url";
  if (/^\s*[A-Z0-9_-]+\s*$/.test(value) && value.length <= 6) return "short-label";
  if (/^[\d+() xX.-]+$/.test(value)) return "contact-or-number";
  return "copy";
}

function createEntry({ source, sourceFile, sourceCapturedAt, rootConfig, pathParts, value, note = "" }) {
  const sectionMeta = findSectionMeta(rootConfig, pathParts);
  const kind = copyKind(pathParts, value);
  const protectedCopy = isProtected(pathParts, value);
  const lang = detectLanguage(pathParts, value);
  const jsonPath = pathParts.join(".");
  return {
    id: `${source}:${jsonPath}`,
    source,
    sourceFile,
    sourceCapturedAt: sourceCapturedAt || null,
    surface: classifySurface(pathParts),
    jsonPath,
    field: pathParts[pathParts.length - 1] || "",
    language: lang,
    value,
    charCount: value.length,
    hasThai: hasThai(value),
    copyKind: kind,
    editable: kind === "copy" || kind === "short-label",
    protected: protectedCopy,
    visibility: "visitor-visible",
    editLocation: editableLocation(pathParts, sectionMeta.sectionId),
    rewriteGuidance: protectedCopy
      ? "Do not change licence numbers, legal assertions, or compliance meaning without owner/legal approval."
      : kind === "asset-or-url"
        ? "Metadata/reference value; rewrite only if changing linked asset or URL intentionally."
        : "Candidate for copy refinement.",
    note,
    ...sectionMeta
  };
}

function walkStrings(obj, visitor, parts = []) {
  if (typeof obj === "string") {
    const value = obj.replace(/\r\n/g, "\n").trim();
    if (value && !isImplementationToken(parts, value)) visitor(parts, value);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => walkStrings(item, visitor, parts.concat(String(index))));
    return;
  }
  if (obj && typeof obj === "object") {
    Object.keys(obj).forEach((key) => walkStrings(obj[key], visitor, parts.concat(key)));
  }
}

function configEntries(config, source, sourceFile, sourceCapturedAt = null, note = "") {
  const entries = [];
  walkStrings(config, (pathParts, value) => {
    if (!isVisibleConfigPath(config, pathParts)) return;
    entries.push(createEntry({ source, sourceFile, sourceCapturedAt, rootConfig: config, pathParts, value, note }));
  });
  return entries;
}

function isEnabled(node) {
  if (!node || typeof node !== "object") return true;
  return !(node.on === false || node.show === false || node.visible === false);
}

function isVisibleConfigPath(config, pathParts) {
  const root = pathParts[0];
  if (root === "theme" || root === "seo") return false;

  if (root === "brand") {
    const field = pathParts[pathParts.length - 1] || "";
    return !/^(initial|advisorLogo|advisorLogoAlt)$/i.test(field);
  }

  if (root === "header") {
    if (!isEnabled(config.header)) return false;
    if (pathParts[1] === "nav" && config.header?.showNav === false) return false;
    if (pathParts[1] === "cta" && config.header?.showCta === false) return false;
    return true;
  }

  if (root === "footer") return isEnabled(config.footer);
  if (root !== "sections") return true;

  const section = config.sections?.[Number(pathParts[1])];
  if (!isEnabled(section)) return false;

  for (const collection of ["items", "cards", "heads"]) {
    const idx = pathParts.indexOf(collection);
    if (idx < 0) continue;
    const item = section?.[collection]?.[Number(pathParts[idx + 1])];
    if (!isEnabled(item)) return false;
  }

  return true;
}

function applyLiveTextOverrides(config, liveText) {
  const next = clone(config);
  const applied = [];
  const topLevelOrder = ["kicker", "title", "body", "note", "cta1", "cta2"];

  Object.entries(liveText || {}).forEach(([key, rawValue]) => {
    const [sectionId, sequenceRaw, lang] = key.split(":");
    const sequence = Number(sequenceRaw);
    const value = String(rawValue || "").trim();
    if (!sectionId || !lang || !Number.isFinite(sequence) || !value) return;

    const sectionIndex = (next.sections || []).findIndex((section) => section && section.id === sectionId);
    const section = next.sections?.[sectionIndex];
    if (!section || !section[lang] || typeof section[lang] !== "object") return;

    const directField = topLevelOrder.filter((field) => typeof section[lang][field] === "string")[sequence];
    if (directField) {
      const previousValue = section[lang][directField];
      section[lang][directField] = value;
      applied.push({ key, sectionId, sectionOrder: sectionIndex + 1, lang, field: directField, previousValue, value });
      return;
    }

    const values = Object.entries(section[lang]).filter(([, candidate]) => typeof candidate === "string");
    const alreadyMatching = values.find(([, candidate]) => candidate.trim() === value);
    if (alreadyMatching) {
      applied.push({ key, sectionId, sectionOrder: sectionIndex + 1, lang, field: alreadyMatching[0], previousValue: value, value });
    }
  });

  return { config: next, applied };
}

function liveTextEntries(liveText, capturedAt) {
  return Object.entries(liveText || {}).map(([key, value]) => {
    const [sectionId, sequence, lang] = key.split(":");
    const text = String(value || "").trim();
    return {
      id: `production-live-text-overrides:${key}`,
      source: "production-live-text-overrides",
      sourceFile: liveCapturePath || null,
      sourceCapturedAt: capturedAt || null,
      surface: "public-inline-override",
      jsonPath: key,
      field: "inlineTextOverride",
      language: lang || detectLanguage([], text),
      value: text,
      charCount: text.length,
      hasThai: hasThai(text),
      copyKind: "copy",
      editable: true,
      protected: isProtected([sectionId, sequence, lang], text),
      editLocation: "Inline editor overlay text map",
      rewriteGuidance: "This overrides rendered text by section sequence. Preserve the key unless remapping inline editable nodes.",
      note: "Stored separately from config as live text override. The public CMS table already applies these when a matching field is known.",
      sectionId,
      sectionType: null,
      sectionOrder: null,
      routeAnchor: sectionId ? `#${sectionId}` : null,
      repeatable: null,
      repeatableIndex: Number.isFinite(Number(sequence)) ? Number(sequence) : null,
      repeatableId: null
    };
  });
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function humanText(value) {
  const text = decodeHtml(String(value || "")).replace(/\s+/g, " ").trim();
  if (text.length < 2) return "";
  if (text.length > 500) return "";
  if (/^[{}[\]().,;:|/\\_-]+$/.test(text)) return "";
  if (/^(https?:|\/|assets\/|#[A-Za-z0-9_-]+$)/.test(text)) return "";
  if (/^(var\(|rgb|rgba|#[0-9a-f]{3,8}$)/i.test(text)) return "";
  if (/^[a-z0-9_-]+:[a-z0-9_-]+$/i.test(text)) return "";
  return text;
}

function extractHtmlText(file, surface, htmlOverride = null) {
  const filePath = path.join(repoRoot, file);
  const raw = htmlOverride ?? read(filePath);
  const stripped = raw
    .replace(/<script\b[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "\n")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "\n")
    .replace(/<!--[\s\S]*?-->/g, "\n")
    .replace(/<[^>]+>/g, "\n");
  const seen = new Set();
  const entries = [];
  stripped.split(/\n+/).forEach((chunk, index) => {
    const value = humanText(chunk);
    if (!value || seen.has(value)) return;
    seen.add(value);
    entries.push({
      id: `static-html:${file}:${index}`,
      source: "static-html",
      sourceFile: path.join(repoRoot, file),
      sourceCapturedAt: null,
      surface,
      jsonPath: null,
      field: "visibleTextNode",
      language: detectLanguage([], value),
      value,
      charCount: value.length,
      hasThai: hasThai(value),
      copyKind: isProtected([], value) ? "protected" : "copy",
      editable: false,
      protected: isProtected([], value),
      editLocation: "Source HTML / admin implementation",
      rewriteGuidance: "Static UI/admin chrome copy. Update source implementation, not CMS.",
      note: "Extracted from static HTML text nodes; scripts/styles/SVG removed."
    });
  });
  return entries;
}

function extractHeadSeo(template) {
  const head = template.match(/<head[\s\S]*?<\/head>/i)?.[0] || "";
  const entries = [];
  const allowed = new Set([
    "title",
    "description",
    "application-name",
    "apple-mobile-web-app-title",
    "og:site_name",
    "og:title",
    "og:description",
    "og:image:alt",
    "twitter:title",
    "twitter:description"
  ]);
  const title = head.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  if (title) entries.push(["title", decodeHtml(title)]);
  for (const match of head.matchAll(/<meta\s+([^>]*?)>/gi)) {
    const attrs = match[1];
    const name = attrs.match(/\b(?:name|property)="([^"]+)"/i)?.[1];
    const content = attrs.match(/\bcontent="([^"]*)"/i)?.[1];
    if (name && allowed.has(name) && content && humanText(content)) entries.push([name, decodeHtml(content)]);
  }
  const seen = new Set();
  return entries
    .filter(([key, value]) => {
      const id = `${key}:${value}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map(([key, value]) => ({
      id: `public-head-seo:${key}`,
      source: "public-head-seo",
      sourceFile: indexPath,
      sourceCapturedAt: null,
      surface: "seo",
      jsonPath: key,
      field: key,
      language: detectLanguage([], value),
      value,
      charCount: value.length,
      hasThai: hasThai(value),
      copyKind: "copy",
      editable: true,
      protected: false,
      editLocation: "Owner CMS > Brand & chrome / SEO fields or source head tags",
      rewriteGuidance: "SEO/social copy. Keep title <= 68 chars and description <= 155 chars.",
      note: "Extracted from rendered public head template."
    }));
}

function extractJsLiterals(source, file, surface, skipValues = new Set()) {
  const seen = new Set();
  const entries = [];
  const literalRe = /(['"])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match;
  while ((match = literalRe.exec(source))) {
    const raw = match[2];
    if (/\\[ux][0-9a-fA-F]/.test(raw)) continue;
    let value = raw;
    try {
      value = JSON.parse(`${match[1]}${raw}${match[1]}`);
    } catch {
      value = raw.replace(/\\n/g, "\n").replace(/\\'/g, "'").replace(/\\"/g, "\"");
    }
    value = humanText(value);
    if (!value) continue;
    if (skipValues.has(value)) continue;
    if (/^[MmLlHhVvCcSsQqTtAaZz0-9.,\-\s]+$/.test(value) && /\d/.test(value)) continue;
    if (/[<>]/.test(value)) continue;
    if (/^[a-z][a-z0-9_-]{1,24}$/.test(value)) continue;
    if (isImplementationToken([], value)) continue;
    if (/^(click|change|submit|input|keydown|load|error|module|button|checkbox|radio|true|false|null|none|block|flex|grid)$/i.test(value)) continue;
    if (/^(covermate-|purich-|data-|aria-|id=|class=|\[|\.)/i.test(value)) continue;
    if (!hasThai(value) && !/[A-Z][a-z]/.test(value) && !/\s/.test(value) && value.length > 12) continue;
    const key = `${file}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const before = source.slice(0, match.index);
    const line = before.split("\n").length;
    entries.push({
      id: `js-literal:${file}:${line}:${entries.length + 1}`,
      source: "js-literal",
      sourceFile: path.join(repoRoot, file),
      sourceCapturedAt: null,
      surface,
      jsonPath: null,
      field: "stringLiteral",
      language: detectLanguage([], value),
      value,
      charCount: value.length,
      hasThai: hasThai(value),
      copyKind: isProtected([], value) ? "protected" : "copy",
      editable: false,
      protected: isProtected([], value),
      editLocation: "Source JS implementation",
      rewriteGuidance: "Likely UI label/status/error copy. Verify in UI before rewriting.",
      note: `Approximate line ${line}; regex-extracted string literal.`
    });
  }
  return entries;
}

function summarize(entries) {
  const by = (key) => entries.reduce((acc, entry) => {
    const value = entry[key] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  return {
    totalEntries: entries.length,
    editableEntries: entries.filter((entry) => entry.editable).length,
    protectedEntries: entries.filter((entry) => entry.protected).length,
    bySource: by("source"),
    bySurface: by("surface"),
    byLanguage: by("language"),
    byCopyKind: by("copyKind")
  };
}

function copyWarnings(entries) {
  return entries.flatMap((entry) => {
    const warnings = [];
    if (/\b26\+?\b|กว่า 26/.test(entry.value) && /motor|insurer|ประกันรถยนต์|บริษัท/i.test(entry.value)) {
      warnings.push({
        entryId: entry.id,
        jsonPath: entry.jsonPath,
        value: entry.value,
        issue: "Company count says 26/26+ but current product decision and visible insurer logos are 14.",
        recommendation: "Rewrite this copy to use 14 where it refers to motor insurer/logo count."
      });
    }
    return warnings;
  });
}

function isVisiblePublicPageTextEntry(entry) {
  if (!["production-live", "production-live-text-overrides", "repo-defaults"].includes(entry.source)) return false;
  if (["asset-or-url", "implementation-token"].includes(entry.copyKind)) return false;
  if (["theme", "seo"].includes(entry.surface)) return false;
  if (entry.source === "production-live-text-overrides" && !includeRawOverrides) return false;
  return ["brand", "contact", "public-header", "public-footer", "public-section", "public-inline-override"].includes(entry.surface);
}

function mdEscape(value) {
  return String(value || "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, "<br>");
}

function mdSectionTable(title, entries, limit = Infinity) {
  const rows = entries.slice(0, limit).map((entry) =>
    `| \`${mdEscape(entry.id)}\` | ${mdEscape(entry.language)} | ${mdEscape(entry.surface)} | ${mdEscape(entry.jsonPath || entry.field)} | ${mdEscape(entry.value)} | ${mdEscape(entry.rewriteGuidance)} |`
  );
  if (!rows.length) return "";
  return [
    `## ${title}`,
    "",
    "| ID | Lang | Surface | Path/Field | Current text | Guidance |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
    ""
  ].join("\n");
}

function writeMarkdown(payload) {
  const publicConfigSources = ["production-live", "repo-defaults"];
  const editable = payload.entries.filter((entry) => entry.editable && entry.copyKind !== "asset-or-url");
  const protectedEntries = payload.entries.filter((entry) => entry.protected);
  const liveOverrides = payload.entries.filter((entry) => entry.source === "production-live-text-overrides");
  const sectionCopy = editable.filter((entry) => publicConfigSources.includes(entry.source) && entry.surface === "public-section");
  const brandContact = editable.filter((entry) => publicConfigSources.includes(entry.source) && ["brand", "contact", "public-header", "public-footer"].includes(entry.surface));

  const lines = [
    "# CoverMate Website Page Text Inventory For ChatGPT Copy Review",
    "",
    `Generated: ${payload.metadata.generatedAt}`,
    "",
    "## Source Precedence",
    "",
    "1. `production-live` entries, when present, were captured from `https://covermate.vercel.app` and should be treated as the current visible public website source.",
    "2. `repo-defaults` entries are the repository cold-start CMS payload. Firestore live content still prevails in production when it loads successfully.",
    "3. Inline-editor overrides from Firestore/local production state are already applied into matching public rows when a live capture is provided.",
    "4. This export includes Thai and English text that visitors can see on the public site: header, footer, brand/contact text, and public page sections.",
    "5. SEO meta tags, private owner/editor UI, URLs, assets, theme tokens, hidden items, and implementation config are intentionally excluded.",
    "",
    "## Product Guardrails For Rewriting",
    "",
    "- Keep motor/company count at `14` where it refers to visible insurer logos.",
    "- Do not change licence numbers: `6401006221`, `6804008544`, `5704011570`, or Thai legal licence `ว00287/2534` without explicit approval.",
    "- Preserve the one-page public site model; `#motor` is an alias into `#insurers`, not a separate page.",
    "- Keep public analytics privacy-safe: no visitor names, phone numbers, LINE IDs, or freeform messages in GA4 copy/events.",
    "",
    "## Suggested Prompt For ChatGPT",
    "",
    "```text",
    "You are helping refine CoverMate public website copy in Thai and English. Use the text inventory below.",
    "Rewrite only entries whose copyKind is copy/short-label and editable is true.",
    "Preserve meaning, trust, Thai naturalness, legal constraints, and the warm personal advisory tone.",
    "Return a table with: ID, original, suggested rewrite, rationale, and risk/notes.",
    "Do not rewrite protected legal/licence copy unless explicitly asked.",
    "Do not invent private owner-interface copy; this export is public visitor-site copy only.",
    "```",
    "",
    "## Summary",
    "",
    "```json",
    JSON.stringify(payload.summary, null, 2),
    "```",
    "",
    payload.warnings.length ? "## Known Copy Checks" : "",
    payload.warnings.length ? "" : "",
    ...payload.warnings.map((warning) => `- \`${mdEscape(warning.entryId)}\`: ${mdEscape(warning.issue)} ${mdEscape(warning.recommendation)}`),
    payload.warnings.length ? "" : "",
    mdSectionTable("Visible Public Page Section Copy", sectionCopy),
    mdSectionTable("Visible Header / Footer / Brand / Contact Copy", brandContact),
    mdSectionTable("Production Live Inline Text Overrides", liveOverrides),
    mdSectionTable("Protected Or Guarded Copy", protectedEntries),
    "## Full Structured Data",
    "",
    `See \`${jsonOut}\` for every extracted entry with metadata.`
  ];
  return lines.filter(Boolean).join("\n");
}

const { config: defaultConfig, template, scriptSource } = extractDefaultConfig();
const live = loadLiveCapture(liveCapturePath);
const entries = [];
const skipLiteralValues = new Set();
let appliedLiveTextOverrides = [];

walkStrings(defaultConfig, (_pathParts, value) => skipLiteralValues.add(value));
if (live?.liveConfig) walkStrings(live.liveConfig, (_pathParts, value) => skipLiteralValues.add(value));
if (live?.liveText) Object.values(live.liveText).forEach((value) => skipLiteralValues.add(String(value || "").trim()));

if (live?.liveConfig) {
  const effective = applyLiveTextOverrides(live.liveConfig, live.liveText);
  appliedLiveTextOverrides = effective.applied;
  entries.push(...configEntries(effective.config, "production-live", liveCapturePath, live.capture?.capturedAt || null, "Captured from production public localStorage after Firestore hydration; matching inline text overrides are applied."));
  if (includeRawOverrides) {
    entries.push(...liveTextEntries(live.liveText, live.capture?.capturedAt || null));
  }
  skipLiteralValues.clear();
  walkStrings(effective.config, (_pathParts, value) => skipLiteralValues.add(value));
  Object.values(live.liveText || {}).forEach((value) => skipLiteralValues.add(String(value || "").trim()));
}

if (includeDefaults) {
  entries.push(...configEntries(defaultConfig, "repo-defaults", indexPath, null, "Repository cold-start fallback; production live content prevails."));
}
if (includeSeo) entries.push(...extractHeadSeo(template));

if (includeJsLiterals) {
  entries.push(...extractJsLiterals(scriptSource, "index.html embedded text/x-dc", "public-runtime", skipLiteralValues));
  const firebasePath = path.join(repoRoot, "covermate-firebase.js");
  if (fs.existsSync(firebasePath)) entries.push(...extractJsLiterals(read(firebasePath), "covermate-firebase.js", "public-runtime", skipLiteralValues));
}

if (includeAdmin) {
  entries.push(...extractHtmlText("admin/index.html", "admin-portal"));
  entries.push(...extractHtmlText("admin/analytics/index.html", "admin-analytics"));

  try {
    const loginTemplate = extractTemplateFromBundledHtml(read(path.join(repoRoot, "admin/login/index.html")), "admin/login/index.html");
    entries.push(...extractHtmlText("admin/login/index.html", "admin-login", loginTemplate));
  } catch {
    entries.push(...extractHtmlText("admin/login/index.html", "admin-login"));
  }

  for (const file of ["admin/ops/app.js", "admin/session.js", "admin/analytics-data.js"]) {
    const filePath = path.join(repoRoot, file);
    if (fs.existsSync(filePath)) entries.push(...extractJsLiterals(read(filePath), file, "admin-system", skipLiteralValues));
  }
}

const visiblePageEntries = entries.filter(isVisiblePublicPageTextEntry);

const payload = {
  metadata: {
    generatedAt: new Date().toISOString(),
    productionUrl: "https://covermate.vercel.app",
    repoRoot,
    liveCapturePath: liveCapturePath || null,
    liveRemoteState: live?.capture?.payload?.remote || null,
    scope: includeAdmin ? "public-page-and-admin" : "public-page-visible-copy-only",
    includeDefaults,
    includeJsLiterals,
    includeSeo,
    includeRawOverrides,
    appliedLiveTextOverrides,
    sourceFiles: [
      indexPath,
      path.join(repoRoot, "covermate-firebase.js")
    ].concat(includeAdmin ? [
      path.join(repoRoot, "admin/index.html"),
      path.join(repoRoot, "admin/login/index.html"),
      path.join(repoRoot, "admin/analytics/index.html"),
      path.join(repoRoot, "admin/ops/app.js")
    ] : [])
  },
  summary: summarize(visiblePageEntries),
  warnings: copyWarnings(visiblePageEntries),
  entries: visiblePageEntries
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(jsonOut, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(mdOut, `${writeMarkdown(payload)}\n`);

console.log(JSON.stringify({
  jsonOut,
  mdOut,
  summary: payload.summary
}, null, 2));
