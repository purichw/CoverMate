export const BUNDLER_TEMPLATE_OPEN = '<script type="__bundler/template">';

const BUNDLER_TEMPLATE_CLOSE_RE = /^\s*<\/script>/i;
const RESOURCE_MARKER_RE =
  /__COVERMATE_RESOURCE_([0-9A-F]{8})_([0-9A-F]{4})_([0-9A-F]{4})_([0-9A-F]{4})_([0-9A-F]{12})__/g;
const UUID_RE = /\b([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\b/gi;

export function restoreTemplateScriptMarkers(template) {
  return String(template)
    .replace(/__COVERMATE_SCRIPT_OPEN__/g, "<script")
    .replace(/__COVERMATE_SCRIPT_SRC_ATTR__/g, "src")
    .replace(RESOURCE_MARKER_RE, (_, a, b, c, d, e) => [a, b, c, d, e].join("-").toLowerCase());
}

export function maskTemplateScriptMarkers(template) {
  return String(template)
    .replace(/<script(\s+)src=/gi, "__COVERMATE_SCRIPT_OPEN__$1__COVERMATE_SCRIPT_SRC_ATTR__=")
    .replace(/<script/gi, "__COVERMATE_SCRIPT_OPEN__")
    .replace(UUID_RE, (_, a, b, c, d, e) => `__COVERMATE_RESOURCE_${[a, b, c, d, e].join("_").toUpperCase()}__`);
}

export function serializeBundlerTemplate(template) {
  return JSON.stringify(maskTemplateScriptMarkers(template)).replace(/<\/script/gi, "<\\/script");
}

export function parseBundlerTemplateParts(html, options = {}) {
  const fileLabel = options.fileLabel || "HTML";
  const completePredicate = options.completePredicate || ((template) => template.includes("</html>"));
  const starts = [];
  let cursor = 0;
  while ((cursor = html.indexOf(BUNDLER_TEMPLATE_OPEN, cursor)) >= 0) {
    starts.push(cursor);
    cursor += BUNDLER_TEMPLATE_OPEN.length;
  }
  if (!starts.length) throw new Error(`${fileLabel}: embedded bundler template not found.`);

  const parsed = starts.map((start) => {
    const jsonStart = start + BUNDLER_TEMPLATE_OPEN.length;
    if (html[jsonStart] !== '"') throw new Error(`${fileLabel}: bundler template content is not a JSON string.`);
    const jsonEnd = findJsonStringEnd(html, jsonStart, fileLabel);
    const close = html.slice(jsonEnd).match(BUNDLER_TEMPLATE_CLOSE_RE);
    if (!close) throw new Error(`${fileLabel}: bundler template closing script tag not found after JSON string.`);
    const rawJson = html.slice(jsonStart, jsonEnd);
    const template = restoreTemplateScriptMarkers(JSON.parse(rawJson));
    const closeEnd = jsonEnd + close[0].length;
    return {
      start,
      jsonStart,
      jsonEnd,
      closeEnd,
      rawJson,
      template,
      fullMatch: html.slice(start, closeEnd),
      complete: Boolean(completePredicate(template))
    };
  });

  return parsed;
}

export function extractBundlerTemplate(html, options = {}) {
  const parts = parseBundlerTemplateParts(html, options);
  const chosen = chooseBundlerTemplatePart(parts, options);
  return chosen.template;
}

export function extractBundlerTemplatePart(html, options = {}) {
  const parts = parseBundlerTemplateParts(html, options);
  return chooseBundlerTemplatePart(parts, options);
}

export function replaceBundlerTemplate(html, template, options = {}) {
  const part = extractBundlerTemplatePart(html, options);
  return `${html.slice(0, part.start)}${BUNDLER_TEMPLATE_OPEN}${serializeBundlerTemplate(template)}</script>${html.slice(part.closeEnd)}`;
}

export function extractTextDcScript(template, fileLabel = "embedded template") {
  const match = String(template).match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`${fileLabel}: text/x-dc script missing.`);
  return match[1];
}

function chooseBundlerTemplatePart(parts, options) {
  const requireComplete = options.requireComplete !== false;
  const chosen = [...parts].reverse().find((part) => part.complete) || parts.at(-1);
  if (requireComplete && !chosen.complete) {
    throw new Error(`${options.fileLabel || "HTML"}: embedded bundler template is incomplete.`);
  }
  return chosen;
}

function findJsonStringEnd(source, jsonStart, fileLabel) {
  let escaped = false;
  for (let i = jsonStart + 1; i < source.length; i += 1) {
    const ch = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') return i + 1;
  }
  throw new Error(`${fileLabel}: unterminated bundler template JSON string.`);
}
