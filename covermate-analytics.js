(function () {
  "use strict";

  if (window.CoverMateAnalytics && window.CoverMateAnalytics.installed) return;

  var MEASUREMENT_ID = "G-5TF3C235EF";
  var ALLOWED_HOSTS = ["covermate.vercel.app"];
  var OWNER_HASHES = { "#admin": true, "#edit": true, "#preview": true };
  var EVENT_DEBOUNCE_MS = 800;
  var state = {
    loaded: false,
    pageKey: "",
    lastEvent: Object.create(null),
    formStarted: false
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
    return !!OWNER_HASHES[window.location.hash];
  }

  function ownerSession() {
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

  function pageLocation() {
    return window.location.origin + window.location.pathname + window.location.search + window.location.hash;
  }

  function pagePath() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  function loadGoogleTag() {
    if (state.loaded || !canTrack()) return false;
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
    if (!loadGoogleTag() || !canTrack() || !window.gtag) return;
    var now = Date.now();
    var key = name + ":" + JSON.stringify(params || {});
    if (state.lastEvent[key] && now - state.lastEvent[key] < EVENT_DEBOUNCE_MS) return;
    state.lastEvent[key] = now;
    window.gtag("event", name, Object.assign({
      page_location: pageLocation(),
      page_path: pagePath()
    }, params || {}));
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

  window.addEventListener("click", function (event) {
    var intent = linkIntent(event.target) || languageIntent(event.target);
    if (intent) trackEvent(intent.name, intent.params);
  }, true);

  window.addEventListener("input", function (event) {
    var intent = calculatorIntent(event.target);
    if (intent) trackEvent(intent.name, intent.params);
    if (!state.formStarted && event.target && event.target.closest && event.target.closest("form")) {
      state.formStarted = true;
      trackEvent("form_start", { form_type: "consultation" });
    }
  }, true);

  window.addEventListener("submit", function () {
    trackEvent("quote_submit", { form_type: "consultation" });
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
