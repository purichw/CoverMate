import assert from 'node:assert/strict';
import vm from 'node:vm';
import { buildVisitorRuntime } from './lib/visitor-source.mjs';

const sandbox={console,URL,URLSearchParams,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:fn=>fn(),
  window:{innerWidth:1440,location:{pathname:'/',search:'',origin:'http://localhost',href:'http://localhost/'},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}},
  document:{querySelector:()=>null,querySelectorAll:()=>[],documentElement:{setAttribute(){},removeAttribute(){}},body:null},
  DCLogic:class{setState(value,callback){Object.assign(this.state,typeof value==='function'?value(this.state):value);callback?.();}}
};
vm.runInNewContext(buildVisitorRuntime()+'\nthis.Component=Component;',sandbox);
const app=new sandbox.Component();
app.readJSON=()=>null;app.writeJSON=()=>{};app.queueRemoteDraft=()=>{};app.textOv={};
app.state.site=app.normalizeConfig(app.state.site,{repeatableIds:true});
const ids=list=>Array.from(list,item=>item.id);
const values=()=>app.renderVals();
const row=id=>values().secList.find(item=>item.id===id);
const section=id=>app.state.site.sections.find(item=>item.id===id);
const configBefore=JSON.stringify(app.state.site);
let view=values();
assert.deepEqual(ids(view.secList),[...ids(app.state.site.sections),'licences','footer']);
assert.equal(JSON.stringify(app.state.site),configBefore,'Presentation cannot migrate or rewrite owner data');
assert.equal(row('insurers').sub,'#motor');
assert.equal(row('insurers').summary.includes('cards'),false);
assert.equal(row('licences').canToggle,false,'No false independent licence visibility switch');
assert.equal(row('licences').canMove,false);
row('licences').up();row('licences').toggle();
assert.equal(JSON.stringify(app.state.site),configBefore,'Fixed controls are guarded in logic too');
assert.equal(view.secList[0].first,true);
assert.equal(view.secList.at(-3).last,true,'Last movable section cannot swap with a fixed band');
assert.equal(row('tiers').hasCols,false,'No unused table-width control');

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
assert.equal(row('licences').on,false);
assert.equal(values().homeLicenceSections.length,0);
row('insurers').toggle();

row('cover').pick();
values().editFields.find(field=>field.key==='ui.coverageLabel').onInput({target:{value:'Local coverage heading'}});
assert.equal(app.state.site.ui.coverageLabel.th,'Local coverage heading');
const homeOrder=ids(app.state.site.sections);
row('talk').up();
assert.notDeepEqual(ids(app.state.site.sections),homeOrder);
assert.deepEqual(ids(values().secList.filter(item=>item.canMove&&item.on)),ids(values().sections));
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
assert.ok(values().homeLicenceSections[0].cards.every(card=>card.licenceRole==='broker'));
const footerBefore=app.state.site.footer.show;row('footer').toggle();
assert.equal(values().showFooter,!footerBefore);row('footer').toggle();
assert.equal(values().showFooter,footerBefore);
console.log('PASS Admin/public order parity, fixed bands, canonical editors, hidden recovery and Motor/Home isolation. No network or remote writes.');
