import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { getUnreadNotificationCount } from "../api/professionalApi";
import { BROWSER_NOTIFICATIONS_PREF_KEY } from "../utils/browserNotificationPref";

const POLL_MS = 30_000;

/** Workstream K — unread-count badge for TopNavbar. Polls
 *  GET /api/v2/notifications/unread-count (a cheap count query, not the
 *  full list) on an interval and on mount. Navigates to the full
 *  notifications page on click rather than opening an inline dropdown —
 *  kept deliberately simple per "do not build an unrelated UI redesign."
 *
 *  Browser notifications are strictly opt-in: this component never calls
 *  Notification.requestPermission() itself — that only ever happens from
 *  an explicit button on NotificationsPage. Here it only reads whether the
 *  user previously opted in (localStorage, this-browser-only) and whether
 *  permission is currently "granted" before firing anything. */
export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const lastSeenCountRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    function poll() {
      getUnreadNotificationCount()
        .then((res) => {
          if (cancelled) return;
          const count = res.count || 0;

          const previousCount = lastSeenCountRef.current;
          if (
            previousCount !== null &&
            count > previousCount &&
            typeof window !== "undefined" &&
            window.localStorage?.getItem(BROWSER_NOTIFICATIONS_PREF_KEY) === "true" &&
            typeof window.Notification !== "undefined" &&
            window.Notification.permission === "granted"
          ) {
            try {
              // eslint-disable-next-line no-new -- fire-and-forget, no handle needed
              new window.Notification("MarkFinance", {
                body: `You have ${count - previousCount} new live-strategy notification(s).`,
              });
            } catch {
              // Some browsers/contexts (e.g. a private window) can throw
              // here even when permission reads "granted" — a missed
              // browser notification is never worth crashing the poll over.
            }
          }

          lastSeenCountRef.current = count;
          setUnreadCount(count);
        })
        .catch(() => {
          // Silent — a transient failure to fetch an unread badge count
          // isn't worth surfacing a toast over; the next poll retries.
        });
    }

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => navigate("/workspace/notifications")}
      className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-50"
      aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
      title="Notifications"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
