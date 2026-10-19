/**
 * Plain navigation data for TopNavbar.jsx, kept in its own react-router-dom-
 * free module so it can be imported by tests without ever pulling in
 * react-router-dom — TopNavbar.jsx itself can't be rendered under Jest at
 * all (BLOCKER-004: "Cannot find module 'react-router/dom'" breaks any
 * file that imports react-router-dom, even transitively), the same
 * pre-existing constraint ADR-017 already worked around elsewhere in this
 * codebase by keeping router-coupled files thin and testing their data/
 * logic separately.
 *
 * Legacy Strategy/Backtest/Live navbar entries were removed per the
 * product decision to promote only the Grid workspace for now — their
 * routes, components, and backend APIs are untouched (ADR-026). The
 * dashboard is still reachable via the logo, which is why "Overview" was
 * also removed here rather than just hidden with CSS.
 */
export const LOGO_DASHBOARD_PATH = "/dashboard";

export const NAV_MENU_ITEM_TITLES = ["Stock Analysis", "Greek", "Grid"];

export const NAV_MENU_ITEM_PATHS = {
  "Stock Analysis": "/analysis",
  Greek: "/greek",
  Grid: "/workspace/grid",
};
