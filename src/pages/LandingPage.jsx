import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}

      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Mark Finance</h1>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-gray-700 font-medium">
              Login
            </Link>

            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
              Investment Intelligence Platform
            </span>

            <h1 className="text-6xl font-bold mt-6 text-gray-900 leading-tight">
              Discover Better Investment Opportunities
            </h1>

            <p className="mt-6 text-xl text-gray-600">
              Analyze stocks using multi-timeframe RSI, EMA signals, watchlists,
              custom strategies and real-time market data.
            </p>

            <div className="flex gap-4 mt-8">
              <Link
                to="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium"
              >
                Get Started Free
              </Link>

              <Link
                to="/login"
                className="border border-gray-300 px-6 py-3 rounded-xl font-medium"
              >
                Sign in with Google
              </Link>
            </div>
          </div>

          <div>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6">
              <h3 className="font-bold text-xl mb-4">Live Market Overview</h3>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between">
                    <span>TCS</span>
                    <span className="text-green-600">RSI 64</span>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex justify-between">
                    <span>INFY</span>
                    <span className="text-green-600">RSI 58</span>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex justify-between">
                    <span>RELIANCE</span>
                    <span className="text-red-600">RSI 34</span>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex justify-between">
                    <span>HDFCBANK</span>
                    <span className="text-green-600">RSI 61</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}

      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center">
            Everything You Need
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="font-bold text-lg">Multi-Timeframe RSI</h3>

              <p className="text-gray-600 mt-2">
                Daily, Hourly, 15m, 5m and 1m RSI.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="font-bold text-lg">Smart Watchlists</h3>

              <p className="text-gray-600 mt-2">
                Organize stocks and sectors easily.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="font-bold text-lg">Buy/Sell Signals</h3>

              <p className="text-gray-600 mt-2">
                Instant market opportunities.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="font-bold text-lg">EMA Analysis</h3>

              <p className="text-gray-600 mt-2">Trend-based stock analysis.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="font-bold text-lg">Portfolio Analytics</h3>

              <p className="text-gray-600 mt-2">
                Understand sector allocation.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="font-bold text-lg">Strategy Builder</h3>

              <p className="text-gray-600 mt-2">Coming Soon.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}

      <section className="py-20">
        <div className="max-w-5xl mx-auto text-center px-6">
          <h2 className="text-5xl font-bold">Start Using Mark Finance Today</h2>

          <p className="text-gray-600 mt-4 text-lg">
            Create watchlists, discover signals and analyze stocks in seconds.
          </p>

          <Link
            to="/login"
            className="inline-block mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
