import { useEffect, useState } from "react";

const Navbar = ({ lastUpdated }) => {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getTimeAgo = () => {
    if (!lastUpdated) {
      return "Waiting...";
    }

    const seconds = Math.floor(
      (Date.now() - new Date(lastUpdated).getTime()) / 1000,
    );

    if (seconds <= 10) {
      return "Just now";
    }

    if (seconds < 60) {
      return ` seconds ago`;
    }

    const minutes = Math.floor(seconds / 60);

    return ` minutes ago`;
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">Stock Analysis</h1>

          <p className="text-gray-500 text-sm">Real Time Market Analysis</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-gray-400">
              Last Updated {getTimeAgo()}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>

            <span className="text-green-600 font-medium">LIVE</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
