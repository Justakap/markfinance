import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

const MainLayout = ({
  children,
  title,
  subtitle,
  lastUpdated,
  showLive = false,
  actions,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!showLive) return undefined;

    const interval = setInterval(() => {
      forceUpdate((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [showLive]);

  const getTimeAgo = () => {
    if (!lastUpdated) {
      return "Waiting...";
    }

    const formatted = new Date(lastUpdated).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });

    const seconds = Math.floor(
      (Date.now() - new Date(lastUpdated).getTime()) / 1000,
    );

    if (seconds <= 10) {
      return `${formatted} · Just now`;
    }

    if (seconds < 60) {
      return `${formatted} · ${seconds}s ago`;
    }

    const minutes = Math.floor(seconds / 60);

    return `${formatted} · ${minutes}m ago`;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div
        className={`
          transition-all
          duration-300
          ${collapsed ? "ml-[80px]" : "ml-[240px]"}
        `}
      >
        {title && (
          <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
            <div className="px-7 py-3 flex items-center justify-between gap-6">
              <div>
                <h1 className="text-xl font-bold text-blue-700">{title}</h1>

                {subtitle && (
                  <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
                )}
              </div>

              <div className="flex items-center gap-4">
                {showLive && (
                  <>
                    <p className="text-[11px] md:text-sm font-medium text-black whitespace-nowrap">
                      Last Updated {getTimeAgo()}
                    </p>

                    <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />

                      <span className="text-green-600 font-medium">LIVE</span>
                    </div>
                  </>
                )}

                {actions}
              </div>
            </div>
          </header>
        )}

        {children}
      </div>
    </div>
  );
};

export default MainLayout;
