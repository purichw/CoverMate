import fs from 'node:fs';
import path from 'node:path';

// Evidence mapping, not an automatic conversion of grouped smoke IDs to passes.
const root = process.argv[2];
if (!root) throw Error('Provide the reviewed handoff directory.');
const out = path.resolve('uat-results/home-redesign');
const read = name => JSON.parse(fs.readFileSync(path.join(out, name), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(root, 'qa/ACCEPTANCE_TESTS.json'), 'utf8'));
const browser = read('browser-checks.json');
const snapshots = read('snapshot-provenance.json');
const visual = read('visual-review.json');
if (browser.failure || browser.errors.length || snapshots.errors.length) throw Error('Resolve recorded failures first.');
const timestamp = new Date().toISOString();
const evidence = {};
const pass = (ids, paths, notes) => ids.split(',').forEach(id => { evidence[id] = {status:'PASS',evidence_paths:paths,notes}; });
const ui = ['uat-results/home-redesign/browser-checks.json'];
const cms = ['uat-results/home-redesign/cms-checks.json','uat-results/home-redesign/source-checks.json'];
for (const capture of snapshots.captures) {
  if (!visual.reviewed.includes(path.basename(capture.full))) continue;
  const id = {390:'V03',820:'V07',1440:'V10'}[capture.viewport.width] + '-' + capture.lang;
  pass(id,[capture.full,'uat-results/home-redesign/visual-review.json'],
    'Personally inspected full composition and targeted readable regions. Original data differs from the illustrative mockup; differences are documented.');
  if (capture.geometry.height > capture.viewport.height * 4) throw Error('Compact fixture exceeds four viewports: '+id);
}
pass('R06', ['uat-results/home-redesign/visual-review.json'], 'Existing logos/fonts, flat hero artwork and no fabricated portraits; inspected in the rendered captures.');
pass('N03',ui,'Legacy #life and #motor aliases exercised.');
pass('D01,D02,D05,D06,D11',ui,'Six categories, keyboard/pointer one-open behavior, real insurer identities, five-class/five-axis access and no hidden calculator defaults in fresh form.');
pass('D09,C04',cms,'Explicit claim:false survives legacy normalization; source data retained, no silent support strip.');
pass('D13,D15,D16,D18',cms,'CMS owner, cache/live, deliberate blank and shared-media regression suites; final pass changed composition only.');
pass('F01',['docs/HOME_REDESIGN.md','uat-results/home-redesign/emulator-check.json'],'Actual API/consent/receipt contract inspected and exercised by the local emulator suite.');
pass('F08,F13,F19',ui,'Mock UI receipt, dirty language/live refresh, consent reset and CMS-disabled form behavior exercised. No production writes.');
pass('F09',['uat-results/home-redesign/emulator-check.json','uat-results/nfr/journeys.json'],'Real local emulator API persistence and Admin readback; Chromium only. Backend run predates the final compact presentation pass.');
pass('A01',ui,'Tools > Panel > close returns to the current English-chrome editor.');
pass('A03',cms,'Repeatable identity, add/duplicate/hide/restore and reorder tests; tier artwork reorder additionally tested in the Home harness.');
pass('A07',cms,'Authenticated mock draft/preview isolation; independent local emulator publishing/readback. Not a live UAT or production publish.');
pass('X06',cms,'Existing URL/text sanitization tests plus blank/javascript tier-media tests in Home harness.');
pass('C02',cms,'Count derived from enabled records; illustrative company list is not imported.');
pass('C10',['docs/HOME_REDESIGN.md','uat-results/home-redesign/visual-review.json'],'Real configured logos/identities/hours retained; no mockup people, domain or badges asserted as real.');
const ownerBlocked = new Set(['C01','C05','C06','C07','C08','C09','C11','C12']);
const results = plan.tests.map(test => ({
  ...test,
  status:ownerBlocked.has(test.id) ? 'BLOCKED' : evidence[test.id]?.status || 'NOT_RUN',
  environment:'local proposed public CMS fixture; isolated mock Admin/browser and real local Firebase emulators',
  commands_or_reproduction_steps:[
    'node scripts/home-redesign-check.mjs <handoff>',
    'node scripts/home-redesign-snapshots.mjs',
    'See evidence-specific source/CMS/emulator logs for the commands and timestamps.'
  ],
  timestamp,
  evidence_paths:evidence[test.id]?.evidence_paths || [],
  mocked_or_real_backend:test.id === 'F09' ? 'real local emulator, no production' : 'mock/local fixture unless an attached emulator log explicitly says otherwise',
  notes:ownerBlocked.has(test.id)
    ? 'Owner/content-operational confirmation required before a separately authorized production release; not a layout blocker and not independently endorsed.'
    : evidence[test.id]?.notes || 'Not fully rerun to every clause of this case. Partial grouped smoke coverage is not promoted to a complete PASS. Geometry-only coverage is not personal visual inspection.'
}));
const report = {timestamp,status:'LOCAL_IMPLEMENTATION_EVIDENCE_NOT_RELEASE_APPROVAL',count:results.length,summary:results.reduce((counts,item)=>(counts[item.status]=(counts[item.status]||0)+1,counts),{}),tests:results};
if (results.length !== plan.count) throw Error('Acceptance case count mismatch.');
fs.writeFileSync(path.join(out,'acceptance-results.json'),JSON.stringify(report,null,2));
console.log(report.summary);
