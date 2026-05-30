import MainLayout from "../layout/MainLayout";

const Dashboard = () => {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <MainLayout
      title="Overview"
      subtitle={`Welcome back, ${user?.name?.split(" ")[0] || "there"}`}
    >
      <div className="bg-slate-50 min-h-screen p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-sm text-slate-500">Watchlists</p>

            <h2 className="text-2xl font-semibold mt-2 text-slate-900">1</h2>

            <p className="text-xs text-green-600 mt-1">Active</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-sm text-slate-500">Stocks Tracked</p>

            <h2 className="text-2xl font-semibold mt-2 text-slate-900">0</h2>

            <p className="text-xs text-slate-500 mt-1">Across watchlists</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-sm text-slate-500">Buy Signals</p>

            <h2 className="text-2xl font-semibold mt-2 text-green-600">0</h2>

            <p className="text-xs text-slate-500 mt-1">Opportunities</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-sm text-slate-500">Sell Signals</p>

            <h2 className="text-2xl font-semibold mt-2 text-red-500">0</h2>

            <p className="text-xs text-slate-500 mt-1">Exit Alerts</p>
          </div>
        </div>

        {/* Middle Section */}
        <div className="grid lg:grid-cols-2 gap-4 mt-6">
          {/* Activity */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-slate-900">Recent Activity</h2>

              <span className="text-xs text-slate-400">Latest</span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="font-medium text-sm">Created My Watchlist</p>

                <p className="text-xs text-slate-500 mt-1">
                  Your first watchlist is ready.
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <p className="font-medium text-sm">Account Connected</p>

                <p className="text-xs text-slate-500 mt-1">
                  Google account synced successfully.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Quick Actions</h2>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-3 font-medium transition">
                Open Analysis
              </button>

              <button className="border border-slate-200 hover:bg-slate-50 rounded-lg p-3 transition">
                Watchlists
              </button>

              <button className="border border-slate-200 hover:bg-slate-50 rounded-lg p-3 transition">
                Strategies
              </button>

              <button className="border border-slate-200 hover:bg-slate-50 rounded-lg p-3 transition">
                Portfolio
              </button>
            </div>
          </div>
        </div>

        {/* Market Overview */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mt-6">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-slate-900">Market Overview</h2>

            <span className="text-xs text-slate-400">Live Insights</span>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500">NIFTY Trend</p>

              <h3 className="text-xl font-semibold mt-2 text-green-600">
                Bullish
              </h3>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500">Strong Sector</p>

              <h3 className="text-xl font-semibold mt-2">Banking</h3>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500">Market Sentiment</p>

              <h3 className="text-xl font-semibold mt-2 text-blue-600">
                Neutral
              </h3>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
