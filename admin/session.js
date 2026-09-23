import {
  ADMIN_LOGIN_PATH,
  clearAdminSession,
  readAdminSession
} from "../covermate-contract.js";
import { appendEnvironmentSearch, resolveCoverMateEnvironment } from "../covermate-environment.mjs";

export { ADMIN_LOGIN_PATH, clearAdminSession, readAdminSession };

function loginRedirect(path) {
  const destination = new URL(path, window.location.origin);
  if (resolveCoverMateEnvironment().name === 'uat') destination.searchParams.set('cm_env', 'uat');
  // Carry only the Operations link target through the existing sign-in flow.
  // Authorization still happens in requireVerifiedAdminSession and the case API.
  if (destination.pathname.replace(/\/$/, '') === ADMIN_LOGIN_PATH.replace(/\/$/, '') && /^\/admin(?:\/ops)?\/?$/.test(window.location.pathname)) {
    const source = new URLSearchParams(window.location.search);
    if (source.has('case')) destination.searchParams.set('case', /^[\w-]{1,128}$/.test(source.get('case')) ? source.get('case') : '');
    if (source.get('followUp') === 'overdue') destination.searchParams.set('followUp', 'overdue');
  }
  return destination.pathname + destination.search + destination.hash;
}

export function requireAdminSession(options = {}) {
  const redirectTo = loginRedirect(options.redirectTo || ADMIN_LOGIN_PATH);
  const session = readAdminSession();
  if (!session) {
    window.location.replace(redirectTo);
    return null;
  }
  return session;
}

export async function requireVerifiedAdminSession(options = {}) {
  const redirectTo = loginRedirect(options.redirectTo || ADMIN_LOGIN_PATH);
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
