import assert from 'node:assert/strict';
import {createArticleDraft,parseDraftBackup} from '../admin/articles/drafts.mjs';
import {createArticleRepository} from '../server/articles.mjs';
import {projectArticleDetail} from '../src/visitor/article-detail.mjs';
import {articleUrl} from '../article-document.mjs';
import fs from 'node:fs';
import {createArticlePreviewPage} from '../src/admin/article-preview.mjs';
import {extractBundlerTemplate} from '../server/bundler-template.mjs';
import {renderPublicPage} from '../server/seo-page.mjs';

// Exercise the real normalization, repository publication and public projection
// against an isolated store. This does not connect to Firebase or certify auth.
const records=new Map();
let automaticId=0;
const snapshot=path=>({data:()=>structuredClone(records.get(path))});
const document=path=>({path,get:async()=>snapshot(path),collection:name=>collection(path+'/'+name)});
const collection=path=>({doc:(id='metadata-'+(++automaticId))=>document(path+'/'+id)});
const db={doc:document,async runTransaction(operation){
  const pending=[];
  const result=await operation({get:async ref=>snapshot(ref.path),set:(ref,value)=>pending.push([ref.path,structuredClone(value)]),create:(ref,value)=>pending.push([ref.path,structuredClone(value)])});
  for(const [path,value] of pending)records.set(path,value);
  return result;
}};
const at=Date.parse('2026-09-28T03:00:00Z');
const repository=createArticleRepository({db,now:()=>at});
const site='covermate-uat',actor='metadata-test',keys=['headerNote','sidebarQuote','takeawayNote'];
const visibilityKeys=keys.map(key=>key+'Enabled');
const visibility=value=>Object.fromEntries(visibilityKeys.map(key=>[key,value[key]]));
const enabledNotes=Object.fromEntries(visibilityKeys.map(key=>[key,true]));
const disabledNotes=Object.fromEntries(visibilityKeys.map(key=>[key,false]));
const notes={
  th:{headerNote:'วางแผนด้วยความเข้าใจ',sidebarQuote:'ความคุ้มครองที่เหมาะสม\nเริ่มจากคำถามของคุณ',takeawayNote:'เข้าใจวันนี้\nมั่นใจในวันข้างหน้า'},
  en:{headerNote:'Plan with understanding',sidebarQuote:'The right cover\nstarts with your questions',takeawayNote:'Understand today\nprepare for tomorrow'}
};
const plain=text=>({type:'doc',content:[{type:'paragraph',content:[{type:'text',text}]}]});
const newDraft=()=>createArticleDraft({id:'metadata-test',slug:'metadata-test',authorName:'Fixture author',translations:{
  th:{title:'บทความทดสอบ',excerpt:'คำโปรยทดสอบ',document:plain('เนื้อหาทดสอบ')},
  en:{title:'Test article',excerpt:'Test excerpt',document:plain('Test body')}
}});
const select=value=>Object.fromEntries(keys.map(key=>[key,value[key]]));

const defaults=newDraft();
for(const lang of ['th','en'])assert.deepEqual(select(defaults.translations[lang]),Object.fromEntries(keys.map(key=>[key,''])),'Missing optional notes default to empty strings');
for(const lang of ['th','en'])assert.deepEqual(visibility(defaults.translations[lang]),enabledNotes,'Legacy notes remain enabled by default');
for(const lang of ['th','en'])Object.assign(defaults.translations[lang],notes[lang]);
assert.deepEqual(select(createArticleDraft(defaults).translations.th),notes.th);
const backup=parseDraftBackup(JSON.stringify(defaults));
assert.notEqual(backup.id,defaults.id);assert.equal(backup.basePublished,false);
for(const lang of ['th','en'])assert.deepEqual(select(backup.translations[lang]),notes[lang],'Backups preserve independent localized notes');

await repository.changeSettings(site,{enabled:true,showHome:true,showNavigation:true},0,actor);
let saved=await repository.mutate(site,'save',defaults,0,actor);
for(const lang of ['th','en'])assert.deepEqual(select((await repository.get(site,saved.id)).translations[lang]),notes[lang]);
saved=await repository.mutate(site,'publish',{id:saved.id,languages:['th','en']},saved.revision,actor);
let live=await repository.detail(site,saved.slug);
for(const lang of ['th','en']){
  assert.deepEqual(select(live.item.translations[lang]),notes[lang],'Publication retains all normalized note fields');
  const projected=projectArticleDetail(live,{slug:saved.slug,lang,now:at,mediaUrl:value=>articleUrl(value,true)});
  assert.equal(projected.available,true);assert.deepEqual(select(projected),notes[lang],'Public projection selects only the requested language notes');
  assert.deepEqual(visibility(projected),enabledNotes);
}

// Visibility is localized and independent of the text, draft and live snapshots.
Object.assign(saved.translations.th,disabledNotes);
saved=await repository.mutate(site,'save',saved,saved.revision,actor);
const disabledBackup=parseDraftBackup(JSON.stringify(saved));
assert.deepEqual(visibility(disabledBackup.translations.th),disabledNotes,'Backup retains disabled notes');
assert.deepEqual(select(disabledBackup.translations.th),notes.th,'Hiding a note never erases the editable text');
assert.deepEqual(visibility(disabledBackup.translations.en),enabledNotes,'TH visibility does not change EN');
assert.deepEqual(visibility((await repository.detail(site,saved.slug)).item.translations.th),enabledNotes,'Draft visibility does not affect the published page');
saved=await repository.mutate(site,'publish',{id:saved.id,languages:['th']},saved.revision,actor);
live=await repository.detail(site,saved.slug);
const hidden=projectArticleDetail(live,{slug:saved.slug,now:at,mediaUrl:value=>articleUrl(value,true)});
assert.deepEqual(visibility(hidden),disabledNotes,'Disabled flags reach the public reader');
assert.deepEqual(select(hidden),notes.th,'Disabled notes remain projected as editable text');
assert.deepEqual(visibility(live.item.translations.en),enabledNotes,'Publishing TH visibility preserves EN');
Object.assign(saved.translations.th,enabledNotes);
saved=await repository.mutate(site,'save',saved,saved.revision,actor);
saved=await repository.mutate(site,'publish',{id:saved.id,languages:['th']},saved.revision,actor);
live=await repository.detail(site,saved.slug);
assert.deepEqual(select(live.item.translations.th),notes.th,'Re-enabling notes restores the original text');
assert.deepEqual(visibility(projectArticleDetail(live,{slug:saved.slug,now:at,mediaUrl:value=>articleUrl(value,true)})),enabledNotes);

const before=saved.revision;
for(const [key,max] of Object.entries({headerNote:500,sidebarQuote:1000,takeawayNote:500})){
  for(const invalid of [42,null,{},'x'.repeat(max+1)]){
    const rejected=structuredClone(saved);rejected.translations.th[key]=invalid;
    await assert.rejects(repository.mutate(site,'save',rejected,before,actor),error=>error.status===422 && error.fields?.some(issue=>issue.field===key&&issue.language==='th'));
  }
}
for(const lang of ['th','en'])for(const key of visibilityKeys)for(const invalid of [null,0,1,'false',[],{}]){
  const rejected=structuredClone(saved);rejected.translations[lang][key]=invalid;
  await assert.rejects(repository.mutate(site,'save',rejected,before,actor),error=>error.status===422 && error.message.includes(key));
}
assert.equal((await repository.get(site,saved.id)).revision,before,'Rejected notes do not write a revision');

// Omitted fields from older clients are accepted and normalized without migration.
const older=newDraft();older.id='older-metadata-test';older.slug='older-metadata-test';
for(const lang of ['th','en'])for(const key of [...keys,...visibilityKeys])delete older.translations[lang][key];
const oldSaved=await repository.mutate(site,'save',older,0,actor);
for(const lang of ['th','en'])for(const key of keys)assert.equal(oldSaved.translations[lang][key],'');
for(const lang of ['th','en'])assert.deepEqual(visibility(oldSaved.translations[lang]),enabledNotes);
const legacyPayload=structuredClone(live);
for(const lang of ['th','en'])for(const key of visibilityKeys)delete legacyPayload.item.translations[lang][key];
assert.deepEqual(visibility(projectArticleDetail(legacyPayload,{slug:saved.slug,now:at,mediaUrl:value=>articleUrl(value,true)})),enabledNotes,'Published legacy notes remain visible without migration');

// The data boundary keeps strings as text; escaping is the renderer's job.
const unsafe='<img src=x onerror="alert(1)"> & <script>bad()</script>';
for(const key of keys)saved.translations.th[key]=unsafe;
saved=await repository.mutate(site,'save',saved,saved.revision,actor);
assert.deepEqual(select((await repository.detail(site,saved.slug)).item.translations.th),notes.th,'Saving notes does not replace the existing live snapshot');
saved=await repository.mutate(site,'publish',{id:saved.id,languages:['th']},saved.revision,actor);
live=await repository.detail(site,saved.slug);
const unsafeProjection=projectArticleDetail(live,{slug:saved.slug,now:at,mediaUrl:value=>articleUrl(value,true)});
for(const key of keys)assert.equal(unsafeProjection[key],unsafe,'Projection carries untrusted plain text for escaped rendering');
assert.deepEqual(select(live.item.translations.en),notes.en,'Publishing TH notes preserves EN');
const previewSource=fs.readFileSync('index.html','utf8').replace('</head>','<script id="covermate-published-state" type="application/json">'+JSON.stringify({state:{config:{sections:[]},text:{}}})+'</script></head>');
const unsafeHTML=createArticlePreviewPage(previewSource,unsafeProjection,{origin:'https://preview.example.test'});
// Real Admin Preview fetches public Home, not static index.html. Its optimized
// feed bundle must be upgraded before the disposable rich-document frame boots.
const publicHome=renderPublicPage(previewSource,{sections:[]},{path:'/'});
assert.match(extractBundlerTemplate(publicHome),/<script src="\/assets\/visitor\/article-feed\.js\?v=/);
const fullReaderURL=extractBundlerTemplate(previewSource).match(/<script src="([^"\s]+\/article-reader\.js\?v=[a-f0-9]{16})"/)[1];
const richPreview=extractBundlerTemplate(createArticlePreviewPage(publicHome,unsafeProjection,{origin:'https://preview.example.test'}));
assert.ok(richPreview.includes(`<script src="${fullReaderURL}"></script>`),'Preview uses the full reader from the same generated build');
assert.doesNotMatch(richPreview,/<script src="\/assets\/visitor\/article-feed\.js\?/,'Preview does not load both bundles');
assert.equal(unsafeHTML.includes(unsafe),false,'No unescaped authored note reaches preview HTML');
assert.equal(unsafeHTML.includes('<script>bad()</script>'),false);
const readPreviewDetail=html=>JSON.parse(/<script id="covermate-article-detail" type="application\/json">([\s\S]*?)<\/script>/.exec(extractBundlerTemplate(html))[1]);
assert.deepEqual(select(readPreviewDetail(unsafeHTML)),select(unsafeProjection),'Safe JSON handoff preserves notes literally for the real Visitor renderer');
assert.ok(unsafeHTML.includes('noindex,nofollow,noarchive'));
assert.equal(unsafeHTML.includes('src="/covermate-analytics.js"'),false,'Draft frames do not load analytics');
assert.equal(unsafeHTML.includes('src="/assets/telemetry.js"'),false,'Draft frames do not load telemetry');
assert.throws(()=>createArticlePreviewPage(fs.readFileSync('index.html','utf8'),unsafeProjection,{origin:'https://preview.example.test'}),/Preview/,'Missing website snapshot is an explicit retryable failure');

for(const key of keys)saved.translations.th[key]='';
Object.assign(saved.translations.th,disabledNotes);
saved=await repository.mutate(site,'save',saved,saved.revision,actor);
saved=await repository.mutate(site,'publish',{id:saved.id,languages:['th']},saved.revision,actor);
live=await repository.detail(site,saved.slug);
const cleared=projectArticleDetail(live,{slug:saved.slug,now:at,mediaUrl:value=>articleUrl(value,true)});
for(const key of keys)assert.equal(cleared[key],'','Explicit empty strings survive save, publication and public projection');
for(const key of keys)assert.equal(parseDraftBackup(JSON.stringify(saved)).translations.th[key],'','Backups preserve cleared notes');
assert.deepEqual(visibility(cleared),disabledNotes,'Clearing text leaves the explicit visibility choice intact');
assert.deepEqual(visibility(parseDraftBackup(JSON.stringify(saved)).translations.th),disabledNotes);
assert.deepEqual(select(live.item.translations.en),notes.en);
const clearedHTML=createArticlePreviewPage(previewSource,cleared,{origin:'https://preview.example.test'});
assert.deepEqual(select(readPreviewDetail(clearedHTML)),select(cleared),'Explicit clearing reaches the real preview runtime');
assert.deepEqual(visibility(readPreviewDetail(clearedHTML)),disabledNotes,'Preview receives the selected language visibility');
console.log('PASS localized article notes: defaults, TH/EN, backup, strict visibility validation, draft/live isolation, toggle/text preservation, publication, projection, escaped preview rendering and explicit clearing.');

// Author identity is explicit editorial data, never an inferred credential.
const authorKeys=['authorBio','authorUrl','editorialNote'];
const authorSelect=value=>Object.fromEntries(authorKeys.map(key=>[key,value[key]]));
const authorEmpty={authorBio:'',authorUrl:'',editorialNote:''};
let authorDraft=newDraft();authorDraft.id='author-trust-test';authorDraft.slug='author-trust-test';authorDraft.authorName='Purich Worawarachai';
const authorDetails={authorBio:'ข้อมูลผู้เขียนที่ยืนยันแล้วสำหรับการทดสอบ',authorUrl:'https://example.com/authors/purich',editorialNote:'หมายเหตุการจัดทำสำหรับการทดสอบ'};
assert.deepEqual(authorSelect(authorDraft.translations.th),authorEmpty);
Object.assign(authorDraft.translations.th,authorDetails);
assert.deepEqual(authorSelect(parseDraftBackup(JSON.stringify(authorDraft)).translations.th),authorDetails);
authorDraft=await repository.mutate(site,'save',authorDraft,0,actor);
assert.deepEqual(authorSelect((await repository.get(site,authorDraft.id)).translations.th),authorDetails);
authorDraft=await repository.mutate(site,'publish',{id:authorDraft.id,languages:['th','en']},authorDraft.revision,actor);
const authorRead=async(lang='th')=>projectArticleDetail(await repository.detail(site,authorDraft.slug),{slug:authorDraft.slug,lang,now:at,mediaUrl:value=>articleUrl(value,true)});
assert.deepEqual(authorSelect(await authorRead()),authorDetails);
assert.equal((await authorRead()).hasAuthorDetails,true);
assert.equal((await authorRead()).author,'Purich Worawarachai');
assert.deepEqual(authorSelect(await authorRead('en')),authorEmpty,'No biography leaks between locales');
assert.equal((await authorRead('en')).hasAuthorDetails,false);
assert.equal('reviewedBy' in await authorRead(),false);
for(const key of authorKeys)for(const invalid of [42,null,{},'x'.repeat(key==='authorUrl'?2001:1201)]){
  const input=structuredClone(authorDraft);input.translations.th[key]=invalid;
  await assert.rejects(repository.mutate(site,'save',input,authorDraft.revision,actor),error=>error.status===422&&error.fields?.some(issue=>issue.field===key));
}
for(const invalid of ['javascript:alert(1)','http://example.com','https://user:pass@example.com','/authors/purich']){
  const input=structuredClone(authorDraft);input.translations.th.authorUrl=invalid;
  await assert.rejects(repository.mutate(site,'save',input,authorDraft.revision,actor),error=>error.status===422&&error.fields?.some(issue=>issue.field==='authorUrl'));
}
for(const invalid of ['false',0,null]){
  const input=structuredClone(authorDraft);input.translations.th.authorDetailsEnabled=invalid;
  await assert.rejects(repository.mutate(site,'save',input,authorDraft.revision,actor),error=>error.status===422&&error.fields?.some(issue=>issue.field==='authorDetailsEnabled'));
}
authorDraft.translations.th.authorDetailsEnabled=false;
authorDraft=await repository.mutate(site,'save',authorDraft,authorDraft.revision,actor);
assert.deepEqual(authorSelect(await authorRead()),authorDetails,'Unpublished visibility change cannot alter live content');
authorDraft=await repository.mutate(site,'publish',{id:authorDraft.id,languages:['th']},authorDraft.revision,actor);
assert.deepEqual(authorSelect(await authorRead()),authorEmpty,'Hidden details are not emitted for public rendering or structured data');
assert.equal((await authorRead()).hasAuthorDetails,false);
assert.deepEqual(authorSelect((await repository.get(site,authorDraft.id)).translations.th),authorDetails,'Hide retains editable biography');
authorDraft.translations.th.authorDetailsEnabled=true;
Object.assign(authorDraft.translations.th,{authorBio:unsafe,editorialNote:unsafe});
authorDraft=await repository.mutate(site,'save',authorDraft,authorDraft.revision,actor);
authorDraft=await repository.mutate(site,'publish',{id:authorDraft.id,languages:['th']},authorDraft.revision,actor);
const authorPreview=createArticlePreviewPage(previewSource,await authorRead(),{origin:'https://preview.example.test'});
assert.equal(authorPreview.includes(unsafe),false);
assert.equal(readPreviewDetail(authorPreview).authorBio,unsafe,'Escaped Preview receives the actual biography');
Object.assign(authorDraft.translations.th,authorEmpty);
authorDraft=await repository.mutate(site,'save',authorDraft,authorDraft.revision,actor);
authorDraft=await repository.mutate(site,'publish',{id:authorDraft.id,languages:['th']},authorDraft.revision,actor);
assert.deepEqual(authorSelect(await authorRead()),authorEmpty);
assert.equal((await authorRead()).hasAuthorDetails,false,'Clearing author details removes its empty panel');
const legacyAuthor=newDraft();legacyAuthor.id='legacy-author-test';legacyAuthor.slug='legacy-author-test';
for(const lang of ['th','en'])for(const key of [...authorKeys,'authorDetailsEnabled'])delete legacyAuthor.translations[lang][key];
assert.deepEqual(authorSelect((await repository.mutate(site,'save',legacyAuthor,0,actor)).translations.th),authorEmpty);
console.log('PASS author trust: localized editor data, safe URLs, real repository save/reopen/publication, backup, explicit hide/clear and escaped Preview; no inferred review.');
