import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gzipSync } from 'node:zlib';
import { buildVisitorIndex, readVisitorSources } from './lib/visitor-source.mjs';
import { extractBundlerTemplate } from './lib/bundler-template.mjs';

const sources = readVisitorSources();
const owner = fs.readFileSync('index.html', 'utf8');
const visitor = fs.readFileSync('server/visitor-public.html', 'utf8');
const publicTemplate = extractBundlerTemplate(visitor);
const ownerTemplate = extractBundlerTemplate(owner);
for (const pattern of [/withCmsController/, /<aside[^>]+data-editor-panel/, /editor-panel\.css/, /editor-tools\.css/]) {
  assert.match(ownerTemplate, pattern);
  assert.doesNotMatch(publicTemplate, pattern);
}
for (const marker of ['class="hm-menu"', 'id="articles-search"', 'class="cm-footer-logo"', 'type="text/x-dc"']) {
  assert.ok(publicTemplate.includes(marker), 'Shared public template keeps ' + marker);
}
assert.ok(gzipSync(visitor).length < gzipSync(owner).length * 0.85, 'Public payload must remain at least 15% smaller compressed than owner');
assert.ok(gzipSync(visitor).length < 195000, 'Public shell compressed budget');
assert.doesNotMatch(publicTemplate,/c_limit,w_/,'Responsive delivery logic belongs to the shared reader, not every HTML response');
assert.match(fs.readFileSync('assets/visitor/article-reader.js','utf8'),/projectHomeArticles/);
for (const [key, marker] of [
  ['runtime', '// COVERMATE_OWNER_VALUES_BEGIN'],
  ['runtime', '/* COVERMATE_OWNER_BASE_END */'],
  ['template', '<!-- COVERMATE_OWNER_UI_BEGIN -->']
]) {
  assert.throws(() => buildVisitorIndex({...sources, [key]:sources[key].replace(marker, '')}, {publicOnly:true}), /public build: missing/);
}
assert.throws(() => buildVisitorIndex({...sources, template:sources.template
  .replace('<!-- COVERMATE_OWNER_UI_BEGIN -->', '<!-- SWAP_BOUNDARY -->')
  .replace('<!-- COVERMATE_OWNER_UI_END -->', '<!-- COVERMATE_OWNER_UI_BEGIN -->')
  .replace('<!-- SWAP_BOUNDARY -->', '<!-- COVERMATE_OWNER_UI_END -->')}, {publicOnly:true}), /Invalid owner boundary/);
console.log('PASS: public/owner artifacts, retained visitor markup, compressed budget, fail-closed owner boundaries.');
