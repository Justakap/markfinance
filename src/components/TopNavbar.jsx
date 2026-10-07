import {
  LayoutDashboard,
  LineChart,
  Sigma,
  CandlestickChart,
  BarChart3,
  Settings,
} from "lucide-react";

import { NavLink } from "react-router-dom";

const TopNavbar = () => {
  const menuItems = [
    {
      title: "Overview",
      icon: LayoutDashboard,
      path: "/dashboard",
    },
    {
      title: "Stock Analysis",
      icon: LineChart,
      path: "/analysis",
    },
    {
      title: "Greek",
      icon: Sigma,
      path: "/greek",
    },
    {
      title: "Strategies",
      path: "/strategies",
      icon: CandlestickChart,
    },
    {
      title: "Backtests",
      path: "/backtests",
      icon: BarChart3,
    },
  ];

  if (
    process.env.REACT_APP_VALIDATION_MODE === "true" ||
    process.env.NODE_ENV === "development"
  ) {
    menuItems.push({
      title: "Validation",
      path: "/validation",
      icon: Settings,
    });
    menuItems.push({
      title: "Metrics",
      path: "/metrics",
      icon: LayoutDashboard,
    });
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center px-4 gap-2">
      <h1 className="text-xl font-bold text-blue-700 whitespace-nowrap pr-4 mr-2 border-r border-gray-100">
        Mark Finance
      </h1>

      <nav className="flex items-center gap-1 overflow-x-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `
                flex
                items-center
                gap-2
                px-3
                h-10
                rounded-lg
                whitespace-nowrap
                transition-all
                ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-50"
                }
              `
              }
            >
              <Icon size={18} />
              <span className="text-sm hidden lg:inline">{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="ml-auto pl-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `
            flex
            items-center
            gap-2
            px-3
            h-10
            rounded-lg
            whitespace-nowrap
            transition
            ${
              isActive
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-gray-600 hover:bg-gray-50"
            }
          `
          }
        >
          <Settings size={18} />
          <span className="text-sm hidden lg:inline">Settings</span>
        </NavLink>
      </div>
    </div>
  );
};

export default TopNavbar;
