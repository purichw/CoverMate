import assert from 'node:assert/strict';
import vm from 'node:vm';
import { buildVisitorRuntime } from './lib/visitor-source.mjs';
import contract from '../covermate-contract.js';
import {homeArticleFixture} from './fixtures/home-articles/feed.mjs';

const sandbox={console,URL,URLSearchParams,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:fn=>fn(),
  window:{CoverMateContract:contract,innerWidth:1440,location:{pathname:'/',search:'',origin:'http://localhost',href:'http://localhost/'},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}},
  document:{querySelector:()=>null,querySelectorAll:()=>[],documentElement:{setAttribute(){},removeAttribute(){}},body:null},
  DCLogic:class{setState(value,callback){Object.assign(this.state,typeof value==='function'?value(this.state):value);callback?.();}}
};
vm.runInNewContext(buildVisitorRuntime()+'\nthis.Component=Component;',sandbox);
const app=new sandbox.Component();
app.readJSON=()=>null;app.writeJSON=()=>{};app.queueRemoteDraft=()=>{};app.textOv={};
app.state.site=app.normalizeConfig(app.state.site,{repeatableIds:true});
app.state.articleFeed=structuredClone(homeArticleFixture);
const ids=list=>Array.from(list,item=>item.id);
const values=()=>app.renderVals();
const row=id=>values().secList.find(item=>item.id===id);
const section=id=>app.state.site.sections.find(item=>item.id===id);
const renderOrder=()=>Array.from(values().sectionGroups).flatMap(group=>ids(group.sections));
const configBefore=JSON.stringify(app.state.site);
let view=values();
const defaultOrder=ids(app.state.site.sections);
defaultOrder.splice(defaultOrder.indexOf('talk'),0,'articles');
assert.deepEqual(ids(view.secList),[...defaultOrder,'licences','footer']);
assert.equal(row('articles').canMove,true,'Home articles is a movable presentation section');
assert.equal(section('articles'),undefined,'Article ordering must not duplicate repository content in CMS sections');
assert.equal(JSON.stringify(app.state.site),configBefore,'Presentation cannot migrate or rewrite owner data');
assert.equal(row('insurers').sub,'#motor');
assert.equal(row('insurers').summary.includes('cards'),false);
assert.ok(view.secList.every(item=>item.canToggle && item.canMove),'Every row uses functional shared controls');
assert.equal(view.secList[0].first,true);
assert.equal(view.secList.at(-1).last,true,'Only the final row is the lower move boundary');
assert.equal(row('tiers').hasCols,false,'No unused table-width control');
for(const id of ['articles','licences','footer']) {
  row(id).toggle();assert.equal(row(id).on,false);assert.equal(renderOrder().includes(id),false,id+' hides in the public projection');
  row(id).toggle();assert.equal(row(id).on,true);assert.equal(renderOrder().includes(id),true,id+' restores in the public projection');
}
row('licences').up();assert.ok(renderOrder().indexOf('licences')<renderOrder().indexOf('talk'));
row('licences').down();
row('footer').up();assert.ok(renderOrder().indexOf('footer')<renderOrder().indexOf('licences'));
row('footer').down();

row('insurers').pick();
assert.equal(values().editCards.length,0,'Logo editor no longer mixes licence cards into the grid');
assert.ok(values().editItems.length>0);
row('licences').pick();
view=values();
assert.equal(view.curId,'licences');
assert.equal(view.editItems.length,0);
assert.equal(view.editCards.length,section('insurers').cards.length);
view.goContent();assert.equal(values().curId,'licences','Content tab retains the presentation selection');
const cardId=view.editCards[0].id;
view.editCards[0].fields.find(field=>field.key==='title').onInput({target:{value:'Local licence edit'}});
assert.equal(section('insurers').cards.find(card=>card.id===cardId).th.title,'Local licence edit');
assert.equal(section('licences'),undefined,'Licence band never becomes duplicated CMS data');
row('insurers').toggle();
assert.equal(row('licences').on,true,'Logo grid does not own licence visibility');
assert.equal(renderOrder().includes('licences'),true,'Licence band remains visible without insurer logos');
row('insurers').toggle();

row('cover').pick();
values().editFields.find(field=>field.key==='ui.coverageLabel').onInput({target:{value:'Local coverage heading'}});
assert.equal(app.state.site.ui.coverageLabel.th,'Local coverage heading');
const homeOrder=ids(app.state.site.sections);
row('talk').up();
assert.deepEqual(ids(app.state.site.sections),homeOrder,'Moving past virtual Articles preserves the other section order');
assert.ok(ids(values().secList).indexOf('talk')<ids(values().secList).indexOf('articles'));
assert.deepEqual(ids(values().secList.filter(item=>item.on)),renderOrder());
row('talk').down();
assert.deepEqual(ids(app.state.site.sections),homeOrder);

app.state.routePage='motor';
// A saved route subset must not acquire local sections omitted by the owner.
app.state.site.motorPage.sections=['motor','insurers','tiers','talk'];
view=values();
assert.deepEqual(ids(view.secList),['motor','insurers','tiers','talk','licences','footer']);
assert.equal(row('insurers').sub,'#insurers');
const motorOrder=Array.from(app.state.site.motorPage.sections);
row('tiers').up();
assert.deepEqual(Array.from(app.state.site.motorPage.sections),['motor','tiers','insurers','talk']);
assert.deepEqual(ids(app.state.site.sections),homeOrder,'Motor reorder cannot reorder Home');
row('tiers').down();assert.deepEqual(Array.from(app.state.site.motorPage.sections),motorOrder);
row('licences').pick();view=values();
const life=JSON.stringify(section('insurers').cards.filter(card=>card.licenceRole!=='broker'));
assert.equal(view.editCards.length,section('insurers').cards.filter(card=>card.licenceRole==='broker').length);
assert.ok(view.editCards.every(card=>card.licenceRole==='broker'));
view.editCards[0].fields.find(field=>field.key==='title').onInput({target:{value:'Local broker edit'}});
view.addCard();
assert.equal(section('insurers').cards.at(-1).licenceRole,'broker');
view=values();view.editCards.at(-1).up();
assert.equal(JSON.stringify(section('insurers').cards.filter(card=>card.licenceRole!=='broker')),life);
assert.ok(values().sectionGroups.flatMap(group=>group.sections).find(entry=>entry.id==='licences').licence.cards.every(card=>card.licenceRole==='broker'));
const footerBefore=app.state.site.footer.show;row('footer').toggle();
assert.equal(values().showFooter,!footerBefore);row('footer').toggle();
assert.equal(values().showFooter,footerBefore);
const homeLayout=JSON.stringify(app.state.site.pageLayout.home),motorLayout=JSON.stringify(app.state.site.pageLayout.motor);
for(const route of ['health','life']) {
  app.state.routePage=route;
  assert.deepEqual(ids(values().secList),['service-content','footer']);
  assert.ok(values().secList.every(item=>item.canMove&&item.canToggle));
  row('service-content').toggle();assert.deepEqual(renderOrder(),['footer']);
  row('service-content').down();row('service-content').toggle();
  assert.deepEqual(renderOrder(),['footer','service-content']);
}
assert.equal(JSON.stringify(app.state.site.pageLayout.home),homeLayout);
assert.equal(JSON.stringify(app.state.site.pageLayout.motor),motorLayout);
console.log('PASS shared Admin/public order and visibility, canonical editors, hidden recovery, independent licences and Home/Motor/Health/Life isolation. No network or remote writes.');
