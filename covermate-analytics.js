(function () {
  "use strict";

  if (window.CoverMateAnalytics && window.CoverMateAnalytics.installed) return;

  var MEASUREMENT_ID = "G-5TF3C235EF";
  var ALLOWED_HOSTS = ["covermateinsurance.com"];
  var OWNER_HASHES = { "#admin": true, "#edit": true, "#preview": true };
  var EVENT_DEBOUNCE_MS = 800;
  var LEAD_QTYPES = { quote: true, compare: true, general: true, review: true, claim: true, unspecified: true };
  var LEAD_COVERAGES = { life: true, health: true, motor: true, accident: true, savings: true, unsure: true, unspecified: true };
  var FORM_TYPES = { consultation: true, renewal_reminder: true };
  var EVENT_NAMES = {
    page_view: true,
    line_click: true,
    phone_click: true,
    email_click: true,
    language_change: true,
    calculator_interaction: true,
    form_start: true,
    quote_submit: true,
    quote_submit_success: true,
    quote_submit_error: true
  };
  var SAFE_PARAM_RE = /^[a-z0-9_:-]{1,80}$/i;
  var state = {
    loaded: false,
    pageKey: "",
    lastEvent: Object.create(null),
    formStarted: Object.create(null)
  };

  window.CoverMateAnalytics = {
    id: MEASUREMENT_ID,
    installed: true,
    enabled: false,
    reason: "not-initialized",
    trackEvent: function () {}
  };

  function isAllowedHost() {
    return ALLOWED_HOSTS.indexOf(window.location.hostname) >= 0;
  }

  function ownerHash() {
    var contract = window.CoverMateContract;
    if (contract && contract.isOwnerHash) return contract.isOwnerHash(window.location.hash);
    return !!OWNER_HASHES[window.location.hash];
  }

  function adminPath() {
    var contract = window.CoverMateContract;
    if (contract && contract.isAdminNamespacePath) return contract.isAdminNamespacePath(window.location.pathname);
    return /^\/admin(?:\/|$)/.test(window.location.pathname);
  }

  function ownerSession() {
    var contract = window.CoverMateContract;
    if (contract && contract.readAdminSession) return !!contract.readAdminSession();
    try {
      var raw = window.localStorage.getItem("covermate-admin-session");
      if (!raw) return false;
      var session = JSON.parse(raw);
      return !!session && Number(session.exp || 0) > Date.now();
    } catch (error) {
      return false;
    }
  }

  function canTrack() {
    if (!isAllowedHost()) {
      window.CoverMateAnalytics.reason = "non-production-host";
      return false;
    }
    if (adminPath()) {
      window.CoverMateAnalytics.reason = "admin-path";
      return false;
    }
    if (ownerHash()) {
      window.CoverMateAnalytics.reason = "owner-hash";
      return false;
    }
    if (ownerSession()) {
      window.CoverMateAnalytics.reason = "owner-session";
      return false;
    }
    window.CoverMateAnalytics.reason = "enabled";
    return true;
  }

  function safeHash() {
    var hash = window.location.hash || "";
    return /^#[A-Za-z0-9_-]+$/.test(hash) ? hash : "";
  }

  function pageLocation() {
    return window.location.origin + window.location.pathname + safeHash();
  }

  function pagePath() {
    return window.location.pathname + safeHash();
  }

  function cleanCategory(value, allowed, fallback) {
    var text = String(value == null ? "" : value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
    text = text.replace(/^_+|_+$/g, "").slice(0, 80);
    if (allowed && allowed[text]) return text;
    return fallback || "";
  }

  function eventParamWhitelist(name, params) {
    var source = params || {};
    var safe = {};
    if (name === "line_click" || name === "phone_click" || name === "email_click") {
      var linkType = cleanCategory(source.link_type, { line: true, phone: true, email: true }, "");
      if (linkType) safe.link_type = linkType;
    }
    if (name === "language_change") {
      var language = cleanCategory(source.language, { th: true, en: true }, "");
      if (language) safe.language = language;
    }
    if (name === "calculator_interaction") {
      var controlType = cleanCategory(source.control_type, { range: true }, "");
      if (controlType) safe.control_type = controlType;
    }
    if (name === "form_start" || name === "quote_submit" || name === "quote_submit_error") {
      var formType = cleanCategory(source.form_type, FORM_TYPES, "consultation");
      safe.form_type = formType;
    }
    if (name === "quote_submit_success") {
      safe.form_type = cleanCategory(source.form_type, FORM_TYPES, "consultation");
      safe.enquiry_type = cleanCategory(source.enquiry_type, LEAD_QTYPES, "unspecified");
      safe.coverage = cleanCategory(source.coverage, LEAD_COVERAGES, "unsure");
    }
    return safe;
  }

  function cleanEventName(name) {
    var eventName = String(name || "").trim();
    return SAFE_PARAM_RE.test(eventName) && EVENT_NAMES[eventName] ? eventName : "";
  }

  function loadGoogleTag() {
    if (state.loaded) return canTrack();
    if (!canTrack()) return false;
    state.loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_flags: "SameSite=Lax;Secure",
      transport_type: "beacon"
    });
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);
    window.CoverMateAnalytics.enabled = true;
    return true;
  }

  function trackPageView() {
    if (!loadGoogleTag() || !canTrack() || !window.gtag) return;
    var key = pageLocation();
    if (state.pageKey === key) return;
    state.pageKey = key;
    window.gtag("event", "page_view", {
      page_title: document.title || "CoverMate",
      page_location: key,
      page_path: pagePath()
    });
  }

  function trackEvent(name, params) {
    name = cleanEventName(name);
    if (!name) return;
    if (!loadGoogleTag() || !canTrack() || !window.gtag) return;
    var safeParams = eventParamWhitelist(name, params);
    var now = Date.now();
    var key = name + ":" + JSON.stringify(safeParams);
    if (state.lastEvent[key] && now - state.lastEvent[key] < EVENT_DEBOUNCE_MS) return;
    state.lastEvent[key] = now;
    window.gtag("event", name, Object.assign({
      page_location: pageLocation(),
      page_path: pagePath()
    }, safeParams));
  }

  window.CoverMateAnalytics.trackEvent = trackEvent;

  function linkIntent(target) {
    var el = target && target.closest ? target.closest("a[href]") : null;
    if (!el) return null;
    var href = el.getAttribute("href") || "";
    if (/line\.me|lin\.ee/i.test(href)) return { name: "line_click", params: { link_type: "line" } };
    if (/^tel:/i.test(href)) return { name: "phone_click", params: { link_type: "phone" } };
    if (/^mailto:/i.test(href)) return { name: "email_click", params: { link_type: "email" } };
    return null;
  }

  function languageIntent(target) {
    var el = target && target.closest ? target.closest("button") : null;
    if (!el) return null;
    var label = (el.textContent || "").trim().toUpperCase();
    if (label === "TH" || label === "EN") {
      return { name: "language_change", params: { language: label.toLowerCase() } };
    }
    return null;
  }

  function calculatorIntent(target) {
    var el = target && target.closest ? target.closest("input[type='range']") : null;
    if (!el) return null;
    return { name: "calculator_interaction", params: { control_type: "range" } };
  }

  function formTypeForTarget(target) {
    var form = target && target.closest ? target.closest("form") : null;
    if (!form) return "consultation";
    if (form.closest("#renew")) return "renewal_reminder";
    return "consultation";
  }

  window.addEventListener("click", function (event) {
    var intent = linkIntent(event.target) || languageIntent(event.target);
    if (intent) trackEvent(intent.name, intent.params);
  }, true);

  window.addEventListener("input", function (event) {
    var intent = calculatorIntent(event.target);
    if (intent) trackEvent(intent.name, intent.params);
    if (event.target && event.target.closest && event.target.closest("form")) {
      var formType = formTypeForTarget(event.target);
      if (!state.formStarted[formType]) {
        state.formStarted[formType] = true;
        trackEvent("form_start", { form_type: formType });
      }
    }
  }, true);

  window.addEventListener("submit", function (event) {
    trackEvent("quote_submit", { form_type: formTypeForTarget(event.target) });
  }, true);

  window.addEventListener("hashchange", function () {
    window.setTimeout(trackPageView, 0);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      window.setTimeout(trackPageView, 0);
    }, { once: true });
  } else {
    window.setTimeout(trackPageView, 0);
  }
}());
