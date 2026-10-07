import { SELECTED_WATCHLIST_KEYS } from "./storageKeys";

export function isLoggedIn() {
  try {
    const user = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    return Boolean(user && token);
  } catch {
    return false;
  }
}

/** Clears all locally-stored auth state. Does not touch Firebase sign-out
 *  (callers that also need `signOut(auth)` should call that separately). */
export function clearSession() {
  try {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("selectedWatchlist");
    Object.values(SELECTED_WATCHLIST_KEYS).forEach((key) =>
      localStorage.removeItem(key),
    );
  } catch {
    // localStorage unavailable (private mode, etc.) — nothing to clear
  }
}
