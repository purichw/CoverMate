import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { fromFirestoreFields, toFirestoreFields } from './lib/uat-env.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const root = 'https://firestore.googleapis.com/v1/projects/covermate-purich/databases/(default)/documents';
const defaults = JSON.parse(vm.runInNewContext(fs.readFileSync(new URL('../src/visitor/defaults.js', import.meta.url), 'utf8') + '\nJSON.stringify(DEFAULTS)'));
const seed = defaults.sections.find(section => section.id === 'fit');
const legacy = {
  th: {
    kicker: ['เครื่องมือ · ใช้ฟรี ไม่ต้องกรอกอะไร'],
    title: ['คุณควรมีทุนเท่าไหร่\nลองคำนวณคร่าว ๆ', 'ประเมินความต้องการ\nคุ้มครองเบื้องต้น'],
    body: ['ตัวเลขนี้ประมาณตามหลักที่ใช้กันทั่วไป ไม่ใช่ใบเสนอราคา แต่พอให้เห็นภาพก่อนคุยกัน', 'เครื่องมือนี้แยกการประเมินเป็นสามส่วน: ทุนชีวิตจากค่าใช้จ่ายจำเป็นและปีที่ครอบครัวต้องพึ่งพา, ส่วนต่างค่าห้องอ้างอิงจากข้อมูลโรงพยาบาลที่มีแหล่งที่มา, และเงินก้อนสำหรับช่วงพักฟื้นจากโรคร้ายแรง'],
    note: ['คำนวณจากรายได้ต่อปี × ตัวคูณตามภาระ บวกหนี้คงเหลือ เบี้ยจริงขึ้นกับอายุ สุขภาพ และแบบประกันที่เลือก']
  },
  en: {
    kicker: ['Free tool · nothing to fill in'],
    title: ['How much cover\nshould you carry?', 'Estimate your\nstarting protection need'],
    body: ['A rough estimate on standard rules of thumb — not a quote, but enough to see the shape before we talk.', 'This tool separates the estimate into three parts: life cover from essential spending and support years, a hospital room-gap reference with source provenance, and a recovery buffer for critical illness.'],
    note: ['Annual income × a dependants multiplier, plus outstanding debt. Real premiums depend on age, health and the plan chosen.']
  }
};

export function planNeedsRelease(documents) {
  return documents.flatMap(document => {
    const state = fromFirestoreFields(document.fields || {});
    const sections = structuredClone(state.config?.sections || []);
    const matches = sections.filter(section => section.id === 'fit' && section.type === 'fit');
    if (matches.length !== 1) throw Error('Expected one existing fit section: ' + document.name);
    const fit = matches[0], changes = [];
    if (fit.on !== true) { fit.on = true; changes.push('fit.on'); }
    for (const lang of ['th', 'en']) for (const key of Object.keys(legacy[lang])) {
      if (legacy[lang][key].includes(fit[lang]?.[key]) && fit[lang][key] !== seed[lang][key]) {
        fit[lang][key] = seed[lang][key];
        changes.push(`fit.${lang}.${key}`);
      }
    }
    if (!changes.length) return [];
    if (!document.updateTime) throw Error('A revision precondition is required.');
    return [{
      path: document.name.split('/documents/')[1], changes,
      write: {
        update: { name: document.name, fields: toFirestoreFields({ config: { sections }, revision: Number(state.revision || 0) + 1 }) },
        updateMask: { fieldPaths: ['config.sections', 'revision'] },
        currentDocument: { updateTime: document.updateTime },
        updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }]
      }
    }];
  });
}

function testPlan() {
  const state = { config: { sections: [{ id: 'fit', type: 'fit', on: false, th: { title: legacy.th.title[0], body: '', note: 'Owner note' }, en: { title: 'Owner title' }, calculator: { custom: true } }, { id: 'talk', on: false, title: 'Unpublished draft' }] }, revision: 7 };
  const doc = { name: root + '/sites/covermate-uat/states/live', updateTime: '2026-09-23T00:00:00Z', fields: toFirestoreFields(state) };
  const before = structuredClone(doc), [plan] = planNeedsRelease([doc]);
  assert.deepEqual(doc, before);
  assert.deepEqual(plan.changes, ['fit.on', 'fit.th.title']);
  const next = fromFirestoreFields(plan.write.update.fields);
  assert.equal(next.config.sections[0].th.body, '');
  assert.equal(next.config.sections[0].th.note, 'Owner note');
  assert.equal(next.config.sections[0].en.title, 'Owner title');
  assert.deepEqual(next.config.sections[0].calculator, { custom: true });
  assert.deepEqual(next.config.sections[1], state.config.sections[1]);
  assert.equal(next.revision, 8);
  assert.deepEqual(plan.write.updateMask.fieldPaths, ['config.sections', 'revision']);
  assert.equal(planNeedsRelease([{ ...doc, fields: toFirestoreFields(next) }]).length, 0);
  console.log('PASS narrow Needs release: non-mutating, idempotent, owner blanks/copy/catalog/other sections preserved, conditional write mask.');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--test') return testPlan();
  const site = args.find(arg => arg.startsWith('--site='))?.slice(7);
  if (!['covermate', 'covermate-uat'].includes(site) || args.some(arg => arg !== '--apply' && arg !== `--site=${site}`)) throw Error('Use --site=covermate-uat|covermate [--apply], or --test. Default is read-only.');
  const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  async function read(name) {
    const response = await fetch(root + '/' + name, { headers });
    if (!response.ok) throw Error(`Read ${name}: HTTP ${response.status}`);
    return response.json();
  }
  const documents = [];
  for (const name of ['live', 'draft']) documents.push(await read(`sites/${site}/states/${name}`));
  const plan = planNeedsRelease(documents);
  console.log(JSON.stringify({ site, mode: args.includes('--apply') ? 'apply' : 'dry-run', changes: plan.map(({ path, changes }) => ({ path, changes })) }, null, 2));
  if (!args.includes('--apply') || !plan.length) return;
  const dir = path.join(repo, 'uat-results/needs-release');
  fs.mkdirSync(dir, { recursive: true });
  const backup = path.join(dir, `${site}-${Date.now()}.json`);
  fs.writeFileSync(backup, JSON.stringify({ site, documents }, null, 2), { flag: 'wx', mode: 0o600 });
  // Conditional, atomic writes to independent states; never publish draft into live.
  const response = await fetch(root + ':commit', { method: 'POST', headers, body: JSON.stringify({ writes: plan.map(item => item.write) }) });
  if (!response.ok) throw Error(`Write refused: HTTP ${response.status}; inspect current revisions. Backup: ${backup}`);
  for (const item of plan) {
    const actual = fromFirestoreFields((await read(item.path)).fields);
    const expected = fromFirestoreFields(item.write.update.fields);
    assert.deepEqual(actual.config.sections, expected.config.sections);
    assert.equal(actual.revision, expected.revision);
  }
  console.log('Verified independent states. Backup: ' + backup);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
