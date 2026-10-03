import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as contract from '../covermate-contract.js';
import {projectServicePage, servicePageMetadata} from '../src/visitor/service-page.mjs';
import {buildVisitorRuntime} from './lib/visitor-source.mjs';
import {resolveStaticFileCandidates} from './lib/static-server.mjs';
import {createSeoModel} from '../covermate-seo.mjs';
import {renderPublicPage} from '../server/seo-page.mjs';

const defaults=JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)'));
const source=JSON.stringify(defaults);
const state=contract.sanitizeStateDoc({config:defaults,text:{}},{repeatableIds:true});
assert.equal(JSON.stringify(defaults),source,'Service defaults must not mutate the stored input');
assert.deepEqual(contract.sanitizeStateDoc(state,{repeatableIds:true}),state,'Service CMS normalization is idempotent');
for(const version of [5,19,25]) {
  const legacy=structuredClone(state);
  legacy.config.cmsContentVersion=version;
  delete legacy.config.servicePages;
  const original=JSON.stringify(legacy);
  const upgraded=contract.sanitizeStateDoc(legacy,{repeatableIds:true});
  assert.equal(JSON.stringify(legacy),original,'Migrating published service fields cannot mutate the input');
  assert.equal(upgraded.config.cmsContentVersion,contract.CMS_CONTENT_VERSION);
  for(const page of ['health','life']) for(const lang of ['th','en']) {
    assert.equal(projectServicePage(upgraded.config,page,lang).copy.title,state.config.servicePages[page].title[lang],'Versioned published CMS states receive missing service copy before sanitization');
    assert.equal(servicePageMetadata(upgraded.config,page,lang).title,state.config.servicePages[page].seoTitle[lang]);
  }
  legacy.config.servicePages={health:{title:{th:'',en:'Owner title'},checkItems:{th:''}}};
  const partial=contract.sanitizeStateDoc(legacy,{repeatableIds:true});
  assert.equal(partial.config.servicePages.health.title.th,'','A migration cannot replace an explicit blank');
  assert.equal(partial.config.servicePages.health.title.en,'Owner title');
  assert.equal(partial.config.servicePages.health.checkItems.th,'');
  assert.ok(partial.config.servicePages.health.checkItems.en,'Missing locale is seeded independently');
}
const currentMissing=structuredClone(state);
delete currentMissing.config.servicePages;
assert.equal(contract.sanitizeStateDoc(currentMissing).config.servicePages.health.title.th,'','Current-schema absent fields are sanitized to blanks, not silently repopulated');
for(const page of ['health','life']) {
  assert.deepEqual(resolveStaticFileCandidates('/'+page),resolveStaticFileCandidates('/'),'The local preview server must serve the public shell for service routes');
  assert.equal(contract.routePageFromLocationParts('/'+page),page);
  assert.equal(contract.publicPathForRoutePage(page),'/'+page);
  assert.equal(contract.cleanPublicExitPath('/'+page),'/'+page);
  for(const mode of ['admin','edit','preview']) {
    const url=new URL(contract.ownerPathForMode(mode,page,'?lang=en&cm_env=uat'),'https://example.invalid');
    assert.equal(contract.routePageFromLocationParts(url.pathname,url.search),page);
    assert.equal(url.searchParams.get('lang'),'en');
    assert.equal(url.searchParams.get('cm_env'),'uat');
  }
  for(const lang of ['th','en']) {
    const model=projectServicePage(state.config,page,lang);
    assert.ok(model.copy.title&&model.copy.intro&&model.copy.disclosure);
    assert.equal(model.steps.length,3);
    assert.equal(model.questions.length,3);
    assert.equal(model.checkItems.length,4);
    assert.equal(model.prepareItems.length,4);
    assert.equal(model.formHref,'/#talk');
    assert.equal(servicePageMetadata(state.config,page,lang).title,model.copy.seoTitle);
  }
}
const cleared=structuredClone(state);
cleared.config.servicePages.health.title.th='';
cleared.config.servicePages.health.checkItems.th='';
const saved=contract.sanitizeStateDoc(cleared,{repeatableIds:true});
assert.equal(projectServicePage(saved.config,'health','th').copy.title,'','Explicit clearing must survive save/reopen');
assert.equal(projectServicePage(saved.config,'health','th').checkItems.length,0);
assert.equal(projectServicePage(saved.config,'health','en').copy.title,state.config.servicePages.health.title.en);
const feed={available:true,settings:{enabled:true},items:[{id:'health-guide',slug:'health-insurance-guide',status:'published',translations:{th:{title:'Health guide',status:'published',publishedAt:'2020-01-01T00:00:00Z'},en:{title:'Unpublished English',status:'draft'}}}]};
assert.equal(projectServicePage(state.config,'health','th',{articleFeed:feed}).related.length,1);
assert.equal(projectServicePage(state.config,'health','en',{articleFeed:feed}).related.length,0,'Do not link unpublished translations');
assert.equal(projectServicePage(state.config,'health','th',{articleFeed:{...feed,settings:{enabled:false}}}).related.length,0);

const sandbox={console,URL,URLSearchParams,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:fn=>fn(),
  window:{CoverMateContract:contract,innerWidth:1280,location:{pathname:'/health',search:'',origin:'http://localhost',href:'http://localhost/health'},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}},
  document:{querySelector:()=>null,querySelectorAll:()=>[],documentElement:{setAttribute(){},removeAttribute(){}},body:null},
  DCLogic:class{setState(value,callback){Object.assign(this.state,typeof value==='function'?value(this.state):value);callback?.();}}
};
vm.runInNewContext(buildVisitorRuntime()+'\nthis.Component=Component;',sandbox);
const app=new sandbox.Component();
app.readJSON=()=>null;app.writeJSON=()=>{};app.queueRemoteDraft=()=>{};app.textOv={};
app.state.site=app.normalizeConfig(state.config,{repeatableIds:true});
const directServiceLink=value=>typeof value==='string'&&/^\/(health|life)(?:[/?#]|$)/.test(value);
const collectHrefs=value=>Array.isArray(value)?value.flatMap(collectHrefs):value&&typeof value==='object'?Object.entries(value).flatMap(([key,item])=>/href$/i.test(key)&&typeof item==='string'?[item]:collectHrefs(item)):[];
for(const lang of ['th','en']) {
  app.state.routePage='home';app.state.lang=lang;
  const home=app.renderVals();
  assert.equal(collectHrefs([home.navItems,home.sectionGroups]).some(directServiceLink),false,'Default Home keeps its inline flow rather than linking to dedicated service landing pages');
  assert.ok(home.sectionGroups.length>0,'Home content must remain available');
}
for(const file of ['src/visitor/home.html','src/visitor/template.html']) {
  assert.doesNotMatch(fs.readFileSync(file,'utf8'),/\bserviceLinks\b|href=["']\/(?:health|life)(?:[/?#"'])/,'Shared Home and footer templates must not add direct service-page entries');
}
for(const route of ['health','life']) for(const lang of ['th','en']) {
  app.state.routePage=route;app.state.lang=lang;
  const rendered=app.renderVals();
  const entries=Array.from(rendered.sectionGroups).flatMap(group=>Array.from(group.sections));
  assert.equal(rendered.isServicePage,true);
  assert.equal(entries.filter(section=>section.serviceContent).length,1,'Service content renders once within the ordered layout');
  assert.equal(entries.filter(section=>section.pageFooter).length,1,'Shared Footer renders once within the ordered layout');
  assert.ok(entries.every(section=>section.serviceContent||section.homeLicences||section.pageFooter),'Service routes can share licences and Footer but cannot render Home content sections');
}
app.state.routePage='health';app.state.lang='th';app.state.sel='service-content';
let view=app.renderVals();
assert.equal(view.headerHomeHref,'/');
assert.equal(view.footerPrivacyHref,'/#privacy');
assert.equal(view.contentSections[0].id,'service-content');
const before=JSON.stringify({home:app.state.site.sections,life:app.state.site.servicePages.life});
const field=view.contentFieldGroups.flatMap(group=>group.fields).find(field=>field.path==='servicePages.health.title.th');
assert.ok(field,'The canonical service title must be reachable through Content editor');
field.onInput({target:{value:'หัวข้อที่แก้จาก Editor'}});field.commit({target:{value:'หัวข้อที่แก้จาก Editor'}});
view=app.renderVals();
assert.equal(view.servicePage.copy.title,'หัวข้อที่แก้จาก Editor');
assert.equal(JSON.stringify({home:app.state.site.sections,life:app.state.site.servicePages.life}),before,'Editing Health cannot alter Home or Life');
const reopened=contract.sanitizeStateDoc({config:app.state.site,text:app.textOv},{repeatableIds:true});
assert.equal(projectServicePage(reopened.config,'health','th').copy.title,'หัวข้อที่แก้จาก Editor');
app.state.lang='en';view=app.renderVals();
assert.equal(view.servicePage.copy.title,state.config.servicePages.health.title.en);
assert.equal(view.servicePage.formHref,'/?lang=en#talk');
view.onSeoTitle({target:{value:'Health SEO edited'}});
assert.equal(app.state.site.servicePages.health.seoTitle.en,'Health SEO edited');
assert.equal(app.state.site.seo.title.en,state.config.seo.title.en,'Service SEO editing cannot overwrite Home metadata');
const fixtureArgument=process.argv.indexOf('--fixture');
if(fixtureArgument>=0) {
  const input=JSON.parse(fs.readFileSync(process.argv[fixtureArgument+1],'utf8'));
  const published=input.state||input,original=JSON.stringify(published);
  const normalized=contract.sanitizeStateDoc(published,{repeatableIds:true});
  const shell=fs.readFileSync('server/visitor-public.html','utf8');
  app.state.site=app.normalizeConfig(normalized.config,{repeatableIds:true});
  for(const page of ['health','life']) for(const lang of ['th','en']) {
    app.state.routePage=page;app.state.lang=lang;app.state.sel='service-content';
    const rendered=app.renderVals(),meta=servicePageMetadata(normalized.config,page,lang);
    assert.ok(rendered.servicePage.copy.title&&rendered.servicePage.copy.intro,'Captured published CMS must render actual service content');
    assert.ok(rendered.contentFieldGroups.flatMap(group=>group.fields).some(field=>field.path==='servicePages.'+page+'.title.'+lang),'Migrated service content remains editable');
    const model=createSeoModel(normalized.config,{path:'/'+page,lang});
    assert.equal(model.title,meta.title);assert.equal(model.meta.description,meta.description);assert.ok(model.meta.description);
    const html=renderPublicPage(shell,normalized.config,{path:'/'+page,lang,publishedState:published,siteId:'covermate'});
    const escaped=meta.title.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    assert.ok(html.includes('<title>'+escaped+'</title>'),'Server response carries the migrated localized SEO title');
    const snapshot=JSON.parse(html.match(/<script id="covermate-published-state" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(snapshot.state.config.cmsContentVersion,contract.CMS_CONTENT_VERSION);
    assert.equal(snapshot.state.config.servicePages[page].title[lang],rendered.servicePage.copy.title,'Server-seeded state and rendered/editor projection must agree');
  }
  assert.equal(JSON.stringify(published),original,'Captured published state is read-only');
  console.log('PASS captured published CMS replay: localized content, editable fields, SEO head and server-seeded state.');
}
console.log('PASS Health/Life TH+EN routes, owner page selection, publication-aware links, CMS clear/edit/reopen, locale and unrelated-page isolation, metadata ownership, shared rendered projection.');
