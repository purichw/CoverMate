import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';

const output = 'uat-results/admin-home';
const desktopReference = '/var/folders/3k/m69pt27s00bd_l2yzfjvmk8w0000gn/T/codex-clipboard-41be1ccf-fd2e-40d2-8fd2-803a29bab986.png';
const mobileReference = '/var/folders/3k/m69pt27s00bd_l2yzfjvmk8w0000gn/T/codex-clipboard-fbc12b27-9b4e-4676-a5ee-0774d9a42263.png';
const records = [];
function heading(width, title, subtitle) {
  return Buffer.from(`<svg width="${width}" height="76" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#28251e"/><text x="22" y="31" fill="#fffaf0" font-family="Arial,sans-serif" font-size="23" font-weight="700">${title}</text><text x="22" y="56" fill="#d4c7b5" font-family="Arial,sans-serif" font-size="15">${subtitle}</text></svg>`);
}
async function pair({ reference, development, width, refCrop, filename, subtitle }) {
  const ref = refCrop ? await sharp(reference).extract(refCrop).toBuffer() : fs.readFileSync(reference);
  const dev = fs.readFileSync(development);
  const [rm, dm] = await Promise.all([sharp(ref).metadata(), sharp(dev).metadata()]);
  if (rm.width !== width || dm.width !== width) throw new Error('Comparison widths must match without stretching.');
  const gap = 16, height = Math.max(rm.height, dm.height) + 76;
  await sharp({ create: { width: width * 2 + gap, height, channels: 3, background: '#e8dfd2' } }).composite([
    { input: heading(width, 'Reference', subtitle), left: 0, top: 0 },
    { input: ref, left: 0, top: 76 },
    { input: heading(width, 'Development', `${width}px browser width | Thai UI | synthetic QA data`), left: width + gap, top: 0 },
    { input: dev, left: width + gap, top: 76 }
  ]).png().toFile(`${output}/${filename}`);
  records.push({ file: `${output}/${filename}`, reference, referenceSha256: crypto.createHash('sha256').update(fs.readFileSync(reference)).digest('hex'), development, developmentSha256: crypto.createHash('sha256').update(dev).digest('hex'), refCrop, scale: '1:1 image pixels; no distortion or retouching', note: subtitle });
}
await pair({ reference: desktopReference, development: `${output}/home-desktop-1448.png`, width: 1448, filename: 'desktop-reference-development.png', subtitle: '1448px supplied desktop reference | original English mockup' });
await pair({ reference: mobileReference, development: `${output}/home-tablet-690.png`, width: 690, refCrop: { left: 125, top: 0, width: 690, height: 1672 }, filename: 'mobile-reference-development.png', subtitle: 'Phone artwork frame removed | CSS scale inferred' });
fs.writeFileSync(`${output}/comparison-provenance.json`, JSON.stringify({ createdAt: new Date().toISOString(), records, actualPhoneCapture: `${output}/home-mobile-390.png`, note: 'Development includes recent cases on mobile, preserving access to real work. Different language/data and approved logo artwork are intentional adaptations.' }, null, 2) + '\n');
console.log('Admin Home comparison pairs saved.');
