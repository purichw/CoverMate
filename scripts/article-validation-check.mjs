import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createArticleDraft} from '../admin/articles/drafts.mjs';
import {validateArticle} from '../article-validation.mjs';
import {createArticleRepository} from '../server/articles.mjs';
import {projectArticleDetail} from '../src/visitor/article-detail.mjs';
import {projectHomeArticles} from '../src/visitor/home-articles.mjs';
import {projectArticleIndex} from '../src/visitor/articles-index.mjs';
import {createSeoModel,renderSeoHead} from '../covermate-seo.mjs';
import {renderPublicPage} from '../server/seo-page.mjs';
import {articleUrl} from '../article-document.mjs';
import {startArticlesAdminPreview} from './articles-admin-preview.mjs';
import {articleCanvas,articleField,articleTool,openSettings,closeSettings,revealArticleControl} from './lib/article-editor-ui.mjs';
import {launchChromium,loadPlaywright} from './lib/playwright.mjs';

// Actual repository and public projection, isolated at the Firestore transport.
// This test never connects to Firebase, uploads media or certifies authentication.
const records=new Map();let serial=0,clock=Date.parse('2026-09-30T03:00:00Z');
const snapshot=path=>({id:path.split('/').at(-1),data:()=>structuredClone(records.get(path))});
const document=path=>({path,get:async()=>snapshot(path),collection:name=>collection(path+'/'+name)});
const collection=(path,max=Infinity)=>({path,doc:(id='fixture-'+(++serial))=>document(path+'/'+id),limit:n=>collection(path,n),get:async()=>{
  const docs=[...records.keys()].filter(key=>key.startsWith(path+'/')&&!key.slice(path.length+1).includes('/')).slice(0,max).map(snapshot);return {docs,size:docs.length};
}});
const db={doc:document,async runTransaction(operation){
  const pending=[];const result=await operation({get:async ref=>{assert.equal(pending.length,0);return ref.get();},set:(ref,value)=>pending.push([ref.path,structuredClone(value)]),create:(ref,value)=>pending.push([ref.path,structuredClone(value)])});
  for(const [path,value] of pending)records.set(path,value);return result;
}};
const repository=createArticleRepository({db,now:()=>clock++}),site='covermate-uat',uid='validation-test';
const body=text=>({type:'doc',content:[{type:'paragraph',content:[{type:'text',text}]}]});
const valid=id=>createArticleDraft({id,slug:id,authorName:'CoverMate',translations:{th:{title:'คำถามก่อนเลือกประกัน',excerpt:'เริ่มจากความคุ้มครองที่มีและงบประมาณของคุณ',document:body('ตรวจความคุ้มครองที่มีอยู่ก่อนเลือกแผนเพิ่มเติม')}}});
const empty=createArticleDraft({id:'empty'},'');
assert.deepEqual(validateArticle(empty),[],'Incomplete drafts may be saved');
assert.deepEqual(new Set(validateArticle(empty,{publish:true}).map(issue=>issue.field)),new Set(['slug','authorName','title','excerpt','document']));
assert.deepEqual(validateArticle(valid('valid'),{publish:true}),[],'SEO overrides, cover, tags and date are optional');
assert.ok(validateArticle(valid('valid'),{publish:true,languages:['th','en']}).some(issue=>issue.language==='en'&&issue.field==='title'));
for(const [field,value] of [['slug','Bad slug'],['authorName','x'.repeat(161)],['tags',['x'.repeat(81)]]]) {
  const draft=valid('invalid');draft[field]=value;assert.ok(validateArticle(draft).some(issue=>issue.field===field));
}
for(const [field,value] of [['publishedAt','2026-02-30T10:00:00Z'],['publishedAt','not-a-date'],['seoTitle','x'.repeat(241)],['seoDescription','x'.repeat(601)],['takeaways',Array(9).fill('One')]]) {
  const draft=valid('invalid');draft.translations.th[field]=value;assert.ok(validateArticle(draft).some(issue=>issue.field===field&&issue.language==='th'));
}
const refs=valid('refs');refs.translations.th.sources=[{label:'',url:'javascript:alert(1)'}];
assert.deepEqual(validateArticle(refs).map(issue=>issue.field),['source-label-0','source-url-0']);
let saved=await repository.mutate(site,'save',empty,0,uid);
const before=JSON.stringify([...records]);
await assert.rejects(repository.mutate(site,'publish',{id:saved.id,languages:['th']},saved.revision,uid),e=>e.status===422&&e.fields.some(f=>f.field==='slug'));
assert.equal(JSON.stringify([...records]),before,'Invalid publication cannot write any records');
await repository.changeSettings(site,{enabled:true,showHome:true,showNavigation:true},0,uid);
let seoDraft=valid('seo-proof');Object.assign(seoDraft.translations.th,{seoTitle:'หัวข้อสำหรับผลค้นหา',seoDescription:'คำอธิบายสำหรับผลค้นหา',publishedAt:'2026-09-01T03:00:00Z',coverAlt:'รถยนต์บนถนน',imageAlt:'รถยนต์บนถนน'});
seoDraft.translations.th.cover=seoDraft.translations.th.image={src:'/assets/article-preview/motor.jpg'};seoDraft.tags=['ประกันรถยนต์'];
seoDraft=await repository.mutate(site,'save',seoDraft,0,uid);
assert.equal(await repository.detail(site,seoDraft.slug),null,'Draft SEO is private');
seoDraft=await repository.mutate(site,'publish',{id:seoDraft.id,languages:['th']},seoDraft.revision,uid);
const project=async slug=>projectArticleDetail(await repository.detail(site,slug),{slug,mediaUrl:value=>articleUrl(value,true)});
const detail=await project(seoDraft.slug),model=createSeoModel({}, {path:'/articles/'+seoDraft.slug,article:detail,articleFeed:await repository.feed(site)});
const released=()=>repository.feed(site).then(feed=>feed.items.find(item=>item.id===seoDraft.id).translations.th.releasedAt);
const originalRelease=await released();
assert.equal(originalRelease,records.get(`sites/${site}/articles/${seoDraft.id}`).live.translations.th.updatedAt,'Feed uses the server-owned Publish time');
assert.notEqual(originalRelease,seoDraft.translations.th.publishedAt,'Optional display date is not the Publish clock');
clock+=60000;
seoDraft=await repository.mutate(site,'save',{...seoDraft,authorName:'Updated draft author'},seoDraft.revision,uid);
assert.equal(await released(),originalRelease,'Saving a draft cannot change public search chronology');
const legacyCatalog=records.get(`sites/${site}/articleCatalog/${seoDraft.id}`);
delete legacyCatalog.live.translations.th.releasedAt;
assert.equal(await released(),originalRelease,'Old catalog summaries recover the real live Publish time, not the newer draft save or optional date');
assert.equal(legacyCatalog.live.translations.th.releasedAt,undefined,'Reading old summaries does not migrate or publish content');
seoDraft=await repository.mutate(site,'publish',{id:seoDraft.id,languages:['th']},seoDraft.revision,uid);
assert.ok(Date.parse(await released())>Date.parse(originalRelease),'Republish advances the actual Publish timestamp');
assert.equal(model.title,'หัวข้อสำหรับผลค้นหา');assert.equal(model.meta.description,'คำอธิบายสำหรับผลค้นหา');
assert.equal(model.properties['og:image:alt'],'รถยนต์บนถนน');assert.equal(model.meta['twitter:image:alt'],'รถยนต์บนถนน');
const graph=model.graph['@graph'].find(item=>item['@type']==='Article');
assert.equal(graph.headline,seoDraft.translations.th.title);assert.equal(graph.dateModified,detail.updatedDatetime);assert.deepEqual(graph.keywords,seoDraft.tags);
assert.deepEqual(Object.keys(model.alternates),['th-TH'],'Only published languages have hreflang');
const fallback=createSeoModel({}, {path:'/articles/'+seoDraft.slug,article:{...detail,seoTitle:' ',seoDescription:''},articleFeed:await repository.feed(site)});
assert.equal(fallback.title,detail.title);assert.equal(fallback.meta.description,detail.excerpt);
assert.ok(!renderSeoHead(model).includes('name="keywords"'),'No obsolete meta-keywords control');

let undated=await repository.mutate(site,'save',valid('optional-date'),0,uid);
undated=await repository.mutate(site,'publish',{id:undated.id,languages:['th']},undated.revision,uid);
assert.equal(undated.translations.th.publishedAt,null,'Editor retains an explicitly blank date after Publish');
let undatedDetail=await project(undated.slug);
assert.equal(undatedDetail.date,'');assert.equal(undatedDetail.updated,'');assert.ok(undatedDetail.reading);
const firstPublished=undatedDetail.datetime;
const undatedFeed=await repository.feed(site);
assert.equal(undatedFeed.items.find(item=>item.id===undated.id).translations.th.releasedAt,records.get(`sites/${site}/articles/${undated.id}`).live.translations.th.updatedAt,'Hidden display dates still carry the real Publish time');
for(const item of [projectHomeArticles(undatedFeed).items.find(i=>i.key===undated.id),projectArticleIndex(undatedFeed).items.find(i=>i.key===undated.id)]){
  assert.equal(item.date,'');assert.ok(item.reading,'Undated cards keep useful reading metadata');
}
undated.translations.th.publishedAt='2026-09-20T03:00:00Z';
undated=await repository.mutate(site,'save',undated,undated.revision,uid);
assert.equal((await project(undated.slug)).date,'','Save does not publish a date');
undated=await repository.mutate(site,'publish',{id:undated.id,languages:['th']},undated.revision,uid);
assert.ok((await project(undated.slug)).date,'Provided date is displayed');
undated.translations.th.publishedAt=null;
undated=await repository.mutate(site,'save',undated,undated.revision,uid);
undated=await repository.mutate(site,'publish',{id:undated.id,languages:['th']},undated.revision,uid);
undatedDetail=await project(undated.slug);
assert.equal(undatedDetail.date,'');assert.equal(undatedDetail.updated,'');
assert.equal(undatedDetail.datetime,'2026-09-20T03:00:00.000Z','Clear retains internal publication ordering');
assert.ok(Date.parse(firstPublished));
undated.translations.th.publishedAt='2027-01-01T00:00:00Z';
undated=await repository.mutate(site,'save',undated,undated.revision,uid);
undated=await repository.mutate(site,'publish',{id:undated.id,languages:['th']},undated.revision,uid);
assert.equal(await repository.detail(site,undated.slug),null,'Future date still schedules publication');
undated.translations.th.publishedAt=null;
undated=await repository.mutate(site,'save',undated,undated.revision,uid);
undated=await repository.mutate(site,'publish',{id:undated.id,languages:['th']},undated.revision,uid);
assert.equal((await project(undated.slug)).date,'','Clearing a schedule publishes immediately without displaying a date');
console.log('PASS optional date: blank/set/clear, private Save, latest ordering, schedule cancellation and reading-time fallback.');

const fixture=createArticleDraft({id:'browser-validation',cover:{src:'/assets/articles/motor-road-v1.jpg'},translations:{th:{document:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'เนื้อหาบทความที่กำลังเขียน'}]},{type:'figure',attrs:{src:'/assets/article-preview/health.jpg',alt:''}}]}}}},'');
const imageIssues=validateArticle(fixture,{publish:true});assert.ok(imageIssues.some(i=>i.field==='coverAlt'));assert.ok(imageIssues.some(i=>i.field==='figure-alt-0'));
await repository.mutate(site,'save',fixture,0,uid);
console.log('PASS article validation and SEO: required/optional, malformed fields, conditional Alt, TH/EN, zero-write rejection, published metadata and fallback.');

let bilingualMedia=valid('language-media');
bilingualMedia.translations.th.cover=bilingualMedia.translations.th.image={src:'/assets/article-preview/motor.jpg',sourceUrl:'/assets/article-preview/motor.jpg'};
bilingualMedia.translations.th.coverAlt=bilingualMedia.translations.th.imageAlt='รถยนต์';
bilingualMedia.translations.en={...structuredClone(bilingualMedia.translations.th),title:'English article',excerpt:'Independent English content',document:body('English body'),cover:{src:'/assets/article-preview/health.jpg',sourceUrl:'/assets/article-preview/health.jpg'},image:{src:'/assets/article-preview/health.jpg'},coverAlt:'Medical equipment',imageAlt:'Medical equipment'};
bilingualMedia=await repository.mutate(site,'save',bilingualMedia,0,uid);
bilingualMedia=await repository.mutate(site,'publish',{id:bilingualMedia.id,languages:['th']},bilingualMedia.revision,uid);
const thLive=(await repository.detail(site,bilingualMedia.slug)).item.translations.th;
bilingualMedia.translations.th.cover=bilingualMedia.translations.th.image={src:'/assets/article-preview/life.jpg'};
bilingualMedia=await repository.mutate(site,'save',bilingualMedia,bilingualMedia.revision,uid);
bilingualMedia=await repository.mutate(site,'publish',{id:bilingualMedia.id,languages:['en']},bilingualMedia.revision,uid);
let mediaPublic=await repository.detail(site,bilingualMedia.slug);
assert.deepEqual(mediaPublic.item.translations.th,thLive,'EN publication leaves TH text and media snapshot untouched');
assert.equal(mediaPublic.item.translations.en.cover.sourceUrl,undefined,'Private originals never leak in translated public media');
assert.equal(projectArticleDetail(mediaPublic,{slug:bilingualMedia.slug,lang:'en',now:clock,mediaUrl:value=>value}).image,'/assets/article-preview/health.jpg');
const localizedFeed=await repository.feed(site);
assert.equal(projectHomeArticles(localizedFeed,{lang:'en',now:clock,mediaUrl:value=>value}).items.find(item=>item.slug===bilingualMedia.slug).image,'/assets/article-preview/health.jpg');
bilingualMedia.translations.en.cover=bilingualMedia.translations.en.image={src:''};bilingualMedia.translations.en.coverAlt='';
bilingualMedia=await repository.mutate(site,'save',bilingualMedia,bilingualMedia.revision,uid);
bilingualMedia=await repository.mutate(site,'publish',{id:bilingualMedia.id,languages:['en']},bilingualMedia.revision,uid);
mediaPublic=await repository.detail(site,bilingualMedia.slug);
assert.equal(projectArticleDetail(mediaPublic,{slug:bilingualMedia.slug,lang:'en',now:clock,mediaUrl:value=>value}).image,'','Explicit EN clear never falls back to TH or legacy images');
assert.deepEqual(mediaPublic.item.translations.th,thLive);
console.log('PASS independent language media: TH/EN draft, publication, feed/detail projection, private metadata stripping and explicit clear.');

if(process.argv.includes('--browser')) {
  const out='uat-results/article-validation';fs.mkdirSync(out,{recursive:true});
  const config=JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)'));
  const state={config,text:{}},requests=[];
  const server=await startArticlesAdminPreview({state,onRequest:async(req,res)=>{
    const url=new URL(req.url,'http://localhost');
    const send=(type,data,status=200)=>{res.writeHead(status,{'Content-Type':type});res.end(data);return true;};
    if(url.pathname==='/__validation/client.mjs')return send('text/javascript',fs.readFileSync('admin/articles/data.mjs','utf8'));
    if(url.pathname==='/admin/articles/data.mjs')return send('text/javascript',`import {createCloudArticleRepository as create} from '/__validation/client.mjs';const request=async(action,body,id)=>{const response=await fetch('/__validation/repository?action='+action+(id?'&id='+id:''),{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const result=await response.json();if(!response.ok)throw Object.assign(Error(result.message),result);return result;};const repository=create({request});export const createCloudArticleRepository=()=>repository;export const loadArticleCatalog=()=>repository.catalog();export const loadArticleForEditor=id=>repository.get(id);`);
    if(url.pathname==='/__validation/repository'){
      const action=url.searchParams.get('action');let input={};for await(const chunk of req)input.raw=(input.raw||'')+chunk;
      if(input.raw)input=JSON.parse(input.raw);requests.push(action);
      try{const result=action==='catalog'?await repository.catalog(site):action==='read'?await repository.get(site,url.searchParams.get('id')):await repository.mutate(site,action,input.article||{id:input.id,languages:input.languages},input.expectedRevision,uid);return send('application/json',JSON.stringify(result));}
      catch(error){return send('application/json',JSON.stringify({message:error.message,fields:error.fields,code:error.code}),error.status||500);}
    }
    if(url.pathname.startsWith('/articles/')){
      const article=await project(url.pathname.split('/').at(-1));
      return send('text/html',renderPublicPage(fs.readFileSync('index.html','utf8'),config,{path:url.pathname,article,articleFeed:await repository.feed(site),publishedState:state,siteId:site}));
    }
    return false;
  }});
  const playwright=loadPlaywright(),engine=process.env.COVERMATE_ARTICLES_BROWSER||'chromium';
  const browser=engine==='webkit'?await playwright.webkit.launch({headless:true}):await launchChromium(playwright.chromium,{headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));page.on('dialog',d=>d.accept());
  await context.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl?route.continue():route.abort());
  const publish=()=>page.locator('[data-ae=publish]:visible').first();
  const fieldError=key=>page.locator('.ae-field,.ae-toggle').filter({has:page.locator(`[data-field="${key}"]`)}).locator('.ae-field-error');
  const edit=async()=>{if(page.url()===server.baseUrl+'/admin#articles')await page.reload();else await page.goto(server.baseUrl+'/admin#articles');await page.locator('[data-article-state=ready]').waitFor();await page.locator('[data-article-action=edit][data-id="browser-validation"]:visible').first().click();await revealArticleControl(page,'.ae-canvas-frame');await articleCanvas(page).locator('.ae-editor-host:visible .tiptap').waitFor({timeout:30000});};
  const save=async()=>{await closeSettings(page);await page.locator('[data-ae=save]:visible').first().click();await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับร่างในคลังแล้ว'}).waitFor();};
  try{
    await edit();assert.ok(await publish().isDisabled());assert.match(await fieldError('title').textContent(),/กรุณา/);
    await save();assert.equal((await repository.get(site,fixture.id)).translations.th.title,'','Incomplete draft save works');
    await articleField(page,'title').fill('เลือกประกันรถยนต์อย่างไรให้เหมาะกับการใช้งาน');
    await articleField(page,'excerpt').fill('ชวนตรวจความคุ้มครองและงบประมาณก่อนตัดสินใจ');
    await articleField(page,'authorName').fill('ทีม CoverMate');
    await articleField(page,'slug').fill('Bad Slug');assert.ok(await publish().isDisabled());assert.match(await fieldError('slug').textContent(),/ภาษาอังกฤษ/);
    await page.locator('.ae-basic').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+engine+'-desktop-errors.png'});
    await articleField(page,'slug').fill('seo-proof');
    await page.locator('.ae-validation-summary [data-ae=validation-field][data-key=coverAlt]').click();assert.equal(await page.locator('[data-field=coverAlt]').getAttribute('aria-invalid'),'true');
    await articleField(page,'coverAlt').fill('รถยนต์บนถนนเลียบชายฝั่ง');
    await articleField(page,'figure-alt-0').fill('อุปกรณ์ตรวจสุขภาพบนโต๊ะ');await closeSettings(page);
    assert.ok(await publish().isEnabled());
    await articleField(page,'publishedAt').fill('1800-01-01T10:00');assert.ok(await publish().isDisabled());assert.match(await fieldError('publishedAt').textContent(),/วันที่/);
    await articleField(page,'publishedAt').fill('');assert.ok(await publish().isEnabled());
    await articleField(page,'publishedAt').fill('2026-09-01T10:00');
    await articleCanvas(page).locator('.ad-meta time').waitFor();
    await articleTool(page,'clear-date');
    assert.equal(await articleField(page,'publishedAt').inputValue(),'');
    await articleCanvas(page).locator('.ad-meta time').waitFor({state:'detached'});
    assert.equal(await page.locator('[data-card=date]').locator('..').isVisible(),false,'Card preview removes the whole date slot');
    await articleField(page,'publishedAt').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+engine+'-optional-date-admin.png'});
    assert.equal(await page.locator('.ae-image-profiles dt').count(),4);
    await (await revealArticleControl(page,'.ae-cover-section')).scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+engine+'-image-profiles-admin.png'});
    await articleTool(page,'add-takeaway');
    const summaryDialog=page.getByRole('dialog',{name:'สรุปประเด็นสำคัญ',exact:true});
    await summaryDialog.locator('[data-field=title]').fill('');await summaryDialog.locator('[data-field=items]').fill('ตรวจความคุ้มครองที่มีอยู่');
    assert.equal(await summaryDialog.locator('[data-field=title]').getAttribute('aria-required'),'false','Summary title can still be intentionally hidden');
    await summaryDialog.locator('[type=submit]').click();await summaryDialog.waitFor({state:'detached'});
    await articleTool(page,'add-source');assert.ok(await page.locator('[data-field=source-label-0]').isVisible());
    await page.locator('[data-field=source-url-0]').fill('javascript:bad');assert.match(await fieldError('source-url-0').textContent(),/HTTPS/);
    await page.locator('[data-field=source-label-0]').fill('ข้อมูลเพิ่มเติม');await page.locator('[data-field=source-url-0]').fill('https://example.com/reference');await closeSettings(page);
    await articleField(page,'seoTitle').fill('ประกันรถยนต์: ตรวจอะไรบ้างก่อนเลือก');
    await articleField(page,'seoDescription').fill('เปรียบเทียบความคุ้มครอง เงื่อนไข และงบประมาณก่อนเลือกประกันรถยนต์');
    await openSettings(page);assert.equal(await page.locator('[data-seo-preview=title]').textContent(),'ประกันรถยนต์: ตรวจอะไรบ้างก่อนเลือก');
    await page.locator('[data-panel=seo]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+engine+'-desktop-seo.png'});await closeSettings(page);
    await save();await edit();assert.equal(await articleField(page,'seoTitle').inputValue(),'ประกันรถยนต์: ตรวจอะไรบ้างก่อนเลือก');
    assert.equal(await articleField(page,'publishedAt').inputValue(),'','Blank date survives Save/reopen');
    await publish().click();let dialog=page.getByRole('dialog',{name:'Publish article',exact:true});
    await dialog.locator('[name=language][value=en]').check();assert.ok(await dialog.locator('[type=submit]').isDisabled());assert.match(await dialog.locator('.ae-form-error').textContent(),/EN:/);
    await dialog.locator('[name=language][value=en]').uncheck();await dialog.locator('[type=submit]').click();
    await fieldError('slug').filter({hasText:'มีบทความอื่น'}).waitFor();assert.ok(await publish().isDisabled(),'Server conflict disables Publish and targets slug');
    await articleField(page,'slug').fill('browser-validation');await publish().click();dialog=page.getByRole('dialog',{name:'Publish article',exact:true});await dialog.locator('[type=submit]').click();
    await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับเผยแพร่แล้ว'}).waitFor();
    const live=await repository.detail(site,'browser-validation');assert.equal(live.item.translations.th.seoTitle,'ประกันรถยนต์: ตรวจอะไรบ้างก่อนเลือก');assert.equal(live.item.translations.en,undefined);
    const visitor=await context.newPage();await visitor.goto(server.baseUrl+'/articles/browser-validation');await visitor.locator('.ad-title, .ad-header h1').first().waitFor();
    assert.equal(await visitor.title(),live.item.translations.th.seoTitle);
    assert.equal(await visitor.locator('meta[name=description]').getAttribute('content'),live.item.translations.th.seoDescription);
    assert.equal(await visitor.locator('meta[property="og:image:alt"]').getAttribute('content'),'รถยนต์บนถนนเลียบชายฝั่ง');
    assert.equal(await visitor.locator('cm-article-document figure img').first().getAttribute('alt'),'อุปกรณ์ตรวจสุขภาพบนโต๊ะ');
    assert.equal(live.item.translations.th.showDate,false);assert.equal(await visitor.locator('.ad-meta time').count(),0);
    await visitor.screenshot({path:out+'/'+engine+'-optional-date-public.png'});await visitor.close();
    await page.setViewportSize({width:375,height:900});await articleField(page,'excerpt').fill('');assert.ok(await publish().isDisabled());
    await page.locator('[data-field=excerpt]').locator('..').evaluate(el=>el.scrollIntoView({block:'center'}));await page.screenshot({path:out+'/'+engine+'-mobile-error.png'});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile page fits');
    await articleField(page,'publishedAt').fill('2026-09-01T10:00');
    await articleTool(page,'clear-date');assert.equal(await articleField(page,'publishedAt').inputValue(),'');
    await page.locator('[data-field=publishedAt]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+engine+'-optional-date-mobile-admin.png'});await closeSettings(page);
    await articleField(page,'excerpt').fill('คำโปรยฉบับแก้ไขที่ยังไม่เผยแพร่');await articleField(page,'seoTitle').fill('');await articleField(page,'seoDescription').fill('');
    await openSettings(page);await page.locator('[data-panel=seo]').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('[data-seo-preview=description]').textContent(),'คำโปรยฉบับแก้ไขที่ยังไม่เผยแพร่');
    await page.screenshot({path:out+'/'+engine+'-mobile-seo.png'});await closeSettings(page);await save();
    assert.equal((await repository.detail(site,'browser-validation')).item.translations.th.seoTitle,live.item.translations.th.seoTitle,'Saving new SEO draft does not alter live SEO');
    await page.evaluate(()=>{window.websiteShortcutCount=0;document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='s')window.websiteShortcutCount++;});});
    await articleField(page,'title').focus();await page.keyboard.press('Control+s');
    assert.equal(await page.evaluate(()=>window.websiteShortcutCount),0,'Article shortcut never reaches website shortcut');
    await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับร่างในคลังแล้ว'}).waitFor();
    await publish().click();dialog=page.getByRole('dialog',{name:'Publish article',exact:true});await dialog.locator('[type=submit]').click();
    await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับเผยแพร่แล้ว'}).waitFor();
    const clearedModel=createSeoModel({}, {path:'/articles/browser-validation',article:await project('browser-validation'),articleFeed:await repository.feed(site)});
    assert.equal(clearedModel.title,live.item.translations.th.title);assert.equal(clearedModel.meta.description,'คำโปรยฉบับแก้ไขที่ยังไม่เผยแพร่','Explicit cleared overrides publish the fallback');
    for(let i=0;i<10;i++){const pin=valid('home-quota-'+i);pin.featured=true;await repository.mutate(site,'save',pin,0,uid);}
    await page.setViewportSize({width:1440,height:1000});await articleField(page,'featured').check();
    const retainedTitle=await page.locator('[data-field=title]').inputValue();
    await page.locator('[data-ae=save]:visible').first().click();
    await fieldError('featured').filter({hasText:'ไม่เกิน 10'}).waitFor();
    await page.locator('.ae-settings-dialog[open]').waitFor();
    assert.ok(await publish().isDisabled(),'Quota error prevents publication');
    await page.setViewportSize({width:375,height:900});await openSettings(page);
    assert.equal(await page.locator('[data-field=title]').inputValue(),retainedTitle,'Quota failure preserves content');
    assert.ok(await page.getByRole('switch',{name:'ปักหมุดบน Home'}).isChecked());
    assert.equal(await page.locator('.ae-settings-dialog').evaluate(el=>el.scrollWidth>el.clientWidth),false);
    await page.locator('[data-field=featured]').uncheck();await closeSettings(page);await save();
    assert.ok(await publish().isEnabled(),'Correcting the Home pin recovers publication');
    await articleTool(page,'unpublish');
    await page.getByRole('dialog',{name:'Unpublish article',exact:true}).locator('[type=submit]').click();
    await page.locator('.ae-feedback').filter({hasText:'ถอนเผยแพร่แล้ว'}).waitFor();
    assert.equal(await repository.detail(site,'browser-validation'),null,'Unpublish confirmation from settings removes only the public copy');
    assert.ok((await repository.get(site,fixture.id)).translations.th.document,'Unpublish retains the editable document');
    // The same article can publish EN alone even with an incomplete TH draft.
    await articleField(page,'title').fill('');await articleField(page,'excerpt').fill('');
    if(await page.locator('.ae-writing[data-expanded=false]').count())await page.locator('[data-ae=toggle-writing]').click();
    await articleCanvas(page).locator('.ae-editor-host:visible .tiptap').fill('');
    await page.locator('[data-lang=en]').click();
    await articleField(page,'title').fill('Questions before choosing insurance');
    await articleField(page,'excerpt').fill('Review your current cover and budget.');
    await articleField(page,'coverAlt').fill('Car on a coastal road');
    await articleCanvas(page).locator('.ae-editor-host:visible .tiptap').fill('Read the policy terms before selecting a plan.');
    assert.ok(await publish().isEnabled(),'Incomplete TH never blocks a complete EN publication');
    await publish().click();dialog=page.getByRole('dialog',{name:'Publish article',exact:true});
    assert.ok(await dialog.locator('[name=language][value=en]').isChecked());assert.equal(await dialog.locator('[name=language][value=th]').isChecked(),false);
    await dialog.locator('[name=language][value=en]').uncheck();assert.ok(await dialog.locator('[type=submit]').isDisabled(),'At least one language is required');
    await dialog.locator('[name=language][value=en]').check();await dialog.locator('[name=language][value=th]').check();
    assert.ok(await dialog.locator('[type=submit]').isDisabled(),'Selecting an incomplete TH version blocks that combined publication');
    await dialog.locator('[name=language][value=th]').uncheck();
    await page.screenshot({path:out+'/'+engine+'-publish-en-only.png'});
    await dialog.locator('[type=submit]').click();await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับเผยแพร่แล้ว'}).waitFor();
    const english=await repository.detail(site,'browser-validation');assert.deepEqual(Object.keys(english.item.translations),['en']);
    await page.locator('[data-lang=th]').click();
    await articleField(page,'title').fill('คำถามก่อนเลือกประกัน');await articleField(page,'excerpt').fill('ตรวจความคุ้มครองก่อนตัดสินใจ');
    await articleCanvas(page).locator('.ae-editor-host:visible .tiptap').fill('อ่านรายละเอียดกรมธรรม์ก่อนเลือกแผน');
    await publish().click();dialog=page.getByRole('dialog',{name:'Publish article',exact:true});
    assert.equal(await dialog.locator('[name=language][value=en]').isChecked(),false);
    await dialog.locator('[type=submit]').click();await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับเผยแพร่แล้ว'}).waitFor();
    const bilingual=await repository.detail(site,'browser-validation');
    assert.deepEqual(bilingual.item.translations.en,english.item.translations.en,'Publishing TH preserves the unselected EN live snapshot');
    assert.equal(bilingual.item.translations.th.title,'คำถามก่อนเลือกประกัน');
    assert.deepEqual(errors,[]);assert.ok(requests.includes('save')&&requests.includes('publish'));
    fs.writeFileSync(out+'/'+engine+'-report.json',JSON.stringify({passed:true,engine,requests,errors,scope:'Actual editor + repository + visitor; isolated storage; auth not exercised'},null,2));
    console.log('PASS '+engine+' actual UI: field errors, draft save/reload, Alt, SEO preview/publication/visitor, TH/EN guard, slug conflict, mobile, live isolation, shortcut isolation.');
  }catch(error){await page.screenshot({path:out+'/'+engine+'-failure.png'});console.error('Browser errors:',errors);throw error;}
  finally{await browser.close();await new Promise(resolve=>server.server.close(resolve));}
}
