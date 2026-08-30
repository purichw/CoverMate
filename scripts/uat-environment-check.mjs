import assert from "node:assert/strict";
import fs from "node:fs";

import { appendEnvironmentSearch, resolveCoverMateEnvironment } from "../covermate-environment.mjs";
import { extractBundlerTemplate } from "./lib/bundler-template.mjs";

const repoFile = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const production = resolveCoverMateEnvironment({
  host: "covermate.vercel.app",
  url: "/?cm_env=uat"
});
assert.equal(production.name, "production", "Production host must ignore explicit UAT query params.");
assert.equal(production.siteId, "covermate");
assert.equal(production.leadCollection, "contactLeads");

const preview = resolveCoverMateEnvironment({
  host: "covermate-git-uat-covermate.vercel.app",
  url: "/motor"
});
assert.equal(preview.name, "uat", "Vercel preview hosts must resolve to UAT.");
assert.equal(preview.siteId, "covermate-uat");
assert.equal(preview.leadCollection, "contactLeadsUat");

const localUat = resolveCoverMateEnvironment({
  host: "127.0.0.1:4188",
  url: "/admin?cm_env=uat"
});
assert.equal(localUat.name, "uat", "Local UAT must be opt-in through cm_env=uat.");
assert.equal(appendEnvironmentSearch("/api/ops/leads?limit=5", localUat), "/api/ops/leads?limit=5&cm_env=uat");

const localProduction = resolveCoverMateEnvironment({
  host: "localhost:4173",
  url: "/"
});
assert.equal(localProduction.name, "production", "Local development stays production-shaped unless UAT is explicit.");
assert.equal(appendEnvironmentSearch("/api/analytics?days=30", localProduction), "/api/analytics?days=30");

const firebaseSource = repoFile("covermate-firebase.js");
assert.match(firebaseSource, /resolveCoverMateEnvironment/, "Firebase client must use the shared environment resolver.");
assert.match(firebaseSource, /admin\.uatOnly === true && !COVERMATE_ENVIRONMENT\.isUat/, "Firebase client must reject UAT-only admins on production hosts.");
assert.match(firebaseSource, /const SITE_ID = COVERMATE_ENVIRONMENT\.siteId;/);
assert.match(firebaseSource, /const LEAD_COLLECTION = COVERMATE_ENVIRONMENT\.leadCollection;/);
assert.doesNotMatch(firebaseSource, /collection\(db,\s*"contactLeads"\)/, "Firebase client must not hard-code production lead collection.");
assert.doesNotMatch(firebaseSource, /"sites",\s*"covermate",\s*"states"/, "Firebase client must not hard-code production site state path.");

const opsSource = repoFile("api/ops.js");
assert.match(opsSource, /resolveRequestEnvironment/, "Ops API must resolve runtime environment.");
assert.match(opsSource, /admin\.uatOnly === true && !\(environment && environment\.isUat\)/, "Ops API must reject UAT-only credentials outside UAT.");
assert.match(opsSource, /leadCollectionFor\(actor\)/, "Ops API must route lead reads and writes through the environment collection.");
assert.doesNotMatch(opsSource, /collectionId:\s*"contactLeads"/, "Ops API queries must not hard-code production contactLeads.");

const analyticsSource = repoFile("api/analytics.js");
assert.match(analyticsSource, /COVERMATE_UAT_GA4_PROPERTY_ID/);
assert.match(analyticsSource, /admin\.uatOnly === true && !\(environment && environment\.isUat\)/, "Analytics API must reject UAT-only credentials outside UAT.");
assert.match(analyticsSource, /Production GA4 credentials are not reused for UAT/);

const opsAdminSource = repoFile("admin/ops/app.js");
assert.match(opsAdminSource, /withEnvironmentQuery\(`\/api\/ops\/\$\{path\}`,\s*cm\.environment\)/);

const analyticsAdminSource = repoFile("admin/analytics/index.html");
assert.match(analyticsAdminSource, /withEnvironmentQuery\("\/api\/analytics\?days=30",\s*cm\.environment\)/);

const sessionSource = repoFile("admin/session.js");
assert.match(sessionSource, /adminRedirect/, "Admin session redirects must preserve UAT query context.");

const adminShellSource = repoFile("admin/index.html");
assert.match(adminShellSource, /admin\/login\?cm_env=uat/, "Admin shell guard must preserve local UAT login redirects.");

const loginTemplate = extractBundlerTemplate(repoFile("admin/login/index.html"), {
  fileLabel: "admin/login/index.html",
  requireComplete: false
});
assert.match(loginTemplate, /params\.get\('cm_env'\) === 'uat'/, "Admin login success redirects must preserve local UAT context.");

const rulesSource = repoFile("firestore.rules");
assert.match(rulesSource, /"covermate-uat"/);
assert.match(rulesSource, /isUatOnlyAdmin/);
assert.match(rulesSource, /canReadOpsRecords\(false\)/);
assert.match(rulesSource, /canReadOpsRecords\(true\)/);
assert.match(rulesSource, /match \/contactLeadsUat\/\{leadId\}/);

console.log("CoverMate UAT environment check passed");
