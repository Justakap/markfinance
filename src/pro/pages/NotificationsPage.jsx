import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Loader2, Check, CheckCheck } from "lucide-react";
import MainLayout from "../../layout/MainLayout";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "../api/professionalApi";
import { showError } from "../../utils/toast";
import { BROWSER_NOTIFICATIONS_PREF_KEY, readBrowserNotificationPref } from "../utils/browserNotificationPref";

const PAGE_SIZE = 20;

/** Workstream K — persisted in-app notifications derived from Workstream
 *  J's LiveStrategySignal events (via AlertConfiguration + the backend's
 *  alertNotificationService.js). `isFill` (returned directly by the API,
 *  never inferred client-side) drives the visual distinction between "the
 *  strategy fired a signal" and "a SIMULATED position actually changed" —
 *  no notification here ever implies a real broker order, matching the
 *  backend's own wording guarantee (alertContentBuilder.js). */
export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all"); // all | unread | read
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [browserNotifPref, setBrowserNotifPref] = useState(readBrowserNotificationPref);

  async function handleEnableBrowserNotifications() {
    if (typeof window === "undefined" || typeof window.Notification === "undefined") return;
    // Only ever called from this explicit click — never on mount/page load.
    const permission = await window.Notification.requestPermission();
    if (permission === "granted") {
      window.localStorage?.setItem(BROWSER_NOTIFICATIONS_PREF_KEY, "true");
    }
    setBrowserNotifPref(readBrowserNotificationPref());
  }

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    const read = filter === "all" ? undefined : filter === "read";
    listNotifications({ page, limit: PAGE_SIZE, read })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items || []);
        setTotal(res.total || 0);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.data?.message || "Failed to load notifications";
        setError(message);
        showError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, filter]);

  useEffect(() => load(), [load]);

  async function handleMarkRead(notificationId) {
    try {
      await markNotificationRead(notificationId);
      setItems((prev) => prev.map((n) => (n.notificationId === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n)));
    } catch (err) {
      showError(err?.data?.message || "Failed to mark notification read");
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      showError(err?.data?.message || "Failed to mark notifications read");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <MainLayout title="Notifications" subtitle="Signals and simulated fills from your live strategies">
      <div className="px-6 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg border border-gray-200 p-1 text-sm">
            {["all", "unread", "read"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1 capitalize transition ${
                  filter === f ? "bg-blue-50 font-semibold text-blue-700" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {browserNotifPref === "disabled" && (
              <button
                type="button"
                onClick={handleEnableBrowserNotifications}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Enable browser notifications
              </button>
            )}
            {browserNotifPref === "enabled" && <span className="text-xs text-emerald-600">Browser notifications on</span>}
            {browserNotifPref === "denied" && (
              <span className="text-xs text-gray-400">Browser notifications blocked in browser settings</span>
            )}

            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <CheckCheck size={15} />
              Mark all read
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            Loading…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-400">
            No notifications{filter !== "all" ? ` (${filter})` : ""} yet. Activate a live strategy and configure alerts to start
            receiving them here.
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {items.map((n) => (
              <li key={n.notificationId} className={`flex items-start gap-3 px-4 py-3 ${n.read ? "bg-white" : "bg-blue-50/40"}`}>
                <span
                  className={`mt-1 inline-flex h-2 w-2 flex-shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-blue-500"}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${n.read ? "font-medium text-gray-700" : "font-semibold text-gray-900"}`}>{n.title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        n.isFill ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {n.isFill ? "Simulated fill" : "Signal only"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-400">
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                    {n.runtimeId && (
                      <Link to={`/workspace/live/${n.runtimeId}`} className="text-blue-600 hover:underline">
                        View live strategy
                      </Link>
                    )}
                    {n.strategyId && (
                      <Link to={`/workspace/strategies/${n.strategyId}`} className="text-blue-600 hover:underline">
                        View strategy
                      </Link>
                    )}
                  </div>
                </div>

                {!n.read && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(n.notificationId)}
                    className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                    title="Mark as read"
                  >
                    <Check size={13} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {!loading && !error && total > PAGE_SIZE && (
          <div className="mt-3 flex items-center justify-center gap-3 text-xs">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
