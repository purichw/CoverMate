import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createArticleDraft} from '../admin/articles/drafts.mjs';
import {createArticleRepository} from '../server/articles.mjs';
import {createPageHandler} from '../server/seo-page.mjs';
import {extractBundlerTemplate} from '../server/bundler-template.mjs';
import {startNfrServer} from './nfr-server.mjs';

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8088'||process.env.COVERMATE_TEST_MODE!=='emulator')throw Error('Isolated emulators required');
const require=createRequire(import.meta.url),db=require('../server/firebase.cjs').serverDb();
let now;const repository=createArticleRepository({db,now:()=>now??Date.now()});
const {server,baseUrl}=await startNfrServer({pageHandler:createPageHandler({readPublished:async()=>({config:{sections:[]},text:{}}),readArticles:site=>repository.feed(site),readArticle:(site,slug)=>repository.detail(site,slug)})});
const run='article-'+crypto.randomUUID(),tokens={};
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
  for(const role of ['advisor','ops','readonly','inactive','unknown'])assert.equal((await call('catalog',null,role)).status,403);
  const denied=await fetch(baseUrl+'/api/articles?action=catalog',{headers:{Authorization:'Bearer '+tokens.owner}});assert.equal(denied.status,403,'UAT owner cannot access production');
  let flags=(await call('catalog')).body.settings;
  const flag=async changes=>{const result=await call('settings',{settings:{...flags,...changes},expectedRevision:flags.revision});assert.equal(result.status,200,JSON.stringify(result));flags=result.body;};
  await flag({enabled:false});
  assert.equal((await fetch(baseUrl+'/articles?cm_env=uat')).status,404);
  let draft=createArticleDraft();draft.id=run;draft.slug=run;draft.authorName='Emulator QA';draft.categoryId='general';draft.featured=true;draft.pinned=true;
  Object.assign(draft.translations.th,{title:'บทความทดสอบใน Emulator',excerpt:'ทดสอบการเผยแพร่จริงจากคลังทดสอบ',document:{type:'doc',content:[{type:'heading',attrs:{level:2},content:[{type:'text',text:'หัวข้อทดสอบ'}]},{type:'paragraph',content:[{type:'text',text:'เนื้อหาจากคลังกลางทดสอบ'}]}]},takeaways:['ข้อสรุปทดสอบ']});
  let result=await call('save',{article:draft,expectedRevision:0});assert.equal(result.status,200,JSON.stringify(result));draft=result.body;
  assert.equal((await call('read',null,'owner2','&id='+run)).body.translations.th.title,draft.translations.th.title,'Second owner reads same persisted draft');
  assert.equal((await repository.feed('covermate-uat')).items.some(i=>i.id===run),false,'Draft does not leak');
  const concurrent=await Promise.all(['A','B'].map(marker=>call('save',{article:{...draft,authorName:marker},expectedRevision:draft.revision})));
  assert.equal(concurrent.filter(r=>r.status===200).length,1);assert.equal(concurrent.filter(r=>r.status===409).length,1);draft=concurrent.find(r=>r.status===200).body;
  assert.equal((await call('publish',{id:run,expectedRevision:draft.revision,languages:['en']})).status,422,'Incomplete English cannot publish');
  result=await call('publish',{id:run,expectedRevision:draft.revision,languages:['th']});assert.equal(result.status,200,JSON.stringify(result));draft=result.body;
  assert.equal((await repository.feed('covermate-uat')).items.some(i=>i.id===run),false,'Master off blocks published feed');
  await flag({enabled:true});
  const sitemap=await fetch(baseUrl+'/api/article-sitemap?cm_env=uat');assert.equal(sitemap.status,200);assert.equal((await sitemap.text()).includes('<loc>'),false,'UAT sitemap is empty');
  const feed=await repository.feed('covermate-uat');assert.equal(feed.items.find(i=>i.id===run).translations.th.readingMinutes,1);assert.equal(JSON.stringify(feed).includes('document'),false);assert.equal(JSON.stringify(feed).includes('เนื้อหาจากคลังกลาง'),false);
  const detail=await repository.detail('covermate-uat',run);assert.equal(detail.item.translations.th.author,draft.authorName);assert.equal(detail.item.translations.en,undefined);
  assert.equal((await fetch(baseUrl+'/articles/'+run+'?cm_env=uat')).status,200);assert.equal((await fetch(baseUrl+'/articles/'+run+'?cm_env=uat&lang=en')).status,404);
  const liveTitle=detail.item.translations.th.title;draft.translations.th.title='ยังไม่เผยแพร่การแก้ไข';
  draft=(await call('save',{article:draft,expectedRevision:draft.revision})).body;
  assert.equal((await repository.detail('covermate-uat',run)).item.translations.th.title,liveTitle);
  const duplicate=createArticleDraft(draft);duplicate.id='duplicate-'+crypto.randomUUID();duplicate.revision=0;duplicate.slugLocked=false;
  const dup=(await call('save',{article:duplicate,expectedRevision:0})).body;
  assert.equal((await call('publish',{id:dup.id,expectedRevision:dup.revision,languages:['th']})).status,409,'Slug is atomically reserved');
  for(const enabled of [false,true])for(const showHome of [false,true])for(const showNavigation of [false,true]) {
    await flag({enabled,showHome,showNavigation});
    const response=await fetch(baseUrl+'/articles?cm_env=uat');assert.equal(response.status,enabled?200:404);
    assert.match(response.headers.get('cache-control'),/no-store/);
    const home=extractBundlerTemplate(await (await fetch(baseUrl+'/?cm_env=uat')).text());
    const seed=JSON.parse(/<script id="covermate-article-feed" type="application\/json">(.*?)<\/script>/.exec(home)[1]);
    assert.deepEqual(seed.settings,{enabled,showHome,showNavigation,revision:flags.revision});assert.equal(seed.items.some(i=>i.id===run),enabled);
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
  const direct=path=>fetch('http://127.0.0.1:8088/v1/projects/demo-covermate/databases/(default)/documents/sites/covermate-uat/'+path,{headers:{Authorization:'Bearer '+tokens.owner}});
  for(const path of ['articles/'+run,'articleCatalog/'+run,'articleSlugs/'+run,'articleSettings/current'])assert.equal((await direct(path)).status,403,'No direct SDK access: '+path);
  assert.ok((await db.collection('sites/covermate-uat/articleAudit').where('articleId','==',run).get()).size>=5);
  console.log('PASS real article API: roles, UAT isolation, shared drafts, CAS conflicts, publication/locales, live isolation, slug reservation, scheduling, all 8 toggle combinations, no-store, direct URL/Firestore guards, unpublish and audit.');
} finally {await new Promise(resolve=>server.close(resolve));}
