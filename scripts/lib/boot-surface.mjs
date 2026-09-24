import fs from 'node:fs';
import { transformSync } from 'esbuild';

const root = new URL('../../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const attribute = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

// Inline the same surface for each entry point so loading feedback needs no JS request.
export function readBootSurface({ loadingTh = '', loadingEn = '' } = {}) {
  return {
    html: read('src/shared/boot.html').replace('aria-busy="true"',
      `aria-busy="true" data-loading-th="${attribute(loadingTh)}" data-loading-en="${attribute(loadingEn)}"`),
    css: transformSync(read('src/visitor/boot.css'), { loader: 'css', minify: true }).code,
    script: transformSync(read('src/visitor/boot.js'), { minify: true }).code
  };
}
