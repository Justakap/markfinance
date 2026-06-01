import {
  LayoutDashboard,
  LineChart,
  Settings,
  Menu,
  ChevronLeft,
} from "lucide-react";

import { NavLink } from "react-router-dom";

const Sidebar = ({ collapsed, setCollapsed }) => {
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
      title: "Strategies",
      path: "/strategies",
      icon: LayoutDashboard,
    },
    {
      title: "Backtests",
      path: "/backtests",
      icon: LineChart,
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
    <div
      className={`
        fixed
        left-0
        top-0
        h-screen
        bg-white
        border-r
        border-gray-200
        flex
        flex-col
        z-50
        transition-all
        duration-300
        ${collapsed ? "w-[80px]" : "w-[240px]"}
      `}
    >
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
        {!collapsed && (
          <h1 className="text-2xl font-bold text-blue-700">Mark Finance</h1>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 transition"
        >
          {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className="flex-1 px-3 py-4">
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
                ${collapsed ? "justify-center" : "gap-4 px-4"}
                h-14
                rounded-xl
                mb-2
                transition-all
                ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-50"
                }
              `
              }
            >
              <Icon size={22} />

              {!collapsed && <span className="text-base">{item.title}</span>}
            </NavLink>
          );
        })}
      </div>

      <div className="border-t border-gray-100 p-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `
            w-full
            flex
            items-center
            ${collapsed ? "justify-center" : "gap-3 px-3"}
            h-12
            rounded-lg
            transition
            ${
              isActive
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-gray-600 hover:bg-gray-50"
            }
          `
          }
        >
          <Settings size={20} />

          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </div>
  );
};

export default Sidebar;
