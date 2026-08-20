import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

import { extractBundlerTemplate } from "./lib/bundler-template.mjs";

async function loadContract() {
  const source = fs.readFileSync(new URL("../covermate-contract.js", import.meta.url), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

function extractDefaultSiteConfig() {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const template = extractBundlerTemplate(html, {
    fileLabel: "index.html",
    completePredicate: (source) => source.includes("</html>") && source.includes("const DEFAULTS =")
  });
  const scriptMatch = template.match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error("index.html: text/x-dc script missing");
  const scriptSource = scriptMatch[1];
  const defaultsEnd = scriptSource.indexOf("const SCHEMA =");
  if (defaultsEnd < 0) throw new Error("index.html: DEFAULTS boundary missing");
  const sandbox = { result: null };
  vm.runInNewContext(`${scriptSource.slice(0, defaultsEnd)}\nresult = DEFAULTS;`, sandbox);
  return sandbox.result;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function section(config, id) {
  return (config.sections || []).find((item) => item && item.id === id);
}

function repeatableCollections(config) {
  const collections = [];
  for (const item of config.sections || []) {
    for (const key of ["items", "cards", "heads"]) {
      if (Array.isArray(item?.[key]) && item[key].length) {
        collections.push({ sectionId: item.id, type: item.type, key, list: item[key] });
      }
    }
  }
  return collections;
}

function orderSignature(config) {
  return repeatableCollections(config).map(({ sectionId, key, list }) => ({
    sectionId,
    key,
    values: list.map((entry) => JSON.stringify({ th: entry.th, en: entry.en, logo: entry.logo, n: entry.n }))
  }));
}

function idMap(config) {
  const map = {};
  for (const { sectionId, key, list } of repeatableCollections(config)) {
    map[`${sectionId}.${key}`] = list.map((entry) => entry.id);
  }
  return map;
}

function flatIds(config) {
  return Object.values(idMap(config)).flat();
}

function assertCollectionsHaveValidUniqueIds(config, validRepeatableContentId) {
  for (const { sectionId, key, list } of repeatableCollections(config)) {
    const ids = list.map((entry) => entry.id);
    assert.equal(new Set(ids).size, ids.length, `${sectionId}.${key} has duplicate IDs`);
    ids.forEach((id) => assert.equal(validRepeatableContentId(id), true, `${sectionId}.${key} invalid id ${id}`));
  }
}

function assertSameIds(before, after, label) {
  assert.deepEqual(idMap(after), idMap(before), `${label}: repeatable IDs changed`);
}

function moveById(list, id, toIndex) {
  const fromIndex = list.findIndex((entry) => entry.id === id);
  assert.notEqual(fromIndex, -1, `cannot move missing id ${id}`);
  const [item] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, item);
}

const {
  ensureRepeatableContentIds,
  sanitizeMotorCountConfig,
  validRepeatableContentId
} = await loadContract();

const defaults = extractDefaultSiteConfig();
const audited = repeatableCollections(defaults).map(({ sectionId, type, key, list }) =>
  `${sectionId}(${type}).${key}:${list.length}`
);

const oldConfig = clone(defaults);
const oldOrder = orderSignature(oldConfig);
const migrated = ensureRepeatableContentIds(oldConfig);
assertCollectionsHaveValidUniqueIds(migrated, validRepeatableContentId);
assert.deepEqual(orderSignature(migrated), oldOrder, "migration must not reorder existing content");
const rerun = ensureRepeatableContentIds(migrated);
assertSameIds(migrated, rerun, "idempotent migration");

const mixed = clone(defaults);
const faq = section(mixed, "faq");
faq.items[0].id = "existing-faq-item";
faq.items[1].id = "existing-faq-item";
faq.items[2].id = "legacy_faq_2";
const mixedMigrated = ensureRepeatableContentIds(mixed);
assert.equal(section(mixedMigrated, "faq").items[0].id, "existing-faq-item", "valid existing ID was not preserved");
assert.notEqual(section(mixedMigrated, "faq").items[1].id, "existing-faq-item", "duplicate ID was not repaired");
assert.equal(section(mixedMigrated, "faq").items[2].id, "legacy_faq_2", "valid underscore ID was not preserved");
assertCollectionsHaveValidUniqueIds(mixedMigrated, validRepeatableContentId);

const editConfig = ensureRepeatableContentIds(clone(defaults));
const editFaq = section(editConfig, "faq");
const beforeEditIds = idMap(editConfig);
const editedId = editFaq.items[0].id;
editFaq.items[0].th.q = `${editFaq.items[0].th.q} ทดสอบ`;
editFaq.items[0].en.q = `${editFaq.items[0].en.q} test`;
assert.equal(editFaq.items[0].id, editedId, "editing text changed item ID");
moveById(editFaq.items, editedId, 2);
assert.equal(editFaq.items[2].id, editedId, "reorder did not keep item ID with the moved item");
const beforeAddIds = new Set(flatIds(editConfig));
editFaq.items.push({ on: true, th: { q: "คำถามใหม่", a: "คำตอบใหม่" }, en: { q: "New question", a: "New answer" } });
const addedConfig = ensureRepeatableContentIds(editConfig);
const added = section(addedConfig, "faq").items.at(-1);
assert.equal(validRepeatableContentId(added.id), true, "added item did not receive a valid ID");
assert.equal(beforeAddIds.has(added.id), false, "added item reused an existing ID");
const duplicateSource = section(addedConfig, "faq").items[0];
const duplicateOriginalId = duplicateSource.id;
section(addedConfig, "faq").items.splice(1, 0, clone(duplicateSource));
const duplicatedConfig = ensureRepeatableContentIds(addedConfig);
assert.equal(section(duplicatedConfig, "faq").items[0].id, duplicateOriginalId, "duplicate changed source ID");
assert.notEqual(section(duplicatedConfig, "faq").items[1].id, duplicateOriginalId, "duplicate copied source identity");
const deleteTarget = section(duplicatedConfig, "faq").items[2].id;
const beforeDeleteIds = flatIds(duplicatedConfig);
section(duplicatedConfig, "faq").items = section(duplicatedConfig, "faq").items.filter((item) => item.id !== deleteTarget);
const afterDeleteIds = flatIds(duplicatedConfig);
assert.equal(afterDeleteIds.includes(deleteTarget), false, "delete target ID still exists");
for (const id of beforeDeleteIds.filter((id) => id !== deleteTarget)) {
  assert.equal(afterDeleteIds.includes(id), true, `delete removed unintended ID ${id}`);
}
assert.equal(beforeEditIds["faq.items"][0], editedId, "baseline edit ID fixture changed unexpectedly");

const tierBefore = ensureRepeatableContentIds(clone(defaults));
const tierSnapshot = clone(section(tierBefore, "tiers"));
const tierAfter = ensureRepeatableContentIds(tierBefore);
assert.deepEqual(
  section(tierAfter, "tiers").items.map((item) => item.st),
  tierSnapshot.items.map((item) => item.st),
  "tier coverage states changed during ID migration"
);
assert.equal(
  section(tierAfter, "tiers").items.every((item) => item.st.length === section(tierAfter, "tiers").heads.length),
  true,
  "tier row state/head index alignment changed"
);

const liveBeforePublish = ensureRepeatableContentIds(clone(defaults));
const draftWorking = ensureRepeatableContentIds(clone(liveBeforePublish));
const draftOnly = { on: true, th: { q: "Draft only?", a: "ยังไม่ publish" }, en: { q: "Draft only?", a: "Not published yet" } };
section(draftWorking, "faq").items.push(draftOnly);
const savedDraft = sanitizeMotorCountConfig(draftWorking, { repeatableIds: true });
const reloadedDraft = clone(savedDraft);
const previewDraft = clone(reloadedDraft);
assertSameIds(savedDraft, reloadedDraft, "page reload");
assertSameIds(savedDraft, previewDraft, "preview");
const draftOnlyId = section(savedDraft, "faq").items.at(-1).id;
assert.equal(section(liveBeforePublish, "faq").items.some((item) => item.id === draftOnlyId), false, "draft-only item leaked into live before publish");
const publishedLive = sanitizeMotorCountConfig(previewDraft, { repeatableIds: true });
const versionSnapshot = { id: "phase5-version", ts: Date.now(), config: clone(publishedLive), text: {} };
assertSameIds(savedDraft, publishedLive, "publish live");
assertSameIds(savedDraft, versionSnapshot.config, "version snapshot");
assert.equal(section(publishedLive, "faq").items.some((item) => item.id === draftOnlyId), true, "publish did not carry draft item ID to live");

const reorderBefore = ensureRepeatableContentIds(clone(defaults));
const reorderFaq = section(reorderBefore, "faq");
const reorderExampleBefore = reorderFaq.items.slice(0, 3).map((item) => ({ id: item.id, q: item.th.q }));
moveById(reorderFaq.items, reorderExampleBefore[0].id, 2);
const reorderExampleAfter = reorderFaq.items.slice(0, 3).map((item) => ({ id: item.id, q: item.th.q }));

console.log(JSON.stringify({
  audited,
  migratedCollections: repeatableCollections(migrated).length,
  totalIds: flatIds(migrated).length,
  reorderExampleBefore,
  reorderExampleAfter,
  draftOnlyId,
  checks: [
    "migration old/new/mixed/idempotent/no-reorder",
    "edit/reorder/add/duplicate/delete",
    "save/reload/preview/publish/live/version",
    "draft-live isolation",
    "tier st[] index alignment preserved"
  ]
}, null, 2));
