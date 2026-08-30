import {
  ADMIN_LOGIN_PATH,
  clearAdminSession,
  readAdminSession
} from "../covermate-contract.js";
import { appendEnvironmentSearch, resolveCoverMateEnvironment } from "../covermate-environment.mjs";

export { ADMIN_LOGIN_PATH, clearAdminSession, readAdminSession };

export function requireAdminSession(options = {}) {
  const redirectTo = adminRedirect(options.redirectTo || ADMIN_LOGIN_PATH);
  const session = readAdminSession();
  if (!session) {
    window.location.replace(redirectTo);
    return null;
  }
  return session;
}

export async function requireVerifiedAdminSession(options = {}) {
  const redirectTo = adminRedirect(options.redirectTo || ADMIN_LOGIN_PATH);
  const session = requireAdminSession({ redirectTo });
  if (!session) return null;
  try {
    await import(window.location.origin + "/covermate-firebase.js");
    const cm = window.CoverMateFirebase;
    if (!cm || !cm.waitForAuth || !cm.syncSessionFromCurrentUser) {
      throw new Error("Admin authorization helper unavailable.");
    }
    const user = await cm.waitForAuth();
    if (!user) {
      clearAdminSession();
      window.location.replace(redirectTo);
      return null;
    }
    const result = await cm.syncSessionFromCurrentUser();
    if (result && result.ok) return result.session || session;
  } catch {
    // Authorization could not be verified; localStorage alone is not enough.
  }
  clearAdminSession();
  window.location.replace(redirectTo);
  return null;
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
  window.location.replace(adminRedirect(ADMIN_LOGIN_PATH));
}

export function adminRedirect(path) {
  return appendEnvironmentSearch(path, resolveCoverMateEnvironment());
}

window.CoverMateAdminSession = {
  readAdminSession,
  clearAdminSession,
  adminRedirect,
  requireAdminSession,
  requireVerifiedAdminSession,
  signOutAdmin
};
