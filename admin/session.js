const SESSION_KEY = "covermate-admin-session";
const ADMIN_EVER_KEY = "purich-admin-ever-v7";

export function readAdminSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    const session = raw ? JSON.parse(raw) : null;
    if (!session || Number(session.exp || 0) <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(ADMIN_EVER_KEY);
  } catch {
    // Local cleanup should never block navigation.
  }
}

export function requireAdminSession(options = {}) {
  const redirectTo = options.redirectTo || "/admin/login";
  const session = readAdminSession();
  if (!session) {
    window.location.replace(redirectTo);
    return null;
  }
  return session;
}

export function signOutAdmin() {
  clearAdminSession();
  try {
    import(window.location.origin + "/covermate-firebase.js").then(() => {
      if (window.CoverMateFirebase && window.CoverMateFirebase.signOut) {
        window.CoverMateFirebase.signOut();
      }
    }).catch(() => {});
  } catch {
    // Local session has already been cleared.
  }
  window.location.replace("/admin/login");
}

window.CoverMateAdminSession = {
  readAdminSession,
  clearAdminSession,
  requireAdminSession,
  signOutAdmin
};
