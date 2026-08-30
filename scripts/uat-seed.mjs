import crypto from "node:crypto";
import vm from "node:vm";

import { buildVisitorRuntime, readVisitorSources } from "./lib/visitor-source.mjs";
import {
  argFlag,
  credentialLabel,
  firestoreCommit,
  firestoreDocumentName,
  firestoreGet,
  loadUatLocalEnv,
  resolveUatCredential,
  toFirestoreFields
} from "./lib/uat-env.mjs";

loadUatLocalEnv();

const argv = process.argv.slice(2);
const force = argFlag(argv, "--force");
const includeLead = argFlag(argv, "--lead");
const credential = await resolveUatCredential({ allowGcloud: argFlag(argv, "--gcloud") });

if (!credential) {
  throw new Error("Set COVERMATE_UAT_ADMIN_ID_TOKEN, COVERMATE_UAT_ADMIN_EMAIL/PASSWORD, or COVERMATE_UAT_USE_GCLOUD=1 before seeding UAT.");
}

const defaults = extractDefaultSiteConfig();
const statePayload = {
  config: defaults,
  text: {},
  updatedAt: new Date(),
  updatedBy: {
    uid: credential.kind === "gcloud-iam" ? "uat-seed-gcloud" : "uat-seed-admin",
    email: "uat-seed@covermate.local",
    role: "automation"
  }
};

const writes = [];
const skipped = [];

for (const stateName of ["live", "draft"]) {
  const path = `sites/covermate-uat/states/${stateName}`;
  const exists = await documentExists(path);
  if (exists && !force) {
    skipped.push(path);
    continue;
  }
  writes.push({
    update: {
      name: firestoreDocumentName(path),
      fields: toFirestoreFields(statePayload)
    }
  });
}

let seedLead = null;
if (includeLead) {
  const id = `uat-seed-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const path = `contactLeadsUat/${id}`;
  const now = new Date();
  seedLead = {
    id,
    contact: `uat-seed-${Date.now()}@covermate.local`
  };
  writes.push({
    update: {
      name: firestoreDocumentName(path),
      fields: toFirestoreFields({
        name: "UAT Seed Lead",
        contact: seedLead.contact,
        topic: "Seeded UAT lead for smoke-test visibility.",
        qtype: "general",
        coverage: "motor",
        consent: true,
        language: "th",
        summary: "UAT seed lead. Safe to ignore.",
        sourcePath: "/uat-seed",
        status: "new",
        read: false,
        createdAt: now,
        updatedAt: now
      })
    },
    currentDocument: { exists: false }
  });
}

if (writes.length) await firestoreCommit(writes, credential);

console.log(JSON.stringify({
  ok: true,
  credential: credentialLabel(credential),
  createdOrUpdated: writes.length,
  skipped,
  seedLead
}, null, 2));

async function documentExists(path) {
  try {
    await firestoreGet(path, credential);
    return true;
  } catch (error) {
    if (error.status === 404) return false;
    throw error;
  }
}

function extractDefaultSiteConfig() {
  const scriptSource = buildVisitorRuntime(readVisitorSources());
  const defaultsEnd = scriptSource.indexOf("const SCHEMA =");
  if (defaultsEnd < 0) throw new Error("src/visitor/runtime.js: DEFAULTS boundary missing");
  const sandbox = { result: null };
  vm.runInNewContext(`${scriptSource.slice(0, defaultsEnd)}\nresult = DEFAULTS;`, sandbox);
  return sandbox.result;
}
