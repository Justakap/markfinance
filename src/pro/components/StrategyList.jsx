import { useState } from "react";
import { Archive, CheckCircle2 } from "lucide-react";

/** Pure presentational list — pagination/filtering state lives in the
 *  parent page (StrategyWorkspace) so this stays reusable/testable. */
export default function StrategyList({ strategies, onOpen }) {
  const [filter, setFilter] = useState("");

  const visible = strategies.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by name…"
        className="mb-3 h-10 w-full max-w-sm rounded-lg border border-gray-200 px-3 text-sm"
      />

      {visible.length === 0 && <p className="text-sm text-gray-400">No strategies match.</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((s) => (
          <button
            key={s.strategyId}
            type="button"
            onClick={() => onOpen(s.strategyId)}
            className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm hover:border-blue-400 hover:shadow"
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">{s.name}</h3>
              {s.status === "ARCHIVED" ? (
                <Archive size={15} className="text-gray-400" />
              ) : (
                <CheckCircle2 size={15} className="text-emerald-500" />
              )}
            </div>
            <p className="line-clamp-2 text-xs text-gray-500">{s.description || "No description"}</p>
            <p className="mt-2 text-[11px] text-gray-400">
              Updated {new Date(s.updatedAt).toLocaleDateString()}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
