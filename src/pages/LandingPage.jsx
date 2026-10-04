import { Link } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Brain,
  Check,
  LayoutDashboard,
  LineChart,
  List,
  PieChart,
  Zap,
} from "lucide-react";
import { isLoggedIn } from "../utils/auth";

const FEATURES = [
  {
    icon: Activity,
    title: "Multi-Timeframe RSI",
    desc: "Analyze momentum across 1m, 5m, 15m, 1h, and daily intervals.",
  },
  {
    icon: Brain,
    title: "Custom Strategy Builder",
    desc: "Create complex entry and exit rules with our visual logic engine.",
  },
  {
    icon: List,
    title: "Smart Watchlist",
    desc: "Organize your favorite assets and track them in real-time.",
  },
  {
    icon: LineChart,
    title: "Technical Indicators",
    desc: "EMA, SMA, MACD, and more integrated into your analysis.",
  },
  {
    icon: PieChart,
    title: "Portfolio Analytics",
    desc: "Deep dive into sector allocation and performance metrics.",
  },
  {
    icon: Zap,
    title: "Real-Time Intelligence",
    desc: "Low-latency market data powered by institutional-grade feeds.",
  },
];

const STEPS = [
  { n: 1, title: "Signup", desc: "Connect your broker account securely." },
  { n: 2, title: "Create Watchlists", desc: "Track your favorite assets." },
  { n: 3, title: "Build Strategies", desc: "Define your entry and exit rules." },
  { n: 4, title: "Trade Opportunities", desc: "Get real-time alerts on signals." },
];

const PRICING_FEATURES = [
  "Unlimited Watchlists",
  "Full Strategy Builder",
  "Multi-Timeframe RSI",
  "Real-Time Market Data",
  "Portfolio Analytics",
  "Backtesting Engine",
];

const LandingPage = () => {
  const loggedIn = isLoggedIn();
  const dashboardPath = "/dashboard";
  const authPath = loggedIn ? dashboardPath : "/login";

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-blue-600">
            MarkFinance
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#markets" className="hover:text-blue-600">
              Markets
            </a>
            <a href="#strategies" className="hover:text-blue-600">
              Strategies
            </a>
            <a href="#portfolio" className="hover:text-blue-600">
              Portfolio
            </a>
            <a href="#pricing" className="hover:text-blue-600">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-3">
            {!loggedIn && (
              <Link
                to="/login"
                className="text-gray-700 font-medium text-sm hover:text-blue-600"
              >
                Log in
              </Link>
            )}
            <Link
              to={dashboardPath}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="inline-block bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold">
              Investment Intelligence Platform
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mt-6 leading-tight">
              Discover Better Investment{" "}
              <span className="text-blue-600">Opportunities</span> with
              MarkFinance
            </h1>

            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl">
              Institutional-grade tools for the modern investor. Analyze stocks
              using multi-timeframe RSI, EMA signals, and custom strategies with
              real-time market data.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <Link
                to={dashboardPath}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition"
              >
                Dashboard
              </Link>
              {!loggedIn && (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 border border-gray-300 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </Link>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6 lg:p-8">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium">RSI</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">68.4</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium">Strategy</p>
                <p className="text-sm font-bold text-gray-900 mt-2 leading-tight">
                  Golden Cross
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium">Volume</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">1.2M</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Moving avg. RSI (14)
            </p>
            <div className="flex items-end gap-2 h-32">
              {[35, 42, 38, 55, 48, 62, 58, 70, 65, 75, 68, 80].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-blue-500 rounded-t opacity-90"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-gray-100 bg-gray-50/80">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Zap, label: "Real-Time Market Data" },
            { icon: BarChart3, label: "Multi-Timeframe Analysis" },
            { icon: PieChart, label: "Portfolio Intelligence" },
            { icon: LayoutDashboard, label: "Custom Dashboards" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700">
              <Icon size={18} className="text-blue-600 shrink-0" />
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* Advanced Tools */}
      <section id="strategies" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-center">
            Advanced Tools for the Modern Investor
          </h2>
          <p className="text-gray-600 text-center mt-4 max-w-2xl mx-auto">
            Everything you need to analyze, strategize, and act on market
            opportunities in one platform.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                  <Icon size={22} />
                </div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-gray-600 mt-2 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Logic */}
      <section id="markets" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 max-w-md">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Contract
            </p>
            <p className="text-lg font-bold mt-1">NIFTY 50 FUT</p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <p className="text-xs text-gray-500">Price</p>
                <p className="text-xl font-bold">24,850.50</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Quantity</p>
                <p className="text-xl font-bold">50</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                className="bg-blue-600 text-white py-3 rounded-xl font-semibold"
              >
                Buy
              </button>
              <button
                type="button"
                className="bg-red-500 text-white py-3 rounded-xl font-semibold"
              >
                Sell
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
              Visual Logic For Every{" "}
              <span className="text-blue-600">Trade Idea</span>
            </h2>
            <ul className="mt-8 space-y-4">
              {[
                "Multi-asset support: equities, futures, options, and commodities.",
                "No-code strategy builder with AND/OR logic groups.",
                "Instant backtesting on historical data with detailed trade logs.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-gray-600">
                  <Check className="text-blue-600 shrink-0 mt-0.5" size={20} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Four Steps */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-center">
            Four Steps to Alpha
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-14">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white text-xl font-bold flex items-center justify-center mx-auto">
                  {n}
                </div>
                <h3 className="font-bold text-lg mt-4">{title}</h3>
                <p className="text-gray-600 text-sm mt-2">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section id="portfolio" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-center">
            Master Your{" "}
            <span className="text-blue-600">Portfolio Intelligence</span>
          </h2>

          <div className="grid lg:grid-cols-2 gap-8 mt-14 items-start">
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <p className="text-sm text-gray-500">Sharpe Ratio</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">1.24</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <p className="text-sm text-gray-500">YTD Performance</p>
                <p className="text-3xl font-bold text-green-600 mt-1">+22.4%</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h3 className="font-bold text-lg">Sector Allocation</h3>
              <div className="flex items-center gap-8 mt-6">
                <div
                  className="w-36 h-36 rounded-full shrink-0"
                  style={{
                    background:
                      "conic-gradient(#2563eb 0% 54%, #60a5fa 54% 73%, #93c5fd 73% 85%, #e5e7eb 85% 100%)",
                  }}
                />
                <ul className="text-sm space-y-2 text-gray-700">
                  <li>
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-600 mr-2" />
                    Technology 54.2%
                  </li>
                  <li>
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-400 mr-2" />
                    Finance 18.6%
                  </li>
                  <li>
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-300 mr-2" />
                    Energy 12.2%
                  </li>
                  <li>
                    <span className="inline-block w-3 h-3 rounded-full bg-gray-200 mr-2" />
                    Others 15.0%
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-center">
            Simple Transparent Access
          </h2>

          <div className="max-w-lg mx-auto mt-12 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full z-10">
              Popular
            </span>
            <div className="bg-white border-2 border-blue-100 rounded-2xl shadow-xl p-8 pt-10">
              <p className="text-5xl font-bold text-center">
                $0
                <span className="text-lg font-normal text-gray-500"> / month</span>
              </p>
              <ul className="mt-8 space-y-3">
                {PRICING_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-gray-700">
                    <Check className="text-blue-600 shrink-0" size={18} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={dashboardPath}
                className="block w-full text-center mt-8 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-semibold transition"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-900 py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl lg:text-4xl font-bold">
            Ready to trade with precision?
          </h2>
          <p className="mt-4 text-blue-100 text-lg">
            Join 50,000+ investors using MarkFinance for smarter decisions.
          </p>
          <Link
            to={authPath}
            className="inline-block mt-8 bg-white text-blue-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-blue-50 transition"
          >
            {loggedIn ? "Go to Dashboard" : "Start Your Intelligence Journey"}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-400 py-14">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <p className="text-white font-bold text-lg">MarkFinance</p>
            <p className="text-sm mt-3 leading-relaxed">
              Precision intelligence for the modern investor.
            </p>
          </div>
          <div>
            <p className="text-white font-semibold text-sm mb-3">Product</p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to={dashboardPath} className="hover:text-white">
                  Dashboard
                </Link>
              </li>
              <li>
                <a href="#strategies" className="hover:text-white">
                  Strategies
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white">
                  Pricing
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold text-sm mb-3">Company</p>
            <ul className="space-y-2 text-sm">
              <li>About</li>
              <li>Careers</li>
              <li>Contact</li>
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold text-sm mb-3">Legal</p>
            <ul className="space-y-2 text-sm">
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
            </ul>
          </div>
        </div>
        <p className="text-center text-xs mt-12 pt-8 border-t border-slate-800">
          © {new Date().getFullYear()} MarkFinance Intelligence. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
