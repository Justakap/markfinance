import { useEffect, useState } from "react";
import {
  listAlertConfigurations,
  createAlertConfiguration,
  updateAlertConfiguration,
  archiveAlertConfiguration,
} from "../api/professionalApi";
import { showError, showSuccess, confirmAction } from "../../utils/toast";

const EVENT_TYPES = ["ENTRY_SIGNAL", "EXIT_SIGNAL", "ENTRY_FILLED", "EXIT_FILLED"];
const EVENT_TYPE_LABELS = {
  ENTRY_SIGNAL: "Entry signal (strategy condition fired, no fill yet)",
  EXIT_SIGNAL: "Exit signal (strategy condition fired, no fill yet)",
  ENTRY_FILLED: "Simulated entry fill",
  EXIT_FILLED: "Simulated exit fill",
};

/**
 * Workstream L — alert-configuration CRUD for exactly one
 * LiveStrategyRuntime, via /api/v2/alert-configurations (Workstream K).
 * Only ever one ACTIVE configuration per runtime (the backend enforces
 * this with a unique index) — this panel fetches that single
 * configuration, if any, and otherwise offers to create one; it never
 * tries to create a second.
 *
 * Explicitly does not add any delivery channel beyond what the backend
 * already supports (persistent in-app notifications) — no email/SMS/
 * Telegram option is offered here because none exists server-side.
 */
export default function AlertConfigurationPanel({ runtimeId }) {
  const [config, setConfig] = useState(null); // null = none exists yet
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(EVENT_TYPES);
  const [enabled, setEnabled] = useState(true);

  const load = () => {
    let cancelled = false;
    setLoading(true);
    listAlertConfigurations({ runtimeId, limit: 50 })
      .then((res) => {
        if (cancelled) return;
        const active = (res.items || []).find((c) => c.status === "ACTIVE") || null;
        setConfig(active);
        if (active) {
          setSelectedTypes(active.eventTypes);
          setEnabled(active.enabled);
        }
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.data?.message || "Failed to load alert configuration";
        setError(message);
        showError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  };

  useEffect(load, [runtimeId]);

  function toggleType(type) {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  async function handleSave() {
    if (selectedTypes.length === 0) {
      showError("Select at least one event type to be notified about.");
      return;
    }
    setSaving(true);
    try {
      if (config) {
        const res = await updateAlertConfiguration(config.configId, { eventTypes: selectedTypes, enabled });
        setConfig(res.configuration);
        showSuccess("Alert configuration updated.");
      } else {
        const res = await createAlertConfiguration({ runtimeId, eventTypes: selectedTypes, enabled });
        setConfig(res.configuration);
        showSuccess("Alert configuration created.");
      }
    } catch (err) {
      // A 409 here means another configuration was created for this
      // runtime in the window between load() and this save (e.g. a
      // second tab) — surface the backend's own message rather than a
      // generic one, and refresh so this panel reflects reality.
      showError(err?.data?.message || "Failed to save alert configuration");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    const confirmed = await confirmAction({
      title: "Archive alert configuration",
      message: "You will stop receiving notifications for this runtime until a new configuration is created.",
      confirmText: "Archive",
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      await archiveAlertConfiguration(config.configId);
      setConfig(null);
      setSelectedTypes(EVENT_TYPES);
      setEnabled(true);
      showSuccess("Alert configuration archived.");
    } catch (err) {
      showError(err?.data?.message || "Failed to archive alert configuration");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Loading alert configuration…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Choose which persisted events generate an in-app notification for this runtime. Only one configuration can
        be active per runtime.
      </p>

      <div className="space-y-2">
        {EVENT_TYPES.map((type) => (
          <label key={type} className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => toggleType(type)} />
            {EVENT_TYPE_LABELS[type]}
          </label>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enabled
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : config ? "Save changes" : "Create alert configuration"}
        </button>

        {config && (
          <button
            type="button"
            onClick={handleArchive}
            disabled={saving}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Archive
          </button>
        )}
      </div>
    </div>
  );
}
