/**
 * Grid workspace — the two clearly-labeled destinations the Grid navbar
 * item leads to: Live Simulator and Backtest. Router-free (callback prop
 * `onNavigate`, no `Link`/`useNavigate`) — ADR-017 testability convention.
 * No separate "Grid Backtest" navbar item was added; this is how the
 * single "Grid" navbar entry exposes both.
 */
export default function GridWorkspaceTabs({ active, onNavigate }) {
  const tabs = [
    { key: "live", label: "Live Simulator", path: "/workspace/grid" },
    { key: "backtest", label: "Backtest", path: "/workspace/grid/backtest" },
  ];

  return (
    <div className="mb-4 flex gap-1 border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onNavigate(tab.path)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            active === tab.key
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
