import {
  LineChart,
  Sigma,
  Settings,
  Grid3x3,
} from "lucide-react";

import { NavLink, Link } from "react-router-dom";
import NotificationBell from "../pro/components/NotificationBell";
import { LOGO_DASHBOARD_PATH, NAV_MENU_ITEM_PATHS } from "./topNavbarConfig";

const TopNavbar = ({ showLive = false, lastUpdatedLabel = "" }) => {
  const menuItems = [
    { title: "Stock Analysis", icon: LineChart, path: NAV_MENU_ITEM_PATHS["Stock Analysis"] },
    { title: "Greek", icon: Sigma, path: NAV_MENU_ITEM_PATHS.Greek },
    { title: "Grid", icon: Grid3x3, path: NAV_MENU_ITEM_PATHS.Grid },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center px-4 gap-2">
      <Link
        to={LOGO_DASHBOARD_PATH}
        className="text-xl font-bold text-blue-700 whitespace-nowrap pr-4 mr-2 border-r border-gray-100 hover:text-blue-800"
      >
        Mark Finance
      </Link>

      <nav className="flex items-center gap-1 overflow-x-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
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

      {showLive && (
        <div className="ml-auto flex items-center gap-3 pl-2">
          <p className="text-[11px] md:text-sm font-medium text-black whitespace-nowrap hidden sm:block">
            Last Updated {lastUpdatedLabel}
          </p>

          <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full whitespace-nowrap">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-600 font-medium text-sm">LIVE</span>
          </div>
        </div>
      )}

      <div className={showLive ? "pl-2" : "ml-auto pl-2"}>
        <NotificationBell />
      </div>

      <div className="pl-2">
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
