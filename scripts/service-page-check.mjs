import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as contract from '../covermate-contract.js';
import {projectServicePage, servicePageMetadata} from '../src/visitor/service-page.mjs';
import {buildVisitorRuntime} from './lib/visitor-source.mjs';
import {resolveStaticFileCandidates} from './lib/static-server.mjs';

const defaults=JSON.parse(vm.runInNewContext(fs.readFileSync('src/visitor/defaults.js','utf8')+'\nJSON.stringify(DEFAULTS)'));
const source=JSON.stringify(defaults);
const state=contract.sanitizeStateDoc({config:defaults,text:{}},{repeatableIds:true});
assert.equal(JSON.stringify(defaults),source,'Service defaults must not mutate the stored input');
assert.deepEqual(contract.sanitizeStateDoc(state,{repeatableIds:true}),state,'Service CMS normalization is idempotent');
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
app.state.routePage='health';app.state.lang='th';app.state.sel='service-content';
let view=app.renderVals();
assert.equal(view.isServicePage,true);
assert.equal(view.sectionGroups.length,0,'Service routes cannot render the Home sections');
assert.equal(view.homeLicenceSections.length,0);
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
console.log('PASS Health/Life TH+EN routes, owner page selection, publication-aware links, CMS clear/edit/reopen, locale and unrelated-page isolation, metadata ownership, shared rendered projection.');
