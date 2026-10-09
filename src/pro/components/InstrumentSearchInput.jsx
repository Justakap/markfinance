import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../utils/api";

/**
 * Minimal instrument search reusing the existing, already-authenticated
 * GET /api/search endpoint (routes/stockAnalysisRoutes.js, unmodified) —
 * the same data source the legacy BacktestPage/StrategySearch already use.
 * Not the watchlist-coupled StockSearchDropdown (that component manages
 * add/remove-from-watchlist state this form has no use for); this is a
 * plain "pick one symbol" input.
 *
 * Extracted from BacktestRunner.jsx (Workstream L) so the live-strategy
 * activation form can reuse the exact same search behavior instead of a
 * second, drifting copy — same component, same two call sites.
 */
export default function InstrumentSearchInput({ value, onSelect }) {
  const [query, setQuery] = useState(value?.symbol || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    timerRef.current = setTimeout(async () => {
      try {
        const rows = await apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
        setResults(Array.isArray(rows) ? rows : []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="Search symbol (e.g. RELIANCE)"
        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.map((row) => (
            <button
              key={row.instrumentKey || row.symbol}
              type="button"
              onClick={() => {
                onSelect(row);
                setQuery(row.symbol);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50"
            >
              <span className="font-medium">{row.symbol}</span>
              <span className="text-xs text-gray-400">{row.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
