import { useEffect, useState } from "react";
import { listStrategyVersions, getStrategyVersion } from "../api/professionalApi";
import { showError } from "../../utils/toast";

/** Lists a strategy's immutable versions (paginated) and lets the user
 *  inspect one's full definition inline — never edits a prior version,
 *  only displays it, per ADR-001/the backend's immutability guarantee. */
export default function StrategyVersionHistory({ strategyId, currentVersionId, refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDefinition, setExpandedDefinition] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listStrategyVersions(strategyId, { page: 1, limit: 20 })
      .then((res) => {
        if (!cancelled) setItems(res.items || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.data?.message || "Failed to load version history");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [strategyId, refreshKey]);

  const toggleExpand = async (versionId) => {
    if (expandedId === versionId) {
      setExpandedId(null);
      setExpandedDefinition(null);
      return;
    }
    try {
      const version = await getStrategyVersion(strategyId, versionId);
      setExpandedId(versionId);
      setExpandedDefinition(version.definition);
    } catch (err) {
      showError(err?.data?.message || "Failed to load version");
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading version history…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!items.length) return <p className="text-sm text-gray-400">No versions yet.</p>;

  return (
    <div className="space-y-2">
      {items.map((v) => (
        <div key={v.versionId} className="rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => toggleExpand(v.versionId)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
          >
            <span className="font-medium">
              v{v.versionNumber}
              {v.versionId === currentVersionId && (
                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  CURRENT
                </span>
              )}
            </span>
            <span className="text-xs text-gray-400">{new Date(v.createdAt).toLocaleString()}</span>
          </button>

          {expandedId === v.versionId && expandedDefinition && (
            <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <p>Timeframe: {expandedDefinition.universe?.timeframe}</p>
              <p>Has exit rules: {expandedDefinition.exit ? "Yes" : "No"}</p>
              <p>
                Stop Loss: {expandedDefinition.risk?.stopLoss ? `${expandedDefinition.risk.stopLoss.value}%` : "Off"} · Take
                Profit: {expandedDefinition.risk?.takeProfit ? `${expandedDefinition.risk.takeProfit.value}%` : "Off"}
              </p>
              <p>Sizing: {expandedDefinition.execution?.positionSizing?.type} ({expandedDefinition.execution?.positionSizing?.value})</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
