import { readBrowserNotificationPref } from "./browserNotificationPref";

/**
 * Workstream K — readBrowserNotificationPref's three-way state derivation
 * (unsupported/denied/enabled/disabled), which governs whether
 * NotificationsPage's "Enable browser notifications" button renders and
 * whether NotificationBell.jsx is allowed to fire a browser notification.
 * Extracted into its own react-router-free file (see that file's doc
 * comment) specifically so it's reachable by Jest — NotificationsPage.jsx/
 * NotificationBell.jsx themselves hit the pre-existing, unrelated
 * Jest/react-router-dom module-resolution bug (BLOCKER-004) that already
 * excludes every other page-level file in src/pro/pages from RTL coverage.
 */
describe("readBrowserNotificationPref", () => {
  const originalNotification = window.Notification;

  afterEach(() => {
    window.Notification = originalNotification;
    window.localStorage.clear();
  });

  test("returns 'unsupported' when the browser has no Notification API", () => {
    delete window.Notification;
    expect(readBrowserNotificationPref()).toBe("unsupported");
  });

  test("returns 'denied' when the browser permission is denied, regardless of stored preference", () => {
    window.Notification = { permission: "denied" };
    window.localStorage.setItem("mf_browser_notifications_enabled", "true");
    expect(readBrowserNotificationPref()).toBe("denied");
  });

  test("returns 'enabled' only when permission is granted AND the user previously opted in", () => {
    window.Notification = { permission: "granted" };
    window.localStorage.setItem("mf_browser_notifications_enabled", "true");
    expect(readBrowserNotificationPref()).toBe("enabled");
  });

  test("returns 'disabled' when permission is granted but the user never opted in (never auto-enables)", () => {
    window.Notification = { permission: "granted" };
    expect(readBrowserNotificationPref()).toBe("disabled");
  });

  test("returns 'disabled' when permission is merely 'default' (not yet asked)", () => {
    window.Notification = { permission: "default" };
    expect(readBrowserNotificationPref()).toBe("disabled");
  });
});
