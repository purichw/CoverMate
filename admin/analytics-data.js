const DAY_MS = 24 * 60 * 60 * 1000;

const QUERY_LABELS = {
  quote: "Quote",
  compare: "Compare",
  general: "General",
  review: "Review",
  claim: "Claim",
  "": "Unspecified"
};

const COVERAGE_LABELS = {
  life: "Life",
  health: "Health",
  motor: "Motor",
  accident: "Accident",
  savings: "Savings",
  unsure: "Unsure",
  "": "Unspecified"
};

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  if (typeof value === "number") return new Date(value);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function emptyDays(days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today.getTime() - (days - index - 1) * DAY_MS);
    return { key: dayKey(date), label: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), leads: 0 };
  });
}

function tally(items, key, labels) {
  const counts = new Map();
  for (const item of items) {
    const raw = String(item[key] || "");
    const label = labels[raw] || raw || "Unspecified";
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

export function summarizeLeads(leads, options = {}) {
  const days = options.days || 30;
  const safeLeads = Array.isArray(leads) ? leads : [];
  const timeline = emptyDays(days);
  const byDay = new Map(timeline.map((entry) => [entry.key, entry]));
  const since = Date.now() - days * DAY_MS;
  let newest = null;

  for (const lead of safeLeads) {
    const createdAt = toDate(lead.createdAt);
    if (!createdAt) continue;
    if (!newest || createdAt > newest) newest = createdAt;
    if (createdAt.getTime() < since) continue;
    const key = dayKey(createdAt);
    if (byDay.has(key)) byDay.get(key).leads += 1;
  }

  const total = safeLeads.length;
  const unread = safeLeads.filter((lead) => lead.read !== true && lead.status !== "archived").length;
  const recent = safeLeads.slice(0, 8).map((lead) => ({
    id: lead.id || "",
    name: lead.name || "Unnamed",
    contact: lead.contact || "",
    qtype: QUERY_LABELS[lead.qtype || ""] || lead.qtype || "Unspecified",
    coverage: COVERAGE_LABELS[lead.coverage || ""] || lead.coverage || "Unspecified",
    createdAt: toDate(lead.createdAt)
  }));

  return {
    total,
    unread,
    newest,
    timeline,
    enquiryTypes: tally(safeLeads, "qtype", QUERY_LABELS),
    coverageTypes: tally(safeLeads, "coverage", COVERAGE_LABELS),
    recent
  };
}

export function gaConnectionModel() {
  return {
    measurementId: "G-5TF3C235EF",
    status: "tracking-installed",
    dataApiStatus: "not-connected",
    requiredBackend: "GA4 Data API or scheduled export into Firestore",
    metrics: [
      "sessions",
      "activeUsers",
      "screenPageViews",
      "eventCount",
      "conversions",
      "engagementRate"
    ],
    dimensions: [
      "date",
      "sessionDefaultChannelGroup",
      "deviceCategory",
      "language",
      "pagePath",
      "eventName"
    ]
  };
}
