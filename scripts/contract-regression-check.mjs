import assert from "node:assert/strict";

import { importCoverMateContract } from "./lib/contract-loader.mjs";

const {
  adminPortalRouteStateFromLocation,
  adminPortalUrl,
  cleanPublicExitPath,
  filterLinksByVisibleSections,
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

console.log("CoverMate route/content contract regression checks passed.");
