import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

const vercel = JSON.parse(read("vercel.json"));
const headers = vercel.headers || [];
const globalHeaders = headers.find((entry) => entry.source === "/(.*)");
assert.ok(globalHeaders, "vercel.json must define global security headers.");

const headerMap = new Map((globalHeaders.headers || []).map((entry) => [entry.key.toLowerCase(), entry.value]));
assert.equal(headerMap.get("x-content-type-options"), "nosniff");
assert.equal(headerMap.get("referrer-policy"), "strict-origin-when-cross-origin");
assert.match(headerMap.get("permissions-policy") || "", /camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\)/);
assert.match(headerMap.get("strict-transport-security") || "", /max-age=63072000/);
assert.match(headerMap.get("content-security-policy-report-only") || "", /frame-ancestors 'none'/);
assert.doesNotMatch(
  headerMap.get("content-security-policy") || "",
  /unsafe-inline|blob:/,
  "Do not add an enforced CSP with the current exported inline/blob bundle requirements."
);

const adminHeaders = headers.find((entry) => entry.source === "/admin/(.*)");
assert.ok(adminHeaders, "Admin routes must carry noindex headers.");
const adminHeaderMap = new Map((adminHeaders.headers || []).map((entry) => [entry.key.toLowerCase(), entry.value]));
assert.match(adminHeaderMap.get("x-robots-tag") || "", /noindex/);

const rules = read("firestore.rules");
assert.match(rules, /match \/\{document=\*\*\}/, "Firestore rules must retain the deny-all fallback.");
assert.match(rules, /allow read, write: if false;/, "Firestore deny-all fallback must deny read and write.");
assert.match(rules, /function isAdmin\(\)/, "Rules must keep a shared admin allowlist check.");
assert.match(rules, /exists\(adminPath\(\)\)/, "Admin check must require an admins/{uid} document.");
assert.match(rules, /get\(adminPath\(\)\)\.data\.active == true/, "Admin check must require active:true.");
assert.match(rules, /function isUatOnlyAdmin\(\)/, "Rules must keep UAT-only admin isolation.");
assert.match(rules, /allow write: if false;/, "Admin allowlist writes must stay server/manual only.");
assert.match(rules, /match \/contactLeads\/\{leadId\}/, "Production lead collection rules must exist.");
assert.match(rules, /match \/contactLeadsUat\/\{leadId\}/, "UAT lead collection rules must exist.");
assert.match(rules, /allow create: if validLeadCreate\(\) \|\| canWriteOpsRecords\(false\);/);
assert.match(rules, /allow create: if validLeadCreate\(\) \|\| canWriteOpsRecords\(true\);/);
assert.match(rules, /request\.resource\.data\.consent == true/);
assert.match(rules, /request\.resource\.data\.createdAt == request\.time/);
assert.match(rules, /request\.resource\.data\.updatedAt == request\.time/);
assert.match(rules, /request\.resource\.data\.contact\.size\(\) > 0/);
assert.match(rules, /allow delete: if false;/, "Lead deletion must stay blocked in client rules.");

const firebaseClient = read("covermate-firebase.js");
assert.doesNotMatch(firebaseClient, /sendBeacon\([^)]*(name|phone|email|lineId|contact|message)/i);
assert.doesNotMatch(firebaseClient, /data:image\//, "Client should not persist base64/data-image payloads.");
assert.match(firebaseClient, /submitContactLead/, "Public lead submission helper must remain present.");
assert.match(firebaseClient, /COVERMATE_ENVIRONMENT\.leadCollection/, "Client lead writes must use the shared environment collection.");

const analytics = read("covermate-analytics.js");
assert.match(analytics, /G-5TF3C235EF/, "GA4 measurement ID must stay explicit.");
assert.match(analytics, /covermate\.vercel\.app/, "Visitor analytics must stay production-host scoped.");
assert.match(analytics, /eventParamWhitelist/, "Visitor analytics must keep an explicit event parameter whitelist.");
assert.doesNotMatch(
  analytics,
  /source\.(?:name|phone|email|lineId|contact|message)\b|safe\.(?:name|phone|email|lineId|contact|message)\b/i,
  "Visitor analytics must not copy contact PII fields into event parameters."
);

const opsApi = read("api/ops.js");
assert.match(opsApi, /bearerToken\(req\)/, "Operations API must require a bearer Firebase ID token.");
assert.match(opsApi, /identityLookup\(token\)/, "Operations API must verify Firebase ID tokens server-side.");
assert.match(opsApi, /firestoreGet\(`admins\/\$\{encodeURIComponent\(uid\)\}`/, "Operations API must check admin allowlist server-side.");
assert.match(opsApi, /requirePermission\(actor,\s*"edit_records"\)/, "Operations API must enforce edit permissions server-side.");
assert.match(opsApi, /requirePermission\(actor,\s*"change_status"\)/, "Operations API must enforce status permissions server-side.");
assert.doesNotMatch(opsApi, /localStorage|window\./, "Serverless API must not depend on browser-only state.");

console.log("CoverMate security contract check passed");
