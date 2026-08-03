import {
  clearAdminSession,
  readAdminSession
} from "../covermate-contract.js";

export { clearAdminSession, readAdminSession };

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
