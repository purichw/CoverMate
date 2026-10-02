import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import { logoResponsiveSrcset, LOGO_RESPONSIVE_SIZES } from '../src/visitor/logo-variants.mjs';
import { readImageVersions } from './lib/visitor-source.mjs';

const versions = readImageVersions(), origin = 'https://covermateinsurance.com';
for (const lang of ['th', 'en']) {
  const source = `/assets/brand/covermate-advisory-logo-${lang}.png`;
  const srcset = logoResponsiveSrcset(source, versions, origin);
  assert.equal(srcset.split(', ').length, 3);
  assert.ok(srcset.endsWith(source + '?cm_asset=' + versions[source] + ' 1200w'));
  assert.equal(logoResponsiveSrcset(source.slice(1), versions, origin), srcset);
  assert.equal(logoResponsiveSrcset(origin + source, versions, origin), srcset);
  assert.equal(logoResponsiveSrcset(source + '?cm_asset=old', versions, origin), srcset);
  assert.equal(logoResponsiveSrcset(source, { ...versions, [source]: 'new-artwork' }, origin), '', 'Changed original artwork cannot use stale delivery variants');
  assert.equal(logoResponsiveSrcset(source, { ...versions, [source.replace('.png', '-480.webp')]: undefined }, origin), '', 'Missing derivative manifest falls back to original');
  for (const ref of ['https://other.example' + source, '//other.example' + source, source + '?crop=1', source + '#crop', 'data:image/png;base64,aa', '', 'assets/custom.png']) {
    assert.equal(logoResponsiveSrcset(ref, versions, origin), '', 'Do not replace custom, transformed, unsafe, or blank CMS media');
  }
  for (const width of [480, 720]) {
    const derivative = '.' + source.replace('.png', '-' + width + '.webp');
    const metadata = await sharp(derivative).metadata();
    assert.equal(metadata.width, width); assert.equal(metadata.height, width * 375 / 1200);
    assert.ok(fs.statSync(derivative).size < fs.statSync('.' + source).size * 0.4, 'Each mobile derivative saves more than 60%');
    const referencePng = await sharp('.' + source).resize({ width }).png().toBuffer();
    const reference = await sharp(referencePng).ensureAlpha().raw().toBuffer();
    const actual = await sharp(derivative).ensureAlpha().raw().toBuffer();
    assert.equal(actual.length, reference.length);
    for (let i = 0; i < actual.length; i++) {
      // WebP may clear invisible RGB underneath alpha=0; every visible channel
      // and the complete alpha plane must remain exact after resizing.
      if (i % 4 === 3 || reference[i - i % 4 + 3] > 0) assert.equal(actual[i], reference[i]);
    }
  }
}
assert.match(LOGO_RESPONSIVE_SIZES, /384px$/);
console.log('PASS: responsive TH/EN logo dimensions, >60% per-image savings, visible-pixel/alpha fidelity, hash invalidation, original high-DPR fallback, custom/query/blank CMS isolation.');
