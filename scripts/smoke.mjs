import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let playwright;

try {
  playwright = require("playwright");
} catch {
  playwright = require(
    "/Users/point/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
  );
}

const { chromium } = playwright;

const baseUrl = process.env.COVERMATE_URL || "http://localhost:4177";
const chromePath =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const viewports = [
  ["desktop", 1440, 900],
  ["tablet", 820, 1180],
  ["mobile", 390, 844]
];

const routes = [
  ["/", "main"],
  ["/#motor", "main"],
  ["/#life", "main"],
  ["/#motor-focus", "main"],
  ["/#life-focus", "main"],
  ["/admin/login", "main"]
];

const mainVisitorRoutes = new Set(["/", "/#motor", "/#life"]);
const motorSectionRoutes = new Set(["/", "/#motor", "/#motor-focus"]);
const visitorRoutes = new Set(["/", "/#motor", "/#life", "/#motor-focus", "/#life-focus"]);

function extractDefaultSiteConfig() {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const templateMatch = html.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
  if (!templateMatch) throw new Error("index.html: embedded template missing");
  const template = JSON.parse(templateMatch[1]);
  const scriptMatch = template.match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error("index.html: text/x-dc script missing");
  const defaultsEnd = scriptMatch[1].indexOf("const SCHEMA =");
  if (defaultsEnd < 0) throw new Error("index.html: DEFAULTS boundary missing");
  const sandbox = { result: null };
  vm.runInNewContext(`${scriptMatch[1].slice(0, defaultsEnd)}\nresult = DEFAULTS;`, sandbox);
  return sandbox.result;
}

const defaultSiteConfig = extractDefaultSiteConfig();

function renamedConfig(name) {
  const config = structuredClone(defaultSiteConfig);
  config.brand.name = { th: name, en: name };
  config.brand.fullName = { th: name, en: name };
  return config;
}

function remoteContentMock(remoteConfig, remoteText = {}) {
  return `
    const remoteConfig = ${JSON.stringify(remoteConfig)};
    const remoteText = ${JSON.stringify(remoteText)};
    window.CoverMateFirebase = {
      hydrateLocalContent: async (opts = {}) => {
        window.__covermateHydrateOpts = opts;
        window.localStorage.setItem("purich-live-config-v3", JSON.stringify(remoteConfig));
        window.localStorage.setItem("purich-live-text-v3", JSON.stringify(remoteText));
        if (opts.draft === true) {
          window.localStorage.setItem("purich-draft-config-v3", JSON.stringify(remoteConfig));
          window.localStorage.setItem("purich-draft-text-v3", JSON.stringify(remoteText));
        }
        if (opts.versions === true) {
          window.localStorage.setItem("purich-history-v3", JSON.stringify([
            { id: "remote-smoke-version", ts: Date.now(), config: remoteConfig, text: remoteText }
          ]));
        }
        window.__covermateRemoteContent = {
          live: true,
          draft: opts.draft === true,
          versions: opts.versions === true,
          source: "remote-smoke"
        };
        return window.__covermateRemoteContent;
      },
      signOut: async () => {}
    };
    window.dispatchEvent(new CustomEvent("covermate-firebase-ready"));
    export {};
  `;
}

async function waitForBodyText(page, pattern, timeout = 30000) {
  await page.waitForFunction(
    ({ source, flags }) => new RegExp(source, flags).test(document.body.innerText || ""),
    { source: pattern.source, flags: pattern.flags },
    { timeout }
  );
}

const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath
});

const failures = [];

async function verifyRemoteHydrationContract() {
  const remoteName = "Remote Live Smoke";
  const staleName = "Stale Cache Smoke";
  const remoteConfig = renamedConfig(remoteName);
  const staleConfig = renamedConfig(staleName);

  const publicPage = await browser.newPage({ viewport: { width: 1024, height: 800 } });
  await publicPage.route("**/covermate-firebase.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: remoteContentMock(remoteConfig)
    })
  );
  await publicPage.addInitScript(({ config }) => {
    window.localStorage.setItem("purich-live-config-v3", JSON.stringify(config));
    window.localStorage.setItem("purich-live-text-v3", JSON.stringify({}));
  }, { config: staleConfig });
  await publicPage.goto(new URL("/", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
  await publicPage.waitForFunction(() => Boolean(document.body), null, { timeout: 10000 });
  await waitForBodyText(publicPage, new RegExp(remoteName));
  const publicState = await publicPage.evaluate(() => ({
    text: document.body.innerText,
    cachedBrand: JSON.parse(window.localStorage.getItem("purich-live-config-v3") || "{}")?.brand?.name?.th || "",
    opts: window.__covermateHydrateOpts || null,
    seoTitle: document.title,
    seoJsonName: (() => {
      try {
        const data = JSON.parse(document.getElementById("covermate-jsonld")?.textContent || "{}");
        const org = (data["@graph"] || []).find((entry) =>
          Array.isArray(entry["@type"]) && entry["@type"].includes("InsuranceAgency")
        );
        return org?.name || "";
      } catch {
        return "";
      }
    })()
  }));
  if (!publicState.text.includes(remoteName) || publicState.text.includes(staleName)) {
    failures.push("remote hydration: public route did not let Firestore live content override stale local cache");
  }
  if (publicState.cachedBrand !== remoteName) {
    failures.push(`remote hydration: local live cache was not rewritten from remote (${publicState.cachedBrand})`);
  }
  if (!publicState.opts || publicState.opts.draft === true || publicState.opts.versions === true) {
    failures.push("remote hydration: public route fetched draft/version data unnecessarily");
  }
  if (!publicState.seoTitle.includes(remoteName) || publicState.seoJsonName !== remoteName) {
    failures.push("remote hydration: SEO metadata did not sync from remote live content");
  }
  await publicPage.close();

  const ownerPage = await browser.newPage({ viewport: { width: 1024, height: 800 } });
  await ownerPage.route("**/covermate-firebase.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: remoteContentMock(remoteConfig)
    })
  );
  await ownerPage.addInitScript(() => {
    window.localStorage.setItem(
      "covermate-admin-session",
      JSON.stringify({
        email: "owner@example.com",
        name: "Owner",
        pic: "",
        ts: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      })
    );
  });
  await ownerPage.goto(new URL("/#admin", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
  await ownerPage.waitForFunction(() => Boolean(document.body), null, { timeout: 10000 });
  await waitForBodyText(ownerPage, /Admin portal/);
  const ownerState = await ownerPage.evaluate(() => ({
    text: document.body.innerText,
    opts: window.__covermateHydrateOpts || null,
    history: JSON.parse(window.localStorage.getItem("purich-history-v3") || "[]")
  }));
  if (!ownerState.text.includes("Admin portal")) {
    failures.push("remote hydration: owner route did not render admin panel under mocked remote content");
  }
  if (!ownerState.opts || ownerState.opts.draft !== true || ownerState.opts.versions !== true) {
    failures.push("remote hydration: owner route did not request draft and versions");
  }
  if (!Array.isArray(ownerState.history) || ownerState.history[0]?.id !== "remote-smoke-version") {
    failures.push("remote hydration: owner route did not cache remote version history");
  }
  await ownerPage.close();
}

async function verifyStaticSeoFiles() {
  const robotsResponse = await fetch(new URL("/robots.txt", baseUrl));
  const robots = await robotsResponse.text();
  if (!robotsResponse.ok) failures.push(`seo /robots.txt: HTTP ${robotsResponse.status}`);
  if (!/Sitemap:\s*https:\/\/covermate\.vercel\.app\/sitemap\.xml/.test(robots)) {
    failures.push("seo /robots.txt: missing production sitemap directive");
  }
  if (!/Disallow:\s*\/admin\/?/.test(robots)) {
    failures.push("seo /robots.txt: admin routes are not disallowed");
  }

  const sitemapResponse = await fetch(new URL("/sitemap.xml", baseUrl));
  const sitemap = await sitemapResponse.text();
  if (!sitemapResponse.ok) failures.push(`seo /sitemap.xml: HTTP ${sitemapResponse.status}`);
  const locs = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map((match) => match[1]);
  if (!locs.includes("https://covermate.vercel.app/")) {
    failures.push("seo /sitemap.xml: missing canonical public root");
  }
  if (locs.some((loc) => /#|\/admin/.test(loc))) {
    failures.push("seo /sitemap.xml: sitemap includes hash or admin URLs");
  }

  const manifestResponse = await fetch(new URL("/site.webmanifest", baseUrl));
  const manifest = await manifestResponse.json().catch(() => null);
  if (!manifestResponse.ok) failures.push(`seo /site.webmanifest: HTTP ${manifestResponse.status}`);
  if (!manifest || manifest.name !== "CoverMate" || manifest.start_url !== "/") {
    failures.push("seo /site.webmanifest: invalid name or start_url");
  }
  const manifestIcons = Array.isArray(manifest?.icons) ? manifest.icons.map((icon) => icon.src) : [];
  for (const icon of ["/favicon.svg", "/assets/icon-192.png", "/assets/icon-512.png"]) {
    if (!manifestIcons.includes(icon)) failures.push(`seo /site.webmanifest: missing icon ${icon}`);
  }

  for (const asset of ["/favicon.ico", "/favicon.svg", "/covermate-firebase.js", "/covermate-analytics.js", "/admin/session.js", "/admin/analytics-data.js", "/assets/covermate-og.png", "/assets/apple-touch-icon.png", "/assets/icon-192.png", "/assets/icon-512.png"]) {
    const response = await fetch(new URL(asset, baseUrl));
    if (!response.ok) failures.push(`seo ${asset}: HTTP ${response.status}`);
  }
}

await verifyStaticSeoFiles();
await verifyRemoteHydrationContract();

for (const [name, width, height] of viewports) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1
  });

  const failedRequests = [];
  const pageErrors = [];

  page.on("requestfailed", (request) => {
    const url = request.url();
    const failureText = request.failure()?.errorText || "failed";
    if (url.endsWith("/favicon.ico")) return;
    if (url.endsWith("/.image-slots.state.json")) return;
    if (
      failureText === "net::ERR_ABORTED" &&
      (url.endsWith("/favicon.svg") || url.endsWith("/covermate-firebase.js"))
    ) {
      return;
    }
    if (failureText === "net::ERR_ABORTED" && url.includes("firestore.googleapis.com/google.firestore")) {
      return;
    }
    if (failureText === "net::ERR_ABORTED" && url.includes("www.gstatic.com/firebasejs/")) {
      return;
    }
    if (failureText === "net::ERR_ABORTED" && url.includes("google-analytics.com/g/collect")) {
      return;
    }
    if (failureText === "net::ERR_ABORTED" && (url.startsWith("blob:") || url.includes("/admin/login"))) {
      return;
    }
    failedRequests.push(`${url} :: ${failureText}`);
  });
  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    if (status < 400) return;
    if (url.endsWith("/favicon.ico")) return;
    if (url.endsWith("/.image-slots.state.json")) return;
    failedRequests.push(`${url} :: HTTP ${status}`);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const [route, selector] of routes) {
    const url = new URL(route, baseUrl).toString();
    await page.goto(url, { waitUntil: "commit", timeout: 30000 });
    await page.waitForFunction(() => Boolean(document.body), null, { timeout: 10000 });
    const firstPaintState = await page.evaluate(() => {
      const isVisible = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const splashVisible = ["#__bundler_thumbnail", "#__bundler_loading"].some((selector) =>
        isVisible(document.querySelector(selector))
      );
      const xdc = document.querySelector("x-dc");
      const visibleText = document.body.innerText || "";
      return {
        splashVisible,
        rawTemplateVisible: Boolean(xdc && isVisible(xdc) && /{{|}}/.test(xdc.textContent || "")),
        rawVisibleText: /{{|}}/.test(visibleText),
        visibleText: visibleText.slice(0, 140)
      };
    });
    if (firstPaintState.splashVisible) {
      failures.push(`${name} ${route}: exported bundler splash is visible on first paint`);
    }
    if (firstPaintState.rawTemplateVisible || firstPaintState.rawVisibleText) {
      failures.push(
        `${name} ${route}: raw template is visible on first paint (${firstPaintState.visibleText})`
      );
    }
    await page.waitForFunction(
      (targetSelector) => Boolean(document.querySelector(targetSelector)) && (document.body.innerText || "").trim().length > 40,
      selector,
      { timeout: 30000 }
    );
    await page.waitForTimeout(600);
    if (route === "/#motor" || route === "/#life") {
      const aliasState = await page.evaluate((targetId) => {
        const header = document.querySelector("header");
        const target = document.getElementById(targetId);
        const headerRect = header ? header.getBoundingClientRect() : null;
        const targetRect = target ? target.getBoundingClientRect() : null;
      const navHrefs = Array.from(document.querySelectorAll("header nav a[href]"))
        .map((anchor) => anchor.getAttribute("href"))
        .filter(Boolean);
      const navText = Array.from(document.querySelectorAll("header nav a[href]"))
        .map((anchor) => (anchor.textContent || "").trim())
        .filter(Boolean)
        .join(" | ");
      const navLabels = Array.from(document.querySelectorAll("header nav a[href]"))
        .map((anchor) => (anchor.textContent || "").trim())
        .filter(Boolean);
      return {
        navHrefs,
        navText,
        navLabels,
        bodyText: document.body.innerText,
        headerBottom: headerRect ? headerRect.bottom : 0,
        targetTop: targetRect ? targetRect.top : null,
        viewportHeight: window.innerHeight,
          targetScrollMarginTop: target ? window.getComputedStyle(target).scrollMarginTop : ""
        };
      }, route === "/#motor" ? "insurers" : "cover");
      const expectedMainNav = ["#cover", "#insurers", "#claim", "#fit", "#how", "#faq"];
      const missingMainNav = expectedMainNav.filter((href) => !aliasState.navHrefs.includes(href));
      if (missingMainNav.length) {
        failures.push(`${name} ${route}: alias should keep main nav, missing ${missingMainNav.join(", ")}`);
      }
      if (aliasState.navHrefs.includes("#motor-cover") || aliasState.navHrefs.includes("#life-cover")) {
        failures.push(`${name} ${route}: alias exposed hidden focus-variant nav`);
      }
      const duplicateNavLabels = aliasState.navLabels.filter(
        (label, index, labels) => labels.indexOf(label) !== index
      );
      if (duplicateNavLabels.length) {
        failures.push(`${name} ${route}: duplicate header nav labels ${duplicateNavLabels.join(", ")}`);
      }
      if (/เบี้ยรถคันเดิม|One car, every insurer compared|ตอนที่ต้องใช้จริง|Nobody reads the policy/.test(aliasState.bodyText)) {
        failures.push(`${name} ${route}: hidden focus landing variant rendered`);
      }
      if (
        aliasState.targetTop == null ||
        aliasState.targetTop < aliasState.headerBottom + 4 ||
        aliasState.targetTop > aliasState.viewportHeight * 0.72
      ) {
        failures.push(
          `${name} ${route}: alias did not land on the intended main section below the sticky header ` +
            `(top=${aliasState.targetTop}, headerBottom=${aliasState.headerBottom})`
        );
      }
      if (!aliasState.targetScrollMarginTop || aliasState.targetScrollMarginTop === "0px") {
        failures.push(`${name} ${route}: alias target anchor is missing scroll-margin-top`);
      }
    }
    if (motorSectionRoutes.has(route)) {
      const insurers = page.locator("#insurers");
      if (await insurers.count()) {
        await insurers.scrollIntoViewIfNeeded();
        await page.waitForTimeout(900);
      }
    }

    const state = await page.evaluate((targetSelector) => {
      const root = document.documentElement;
      const target = document.querySelector(targetSelector);
      const visibleInsurerLogoEls = Array.from(
        document.querySelectorAll("#insurers img, #insurers [role='img']")
      ).filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      });
      const logos = visibleInsurerLogoEls.map((el) => {
        const style = window.getComputedStyle(el);
        const isImg = el.tagName === "IMG";
        return {
          src: isImg ? el.getAttribute("src") : style.backgroundImage,
          complete: isImg ? el.complete : style.backgroundImage !== "none",
          naturalWidth: isImg ? el.naturalWidth : Math.round(el.getBoundingClientRect().width),
          naturalHeight: isImg ? el.naturalHeight : Math.round(el.getBoundingClientRect().height)
        };
      });
      const bodyText = document.body.innerText;
      const insurerText = document.querySelector("#insurers")?.innerText || "";
      const selectOptions = Array.from(document.querySelectorAll("select")).map((select) =>
        Array.from(select.options).map((option) => option.textContent || "").join(" ")
      );
      const navHrefs = Array.from(document.querySelectorAll("header a[href], nav a[href]"))
        .map((anchor) => anchor.getAttribute("href"))
        .filter(Boolean);
      const headerNavLabels = Array.from(document.querySelectorAll("header nav a[href]"))
        .map((anchor) => (anchor.textContent || "").trim())
        .filter(Boolean);
      const missingAnchors = navHrefs.filter(
        (href) => href.startsWith("#") && !document.getElementById(href.slice(1))
      );
      const jsonLdText = document.getElementById("covermate-jsonld")?.textContent || "";
      let jsonLd = null;
      try {
        jsonLd = jsonLdText ? JSON.parse(jsonLdText) : null;
      } catch {
        jsonLd = null;
      }
      const splashVisible = ["#__bundler_thumbnail", "#__bundler_loading"].some((selector) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          rect.width > 0 &&
          rect.height > 0
        );
      });

      return {
        title: document.title,
        hasTarget: Boolean(target),
        sectionIds: Array.from(document.querySelectorAll("section[id]")).map((section) => section.id),
        h1Text: Array.from(document.querySelectorAll("h1")).map((heading) =>
          (heading.textContent || "").trim()
        ).join(" | "),
        contactHeadingText: document.querySelector("#talk h2")?.textContent || "",
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        bodyFont: window.getComputedStyle(document.body).fontFamily,
        h1Font: document.querySelector("h1")
          ? window.getComputedStyle(document.querySelector("h1")).fontFamily
          : "",
        logos,
        bodyText,
        insurerText,
        hasQueryTypeSelect: selectOptions.some((text) =>
          /ขอใบเสนอราคา|Request a quote|Compare plans|เปรียบเทียบแผน/.test(text)
        ),
        hasCoverageSelect: selectOptions.some((text) =>
          /ประกันรถยนต์|Motor|Life|ประกันชีวิต/.test(text)
        ),
        hasRelationshipProof: /AIA|Srikrung|ศรีกรุง/i.test(insurerText),
        missingAnchors,
        duplicateHeaderNavLabels: headerNavLabels.filter(
          (label, index, labels) => labels.indexOf(label) !== index
        ),
        splashVisible,
        seo: {
          htmlLang: document.documentElement.lang,
          description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
          robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") || "",
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
          ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "",
          ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute("content") || "",
          ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "",
          twitterCard: document.querySelector('meta[name="twitter:card"]')?.getAttribute("content") || "",
          jsonLdValid: Boolean(jsonLd && Array.isArray(jsonLd["@graph"])),
          jsonLdTypes: jsonLd && Array.isArray(jsonLd["@graph"])
            ? jsonLd["@graph"].flatMap((entry) => Array.isArray(entry["@type"]) ? entry["@type"] : [entry["@type"]]).filter(Boolean)
            : []
        }
      };
    }, selector);

    if (!state.hasTarget) failures.push(`${name} ${route}: missing ${selector}`);
    if (state.scrollWidth > state.clientWidth) {
      failures.push(
        `${name} ${route}: horizontal overflow ${state.scrollWidth} > ${state.clientWidth}`
      );
    }
    if (!state.bodyFont.includes("Google Sans Thai")) {
      failures.push(`${name} ${route}: body font is not Google Sans Thai (${state.bodyFont})`);
    }
    if (state.h1Font && !state.h1Font.includes("Google Sans Thai")) {
      failures.push(`${name} ${route}: heading font is not Google Sans Thai (${state.h1Font})`);
    }
    if (state.splashVisible) {
      failures.push(`${name} ${route}: exported bundler splash is visible`);
    }
    if (mainVisitorRoutes.has(route)) {
      if (!/^th($|-TH$)/i.test(state.seo.htmlLang)) {
        failures.push(`${name} ${route}: missing Thai html lang (${state.seo.htmlLang})`);
      }
      if (!state.title.includes("CoverMate") || state.title.length > 70) {
        failures.push(`${name} ${route}: SEO title is missing or too long (${state.title})`);
      }
      if (state.seo.description.length < 70 || state.seo.description.length > 170) {
        failures.push(`${name} ${route}: SEO description length is out of range (${state.seo.description.length})`);
      }
      if (!/^index,follow/.test(state.seo.robots)) {
        failures.push(`${name} ${route}: public route is not indexable (${state.seo.robots})`);
      }
      if (state.seo.canonical !== "https://covermate.vercel.app/") {
        failures.push(`${name} ${route}: canonical is not production root (${state.seo.canonical})`);
      }
      if (!state.seo.ogTitle || !state.seo.ogDescription || state.seo.ogImage !== "https://covermate.vercel.app/assets/covermate-og.png") {
        failures.push(`${name} ${route}: Open Graph metadata incomplete`);
      }
      if (state.seo.twitterCard !== "summary_large_image") {
        failures.push(`${name} ${route}: Twitter summary_large_image card missing`);
      }
      for (const type of ["WebSite", "WebPage", "InsuranceAgency", "Service"]) {
        if (!state.seo.jsonLdTypes.includes(type)) {
          failures.push(`${name} ${route}: JSON-LD missing ${type}`);
        }
      }
      if (!state.seo.jsonLdValid) {
        failures.push(`${name} ${route}: JSON-LD is missing or invalid`);
      }
    }
    if (route === "/admin/login" && !/^noindex/.test(state.seo.robots)) {
      failures.push(`${name} ${route}: admin login route is not noindex (${state.seo.robots})`);
    }
    if (state.bodyText.includes("[object Object]")) {
      failures.push(`${name} ${route}: rendered object placeholder text`);
    }
    if ((route === "/#motor" || route === "/#life") && state.missingAnchors.length) {
      failures.push(`${name} ${route}: header links target missing anchors ${state.missingAnchors.join(", ")}`);
    }
    if (visitorRoutes.has(route) && state.duplicateHeaderNavLabels.length) {
      failures.push(
        `${name} ${route}: duplicate header nav labels ${state.duplicateHeaderNavLabels.join(", ")}`
      );
    }
    if (route === "/#motor-focus") {
      for (const id of ["motor", "motor-trust", "motor-cover", "insurers", "how", "talk"]) {
        if (!state.sectionIds.includes(id)) {
          failures.push(`${name} ${route}: missing focused motor section #${id}`);
        }
      }
      if (!/เบี้ยรถคันเดิม|One car, every insurer compared/.test(state.h1Text)) {
        failures.push(`${name} ${route}: focused motor hero did not render`);
      }
      if (state.sectionIds.includes("hero") || state.sectionIds.includes("cover")) {
        failures.push(`${name} ${route}: focused motor route leaked main hero/cover sections`);
      }
    }
    if (route === "/#life-focus") {
      for (const id of ["life", "life-trust", "life-cover", "fit", "review", "how", "faq", "talk", "privacy"]) {
        if (!state.sectionIds.includes(id)) {
          failures.push(`${name} ${route}: missing focused life section #${id}`);
        }
      }
      if (!/ตอนที่ต้องใช้จริง|Nobody reads the policy/.test(state.h1Text)) {
        failures.push(`${name} ${route}: focused life hero did not render`);
      }
      if (state.sectionIds.includes("hero") || state.sectionIds.includes("insurers")) {
        failures.push(`${name} ${route}: focused life route leaked main hero/insurers sections`);
      }
    }
    if (motorSectionRoutes.has(route) && state.logos.length < 14) {
      failures.push(`${name} ${route}: expected at least 14 visible insurer logos, got ${state.logos.length}`);
    }
    if (motorSectionRoutes.has(route) && !state.hasRelationshipProof) {
      failures.push(`${name} ${route}: insurer relationship proof cards missing AIA/Srikrung copy`);
    }
    if (visitorRoutes.has(route) && !state.hasQueryTypeSelect) {
      failures.push(`${name} ${route}: contact form is missing enquiry-type select options`);
    }
    if (visitorRoutes.has(route) && !state.hasCoverageSelect) {
      failures.push(`${name} ${route}: contact form is missing coverage select options`);
    }
    if (mainVisitorRoutes.has(route) && !/เกิดอุบัติเหตุ|Claim help/i.test(state.bodyText)) {
      failures.push(`${name} ${route}: claim help section is missing`);
    }
    if (mainVisitorRoutes.has(route) && !/ไม่ต้องจำวันหมดอายุ|renewal dates/i.test(state.bodyText)) {
      failures.push(`${name} ${route}: renewal reminder section is missing`);
    }
    if (mainVisitorRoutes.has(route) && !/ผมได้ค่าตอบแทน|commission comes from/i.test(state.bodyText)) {
      failures.push(`${name} ${route}: fee transparency section is missing`);
    }
    if (mainVisitorRoutes.has(route) && !/ข้อมูลที่คุณส่งมา|What happens to/i.test(state.bodyText)) {
      failures.push(`${name} ${route}: privacy / PDPA section is missing`);
    }
    if (mainVisitorRoutes.has(route) && /ขอรับ\s*\n\s*คำปรึกษา|Request a\s*\n\s*consultation/.test(state.contactHeadingText)) {
      failures.push(`${name} ${route}: contact heading uses a forced line break instead of the one-line product copy`);
    }
    const brokenLogo = state.logos.find((logo) => !logo.complete || !logo.naturalWidth);
    if (brokenLogo) failures.push(`${name} ${route}: broken logo ${brokenLogo.src}`);
  }

  const adminUrl = new URL("/admin", baseUrl).toString();
  const analyticsUrl = new URL("/admin/analytics", baseUrl).toString();
  await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await page.evaluate(() => {
    window.localStorage.removeItem("covermate-admin-session");
    window.localStorage.removeItem("purich-admin-ever-v7");
  });
  await page.goto(adminUrl, { waitUntil: "load", timeout: 30000 });
  await page.waitForURL(/\/admin\/login\/?$/, { timeout: 5000 }).catch(() => {});
  if (!page.url().includes("/admin/login")) {
    failures.push(`${name} /admin: expected unauthenticated redirect to /admin/login, got ${page.url()}`);
  }
  await page.goto(analyticsUrl, { waitUntil: "load", timeout: 30000 });
  await page.waitForURL(/\/admin\/login\/?$/, { timeout: 5000 }).catch(() => {});
  if (!page.url().includes("/admin/login")) {
    failures.push(`${name} /admin/analytics: expected unauthenticated redirect to /admin/login, got ${page.url()}`);
  }

  for (const ownerRoute of ["/#admin", "/#edit", "/#preview"]) {
    await page.goto(new URL(ownerRoute, baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
    await page.waitForURL(/\/admin\/login\/?$/, { timeout: 5000 }).catch(() => {});
    if (!page.url().includes("/admin/login")) {
      failures.push(
        `${name} ${ownerRoute}: expected unauthenticated redirect to /admin/login, got ${page.url()}`
      );
    }
  }

  await page.goto(new URL("/admin/login", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Sign in with Google/);
  await page.evaluate(() => window.localStorage.removeItem("covermate-admin-session"));
  const loginFlowState = await page.evaluate(() => ({
    text: document.body.innerText,
    bodyFont: window.getComputedStyle(document.body).fontFamily,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") || ""
  }));
  if (!loginFlowState.text.includes("Sign in with Google")) {
    failures.push(`${name} login: Google sign-in button did not render`);
  }
  if (!loginFlowState.text.includes("Firebase Auth")) {
    failures.push(`${name} login: Firebase Auth allowlist copy is missing`);
  }
  if (/Failed to resolve module|Firebase could not initialise|Firebase sign-in could not start/.test(loginFlowState.text)) {
    failures.push(`${name} login: Firebase module/load error is visible`);
  }
  if (loginFlowState.text.includes("[object Object]")) {
    failures.push(`${name} login: rendered object placeholder text`);
  }
  if (!loginFlowState.bodyFont.includes("Google Sans Thai")) {
    failures.push(`${name} login: launcher body font is not Google Sans Thai (${loginFlowState.bodyFont})`);
  }
  if (loginFlowState.scrollWidth > loginFlowState.clientWidth) {
    failures.push(`${name} login: horizontal overflow ${loginFlowState.scrollWidth} > ${loginFlowState.clientWidth}`);
  }
  if (!/^noindex/.test(loginFlowState.robots)) {
    failures.push(`${name} login: admin login metadata is not noindex (${loginFlowState.robots})`);
  }

  await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await page.evaluate(() => {
    window.localStorage.setItem(
      "covermate-admin-session",
      JSON.stringify({
        email: "owner@example.com",
        name: "Owner",
        pic: "",
        ts: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      })
    );
  });
  await page.goto(adminUrl, { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Manage your site/);
  const adminState = await page.evaluate(() => ({
    text: document.body.innerText,
    bodyFont: window.getComputedStyle(document.body).fontFamily,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") || ""
  }));
  if (!adminState.text.includes("Manage your site")) {
    failures.push(`${name} /admin: authenticated launcher did not render`);
  }
  if (!adminState.text.includes("Analytics") || !adminState.text.includes("Open analytics")) {
    failures.push(`${name} /admin: analytics launcher card is missing`);
  }
  if (adminState.text.includes("[object Object]")) {
    failures.push(`${name} /admin: rendered object placeholder text`);
  }
  if (!adminState.bodyFont.includes("Google Sans Thai")) {
    failures.push(`${name} /admin: launcher body font is not Google Sans Thai (${adminState.bodyFont})`);
  }
  if (adminState.scrollWidth > adminState.clientWidth) {
    failures.push(`${name} /admin: horizontal overflow ${adminState.scrollWidth} > ${adminState.clientWidth}`);
  }
  if (!/^noindex/.test(adminState.robots)) {
    failures.push(`${name} /admin: admin launcher metadata is not noindex (${adminState.robots})`);
  }

  const leadNow = Math.floor(Date.now() / 1000);
  const analyticsMock = `
    window.CoverMateFirebase = {
      loadContactLeads: async () => [
        { id: "lead-1", name: "Ari", contact: "LINE ari", qtype: "quote", coverage: "motor", topic: "Motor quote", summary: "Motor quote", status: "new", read: false, createdAt: { seconds: ${leadNow} } },
        { id: "lead-2", name: "Ben", contact: "088-000-0000", qtype: "compare", coverage: "health", topic: "Health compare", summary: "Health compare", status: "new", read: true, createdAt: { seconds: ${leadNow - 86400 * 3} } }
      ],
      signOut: async () => {}
    };
    export {};
  `;
  const analyticsPage = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1
  });
  const analyticsFailedRequests = [];
  const analyticsPageErrors = [];
  analyticsPage.on("requestfailed", (request) => {
    const url = request.url();
    if (url.endsWith("/favicon.ico")) return;
    analyticsFailedRequests.push(`${url} ${request.failure()?.errorText || "failed"}`);
  });
  analyticsPage.on("pageerror", (error) => analyticsPageErrors.push(error.message));
  await analyticsPage.route("**/covermate-firebase.js", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: analyticsMock })
  );
  await analyticsPage.addInitScript(() => {
    window.localStorage.setItem(
      "covermate-admin-session",
      JSON.stringify({
        email: "owner@example.com",
        name: "Owner",
        pic: "",
        ts: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      })
    );
  });
  await analyticsPage.goto(analyticsUrl, { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(analyticsPage, /Analytics/);
  await analyticsPage.waitForTimeout(900);
  const analyticsState = await analyticsPage.evaluate(() => ({
    text: document.body.innerText,
    leadKpi: document.querySelector('[data-kpi="leads"]')?.textContent?.trim() || "",
    leadNames: Array.from(document.querySelectorAll("#recent-leads td:nth-child(2)")).map((cell) =>
      (cell.textContent || "").trim()
    ),
    bodyFont: window.getComputedStyle(document.body).fontFamily,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") || "",
    hasGtag: Boolean(document.querySelector('script[src*="googletagmanager"], script[src*="google-analytics"]')),
    chartCount: document.querySelectorAll("svg[role='img']").length,
    rows: document.querySelectorAll("#recent-leads tr").length
  }));
  await analyticsPage.close();
  if (!analyticsState.text.includes("G-5TF3C235EF") || !analyticsState.text.includes("Visitor funnel") || !analyticsState.text.includes("Lead trend")) {
    failures.push(`${name} /admin/analytics: analytics dashboard core sections missing`);
  }
  if (analyticsState.leadKpi !== "2" || !analyticsState.leadNames.includes("Ari") || !analyticsState.leadNames.includes("Ben")) {
    failures.push(`${name} /admin/analytics: mocked Firestore lead data did not render`);
  }
  if (analyticsState.hasGtag) {
    failures.push(`${name} /admin/analytics: admin analytics page loaded visitor GA scripts`);
  }
  if (analyticsState.chartCount < 2) {
    failures.push(`${name} /admin/analytics: expected funnel and lead trend SVG charts`);
  }
  if (analyticsState.rows < 2) {
    failures.push(`${name} /admin/analytics: recent leads table did not render mocked rows`);
  }
  if (analyticsState.text.includes("[object Object]")) {
    failures.push(`${name} /admin/analytics: rendered object placeholder text`);
  }
  if (!analyticsState.bodyFont.includes("Google Sans Thai")) {
    failures.push(`${name} /admin/analytics: body font is not Google Sans Thai (${analyticsState.bodyFont})`);
  }
  if (analyticsState.scrollWidth > analyticsState.clientWidth) {
    failures.push(`${name} /admin/analytics: horizontal overflow ${analyticsState.scrollWidth} > ${analyticsState.clientWidth}`);
  }
  if (!/^noindex/.test(analyticsState.robots)) {
    failures.push(`${name} /admin/analytics: analytics metadata is not noindex (${analyticsState.robots})`);
  }
  if (analyticsFailedRequests.length) failures.push(`${name} /admin/analytics: ${analyticsFailedRequests.join(" | ")}`);
  if (analyticsPageErrors.length) failures.push(`${name} /admin/analytics: ${analyticsPageErrors.join(" | ")}`);

  await page.goto(new URL("/#admin", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Admin portal/);
  const ownerPanelState = await page.evaluate(() => ({
    text: document.body.innerText,
    bodyFont: window.getComputedStyle(document.body).fontFamily,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    adminTabs: ["Sections", "Content", "Brand & chrome", "Theme & data", "Versions"].map((label) => {
      const button = Array.from(document.querySelectorAll("button")).find(
        (el) => (el.textContent || "").trim() === label
      );
      if (!button) return { label, exists: false };
      const rect = button.getBoundingClientRect();
      return {
        label,
        exists: true,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height
      };
    }),
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") || ""
  }));
  if (!ownerPanelState.text.includes("Admin portal")) {
    failures.push(`${name} /#admin: owner control panel did not render`);
  }
  if (!ownerPanelState.text.includes("Versions")) {
    failures.push(`${name} /#admin: versions/history tab is missing`);
  }
  if (ownerPanelState.text.includes("[object Object]")) {
    failures.push(`${name} /#admin: rendered object placeholder text`);
  }
  for (const tab of ownerPanelState.adminTabs) {
    if (!tab.exists) {
      failures.push(`${name} /#admin: missing admin tab ${tab.label}`);
    } else if (
      tab.left < 0 ||
      tab.right > ownerPanelState.clientWidth ||
      tab.width < 44 ||
      tab.height < 36
    ) {
      failures.push(`${name} /#admin: admin tab ${tab.label} is clipped or too small`);
    }
  }
  if (!ownerPanelState.bodyFont.includes("Google Sans Thai")) {
    failures.push(`${name} /#admin: owner panel body font is not Google Sans Thai (${ownerPanelState.bodyFont})`);
  }
  if (ownerPanelState.scrollWidth > ownerPanelState.clientWidth) {
    failures.push(`${name} /#admin: horizontal overflow ${ownerPanelState.scrollWidth} > ${ownerPanelState.clientWidth}`);
  }
  if (!/^noindex/.test(ownerPanelState.robots)) {
    failures.push(`${name} /#admin: owner panel metadata is not noindex (${ownerPanelState.robots})`);
  }
  if (
    !ownerPanelState.text.includes("Edit text") ||
    !ownerPanelState.text.includes("Main") ||
    !ownerPanelState.text.includes("Log out") ||
    !ownerPanelState.text.includes("Publish")
  ) {
    failures.push(`${name} /#admin: admin utility actions are missing`);
  }

  for (const [tabName, expectedText] of [
    ["Content", "รูปภาพทั้งหมดลากวาง"],
    ["Brand & chrome", "IDENTITY"],
    ["Theme & data", "BACKUP & RESTORE"],
    ["Versions", "Every Publish is saved here"]
  ]) {
    await page.getByRole("button", { name: tabName, exact: true }).click();
    await page.waitForTimeout(500);
    const tabState = await page.evaluate(() => ({
      text: document.body.innerText,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    if (!tabState.text.includes(expectedText)) {
      failures.push(`${name} /#admin ${tabName}: expected tab content missing`);
    }
    if (tabState.text.includes("[object Object]")) {
      failures.push(`${name} /#admin ${tabName}: rendered object placeholder text`);
    }
    if (tabState.scrollWidth > tabState.clientWidth) {
      failures.push(`${name} /#admin ${tabName}: horizontal overflow ${tabState.scrollWidth} > ${tabState.clientWidth}`);
    }
  }

  await page.getByLabel("Close admin panel").click();
  await page.waitForTimeout(500);
  const closedAdminState = await page.evaluate(() => {
    const bar = document.querySelector('[data-admin-owner-bar="reopen"]');
    const rect = bar ? bar.getBoundingClientRect() : null;
    const style = bar ? window.getComputedStyle(bar) : null;
    return {
      hasAside: Boolean(document.querySelector("aside")),
      hasBar: Boolean(bar),
      barVisible: Boolean(
        bar &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          rect.width > 0 &&
          rect.height > 0
      ),
      text: document.body.innerText,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  });
  if (closedAdminState.hasAside) {
    failures.push(`${name} /#admin close: drawer stayed visible after X`);
  }
  if (!closedAdminState.hasBar || !closedAdminState.barVisible) {
    failures.push(`${name} /#admin close: owner reopen bar did not render`);
  }
  if (
    !closedAdminState.text.includes("Panel") ||
    !closedAdminState.text.includes("Edit text") ||
    !closedAdminState.text.includes("Main") ||
    !closedAdminState.text.includes("Log out")
  ) {
    failures.push(`${name} /#admin close: owner reopen actions are incomplete`);
  }
  if (closedAdminState.scrollWidth > closedAdminState.clientWidth) {
    failures.push(`${name} /#admin close: horizontal overflow ${closedAdminState.scrollWidth} > ${closedAdminState.clientWidth}`);
  }
  await page.getByRole("button", { name: "Panel" }).click();
  await page.waitForTimeout(500);
  if (!(await page.locator("aside").count())) {
    failures.push(`${name} /#admin reopen: owner bar did not reopen the control panel`);
  }

  await page.goto(new URL("/#edit", baseUrl).toString(), { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Text edit/);
  const editState = await page.evaluate(() => ({
    text: document.body.innerText,
    bodyFont: window.getComputedStyle(document.body).fontFamily,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    editableCount: document.querySelectorAll('[contenteditable="true"], textarea, input').length,
    contentEditableCount: document.querySelectorAll('[contenteditable="true"]').length,
    toolbarVisible: Boolean(document.querySelector('[data-admin-owner-bar="edit"]')),
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") || ""
  }));
  if (!editState.text.includes("Text edit")) {
    failures.push(`${name} /#edit: edit mode toolbar did not render`);
  }
  if (!editState.toolbarVisible) {
    failures.push(`${name} /#edit: owner edit toolbar is missing`);
  }
  if (
    !editState.text.includes("Panel") ||
    !editState.text.includes("Main") ||
    !editState.text.includes("Log out") ||
    !editState.text.includes("Done")
  ) {
    failures.push(`${name} /#edit: edit toolbar owner actions are missing`);
  }
  if (editState.contentEditableCount < 20) {
    failures.push(`${name} /#edit: expected editable page text, got ${editState.contentEditableCount}`);
  }
  if (editState.editableCount < 20) {
    failures.push(`${name} /#edit: expected editable text controls, got ${editState.editableCount}`);
  }
  if (editState.text.includes("[object Object]")) {
    failures.push(`${name} /#edit: rendered object placeholder text`);
  }
  if (!editState.bodyFont.includes("Google Sans Thai")) {
    failures.push(`${name} /#edit: body font is not Google Sans Thai (${editState.bodyFont})`);
  }
  if (editState.scrollWidth > editState.clientWidth) {
    failures.push(`${name} /#edit: horizontal overflow ${editState.scrollWidth} > ${editState.clientWidth}`);
  }
  if (!/^noindex/.test(editState.robots)) {
    failures.push(`${name} /#edit: edit mode metadata is not noindex (${editState.robots})`);
  }

  await page.getByRole("button", { name: "Done" }).click();
  await page.waitForTimeout(500);
  const exitEditState = await page.evaluate(() => {
    const bar = document.querySelector('[data-admin-owner-bar="reopen"]');
    const rect = bar ? bar.getBoundingClientRect() : null;
    const style = bar ? window.getComputedStyle(bar) : null;
    return {
      contentEditableCount: document.querySelectorAll('[contenteditable="true"]').length,
      editToolbarVisible: Boolean(document.querySelector('[data-admin-owner-bar="edit"]')),
      reopenBarVisible: Boolean(
        bar &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          rect.width > 0 &&
          rect.height > 0
      ),
      text: document.body.innerText,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  });
  if (exitEditState.contentEditableCount !== 0) {
    failures.push(`${name} /#edit done: contenteditable fields remained active`);
  }
  if (exitEditState.editToolbarVisible) {
    failures.push(`${name} /#edit done: edit toolbar stayed visible`);
  }
  if (!exitEditState.reopenBarVisible) {
    failures.push(`${name} /#edit done: owner reopen bar did not appear`);
  }
  if (exitEditState.scrollWidth > exitEditState.clientWidth) {
    failures.push(`${name} /#edit done: horizontal overflow ${exitEditState.scrollWidth} > ${exitEditState.clientWidth}`);
  }

  await page.goto(adminUrl, { waitUntil: "load", timeout: 30000 });
  await waitForBodyText(page, /Manage your site/);
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(/\/admin\/login\/?$/, { timeout: 5000 }).catch(() => {});
  if (!page.url().includes("/admin/login")) {
    failures.push(`${name} /admin sign out: expected /admin/login, got ${page.url()}`);
  }

  if (failedRequests.length) failures.push(`${name}: ${failedRequests.join(" | ")}`);
  if (pageErrors.length) failures.push(`${name}: ${pageErrors.join(" | ")}`);
  await page.close();
}

await browser.close();

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`CoverMate smoke passed for ${baseUrl}`);
process.exit(0);
