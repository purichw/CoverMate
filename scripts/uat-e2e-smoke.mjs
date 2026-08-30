import fs from "node:fs";

import { resolveCoverMateEnvironment } from "../covermate-environment.mjs";
import { loadPlaywright } from "./lib/playwright.mjs";
import {
  argFlag,
  credentialLabel,
  decodeFirestoreDoc,
  firestoreRunQuery,
  loadUatLocalEnv,
  resolveUatCredential,
  resolveUatUrl,
  sleep,
  vercelBypassHeaders
} from "./lib/uat-env.mjs";

loadUatLocalEnv();

const argv = process.argv.slice(2);
const { chromium } = loadPlaywright();
const { url, environment } = resolveUatUrl(argv);
const credential = await resolveUatCredential({ allowGcloud: argFlag(argv, "--gcloud") });
const bypassHeaders = vercelBypassHeaders();
const chromePath =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const marker = `uat-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@covermate.local`;
const consoleErrors = [];
let browser;

try {
  browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined
  });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 }
  });
  const page = await context.newPage();
  await installVercelBypassRoute(page, url, bypassHeaders);
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

  const bodyText = await page.locator("body").innerText({ timeout: 10000 });
  if (/Vercel Authentication|Deployment Protection|Login to Vercel/i.test(bodyText)) {
    throw new Error("UAT preview is protected and the Vercel automation bypass header did not unlock it.");
  }
  if (bodyText.trim() === "CoverMate" || bodyText.trim().length < 200) {
    throw new Error("Visitor app did not finish rendering; page is still on the CoverMate boot placeholder.");
  }

  await page.evaluate(async () => {
    if (!window.CoverMateFirebase) await import(`${window.location.origin}/covermate-firebase.js`);
  });
  await page.waitForFunction(() => window.CoverMateFirebase && window.CoverMateEnvironment, null, { timeout: 25000 });

  const browserEnvironment = await page.evaluate(() => ({
    environment: window.CoverMateEnvironment,
    firebaseEnvironment: window.CoverMateFirebase.environment,
    title: document.title
  }));
  if (browserEnvironment.environment.name !== "uat" || browserEnvironment.firebaseEnvironment.leadCollection !== "contactLeadsUat") {
    throw new Error(`Browser resolved ${JSON.stringify(browserEnvironment)}, expected UAT/contactLeadsUat.`);
  }

  const lead = await page.evaluate(async (input) => {
    const cm = window.CoverMateFirebase;
    const result = await cm.submitContactLead(input);
    return {
      id: result.id,
      environment: cm.environment.name,
      leadCollection: cm.environment.leadCollection
    };
  }, {
    name: "UAT E2E Lead",
    contact: marker,
    topic: "Automated UAT E2E lead. Safe to ignore.",
    qtype: "general",
    coverage: "motor",
    consent: true,
    language: "th",
    summary: "UAT automation lead. Safe to ignore.",
    sourcePath: `${url.pathname}${url.search}${url.hash}#uat-e2e`
  });

  let verification = { mode: "browser-write-only", found: false, note: "No UAT credential was configured for Firestore/API readback." };
  let adminApi = { skipped: true, reason: "no UAT admin credential" };

  if (credential && credential.kind === "firebase-id-token") {
    adminApi = await checkAdminApis(url, credential, bypassHeaders, marker);
    verification = {
      mode: "Firebase admin API",
      found: true,
      collection: "contactLeadsUat",
      id: adminApi.leads.matchedId,
      contact: marker,
      coverage: adminApi.leads.matchedCoverage,
      status: adminApi.leads.matchedStatus
    };
  } else if (credential) {
    verification = await verifyLeadInUatCollection(marker, credential);
    adminApi = { skipped: true, reason: "credential is gcloud IAM, not a Firebase admin ID token" };
  }

  const actionableErrors = consoleErrors.filter((message) => /\[bundle\]|Uncaught|Minified React error|ReferenceError|TypeError/i.test(message));
  if (actionableErrors.length) {
    throw new Error(`Browser console errors during UAT smoke:\n${actionableErrors.join("\n")}`);
  }

  const productionGuard = resolveCoverMateEnvironment({
    host: "covermate.vercel.app",
    url: "/?cm_env=uat"
  });

  console.log(JSON.stringify({
    ok: true,
    target: url.href,
    resolvedEnvironment: environment.name,
    browserEnvironment: browserEnvironment.environment,
    publicLead: lead,
    readback: verification,
    adminApi,
    credential: credentialLabel(credential),
    vercelBypass: Object.keys(bypassHeaders).length > 0,
    productionGuard: {
      host: productionGuard.host,
      environment: productionGuard.name,
      reason: productionGuard.reason
    }
  }, null, 2));
} finally {
  if (browser) await browser.close();
}

async function installVercelBypassRoute(page, targetUrl, bypassHeadersInput) {
  if (!Object.keys(bypassHeadersInput).length) return;
  await page.route("**/*", (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.host !== targetUrl.host) return route.continue();
    return route.continue({
      headers: {
        ...route.request().headers(),
        ...bypassHeadersInput
      }
    });
  });
}

async function verifyLeadInUatCollection(contact, credentialInput) {
  let lastCount = 0;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const docs = await queryLeadByContact(contact, credentialInput);
    lastCount = docs.length;
    if (docs.length) {
      return {
        mode: credentialLabel(credentialInput),
        found: true,
        collection: "contactLeadsUat",
        id: docs[0].id,
        contact: docs[0].contact,
        coverage: docs[0].coverage,
        status: docs[0].status
      };
    }
    await sleep(1250);
  }
  throw new Error(`UAT lead ${contact} was not found in contactLeadsUat after write; lastCount=${lastCount}.`);
}

async function queryLeadByContact(contact, credentialInput) {
  const rows = await firestoreRunQuery({
    from: [{ collectionId: "contactLeadsUat" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "contact" },
        op: "EQUAL",
        value: { stringValue: contact }
      }
    },
    limit: 5
  }, credentialInput);
  return rows.map((row) => row.document).filter(Boolean).map(decodeFirestoreDoc);
}

async function checkAdminApis(targetUrl, credentialInput, bypassHeadersInput, expectedContact) {
  const base = new URL(targetUrl.href);
  const commonHeaders = {
    ...bypassHeadersInput,
    Authorization: credentialInput.authorization || `Bearer ${credentialInput.token}`
  };
  const leadsUrl = new URL("/api/ops/leads?limit=25&cm_env=uat", base.origin);
  const leadsResponse = await fetch(leadsUrl, { headers: commonHeaders });
  const leadsPayload = await leadsResponse.json().catch(() => ({}));
  if (!leadsResponse.ok) {
    throw new Error(`UAT Operations API failed with ${leadsResponse.status}: ${leadsPayload.message || leadsPayload.error || "unknown error"}`);
  }
  if (leadsPayload.environment !== "uat" || leadsPayload.source !== "firestore-uat") {
    throw new Error(`UAT Operations API returned wrong environment/source: ${JSON.stringify(leadsPayload).slice(0, 300)}`);
  }
  const matchedLead = (leadsPayload.rows || []).find((row) => row.contact === expectedContact);
  if (!matchedLead) {
    throw new Error(`UAT Operations API did not return the just-created lead ${expectedContact}.`);
  }

  const analyticsUrl = new URL("/api/analytics?days=7&cm_env=uat", base.origin);
  const analyticsResponse = await fetch(analyticsUrl, { headers: commonHeaders });
  const analyticsPayload = await analyticsResponse.json().catch(() => ({}));
  if (!analyticsResponse.ok) {
    throw new Error(`UAT Analytics API failed with ${analyticsResponse.status}: ${analyticsPayload.message || analyticsPayload.error || "unknown error"}`);
  }

  return {
    skipped: false,
    leads: {
      status: leadsResponse.status,
      environment: leadsPayload.environment,
      source: leadsPayload.source,
      total: leadsPayload.total,
      matchedId: matchedLead.id,
      matchedCoverage: matchedLead.interestKey,
      matchedStatus: matchedLead.status
    },
    analytics: {
      status: analyticsResponse.status,
      environment: analyticsPayload.environment,
      source: analyticsPayload.source,
      connection: analyticsPayload.connection && analyticsPayload.connection.status
    }
  };
}
