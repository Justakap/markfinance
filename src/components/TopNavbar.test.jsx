/**
 * TopNavbar.jsx imports react-router-dom (NavLink/Link) directly, so it
 * cannot be rendered under Jest at all — BLOCKER-004 ("Cannot find module
 * 'react-router/dom'") breaks any file that imports react-router-dom, even
 * transitively. This is the exact same pre-existing constraint ADR-017
 * worked around elsewhere in this codebase: keep the router-coupled file
 * thin, and export its actual navigation data as plain constants so it can
 * be tested directly, without ever importing react-router-dom in this test
 * file (confirmed: this file has zero react-router-dom import, so it is
 * NOT affected by BLOCKER-004 and genuinely runs).
 */
import {
  LOGO_DASHBOARD_PATH,
  NAV_MENU_ITEM_TITLES,
  NAV_MENU_ITEM_PATHS,
} from "./topNavbarConfig";

describe("TopNavbar navigation data", () => {
  test("the logo links to the dashboard route", () => {
    expect(LOGO_DASHBOARD_PATH).toBe("/dashboard");
  });

  test("Overview is not in the primary navbar", () => {
    expect(NAV_MENU_ITEM_TITLES).not.toContain("Overview");
  });

  test("Live is not in the primary navbar", () => {
    expect(NAV_MENU_ITEM_TITLES).not.toContain("Live");
  });

  test("legacy Strategies and Backtests entries are not in the primary navbar", () => {
    expect(NAV_MENU_ITEM_TITLES).not.toContain("Strategies");
    expect(NAV_MENU_ITEM_TITLES).not.toContain("Backtests");
  });

  test("Grid remains visible in the primary navbar, pointing at the grid workspace", () => {
    expect(NAV_MENU_ITEM_TITLES).toContain("Grid");
    expect(NAV_MENU_ITEM_PATHS.Grid).toBe("/workspace/grid");
  });

  test("Stock Analysis and Greek remain visible (unrelated features preserved)", () => {
    expect(NAV_MENU_ITEM_TITLES).toContain("Stock Analysis");
    expect(NAV_MENU_ITEM_TITLES).toContain("Greek");
  });

  test("no Grid Backtest navbar item was added (Grid workspace exposes it internally instead)", () => {
    expect(NAV_MENU_ITEM_TITLES).not.toContain("Grid Backtest");
    expect(NAV_MENU_ITEM_TITLES).not.toContain("Backtest");
  });
});
