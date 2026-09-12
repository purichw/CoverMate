import assert from "node:assert/strict";
import vm from "node:vm";

import { buildVisitorRuntime } from "./lib/visitor-source.mjs";

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
  setTimeout,
  clearTimeout,
  requestAnimationFrame: (fn) => fn(),
  window: {
    location: { protocol: "http:", pathname: "/", search: "", hash: "", origin: "http://localhost" },
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
  `${runtime}\nresult = { Component, DEFAULTS, ensureRepeatableIds, validRepeatableId };`,
  sandbox
);

const { Component, DEFAULTS, ensureRepeatableIds, validRepeatableId } = sandbox.result;
const app = new Component();
app.readJSON = () => null;
app.writeJSON = () => {};
app.queueRemoteDraft = () => {};
app.state = Object.assign({}, app.state, { lang: "th", site: ensureRepeatableIds(clone(DEFAULTS)) });

const fakeElement = {
  textContent: "Original text",
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

app.textOv = { "hero:0:th": "" };
app.eachEditable = (callback) => callback(fakeElement, "hero:0:th");
app.applyText();

assert.equal(fakeElement.textContent, "", "empty inline override must persist instead of reverting to default text");
assert.equal(fakeElement.attrs["data-om-empty"], "true", "empty inline field must remain visibly editable in edit mode");
assert.ok(fakeElement.attrs["data-empty-label"].includes("ว่าง"), "Thai empty placeholder label missing");
const sanitizedEmpty = app.sanitizeTextOverrides({ "hero:0:th": "" });
assert.equal(Object.prototype.hasOwnProperty.call(sanitizedEmpty, "hero:0:th"), true, "sanitizer dropped an intentional empty-string key");
assert.equal(sanitizedEmpty["hero:0:th"], "", "sanitizer changed an intentional empty string");

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
    "repeatable hide/restore is reversible",
    "repeatable duplicate keeps identity safe",
    "section-target CTAs disappear when their target section is hidden"
  ],
  hiddenItemId: firstId,
  duplicatedItemId: duplicatedFaq.items[1].id
}, null, 2));
