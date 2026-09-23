import assert from "node:assert/strict";
import vm from "node:vm";
import { calculateNeeds, needsInitialInputs, parseNeedsNumber, createNeedsSnapshot, sanitizeNeedsSnapshot } from '../covermate-calculator.mjs';

import { importCoverMateContract } from "./lib/contract-loader.mjs";
import {
  buildVisitorRuntime,
  buildVisitorTemplate
} from "./lib/visitor-source.mjs";

const {
  DEFAULT_NEEDS_CALCULATOR,
  sanitizeMotorCountConfig
} = await importCoverMateContract();

function extractDefaults(scriptSource) {
  const defaultsEnd = scriptSource.indexOf("const SCHEMA =");
  assert.notEqual(defaultsEnd, -1, "DEFAULTS boundary exists");
  const sandbox = {};
  vm.runInNewContext(`${scriptSource.slice(0, defaultsEnd)}\nthis.DEFAULTS = DEFAULTS;`, sandbox);
  return sandbox.DEFAULTS;
}

const template = buildVisitorTemplate();
const scriptSource = buildVisitorRuntime();
const defaults = extractDefaults(scriptSource);
const fit = defaults.sections.find((section) => section && section.id === "fit");

// Runtime, seed and server normalization must use the same fallback dataset.
const fallbackStart = scriptSource.indexOf('const DEFAULT_NEEDS_CALCULATOR =');
const fallbackEnd = scriptSource.indexOf('const ACCENTS', fallbackStart);
const fallback = vm.runInNewContext(
  scriptSource.slice(fallbackStart, fallbackEnd) + '; DEFAULT_NEEDS_CALCULATOR',
  { DEFAULTS: defaults }
);
assert.deepEqual(JSON.parse(JSON.stringify(fallback)), JSON.parse(JSON.stringify(fit.calculator)), 'Runtime fallback matches the canonical seed');
assert.deepEqual(JSON.parse(JSON.stringify(fallback)), DEFAULT_NEEDS_CALCULATOR, 'Runtime and server fallback datasets stay aligned');
const originalTransitionCost = fit.calculator.life.transitionFinalCosts;
fallback.life.transitionFinalCosts = -1;
assert.equal(fit.calculator.life.transitionFinalCosts, originalTransitionCost, 'Fallback updates cannot mutate embedded defaults');

assert.ok(fit, "fit section exists");
assert.ok(fit.calculator, "fit section has calculator payload");
assert.equal(fit.calculator.datasetVersion, "2026-08-15-v0.1", "calculator dataset version is current");
assert.equal(fit.calculator.health.selectedRoomReference.totalFixedDaily, 10550, "BNH room reference total is present");
assert.equal(fit.calculator.health.selectedRoomReference.confidenceLevel, "A", "room reference keeps confidence level");
assert.equal(fit.calculator.health.selectedRoomReference.sourceUrl, "https://www.bnhhospital.com/th/the-bnh-wards/", "room reference keeps source URL");
assert.equal(fit.calculator.health.selectedRoomReference.lastChecked, "2026-08-15", "room reference keeps last checked date");
assert.equal(fit.calculator.situations.start.th, "เพิ่งเริ่มทำงาน", "default calculator situations are part of the data payload");
assert.ok(fit.calculator.situations.start.recs.length >= 3, "default situation recommendations are data-driven payload");

assert.ok(!/mult\s*:/.test(scriptSource), "old salary multiplier property is absent from runtime");
assert.ok(!/dependency multiplier/i.test(scriptSource + template), "old dependency-multiplier copy is absent");
assert.ok(scriptSource.includes("DEFAULT_NEEDS_CALCULATOR"), "runtime has needs calculator fallback payload");
assert.ok(!scriptSource.includes("const SITUATIONS ="), "runtime does not keep a separate hard-coded situation fallback");
assert.ok(scriptSource.includes("mergeDeepDefaults(defaults, value)"), "runtime merges calculator defaults without overwriting live nested values");
assert.ok(scriptSource.includes("const situationConfig ="), "runtime reads calculator situations from the CMS payload");
assert.ok(scriptSource.includes("const activeSituationKey ="), "runtime shows the first configured situation before the visitor clicks");
assert.ok(template.includes("เงินสำรอง + ทุนเดิม"), "visitor calculator exposes existing resources input");
assert.ok(template.includes("ค่าห้องในกรมธรรม์เดิม"), "visitor calculator exposes room benefit input");
assert.ok(template.includes("ระยะพักฟื้นที่ต้องมีเงินรองรับ"), "visitor calculator exposes recovery period input");
assert.ok(template.includes("ทุนประกันชีวิตส่วนที่ยังขาด"), "visitor calculator renders the v1 life shortfall");
assert.ok(template.includes("ส่วนต่างค่าห้องอ้างอิง"), "visitor calculator renders the room-gap output card");
assert.ok(template.includes("เงินก้อนโรคร้ายแรง"), "visitor calculator renders the CI recovery output card");

const life = {monthlyNeed:50000,otherMonthlyIncome:20000,yearsToSupport:10,debtToClear:1000000,extraLumpSum:500000,earmarkedAssets:300000,existingLifeCover:0};
const lifeResult = calculateNeeds('life',life);
assert.equal(lifeResult.netMonthlyNeed,30000);
assert.equal(lifeResult.shortfall,4800000,'Exact reference example');
assert.equal(calculateNeeds('life',{...life,extraLumpSum:500001}).shortfall,4800001,'No silent rounding');
assert.equal(calculateNeeds('life',{...life,earmarkedAssets:90000000}).shortfall,0);
assert.equal(calculateNeeds('life',{...life,otherMonthlyIncome:90000}).shortfall,1200000,'Monthly need floors at zero before other obligations');
assert.equal(calculateNeeds('life',{...life,monthlyNeed:''}).complete,false,'Missing core values do not produce a final estimate');
assert.equal(calculateNeeds('life',{...life,debtToClear:''}).shortfall,3800000,'Optional blank is zero');
assert.ok(calculateNeeds('life',{...life,monthlyNeed:500001}).warnings.includes('monthlyNeed'),'Soft limits never cap valid figures');
assert.equal(parseNeedsNumber('1,000,000').value,1000000);
assert.equal(parseNeedsNumber('๕๐,๐๐๐').value,50000);
assert.equal(parseNeedsNumber('-150').invalid,true);
assert.equal(parseNeedsNumber('12.9').invalid,true);
assert.equal(parseNeedsNumber('0',true).invalid,true);
assert.equal(parseNeedsNumber('1e10').invalid,true);
assert.equal(parseNeedsNumber('abc').invalid,true);
assert.equal(parseNeedsNumber('99999999999999999999').invalid,true);
assert.equal(calculateNeeds('life',{...life,monthlyNeed:9007199254740991}).complete,false,'Overflow cannot become a quote or Infinity');
const ci={monthlyRecoveryNeed:50000,recoveryMonths:12,otherSupportIncome:20000,availableEmergencyFunds:100000,existingCriticalIllnessCover:50000,extraRecoveryBudget:100000};
assert.equal(calculateNeeds('ci',ci).shortfall,310000);
assert.equal(calculateNeeds('ci',{...ci,availableEmergencyFunds:1000000}).shortfall,0);
assert.equal(calculateNeeds('ci',{...ci,recoveryMonths:''}).complete,false);
const health={...needsInitialInputs('health'),publicHealthScheme:'sso',careSetting:'private',existingHealthStructure:'annual',existingAnnualLimit:1000000,targetAnnualLimit:1000000,roomReference:'published',roomBenefit:5000,costSharing:'none',employerCover:'yes',ownPayBudget:10000};
const reference={daily:10550,name:'BNH',sourceUrl:'https://www.bnhhospital.com/th/the-bnh-wards/',lastChecked:'2026-08-15'};
assert.equal(calculateNeeds('health',health,reference).roomGap,5550);
assert.equal(calculateNeeds('health',health,reference).status,'review');
assert.equal(calculateNeeds('health',{...health,roomBenefit:11000},reference).status,'dimensionsAligned');
assert.equal(calculateNeeds('health',{...health,roomBenefit:11000,costSharing:'copay',copayPercent:20},reference).status,'review');
assert.equal(calculateNeeds('health',{...health,costSharing:''},reference).status,'reviewRequired');
assert.equal(calculateNeeds('health',{...health,roomReference:'custom',customRoomDaily:7000},reference).roomGap,2000);
assert.equal(calculateNeeds('health',{...health,roomReference:'custom',customRoomDaily:0},reference).roomGap,0);
assert.equal(calculateNeeds('health',{...health,ownPayBudget:100000},reference).roomGap,5550,'Per-episode budget must not offset daily cost');
for (const [mode,values] of [['life',life],['ci',ci],['health',health]]) {
  const snapshot=createNeedsSnapshot(mode,values,reference,'th','2026-09-23T12:00:00.000Z');
  assert.deepEqual(sanitizeNeedsSnapshot({...snapshot,result:{shortfall:1},injected:'discard'}),snapshot,'Server recomputes and whitelists snapshot');
  assert.throws(()=>sanitizeNeedsSnapshot({...snapshot,inputs:{...snapshot.inputs,unknown:'x',...{[Object.keys(snapshot.inputs)[0]]:'<script>'}}}));
  assert.throws(()=>sanitizeNeedsSnapshot({...snapshot,source:'tracking'}));
}
assert.equal(createNeedsSnapshot('life',{...life,monthlyNeed:''},{},'th'),null);
assert.notDeepEqual(needsInitialInputs('life'),needsInitialInputs('ci'));

const sanitized = sanitizeMotorCountConfig({
  header: { nav: [] },
  sections: [
    { id: "fit", type: "fit", th: {}, en: {}, calculator: { life: { transitionFinalCosts: 123456 } } },
    { id: "insurers", type: "insurers", items: [] }
  ]
});
const sanitizedFit = sanitized.sections.find((section) => section.id === "fit");
assert.equal(sanitizedFit.calculator.datasetVersion, DEFAULT_NEEDS_CALCULATOR.datasetVersion, "contract fills missing calculator metadata");
assert.equal(sanitizedFit.calculator.life.transitionFinalCosts, 123456, "Firestore/custom calculator values prevail over defaults");
assert.equal(sanitizedFit.calculator.health.selectedRoomReference.totalFixedDaily, 10550, "contract fills missing health reference");
assert.equal(sanitizedFit.calculator.situations.start.th, DEFAULT_NEEDS_CALCULATOR.situations.start.th, "contract fills missing situation payload");

const customized = sanitizeMotorCountConfig({
  header: { nav: [] },
  sections: [
    {
      id: "fit",
      type: "fit",
      th: {},
      en: {},
      calculator: {
        situations: {
          start: {
            th: "สถานการณ์จาก Firestore",
            en: "Firestore situation",
            icon: "check",
            recs: [{ th: "ตรวจจากฐานข้อมูล", en: "Database first", wth: "ค่า live ต้องชนะ fallback", wen: "Live value must win fallback" }]
          }
        }
      }
    }
  ]
});
assert.equal(
  customized.sections.find((section) => section.id === "fit").calculator.situations.start.th,
  "สถานการณ์จาก Firestore",
  "Firestore/custom situation copy prevails over fallback"
);

console.log("Needs calculator regression checks passed.");
