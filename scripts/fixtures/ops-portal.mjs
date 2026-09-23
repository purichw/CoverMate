// Synthetic verified-session module and legacy Operations records.
// Never imported by production code and never connected to Firebase.
export const firebaseMock = `
  const session = () => JSON.parse(window.localStorage.getItem("covermate-admin-session") || "null");
  const user = {
    uid: "smoke-admin",
    email: "purich@example.com",
    displayName: "Purich N.",
    getIdToken: async () => "ops-regression-token"
  };
  window.CoverMateFirebase = {
    auth: { currentUser: user },
    waitForAuth: async () => user,
    syncSessionFromCurrentUser: async () => ({ ok: true, user, session: session() }),
    signOut: async () => {}
  };
  window.dispatchEvent(new CustomEvent("covermate-firebase-ready"));
  export {};
`;

const legacyState = {
  leads: [
    {
      id: "lead-a",
      displayId: "CL-LEADA",
      name: "Live Lead A",
      phone: "080-111-2222",
      lineId: "live-a",
      email: "",
      contact: "080-111-2222",
      source: "Website form",
      interestKey: "motor",
      interestLabel: "Motor",
      status: "new",
      message: "Need motor comparison from contactLeads.",
      preferredContact: "Anytime",
      assigneeName: "Purich N.",
      consent: {
        given: true,
        method: "public form checkbox",
        at: "2026-08-10T08:00:00.000Z",
        source: "/contact",
        purpose: "Insurance advice and quotation"
      },
      timeline: [
        { id: "evt-a", kind: "created", text: "Lead captured", note: "", at: "2026-08-10T08:00:00.000Z", by: "System" }
      ],
      createdAt: "2026-08-10T08:00:00.000Z",
      updatedAt: "2026-08-10T08:00:00.000Z"
    },
    {
      id: "lead-b",
      displayId: "CL-LEADB",
      name: "Live Lead B",
      phone: "",
      lineId: "line-live-b",
      email: "",
      contact: "line-live-b",
      source: "LINE",
      interestKey: "health",
      interestLabel: "Health",
      status: "consultation",
      message: "Health review follow up.",
      assigneeName: "Purich N.",
      consent: {
        given: true,
        method: "public form checkbox",
        at: "2026-08-09T08:00:00.000Z",
        source: "/",
        purpose: "Insurance advice and quotation"
      },
      timeline: [],
      createdAt: "2026-08-09T08:00:00.000Z",
      updatedAt: "2026-08-09T08:00:00.000Z"
    }
  ],
  tasks: [
    {
      id: "lead-a:firstContact",
      leadId: "lead-a",
      kind: "firstContact",
      title: "First contact - Live Lead A",
      dueAt: "2026-08-10T10:00:00.000Z",
      priority: "High",
      relatedLabel: "Lead CL-LEADA",
      assigneeName: "Purich N.",
      completed: false,
      bucket: "today"
    }
  ],
  audit: [
    {
      id: "aud-a",
      kind: "Lead",
      subject: "Lead CL-LEADA - Live Lead A",
      from: "",
      to: "Created",
      actorName: "System",
      at: "2026-08-10T08:00:00.000Z"
    }
  ]
};


// Each browser suite gets independent mutable data; imports never run a browser.
export function createLegacyOpsState() {
  return structuredClone(legacyState);
}
