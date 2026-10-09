/**
 * Workstream K — pure, React/router-free helpers for the opt-in browser
 * notification preference. Kept in its own file (no react-router-dom
 * import anywhere in its chain) specifically so it's unit-testable in
 * this environment — importing it from NotificationBell.jsx/
 * NotificationsPage.jsx directly would otherwise be unreachable from a
 * Jest test due to the pre-existing, unrelated react-router-dom/Jest
 * module-resolution bug (BLOCKER-004) those two files' own imports hit.
 */
export const BROWSER_NOTIFICATIONS_PREF_KEY = "mf_browser_notifications_enabled";

/** Never triggers a permission prompt — purely reads the browser's
 *  current permission state plus the user's previously-stored opt-in. */
export function readBrowserNotificationPref() {
  if (typeof window === "undefined" || typeof window.Notification === "undefined") return "unsupported";
  if (window.Notification.permission === "denied") return "denied";
  if (window.Notification.permission === "granted" && window.localStorage?.getItem(BROWSER_NOTIFICATIONS_PREF_KEY) === "true") {
    return "enabled";
  }
  return "disabled";
}
