import assert from 'node:assert/strict';
import {calculateNeeds,needsInitialInputs,needsInitialProfile,createNeedsSnapshot,sanitizeNeedsSnapshot,parseNeedsNumber,sanitizeNeedsProfile} from '../covermate-calculator.mjs';
import {createProductDraft,productReviewIssues,reviewProduct,needsProductApproved,matchNeedsProducts,reviewNeedsReference,needsReferenceApproved,validateNeedsCatalog,validateNeedsReferences} from '../covermate-recommendations.mjs';

let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const life={...needsInitialInputs('life'),monthlyNeed:50000,otherMonthlyIncome:20000,yearsToSupport:10,debtToClear:1000000,extraLumpSum:500000,earmarkedAssets:300000,existingLifeCover:0};
const ci={...needsInitialInputs('ci'),monthlyRecoveryNeed:50000,otherSupportIncome:20000,recoveryMonths:12,existingCriticalIllnessCover:0};
const health={...needsInitialInputs('health'),publicHealthScheme:'sso',careSetting:'private',existingHealthStructure:'annual',existingAnnualLimit:1000000,targetAnnualLimit:5000000,roomReference:'custom',customRoomDaily:6000,roomBenefit:3000,costSharing:'none',ownPayBudget:30000,opdPreference:'no',territory:'thailand'};
const pa={accidentDeathTarget:1000000,existingAccidentDeath:500000,accidentMedicalTarget:50000,existingAccidentMedical:10000,accidentMonthlyNeed:30000,accidentContinuingIncome:10000,accidentRecoveryMonths:6,existingAccidentIncome:50000};
const now=new Date('2026-09-23T12:00:00.000Z');
test('Initial values do not impersonate personal answers',()=>{
  for(const mode of ['life','ci','health','pa'])assert.equal(calculateNeeds(mode,needsInitialInputs(mode)).ready,false);
});
test('Exact Life example and zero/debt-only cases',()=>{
  assert.equal(calculateNeeds('life',life).shortfall,4800000);
  assert.equal(calculateNeeds('life',{...life,extraLumpSum:500001}).shortfall,4800001);
  assert.equal(calculateNeeds('life',{...life,monthlyNeed:0}).shortfall,1200000);
  assert.equal(calculateNeeds('life',{...life,earmarkedAssets:90000000}).shortfall,0);
  assert.equal(calculateNeeds('life',{...life,otherMonthlyIncome:60000}).shortfall,1200000);
});
test('Unknown, blank and no existing insurance stay distinct',()=>{
  const unknown=calculateNeeds('life',{...life,existingLifeCover:'unknown'});
  assert.equal(unknown.shortfall,null);assert.equal(unknown.provisionalGap,4800000);assert.equal(unknown.calculationStatus,'partial');assert.equal(unknown.ready,true);
  assert.equal(calculateNeeds('life',{...life,existingLifeCover:''}).ready,false);
  assert.equal(calculateNeeds('life',{...life,existingLifeCover:0}).complete,true);
});
test('No silent negative/decimal/period coercion or overflow',()=>{
  for(const value of ['-1','1.5','Infinity','1e5','99999999999999999999','<script>'])assert.equal(parseNeedsNumber(value).invalid,true);
  assert.equal(parseNeedsNumber('๕๐,๐๐๐').value,50000);
  assert.equal(calculateNeeds('life',{...life,yearsToSupport:0}).ready,false);
  assert.equal(calculateNeeds('life',{...life,yearsToSupport:61}).ready,false);
  assert.equal(calculateNeeds('life',{...life,monthlyNeed:Number.MAX_SAFE_INTEGER}).ready,false);
  assert.equal(calculateNeeds('life',{...life,yearsToSupport:Number.MAX_SAFE_INTEGER,valuation:'presentValue'}).ready,false);
});
test('Explicit present value has deterministic assumptions and no plan rounding',()=>{
  assert.equal(calculateNeeds('life',{...life,valuation:'presentValue',inflationPercent:0,returnPercent:0}).shortfall,4800000);
  assert.equal(calculateNeeds('life',{...life,valuation:'presentValue',inflationPercent:3,returnPercent:3}).shortfall,4800000);
  const result=calculateNeeds('life',{...life,valuation:'presentValue',inflationPercent:3,returnPercent:0,yearsToSupport:2});
  assert.equal(result.supportCost,730800);assert.ok(result.notes.includes('valuationNote'));
  assert.equal(calculateNeeds('life',{...life,valuation:'presentValue',inflationPercent:21,returnPercent:0}).ready,false);
});
test('CI separates chosen medical OOP from recovery and preserves unknown',()=>{
  assert.equal(calculateNeeds('ci',ci).shortfall,360000);
  assert.equal(calculateNeeds('ci',{...ci,medicalOOPBuffer:50000,extraRecoveryBudget:100000,availableEmergencyFunds:30000}).shortfall,480000);
  assert.equal(calculateNeeds('ci',{...ci,existingCriticalIllnessCover:'unknown'}).shortfall,null);
  assert.equal(calculateNeeds('ci',{...ci,healthLimit:9000000}).shortfall,360000);
});
test('Health uses comparable dimensions and never converts public/employer rights to money',()=>{
  const result=calculateNeeds('health',health);assert.equal(result.annualGap,4000000);assert.equal(result.roomGap,3000);
  assert.equal(calculateNeeds('health',{...health,employerCover:'yes',employerLimit:99999999}).annualGap,4000000);
  assert.equal(calculateNeeds('health',{...health,existingHealthStructure:'itemized'}).annualGap,null);
  assert.equal(calculateNeeds('health',{...health,existingHealthStructure:'unknown'}).annualGap,null);
  assert.equal(calculateNeeds('health',{...health,targetAnnualLimit:'unknown'}).annualGap,null);
  assert.equal(calculateNeeds('health',{...health,targetAnnualLimit:''}).annualGap,null);
  const blankSnapshot=createNeedsSnapshot('health',{...health,targetAnnualLimit:''});
  assert.equal(blankSnapshot.inputs.targetAnnualLimit,null);assert.deepEqual(sanitizeNeedsSnapshot(blankSnapshot),blankSnapshot);
  assert.equal(calculateNeeds('health',{...health,existingHealthStructure:'none'}).annualGap,5000000);
  assert.equal(calculateNeeds('health',{...health,ownPayBudget:3000000}).roomGap,3000);
});
test('Scenario own payment is conditional on known inputs and units',()=>{
  const scenario={...health,costSharing:'both',deductibleAmount:10000,copayPercent:20,stressEnabled:'yes',scenarioEligibleCost:100000,scenarioRemainingLimit:60000};
  const result=calculateNeeds('health',scenario);assert.equal(result.scenarioOwnPay,40000);assert.equal(result.scenarioBudgetGap,10000);
  assert.equal(calculateNeeds('health',{...scenario,scenarioRemainingLimit:'unknown'}).scenarioOwnPay,null);
  assert.equal(calculateNeeds('health',{...scenario,copayPercent:101}).ready,false);
});
test('PA outputs remain separate, with unknown and overflow protection',()=>{
  const r=calculateNeeds('pa',pa);assert.deepEqual([r.deathGap,r.medicalGap,r.incomeGap],[500000,40000,70000]);
  assert.equal(calculateNeeds('pa',{...pa,existingAccidentDeath:'unknown'}).deathGap,null);
  assert.equal(calculateNeeds('pa',{...pa,accidentMonthlyNeed:Number.MAX_SAFE_INTEGER}).ready,false);
});
test('Partial snapshots recompute on the server and reject missing data',()=>{
  const snapshot=createNeedsSnapshot('life',{...life,existingLifeCover:'unknown'},{},'en',now.toISOString());
  assert.equal(snapshot.result.shortfall,null);
  assert.deepEqual(sanitizeNeedsSnapshot({...snapshot,result:{shortfall:1},extra:'discard'}),snapshot);
  assert.throws(()=>sanitizeNeedsSnapshot({...snapshot,inputs:{...snapshot.inputs,existingLifeCover:null}}));
  assert.throws(()=>sanitizeNeedsSnapshot({...snapshot,inputs:{...snapshot.inputs,yearsToSupport:10000}}));
});
test('Profile and PA are whitelisted, consent handoff does not contain recommendation claims',()=>{
  const profile={...needsInitialProfile(),paInterest:'yes',age:'35',privateNote:'do not copy'};
  const snapshot=createNeedsSnapshot('life',life,{},'th',now.toISOString(),{profile,pa});
  assert.equal(snapshot.profile.age,35);assert.equal('privateNote' in snapshot.profile,false);assert.equal('candidates' in snapshot,false);
  assert.deepEqual(sanitizeNeedsSnapshot({...snapshot,pa:{...snapshot.pa,result:{deathGap:99999999}}}),snapshot);
  assert.throws(()=>sanitizeNeedsProfile({...profile,age:101}));
});
test('V1 open-tab submissions still accepted and recalculated',()=>{
  const old={version:'home-needs-v1',calculatorType:'life',inputs:life,result:{shortfall:0},source:'home_needs_calculator',pagePath:'/',timestamp:now.toISOString(),language:'th'};
  assert.equal(sanitizeNeedsSnapshot(old).result.shortfall,4800000);
});

// Fictional names are restricted to this test fixture, never seeded into CMS.
const draft={...createProductDraft('local-fixture'),benefitBasis:'all-cause-death',name:{th:'Local test only',en:'Local test only'},salesStatus:'active',distributionAuthorized:true,
  source:{url:'https://www.aia.co.th/test-fixture',version:'fixture-only',verifiedAt:'2026-09-23',validUntil:'2026-10-23'},
  eligibility:{minAge:18,maxAge:60,occupationClasses:['class1'],compatibleBasePolicies:[],residences:['thailand'],maxIncomeMultiple:null},
  plans:[{cover:5000000,premiumMonthly:null,horizonYears:20}]};
const profile={...needsInitialProfile(),age:35,occupationClass:'class1',residence:'thailand',horizonYears:10,monthlyBudget:3000};
const catalog=products=>({version:'aia-candidates-v1',products});
const run=(products,overrides={})=>matchNeedsProducts({domain:'life',result:calculateNeeds('life',life),profile,catalog:catalog(products),now,...overrides});
test('Product drafts are never automatic candidates',()=>{assert.equal(run([draft]).candidates.length,0);assert.equal(run([]).status,'awaitingCatalog');assert.equal(needsProductApproved(createProductDraft('empty'),now),false);});
test('Approval requires sources, eligibility, benefit bands and owner identity',()=>{
  assert.deepEqual(productReviewIssues(draft,now),[]);assert.throws(()=>reviewProduct(draft,'',now));
  assert.throws(()=>reviewProduct({...draft,source:{...draft.source,url:'https://example.com'}},'owner',now));
  assert.throws(()=>reviewProduct({...draft,eligibility:{...draft.eligibility,minAge:null}},'owner',now));
});
const approved=reviewProduct(draft,'local-test-owner',now);
test('Approved matches explain mechanism/fit while keeping need unrounded',()=>{
  const match=run([approved]);assert.equal(match.candidates.length,1);assert.equal(match.candidates[0].plan.cover,5000000);assert.equal(match.candidates[0].excess,200000);assert.equal(match.candidates[0].budgetStatus,'budgetUnknown');
});
test('An edit, expiry, closure or unauthorized channel invalidates approval',()=>{
  for(const changed of [{...approved,name:{...approved.name,th:'Changed'}},{...approved,salesStatus:'inactive'},{...approved,distributionAuthorized:false}])assert.equal(run([changed]).candidates.length,0);
  assert.equal(run([approved],{now:new Date('2026-11-01')}).candidates.length,0);
});
test('Hard filters exclude, unknown eligibility is never eligible',()=>{
  assert.equal(run([approved],{profile:{...profile,age:61}}).excluded[0].reasons[0],'age');
  assert.equal(run([approved],{profile:{...profile,age:'unknown'}}).status,'needsInformation');
  assert.equal(run([approved],{result:calculateNeeds('life',{...life,existingLifeCover:'unknown'})}).candidates.length,0);
  const rider=reviewProduct({...draft,type:'rider',eligibility:{...draft.eligibility,compatibleBasePolicies:['BASE-TEST']}},'owner',now);
  assert.equal(run([rider],{profile:{...profile,basePolicy:'yes'}}).status,'needsInformation');
  assert.equal(run([rider],{profile:{...profile,basePolicy:'yes'},basePolicyId:'BASE-TEST'}).candidates.length,1);
});
test('Health matching uses total target, not only the additive delta',()=>{
  const p=reviewProduct({...draft,domain:'health',benefitBasis:'annual-medical',plans:[{annualLimit:4000000,roomPerDay:6000,deductible:0,copayPercent:0,structure:'annual',territory:'thailand',opd:false,horizonYears:20,premiumMonthly:null}]},'owner',now);
  assert.equal(run([p],{domain:'health',result:calculateNeeds('health',health)}).candidates.length,0);
});
test('Hospital catalog needs dated approval; edits and stale records fail closed',()=>{
  const ref={id:'local-room',name:{th:'Local fixture',en:'Local fixture'},daily:6000,sourceUrl:'https://hospital.example/reference',lastChecked:'2026-09-23',validUntil:'2026-10-23'};
  const checked=reviewNeedsReference(ref,'owner',now);assert.equal(needsReferenceApproved(checked,now),true);
  assert.equal(needsReferenceApproved({...checked,daily:7000},now),false);assert.equal(needsReferenceApproved(checked,new Date('2026-11-01')),false);
  assert.throws(()=>reviewNeedsReference({...ref,lastChecked:'2026-02-30'},'owner',now));
  assert.throws(()=>validateNeedsReferences([ref,ref]));assert.throws(()=>validateNeedsCatalog(catalog([draft,draft])));
});
console.log(`${checks} needs-v2 model/catalog checks passed; no external writes.`);
