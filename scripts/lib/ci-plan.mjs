// One inventory for local full checks and isolated GitHub Actions suites.
// Keep commands sequential inside a suite: browser fixtures can write shared files.
export const buildCommands = [
  ["node", ["scripts/build-cases.mjs"]],
  ["npm", ["run", "build:customers"]],
  [
    "node",
    [
      "scripts/build-vendor.mjs"
    ]
  ],
  [
    "npm",
    [
      "run",
      "build:telemetry"
    ]
  ],
  [
    "npm",
    [
      "run",
      "build:media"
    ]
  ],
  [
    "npm",
    [
      "run",
      "build:article-editor"
    ]
  ],
  [
    "npm",
    [
      "run",
      "build:visitor"
    ]
  ],
  [
    "npm",
    [
      "run",
      "build:errors"
    ]
  ]
];
export const checkGroups = {
  preflight: [
    ["npm",["run","check:performance"]],
    ["node",["scripts/cases-workflow-check.mjs"]],
    ["node",["scripts/validation-boundaries-check.mjs"]],
    ["npm",["run","check:customers"]],
    ["node",["scripts/smoke-evidence-check.mjs"]],
    ["node",["scripts/uptime-access-check.mjs"]],
    ["npm",["run","check:types"]],
    ["npm",["run","check:refactor"]],
    ["npm",["run","check:nfr"]],
    ["npm",["run","check:public-request"]],
    ["node",["scripts/startup-performance-check.mjs"]],
    ["npm",["run","check:bundles"]],
    ["npm",["run","check:seo"]],
    ["npm",["run","check:contracts"]],
    ["npm",["run","check:security"]],
    ["npm",["run","check:ids"]],
    ["npm",["run","check:uat"]],
    ["git",["diff","--check"]],
  ],
  visitor: [
    ["npm",["run","check:errors"]],
    ["node",["scripts/home-articles-check.mjs","--browser"]],
    ["node",["scripts/home-articles-carousel-check.mjs"]],
    ["node",["scripts/select-spacing-check.mjs"]],
    ["node",["scripts/service-page-check.mjs"]],
    ["node",["scripts/visitor-startup-check.mjs"]],
    ["node",["scripts/logo-variants-check.mjs"]],
    ["npm",["run","check:needs"]],
    ["npm",["run","check:needs-v2"]],
    ["npm",["run","check:needs-contract"]],
    ["node",["scripts/release-needs-content.mjs","--test"]],
    ["npm",["run","check:contact"]],
    ["node",["scripts/line-contact-check.mjs"]],
    ["node",["scripts/custom-select-check.mjs"]],
    ["npm",["run","check:advisor"]],
    ["npm",["run","check:motor-design","--","--contract-only"]],
    ["npm",["run","check:motor-comparison"]],
    ["npm",["run","check:boot"]],
    ["npm",["run","check:loading"]],
    ["node",["scripts/runtime-error-check.mjs"]],
    ["node",["scripts/server-boot-check.mjs"]],
    ["npm",["run","check:live-content"]],
    ["npm",["run","check:analytics"]],
    ["npm",["run","check:consent"]],
    ["npm",["run","check:analytics-api"]],
    ["npm",["run","check:phase6"]],
  ],
  articles: [
    ["node",["scripts/articles-carousel-check.mjs","--interactions-only"]],
    ["node",["scripts/editor-panel-browser-check.mjs","--article-order"]],
    ["node",["scripts/articles-index-check.mjs","--browser"]],
    ["node",["scripts/articles-admin-check.mjs","--browser"]],
    ["node",["scripts/article-detail-check.mjs","--browser"]],
    ["node",["scripts/article-editor-check.mjs","--browser"]],
    ["node",["scripts/article-leave-check.mjs"]],
    ["node",["scripts/article-workspace-check.mjs"]],
    ["node",["scripts/article-summary-check.mjs","--browser"]],
    ["node",["scripts/article-media-check.mjs","--browser"]],
    ["node",["scripts/article-delivery-check.mjs","--browser"]],
    ["node",["scripts/article-editor-tools-check.mjs"]],
    ["node",["scripts/article-editor-metadata-check.mjs"]],
    ["node",["scripts/article-validation-check.mjs","--browser"]],
    ["node",["scripts/article-reader-parity-check.mjs"]],
    ["node",["scripts/article-typography-check.mjs","--browser"]],
    ["node",["scripts/article-blocks-check.mjs","--browser"]],
    ["node",["scripts/article-feature-card-check.mjs","--browser"]],
  ],
  cms: [
    ["node",["scripts/editor-panel-browser-check.mjs","--validation"]],
    ["npm",["run","check:editor-history"]],
    ["npm",["run","check:content-isolation"]],
    ["npm",["run","check:editor-panel"]],
    ["npm",["run","check:editor-versions"]],
    ["npm",["run","check:text-editor"]],
    ["npm",["run","check:inline-links"]],
    ["npm",["run","check:cms"]],
    ["npm",["run","check:faq"]],
    ["node",["scripts/copy-voice-check.mjs"]],
    ["npm",["run","check:cms:site"]],
    ["npm",["run","check:media"]],
    ["npm",["run","check:media:provider"]],
    ["npm",["run","check:media:upload"]],
    ["npm",["run","check:media:inline"]],
  ],
  admin: [
    ["npm",["run","check:admin-controls"]],
    ["npm",["run","check:admin-home"]],
    ["node",["scripts/admin-home-refresh-check.mjs"]],
    ["node",["scripts/admin-account-check.mjs"]],
    ["node",["scripts/admin-owner-panel-check.mjs"]],
    ["node",["scripts/admin-content-check.mjs"]],
    ["node",["scripts/cms-entry-browser-check.mjs"]],
    ["node",["scripts/cases-list-design-check.mjs"]],
    ["npm",["run","check:admin-analytics"]],
    ["node",["scripts/admin-shell-browser-check.mjs"]],
    ["npm",["run","check:admin-structure"]],
    ["npm",["run","check:admin-loading"]],
    ["npm",["run","check:admin-lists"]],
    ["npm",["run","check:ops"]],
    ["npm",["run","check:case-links"]],
    ["npm",["run","check:admin-email-template"]],
    ["npm",["run","check:customer-email:template"]],
    ["npm",["run","check:customer-email:browser"]],
  ],
  smoke: [
    ["npm",["run","smoke:admin-builder"]],
    ["npm",["run","smoke"]],
  ],
};
export const browserSuites = ["visitor", "articles", "cms", "admin", "smoke"];
export const fullSuiteJobNames = ["preflight", ...browserSuites.map(name => `browser (${name})`), "emulators"];

export function commandsForSuite(suite = "all") {
  if (suite === "build") return [...buildCommands];
  if (suite === "emulators") return [...buildCommands, ["node", ["scripts/article-editor-ui-check.mjs"]], ["npm", ["run", "check:emulators"]]];
  if (suite === "all") return [...buildCommands, ...Object.values(checkGroups).flat()];
  if (!Object.hasOwn(checkGroups, suite)) throw new Error(`Unknown CI suite: ${suite}`);
  return [...buildCommands, ...checkGroups[suite]];
}
