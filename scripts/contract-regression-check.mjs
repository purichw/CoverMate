import assert from "node:assert/strict";

import { importCoverMateContract } from "./lib/contract-loader.mjs";

const {
  CMS_EDITABLE_PAGES,
  adminPortalRouteStateFromLocation,
  adminPortalUrl,
  cleanPublicExitPath,
  filterLinksByVisibleSections,
  isPlaceholderStoryItem,
  ownerModeFromHash,
  ownerModeFromPath,
  ownerPathForMode,
  publicPathForRoutePage,
  repeatableContentIndex,
  routePageFromLocationParts,
  sectionHrefAvailable,
  sanitizeStateDoc,
  visibleSectionAnchorIds
} = await importCoverMateContract();

assert.equal(ownerModeFromPath("/admin/content"), "admin");
assert.equal(ownerModeFromPath("/admin/edit/"), "edit");
assert.equal(ownerModeFromPath("/admin/preview"), "preview");
assert.equal(ownerModeFromHash("#admin"), "admin");
assert.equal(ownerPathForMode("admin"), "/admin/content");
assert.equal(ownerPathForMode("edit", "motor"), "/admin/edit?page=motor");
assert.equal(ownerPathForMode("preview", "motor"), "/admin/preview?page=motor");
assert.equal(ownerPathForMode('preview', 'motor', '?page=home&lang=en&cm_env=uat&cm_emulator=1&token=private'), '/admin/preview?page=motor&lang=en&cm_env=uat&cm_emulator=1');
assert.equal(ownerPathForMode('admin', 'home', '?lang=th&cm_env=invalid&cm_emulator=0'), '/admin/content');
assert.equal(ownerPathForMode('invalid', 'motor', '?lang=en'), '');
assert.equal(routePageFromLocationParts('/admin/content', '?page=missing'), 'home');
for (const page of CMS_EDITABLE_PAGES) {
  assert.equal(routePageFromLocationParts(page.path), page.id);
  assert.equal(publicPathForRoutePage(page.id), page.path);
  for (const mode of ['admin', 'edit', 'preview']) {
    const url = new URL(ownerPathForMode(mode, page.id), 'https://example.invalid');
    assert.equal(routePageFromLocationParts(url.pathname, url.search), page.id);
  }
}

assert.equal(publicPathForRoutePage("home"), "/");
assert.equal(publicPathForRoutePage("motor"), "/motor");
assert.equal(cleanPublicExitPath("/admin/edit"), "/");
assert.equal(cleanPublicExitPath("/motor"), "/motor");
assert.equal(routePageFromLocationParts("/", ""), "home");
assert.equal(routePageFromLocationParts("/motor", ""), "motor");
assert.equal(routePageFromLocationParts("/admin/edit", "?page=motor"), "motor");
assert.equal(routePageFromLocationParts("/admin/content", "?page=home"), "home");

assert.deepEqual(adminPortalRouteStateFromLocation("/admin/ops", ""), {
  module: "operations",
  operationsTab: "dashboard"
});
assert.deepEqual(adminPortalRouteStateFromLocation("/admin", "#leads"), {
  module: "operations",
  operationsTab: "leads"
});
assert.deepEqual(adminPortalRouteStateFromLocation("/admin", "#analytics"), {
  module: "analytics",
  operationsTab: "dashboard"
});
assert.equal(adminPortalUrl("home"), "/admin");
assert.equal(adminPortalUrl("operations", "dashboard"), "/admin#operations");
assert.equal(adminPortalUrl("operations", "tasks"), "/admin#tasks");
assert.equal(adminPortalUrl("content"), "/admin#content");
assert.equal(adminPortalUrl("unknown"), "/admin");
assert.equal(adminPortalUrl("settings"), "/admin");
for (const path of ["/admin", "/admin/ops"]) {
  assert.deepEqual(adminPortalRouteStateFromLocation(path, "#settings"), {
    module: "home", operationsTab: "dashboard"
  });
}

const config = {
  sections: [
    { id: "hero", type: "hero", on: true },
    { id: "cover", type: "products", on: true, items: [{ on: false }] },
    { id: "insurers", type: "insurers", on: true, items: [{ on: true, logo: "assets/ins/01-viriyah.png" }] },
    { id: "fit", type: "fit", on: false },
    { id: "talk", type: "contact", on: true }
  ]
};
const anchors = visibleSectionAnchorIds(config);
assert.equal(anchors.has("hero"), true);
assert.equal(anchors.has("insurers"), true);
assert.equal(anchors.has("motor"), true);
assert.equal(anchors.has("fit"), false);
assert.equal(anchors.has("life"), false, "cover alias must stay hidden when embedded cover items are hidden");
assert.equal(sectionHrefAvailable("#motor", anchors), true);
assert.equal(sectionHrefAvailable("#insurers", anchors), true);
assert.equal(sectionHrefAvailable("#fit", anchors), false);
assert.equal(sectionHrefAvailable("#life", anchors), false);
assert.equal(sectionHrefAvailable("#top", anchors), true);
assert.equal(sectionHrefAvailable("/motor", anchors), true);

const navState = sanitizeStateDoc({config:{...config,
  header:{nav:[{label:{th:'รถยนต์',en:'Motor'},href:'#insurers'}]},
  motorPage:{nav:[{label:{th:'บริษัทประกัน',en:'Insurers'},href:'#insurers'}]}
}});
assert.equal(navState.config.header.nav[0].href,'#motor','Home CMS uses the public motor anchor');
assert.equal(navState.config.header.nav[0].label.en,'Motor','Keep Admin labels');
assert.equal(navState.config.motorPage.nav[0].href,'#insurers','Motor page local anchor is unchanged');
assert.equal(sectionHrefAvailable('#motor',new Set(['insurers'])),true,'Resolve public anchor to unchanged section ID');
assert.equal(sectionHrefAvailable('#motor',new Set()),false,'Hidden insurers must not leave a dead link');

assert.deepEqual(
  filterLinksByVisibleSections([
    { href: "#fit", label: "hidden" },
    { href: "#motor", label: "shown alias" },
    { href: "/motor", label: "route" }
  ], anchors).map((item) => item.label),
  ["shown alias", "route"]
);

const list = [{ id: "a" }, { id: "b" }];
assert.equal(repeatableContentIndex(list, "b", 0), 1);
assert.equal(repeatableContentIndex(list, "missing", 0), 0);
assert.equal(repeatableContentIndex(list, "", 9), -1);

const authoredStory = { th: { title: 'เคลมแล้ว', body: 'ช่วยไว' }, en: { title: 'Sample review' } };
assert.equal(isPlaceholderStoryItem(authoredStory, 'th'), false, 'Short authored Thai remains eligible');
assert.equal(isPlaceholderStoryItem(authoredStory, 'en'), true, 'A pending English translation stays filtered independently');
assert.equal(isPlaceholderStoryItem({ th: { title: 'เสียงจากลูกค้า', body: 'ดี' }, en: { title: 'Customer voice', body: 'Helpful.' } }, 'th'), false, 'A generic customer heading is not placeholder evidence');
assert.equal(isPlaceholderStoryItem({ en: { title: 'Customer voice', body: 'Helpful.', meta: 'Published with permission' } }, 'en'), false, 'Real feedback and consent attribution remain eligible');
for (const [lang, field, text] of [
  ['th','label','รอความคิดเห็นจริง'], ['th','title','ความคิดเห็นจากลูกค้าจะเผยแพร่ที่นี่เมื่อได้รับอนุญาต'],
  ['th','meta','ตัวอย่างโครงสร้าง'], ['th','name','ชื่อลูกค้า'],
  ['en','label','Awaiting real feedback'], ['en','title','Client feedback will appear here once permission is granted.'],
  ['en','meta','Placeholder structure'], ['en','name','Customer name'], ['en','meta','Role · policy']
]) assert.equal(isPlaceholderStoryItem({ [lang]: { [field]: text } }, lang), true, 'Known pending field: ' + text);
assert.equal(isPlaceholderStoryItem(authoredStory, 'fr'), false, 'Unknown languages never borrow another translation');
assert.equal(isPlaceholderStoryItem(null, 'th'), false);
assert.equal(isPlaceholderStoryItem({ en: { title: 123 } }, 'en'), false);
for (const [lang,quote] of [
  ['th','⟨ใส่คำรีวิวจริงตรงนี้ — 1 ถึง 2 ประโยคจะอ่านง่ายที่สุด⟩'],
  ['th','⟨ใส่คำรีวิวจริงตรงนี้⟩'],
  ['en','⟨Paste a real quote here — one or two sentences reads best⟩'],
  ['en','⟨Paste a real quote here⟩']
]) assert.equal(isPlaceholderStoryItem({[lang]:{quote}},lang),true,'Recognize the current CMS legacy placeholder: '+quote);
const storyConfig = { cmsContentVersion: navState.config.cmsContentVersion, sections: [
  { id: 'voices', type: 'stories', on: true, items: [{ th: { label: 'รอความคิดเห็นจริง' }, en: { label: 'Awaiting real feedback' } }] },
  { id: 'short-stories', type: 'stories', on: true, items: [authoredStory] },
  { id: 'hidden-feedback', type: 'testimonials', on: false, items: [{ th: { quote: 'ดี' } }] },
  { id: 'empty-feedback', type: 'testimonials', on: true, items: [] }
] };
const storyBefore = structuredClone(storyConfig);
const savedStories = sanitizeStateDoc({ config: storyConfig, text: {} });
assert.deepEqual(savedStories.config.sections, storyBefore.sections, 'Save preserves enabled, hidden, short and empty story sections without rewriting content');
assert.deepEqual(sanitizeStateDoc(savedStories).config.sections, storyBefore.sections, 'Repeated normalization cannot turn the owner switch off');
assert.deepEqual(storyConfig, storyBefore, 'Story normalization never mutates the supplied draft');


const layoutConfig = {
  ...storyConfig,
  pageLayout: {
    home: { order: ['footer', 'articles', 'voices', 'licences', 'articles', null, '<script>'], hidden: ['articles', 'licences', 'articles', 'voices', 'footer'] },
    motor: { order: ['licences', 'hero', 'footer'], hidden: [] },
    health: { order: ['footer', 'service-content'], hidden: ['service-content'] },
    life: { order: 'invalid', hidden: null },
    unknown: { order: ['footer'], hidden: ['articles'] }
  },
  footer: { show: false }
};
const layoutBefore = structuredClone(layoutConfig);
const savedLayout = sanitizeStateDoc({ config: layoutConfig, text: {} });
assert.deepEqual(savedLayout.config.pageLayout, {
  home: { order: ['footer', 'articles', 'voices', 'licences'], hidden: ['articles', 'licences'] },
  motor: { order: ['licences', 'hero', 'footer'], hidden: [] },
  health: { order: ['footer', 'service-content'], hidden: ['service-content'] },
  life: { order: [], hidden: [] }
}, 'Route layout preserves independent order and virtual visibility, rejecting invalid and duplicate values');
assert.equal(savedLayout.config.footer.show, false, 'Footer visibility keeps its canonical global owner');
assert.deepEqual(savedLayout.config.sections, storyBefore.sections, 'Presentation settings cannot rewrite real section visibility or content');
assert.deepEqual(sanitizeStateDoc(savedLayout).config.pageLayout, savedLayout.config.pageLayout, 'Page layout survives repeated save/reload normalization');
assert.deepEqual(layoutConfig, layoutBefore, 'Layout normalization never mutates the supplied draft');
assert.equal(savedStories.config.pageLayout, undefined, 'Legacy drafts keep default placement without invented layout overrides');

console.log("CoverMate route/content contract regression checks passed.");
