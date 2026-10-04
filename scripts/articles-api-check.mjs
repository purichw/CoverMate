import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createArticleDraft} from '../admin/articles/drafts.mjs';
import {extractBundlerTemplate} from '../server/bundler-template.mjs';

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8088'||process.env.COVERMATE_TEST_MODE!=='emulator')throw Error('Isolated emulators required');
const require=createRequire(import.meta.url),firebase=require('../server/firebase.cjs'),baseDb=firebase.serverDb();
const run='article-'+crypto.randomUUID(),scope='api-'+run,tokens={};
// Isolate fixture documents without replacing Auth, API or Firestore transactions.
const db=new Proxy(baseDb,{get(target,key){if(key==='doc')return path=>target.doc(path.replace(/^sites\/covermate-uat(?=\/|$)/,'sites/'+scope));const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
firebase.serverDb=()=>db;
const {createArticleRepository}=await import('../server/articles.mjs');
const {createPageHandler}=await import('../server/seo-page.mjs');
const {startNfrServer}=await import('./nfr-server.mjs');
let now;const repository=createArticleRepository({db,now:()=>now??Date.now()});
const {server,baseUrl}=await startNfrServer({pageHandler:createPageHandler({readPublished:async()=>({config:{sections:[]},text:{}}),readArticles:site=>repository.feed(site),readArticle:(site,slug)=>repository.detail(site,slug)})});
try {
  for(const role of ['owner','owner2','advisor','ops','readonly','inactive','unknown']) {
    const account=await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`${run}-${role}@example.test`,password:crypto.randomUUID(),returnSecureToken:true})}).then(r=>r.json());
    await db.doc('admins/'+account.localId).set({role:role==='owner2'||role==='inactive'?'owner':role,active:role!=='inactive',uatOnly:true});tokens[role]=account.idToken;
  }
  async function call(action,body,role='owner',extra='') {
    const response=await fetch(baseUrl+'/api/articles?cm_env=uat&action='+action+extra,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,body:await response.json()};
  }
  assert.equal((await call('catalog',null,'missing')).status,401);
  assert.equal((await call('feed',null,'missing')).status,401);
  for(const role of ['advisor','ops','readonly','inactive','unknown'])assert.equal((await call('catalog',null,role)).status,403);
  for(const role of ['advisor','ops','readonly','inactive','unknown'])assert.equal((await call('feed',null,role)).status,403);
  const denied=await fetch(baseUrl+'/api/articles?action=catalog',{headers:{Authorization:'Bearer '+tokens.owner}});assert.equal(denied.status,403,'UAT owner cannot access production');
  assert.equal((await fetch(baseUrl+'/api/articles?action=feed',{headers:{Authorization:'Bearer '+tokens.owner}})).status,403,'UAT owner feed cannot read production');
  let flags=(await call('catalog')).body.settings;
  const flag=async changes=>{flags=(await call('catalog')).body.settings;const result=await call('settings',{settings:{...flags,...changes},expectedRevision:flags.revision});assert.equal(result.status,200,JSON.stringify(result));flags=result.body;};
  await flag({enabled:false});
  assert.equal((await fetch(baseUrl+'/articles?cm_env=uat')).status,404);
  let draft=createArticleDraft();draft.id=run;draft.slug=run;draft.authorName='Emulator QA';draft.categoryId='general';draft.featured=true;draft.pinned=true;
  Object.assign(draft.translations.th,{title:'บทความทดสอบใน Emulator',excerpt:'ทดสอบการเผยแพร่จริงจากคลังทดสอบ',document:{type:'doc',content:[{type:'heading',attrs:{level:2},content:[{type:'text',text:'หัวข้อทดสอบ'}]},{type:'paragraph',content:[{type:'text',text:'เนื้อหาจากคลังกลางทดสอบ'}]}]},takeaways:['ข้อสรุปทดสอบ']});
  let result=await call('save',{article:draft,expectedRevision:0});assert.equal(result.status,200,JSON.stringify(result));draft=result.body;
  assert.equal((await call('settings',{settings:flags,expectedRevision:flags.revision})).status,409,'Home slot reservation invalidates stale settings revisions');
  assert.equal((await call('read',null,'owner2','&id='+run)).body.translations.th.title,draft.translations.th.title,'Second owner reads same persisted draft');
  assert.equal((await repository.feed('covermate-uat')).items.some(i=>i.id===run),false,'Draft does not leak');
  assert.equal((await call('feed')).body.items.some(i=>i.id===run),false,'Owner canvas endpoint does not expose a draft');
  const concurrent=await Promise.all(['A','B'].map(marker=>call('save',{article:{...draft,authorName:marker},expectedRevision:draft.revision})));
  assert.equal(concurrent.filter(r=>r.status===200).length,1);assert.equal(concurrent.filter(r=>r.status===409).length,1);draft=concurrent.find(r=>r.status===200).body;
  assert.equal((await call('publish',{id:run,expectedRevision:draft.revision,languages:['en']})).status,422,'Incomplete English cannot publish');
  result=await call('publish',{id:run,expectedRevision:draft.revision,languages:['th']});assert.equal(result.status,200,JSON.stringify(result));draft=result.body;
  assert.equal((await repository.feed('covermate-uat')).items.some(i=>i.id===run),false,'Master off blocks published feed');
  await flag({enabled:true});
  const sitemap=await fetch(baseUrl+'/api/article-sitemap?cm_env=uat');assert.equal(sitemap.status,200);assert.equal((await sitemap.text()).includes('<loc>'),false,'UAT sitemap is empty');
  const feed=await repository.feed('covermate-uat');assert.equal(feed.items.find(i=>i.id===run).translations.th.readingMinutes,1);assert.equal(JSON.stringify(feed).includes('document'),false);assert.equal(JSON.stringify(feed).includes('เนื้อหาจากคลังกลาง'),false);
  assert.deepEqual((await call('feed')).body,feed,'Owner canvas reads exactly the Visitor publication projection');
  const detail=await repository.detail('covermate-uat',run);assert.equal(detail.item.translations.th.author,draft.authorName);assert.equal(detail.item.translations.en,undefined);
  assert.equal(feed.items.find(i=>i.id===run).translations.th.showDate,false,'An explicitly hidden date stays hidden in feed summaries');
  // Production articles published before optional dates have no showDate field.
  // Replay that record shape against real Firestore, whose serializer rejects undefined.
  const legacyRef=db.doc('sites/covermate-uat/articles/'+run),legacyRecord=(await legacyRef.get()).data();
  delete legacyRecord.live.translations.th.showDate;
  await legacyRef.set(legacyRecord);
  result=await call('save',{article:{...draft,authorName:'Updated legacy author'},expectedRevision:draft.revision});
  assert.equal(result.status,200,'Saving an old publication must not write undefined catalog fields: '+JSON.stringify(result));
  draft=result.body;
  assert.deepEqual((await legacyRef.get()).data().live,legacyRecord.live,'Saving author metadata preserves the live publication');
  assert.equal((await repository.feed('covermate-uat')).items.find(i=>i.id===run).translations.th.showDate,true,'Legacy summaries retain their visible date');
  assert.equal((await fetch(baseUrl+'/articles/'+run+'?cm_env=uat')).status,200);assert.equal((await fetch(baseUrl+'/articles/'+run+'?cm_env=uat&lang=en')).status,404);
  const liveTitle=detail.item.translations.th.title;draft.translations.th.title='ยังไม่เผยแพร่การแก้ไข';
  draft=(await call('save',{article:draft,expectedRevision:draft.revision})).body;
  assert.equal((await repository.detail('covermate-uat',run)).item.translations.th.title,liveTitle);
  assert.equal((await call('feed')).body.items.find(i=>i.id===run).translations.th.title,liveTitle,'Unpublished edits stay out of the Home canvas');
  if (!process.argv.includes('--feed-only')) {
  const duplicate=createArticleDraft(draft);duplicate.id='duplicate-'+crypto.randomUUID();duplicate.revision=0;duplicate.slugLocked=false;
  const dup=(await call('save',{article:duplicate,expectedRevision:0})).body;
  assert.equal((await call('publish',{id:dup.id,expectedRevision:dup.revision,languages:['th']})).status,409,'Slug is atomically reserved');
  for(const enabled of [false,true])for(const showHome of [false,true])for(const showNavigation of [false,true]) {
    await flag({enabled,showHome,showNavigation});
    const response=await fetch(baseUrl+'/articles?cm_env=uat');assert.equal(response.status,enabled?200:404);
    assert.match(response.headers.get('cache-control'),/no-store/);
    const home=extractBundlerTemplate(await (await fetch(baseUrl+'/?cm_env=uat')).text());
    const seed=JSON.parse(/<script id="covermate-article-feed" type="application\/json">(.*?)<\/script>/.exec(home)[1]);
    assert.deepEqual(seed.settings,{enabled,showHome,showNavigation,revision:flags.revision,pinnedOrder:[]});assert.equal(seed.items.some(i=>i.id===run),enabled);
  }
  assert.equal((await call('settings',{settings:flags,expectedRevision:flags.revision-1})).status,409);
  assert.equal((await call('settings',{settings:{enabled:'true'},expectedRevision:flags.revision})).status,422);
  assert.equal((await call('save',{article:{...draft,slug:'../bad'},expectedRevision:draft.revision})).status,422);
  const invalidSource=structuredClone(draft);invalidSource.translations.th.sources=[{label:42,url:'https://example.test'}];
  assert.equal((await call('save',{article:invalidSource,expectedRevision:draft.revision})).status,422);
  const future=Date.now()+86400000;draft.translations.th.publishedAt=new Date(future).toISOString();
  draft=(await call('save',{article:draft,expectedRevision:draft.revision})).body;
  draft=(await call('publish',{id:run,expectedRevision:draft.revision,languages:['th']})).body;
  assert.equal((await repository.feed('covermate-uat')).items.some(i=>i.id===run),false,'Scheduled translation stays server-private');
  assert.equal((await repository.catalog('covermate-uat')).items.find(i=>i.id===run).status,'scheduled');
  now=future+1;assert.ok((await repository.detail('covermate-uat',run)).item);assert.equal((await repository.catalog('covermate-uat')).items.find(i=>i.id===run).status,'published');
  draft=(await call('unpublish',{id:run,expectedRevision:draft.revision})).body;
  assert.equal(await repository.detail('covermate-uat',run),null);assert.ok((await call('read',null,'owner','&id='+run)).body.translations.th.document);
  for(const action of ['archive','trash','restore','unpublish','delete']) {
    for(const role of ['missing','advisor','ops','readonly','inactive','unknown'])assert.equal((await call(action,{id:run,expectedRevision:draft.revision,confirmation:'DELETE'},role)).status,role==='missing'?401:403,action+' requires an active owner');
    assert.equal((await fetch(baseUrl+'/api/articles?action='+action,{method:'POST',headers:{Authorization:'Bearer '+tokens.owner,'Content-Type':'application/json'},body:JSON.stringify({id:run,expectedRevision:draft.revision,confirmation:'DELETE'})})).status,403,'UAT owner cannot mutate production');
  }
  assert.equal((await call('delete',{id:run,expectedRevision:draft.revision,confirmation:'DELETE'})).status,409,'Active articles cannot be permanently deleted');
  draft.translations.th.publishedAt='2026-09-01T00:00:00Z';
  draft=(await call('save',{article:draft,expectedRevision:draft.revision})).body;
  draft=(await call('publish',{id:run,expectedRevision:draft.revision,languages:['th']})).body;
  assert.equal(draft.publicationStatus,'published');
  const beforeArchive=structuredClone(draft),untouched=await repository.get('covermate-uat',dup.id);
  let pinSettings=(await call('catalog')).body.settings;
  const pinIds=(await call('catalog')).body.items.filter(item=>item.pinned||item.publishedPinned).map(item=>item.id);
  assert.equal((await call('pin-order',{order:pinIds,expectedRevision:pinSettings.revision})).status,200);
  pinSettings=(await call('catalog')).body.settings;
  result=await call('archive',{id:run,expectedRevision:draft.revision});assert.equal(result.status,200);draft=result.body;
  assert.equal(draft.lifecycle,'archived');assert.equal(draft.basePublished,false);
  assert.equal((await call('delete',{id:run,expectedRevision:draft.revision,confirmation:'DELETE'})).status,409,'Archive is retained until explicitly moved to Trash');
  assert.deepEqual(draft.translations,beforeArchive.translations,'Archive preserves authored content');
  assert.equal(draft.featured,false);assert.equal(draft.pinned,false);
  assert.equal((await call('catalog')).body.items.find(item=>item.id===run).status,'archived');
  assert.equal((await repository.feed('covermate-uat')).items.some(item=>item.id===run),false);
  assert.equal((await fetch(baseUrl+'/articles/'+run+'?cm_env=uat')).status,404);
  assert.equal((await call('catalog')).body.settings.pinnedOrder.includes(run),false,'Archive removes pin ordering');
  assert.equal((await call('pin-order',{order:pinIds,expectedRevision:pinSettings.revision})).status,409,'Archive invalidates stale pin settings');
  for(const action of ['save','publish','unpublish','archive']) {
    const body=action==='save'?{article:draft}:{id:run,languages:['th']};
    assert.equal((await call(action,{...body,expectedRevision:draft.revision})).status,409,'Inactive article rejects '+action);
  }
  assert.equal((await call('restore',{id:run,expectedRevision:beforeArchive.revision})).status,409,'Stale recovery cannot overwrite the lifecycle');
  result=await call('restore',{id:run,expectedRevision:draft.revision});assert.equal(result.status,200);draft=result.body;
  assert.equal(draft.lifecycle,'active');assert.equal(draft.publicationStatus,'draft');assert.equal(draft.slugLocked,true);
  assert.equal(await repository.detail('covermate-uat',run),null,'Restore never republishes');
  assert.equal((await call('restore',{id:run,expectedRevision:draft.revision})).status,409,'Cannot restore an active article');
  assert.equal((await call('publish',{id:dup.id,expectedRevision:dup.revision,languages:['th']})).status,409,'Archived URL remains reserved');
  draft=(await call('publish',{id:run,expectedRevision:draft.revision,languages:['th']})).body;
  assert.equal((await fetch(baseUrl+'/articles/'+run+'?cm_env=uat')).status,200,'Explicit republish works');
  draft=(await call('trash',{id:run,expectedRevision:draft.revision})).body;
  assert.equal(draft.lifecycle,'trashed');assert.equal(await repository.detail('covermate-uat',run),null);
  assert.equal((await call('trash',{id:run,expectedRevision:draft.revision})).status,409);
  assert.deepEqual((await call('read',null,'owner2','&id='+run)).body.translations,beforeArchive.translations,'A second owner can recover retained content');
  draft=(await call('restore',{id:run,expectedRevision:draft.revision})).body;
  assert.equal(draft.lifecycle,'active');assert.equal(draft.basePublished,false);
  assert.deepEqual(await repository.get('covermate-uat',dup.id),untouched,'Other articles remain byte-for-byte unchanged');
  const events=(await db.doc('sites/covermate-uat').collection('articleAudit').where('articleId','==',run).get()).docs.map(doc=>doc.data());
  for(const action of ['archive','trash','restore'])assert.ok(events.some(event=>event.action===action&&event.actor&&event.revision&&event.lifecycle),'Audited '+action);
  const direct=path=>fetch('http://127.0.0.1:8088/v1/projects/demo-covermate/databases/(default)/documents/sites/'+scope+'/'+path,{headers:{Authorization:'Bearer '+tokens.owner}});
  for(const path of ['articles/'+run,'articleCatalog/'+run,'articleSlugs/'+run,'articleSettings/current'])assert.equal((await direct(path)).status,403,'No direct SDK access: '+path);
  assert.ok((await db.doc('sites/covermate-uat').collection('articleAudit').where('articleId','==',run).get()).size>=5);
  assert.equal((await fetch('http://127.0.0.1:8088/v1/projects/demo-covermate/databases/(default)/documents/sites/'+scope+'/articles/'+run,{method:'DELETE',headers:{Authorization:'Bearer '+tokens.owner}})).status,403,'Client SDK cannot bypass the permanent-delete gate');
  draft=(await call('trash',{id:run,expectedRevision:draft.revision})).body;
  for(const confirmation of [undefined,'','delete',' DELETE','DELETE '])assert.equal((await call('delete',{id:run,expectedRevision:draft.revision,confirmation})).status,422,'Exact DELETE confirmation required');
  assert.deepEqual(await repository.get('covermate-uat',run),draft,'Invalid confirmations preserve all article content');
  const staleDelete={id:run,expectedRevision:draft.revision,confirmation:'DELETE'};
  draft=(await call('restore',{id:run,expectedRevision:draft.revision},'owner2')).body;
  assert.equal((await call('delete',staleDelete)).status,409,'Concurrent restore prevents stale deletion');
  assert.deepEqual(await repository.get('covermate-uat',run),draft,'The restored article is untouched');
  draft=(await call('trash',{id:run,expectedRevision:draft.revision})).body;
  const deletes=await Promise.all([0,1].map(()=>call('delete',{id:run,expectedRevision:draft.revision,confirmation:'DELETE'})));
  assert.deepEqual(deletes.map(value=>value.status).sort(),[200,404],'Concurrent deletion commits exactly once');
  assert.deepEqual(deletes.find(value=>value.status===200).body,{id:run,deleted:true,revision:draft.revision+1});
  for(const path of ['articles/'+run,'articleCatalog/'+run,'articleSlugs/'+run])assert.equal((await db.doc('sites/covermate-uat/'+path).get()).exists,false,'Permanent deletion removes '+path);
  assert.equal((await call('read',null,'owner','&id='+run)).status,404);
  assert.equal((await call('catalog')).body.items.some(item=>item.id===run),false);
  assert.equal((await repository.feed('covermate-uat')).items.some(item=>item.id===run),false);
  assert.equal((await call('catalog')).body.settings.pinnedOrder.includes(run),false);
  assert.equal((await fetch(baseUrl+'/articles/'+run+'?cm_env=uat')).status,404);
  assert.notEqual((await call('restore',{id:run,expectedRevision:draft.revision})).status,200,'Deletion is not recoverable');
  assert.equal((await call('save',{article:draft,expectedRevision:draft.revision})).status,409,'An old editor cannot resurrect a deleted article');
  assert.deepEqual(await repository.get('covermate-uat',dup.id),untouched,'Permanent deletion does not touch other articles');
  const deletionEvents=(await db.doc('sites/covermate-uat').collection('articleAudit').where('articleId','==',run).get()).docs.map(doc=>doc.data()).filter(event=>event.action==='delete');
  assert.equal(deletionEvents.length,1);assert.equal(deletionEvents[0].lifecycle,'deleted');
  assert.deepEqual(Object.keys(deletionEvents[0]).sort(),['action','actor','articleId','at','lifecycle','previousLifecycle','revision'],'Deletion audit retains only metadata, not authored content');
  assert.equal((await call('publish',{id:dup.id,expectedRevision:dup.revision,languages:['th']})).status,200,'Permanent deletion releases its owned slug reservation');
  console.log('PASS real article API: roles, UAT isolation, drafts/CAS, publication/locales, slug reservation, scheduling, toggles, lifecycle, exact DELETE gate, concurrent restore/deletion, atomic removal, no resurrection and metadata-only audit.');
  } else console.log('PASS owner feed API: authentication, roles, UAT isolation, published-only projection and unpublished-edit isolation.');
} finally {await new Promise(resolve=>server.close(resolve));}
