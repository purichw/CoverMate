import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import { launchChromium, loadPlaywright } from "./lib/playwright.mjs";
import { startStaticServer } from "./lib/static-server.mjs";

const playwright = loadPlaywright();
const { chromium } = playwright;
const outputDir = process.env.COVERMATE_TEXT_QA_DIR || "/tmp/covermate-text-editor-qa";

function firebaseMock() {
  return `
    const user = {
      uid: "browser-check-owner",
      email: "owner@example.com",
      displayName: "Browser Check Owner",
      photoURL: "",
      getIdToken: async () => "browser-check-token"
    };
    const session = {
      email: user.email,
      name: user.displayName,
      pic: "",
      role: "owner",
      ts: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
    window.CoverMateFirebase = {
      auth: { currentUser: user },
      waitForAuth: async () => user,
      syncSessionFromCurrentUser: async () => {
        window.localStorage.setItem("covermate-admin-session", JSON.stringify(session));
        return { ok: true, user, admin: { role: "owner", active: true }, session };
      },
      hydrateLocalContent: async () => null,
      saveSiteState: async () => ({ ok: true }),
      publishSiteState: async () => ({ ok: true, id: "browser-check-version", ts: Date.now() }),
      signOut: async () => {}
    };
    window.dispatchEvent(new CustomEvent("covermate-firebase-ready"));
    export {};
  `;
}

function sessionInitScript() {
  const session = {
    email: "owner@example.com",
    name: "Browser Check Owner",
    pic: "",
    role: "owner",
    ts: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  };
  window.localStorage.setItem("covermate-admin-session", JSON.stringify(session));
}

function findDraftSection(sectionId) {
  const config = JSON.parse(window.localStorage.getItem("purich-draft-config-v3") || "{}");
  return (config.sections || []).find((section) => section && section.id === sectionId) || null;
}

async function waitForText(page, pattern) {
  await page.waitForFunction(
    ({ source, flags }) => new RegExp(source, flags).test(document.body.innerText || ""),
    { source: pattern.source, flags: pattern.flags },
    { timeout: 30000 }
  );
}

async function newPage(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (url.endsWith("/favicon.ico")) return;
    errors.push(`${url} ${request.failure()?.errorText || "failed"}`);
  });
  await page.route("**/covermate-firebase.js", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: firebaseMock() })
  );
  await page.addInitScript(sessionInitScript);
  return { page, errors, baseUrl };
}

async function selectSection(page, sectionId) {
  await page.getByRole("button", { name: "ส่วนต่าง ๆ", exact: true }).click();
  const row = page.locator(`[data-admin-section-row="${sectionId}"]`).first();
  await row.scrollIntoViewIfNeeded();
  await row.locator(`[data-admin-section-edit="${sectionId}"]`).click();
  await page.waitForFunction(
    (id) => Array.from(document.querySelectorAll("aside"))
      .some((aside) => /Admin Portal/.test(aside.innerText || "") && (aside.innerText || "").includes(`#${id}`)),
    sectionId,
    { timeout: 10000 }
  );
  await page.getByRole("button", { name: "เนื้อหา", exact: true }).click();
}

async function clickVisibility(locator, label) {
  await locator.scrollIntoViewIfNeeded();
  const byRole = locator.getByRole("button", { name: label, exact: true }).first();
  if (await byRole.count()) {
    await byRole.click();
    return;
  }
  await locator.locator("button").filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) }).first().click();
}

async function sectionState(page, sectionId) {
  return page.evaluate(findDraftSection, sectionId);
}

async function verifyInlineEmptyPersistence(page, baseUrl) {
  await page.goto(`${baseUrl}/admin/edit`, { waitUntil: "load", timeout: 30000 });
  await page.locator('[data-admin-owner-bar="edit"]').waitFor({ state: "visible", timeout: 15000 });
  await page.locator('#hero h1[contenteditable="true"][data-ek], #hero h1 [contenteditable="true"][data-ek]').first().waitFor({ state: "visible", timeout: 15000 });

  const target = await page.evaluate(() => {
    const visible = (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && rect.width > 0 && rect.height > 0;
    };
    // Use a persistent copy slot. Blank navigation labels are intentionally
    // omitted from the rendered menu, so an arbitrary first editable is not
    // evidence that a cleared content slot can be edited again after reload.
    const el = document.querySelector('#hero h1[contenteditable="true"][data-ek], #hero h1 [contenteditable="true"][data-ek]');
    if (!el || !visible(el) || !(el.textContent || "").trim()) return null;
    el.setAttribute("data-browser-empty-target", "true");
    return { key: el.getAttribute("data-ek"), text: el.textContent };
  });
  assert.ok(target && target.key, "No visible inline editable target found");

  const targetLocator = page.locator('[data-browser-empty-target="true"]').first();
  await targetLocator.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await targetLocator.evaluate((el) => el.blur());
  await page.waitForFunction(
    (key) => {
      const text = JSON.parse(window.localStorage.getItem("purich-draft-text-v3") || "{}");
      const config = JSON.parse(window.localStorage.getItem("purich-draft-config-v3") || "{}");
      // Semantic inline copy commits into config on blur; positional legacy
      // overrides still live in the text map. Both must preserve an empty slot.
      return key.startsWith('cms:') ? window.CoverMateContract.cmsGet(config, key.slice(4)) === '' : Object.prototype.hasOwnProperty.call(text, key) && text[key] === "";
    },
    target.key,
    { timeout: 10000 }
  );

  const blankState = await page.evaluate((key) => {
    const el = Array.from(document.querySelectorAll(`[data-ek]`)).find((node) => node.getAttribute("data-ek") === key);
    const text = JSON.parse(window.localStorage.getItem("purich-draft-text-v3") || "{}");
    const config = JSON.parse(window.localStorage.getItem("purich-draft-config-v3") || "{}");
    const value = key.startsWith('cms:') ? window.CoverMateContract.cmsGet(config, key.slice(4)) : text[key];
    return {
      persisted: value !== undefined,
      value,
      renderedText: el?.textContent,
      emptyAttr: el?.getAttribute("data-om-empty") || "",
      label: el?.getAttribute("data-empty-label") || "",
      contentEditable: el?.getAttribute("contenteditable") || ""
    };
  }, target.key);
  assert.equal(blankState.persisted, true, "Empty inline override was not saved");
  assert.equal(blankState.value, "", "Empty inline override changed value");
  assert.equal(blankState.renderedText, "", "Cleared inline content was not rendered as blank");
  assert.equal(blankState.emptyAttr, "true", "Empty inline element did not keep placeholder state");
  assert.equal(blankState.contentEditable, "true", "Empty inline element stopped being editable");

  await page.reload({ waitUntil: "load", timeout: 30000 });
  await page.locator('[data-admin-owner-bar="edit"]').waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction(
    (key) => Array.from(document.querySelectorAll('[contenteditable="true"][data-ek]'))
      .some((node) => node.getAttribute('data-ek') === key),
    target.key,
    { timeout: 15000 }
  );
  const reloadState = await page.evaluate((key) => {
    const el = Array.from(document.querySelectorAll(`[data-ek]`)).find((node) => node.getAttribute("data-ek") === key);
    const text = JSON.parse(window.localStorage.getItem("purich-draft-text-v3") || "{}");
    const config = JSON.parse(window.localStorage.getItem("purich-draft-config-v3") || "{}");
    const value = key.startsWith('cms:') ? window.CoverMateContract.cmsGet(config, key.slice(4)) : text[key];
    return {
      hasElement: !!el,
      persisted: value !== undefined,
      value,
      renderedText: el?.textContent,
      emptyAttr: el?.getAttribute("data-om-empty") || "",
      label: el?.getAttribute("data-empty-label") || "",
      contentEditable: el?.getAttribute("contenteditable") || ""
    };
  }, target.key);
  assert.equal(reloadState.hasElement, true, "Empty inline slot disappeared after reload");
  assert.equal(reloadState.persisted, true, "Empty inline override disappeared after reload");
  assert.equal(reloadState.value, "", "Empty inline override did not reload as an empty string");
  assert.equal(reloadState.renderedText, "", "Reloaded inline slot rendered fallback text instead of the saved blank");
  assert.equal(reloadState.emptyAttr, "true", "Empty inline placeholder did not reload");
  assert.equal(reloadState.contentEditable, "true", "Empty inline slot was not editable after reload");
  const reloadedTarget = page.locator(`[data-ek="${target.key}"]`).first();
  const refillText = 'หัวข้อที่แก้ไขหลัง Reload';
  await reloadedTarget.fill(refillText);
  await reloadedTarget.press('Tab');
  await page.waitForFunction(
    ({ key, expected }) => {
      const config = JSON.parse(window.localStorage.getItem('purich-draft-config-v3') || '{}');
      const text = JSON.parse(window.localStorage.getItem('purich-draft-text-v3') || '{}');
      return (key.startsWith('cms:') ? window.CoverMateContract.cmsGet(config, key.slice(4)) : text[key]) === expected;
    },
    { key: target.key, expected: refillText },
    { timeout: 10000 }
  );
  return target.key;
}

async function verifyItemControls(page, baseUrl) {
  await page.goto(`${baseUrl}/admin/content`, { waitUntil: "load", timeout: 30000 });
  await waitForText(page, /Admin Portal/);
  await selectSection(page, "faq");

  const before = await sectionState(page, "faq");
  assert.ok(before?.items?.length, "FAQ repeatable items missing");
  const firstId = before.items[0].id;
  const row = page.locator(`[data-admin-repeatable-id="${firstId}"]`).first();
  await clickVisibility(row, "ซ่อน");
  await row.getByText("ซ่อนอยู่", { exact: true }).waitFor({ timeout: 10000 });
  let current = await sectionState(page, "faq");
  assert.equal(current.items.length, before.items.length, "Hiding an item deleted it");
  assert.equal(current.items[0].id, firstId, "Hiding an item changed its id");
  assert.equal(current.items[0].on, false, "Item hide did not set on=false");

  await clickVisibility(row, "แสดงอีกครั้ง");
  await row.getByText("แสดงอยู่", { exact: true }).waitFor({ timeout: 10000 });
  current = await sectionState(page, "faq");
  assert.equal(current.items.length, before.items.length, "Restoring an item duplicated it");
  assert.equal(current.items[0].on, true, "Item restore did not set on=true");

  await page.getByRole("button", { name: "+ เพิ่มคำถาม", exact: true }).click();
  await page.waitForFunction(
    (count) => {
      const config = JSON.parse(window.localStorage.getItem("purich-draft-config-v3") || "{}");
      const section = (config.sections || []).find((item) => item && item.id === "faq");
      return (section?.items || []).length === count + 1;
    },
    before.items.length,
    { timeout: 10000 }
  );
  current = await sectionState(page, "faq");
  const added = current.items[current.items.length - 1];
  assert.ok(added.id && added.id !== firstId, "Added item did not get a durable id");
  assert.equal(added.on, true, "Added item is not visible by default");
  assert.equal(added.th.q, "", "Added Thai question should start blank");
  assert.equal(added.en.q, "", "Added English question should start blank");
  return { firstId, addedId: added.id };
}

async function verifyCardControls(page) {
  await selectSection(page, "insurers");
  const before = await sectionState(page, "insurers");
  assert.ok(before?.cards?.length, "Insurer repeatable cards missing");
  const firstId = before.cards[0].id;
  const row = page.locator(`[data-admin-repeatable-card-id="${firstId}"]`).first();
  await clickVisibility(row, "ซ่อน");
  await row.getByText("ซ่อนอยู่", { exact: true }).waitFor({ timeout: 10000 });
  let current = await sectionState(page, "insurers");
  assert.equal(current.cards.length, before.cards.length, "Hiding a card deleted it");
  assert.equal(current.cards[0].id, firstId, "Hiding a card changed its id");
  assert.equal(current.cards[0].on, false, "Card hide did not set on=false");

  await clickVisibility(row, "แสดงอีกครั้ง");
  await row.getByText("แสดงอยู่", { exact: true }).waitFor({ timeout: 10000 });
  current = await sectionState(page, "insurers");
  assert.equal(current.cards.length, before.cards.length, "Restoring a card duplicated it");
  assert.equal(current.cards[0].on, true, "Card restore did not set on=true");

  await page.getByRole("button", { name: "+ เพิ่มการ์ดบริษัทประกัน", exact: true }).click();
  await page.waitForFunction(
    (count) => {
      const config = JSON.parse(window.localStorage.getItem("purich-draft-config-v3") || "{}");
      const section = (config.sections || []).find((item) => item && item.id === "insurers");
      return (section?.cards || []).length === count + 1;
    },
    before.cards.length,
    { timeout: 10000 }
  );
  current = await sectionState(page, "insurers");
  const added = current.cards[current.cards.length - 1];
  assert.ok(added.id && added.id !== firstId, "Added card did not get a durable id");
  assert.equal(added.on, true, "Added card is not visible by default");
  assert.equal(added.th.title, "", "Added Thai card title should start blank");
  assert.equal(added.en.title, "", "Added English card title should start blank");
  return { firstId, addedId: added.id };
}

async function verifyHeadControls(page) {
  await selectSection(page, "tiers");
  const before = await sectionState(page, "tiers");
  assert.ok(before?.heads?.length, "Tier repeatable heads missing");
  const firstId = before.heads[0].id;
  const row = page.locator(`[data-admin-repeatable-head-id="${firstId}"]`).first();
  const firstTierCellCount = before.items?.[0]?.st?.length || 0;
  await clickVisibility(row, "ซ่อน");
  await row.getByText("ซ่อนอยู่", { exact: true }).waitFor({ timeout: 10000 });
  let current = await sectionState(page, "tiers");
  assert.equal(current.heads.length, before.heads.length, "Hiding a column deleted it");
  assert.equal(current.heads[0].id, firstId, "Hiding a column changed its id");
  assert.equal(current.heads[0].on, false, "Column hide did not set on=false");
  assert.equal(current.items?.[0]?.st?.length || 0, firstTierCellCount, "Column hide changed tier row cell count");

  await clickVisibility(row, "แสดงอีกครั้ง");
  await row.getByText("แสดงอยู่", { exact: true }).waitFor({ timeout: 10000 });
  current = await sectionState(page, "tiers");
  assert.equal(current.heads.length, before.heads.length, "Restoring a column duplicated it");
  assert.equal(current.heads[0].on, true, "Column restore did not set on=true");

  await page.getByRole("button", { name: "+ เพิ่มคอลัมน์", exact: true }).click();
  await page.waitForFunction(
    (count) => {
      const config = JSON.parse(window.localStorage.getItem("purich-draft-config-v3") || "{}");
      const section = (config.sections || []).find((item) => item && item.id === "tiers");
      return (section?.heads || []).length === count + 1;
    },
    before.heads.length,
    { timeout: 10000 }
  );
  current = await sectionState(page, "tiers");
  const added = current.heads[current.heads.length - 1];
  assert.ok(added.id && added.id !== firstId, "Added column did not get a durable id");
  assert.equal(added.on, true, "Added column is not visible by default");
  assert.ok(current.items.every((item) => Array.isArray(item.st) && item.st.length === current.heads.length), "Added column did not extend all tier rows");
  return { firstId, addedId: added.id };
}

async function hideSectionFromBuilder(page, sectionId) {
  await page.getByRole("button", { name: "ส่วนต่าง ๆ", exact: true }).click();
  const row = page.locator(`[data-admin-section-row="${sectionId}"]`).first();
  await row.scrollIntoViewIfNeeded();
  const status = row.getByText("ซ่อนอยู่", { exact: true });
  if (!(await status.count())) {
    await row.locator('button[aria-label="แสดงหรือซ่อนส่วนนี้"]').first().click();
  }
  await row.getByText("ซ่อนอยู่", { exact: true }).waitFor({ timeout: 10000 });
}

async function verifyHiddenSectionTargetLinks(page, baseUrl) {
  await page.goto(`${baseUrl}/admin/content`, { waitUntil: "load", timeout: 30000 });
  await waitForText(page, /Admin Portal/);
  for (const sectionId of ["fit", "claim", "privacy", "talk"]) {
    await hideSectionFromBuilder(page, sectionId);
  }

  await page.goto(`${baseUrl}/admin/edit`, { waitUntil: "load", timeout: 30000 });
  await page.locator('[data-admin-owner-bar="edit"]').waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction(
    () => {
      const config = JSON.parse(window.localStorage.getItem("purich-draft-config-v3") || "{}");
      const byId = Object.fromEntries((config.sections || []).filter(Boolean).map((section) => [section.id, section]));
      return ["fit", "claim", "privacy", "talk"].every((id) => byId[id]?.on === false);
    },
    { timeout: 10000 }
  );

  const state = await page.evaluate(() => {
    const count = (selector) => document.querySelectorAll(selector).length;
    return {
      hiddenSectionsRendered: ["fit", "claim", "privacy", "talk"].filter((id) => Boolean(document.getElementById(id))),
      fitAnchors: count('a[href="#fit"]'),
      claimAnchors: count('a[href="#claim"]'),
      talkAnchors: count('a[href="#talk"]'),
      privacyAnchors: count('a[href="#privacy"]'),
      navHrefs: Array.from(document.querySelectorAll("header nav a[href]")).map((link) => link.getAttribute("href"))
    };
  });
  assert.deepEqual(state.hiddenSectionsRendered, [], "Hidden sections still rendered on the editable visitor surface");
  assert.equal(state.fitAnchors, 0, "Editable visitor surface still links to hidden fit section");
  assert.equal(state.claimAnchors, 0, "Editable visitor surface still links to hidden claim section");
  assert.equal(state.talkAnchors, 0, "Editable visitor surface still links to hidden talk section");
  assert.equal(state.privacyAnchors, 0, "Editable visitor surface still links to hidden privacy section");
  return state;
}

async function verifyClosePanelStaysInEditor(page, baseUrl) {
  await page.goto(`${baseUrl}/admin/edit`, { waitUntil: "load", timeout: 30000 });
  await page.locator('[data-admin-owner-bar="edit"]').waitFor({ state: "visible", timeout: 15000 });
  await page.locator('[contenteditable="true"][data-ek]').first().waitFor({ state: "visible", timeout: 15000 });

  await page.locator('label[for="covermate-owner-tools-toggle"]').click();
  await page.getByRole("button", { name: "แผงเครื่องมือ", exact: true }).click();
  const panel = page.locator("aside").filter({ hasText: "Admin Portal" }).first();
  await panel.waitFor({ state: "visible", timeout: 15000 });

  await page.getByTitle("ปิดแผงเครื่องมือ").click();
  await panel.waitFor({ state: "hidden", timeout: 10000 });
  await page.locator('[data-admin-owner-bar="edit"]').waitFor({ state: "visible", timeout: 15000 });
  await page.locator('[contenteditable="true"][data-ek]').first().waitFor({ state: "visible", timeout: 15000 });
  await page.screenshot({ path: path.join(outputDir, "editor-after-panel-close-desktop.png"), fullPage: false });

  const state = await page.evaluate(() => ({
    path: window.location.pathname,
    ownerDockVisible: !!document.querySelector('[data-admin-owner-bar="edit"]'),
    editableCount: document.querySelectorAll('[contenteditable="true"][data-ek]').length,
    adminPanelVisible: Array.from(document.querySelectorAll("aside")).some((aside) => {
      const style = window.getComputedStyle(aside);
      return /Admin Portal/.test(aside.innerText || "") && style.display !== "none" && style.visibility !== "hidden" && aside.getBoundingClientRect().width > 0;
    })
  }));
  assert.equal(state.path, "/admin/edit", "Closing the panel from editor did not stay on /admin/edit");
  assert.equal(state.ownerDockVisible, true, "Closing the panel removed the editor dock");
  assert.equal(state.adminPanelVisible, false, "Closing the panel did not hide the panel");
  assert.ok(state.editableCount > 0, "Closing the panel disabled inline editable fields");
  return state;
}

let browser;
let server;

try {
  await fs.mkdir(outputDir, { recursive: true });
  const started = await startStaticServer({ ownerRoutesToRoot: true });
  server = started.server;
  browser = await launchChromium(chromium, { headless: true });
  const { page, errors, baseUrl } = await newPage(browser, started.baseUrl);

  const inlineKey = await verifyInlineEmptyPersistence(page, baseUrl);
  const item = await verifyItemControls(page, baseUrl);
  const card = await verifyCardControls(page);
  const head = await verifyHeadControls(page);
  const sectionLinks = await verifyHiddenSectionTargetLinks(page, baseUrl);
  const closePanel = await verifyClosePanelStaysInEditor(page, baseUrl);

  const noisyErrors = errors.filter((message) => {
    if (/Not found|404/.test(message)) return false;
    if (/%22[0-9a-f-]{36}\/%22/.test(message)) return false;
    return true;
  });
  assert.deepEqual(noisyErrors, [], `Unexpected browser errors: ${noisyErrors.join(" | ")}`);

  console.log(JSON.stringify({
    checks: [
      "cleared inline text remains editable and survives reload",
      "repeatable items hide/restore without deletion",
      "repeatable items can be added with blank fields",
      "repeatable cards hide/restore without deletion",
      "repeatable cards can be added with blank fields",
      "tier columns hide/restore without deleting matrix cells",
      "tier columns can be added and extend all rows",
      "section-target links disappear after hiding their target section through admin",
      "closing the admin panel from editor keeps the editor route and dock active"
    ],
    inlineKey,
    item,
    card,
    head,
    sectionLinks,
    closePanel
  }, null, 2));
  await page.close();
} finally {
  if (browser) await browser.close();
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
}
