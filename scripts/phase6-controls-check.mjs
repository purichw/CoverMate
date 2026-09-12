import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import zlib from "node:zlib";

import { extractBundlerTemplate } from "./lib/bundler-template.mjs";
import { importCoverMateContract } from "./lib/contract-loader.mjs";

const {
  DEFAULT_CONTACT,
  sanitizeMotorCountConfig
} = await importCoverMateContract();

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const template = extractBundlerTemplate(html, {
  fileLabel: "index.html",
  completePredicate: (source) => source.includes("</html>") && source.includes("const DEFAULTS =")
});
const scriptMatch = template.match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, "embedded text/x-dc script exists");
new vm.Script(scriptMatch[1], { filename: "index.html text/x-dc" });

const manifestMatch = html.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
assert.ok(manifestMatch, "embedded bundler manifest exists");
const manifest = JSON.parse(manifestMatch[1]);
const bundledRuntime = Object.values(manifest)
  .map((entry) => {
    const bytes = Buffer.from(entry.data, "base64");
    return (entry.compressed ? zlib.gunzipSync(bytes) : bytes).toString("utf8");
  })
  .join("\n");
const fullEmbeddedSurface = `${template}\n${bundledRuntime}`;

for (const pattern of [
  /type=["']file["']/i,
  /browse files/i,
  /data-admin-logo-upload/i,
  /applyAdvisorLogoFile/i,
  /prepareLogoUpload/i,
  /chooseAdvisorLogoFile/i,
  /readImageFile/i,
  /Logo uploaded/i,
  /Upload logo/i,
  /data-image-edit/i,
  /Brand &(?:amp;)? chrome/i
]) {
  assert.equal(pattern.test(fullEmbeddedSurface), false, `legacy upload/image-edit marker removed: ${pattern}`);
}

for (const pattern of [
  /data-admin-media-control="advisor-logo"/,
  /data-admin-logo-path="true"/,
  /data-admin-logo-alt="true"/,
  /data-admin-credential="true"/,
  /data-admin-legal="true"/,
  /data-admin-seo-title="true"/,
  /data-admin-seo-description="true"/,
  /data-admin-seo-guard="true"/
]) {
  assert.equal(pattern.test(template), true, `required Phase 6 admin control exists: ${pattern}`);
}

for (const pattern of [
  /data-admin-canonical/i,
  /data-admin-robots/i,
  /data-admin-jsonld/i,
  /data-admin-social-image/i,
  /data-admin-testimonial/i,
  /data-admin-rating/i
]) {
  assert.equal(pattern.test(template), false, `unsupported SEO/admin control absent: ${pattern}`);
}

const dirtyConfig = {
  brand: {
    advisorLogo: "data:image/svg+xml,bad",
    advisorLogoAlt: "  Proof logo  ",
    credential: { th: "bad", en: "bad" }
  },
  contact: {
    lineId: "  @covermate-smoke  ",
    lineUrl: "http://bad.example",
    facebookName: "  Facebook  ",
    facebookUrl: "javascript:alert(1)",
    whatsapp: "+66 <script>",
    phone: "02-123-4567 ext 9",
    email: "not-an-email"
  },
  footer: {
    legal: { th: "old 5704011570", en: "missing identifiers" }
  },
  seo: {
    title: { th: "ทดสอบ".repeat(30), en: "Smoke title" },
    description: { th: "คำอธิบาย".repeat(60), en: "Smoke description" }
  },
  sections: [
    {
      id: "insurers",
      type: "insurers",
      items: [
        { logo: "javascript:alert(1)" },
        { logo: "assets/ins/01-viriyah.png" }
      ],
      cards: [
        { logo: "../secret.png", logoAlt: "A".repeat(180) },
        { logo: "https://example.com/logo.png", logoAlt: "Visible logo" }
      ]
    }
  ]
};

const clean = sanitizeMotorCountConfig(dirtyConfig, { repeatableIds: true });

assert.equal(clean.brand.advisorLogo, "", "invalid advisor logo clears without substituting a provider");
assert.equal(clean.brand.advisorLogoAlt, "Proof logo", "advisor logo alt is cleaned");
assert.equal(clean.brand.credential.th, "bad", "Admin owns credential copy");
assert.equal(clean.contact.lineUrl, DEFAULT_CONTACT.lineUrl, "invalid LINE URL falls back");
assert.equal(clean.contact.facebookUrl, "", "invalid optional Facebook URL clears");
assert.equal(clean.contact.email, DEFAULT_CONTACT.email, "invalid email falls back");
assert.equal(clean.seo.title.th.length <= 68, true, "SEO title is length guarded");
assert.equal(clean.seo.description.th.length <= 155, true, "SEO description is length guarded");
assert.equal(clean.footer.legal.th, "old 5704011570", "Admin owns legal copy; structured licences are separate");
assert.equal(clean.sections[0].items[0].logo, "", "invalid insurer item logo clears");
assert.equal(clean.sections[0].items[1].logo, "assets/ins/01-viriyah.png");
assert.equal(clean.sections[0].cards[0].logo, "", "invalid relationship-card logo clears");
assert.equal(clean.sections[0].cards[0].logoAlt.length <= 120, true, "relationship-card logo alt is guarded");
assert.equal(clean.sections[0].cards[1].logo, "https://example.com/logo.png");

console.log("CoverMate Phase 6 controls check passed");
