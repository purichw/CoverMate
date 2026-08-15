import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_NEEDS_CALCULATOR,
  sanitizeMotorCountConfig
} from "../covermate-contract.js";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const indexHtml = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");

function extractTemplate(html) {
  const open = '<script type="__bundler/template">';
  const start = html.lastIndexOf(open);
  assert.notEqual(start, -1, "embedded template is present");
  const after = start + open.length;
  const end = html.indexOf("</script>", after);
  assert.notEqual(end, -1, "embedded template closes");
  return JSON.parse(html.slice(after, end));
}

function extractDcScript(template) {
  const match = template.match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/);
  assert.ok(match, "text/x-dc script is present");
  return match[1];
}

function extractDefaults(scriptSource) {
  const defaultsEnd = scriptSource.indexOf("const SCHEMA =");
  assert.notEqual(defaultsEnd, -1, "DEFAULTS boundary exists");
  const sandbox = {};
  vm.runInNewContext(`${scriptSource.slice(0, defaultsEnd)}\nthis.DEFAULTS = DEFAULTS;`, sandbox);
  return sandbox.DEFAULTS;
}

function roundHundredThousand(value) {
  return Math.round(Math.max(0, value) / 100000) * 100000;
}

const template = extractTemplate(indexHtml);
const scriptSource = extractDcScript(template);
const defaults = extractDefaults(scriptSource);
const fit = defaults.sections.find((section) => section && section.id === "fit");

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
assert.ok(template.includes("ทุนชีวิตที่ควรเริ่มจาก"), "visitor calculator renders the life starting-need output card");
assert.ok(template.includes("ส่วนต่างค่าห้องอ้างอิง"), "visitor calculator renders the room-gap output card");
assert.ok(template.includes("เงินก้อนโรคร้ายแรง"), "visitor calculator renders the CI recovery output card");

const monthlyEssential = 50000;
const supportYears = fit.calculator.life.supportYears[1];
const obligations = 0;
const resources = 0;
const expectedLifeNeed = roundHundredThousand(
  monthlyEssential * 12 * supportYears +
  obligations +
  fit.calculator.life.transitionFinalCosts -
  resources
);
assert.equal(expectedLifeNeed, 2000000, "default life need follows methodology formula");

const expectedRoomGap = Math.max(0, fit.calculator.health.selectedRoomReference.totalFixedDaily - 5000);
assert.equal(expectedRoomGap, 5550, "default room gap follows reference-difference formula");

const expectedCiNeed = roundHundredThousand(
  monthlyEssential * fit.calculator.criticalIllness.defaultRecoveryMonths +
  fit.calculator.criticalIllness.oneOffRecoveryNonMedicalBudget +
  fit.calculator.criticalIllness.chosenMedicalOopBuffer -
  resources
);
assert.equal(expectedCiNeed, 700000, "default CI buffer follows recovery formula");

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
