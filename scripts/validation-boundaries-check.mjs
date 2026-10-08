import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as F from '../field-validation.mjs';
import * as M from '../customer-model.mjs';
import { validateArticle } from '../article-validation.mjs';
import { createArticleDraft, parseDraftBackup } from '../admin/articles/drafts.mjs';
import { cmsStateIssues, cmsFieldLimit, assertCmsState } from '../cms-validation.mjs';
import { sanitizeStateDoc } from '../covermate-contract.js';
import { contactFieldErrors } from '../covermate-submission.mjs';

for (const value of ['qa@example.test','QA+label@sub.example.test']) assert(F.validContactEmail(value));
for (const value of ['a..b@example.test','.a@example.test','a@-bad.test','a@x..test','a'.repeat(65)+'@example.test','a@example.test\n']) assert(!F.validContactEmail(value),value);
for (const value of ['000-000-0000','+66 00 000 0000','+44 (20) 0000-0000']) assert(F.validPhone(value),value);
for (const value of ['abc','123','+1'.repeat(9),'1'.repeat(16)]) assert(!F.validPhone(value),value);
assert.deepEqual(F.contactKeys({phone:'000-000-0000',email:' QA@EXAMPLE.TEST ',lineId:'@Fixture_ID'}),F.contactKeys({phone:'+66 00 000 0000',email:'qa@example.test',lineId:'fixture_id'}));
for (const value of ['10110','SW1A 1AA','12345-6789','2000','123456','1234567890','ASCN 1ZZ']) assert(F.validPostalCode(value));
for (const value of ['1','!!!!!!','x'.repeat(17),'12/34']) assert(!F.validPostalCode(value));
assert.equal(F.bangkokDate(Date.parse('2026-10-07T17:00:00Z')),'2026-10-08');
assert.equal(F.bangkokDate(Date.parse('2026-10-07T16:59:59Z')),'2026-10-07');
assert(F.validCalendarDate('2024-02-29'));assert(!F.validCalendarDate('2026-02-29'));
// Synthetic checksum fixture, not proof of a person's identity.
assert.equal(F.identityNumber('National ID','1-2345-67890-12-1'),'1234567890121');
assert.equal(F.identityNumber('National ID','1234567890123'),'');
assert.equal(F.identityNumber('Passport','   '),'');assert.equal(F.identityNumber('Passport','test-0001'),'TEST0001');
const profile={...M.emptyFields(M.PROFILE_FIELDS),firstName:'Synthetic',lastName:'QA',phone:'0000000000'};
assert.throws(()=>M.validateProfile({...profile,preferredChannel:'Email'}),e=>!!e.fieldErrors.email);
const originalNow=Date.now; Date.now=()=>Date.parse('2026-10-07T17:30:00Z');
try { assert.equal(M.validateProfile({...profile,birthDate:'2026-10-08'}).birthDate,'2026-10-08'); assert.throws(()=>M.validateProfile({...profile,birthDate:'2026-10-09'})); } finally { Date.now=originalNow; }
assert(contactFieldErrors({name:'x'.repeat(121),contact:'x'.repeat(161)}).name);
const draft=createArticleDraft();draft.translations.th.document={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'x'.repeat(50000)}]}]};
assert.equal(validateArticle(draft).length,0);
draft.translations.th.document.content[0].content[0].text+='x';
assert(validateArticle(draft).some(i=>i.field==='document'));assert.throws(()=>parseDraftBackup(JSON.stringify(draft)));
assert.equal(draft.translations.th.document.content[0].content[0].text.length,50001,'Validation never changes input');
draft.translations.th.document={type:'doc',content:Array.from({length:1001},()=>({type:'paragraph'}))};
assert(validateArticle(draft).some(i=>i.field==='document'));
const defaults=JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)'));
const state=sanitizeStateDoc({config:defaults,text:{}},{repeatableIds:true});
assert.deepEqual(cmsStateIssues(state),[]);
for(const [path,max] of [['seo.title.th',68],['seo.description.en',155],['contact.lineId',80]])assert.equal(cmsFieldLimit(path),max);
const oversized=structuredClone(state);oversized.config.seo.title.th='x'.repeat(69);
assert.throws(()=>assertCmsState(oversized),e=>e.fields.some(f=>f.path==='seo.title.th'));
assert.equal(oversized.config.seo.title.th.length,69);
const inline=structuredClone(state);inline.text['cms:seo.description.th']='x'.repeat(156);assert.throws(()=>assertCmsState(inline));
for (const [key,value] of [['phone','abc'],['email','a..b@example.test'],['lineId','ชื่อที่แสดง'],['lineUrl','javascript:alert(1)']]) {
  const invalid=structuredClone(state);invalid.config.contact[key]=value;
  assert(cmsStateIssues(invalid).some(issue=>issue.path===`contact.${key}`));
}
console.log('PASS validation boundaries: contact formats, normalized keys, identity checksum, Bangkok midnight, field dependencies, Article/import and CMS reject-without-truncation.');
