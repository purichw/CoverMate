import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import * as model from '../covermate-calculator.mjs';
import { buildVisitorRuntime } from './lib/visitor-source.mjs';
import { importCoverMateContract } from './lib/contract-loader.mjs';

const timers=new Map();let timerId=0;
const memory=new Map();
const sandbox={console,URL,URLSearchParams,
  setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),
  window:{innerWidth:1440,location:{pathname:'/',search:'',origin:'http://localhost',href:'http://localhost/'},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},sessionStorage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)}},
  document:{querySelector:()=>null,querySelectorAll:()=>[],documentElement:{setAttribute(){},removeAttribute(){}},body:null},
  DCLogic:class{setState(value,callback){Object.assign(this.state,typeof value==='function'?value(this.state):value);callback?.();}}
};
vm.runInNewContext(buildVisitorRuntime()+'\nthis.Component=Component;',sandbox);
const app=new sandbox.Component();
app.readJSON=()=>null;app.writeJSON=()=>{};app.queueRemoteDraft=()=>{};app.textOv={};
app.state.site=app.normalizeConfig(app.state.site,{repeatableIds:true});
const before=JSON.stringify(app.state.site);
const flush=()=>{for(const [id,fn] of [...timers]){timers.delete(id);fn();}};
let values=app.renderVals();assert.equal(values.calculatorResult,'ข้อมูลยังไม่พอ');
const enter=(mode,inputs)=>{for(const [key,value] of Object.entries(inputs))app.updateCalculatorInput(mode,key,String(value));flush();};
enter('life',{monthlyNeed:50000,otherMonthlyIncome:20000,yearsToSupport:10,existingLifeCover:0});
assert.equal(app.renderVals().calculatorResult,'฿3,600,000');
app.updateCalculatorInput('life','monthlyNeed','60000');
assert.equal(app.renderVals().calculatorPending,true);assert.equal(app.renderVals().calculatorResult,'฿3,600,000','Result waits for debounce');
flush();assert.equal(app.renderVals().calculatorResult,'฿4,800,000');
app.state.calculatorMode='ci';assert.equal(app.renderVals().calculatorResult,'ข้อมูลยังไม่พอ','CI spending is independent');
enter('ci',{monthlyRecoveryNeed:50000,otherSupportIncome:0,recoveryMonths:6,existingCriticalIllnessCover:0});
assert.equal(app.renderVals().calculatorResult,'฿300,000');
app.updateCalculatorInput('ci','recoveryMonths','12');flush();assert.equal(app.renderVals().calculatorResult,'฿600,000');
app.resetCalculator('ci');assert.equal(app.renderVals().calculatorResult,'ข้อมูลยังไม่พอ');
app.state.calculatorMode='life';assert.equal(app.renderVals().calculatorResult,'฿4,800,000','Reset affects only selected tab');
app.renderVals().continueCalculator({preventDefault(){assert.fail('Valid CTA should proceed');}});
assert.equal(app.state.shareCalculator,true);assert.equal(app.state.form.consent,false);
assert.equal(app.state.calculatorSnapshot.inputs.monthlyNeed,60000);
app.updateCalculatorInput('life','monthlyNeed','70000');flush();
assert.equal(app.state.calculatorSnapshot.inputs.monthlyNeed,60000,'Snapshot cannot change silently after CTA');
assert.equal(app.renderVals().summary.includes('70,000'),false);
app.renderVals().onShareCalculator({target:{checked:false}});assert.equal(app.renderVals().summary.includes('60,000'),false);
app.updateCalculatorInput('life','monthlyNeed','');flush();assert.equal(app.renderVals().calculatorReady,false);
let prevented=false;app.renderVals().continueCalculator({preventDefault(){prevented=true;}});assert.equal(prevented,true);
assert.equal(JSON.stringify(app.state.site),before,'Input and rendering never mutate CMS');
assert.equal(memory.size,0,'No financial storage without opt-in');
app.renderVals().toggleCalculatorRemember({target:{checked:true}});
const saved=JSON.parse(memory.get('covermate.needsCalculator.v2'));
assert.equal('form' in saved,false);assert.equal('profile' in saved,false);assert.equal('calculatorSnapshot' in saved,false);
const restored=new sandbox.Component();restored.restoreCalculatorSession();
assert.equal(restored.state.calculatorInputs.life.existingLifeCover,'0');assert.equal(restored.state.calculatorRemember,true);
app.renderVals().toggleCalculatorRemember({target:{checked:false}});assert.equal(memory.size,0);
app.state.site.calculatorDesign.monthlyNeed.th='Custom CMS label';
app.state.site.calculatorDesign.lifeIcon='';
app.state.site.calculatorDesign.photo='';
assert.equal(app.renderVals().calculatorFieldsView[0].label,'Custom CMS label');
assert.equal(app.renderVals().calculatorPhoto,'');
app.state.routePage='motor';assert.equal(app.renderVals().sections.some(s=>s.isFit),false);
const contract=await importCoverMateContract();
const slots=contract.cmsImageSlots(app.state.site);
assert.ok(slots.some(slot=>JSON.stringify(slot).includes('calculatorDesign.photo')));
assert.deepEqual([slots.find(s=>s.path==='calculatorDesign.photo').width,slots.find(s=>s.path==='calculatorDesign.photo').height],[800,600]);
assert.deepEqual([slots.find(s=>s.path==='calculatorDesign.monthlyNeedIcon').width,slots.find(s=>s.path==='calculatorDesign.monthlyNeedIcon').height],[512,512]);
console.log('PASS debounced shared component, tab isolation/reset, CMS ownership, Home-only scope and explicit snapshot attachment');

// Run the actual endpoint body with local dependency doubles. No server or credentials.
const require=createRequire(import.meta.url),records=[];
const db={collection:name=>({doc:id=>({id,path:name+'/'+id,get:async()=>({exists:false})})}),runTransaction:async fn=>fn({get:async()=>({exists:false,data:()=>({})}),set(){},create:(ref,data)=>records.push({ref,data})})};
const fakeRequire=name=>{
  if(name==='node:crypto')return require(name);
  if(name==='firebase-admin/app-check')return {getAppCheck:()=>({})};
  if(name==='firebase-admin/firestore')return {FieldValue:{serverTimestamp:()=>123},Timestamp:{fromMillis:value=>value}};
  if(name==='../server/firebase.cjs')return {serverApp:()=>({}),serverDb:()=>db,isEmulator:()=>true};
  if(name==='../server/enquiry-privacy.cjs')return {verifyReceipt:async()=>({noticeVersion:'calculator-test-only'})};
  if(name==='../server/cases-service.cjs')return {websiteRecord:()=>({caseNumber:'CM-CALCULATOR-TEST'}),stageWebsiteCreate(){}};
  if(name==='../server/http.cjs')return {readBody:async req=>req.body,json:(_res,status,body)=>({status,body}),error:(status,code,message)=>Object.assign(new Error(message),{status,code}),reportFailure:()=>assert.fail('Unexpected server error')};
  throw new Error('Unexpected dependency '+name);
};
const scope={require:fakeRequire,module:{exports:{}},process:{env:{}},testImport:async name=>name.includes('calculator')?model:{resolveCoverMateEnvironment:()=>({isUat:true,name:'uat',leadCollection:'local-only'})}};
vm.runInNewContext(fs.readFileSync('api/leads.js','utf8').replaceAll('await import(','await testImport('),scope);
const snapshot=model.createNeedsSnapshot('life',{...model.needsInitialInputs('life'),monthlyNeed:50000,otherMonthlyIncome:20000,yearsToSupport:10,existingLifeCover:0},{},'th');
const base={consent:true,consentKind:'consultation',noticeVersion:'calculator-test-only',name:'Local test',contact:'@test',topic:'',summary:'Local only',sourcePath:'/',qtype:'',coverage:'',language:'th'};
const call=body=>scope.module.exports({method:'POST',headers:{'idempotency-key':'12345678-1234-4123-8123-123456789abc'},body}, {setHeader(){}});
assert.equal((await call({...base,calculator:{...snapshot,result:{shortfall:1},extra:'discard'}})).status,200);
assert.equal(records[0].data.calculator.result.shortfall,3600000);
assert.equal('extra' in records[0].data.calculator,false);
assert.equal((await call(base)).status,200);assert.equal('calculator' in records[1].data,false);
assert.equal((await call({...base,consent:false,calculator:snapshot})).status,422);
assert.equal((await call({...base,calculator:{...snapshot,inputs:{monthlyNeed:'bad'}}})).status,422);
assert.equal(records.length,2,'Invalid or nonconsensual summaries are not stored');
const partial=model.createNeedsSnapshot('life',{...snapshot.inputs,existingLifeCover:'unknown'},{},'en');
assert.equal((await call({...base,calculator:partial})).status,200);
assert.equal(records[2].data.calculator.result.shortfall,null);
const pa={accidentDeathTarget:1000000,existingAccidentDeath:500000,accidentMedicalTarget:50000,existingAccidentMedical:0,accidentMonthlyNeed:30000,accidentContinuingIncome:10000,accidentRecoveryMonths:6,existingAccidentIncome:0};
const planning=model.createNeedsSnapshot('life',snapshot.inputs,{},'th',undefined,{profile:{...model.needsInitialProfile(),age:35,paInterest:'yes'},pa});
assert.equal((await call({...base,calculator:{...planning,pa:{...planning.pa,result:{deathGap:1}}}})).status,200);
assert.equal(records[3].data.calculator.pa.result.deathGap,500000);
assert.equal((await call({...base,calculator:{...planning,profile:{...planning.profile,age:999}}})).status,422);
console.log('PASS lead endpoint recalculation, whitelisting, opt-out, invalid input and consent boundary with local-only doubles');
