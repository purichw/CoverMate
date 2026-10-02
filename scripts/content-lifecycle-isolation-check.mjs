import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createArticleRepository} from '../server/articles.mjs';
import {createArticleDraft} from '../admin/articles/drafts.mjs';
import {canEditContent,normalizeAdminRole} from '../covermate-roles.mjs';

// Run the actual website Firebase client/contract and article repository against
// one in-memory Firestore boundary. No browser, emulator, credentials or network.
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const site='covermate-uat',uid='lifecycle-owner',root='sites/'+site;
const documents=new Map(),storage=new Map(),writes=[];
let serial=0,clock=Date.parse('2026-09-30T03:00:00Z');
const now=()=>clock++;
const pathOf=ref=>typeof ref==='string'?ref:ref.path;
function snapshot(ref){
  const path=pathOf(ref),value=copy(documents.get(path));
  return {id:path.split('/').at(-1),exists:()=>value!==undefined,data:()=>copy(value)};
}
function documentRef(path){return {path,id:path.split('/').at(-1),get:async()=>snapshot(path),collection:name=>collectionRef(path+'/'+name)};}
function collectionRef(path,maximum=Infinity){
  return {path,doc:id=>documentRef(path+'/'+(id||'fixture-'+(++serial))),limit:value=>collectionRef(path,value),async get(){
    const entries=[...documents.keys()].filter(key=>key.startsWith(path+'/')&&!key.slice(path.length+1).includes('/')).slice(0,maximum);
    return {size:entries.length,docs:entries.map(snapshot)};
  }};
}
async function transaction(operation){
  const pending=[];
  const result=await operation({
    get:async ref=>{assert.equal(pending.length,0,'Transaction reads must precede writes');return snapshot(ref);},
    set:(ref,value)=>pending.push({path:pathOf(ref),value:copy(value)}),
    create:(ref,value)=>{assert.ok(!documents.has(pathOf(ref)),'Create cannot overwrite an existing record');pending.push({path:pathOf(ref),value:copy(value)});}
  });
  for(const entry of pending){documents.set(entry.path,copy(entry.value));writes.push(entry.path);}
  return result;
}
const db={doc:documentRef,collection:collectionRef,runTransaction:transaction};
const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
const scope={console,URL,URLSearchParams,queueMicrotask,canEditContent,normalizeAdminRole,
  window:{localStorage,dispatchEvent(){}},CustomEvent:class{},
  firebaseConfig:()=>({}),emulatorEnabled:()=>false,FIREBASE_VERSION:'isolated-fixture',
  resolveCoverMateEnvironment:()=>({siteId:site,isUat:true,name:'uat'})
};
// Preserve the real browser cache implementation, with only localStorage doubled.
const contractSource=fs.readFileSync(new URL('../covermate-contract.js',import.meta.url),'utf8')
  .replace(/^export \{[^\n]*\};?\n/gm,'').replace(/^export default contract;?\n/gm,'').replace(/^export /gm,'');
const contract=vm.runInNewContext('(function(){'+contractSource+'\nreturn contract;})()',scope);
Object.assign(scope,contract,{cacheState:contract.cacheSiteState,clearSession:contract.clearAdminSession,readSession:contract.readAdminSession,writeSession:contract.writeAdminSession});
const auth={currentUser:{uid,email:'lifecycle@example.invalid'}};
const firestore={
  getFirestore:()=>db,
  doc:(parent,...parts)=>parent===db?documentRef(parts.join('/')):documentRef(parent.path+'/'+(parts.join('/')||'fixture-'+(++serial))),
  collection:(_db,...parts)=>collectionRef(parts.join('/')),
  getDoc:async ref=>snapshot(ref),
  serverTimestamp:()=>({fixtureTimestamp:now()}),
  runTransaction:(_db,operation)=>transaction(operation),
  setDoc:async(ref,value)=>transaction(tx=>tx.set(ref,value))
};
const sdk={
  'firebase-app.js':{getApps:()=>[],initializeApp:()=>({})},
  'firebase-auth.js':{getAuth:()=>auth,GoogleAuthProvider:class{setCustomParameters(){}},onAuthStateChanged:(_auth,callback)=>{queueMicrotask(()=>callback(auth.currentUser));return ()=>{};}},
  'firebase-firestore.js':firestore
};
scope.importFirebaseModule=async url=>{
  const module=sdk[url.split('/').at(-1)];
  assert.ok(module,'Only the isolated Firebase SDK boundary may be imported');
  return module;
};
const clientSource=fs.readFileSync(new URL('../covermate-firebase.js',import.meta.url),'utf8')
  .replace(/^import[\s\S]*?from\s+["'][^"']+["'];?\n/gm,'').replace(/\bimport\(/g,'importFirebaseModule(');
const website=await vm.runInNewContext('(async()=>{'+clientSource+'\nreturn window.CoverMateFirebase;})()',scope);
const articles=createArticleRepository({db,now});
const defaults=JSON.parse(vm.runInNewContext(fs.readFileSync(new URL('../src/visitor/defaults.js',import.meta.url),'utf8')+'\nJSON.stringify(DEFAULTS)'));
const state=(name,revision)=>{
  const config=copy(defaults);config.brand.name.th=name;
  // Existing unrecognized config fields cannot become the article source of truth.
  config.articles={legacyMarker:name,items:[{id:'legacy-only',status:'published'}]};
  return copy(contract.sanitizeStateDoc({config,text:{'life:1:th':name},revision},{repeatableIds:true}));
};
documents.set('admins/'+uid,{role:'owner',active:true,uatOnly:true});
documents.set(root+'/states/live',state('Website published',3));
documents.set(root+'/states/draft',state('Website draft',7));
documents.set(root+'/versions/existing',{id:'existing',config:state('Earlier website',1).config,text:{},ts:1});
await website.hydrateLocalContent({draft:true});
contract.cacheVersions([documents.get(root+'/versions/existing')]);
const websitePath=path=>path.startsWith(root+'/states/')||path.startsWith(root+'/versions/');
const articlePath=path=>/^sites\/covermate-uat\/(?:articles|articleCatalog|articleSlugs|articleSettings|articleAudit)\//.test(path);
const domainBytes=predicate=>JSON.stringify([...documents].filter(([path])=>predicate(path)).sort(([a],[b])=>a.localeCompare(b)));
const cacheBytes=()=>JSON.stringify([...storage].sort(([a],[b])=>a.localeCompare(b)));
const websiteState=name=>copy(documents.get(root+'/states/'+name));
const publicArticles=async()=>JSON.stringify({feed:await articles.feed(site),detail:await articles.detail(site,'published-article'),settings:await articles.settings(site)});
const checks=[];
const untouchedArticles=new Map();
function assertUntouchedArticles(label,start){
  for(const [path,bytes] of untouchedArticles){
    assert.equal(JSON.stringify(documents.get(path)),bytes,label+' must preserve the other article record and revision byte for byte: '+path);
    assert.ok(!writes.slice(start).includes(path),label+' must not write the other article record: '+path);
  }
}
async function articleAction(label,operation){
  const before=domainBytes(websitePath),cache=cacheBytes(),start=writes.length;
  const result=await operation();
  assert.equal(domainBytes(websitePath),before,label+' must preserve website documents and revisions byte for byte');
  assert.equal(cacheBytes(),cache,label+' must preserve website draft/live/history browser caches');
  assert.ok(writes.slice(start).every(articlePath),label+' writes only article-owned collections');
  assertUntouchedArticles(label,start);
  checks.push(label);return result;
}
async function websiteAction(label,operation){
  const before=domainBytes(articlePath),published=await publicArticles(),start=writes.length;
  const result=await operation();
  assert.equal(domainBytes(articlePath),before,label+' must preserve every article draft/live/catalog/settings/audit revision byte for byte');
  assert.equal(await publicArticles(),published,label+' must preserve the article public projection');
  assert.ok(writes.slice(start).every(websitePath),label+' writes only website-owned documents');
  assertUntouchedArticles(label,start);
  checks.push(label);return result;
}
function article(id,title){
  const value=createArticleDraft();value.id=id;value.slug=id;value.authorName='Lifecycle fixture';
  Object.assign(value.translations.th,{title,excerpt:'Isolated article lifecycle check',document:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:title+' body'}]}]}});
  return value;
}
let a=await articleAction('Article save',()=>articles.mutate(site,'save',article('published-article','Article published title'),0,uid));
a=await articleAction('Article publish',()=>articles.mutate(site,'publish',{id:a.id,languages:['th']},a.revision,uid));
const b=await articleAction('Second article draft save',()=>articles.mutate(site,'save',article('draft-b','Unpublished B'),0,uid));
const c=await articleAction('Third article draft save',()=>articles.mutate(site,'save',article('draft-c','Unpublished C'),0,uid));
for(const id of [b.id,c.id])for(const collection of ['articles','articleCatalog']){
  const path=root+'/'+collection+'/'+id;
  assert.ok(documents.has(path),'Both other drafts have private and catalog records');
  untouchedArticles.set(path,JSON.stringify(documents.get(path)));
}
let flags=await articleAction('Article settings save',()=>articles.changeSettings(site,{enabled:true,showHome:true,showNavigation:true},0,uid));
assert.deepEqual((await articles.feed(site)).items.map(item=>item.id),[a.id],'Only the article live record populates the public feed');
assert.equal(await articles.detail(site,b.slug),null);assert.equal(await articles.detail(site,c.slug),null);
assert.equal(await articles.detail(site,'legacy-only'),null,'Legacy website config.articles is not an article publication');
a.translations.th.title='Pending article changes';
a=await articleAction('Published article draft save',()=>articles.mutate(site,'save',a,a.revision,uid));
assert.equal((await articles.detail(site,a.slug)).item.translations.th.title,'Article published title');

const websiteDraft=websiteState('draft');websiteDraft.config.brand.name.th='Website ready to publish';
const liveBeforeSave=JSON.stringify(websiteState('live'));
await websiteAction('Website save',()=>website.saveSiteState('draft',websiteDraft.config,websiteDraft.text));
assert.equal(JSON.stringify(websiteState('live')),liveBeforeSave,'Website save cannot publish the website draft');
assert.equal(websiteState('draft').revision,8);
const beforeVersionCount=[...documents.keys()].filter(path=>path.startsWith(root+'/versions/')).length;
await websiteAction('Website publish',()=>website.publishSiteState(websiteDraft.config,websiteDraft.text,{label:'Website only'}));
assert.equal(websiteState('live').config.brand.name.th,'Website ready to publish');
assert.equal(websiteState('live').revision,4);assert.equal(websiteState('draft').revision,9);
assert.equal([...documents.keys()].filter(path=>path.startsWith(root+'/versions/')).length,beforeVersionCount+1);
assert.equal((await articles.get(site,a.id)).translations.th.title,'Pending article changes');
assert.equal((await articles.detail(site,a.slug)).item.translations.th.title,'Article published title','Website publish cannot publish a pending article edit');

const pendingWebsite=websiteState('draft');pendingWebsite.config.brand.name.th='Pending website changes';
await websiteAction('Website save before article changes',()=>website.saveSiteState('draft',pendingWebsite.config,pendingWebsite.text));
a=await articleAction('Article republish while website has a draft',()=>articles.mutate(site,'publish',{id:a.id,languages:['th']},a.revision,uid));
assert.equal((await articles.detail(site,a.slug)).item.translations.th.title,'Pending article changes');
assert.equal(websiteState('live').config.brand.name.th,'Website ready to publish');
assert.equal(websiteState('draft').config.brand.name.th,'Pending website changes');
flags=await articleAction('Article visibility update',()=>articles.changeSettings(site,{...flags,showHome:false,showNavigation:false},flags.revision,uid));
const beforeResetLive=JSON.stringify(websiteState('live'));
const beforeResetVersions=domainBytes(path=>path.startsWith(root+'/versions/'));
await websiteAction('Website reset to published',()=>website.resetDraftToPublished());
assert.deepEqual(websiteState('draft').config,websiteState('live').config);
assert.deepEqual(websiteState('draft').text,websiteState('live').text);
assert.equal(websiteState('draft').revision,11);
assert.equal(JSON.stringify(websiteState('live')),beforeResetLive);
assert.equal(domainBytes(path=>path.startsWith(root+'/versions/')),beforeResetVersions);
assert.equal((await articles.get(site,b.id)).translations.th.title,'Unpublished B');
assert.equal((await articles.get(site,c.id)).translations.th.title,'Unpublished C');
assert.deepEqual(await articles.settings(site),flags,'Website reset cannot reset article visibility');
a=await articleAction('Article unpublish',()=>articles.mutate(site,'unpublish',{id:a.id},a.revision,uid));
assert.equal(await articles.detail(site,a.slug),null);
assert.equal((await articles.get(site,a.id)).translations.th.title,'Pending article changes','Unpublish preserves the article draft');
a=await articleAction('Article publish after website reset',()=>articles.mutate(site,'publish',{id:a.id,languages:['th']},a.revision,uid));
assert.equal((await articles.detail(site,a.slug)).item.translations.th.title,'Pending article changes');
a=await articleAction('Article archive',()=>articles.mutate(site,'archive',{id:a.id},a.revision,uid));
assert.equal(await articles.detail(site,a.slug),null);
a=await articleAction('Restore archived article',()=>articles.mutate(site,'restore',{id:a.id},a.revision,uid));
assert.equal(a.basePublished,false);
a=await articleAction('Article trash',()=>articles.mutate(site,'trash',{id:a.id},a.revision,uid));
a=await articleAction('Restore trashed article',()=>articles.mutate(site,'restore',{id:a.id},a.revision,uid));
assert.equal(a.basePublished,false);
assert.equal(a.translations.th.title,'Pending article changes');

console.log('PASS content lifecycle isolation: '+checks.length+' real website/article operations; independent documents, revisions, caches, drafts, publication, reset and visibility.');
