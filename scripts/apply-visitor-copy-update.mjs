import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  BUNDLER_TEMPLATE_OPEN,
  extractBundlerTemplatePart,
  serializeBundlerTemplate
} from "./lib/bundler-template.mjs";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const indexPath = path.join(repoRoot, "index.html");
const args = new Set(process.argv.slice(2));
const PUBLIC_SEO_TITLE = {
  th: "CoverMate | ที่ปรึกษาประกัน AIA และประกันรถยนต์",
  en: "CoverMate | AIA and Motor Insurance Advisory"
};
const PUBLIC_SEO_DESCRIPTION = {
  th: "ปรึกษาประกันชีวิตและสุขภาพผ่าน AIA และประกันรถยนต์จาก 14 บริษัทประกันภัย พร้อมคำแนะนำชัดเจนโดยไม่มีค่าใช้จ่าย",
  en: "Life and health insurance through AIA, plus motor insurance options from 14 insurers. Clear guidance at no consultation fee."
};

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function readBaseHtml() {
  if (!args.has("--base=head")) return read(indexPath);
  return execFileSync("git", ["show", "HEAD:index.html"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
}

function assetVersionFromCurrentHtml() {
  const html = read(indexPath);
  const match = html.match(/\/site\.webmanifest\?v=([^"]+)/);
  return match ? match[1] : "";
}

function applyOuterAssetVersion(html, version) {
  if (!version) return html;
  const templateStart = html.indexOf(BUNDLER_TEMPLATE_OPEN);
  if (templateStart < 0) return html;
  const shell = html.slice(0, templateStart)
    .replace(/\/site\.webmanifest(?:\?v=[^"]*)?/g, `/site.webmanifest?v=${version}`)
    .replace(/\/favicon\.svg(?:\?v=[^"]*)?/g, `/favicon.svg?v=${version}`)
    .replace(/\/favicon\.ico(?:\?v=[^"]*)?/g, `/favicon.ico?v=${version}`)
    .replace(/\/assets\/apple-touch-icon\.png(?:\?v=[^"]*)?/g, `/assets/apple-touch-icon.png?v=${version}`);
  return shell + html.slice(templateStart);
}

function escapeHtmlText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlAttribute(value) {
  return escapeHtmlText(value).replace(/"/g, "&quot;");
}

function updateJsonLdMetadata(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    const graph = Array.isArray(data["@graph"]) ? data["@graph"] : [];
    graph.forEach((entry) => {
      const types = Array.isArray(entry["@type"]) ? entry["@type"] : [entry["@type"]];
      if (types.includes("WebPage")) {
        entry.name = PUBLIC_SEO_TITLE.th;
        entry.description = PUBLIC_SEO_DESCRIPTION.th;
      }
    });
    return JSON.stringify(data);
  } catch {
    return jsonText;
  }
}

function applySeoMetadata(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtmlText(PUBLIC_SEO_TITLE.th)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/g, `$1${escapeHtmlAttribute(PUBLIC_SEO_DESCRIPTION.th)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/g, `$1${escapeHtmlAttribute(PUBLIC_SEO_TITLE.th)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/g, `$1${escapeHtmlAttribute(PUBLIC_SEO_DESCRIPTION.th)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/g, `$1${escapeHtmlAttribute(PUBLIC_SEO_TITLE.th)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/g, `$1${escapeHtmlAttribute(PUBLIC_SEO_DESCRIPTION.th)}$2`)
    .replace(
      /<script type="application\/ld\+json" id="covermate-jsonld">([\s\S]*?)<\/script>/g,
      (_match, jsonText) => `<script type="application/ld+json" id="covermate-jsonld">${updateJsonLdMetadata(jsonText)}</script>`
    );
}

function extractTemplate(html) {
  return extractBundlerTemplatePart(html, {
    fileLabel: "index.html",
    completePredicate: (template) => template.includes("</html>") && template.includes("const DEFAULTS =")
  });
}

function extractDcScript(template) {
  const match = template.match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("text/x-dc script not found in embedded template.");
  return {
    fullMatch: match[0],
    source: match[1]
  };
}

function extractDefaults(scriptSource) {
  const defaultsEnd = scriptSource.indexOf("const SCHEMA =");
  if (defaultsEnd < 0) throw new Error("Could not locate DEFAULTS boundary.");
  const sandbox = {};
  vm.runInNewContext(`${scriptSource.slice(0, defaultsEnd)}\nthis.DEFAULTS = DEFAULTS;`, sandbox);
  return sandbox.DEFAULTS;
}

function asScriptLiteral(value) {
  return JSON.stringify(value, null, 2);
}

const NEEDS_CALCULATOR = {
  datasetVersion: "2026-08-15-v0.1",
  sourcePackage: "covermate-reference-data-v0.1",
  situations: {
    start: {
      th: "เพิ่งเริ่มทำงาน",
      en: "Just started working",
      icon: "sprout",
      recs: [
        {
          th: "เริ่มจากค่ารักษาและอุบัติเหตุ",
          en: "Start with health and accident cover",
          wth: "ช่วงเริ่มทำงานควรรักษาสภาพคล่องไว้ก่อน เครื่องมือนี้จึงแยกเงินก้อนชีวิตออกจากค่ารักษาและเงินพักฟื้น",
          wen: "Early-career planning should protect cash flow first, so this tool separates life need, medical room gap and recovery buffer."
        },
        {
          th: "เพิ่มทุนชีวิตเมื่อมีคนพึ่งพารายได้",
          en: "Increase life cover when others depend on you",
          wth: "ทุนชีวิตควรอิงค่าใช้จ่ายจำเป็นและจำนวนปีที่ต้องดูแล ไม่ใช่ตัวคูณรายได้แบบตายตัว",
          wen: "Life cover should follow essential spending and support years, not a fixed salary multiplier."
        },
        {
          th: "เช็กค่าห้องกับโรงพยาบาลที่ใช้จริง",
          en: "Check room benefits against likely hospitals",
          wth: "ส่วนต่างค่าห้องเป็นข้อมูลอ้างอิง ไม่ใช่จำนวนเงินที่ต้องจ่ายแน่นอน เพราะขึ้นกับเงื่อนไขกรมธรรม์",
          wen: "The room gap is a reference, not a guaranteed bill, because policy terms decide the actual outcome."
        }
      ]
    },
    family: {
      th: "มีครอบครัว มีลูก",
      en: "Family with kids",
      icon: "users",
      recs: [
        {
          th: "คุ้มครองรายจ่ายบ้านหลายปี",
          en: "Protect household spending for several years",
          wth: "ใส่ค่าใช้จ่ายจำเป็นต่อเดือนและจำนวนปีที่อยากให้ครอบครัวยืนต่อได้ แล้วค่อยหักเงินสำรองหรือทุนเดิมที่กันไว้แล้ว",
          wen: "Enter essential monthly spending and the years your family needs support, then subtract liquid assets and existing cover."
        },
        {
          th: "หนี้และค่าเรียนควรถูกนับแยก",
          en: "Debts and education should be explicit",
          wth: "หนี้บ้าน รถ หรือภาระอนาคตควรเป็นตัวเลขแยกจากค่าใช้จ่ายรายเดือน เพื่อไม่ให้ทุนชีวิตต่ำกว่าภาระจริง",
          wen: "Mortgage, car debt and future obligations should be entered separately from monthly spending so life need is not understated."
        },
        {
          th: "โรคร้ายแรงคือเงินพักฟื้น",
          en: "Critical illness is a recovery buffer",
          wth: "เงินก้อนโรคร้ายแรงในเครื่องมือนี้อิงเดือนพักฟื้น ไม่ได้ผูกโรคใดโรคหนึ่งกับทุนตายตัว",
          wen: "The CI figure is based on recovery months, not a disease-to-sum-insured shortcut."
        }
      ]
    },
    business: {
      th: "เจ้าของธุรกิจ",
      en: "Business owner",
      icon: "briefcase",
      recs: [
        {
          th: "แยกภาระบ้านกับภาระธุรกิจ",
          en: "Separate household and business obligations",
          wth: "ภาระธุรกิจที่ครอบครัวต้องรับต่อควรถูกใส่เป็นภาระอนาคต ไม่รวมปนกับค่าใช้จ่ายประจำบ้าน",
          wen: "Business obligations that would fall to the family should be added as future obligations, not blended into household spending."
        },
        {
          th: "เงินสดสำรองช่วยลดช่องว่างได้",
          en: "Earmarked liquidity reduces the gap",
          wth: "เงินสำรองที่ตั้งใจใช้เพื่อครอบครัวหรือธุรกิจในกรณีฉุกเฉินสามารถนำมาหักได้ แต่เงินทุนหมุนเวียนที่ต้องใช้ทำงานไม่ควรนับซ้ำ",
          wen: "Earmarked emergency liquidity can reduce the gap, but working capital needed by the business should not be double-counted."
        },
        {
          th: "ตรวจ health limit แยกจากทุนชีวิต",
          en: "Review health limits separately from life cover",
          wth: "ค่ารักษาไม่ควรถูกนำไปคูณเป็นทุนชีวิต แต่ควรตรวจเป็น room gap และเงื่อนไขกรมธรรม์แยกต่างหาก",
          wen: "Medical costs should not drive life cover. Review room gap and policy wording separately."
        }
      ]
    },
    retire: {
      th: "ใกล้เกษียณ",
      en: "Near retirement",
      icon: "clock",
      recs: [
        {
          th: "ลดทุนชีวิตเมื่อภาระลดลง",
          en: "Reduce life cover as obligations fall",
          wth: "ถ้าหนี้และคนพึ่งพิงลดลง ทุนชีวิตอาจไม่ต้องสูงเท่าช่วงสร้างครอบครัว แต่สุขภาพและเงินพักฟื้นยังควรตรวจละเอียด",
          wen: "As debts and dependants fall, life cover may not need to be as high as before, while health and recovery buffers deserve closer review."
        },
        {
          th: "ค่าห้องควรตรงกับโรงพยาบาลที่ใช้จริง",
          en: "Room benefits should match likely hospitals",
          wth: "เลือกค่าห้องจากโรงพยาบาลที่มีแนวโน้มใช้จริง แล้วดูว่าส่วนต่างที่ต้องเตรียมรับได้หรือไม่",
          wen: "Choose a likely hospital reference and check whether the resulting room gap is acceptable."
        },
        {
          th: "กันเงินพักฟื้นที่ไม่ใช่ค่ารักษา",
          en: "Set aside non-medical recovery cash",
          wth: "ช่วงพักฟื้นยังมีค่าเดินทาง คนดูแล และรายได้ที่อาจลดลง ซึ่งไม่ใช่ค่ารักษาโดยตรง",
          wen: "Recovery may require transport, caregiving and income replacement beyond hospital bills."
        }
      ]
    }
  },
  life: {
    engineVersion: "1.0.0",
    formula: "essential_monthly_household_spending * 12 * support_years + outstanding_debts + future_obligations + transition_final_costs - earmarked_liquid_assets - existing_death_benefits",
    supportYears: [1, 3, 5, 10, 15],
    transitionFinalCosts: 200000,
    guardrails: [
      "Do not use hospital treatment costs in the core life-sum calculation.",
      "Do not use arbitrary salary multipliers as the authoritative model.",
      "Willingness to pay must not reduce calculated need."
    ]
  },
  health: {
    engineVersion: "1.0.0",
    model: "coverage_fit_and_out_of_pocket_reference",
    selectedRoomReference: {
      hospitalId: "bnh",
      hospitalName: { th: "โรงพยาบาล BNH", en: "BNH Hospital" },
      roomType: { th: "Regent Adult", en: "Regent Adult" },
      totalFixedDaily: 10550,
      currency: "THB",
      priceUnit: "day",
      sourceUrl: "https://www.bnhhospital.com/th/the-bnh-wards/",
      lastChecked: "2026-08-15",
      confidenceLevel: "A",
      note: {
        th: "ข้อมูลค่าห้องอ้างอิงจากหน้าโรงพยาบาล ไม่ใช่จำนวนเงินที่ผู้เอาประกันต้องจ่ายแน่นอน",
        en: "Published room reference from the hospital page, not a guaranteed out-of-pocket amount."
      }
    },
    guardrails: [
      "Do not output one authoritative required sum insured.",
      "Do not call the reference difference the amount the user will definitely pay.",
      "Every medical reference must expose source, last_checked and confidence.",
      "Do not derive P50/P75/P90 from promotional/package pages."
    ]
  },
  criticalIllness: {
    engineVersion: "1.0.0",
    formula: "essential_monthly_spending * recovery_months + one_off_recovery_non_medical_budget + chosen_medical_oop_buffer - earmarked_emergency_assets - existing_ci_lump_sum_cover",
    recoveryMonths: [3, 6, 12, 18, 24],
    defaultRecoveryMonths: 6,
    oneOffRecoveryNonMedicalBudget: 100000,
    chosenMedicalOopBuffer: 250000,
    guardrails: [
      "Recovery period must be explicitly user-selected.",
      "Do not map a disease name to a fixed CI sum.",
      "Health treatment scenarios may contextualize the user's chosen medical OOP buffer but must not dictate it."
    ]
  }
};

const PRODUCT_SECTION_ORDER = [
  "hero",
  "trust",
  "cover",
  "review",
  "how",
  "insurers",
  "fit",
  "tiers",
  "claim",
  "renew",
  "guides",
  "voices",
  "about",
  "faq",
  "fees",
  "privacy",
  "talk"
];

const LEGACY_SECTION_ORDER = [
  "hero",
  "trust",
  "cover",
  "review",
  "fit",
  "how",
  "insurers",
  "tiers",
  "claim",
  "renew",
  "guides",
  "voices",
  "about",
  "faq",
  "fees",
  "privacy",
  "talk"
];

function replaceBetween(source, startNeedle, endNeedle, replacement) {
  const start = source.indexOf(startNeedle);
  if (start < 0) throw new Error(`Missing runtime block start: ${startNeedle}`);
  const end = source.indexOf(endNeedle, start);
  if (end < 0) throw new Error(`Missing runtime block end: ${endNeedle}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function applyRuntimeCopyGuards(source) {
  let next = source
    .replaceAll("ส่งตัวเลขนี้ให้ผมดูต่อ", "ส่งตัวเลขนี้ให้เราดูต่อ")
    .replaceAll("Send me these numbers", "Send us these numbers")
    .replaceAll("ผมทำอะไร", "เราทำอะไร")
    .replaceAll("What I did", "What we do")
    .replaceAll("ตั้งเตือนให้ผมจำ", "ตั้งเตือนให้เราจำ")
    .replaceAll("ติดต่อผม", "ติดต่อเรา")
    .replaceAll("contact me directly on LINE", "contact us directly on LINE")
    .replaceAll("contact me", "contact us")
    .replaceAll("ค่าตอบแทนของผม", "ค่าตอบแทนของเรา")
    .replaceAll("How I get paid", "How CoverMate is compensated")
    .replaceAll("เกี่ยวกับผม", "เกี่ยวกับเรา")
    .replaceAll("ผมเทียบเบี้ยประกันรถยนต์", "เราเปรียบเทียบเบี้ยประกันรถยนต์")
    .replaceAll("ผมสรุปข้อแตกต่างให้เห็นชัดก่อนตัดสินใจ", "เราสรุปข้อแตกต่างให้เห็นชัดก่อนตัดสินใจ")
    .replaceAll("ในฐานะตัวแทน AIA ผมดูแลเรื่องชีวิตและสุขภาพเป็นหลัก", "ในฐานะตัวแทน AIA เราดูแลเรื่องชีวิตและสุขภาพเป็นหลัก")
    .replaceAll("ผมไม่เสนอยูนิตลิงก์", "เราไม่เสนอยูนิตลิงก์")
    .replaceAll("ผมตอบทุกข้อความเองตามเวลาทำการ", "เราตอบทุกข้อความด้วยตนเองตามเวลาทำการ")
    .replaceAll("แล้วผมจะเตือนล่วงหน้า 60 วัน", "แล้วเราจะเตือนล่วงหน้า 60 วัน")
    .replaceAll("ตั้งเตือนไว้แล้ว ผมจะทักไปก่อน 60 วัน", "ตั้งเตือนไว้แล้ว เราจะทักไปก่อน 60 วัน")
    .replaceAll("ได้รับข้อมูลแล้ว ผมจะติดต่อกลับโดยเร็วที่สุด", "ได้รับข้อมูลแล้ว เราจะติดต่อกลับโดยเร็วที่สุด")
    .replaceAll("สนใจปรึกษาครับ/ค่ะ — สถานการณ์: ", "สนใจปรึกษาเรื่องประกัน — สถานการณ์: ")
    .replaceAll("สนใจปรึกษาเรื่องประกันครับ/ค่ะ", "สนใจปรึกษาเรื่องประกัน")
    .replaceAll("As a broker I compare", "As a broker, we compare")
    .replaceAll("As an AIA agent, life and health are my main focus", "As AIA agents, life and health are our main focus")
    .replaceAll("I do not offer unit-linked plans", "Unit-linked plans are not offered")
    .replaceAll("Set. I will message you 60 days ahead.", "Set. We will message you 60 days ahead.")
    .replaceAll("Thank you. I will reply as soon as possible.", "Thank you. We will reply as soon as possible.")
    .replaceAll("Pick a policy and expiry month and I will remind you 60 days ahead.", "Pick a policy and expiry month and we will remind you 60 days ahead.")
    .replaceAll("'I will remind you about '", "'We will remind you about '");
  if (!next.includes("normalizeProductDecisionCopy(value)")) {
    next = next.replace(
      "  normalizeInsurerCountCopy(value, count) {",
      `  normalizeProductDecisionCopy(value) {
    if (typeof value !== 'string') return value;
    return value
      .replace(/ไม่ต้องจัดการคนเดียว/g, 'ไม่จำเป็นต้องจัดการเพียงลำพัง')
      .replace(/สู้คนเดียว/g, 'จัดการเพียงลำพัง')
      .replace(/ประกันชีวิตและสุขภาพ\\s*เราให้บริการผ่าน AIA โดยตรง/g, 'ประกันชีวิตและสุขภาพดำเนินการผ่าน AIA')
      .replace(/ชีวิตและสุขภาพ\\s*เราให้บริการผ่าน AIA โดยตรง/g, 'ชีวิตและสุขภาพดำเนินการผ่าน AIA')
      .replace(/ชีวิตและสุขภาพ\\s*ผมเป็นตัวแทน AIA โดยเฉพาะ/g, 'ชีวิตและสุขภาพดำเนินการผ่าน AIA')
      .replace(/เราให้บริการผ่าน AIA โดยตรง/g, 'ดำเนินการผ่าน AIA')
      .replace(/เราให้บริการผ่าน AIA/g, 'ดำเนินการผ่าน AIA')
      .replace(/ผมเป็นตัวแทน AIA โดยเฉพาะ/g, 'ดำเนินการผ่าน AIA')
      .replace(/ผมเป็นตัวแทน AIA/g, 'ดำเนินการผ่าน AIA')
      .replace(/ผมจัดผ่าน/g, 'เราจัดผ่าน')
      .replace(/ผมเทียบ/g, 'เราเปรียบเทียบ')
      .replace(/ผมสรุป/g, 'เราสรุป')
      .replace(/ผมดูแล/g, 'เราดูแล')
      .replace(/ผมตอบกลับ/g, 'เราตอบกลับ')
      .replace(/ผมตอบทุกข้อความเอง/g, 'เราตอบทุกข้อความด้วยตนเอง')
      .replace(/ผมจะติดต่อกลับ/g, 'เราจะติดต่อกลับ')
      .replace(/ผมจะทัก/g, 'เราจะทัก')
      .replace(/ผมจะเตือน/g, 'เราจะเตือน')
      .replace(/ติดต่อผม/g, 'ติดต่อเรา')
      .replace(/ส่งตัวเลขนี้ให้ผมดูต่อ/g, 'ส่งตัวเลขนี้ให้เราดูต่อ')
      .replace(/ตั้งเตือนให้ผมจำ/g, 'ตั้งเตือนให้เราจำ')
      .replace(/เกี่ยวกับผม/g, 'เกี่ยวกับเรา')
      .replace(/ค่าตอบแทนของผม/g, 'ค่าตอบแทนของเรา')
      .replace(/ไม่ขายเกิน/g, 'ไม่เสนอเกินความจำเป็น')
      .replace(/ยิงเทียบ/g, 'เปรียบเทียบ')
      .replace(/ยิงเบี้ย/g, 'เปรียบเทียบเบี้ย')
      .replace(/สนใจปรึกษาครับ\\/ค่ะ\\s*—\\s*สถานการณ์:/g, 'สนใจปรึกษาเรื่องประกัน — สถานการณ์:')
      .replace(/สนใจปรึกษาครับ\\/ค่ะ/g, 'สนใจปรึกษาเรื่องประกัน')
      .replace(/แอดไลน์ ปรึกษาฟรี/g, 'ติดต่อเราทาง LINE')
      .replace(/แอดไลน์ ขอเทียบเบี้ย/g, 'ติดต่อเราทาง LINE')
      .replace(/Send me these numbers/g, 'Send us these numbers')
      .replace(/What I did/g, 'What we do')
      .replace(/What I get paid/g, 'How CoverMate is compensated')
      .replace(/How I get paid/g, 'How CoverMate is compensated')
      .replace(/About me/g, 'About us')
      .replace(/contact me directly on LINE/g, 'contact us directly on LINE')
      .replace(/contact me/ig, 'contact us')
      .replace(/As a broker I compare/g, 'As a broker, we compare')
      .replace(/I compare/g, 'We compare')
      .replace(/I do not offer unit-linked plans/g, 'Unit-linked plans are not offered')
      .replace(/Set\\. I will message you 60 days ahead\\./g, 'Set. We will message you 60 days ahead.')
      .replace(/Thank you\\. I will reply as soon as possible\\./g, 'Thank you. We will reply as soon as possible.')
      .replace(/Pick a policy and expiry month and I will remind you 60 days ahead\\./g, 'Pick a policy and expiry month and we will remind you 60 days ahead.')
      .replace(/I will remind you about/g, 'We will remind you about')
      .replace(/hard sell/ig, 'sales pressure')
      .replace(/chase the insurer/ig, 'coordinate with the insurer')
      .replace(/fight it alone/ig, 'handle it alone')
      .replace(/someone answers the phone/ig, 'you know who to contact')
      .replace(/savings are thin/ig, 'the difference is limited')
      .replace(/ตั้งตัวไม่ทัน/g, 'กรณีเร่งด่วน')
      .replace(/ผม/g, 'เรา')
      .replace(/ครับ\\/ค่ะ/g, '')
      .replace(/ครับ/g, '')
      .replace(/ค่ะ/g, '')
      .replace(/\\s{2,}/g, ' ')
      .trim();
  }

  normalizeInsurerCountCopy(value, count) {`
    );
  }
  next = next
    .replace(
      /normalizeInsurerCountCopy\(value, count\) \{[\s\S]*?\n  \}\n\n  sanitizeTextOverrides/,
      `normalizeInsurerCountCopy(value, count) {
    if (typeof value !== 'string') return value;
    const n = Number(count) || this.companyLogoCount();
    if (!/(ประกันรถยนต์|บริษัท|เทียบ|เบี้ย|motor|insurer|broker|compare|comparison)/i.test(value)) return value;
    return value
      .replace(/บริษัทประกันภัยกว่า\\s*\\d+\\+?\\s*แห่ง/g, function () { return 'บริษัทประกันภัย ' + n + ' แห่ง'; })
      .replace(/บริษัทกว่า\\s*\\d+\\+?\\s*เจ้า/g, function () { return 'บริษัทประกันภัย ' + n + ' แห่ง'; })
      .replace(/เทียบเบี้ยกว่า\\s*\\d+\\+?\\s*บริษัท/g, function () { return 'จาก ' + n + ' บริษัทประกันภัย'; })
      .replace(/เทียบได้กว่า\\s*\\d+\\+?\\s*เจ้า/g, function () { return 'เทียบได้ ' + n + ' เจ้า'; })
      .replace(/เทียบเบี้ยได้กว่า\\s*\\d+\\+?\\s*เจ้า/g, function () { return 'เทียบเบี้ยได้ ' + n + ' เจ้า'; })
      .replace(/กว่า\\s*\\d+\\+?\\s*เจ้า/g, function () { return n + ' เจ้า'; })
      .replace(/กว่า\\s*\\d+\\+?\\s*บริษัท/g, function () { return n + ' บริษัท'; })
      .replace(/more than\\s*\\d+\\+?\\s*insurers?/ig, function () { return n + ' insurers'; })
      .replace(/over\\s*\\d+\\+?\\s*insurers?/ig, function () { return n + ' insurers'; })
      .replace(/(compared across\\s*)\\d+\\+?/ig, function (_, a) { return a + n; })
      .replace(/(through\\s*)\\d+\\+?(\\s*insurers)/ig, function (_, a, b) { return a + n + b; })
      .replace(/(across\\s*)\\d+\\+?(\\s*insurers)/ig, function (_, a, b) { return a + n + b; })
      .replace(/\\d+\\+?(\\s*insurers compared)/ig, function (_, a) { return n + a; });
  }

  sanitizeTextOverrides`
    )
    .replace(
      /heroClaimText:\s*th\s*\?\s*'เกิดอุบัติเหตุอยู่ตอนนี้ โทร 1669 ก่อนเสมอ แล้วค่อยติดต่อผม'\s*:\s*'In an accident right now, call 1669 first, then contact me',\s*\n\s*heroClaimLinkText:\s*th\s*\?\s*'ดูขั้นตอนเมื่อเกิดเหตุ'\s*:\s*'See the accident guide',\s*\n\s*heroClaimHref:\s*'#claim',/,
      "heroClaimText: this.normalizeProductDecisionCopy((s[lk] && s[lk].claimText) || (th ? 'เกิดอุบัติเหตุอยู่ตอนนี้ โทร 1669 ก่อนเสมอ แล้วค่อยติดต่อเรา' : 'In an accident right now, call 1669 first, then contact us')),\n      heroClaimLinkText: this.normalizeProductDecisionCopy((s[lk] && s[lk].claimLinkText) || (th ? 'ดูขั้นตอนเมื่อเกิดเหตุ' : 'See the accident guide')),\n      heroClaimHref: (s[lk] && s[lk].claimHref) || s.claimHref || '#claim',"
    )
    .replace(
      "      const value = String(next[key] || '');\n      const isInsurerInlineText = /^insurers:\\d+:(th|en)$/.test(key);\n      const isContactTitleText = /^talk:\\d+:(th|en)$/.test(key);\n      if (isInsurerInlineText) next[key] = this.normalizeInsurerCountCopy(value, count);\n      if (isContactTitleText) {\n        next[key] = value\n          .replace(/ขอรับ\\s*\\n\\s*คำปรึกษา/g, 'ขอรับคำปรึกษา')\n          .replace(/Request a\\s*\\n\\s*consultation/ig, 'Request a consultation');\n      }",
      "      const value = this.normalizeProductDecisionCopy(String(next[key] || ''));\n      const isInsurerInlineText = /^insurers:\\d+:(th|en)$/.test(key);\n      const isContactTitleText = /^talk:\\d+:(th|en)$/.test(key);\n      next[key] = value;\n      if (isInsurerInlineText) next[key] = this.normalizeInsurerCountCopy(value, count);\n      if (isContactTitleText) {\n        next[key] = this.normalizeProductDecisionCopy(value\n          .replace(/ขอรับ\\s*\\n\\s*คำปรึกษา/g, 'ขอรับคำปรึกษา')\n          .replace(/Request a\\s*\\n\\s*consultation/ig, 'Request a consultation'));\n      }"
    )
    .replace(
      /(?:\n\s*cfg\.header\.nav = clone\(DEFAULTS\.header\.nav \|\| \[\]\);\s*(?:\n\s*cfg\.header\.cta = clone\(DEFAULTS\.header\.cta \|\| cfg\.header\.cta \|\| \{\}\);\s*)?(?:\n\s*cfg\.sections = this\.reorderKnownLegacySections\(cfg\.sections\);\s*)?)*\n\s*const defById = \{\};/,
      "\n    cfg.header.nav = clone(DEFAULTS.header.nav || []);\n    cfg.header.cta = clone(DEFAULTS.header.cta || cfg.header.cta || {});\n    cfg.sections = this.reorderKnownLegacySections(cfg.sections);\n\n    const defById = {};"
    )
    .replace(
      "if (typeof obj[field] === 'string') obj[field] = this.normalizeInsurerCountCopy(obj[field], insurerCount);",
      "if (typeof obj[field] === 'string') obj[field] = this.normalizeProductDecisionCopy(this.normalizeInsurerCountCopy(obj[field], insurerCount));"
    )
    .replace(
      "        if (typeof obj[field] === 'string') obj[field] = this.normalizeProductDecisionCopy(this.normalizeInsurerCountCopy(obj[field], insurerCount));\n      });\n    };",
      "        if (typeof obj[field] === 'string') obj[field] = this.normalizeProductDecisionCopy(this.normalizeInsurerCountCopy(obj[field], insurerCount));\n        else if (obj[field] && typeof obj[field] === 'object') normalizeLocalized(obj[field]);\n      });\n    };\n    ['header', 'brand', 'footer', 'contact', 'seo'].forEach((key) => normalizeLocalized(cfg[key]));"
    )
    .replace(
      "      if (!s) return;\n      ['th', 'en'].forEach(lang => normalizeLocalized(s[lang]));",
      "      if (!s) return;\n      normalizeLocalized(s);\n      ['th', 'en'].forEach(lang => normalizeLocalized(s[lang]));"
    );

  const needsRuntimeData = JSON.stringify(NEEDS_CALCULATOR, null, 2);
  next = replaceBetween(
    next,
    next.includes("const DEFAULT_NEEDS_CALCULATOR =") ? "const DEFAULT_NEEDS_CALCULATOR =" : "const SITUATIONS = {",
    "const ACCENTS = {",
    `const DEFAULT_NEEDS_CALCULATOR = ${needsRuntimeData};

`
  );

  next = next.replace("    const sit = S.situation ? SITUATIONS[S.situation] : null;\n", "");
  next = replaceBetween(
    next,
    "    const fitSectionRaw = (site.sections || []).find(x => x && x.type === 'fit') || {};",
    "    const fitPal = this.pal",
    `    const fitSectionRaw = (site.sections || []).find(x => x && x.type === 'fit') || {};
    const fitCalculator = this.mergeDeepDefaults(DEFAULT_NEEDS_CALCULATOR, fitSectionRaw.calculator);
    const situationConfig = (fitCalculator.situations && typeof fitCalculator.situations === 'object') ? fitCalculator.situations : DEFAULT_NEEDS_CALCULATOR.situations;
    const situationKeys = Object.keys(situationConfig).filter(k => situationConfig[k] && situationConfig[k].on !== false);
    const activeSituationKey = S.situation && situationConfig[S.situation] ? S.situation : (situationKeys[0] || '');
    const sit = activeSituationKey ? situationConfig[activeSituationKey] : null;
    const lifeCalc = fitCalculator.life || DEFAULT_NEEDS_CALCULATOR.life;
    const healthCalc = fitCalculator.health || DEFAULT_NEEDS_CALCULATOR.health;
    const ciCalc = fitCalculator.criticalIllness || DEFAULT_NEEDS_CALCULATOR.criticalIllness;
    const supportOptions = Array.isArray(lifeCalc.supportYears) && lifeCalc.supportYears.length ? lifeCalc.supportYears : DEFAULT_NEEDS_CALCULATOR.life.supportYears;
    const supportIndex = Math.max(0, Math.min(supportOptions.length - 1, Number(S.deps) || 0));
    const supportYears = Number(supportOptions[supportIndex]) || 1;
    const monthlyEssential = Math.max(0, Number(S.income) || 0);
    const obligations = Math.max(0, Number(S.debt) || 0);
    const resources = Math.max(0, Number(S.resources) || 0);
    const roomBenefit = Math.max(0, Number(S.roomBenefit) || 0);
    const recoveryMonths = Math.max(3, Number(S.recovery) || Number(ciCalc.defaultRecoveryMonths) || 6);
    const transitionFinalCosts = Math.max(0, Number(lifeCalc.transitionFinalCosts) || 0);
    const lifeNeed = Math.max(0, monthlyEssential * 12 * supportYears + obligations + transitionFinalCosts - resources);
    const sumAssured = Math.round(lifeNeed / 100000) * 100000;
    const roomRef = healthCalc.selectedRoomReference || DEFAULT_NEEDS_CALCULATOR.health.selectedRoomReference;
    const roomDaily = Math.max(0, Number(roomRef.totalFixedDaily || roomRef.publishedPrice) || 0);
    const roomGap = Math.max(0, roomDaily - roomBenefit);
    const ciNeed = Math.max(0, monthlyEssential * recoveryMonths + Math.max(0, Number(ciCalc.oneOffRecoveryNonMedicalBudget) || 0) + Math.max(0, Number(ciCalc.chosenMedicalOopBuffer) || 0) - resources);
    const lump = Math.round(ciNeed / 100000) * 100000;
    const sourceName = th
      ? ((roomRef.hospitalName && roomRef.hospitalName.th) || roomRef.hospitalId || 'แหล่งอ้างอิง')
      : ((roomRef.hospitalName && roomRef.hospitalName.en) || roomRef.hospitalId || 'Reference');
    const roomTypeName = th
      ? ((roomRef.roomType && roomRef.roomType.th) || roomRef.roomType || '')
      : ((roomRef.roomType && roomRef.roomType.en) || roomRef.roomType || '');
    const referenceLabel = sourceName + (roomTypeName ? ' · ' + roomTypeName : '') + ' · ' + this.fmt(roomDaily) + '/' + (roomRef.priceUnit || 'day') + ' · ' + (roomRef.confidenceLevel || 'A') + ' · ' + (roomRef.lastChecked || fitCalculator.datasetVersion);

`
  );

  next = next.replace(
    "    const sitList = Object.keys(SITUATIONS).map(k => ({\n      key: k, on: S.situation === k, paths: ICONS[SITUATIONS[k].icon],\n      label: th ? SITUATIONS[k].th : SITUATIONS[k].en,\n      bg: S.situation === k ? A.base : fitPal.card,\n      fg: S.situation === k ? A.on : fitPal.cardFg,\n      pick: () => this.setState({ situation: k })\n    }));",
    "    const sitList = situationKeys.map(k => ({\n      key: k, on: activeSituationKey === k, paths: ICONS[situationConfig[k].icon] || ICONS.check,\n      label: th ? situationConfig[k].th : situationConfig[k].en,\n      bg: activeSituationKey === k ? A.base : fitPal.card,\n      fg: activeSituationKey === k ? A.on : fitPal.cardFg,\n      pick: () => this.setState({ situation: k })\n    }));"
  );

  next = next
    .replace(
      "    debt: 0,\n    form:",
      "    debt: 0,\n    resources: 0,\n    roomBenefit: 5000,\n    recovery: 6,\n    form:"
    )
    .replace(
      "      income: S.income, incomeLabel: this.fmt(S.income),\n      onIncome: (e) => this.setState({ income: Number(e.target.value) }),\n      deps: S.deps, depsLabel: String(S.deps) + (S.deps === 4 ? '+' : ''),\n      onDeps: (e) => this.setState({ deps: Number(e.target.value) }),\n      debt: S.debt, debtLabel: S.debt === 0 ? (th ? 'ไม่มี' : 'None') : this.fmt(S.debt),\n      onDebt: (e) => this.setState({ debt: Number(e.target.value) }),\n      incomePct: Math.round((S.income - 15000) / (400000 - 15000) * 100) + '%',\n      depsPct: Math.round(S.deps / 4 * 100) + '%',\n      debtPct: Math.round(S.debt / 12000000 * 100) + '%',\n      sumAssured: this.fmt(sumAssured), roomLabel: this.fmt(room), lumpLabel: this.fmtShort(lump, th),\n      budgetRange: this.fmt(Math.round(S.income * 0.08 / 100) * 100) + ' – ' + this.fmt(Math.round(S.income * 0.14 / 100) * 100),\n      recs: sit ? sit.recs.map((r, i) => ({ key: 'r' + i, n: String(i + 1), title: th ? r.th : r.en, why: th ? r.wth : r.wen })) : [],",
      "      income: S.income, incomeLabel: this.fmt(S.income),\n      onIncome: (e) => this.setState({ income: Number(e.target.value) }),\n      deps: S.deps, depsLabel: supportYears + (th ? ' ปี' : (supportYears === 1 ? ' year' : ' years')),\n      onDeps: (e) => this.setState({ deps: Number(e.target.value) }),\n      debt: S.debt, debtLabel: S.debt === 0 ? (th ? 'ไม่มี' : 'None') : this.fmt(S.debt),\n      onDebt: (e) => this.setState({ debt: Number(e.target.value) }),\n      resources: S.resources, resourcesLabel: S.resources === 0 ? (th ? 'ไม่มี' : 'None') : this.fmt(S.resources),\n      onResources: (e) => this.setState({ resources: Number(e.target.value) }),\n      roomBenefit: S.roomBenefit, roomBenefitLabel: this.fmt(S.roomBenefit) + (th ? '/วัน' : '/day'),\n      onRoomBenefit: (e) => this.setState({ roomBenefit: Number(e.target.value) }),\n      recovery: S.recovery, recoveryLabel: S.recovery + (th ? ' เดือน' : (S.recovery === 1 ? ' month' : ' months')),\n      onRecovery: (e) => this.setState({ recovery: Number(e.target.value) }),\n      incomePct: Math.round((S.income - 15000) / (400000 - 15000) * 100) + '%',\n      depsPct: Math.round(S.deps / 4 * 100) + '%',\n      debtPct: Math.round(S.debt / 12000000 * 100) + '%',\n      resourcesPct: Math.round(S.resources / 12000000 * 100) + '%',\n      roomBenefitPct: Math.round(S.roomBenefit / 20000 * 100) + '%',\n      recoveryPct: Math.round((S.recovery - 3) / (24 - 3) * 100) + '%',\n      sumAssured: this.fmt(sumAssured), roomLabel: this.fmt(roomGap), lumpLabel: this.fmtShort(lump, th),\n      budgetRange: referenceLabel,\n      recs: sit ? sit.recs.map((r, i) => ({ key: 'r' + i, n: String(i + 1), title: th ? r.th : r.en, why: th ? r.wth : r.wen })) : [],"
    );

  if (!next.includes("mergeDeepDefaults(defaults, value)")) {
    next = next.replace(
      "  // Keeps persisted/local/remote configs aligned with the current schema without",
      `  mergeDeepDefaults(defaults, value) {
    if (Array.isArray(defaults)) return Array.isArray(value) ? clone(value) : clone(defaults);
    if (!defaults || typeof defaults !== 'object') return value === undefined ? defaults : value;
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const merged = clone(defaults);
    Object.keys(source).forEach((key) => { merged[key] = this.mergeDeepDefaults(defaults[key], source[key]); });
    return merged;
  }

  // Keeps persisted/local/remote configs aligned with the current schema without`
    );
  }
  if (!next.includes("reorderKnownLegacySections(sections)")) {
    next = next.replace(
      "  // Keeps persisted/local/remote configs aligned with the current schema without",
      `  reorderKnownLegacySections(sections) {
    if (!Array.isArray(sections)) return sections;
    const productOrder = ${JSON.stringify(PRODUCT_SECTION_ORDER)};
    const legacyOrder = ${JSON.stringify(LEGACY_SECTION_ORDER)};
    const currentOrder = sections.map(section => section && section.id).join('|');
    if (currentOrder !== legacyOrder.join('|')) return sections;
    const byId = new Map(sections.map(section => [section && section.id, section]));
    return productOrder.map(id => byId.get(id)).filter(Boolean);
  }

  storyTextChunks(item) {
    if (!item || typeof item !== 'object' || item.on === false) return [];
    const chunks = [];
    ['th', 'en'].forEach(lang => {
      const bucket = item[lang] || {};
      ['quote', 'body', 'title', 'value', 'label', 'meta'].forEach(field => {
        if (bucket[field]) chunks.push(String(bucket[field]));
      });
    });
    return chunks;
  }

  hasRealStoryContent(section) {
    const items = Array.isArray(section && section.items) ? section.items : [];
    const placeholderPattern = /รอความคิดเห็นจริง|เผยแพร่เมื่อได้รับอนุญาต|ความคิดเห็นจากลูกค้าจะเผยแพร่ที่นี่|ตัวอย่างโครงสร้าง|เสียงจากลูกค้า|ยังไม่ได้ใส่รีวิวจริง|ใส่คำรีวิวจริง|ชื่อลูกค้า|อาชีพ\\s*·\\s*ประกันที่ทำ|Awaiting real feedback|Published with permission|Client feedback will appear here|Placeholder structure|Customer voice|Customer name|Role\\s*·\\s*policy|sample review/i;
    return items.some(item => {
      const allText = this.storyTextChunks(item).join(' ').trim();
      if (!allText || placeholderPattern.test(allText)) return false;
      const meaningful = [];
      ['th', 'en'].forEach(lang => {
        const bucket = (item && item[lang]) || {};
        ['quote', 'body', 'title'].forEach(field => {
          if (bucket[field]) meaningful.push(String(bucket[field]));
        });
      });
      return meaningful.join(' ').trim().length >= 20;
    });
  }

  suppressPlaceholderStories(section) {
    if (!section || (section.id !== 'voices' && section.type !== 'stories' && section.type !== 'testimonials')) return;
    if (!this.hasRealStoryContent(section)) section.on = false;
  }

  // Keeps persisted/local/remote configs aligned with the current schema without`
    );
  }
  if (!next.includes("cfg.sections.forEach(section => this.suppressPlaceholderStories(section));")) {
    next = next.replace(
      "    sanitizeCmsControlsConfig(cfg);",
      "    cfg.sections.forEach(section => this.suppressPlaceholderStories(section));\n    sanitizeCmsControlsConfig(cfg);"
    );
  }
  next = next.replace(
    /const placeholderPattern = \/[^\n]+\/i;/,
    "const placeholderPattern = /รอความคิดเห็นจริง|เผยแพร่เมื่อได้รับอนุญาต|ความคิดเห็นจากลูกค้าจะเผยแพร่ที่นี่|ตัวอย่างโครงสร้าง|เสียงจากลูกค้า|ยังไม่ได้ใส่รีวิวจริง|ใส่คำรีวิวจริง|ชื่อลูกค้า|อาชีพ\\s*·\\s*ประกันที่ทำ|Awaiting real feedback|Published with permission|Client feedback will appear here|Placeholder structure|Customer voice|Customer name|Role\\s*·\\s*policy|sample review/i;"
  );
  next = next.replace(
    "        if (!s.cols) s.cols = def.cols;\n        ['th', 'en'].forEach(lang => { s[lang] = Object.assign(clone(def[lang] || {}), s[lang] || {}); });",
    "        if (!s.cols) s.cols = def.cols;\n        if (def.calculator) s.calculator = this.mergeDeepDefaults(def.calculator, s.calculator);\n        ['th', 'en'].forEach(lang => { s[lang] = Object.assign(clone(def[lang] || {}), s[lang] || {}); });"
  );
  if (!next.includes("['cta1href', 'cta2href', 'claimHref'].forEach")) {
    const source = "        if (def.calculator) s.calculator = this.mergeDeepDefaults(def.calculator, s.calculator);\n        ['th', 'en'].forEach(lang => { s[lang] = Object.assign(clone(def[lang] || {}), s[lang] || {}); });";
    const target = "        if (def.calculator) s.calculator = this.mergeDeepDefaults(def.calculator, s.calculator);\n        ['cta1href', 'cta2href', 'claimHref'].forEach(key => { if (def[key] && !s[key]) s[key] = def[key]; });\n        ['th', 'en'].forEach(lang => { s[lang] = Object.assign(clone(def[lang] || {}), s[lang] || {}); });";
    if (!next.includes(source)) throw new Error("CTA fallback normalization anchor not found.");
    next = next.replace(source, target);
  }
  return next;
}

function applyNeedsCalculatorTemplate(template) {
  let next = template;
  if (!next.includes("เงินสำรอง + ทุนเดิม")) {
    const debtBlock = `            <label style="display:flex;flex-direction:column;gap:var(--space-1)">
              <span style="display:flex;justify-content:space-between;align-items:baseline;gap:var(--space-2)">
                <span style="font-size:14px;font-weight:600"><sc-if value="{{ th }}" hint-placeholder-val="{{ true }}">หนี้คงเหลือ บ้าน + รถ</sc-if><sc-if value="{{ en }}" hint-placeholder-val="{{ false }}">Outstanding debt</sc-if></span>
                <span data-noedit="" style="font-family:'Google Sans','Google Sans Thai','Noto Sans Thai',system-ui,sans-serif;font-size:19px;color:{{ s.muted }};white-space:nowrap">{{ debtLabel }}</span>
              </span>
              <input type="range" min="0" max="12000000" step="250000" value="{{ debt }}" sc-camel-on-change="{{ onDebt }}" style="--fill:{{ debtPct }}">
            </label>`;
    const extraFields = `${debtBlock}
            <label style="display:flex;flex-direction:column;gap:var(--space-1)">
              <span style="display:flex;justify-content:space-between;align-items:baseline;gap:var(--space-2)">
                <span style="font-size:14px;font-weight:600"><sc-if value="{{ th }}" hint-placeholder-val="{{ true }}">เงินสำรอง + ทุนเดิม</sc-if><sc-if value="{{ en }}" hint-placeholder-val="{{ false }}">Liquid assets + existing cover</sc-if></span>
                <span data-noedit="" style="font-family:'Google Sans','Google Sans Thai','Noto Sans Thai',system-ui,sans-serif;font-size:19px;color:{{ s.muted }};white-space:nowrap">{{ resourcesLabel }}</span>
              </span>
              <input type="range" min="0" max="12000000" step="250000" value="{{ resources }}" sc-camel-on-change="{{ onResources }}" style="--fill:{{ resourcesPct }}">
            </label>
            <label style="display:flex;flex-direction:column;gap:var(--space-1)">
              <span style="display:flex;justify-content:space-between;align-items:baseline;gap:var(--space-2)">
                <span style="font-size:14px;font-weight:600"><sc-if value="{{ th }}" hint-placeholder-val="{{ true }}">ค่าห้องในกรมธรรม์เดิม</sc-if><sc-if value="{{ en }}" hint-placeholder-val="{{ false }}">Current room benefit</sc-if></span>
                <span data-noedit="" style="font-family:'Google Sans','Google Sans Thai','Noto Sans Thai',system-ui,sans-serif;font-size:19px;color:{{ s.muted }};white-space:nowrap">{{ roomBenefitLabel }}</span>
              </span>
              <input type="range" min="0" max="20000" step="500" value="{{ roomBenefit }}" sc-camel-on-change="{{ onRoomBenefit }}" style="--fill:{{ roomBenefitPct }}">
            </label>
            <label style="display:flex;flex-direction:column;gap:var(--space-1)">
              <span style="display:flex;justify-content:space-between;align-items:baseline;gap:var(--space-2)">
                <span style="font-size:14px;font-weight:600"><sc-if value="{{ th }}" hint-placeholder-val="{{ true }}">ระยะพักฟื้นที่ต้องมีเงินรองรับ</sc-if><sc-if value="{{ en }}" hint-placeholder-val="{{ false }}">Recovery period to fund</sc-if></span>
                <span data-noedit="" style="font-family:'Google Sans','Google Sans Thai','Noto Sans Thai',system-ui,sans-serif;font-size:19px;color:{{ s.muted }};white-space:nowrap">{{ recoveryLabel }}</span>
              </span>
              <input type="range" min="3" max="24" step="3" value="{{ recovery }}" sc-camel-on-change="{{ onRecovery }}" style="--fill:{{ recoveryPct }}">
            </label>`;
    if (!next.includes(debtBlock)) throw new Error("Needs calculator debt field block not found.");
    next = next.replace(debtBlock, extraFields);
  }

  return next
    .replaceAll("2 · ตัวเลขคร่าว ๆ ของคุณ", "2 · ข้อมูลสำหรับคำนวณเบื้องต้น")
    .replaceAll("2 · Your rough numbers", "2 · Inputs for the first estimate")
    .replaceAll("รายได้ต่อเดือน", "ค่าใช้จ่ายจำเป็นต่อเดือน")
    .replaceAll("Monthly income", "Essential monthly spending")
    .replaceAll("คนที่พึ่งพารายได้คุณ", "ต้องดูแลต่ออีกกี่ปี")
    .replaceAll("People depending on you", "Years of support")
    .replaceAll("หนี้คงเหลือ บ้าน + รถ", "หนี้และภาระอนาคต")
    .replaceAll("Outstanding debt", "Debts and future obligations")
    .replaceAll("เลือกช่วงชีวิตหนึ่งข้อ แล้วผลลัพธ์จะขึ้นตรงนี้", "เลือกช่วงชีวิตหนึ่งข้อ แล้วปรับตัวเลขด้านซ้ายเพื่อดูฐานคุ้มครองเบื้องต้น")
    .replaceAll("Pick one of the four and your result appears here.", "Pick a situation, then adjust the inputs to see a starting estimate.")
    .replaceAll("ทุนประกันชีวิตที่ควรมี", "ทุนชีวิตที่ควรเริ่มจาก")
    .replaceAll("Life cover you should carry", "Life need starting point")
    .replaceAll("ค่าห้องที่เหมาะ", "ส่วนต่างค่าห้องอ้างอิง")
    .replaceAll("Room rate", "Reference room gap")
    .replaceAll("วงเงินเหมาจ่าย", "เงินก้อนโรคร้ายแรง")
    .replaceAll("Health limit", "CI recovery buffer")
    .replaceAll("งบเบี้ยรวมที่ยังสบาย ๆ ต่อเดือน", "แหล่งข้อมูลอ้างอิง")
    .replaceAll("Comfortable total premium / month", "Reference source")
    .replaceAll("เรียงลำดับที่ควรทำก่อน", "ข้อที่ควรตรวจต่อ")
    .replaceAll("In the order I would do it", "What to review next");
}

function applyVisualHierarchyTuning(template) {
  return template.replaceAll(
    "max-width:12ch;font-size:clamp(36px,4.25vw,58px);line-height:1.16",
    "max-width:13ch;font-size:clamp(34px,3.65vw,54px);line-height:1.14"
  );
}

function applyGuidesFaqTypeMatch(template) {
  const css = `<style id="covermate-guides-font-scale">
  #guides summary > div:last-child,
  #guides summary > div:last-child span,
  #guides summary [style*="font-size: clamp(19px"],
  #guides summary [style*="font-size:clamp(19px"] {
    font-size: 16.5px !important;
    font-weight: 700 !important;
    line-height: 1.45 !important;
    letter-spacing: 0 !important;
  }
  #guides details > div {
    font-size: clamp(14px, 1.05vw, 15px) !important;
    line-height: 1.65 !important;
  }
  #guides summary span[data-noedit] {
    font-size: 12px !important;
  }
  #guides summary > div:first-child > span:not([data-noedit]) {
    font-size: 11px !important;
    letter-spacing: .08em !important;
  }
  @media (max-width: 560px) {
    #guides summary > div:last-child,
    #guides summary > div:last-child span,
    #guides summary [style*="font-size: clamp(19px"],
    #guides summary [style*="font-size:clamp(19px"] {
      font-size: 16.5px !important;
    }
    #guides details > div {
      font-size: 13.5px !important;
    }
  }
</style>`;
  return template.replace(
    /<style id="covermate-guides-font-scale">[\s\S]*?<\/style>/,
    css
  );
}

function applyHomeMotorPageLink(template) {
  if (template.includes("data-home-motor-page-link")) return template;
  const source = `          <p style="margin:0;font-size:16px;line-height:1.55;color:{{ s.muted }};max-width:52ch;text-wrap:balance">{{ s.body }}</p>
        </div>
        <div data-reveal="1" style="background:var(--color-bg);border-radius:var(--radius-lg);padding:clamp(20px,3vw,40px)">`;
  const target = `          <p style="margin:0;font-size:16px;line-height:1.55;color:{{ s.muted }};max-width:52ch;text-wrap:balance">{{ s.body }}</p>
          <sc-if value="{{ s.hasCta1 }}" hint-placeholder-val="{{ true }}">
            <a data-home-motor-page-link="" href="{{ s.cta1href }}" style="display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:46px;margin-top:var(--space-2);padding:0 21px;border-radius:999px;background:{{ A_base }};color:#fff;text-decoration:none;font-weight:800;box-shadow:var(--shadow-sm);transition:transform .2s ease, background .2s ease" style-hover="background:{{ A_mid }};color:#fff;transform:translateY(-1px)" style-active="transform:translateY(0)">{{ s.cta1 }} <svg sc-camel-view-box="0 0 24 24" style="width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg></a>
          </sc-if>
        </div>
        <div data-reveal="1" style="background:var(--color-bg);border-radius:var(--radius-lg);padding:clamp(20px,3vw,40px)">`;
  if (!template.includes(source)) throw new Error("Home motor page link insertion anchor not found.");
  return template.replace(source, target);
}

function applyMobileStickySectionFix(template) {
  const css = `<style id="covermate-mobile-sticky-section-fix">
  @media (max-width: 899px) {
    section [style*="position:sticky"][style*="top:96px"],
    section [style*="position: sticky"][style*="top: 96px"] {
      position: static !important;
      top: auto !important;
    }
  }
</style>`;
  const existing = /<style id="covermate-mobile-sticky-section-fix">[\s\S]*?<\/style>/;
  if (existing.test(template)) return template.replace(existing, css);
  const anchor = '<style id="covermate-owner-dock-ui">';
  if (!template.includes(anchor)) throw new Error("Mobile sticky section fix anchor not found.");
  return template.replace(anchor, () => `${css}\n${anchor}`);
}

function updateLocal(target, th, en) {
  target.th = th;
  target.en = en;
}

function byId(config, id) {
  const section = config.sections.find((entry) => entry.id === id);
  if (!section) throw new Error(`Missing section: ${id}`);
  return section;
}

function applyKnownSectionOrderMigration(config) {
  if (!Array.isArray(config.sections)) return;
  const currentOrder = config.sections.map((section) => section && section.id).join("|");
  if (currentOrder !== LEGACY_SECTION_ORDER.join("|")) return;
  const bySectionId = new Map(config.sections.map((section) => [section && section.id, section]));
  config.sections = PRODUCT_SECTION_ORDER.map((id) => bySectionId.get(id)).filter(Boolean);
}

function applyCopy(config) {
  applyKnownSectionOrderMigration(config);
  config.header.nav = [
    { label: { th: "ความคุ้มครอง", en: "Cover" }, href: "#cover" },
    { label: { th: "ตรวจกรมธรรม์", en: "Policy review" }, href: "#review" },
    { label: { th: "ประกันรถยนต์", en: "Motor" }, href: "#insurers" },
    { label: { th: "เครื่องมือ", en: "Resources" }, href: "#fit" },
    { label: { th: "คำถามที่พบบ่อย", en: "FAQ" }, href: "#faq" }
  ];
  config.header.cta = { th: "ติดต่อทาง LINE", en: "Contact on LINE" };
  config.seo = config.seo && typeof config.seo === "object" ? config.seo : {};
  config.seo.title = { ...PUBLIC_SEO_TITLE };
  config.seo.description = { ...PUBLIC_SEO_DESCRIPTION };
  config.footer.tagline = {
    th: "ประกันชีวิต สุขภาพ และรถยนต์ · ให้คำปรึกษาโดยไม่มีค่าใช้จ่าย",
    en: "Life, health and motor insurance · consultation at no charge"
  };

  const hero = byId(config, "hero");
  hero.th = {
    kicker: "ปรึกษาเบื้องต้นโดยไม่มีค่าใช้จ่าย · กรุงเทพฯ",
    title: "เรื่องความเสี่ยง\nไม่จำเป็นต้องจัดการเพียงลำพัง",
    body: "ประกันชีวิตและสุขภาพดำเนินการผ่าน AIA ส่วนประกันรถยนต์ เราเปรียบเทียบความคุ้มครองและเบี้ยประกันจากบริษัทประกันภัย 14 แห่ง เพื่อช่วยให้คุณเลือกความคุ้มครองที่เหมาะสม โดยไม่เสนอเกินความจำเป็น",
    cta1: "ติดต่อเราทาง LINE",
    cta2: "ประเมินความคุ้มครอง",
    note: "เราตอบกลับทุกข้อความด้วยตนเองภายในเวลาทำการ",
    claimText: "เกิดอุบัติเหตุอยู่ตอนนี้ โทร 1669 ก่อนเสมอ แล้วค่อยติดต่อเรา",
    claimLinkText: "ดูขั้นตอนเมื่อเกิดเหตุ"
  };
  hero.en = {
    kicker: "Complimentary consultation · Bangkok",
    title: "You do not have to\nmanage risk alone",
    body: "For life and health insurance, we arrange cover through AIA. For motor insurance, we compare options from 14 insurers to help you choose suitable protection without unnecessary extras.",
    cta1: "Contact us on LINE",
    cta2: "Estimate your cover",
    note: "We respond personally to every message during business hours.",
    claimText: "In an accident right now, call 1669 first, then contact us",
    claimLinkText: "See the accident guide"
  };
  hero.claimHref = "#claim";

  const trust = byId(config, "trust");
  updateLocal(trust.items[0], { label: "แนะนำตามความจำเป็น" }, { label: "Advice based on your needs" });
  updateLocal(trust.items[1], { label: "ประกันชีวิตและสุขภาพผ่าน AIA" }, { label: "AIA life and health cover" });
  updateLocal(trust.items[2], { label: "ติดต่อสะดวกทาง LINE" }, { label: "Easy to reach on LINE" });
  updateLocal(trust.items[3], { label: "ดูแลต่อเนื่องถึงการเคลม" }, { label: "Support through claims" });

  const cover = byId(config, "cover");
  cover.th = {
    kicker: "สิ่งที่เราดูแลให้ได้",
    title: "ความคุ้มครอง\nที่เราช่วยจัดให้ได้",
    body: "ประกันชีวิตและสุขภาพดำเนินการผ่าน AIA ส่วนประกันรถยนต์ให้บริการในฐานะนายหน้า หากคุณมีกรมธรรม์อยู่แล้ว เรายินดีช่วยตรวจสอบความคุ้มครองที่อาจซ้ำซ้อนหรือส่วนที่อาจยังขาด โดยไม่มีค่าใช้จ่าย"
  };
  cover.en = {
    kicker: "What we can arrange",
    title: "The cover we can\narrange",
    body: "Life and health insurance is arranged through AIA, while motor insurance is handled in a broker capacity. If you already have cover, we can review it for potential gaps or overlap at no charge."
  };
  updateLocal(cover.items[0], {
    title: "ประกันชีวิต",
    sub: "ตัวแทน AIA · ครอบครัว ออม เกษียณ",
    b1: "แบบตลอดชีพและชั่วระยะเวลา สำหรับผู้ที่มีคนพึ่งพารายได้ของคุณ",
    b2: "แบบสะสมทรัพย์และบำนาญสามารถใช้สิทธิลดหย่อนภาษีได้ตามเงื่อนไขที่กฎหมายกำหนด",
    b3: "โรคร้ายแรงจ่ายผลประโยชน์เป็นเงินก้อนเมื่อตรวจพบโรคที่อยู่ภายใต้ความคุ้มครอง",
    note: "ไม่รวมแบบประกันควบการลงทุน (ยูนิตลิงก์)"
  }, {
    title: "Life",
    sub: "AIA agent · family, savings, retirement",
    b1: "Whole-life and term cover for people whose family depends on their income.",
    b2: "Savings and annuity plans may qualify for tax deductions, subject to applicable rules.",
    b3: "Critical illness benefits pay a lump sum when a covered illness is diagnosed.",
    note: "Unit-linked plans are not offered."
  });
  updateLocal(cover.items[1], {
    title: "ประกันสุขภาพ",
    sub: "ตัวแทน AIA · เหมาจ่าย โรคร้ายแรง ชดเชย",
    b1: "แบบเหมาจ่ายด้วยวงเงินรวม ช่วยลดข้อจำกัดจากการกำหนดวงเงินย่อยในแต่ละรายการ",
    b2: "เลือกค่าห้องให้สอดคล้องกับโรงพยาบาลที่คุณมีแนวโน้มใช้จริง",
    b3: "ค่าชดเชยรายวันช่วยรองรับรายได้ที่อาจหายไประหว่างพักรักษาตัว"
  }, {
    title: "Health",
    sub: "AIA agent · lump-sum, CI, income",
    b1: "Aggregate-limit plans can reduce the restrictions created by item-by-item caps.",
    b2: "Room benefits should match the hospitals you are likely to use.",
    b3: "Daily cash benefits can help replace income while you are recovering."
  });
  updateLocal(cover.items[2], {
    title: "โรคร้ายแรง",
    sub: "ตัวแทน AIA · จ่ายก้อนเมื่อตรวจเจอ",
    b1: "รับผลประโยชน์เป็นเงินก้อนเมื่อตรวจพบโรคที่อยู่ภายใต้ความคุ้มครอง โดยไม่ต้องใช้ใบเสร็จค่ารักษาในการเบิกผลประโยชน์",
    b2: "ความคุ้มครองครอบคลุมกลุ่มโรคสำคัญ เช่น มะเร็ง หลอดเลือดสมอง และหัวใจ ตามเงื่อนไขของแบบประกัน",
    b3: "ช่วยรองรับค่าใช้จ่ายหรือรายได้ที่อาจหายไประหว่างการรักษาและพักฟื้น"
  }, {
    title: "Critical illness",
    sub: "AIA agent · lump sum on diagnosis",
    b1: "A lump-sum benefit is paid when a covered illness is diagnosed, without requiring medical receipts for that benefit.",
    b2: "Cover can include major illness groups such as cancer, stroke and heart conditions, subject to plan terms.",
    b3: "It can help with expenses or lost income during treatment and recovery."
  });
  updateLocal(cover.items[3], {
    title: "อุบัติเหตุส่วนบุคคล",
    sub: "ตัวแทน AIA · คุ้มครอง 24 ชม.",
    b1: "คุ้มครองอุบัติเหตุตลอด 24 ชั่วโมง ทั้งที่ทำงาน บนถนน หรือที่บ้าน",
    b2: "รองรับค่ารักษาจากอุบัติเหตุ ผลประโยชน์จากการบาดเจ็บ และทุพพลภาพถาวรตามเงื่อนไขกรมธรรม์",
    b3: "เบี้ยประกันโดยทั่วไปเข้าถึงได้ง่ายและขั้นตอนการสมัครไม่ซับซ้อน เหมาะสำหรับผู้ที่ต้องการเริ่มต้นความคุ้มครองอุบัติเหตุ"
  }, {
    title: "Personal accident",
    sub: "AIA agent · 24-hour protection",
    b1: "Accident cover applies around the clock, whether at work, on the road or at home.",
    b2: "It can support medical expenses, injury benefits and permanent disability benefits, subject to policy terms.",
    b3: "Premiums are generally accessible and the application process is straightforward for first accident cover."
  });
  updateLocal(cover.items[4], {
    title: "บำนาญ",
    sub: "ตัวแทน AIA · รายได้ยามเกษียณ",
    b1: "เปลี่ยนเงินออมเป็นรายได้ประจำในวัยเกษียณตามรูปแบบและเงื่อนไขของแผน",
    b2: "สามารถใช้สิทธิลดหย่อนภาษีเพิ่มเติมได้ตามเพดานและเงื่อนไขของกรมสรรพากร",
    b3: "เริ่มวางแผนเร็วช่วยให้มีเวลาสะสมทุนและจัดระดับรายได้ในอนาคตได้เป็นระบบขึ้น"
  }, {
    title: "Annuity",
    sub: "AIA agent · income for retirement",
    b1: "Turns savings into scheduled retirement income according to the plan structure.",
    b2: "May qualify for additional tax deductions, subject to Revenue Department limits and conditions.",
    b3: "Starting earlier gives more time to build capital and plan future income."
  });
  updateLocal(cover.items[5], {
    title: "ประกันรถยนต์",
    sub: "ชั้น 1–3 · พ.ร.บ.",
    b1: "ในฐานะนายหน้า เราสามารถเปรียบเทียบข้อเสนอสำหรับรถคันเดียวกันจากบริษัทประกันภัย 14 แห่งในรอบเดียว",
    b2: "ครอบคลุมภาคสมัครใจชั้น 1–3 และ พ.ร.บ. พร้อมช่วยพิจารณาทุนประกันและค่าเสียหายส่วนแรกให้เหมาะกับการใช้รถ",
    b3: "ช่วยเตือนต่ออายุล่วงหน้าและจัดทำข้อมูลเปรียบเทียบใหม่ให้พิจารณาในแต่ละปี"
  }, {
    title: "Motor insurance",
    sub: "Class 1–3 · compulsory",
    b1: "As a broker, we can compare options for the same vehicle across 14 insurers in one review.",
    b2: "Voluntary Class 1–3 and compulsory cover can be reviewed with suitable sums insured and excess levels.",
    b3: "We help with renewal reminders and provide a fresh comparison each year."
  });

  const review = byId(config, "review");
  review.th = {
    kicker: "ไม่มีค่าใช้จ่าย · ไม่ต้องย้ายบริษัท",
    title: "ส่งกรมธรรม์เดิมมา\nเราช่วยตรวจให้โดยไม่มีค่าใช้จ่าย",
    body: "ส่งภาพหน้าตารางกรมธรรม์ทาง LINE โดยไม่ต้องกรอกแบบฟอร์ม เราจะช่วยตรวจสอบว่าปัจจุบันมีความคุ้มครองอะไรอยู่ มีส่วนใดที่อาจยังขาดหรือซ้ำซ้อน และสรุปประเด็นสำคัญกลับให้เป็นภาษาที่เข้าใจง่าย",
    cta1: "ส่งกรมธรรม์ทาง LINE",
    note: "หากความคุ้มครองเดิมของคุณเหมาะสมอยู่แล้ว เราจะแจ้งให้ทราบอย่างตรงไปตรงมา และจะไม่แนะนำให้เปลี่ยนหรือยกเลิกกรมธรรม์เดิมโดยไม่มีเหตุผลที่เหมาะสม"
  };
  review.en = {
    kicker: "No charge · no need to switch",
    title: "Send us your existing policy\nfor a complimentary review",
    body: "Send a clear photograph of the policy schedule on LINE. We will review your existing benefits, identify potential gaps or overlap, and return a concise summary in plain language.",
    cta1: "Send your policy on LINE",
    note: "If your existing cover is already suitable, we will say so clearly. We will not recommend replacing a good policy without an appropriate reason."
  };
  updateLocal(review.items[0], {
    title: "ส่งอะไรมา",
    body: "หน้าตารางกรมธรรม์ที่แสดงทุนประกันและความคุ้มครอง ไม่ว่าจะเป็นรถ ชีวิต หรือสุขภาพ ถ่ายด้วยมือถือให้ชัดเจนก็เพียงพอ"
  }, {
    title: "What to send",
    body: "The schedule page showing sums insured and benefits for motor, life or health cover. A clear phone photograph is enough."
  });
  updateLocal(review.items[1], {
    title: "เราตรวจอะไรให้",
    body: "ทุนประกันสัมพันธ์กับภาระจริงหรือไม่ ค่าห้องเหมาะกับโรงพยาบาลที่คุณใช้หรือเปล่า มีความคุ้มครองซ้ำซ้อนตรงไหน และมีส่วนใดที่ยังอาจขาด"
  }, {
    title: "What we review",
    body: "Whether sums insured match your obligations, whether room benefits fit the hospital you use, where policies may overlap, and where protection may still be missing."
  });
  updateLocal(review.items[2], {
    title: "ได้อะไรกลับ",
    body: "สรุปเป็นภาษาที่เข้าใจง่าย ว่าประเด็นใดควรพิจารณาก่อน เรื่องใดรอได้ และจุดใดที่ยังเหมาะสมอยู่แล้ว"
  }, {
    title: "What you receive",
    body: "A plain-language summary of what to consider first, what can wait, and what already appears suitable."
  });

  const fit = byId(config, "fit");
  fit.th = {
    kicker: "เครื่องมือและข้อมูลที่เป็นประโยชน์",
    title: "ประเมินความต้องการ\nคุ้มครองเบื้องต้น",
    body: "เครื่องมือนี้แยกการประเมินเป็นสามส่วน: ทุนชีวิตจากค่าใช้จ่ายจำเป็นและปีที่ครอบครัวต้องพึ่งพา, ส่วนต่างค่าห้องอ้างอิงจากข้อมูลโรงพยาบาลที่มีแหล่งที่มา, และเงินก้อนสำหรับช่วงพักฟื้นจากโรคร้ายแรง",
    note: "อ้างอิงชุดข้อมูล 2026-08-15-v0.1 และวิธีคำนวณที่แยกชีวิต สุขภาพ และโรคร้ายแรงออกจากกัน ตัวเลขเป็นจุดเริ่มต้นในการคุย ไม่ใช่ใบเสนอราคา คำแนะนำเฉพาะบุคคล หรือค่าใช้จ่ายที่ต้องจ่ายแน่นอน"
  };
  fit.en = {
    kicker: "Tools and useful resources",
    title: "Estimate your\nstarting protection need",
    body: "This tool separates the estimate into three parts: life cover from essential spending and support years, a hospital room-gap reference with source provenance, and a recovery buffer for critical illness.",
    note: "Based on reference dataset 2026-08-15-v0.1 and methodology that keeps life, health and critical illness separate. The result is a discussion starting point, not a quotation, personalised advice, or a guaranteed out-of-pocket amount."
  };
  fit.calculator = JSON.parse(JSON.stringify(NEEDS_CALCULATOR));

  const how = byId(config, "how");
  how.th.kicker = "ทำงานกันอย่างไร";
  how.en.kicker = "How it works";
  updateLocal(how.items[0], {
    title: "ติดต่อทาง LINE",
    body: "ส่งคำถามที่ต้องการทราบมาได้เลย ไม่ต้องเตรียมเอกสาร และไม่มีข้อผูกมัดในการดำเนินการต่อ"
  }, {
    title: "Contact us on LINE",
    body: "Send us the question you would like to discuss. There is nothing to prepare and no obligation to proceed."
  });
  updateLocal(how.items[1], {
    title: "พูดคุยเบื้องต้น",
    body: "พูดคุยเรื่องรายได้ ภาระ และสิ่งที่คุณให้ความสำคัญ เพื่อประเมินระดับความคุ้มครองที่เหมาะสม"
  }, {
    title: "Initial consultation",
    body: "We discuss your income, obligations and priorities to understand what level of cover may be appropriate."
  });
  updateLocal(how.items[2], {
    title: "เปรียบเทียบทางเลือก",
    body: "เราจัดทำข้อมูลเปรียบเทียบ พร้อมอธิบายความแตกต่างของความคุ้มครอง เบี้ยประกัน และเงื่อนไขสำคัญ"
  }, {
    title: "Compare the options",
    body: "We prepare a clear comparison and explain the differences in cover, premium and key conditions."
  });
  updateLocal(how.items[3], {
    title: "ดูแลต่อเนื่อง",
    body: "เราช่วยประสานงานเรื่องการต่ออายุ การแก้ไขกรมธรรม์ และการเคลมกับบริษัทประกันภัยอย่างต่อเนื่อง"
  }, {
    title: "Ongoing service",
    body: "We assist with renewals, policy changes and claim coordination throughout the policy term."
  });

  const insurers = byId(config, "insurers");
  insurers.th = {
    kicker: "ประกันรถยนต์ · ในฐานะนายหน้า",
    title: "ประกันรถยนต์\nเปรียบเทียบได้ 14 แห่ง",
    body: "สำหรับประกันรถยนต์ เราสามารถเปรียบเทียบข้อเสนอจากบริษัทประกันภัย 14 แห่ง เพื่อพิจารณาทางเลือกที่เหมาะสมกับคุณ ส่วนประกันชีวิตและสุขภาพดำเนินการผ่าน AIA",
    cta1: "ดูหน้าประกันรถยนต์โดยเฉพาะ"
  };
  insurers.en = {
    kicker: "Motor insurance · as a broker",
    title: "Motor insurance\ncompared across 14 insurers",
    body: "For motor insurance, we compare options from 14 insurers. Life and health insurance is arranged through AIA.",
    cta1: "Open the dedicated motor page"
  };
  insurers.cta1href = "/motor";
  if (Array.isArray(insurers.cards) && insurers.cards[0]) {
    updateLocal(insurers.cards[0], {
      ...(insurers.cards[0].th || {}),
      body: "ใบอนุญาตตัวแทนประกันชีวิตเลขที่ 6401006221 · ประกันชีวิตและสุขภาพ เราดูแลในฐานะตัวแทน AIA โดยตรง กรมธรรม์ออกโดย AIA"
    }, {
      ...(insurers.cards[0].en || {}),
      body: "Life agent licence No. 6401006221 · Life and health insurance is handled directly as an AIA agent. Policies are issued by AIA."
    });
  }
  if (Array.isArray(insurers.cards) && insurers.cards[1]) {
    updateLocal(insurers.cards[1], {
      ...(insurers.cards[1].th || {}),
      body: "ใบอนุญาตนายหน้าประกันวินาศภัยเลขที่ ว00287/2534 · เราเสนอและจัดเบี้ยประกันรถยนต์ในฐานะนายหน้าภายใต้ศรีกรุงโบรคเกอร์ กรมธรรม์ออกโดยบริษัทประกันที่คุณเลือก"
    }, {
      ...(insurers.cards[1].en || {}),
      body: "Non-life broker licence No. ว00287/2534 · Motor insurance is proposed and placed in a broker capacity under Srikrung Broker. Policies are issued by the insurer you choose."
    });
  }

  const tiers = byId(config, "tiers");
  tiers.th.body = "ตารางนี้ช่วยให้เห็นความแตกต่างโดยทั่วไปของประกันรถยนต์แต่ละชั้น โดยเฉพาะความคุ้มครองรถของผู้เอาประกัน ภัยธรรมชาติ และเงื่อนไขที่ต้องตรวจสอบก่อนเลือก";
  tiers.th.note = "ตารางนี้เป็นภาพรวมของความคุ้มครองทั่วไป วงเงิน เงื่อนไข และข้อยกเว้นแตกต่างกันตามกรมธรรม์ของแต่ละบริษัท ก่อนตัดสินใจ เราสามารถช่วยตรวจสอบเงื่อนไขจริงของแผนที่คุณสนใจได้โดยไม่มีค่าใช้จ่าย";
  tiers.en.body = "This table shows the general differences between motor insurance classes, especially cover for your own vehicle, natural disasters and conditions to review before choosing.";
  tiers.en.note = "This table is a general overview. Limits, conditions and exclusions vary by insurer and policy. We can review the actual policy wording with you before you decide, at no charge.";
  updateLocal(tiers.items[0], { ...tiers.items[0].th, value: "เหมาะสำหรับรถใหม่ หรือผู้ขับขี่ที่ต้องการความคุ้มครองกว้างกว่าโดยรวม" }, { ...tiers.items[0].en, value: "Suitable for newer vehicles or drivers seeking broader overall protection" });
  updateLocal(tiers.items[1], { ...tiers.items[1].th, value: "เหมาะสำหรับรถมูลค่าปานกลางที่ต้องการสมดุลระหว่างความคุ้มครองและเบี้ยประกัน" }, { ...tiers.items[1].en, value: "Suitable for mid-value cars where premium and protection need to be balanced" });
  updateLocal(tiers.items[2], { ...tiers.items[2].th, value: "เหมาะกับรถที่ต้องการเน้นความคุ้มครองรถหายหรือไฟไหม้มากกว่าความเสียหายจากการชน" }, { ...tiers.items[2].en, value: "Suitable when theft or fire is the main concern rather than collision damage" });
  updateLocal(tiers.items[3], { ...tiers.items[3].th, value: "ช่วยลดเบี้ยประกัน โดยยังมีความคุ้มครองบางส่วนเมื่อชนกับคู่กรณีที่ระบุได้" }, { ...tiers.items[3].en, value: "A lower-premium option with partial own-car cover when the other vehicle is identified" });
  updateLocal(tiers.items[4], { ...tiers.items[4].th, value: "เหมาะกับรถใช้งานมานาน หรือรถที่มูลค่าไม่สูงและต้องการความคุ้มครองพื้นฐาน" }, { ...tiers.items[4].en, value: "Suitable for older or lower-value cars where basic protection is enough" });

  const claim = byId(config, "claim");
  claim.th = {
    kicker: "เก็บหน้านี้ไว้ · สำหรับกรณีเกิดอุบัติเหตุ",
    title: "เกิดอุบัติเหตุ\nทำอะไรก่อน",
    body: "เมื่อเกิดอุบัติเหตุ การจัดลำดับสิ่งที่ต้องทำอาจไม่ง่าย เราจึงสรุปขั้นตอนสำคัญไว้ให้ทำตามทีละข้อ จากนั้นสามารถติดต่อเราเพื่อช่วยประสานงานกับบริษัทประกันภัยต่อได้",
    note: "หากไม่แน่ใจว่าควรดำเนินการอย่างไร สามารถติดต่อเราเพื่อสอบถามขั้นตอนเบื้องต้นได้โดยไม่มีค่าใช้จ่าย แม้ยังไม่ได้เป็นลูกค้าของ CoverMate"
  };
  claim.en = {
    kicker: "Keep this page · for accident situations",
    title: "An accident just\nhappened — do this",
    body: "In an accident, it can be hard to decide what to do first. We have set out the key steps in order, then you can contact us for help coordinating with the insurer.",
    note: "If you are unsure what to do, you can contact us for initial guidance at no charge, even if you are not yet a CoverMate client."
  };
  updateLocal(claim.items[0], claim.items[0].th, { title: "People before cars", body: "Anyone hurt? Call 1669 immediately. Move the car out of live traffic if it can be moved, turn hazards on, set a warning triangle and avoid standing in the road." });
  updateLocal(claim.items[1], claim.items[1].th, { title: "Photograph before moving", body: "Take photos showing both vehicles in position, the other plate, all visible damage, and a wide view of the road and traffic signals." });
  updateLocal(claim.items[2], claim.items[2].th, { title: "Notify the insurer", body: "Call the hotline shown on your policy with the policy number and location, then wait for the surveyor or claim slip. Avoid settling in cash at the roadside." });
  updateLocal(claim.items[3], {
    title: "ส่งเอกสารให้เรา",
    body: "ส่งภาพถ่ายและใบเคลมทาง LINE เราจะช่วยติดตามและประสานงานกับบริษัทประกันภัยในประเด็นที่เกี่ยวข้อง เช่น อู่ซ่อม รถใช้ระหว่างซ่อม และค่าเสียหายส่วนแรกตามเงื่อนไขกรมธรรม์"
  }, {
    title: "Send the documents to us",
    body: "Send the photos and claim slip on LINE. We can help follow up and coordinate with the insurer on relevant issues such as garages, courtesy cars and excess amounts under the policy conditions."
  });

  const renew = byId(config, "renew");
  renew.th = {
    kicker: "เตือนล่วงหน้า · ยกเลิกได้ทุกเมื่อ",
    title: "ไม่ต้องกังวลเรื่องวันหมดอายุ\nให้เราช่วยเตือนล่วงหน้า",
    body: "แจ้งประเภทกรมธรรม์และเดือนที่หมดอายุไว้กับเรา เราจะเตือนล่วงหน้า 60 วัน และสำหรับประกันรถยนต์จะช่วยเปรียบเทียบข้อเสนอใหม่เพื่อให้คุณพิจารณาว่าควรต่ออายุที่เดิมหรือเปลี่ยนทางเลือก โดยยังไม่ต้องส่งเอกสารในขั้นตอนนี้",
    note: "เราใช้ข้อมูลนี้เพื่อแจ้งเตือนเฉพาะเรื่องที่คุณขอ ไม่ส่งโปรโมชั่น และคุณสามารถยกเลิกการแจ้งเตือนได้ทุกเมื่อ"
  };
  renew.en = {
    kicker: "Advance reminders · stop any time",
    title: "Let us keep track of\nyour renewal dates",
    body: "Tell us the policy type and expiry month. We will remind you 60 days in advance and, for motor insurance, provide a fresh comparison for the coming renewal. No documents are required at this stage.",
    note: "We use the information only for the reminders you request. We do not send promotional messages, and you can stop reminders at any time."
  };
  updateLocal(renew.items[0], {
    title: "เตือน 60 วันก่อน",
    body: "มีเวลาพอสำหรับเปรียบเทียบข้อเสนอ ต่ออายุ หรือเปลี่ยนบริษัทประกันโดยไม่เร่งรีบ"
  }, {
    title: "Sixty days ahead",
    body: "Enough time to compare options, renew or switch insurers without rushing."
  });
  updateLocal(renew.items[1], {
    title: "มาพร้อมข้อมูลใหม่",
    body: "สำหรับประกันรถยนต์ เราจะช่วยเปรียบเทียบข้อเสนอใหม่ในแต่ละปี เพราะราคาและเงื่อนไขอาจเปลี่ยนได้"
  }, {
    title: "With updated options",
    body: "For motor insurance, we can compare fresh offers each year because premiums and conditions may change."
  });
  updateLocal(renew.items[2], {
    title: "ใช้ข้อมูลเท่าที่จำเป็น",
    body: "เริ่มจากประเภทกรมธรรม์ เดือนที่หมดอายุ และช่องทางติดต่อ โดยยังไม่ต้องส่งเลขกรมธรรม์หรือเลขบัตรประชาชน"
  }, {
    title: "Only necessary data",
    body: "We start with the policy type, expiry month and contact channel. No policy number or ID card number is needed at this stage."
  });

  const guides = byId(config, "guides");
  guides.th = {
    kicker: "อ่านก่อนตัดสินใจ",
    title: "สี่เรื่องที่ควรรู้\nก่อนเลือกประกัน",
    body: "สรุปประเด็นสำคัญที่มักถูกมองข้าม เพื่อช่วยให้คุณตั้งคำถามและตรวจสอบเงื่อนไขก่อนตัดสินใจ"
  };
  guides.en = {
    kicker: "Read before you decide",
    title: "Four things to know\nbefore choosing cover",
    body: "Key points that are often missed, written to help you ask better questions and review conditions before deciding."
  };
  updateLocal(guides.items[0], {
    label: "สุขภาพ",
    meta: "อ่าน 2 นาที",
    title: "ค่าห้องที่เลือกไว้ อาจไม่พอกับโรงพยาบาลที่คุณจะไปจริง",
    body: "เวลาซื้อประกันสุขภาพ หลายคนเลือกค่าห้องตามเบี้ยที่จ่ายไหว แต่เมื่อป่วยจริง เรามักเลือกโรงพยาบาลที่ใกล้บ้านหรือแพทย์ที่ไว้วางใจ ไม่ใช่โรงพยาบาลที่ค่าห้องพอดีกับกรมธรรม์\n\nวิธีตรวจง่าย ๆ คือดูค่าห้องเดี่ยวต่อคืนของโรงพยาบาลที่คุณมีแนวโน้มใช้ แล้วเทียบกับตัวเลขในกรมธรรม์ หากกรมธรรม์ให้ 4,000 บาท แต่ค่าห้องจริง 6,500 บาท ส่วนต่าง 2,500 บาทต่อคืนอาจเป็นค่าใช้จ่ายที่ผู้เอาประกันต้องรับผิดชอบเอง ทั้งนี้ขึ้นอยู่กับเงื่อนไขกรมธรรม์\n\nแบบเหมาจ่ายด้วยวงเงินรวมช่วยลดข้อจำกัดจากการเพิ่มค่าห้องทีละขั้น เพราะไม่ต้องแยกดูวงเงินย่อยของแต่ละรายการมากเท่าเดิม"
  }, {
    label: "Health",
    meta: "2 min read",
    title: "Your room benefit may not match the hospital you would actually use",
    body: "When buying health insurance, many people choose a room benefit around the premium they can afford. But when illness happens, you usually choose the hospital near home or the doctor you trust, not the hospital whose room rate happens to match your policy.\n\nA simple check is to look up the private room rate at the hospital you are likely to use, then compare it with the figure on your policy. If the policy pays ฿4,000 and the room is ฿6,500, the ฿2,500 difference per night may be your responsibility, depending on policy terms.\n\nAn aggregate-limit plan can address this more directly than increasing the room benefit one step at a time, because fewer item-by-item caps need to be checked."
  });
  updateLocal(guides.items[1], {
    label: "รถยนต์",
    meta: "อ่าน 2 นาที",
    title: "ชั้น 3+ ไม่ได้คุ้มครองทุกการชน และนี่คือจุดที่มักพลาด",
    body: "ประกันชั้น 3+ คุ้มครองความเสียหายต่อรถของคุณเมื่อชนกับ “ยานพาหนะทางบกที่มีคู่กรณีระบุได้” เงื่อนไขนี้สั้น แต่ตัดหลายเหตุการณ์ออกไป\n\nชนเสาไฟ ชนขอบทาง ถอยชนกำแพงบ้าน ชนสัตว์ที่วิ่งตัดหน้า หรือคู่กรณีหลบหนีและไม่สามารถระบุได้ อาจไม่เข้าเงื่อนไขความคุ้มครองรถของผู้เอาประกัน ส่วนความเสียหายต่อคู่กรณียังเป็นอีกเงื่อนไขหนึ่งตามกรมธรรม์\n\nหากรถยังผ่อนอยู่ หรือเป็นรถคันหลักที่ใช้ทำงาน ส่วนต่างเบี้ยระหว่างชั้น 3+ กับชั้น 1 อาจน้อยกว่าค่าซ่อมครั้งเดียวที่ต้องรับผิดชอบเอง ควรเปรียบเทียบตัวเลขจริงก่อนตัดสินใจ"
  }, {
    label: "Motor",
    meta: "2 min read",
    title: "Class 3+ does not cover every collision — here is the common gap",
    body: "Class 3+ covers damage to your car when it collides with an identified land vehicle. That condition is short, but it excludes many situations.\n\nHitting a lamp post, kerb or wall, striking an animal, or being hit by a driver who cannot be identified may fall outside own-car damage cover. Third-party liability is assessed under its own policy conditions.\n\nIf the car is still financed or is essential for work, the premium gap between Class 3+ and Class 1 may be smaller than one repair bill you would otherwise pay yourself. It is worth comparing the actual numbers before deciding."
  });
  updateLocal(guides.items[2], {
    label: "ชีวิต",
    meta: "อ่าน 2 นาที",
    title: "ทุนประกันชีวิตควรสะท้อนภาระทางการเงินและระยะเวลาที่ครอบครัวต้องพึ่งพารายได้",
    body: "คำถามที่ตอบง่ายกว่า “ควรทำทุนเท่าไหร่” คือ “ถ้ารายได้หายไปพรุ่งนี้ คนที่บ้านต้องใช้เวลานานแค่ไหนก่อนยืนได้ด้วยตัวเอง”\n\nนำค่าใช้จ่ายบ้านต่อเดือนคูณจำนวนเดือนที่ต้องการดูแลต่อ บวกหนี้ที่ยังเหลือ เช่น บ้าน รถ และค่าเรียนของลูกที่ยังต้องจ่าย ตัวเลขนี้คือฐานสำหรับพิจารณาทุนประกัน ไม่จำเป็นต้องเป็นเลขกลมหรือเลขสวย\n\nหลายคนที่คำนวณแบบนี้พบว่าทุนเดิมอาจยังไม่พอ แต่ก็อาจพบว่าแบบชั่วระยะเวลา (term) ช่วยเติมส่วนที่ขาดได้ด้วยเบี้ยที่เข้าถึงได้กว่าที่คิด"
  }, {
    label: "Life",
    meta: "2 min read",
    title: "A life sum assured should reflect debt and the time your family needs support",
    body: "A more useful starting question is: if household income stopped tomorrow, how long would the family need before standing on its own?\n\nTake the household’s monthly costs, multiply by the number of months to protect, then add outstanding debts such as mortgage, car finance and future education costs. That figure is the starting point for the sum assured. It does not need to be round.\n\nMany people who calculate this way find their existing cover may be short, but term cover can often fill the gap for a more accessible premium than expected."
  });
  updateLocal(guides.items[3], {
    label: "ภาษี",
    meta: "อ่าน 1 นาที",
    title: "สิทธิลดหย่อนประกันมีสองกลุ่มหลัก คนมักใช้ไม่ครบ",
    body: "เบี้ยประกันชีวิตทั่วไปลดหย่อนได้ถึง 100,000 บาท และเบี้ยประกันสุขภาพตนเองรวมอยู่ในเพดานนี้ได้ไม่เกิน 25,000 บาท\n\nประกันบำนาญเป็นอีกกลุ่มหนึ่งที่แยกออกมา ลดหย่อนเพิ่มได้ถึง 200,000 บาท โดยไม่เกิน 15% ของเงินได้ และเมื่อรวมกับ RMF กองทุนสำรองเลี้ยงชีพ และ กบข. ต้องไม่เกิน 500,000 บาท\n\nผู้ที่ใช้สิทธิ 100,000 บาทเต็มแล้วและยังต้องการวางแผนภาษีเพิ่มเติม มักไม่รู้ว่าสิทธิบำนาญยังอาจเหลืออยู่ ตัวเลขและเงื่อนไขของแต่ละปีควรตรวจสอบกับกรมสรรพากรก่อนยื่นภาษี"
  }, {
    label: "Tax",
    meta: "1 min read",
    title: "Insurance-related tax deductions fall into two main categories",
    body: "Ordinary life premiums are deductible up to ฿100,000, and your own health premiums can be included within that ceiling up to ฿25,000.\n\nAnnuity cover sits in a separate category: a further ฿200,000, capped at 15% of income and at ฿500,000 when combined with RMF and provident-fund contributions.\n\nPeople who have already used the ฿100,000 allowance and still want additional tax planning often do not realise the annuity allowance may remain available. Confirm the current-year figures and conditions with the Revenue Department before filing."
  });

  const voices = byId(config, "voices");
  voices.on = false;
  voices.th = {
    kicker: "ประสบการณ์จากลูกค้า",
    title: "ความคิดเห็นจากลูกค้า",
    body: "เราจะเผยแพร่ความคิดเห็นจากลูกค้าที่ได้รับอนุญาตให้นำมาใช้ โดยไม่เปิดเผยข้อมูลส่วนบุคคลเกินความจำเป็น",
    note: "ความคิดเห็นและผลลัพธ์ของแต่ละกรณีแตกต่างกัน และไม่ถือเป็นการรับประกันผลลัพธ์สำหรับกรณีอื่น"
  };
  voices.en = {
    kicker: "Client experiences",
    title: "What clients say",
    body: "Client feedback will be published here only with permission and with appropriate protection of personal information.",
    note: "Individual experiences and outcomes vary and do not guarantee the same result in another case."
  };
  voices.items.forEach((item) => {
    item.th = {
      label: "รอความคิดเห็นจริง",
      value: "เผยแพร่เมื่อได้รับอนุญาต",
      valueNote: "ไม่เปิดเผยข้อมูลเกินจำเป็น",
      title: "ความคิดเห็นจากลูกค้าจะเผยแพร่ที่นี่เมื่อได้รับอนุญาต",
      body: "เราจะไม่ใช้ชื่อ รูปภาพ หรือรายละเอียดส่วนบุคคลโดยไม่ได้รับความยินยอม",
      meta: "ตัวอย่างโครงสร้าง"
    };
    item.en = {
      label: "Awaiting real feedback",
      value: "Published with permission",
      valueNote: "Personal details protected",
      title: "Client feedback will appear here once permission is granted.",
      body: "We will not use names, photographs or personal details without consent.",
      meta: "Placeholder structure"
    };
  });

  const about = byId(config, "about");
  about.th.body = "CoverMate เกิดขึ้นจากการเห็นว่าหลายคนเพิ่งพบในวันที่ต้องใช้สิทธิหรือเคลมว่า ความคุ้มครองที่มีไม่ตรงกับสิ่งที่เข้าใจไว้ เราจึงให้ความสำคัญกับการอธิบายทางเลือก เงื่อนไข และข้อจำกัดให้ชัดเจน เพื่อให้คุณมีข้อมูลเพียงพอก่อนตัดสินใจ\n\nประกันชีวิตและสุขภาพดำเนินการผ่าน AIA ส่วนประกันรถยนต์ให้บริการในฐานะนายหน้า โดยเปรียบเทียบทางเลือกจากบริษัทประกันภัยตามความเหมาะสม";
  about.en.body = "CoverMate was created after seeing how often people discover, only when they need to claim, that their cover does not match what they understood. Our approach is to explain options, conditions and limitations clearly so you have enough information before deciding.\n\nFor life and health insurance, we arrange cover through AIA. For motor insurance, we act in a broker capacity and compare suitable insurer options.";

  const faq = byId(config, "faq");
  updateLocal(faq.items[0], {
    q: "ต้องจ่ายค่าที่ปรึกษาให้ CoverMate ไหม",
    a: "ไม่มีค่าที่ปรึกษาเพิ่มเติมจาก CoverMate ค่าตอบแทนในการให้บริการมาจากบริษัทประกันภัยเมื่อมีการออกกรมธรรม์ โดยเบี้ยประกันเป็นไปตามอัตราและเงื่อนไขของบริษัทประกันภัย"
  }, {
    q: "Does CoverMate charge a consultation fee?",
    a: "No additional consultation fee is charged by CoverMate. Compensation comes from the insurer when a policy is issued, and premiums follow the insurer’s filed rates and conditions."
  });
  updateLocal(faq.items[1], {
    q: "มีประกันอยู่แล้ว ย้ายมาให้ดูแลได้ไหม",
    a: "สำหรับประกันรถยนต์สามารถเปลี่ยนนายหน้าได้เมื่อต่ออายุ ส่วนประกันชีวิตที่มีอยู่แล้วยังคงอยู่กับตัวแทนเดิม แต่เราสามารถช่วยตรวจทานกรมธรรม์เดิมให้โดยไม่มีค่าใช้จ่าย"
  }, {
    q: "Can existing cover be transferred for review?",
    a: "For motor insurance, the broker can usually be changed at renewal. Existing life policies remain with the original agent, but we can review them for gaps or overlap at no charge."
  });
  updateLocal(faq.items[2], {
    q: "จะถูกติดต่อซ้ำ ๆ หรือไม่",
    a: "เราจะให้ข้อมูลที่เกี่ยวข้องและให้คุณตัดสินใจตามจังหวะของคุณ หากยังไม่ประสงค์ดำเนินการต่อ เราจะไม่ติดต่อเพื่อติดตามการขาย เว้นแต่คุณขอให้เราแจ้งเตือน"
  }, {
    q: "Will CoverMate follow up repeatedly?",
    a: "We provide the relevant information and let you decide at your own pace. If you prefer not to proceed, we will not follow up for sales unless you ask for a reminder."
  });
  updateLocal(faq.items[3], {
    q: "เบี้ยผ่าน CoverMate แพงกว่าซื้อออนไลน์ไหม",
    a: "เบี้ยประกันเป็นไปตามอัตราและเงื่อนไขของบริษัทประกันภัย การใช้บริการผ่าน CoverMate ไม่มีค่าที่ปรึกษาเพิ่มเติม และเราช่วยเปรียบเทียบเงื่อนไขให้ก่อนตัดสินใจ"
  }, {
    q: "Is it more expensive than buying online?",
    a: "Premiums follow the insurer’s rates and conditions. Using CoverMate adds no separate consultation fee, and we help compare the conditions before you decide."
  });
  updateLocal(faq.items[4], {
    q: "เคลมยากไหม ถ้าเคลมแล้วไม่ได้ล่ะ",
    a: "เมื่อเกิดการเคลม เราช่วยตรวจสอบเอกสารและประสานงานกับบริษัทประกันภัยตามขั้นตอน หากมีการปฏิเสธการเคลม เราสามารถช่วยตรวจสอบเหตุผลและประสานงานเรื่องการทบทวนหรืออุทธรณ์ตามช่องทางที่เกี่ยวข้อง"
  }, {
    q: "What if a claim gets refused?",
    a: "When a claim occurs, we can help check documents and coordinate with the insurer through the required process. If a claim is refused, we can review the reason and help with the relevant review or appeal channel."
  });

  const fees = byId(config, "fees");
  fees.th = {
    kicker: "โครงสร้างค่าตอบแทน · อธิบายอย่างชัดเจน",
    title: "ค่าตอบแทนในการให้บริการ\nมาจากไหน",
    body: "ความโปร่งใสเรื่องค่าตอบแทนเป็นส่วนสำคัญของการให้คำแนะนำ เราจึงอธิบายไว้ล่วงหน้าว่าค่าตอบแทนในการให้บริการมาจากช่องทางใด",
    note: "เบี้ยประกันเป็นอัตราที่บริษัทประกันภัยยื่นและได้รับความเห็นชอบจาก คปภ. การใช้บริการผ่าน CoverMate ไม่มีค่าที่ปรึกษาเพิ่มเติม"
  };
  fees.en = {
    kicker: "Compensation structure · explained clearly",
    title: "Where our\nservice compensation comes from",
    body: "Transparency about compensation is part of giving trustworthy advice. We explain in advance how CoverMate is compensated for the service.",
    note: "Premiums are filed with and approved by the OIC. Using CoverMate adds no separate consultation fee."
  };
  updateLocal(fees.cards[0], {
    kicker: "คุณจ่าย",
    title: "เบี้ยประกัน",
    body: "ชำระเบี้ยประกันให้บริษัทประกันภัยโดยตรง โดยไม่มีค่าที่ปรึกษาแยกต่างหากจาก CoverMate"
  }, {
    kicker: "You pay",
    title: "The premium",
    body: "Premiums are paid to the insurer directly, with no separate advisory fee from CoverMate."
  });
  updateLocal(fees.cards[1], {
    kicker: "บริษัทประกันภัยจ่าย",
    title: "ค่าตอบแทนการให้บริการ",
    body: "บริษัทประกันภัยเป็นผู้จ่ายค่าตอบแทนตามโครงสร้างของผลิตภัณฑ์ ซึ่งรวมอยู่ในอัตราเบี้ยประกันตามเงื่อนไขที่เกี่ยวข้อง"
  }, {
    kicker: "The insurer pays",
    title: "Service compensation",
    body: "The insurer pays compensation according to the product structure, already reflected in the applicable premium rate."
  });
  updateLocal(fees.cards[2], {
    kicker: "แปลว่า",
    title: "ไม่มีค่าที่ปรึกษาเพิ่ม",
    body: "การใช้บริการผ่าน CoverMate ไม่มีค่าที่ปรึกษาเพิ่มเติม และเรายังคงช่วยดูแลเรื่องการต่ออายุและการประสานงานเมื่อเกิดการเคลม"
  }, {
    kicker: "Which means",
    title: "No extra advisory fee",
    body: "Using CoverMate adds no separate advisory fee, while we continue helping with renewals and claim coordination."
  });
  updateLocal(fees.items[0], {
    label: "ทำไมถึงต่างกันในแต่ละแบบ",
    value: "โครงสร้างค่าตอบแทนแตกต่างกันตามประเภทผลิตภัณฑ์และเงื่อนไขของบริษัทประกันภัย เราอธิบายให้ชัดเจนเมื่อเกี่ยวข้องกับการตัดสินใจ"
  }, {
    label: "Why it differs by product",
    value: "Compensation structures differ by product type and insurer conditions. We explain this clearly when it is relevant to your decision."
  });
  updateLocal(fees.items[1], {
    label: "สิ่งที่เรายึดถือ",
    value: "เราไม่แนะนำผลิตภัณฑ์เพียงเพราะให้ค่าตอบแทนสูงกว่า หากไม่เหมาะกับความต้องการของคุณ และไม่เร่งรัดการตัดสินใจด้วยแรงกดดันจากโปรโมชั่น"
  }, {
    label: "What we stand by",
    value: "We do not recommend a higher-paying product if it is not suitable for your needs, and we do not rush decisions with promotion pressure."
  });
  updateLocal(fees.items[2], {
    label: "สอบถามได้โดยตรง",
    value: "หากต้องการทราบโครงสร้างค่าตอบแทนของแบบประกันที่เสนอ สามารถสอบถามเราได้โดยตรง"
  }, {
    label: "Ask directly",
    value: "If you want to understand the compensation structure for a proposed plan, you can ask us directly."
  });
  updateLocal(fees.items[3], {
    label: "ถ้าไม่ดำเนินการต่อ",
    value: "การตรวจกรมธรรม์เดิม ตอบคำถาม หรือช่วยดูขั้นตอนเบื้องต้นเมื่อเกิดการเคลม ไม่มีค่าใช้จ่าย และเราจะไม่ติดตามการขายหากคุณไม่ได้ขอ"
  }, {
    label: "If you do not proceed",
    value: "Reviewing an existing policy, answering questions or helping with initial claim steps is at no charge, and we will not follow up for sales unless you ask us to."
  });

  const privacy = byId(config, "privacy");
  privacy.th = {
    kicker: "พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล",
    title: "ข้อมูลที่คุณส่งให้เรา\nถูกนำไปใช้อย่างไร",
    body: "เราแจ้งรายละเอียดการใช้ข้อมูลไว้ก่อนที่คุณจะส่งข้อมูล เพื่อให้ทราบว่าข้อมูลใดถูกเก็บ ใช้เพื่อวัตถุประสงค์ใด และอาจถูกส่งต่อให้ใครบ้าง",
    note: "หากต้องการขอเข้าถึง แก้ไข หรือลบข้อมูล สามารถติดต่อเราทาง LINE หรือโทรศัพท์ได้ เราจะดำเนินการตามระยะเวลาที่กฎหมายกำหนด"
  };
  privacy.en = {
    kicker: "Thai PDPA",
    title: "How we use\nthe information you provide",
    body: "We explain how information is used before you send it, so you know what is collected, why it is used, and who it may be shared with.",
    note: "To request access, correction or deletion of your personal data, contact us by LINE or telephone. We will process the request within the period required by law."
  };
  updateLocal(privacy.items[0], {
    label: "เก็บอะไร",
    value: "ชื่อที่ให้เรียก ช่องทางติดต่อ และข้อมูลที่คุณเลือกแจ้ง เช่น อายุ รายได้โดยประมาณ หรือกรมธรรม์ที่ถืออยู่"
  }, {
    label: "What is collected",
    value: "The name you provide, how to reach you, and information you choose to share, such as age, approximate income or policies held."
  });
  updateLocal(privacy.items[1], {
    label: "ใช้ทำอะไร",
    value: "ใช้เพื่อตอบคำถาม ตรวจสอบความต้องการ และจัดทำทางเลือกหรือใบเสนอราคาตามที่คุณขอ"
  }, {
    label: "What it is used for",
    value: "To answer questions, understand your needs, and prepare options or quotations you request."
  });
  updateLocal(privacy.items[2], {
    label: "ส่งต่อให้ใคร",
    value: "ส่งให้บริษัทประกันภัยหรือผู้ประมวลผลที่เกี่ยวข้องเฉพาะเมื่อจำเป็นต่อการขอใบเสนอราคา การสมัคร หรือการดำเนินการตามที่คุณยินยอม"
  }, {
    label: "Who it is shared with",
    value: "Shared with the relevant insurer or processor only when needed for a quotation, application or action you consent to."
  });

  const talk = byId(config, "talk");
  talk.th = {
    kicker: "ติดต่อเรา",
    title: "ขอรับคำปรึกษา",
    body: "แจ้งชื่อและเรื่องที่ต้องการทราบ เราจะตอบกลับพร้อมข้อมูลที่เกี่ยวข้องและทางเลือกที่ชัดเจน โดยไม่มีค่าใช้จ่ายและไม่มีข้อผูกมัด",
    note: "หากไม่สะดวกกรอกแบบฟอร์ม สามารถติดต่อเราทาง LINE ได้โดยตรง"
  };
  talk.en = {
    kicker: "Contact us",
    title: "Request a consultation",
    body: "Leave your name and let us know what you would like to discuss. We will respond with clear, relevant information and available options, with no consultation fee or obligation.",
    note: "You can also contact us directly on LINE."
  };

  return config;
}

const assetVersion = assetVersionFromCurrentHtml();
const html = readBaseHtml();
const templateParts = extractTemplate(html);
const dcScript = extractDcScript(templateParts.template);
const guardedScriptSource = applyRuntimeCopyGuards(dcScript.source);
const config = applyCopy(extractDefaults(guardedScriptSource));
const nextDefaults = `const DEFAULTS = ${asScriptLiteral(config)};\n\n`;
const nextScriptSource = guardedScriptSource.replace(
  /const DEFAULTS = [\s\S]*?\n\nconst SCHEMA =/,
  () => `${nextDefaults}const SCHEMA =`
);
const nextDcScript = dcScript.fullMatch.replace(dcScript.source, () => nextScriptSource);
const nextTemplate = applySeoMetadata(applyMobileStickySectionFix(applyHomeMotorPageLink(applyGuidesFaqTypeMatch(applyVisualHierarchyTuning(applyNeedsCalculatorTemplate(applyRuntimeCopyGuards(
  templateParts.template.replace(dcScript.fullMatch, () => nextDcScript)
)))))));
const nextTemplateJson = serializeBundlerTemplate(nextTemplate);
const rebuiltHtml = `${html.slice(0, templateParts.start)}${BUNDLER_TEMPLATE_OPEN}${nextTemplateJson}</script>\n</body>\n</html>\n`;
const nextHtml = applySeoMetadata(applyOuterAssetVersion(
  rebuiltHtml,
  assetVersion
));

fs.writeFileSync(indexPath, nextHtml);
console.log(`Updated visitor CMS defaults in ${indexPath}`);
