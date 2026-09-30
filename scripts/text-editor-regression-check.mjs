import assert from "node:assert/strict";
import vm from "node:vm";

import { buildVisitorRuntime } from "./lib/visitor-source.mjs";
import contract from "../covermate-contract.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function section(config, id) {
  const found = (config.sections || []).find((item) => item && item.id === id);
  assert.ok(found, `missing section ${id}`);
  return found;
}

const runtime = buildVisitorRuntime();
const sandbox = {
  result: null,
  console,
  URLSearchParams,
  URL,
  setTimeout,
  clearTimeout,
  requestAnimationFrame: (fn) => fn(),
  window: {
    CoverMateContract: contract,
    location: { protocol: "http:", pathname: "/", search: "", hash: "", origin: "http://localhost", href: "http://localhost/" },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  document: {
    querySelectorAll: () => [],
    querySelector: () => null,
    documentElement: { setAttribute: () => {}, removeAttribute: () => {} },
    body: null,
    head: { querySelector: () => null, appendChild: () => {} },
    createElement: () => ({ setAttribute: () => {}, remove: () => {} })
  },
  DCLogic: class {
    setState(update, callback) {
      const patch = typeof update === "function" ? update(this.state || {}) : update;
      this.state = Object.assign({}, this.state || {}, patch || {});
      if (callback) callback();
    }
  }
};

vm.runInNewContext(
  `${runtime}\nresult = { Component, DEFAULTS, CMS_CONTENT_FIELDS, ensureRepeatableIds, validRepeatableId, isSemanticCopyPath };`,
  sandbox
);

const { Component, DEFAULTS, ensureRepeatableIds, validRepeatableId, isSemanticCopyPath } = sandbox.result;
const app = new Component();
app.readJSON = () => null;
app.writeJSON = () => {};
app.queueRemoteDraft = () => {};
app.state = Object.assign({}, app.state, { lang: "th", site: app.normalizeConfig(clone(DEFAULTS), { repeatableIds: true }) });

const fakeElement = {
  textContent: "Original text",
  closest: selector => selector === '[data-content-path]' ? { getAttribute: () => 'sections.@hero.th.kicker' } : null,
  attrs: {},
  classList: {
    contains: () => false,
    add: () => {},
    remove: () => {}
  },
  setAttribute(name, value) {
    this.attrs[name] = String(value);
  },
  removeAttribute(name) {
    delete this.attrs[name];
  }
};

app.textOv = { "cms:sections.@hero.th.kicker": "" };
app.eachEditable = (callback) => callback(fakeElement, "hero:0:th");
app.applyText();

assert.equal(fakeElement.textContent, "", "empty inline override must persist instead of reverting to default text");
assert.equal(fakeElement.attrs["data-om-empty"], "true", "empty inline field must remain visibly editable in edit mode");
assert.ok(fakeElement.attrs["data-empty-label"].includes("ว่าง"), "Thai empty placeholder label missing");
const sanitizedEmpty = app.sanitizeTextOverrides({ "hero:0:th": "" });
assert.equal(Object.prototype.hasOwnProperty.call(sanitizedEmpty, "hero:0:th"), true, "sanitizer dropped an intentional empty-string key");
assert.equal(sanitizedEmpty["hero:0:th"], "", "sanitizer changed an intentional empty string");

const contactApp = new Component();
contactApp.readJSON = () => null;
contactApp.writeJSON = () => {};
contactApp.queueRemoteDraft = () => {};
contactApp.state = Object.assign({}, contactApp.state, {
  lang: "th", site: contactApp.normalizeConfig(clone(DEFAULTS), { repeatableIds: true })
});
contactApp.state.site.contact.lineUrl = "https://line.me/R/ti/p/@original";
contactApp.state.site.contact.facebookUrl = "https://www.facebook.com/original-page";
const scalarContactPaths = ["contact.lineId", "contact.facebookName", "contact.phone", "contact.email"];
const contactCopyElement = path => ({
  closest: selector => selector === "[data-cms-copy]" ? { getAttribute: () => path } : null
});
for (const lang of ["th", "en"]) {
  contactApp.state.lang = lang;
  for (const field of sandbox.result.CMS_CONTENT_FIELDS.filter(field=>field.localized)) {
    for (const attr of ['data-content-path','data-cms-copy']) for (const input of [field.path,field.path+'.'+lang]) {
      const element={closest:selector=>selector==='['+attr+']'?{getAttribute:()=>input}:null};
      assert.equal(contactApp.cmsCopyPath(element),field.path+'.'+lang,`${attr} resolves registered field ${input}`);
    }
  }
  for (const path of scalarContactPaths) {
    assert.equal(isSemanticCopyPath(contactApp.state.site, path), true, `${path} must be canonical scalar copy`);
    assert.equal(contactApp.cmsCopyPath(contactCopyElement(path)), path, `${lang} must edit the same scalar ${path}`);
    assert.equal(isSemanticCopyPath(contactApp.state.site, `${path}.${lang}`), false, `${path} must not gain a language bucket`);
  }
  assert.equal(contactApp.cmsCopyPath(contactCopyElement("contact.hours")), `contact.hours.${lang}`, "localized contact copy must retain its language bucket");
  for (const path of ["contact.lineUrl", "contact.facebookUrl", "contact.whatsapp", "seo.image"]) {
    assert.equal(isSemanticCopyPath(contactApp.state.site, path), false, `${path} is not inline scalar copy`);
    assert.equal(contactApp.cmsCopyPath(contactCopyElement(path)), "", `arbitrary config path ${path} must not become editable copy`);
  }
}
const unchangedText=JSON.stringify(contactApp.textOv || {});
contactApp.saveInlineText({closest:()=>null,textContent:'+',getAttribute:()=> 'review:8:th'},true);
assert.equal(JSON.stringify(contactApp.textOv || {}),unchangedText,'Unowned glyphs cannot create positional overrides');
contactApp.textOv = {
  "cms:contact.lineId": "@edited-line",
  "cms:contact.facebookName": "Edited Facebook name",
  "cms:contact.phone": "+66 (0)81abc-234-5678",
  "cms:contact.email": " owner+inline@covermate.test ",
  "cms:contact.lineUrl": "https://line.me/R/ti/p/@unintended",
  "cms:contact.facebookUrl": "https://www.facebook.com/unintended-page"
};
const pendingContact = contactApp.pendingInlineConfig();
assert.equal(pendingContact.contact.lineId, "@edited-line", "pending inline LINE ID must reach canonical config");
assert.equal(pendingContact.contact.facebookName, "Edited Facebook name", "pending inline Facebook name must reach canonical config");
for (const key of ["lineUrl", "facebookUrl"]) {
  assert.equal(pendingContact.contact[key], contactApp.state.site.contact[key], `inline copy must preserve ${key}`);
}
contactApp.save(pendingContact);
assert.equal(contactApp.state.site.contact.lineId, "@edited-line", "save must preserve the edited LINE ID");
assert.equal(contactApp.state.site.contact.facebookName, "Edited Facebook name", "save must preserve the edited Facebook name");
assert.equal(contactApp.state.site.contact.lineUrl, "https://line.me/R/ti/p/@original", "saved LINE label must not alter its URL");
assert.equal(contactApp.state.site.contact.facebookUrl, "https://www.facebook.com/original-page", "saved Facebook label must not alter its URL");
assert.equal(contactApp.state.site.contact.phone, "+66 (0)81-234-5678", "inline phone must use the existing phone sanitizer");
assert.equal(contactApp.state.site.contact.email, "owner+inline@covermate.test", "inline email must use the existing email sanitizer");
contactApp.textOv = { "cms:contact.phone": "invalid telephone", "cms:contact.email": "not an email" };
contactApp.save(contactApp.pendingInlineConfig());
assert.equal(contactApp.state.site.contact.phone, "", "invalid inline phone must not bypass canonical validation");
assert.equal(contactApp.state.site.contact.email, "", "invalid inline email must not bypass canonical validation");

const faq = section(app.state.site, "faq");
const beforeLength = faq.items.length;
const firstId = faq.items[0].id;
assert.equal(validRepeatableId(firstId), true, "fixture item id must be durable");

app.removeRepeatable("faq", "items", firstId, 0);
const hiddenFaq = section(app.state.site, "faq");
assert.equal(hiddenFaq.items.length, beforeLength, "hide must not delete the repeatable item");
assert.equal(hiddenFaq.items[0].id, firstId, "hide must preserve item identity");
assert.equal(hiddenFaq.items[0].on, false, "hide must mark the item as not visible");

app.restoreRepeatable("faq", "items", firstId, 0);
const restoredFaq = section(app.state.site, "faq");
assert.equal(restoredFaq.items.length, beforeLength, "restore must not duplicate the repeatable item");
assert.equal(restoredFaq.items[0].id, firstId, "restore must preserve item identity");
assert.equal(restoredFaq.items[0].on, true, "restore must make the item visible again");

app.duplicateRepeatable("faq", "items", firstId, 0);
const duplicatedFaq = section(app.state.site, "faq");
assert.equal(duplicatedFaq.items.length, beforeLength + 1, "duplicate should add one item");
assert.notEqual(duplicatedFaq.items[1].id, firstId, "duplicate must receive a new durable id");

section(app.state.site, "fit").on = false;
section(app.state.site, "claim").on = false;
section(app.state.site, "privacy").on = false;
section(app.state.site, "talk").on = false;
const hiddenTargetRender = app.renderVals();
const hiddenTargetNavHrefs = hiddenTargetRender.navItems.map((item) => item.href);
assert.equal(hiddenTargetNavHrefs.includes("#fit"), false, "nav still links to hidden fit section");
assert.equal(hiddenTargetNavHrefs.includes("#claim"), false, "nav still links to hidden claim section");
assert.equal(hiddenTargetNavHrefs.includes("#privacy"), false, "nav still links to hidden privacy section");
const heroRender = hiddenTargetRender.sections.find((item) => item && item.id === "hero");
assert.ok(heroRender, "hero render state missing");
assert.equal(heroRender.hasCta2, false, "hero secondary CTA still links to hidden fit section");
assert.equal(heroRender.showHeroClaim, false, "hero claim prompt still links to hidden claim section");
assert.equal(hiddenTargetRender.showTalkAnchor, false, "calculator CTA still links to hidden talk section");
assert.equal(hiddenTargetRender.showPrivacyAnchor, false, "inline privacy links still point to hidden privacy section");
assert.equal(hiddenTargetRender.showFooterPrivacyNav, false, "footer privacy nav still points to hidden privacy section");
section(app.state.site, "fit").on = true;
section(app.state.site, "hero").cta2href = "";
assert.equal(app.renderVals().sections.find(item => item.id === "hero").hasCta2, false, "Intentional blank CTA destination must hide the link");

console.log(JSON.stringify({
  checks: [
    "empty inline override preserved",
    "empty edit placeholder state retained",
    "text sanitizer keeps intentional blank",
    "TH/EN scalar contact copy uses one canonical path and preserves localized hours",
    "scalar contact saves preserve link destinations and phone/email sanitization",
    "arbitrary config paths remain excluded from inline copy",
    "repeatable hide/restore is reversible",
    "repeatable duplicate keeps identity safe",
    "section-target CTAs disappear when their target section is hidden"
  ],
  hiddenItemId: firstId,
  duplicatedItemId: duplicatedFaq.items[1].id
}, null, 2));
