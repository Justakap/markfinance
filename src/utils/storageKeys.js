// Each page that lets the user pick an "active watchlist" remembers its own
// selection independently — selecting watchlist A on Stock Analysis must not
// change what Greek has selected, and vice versa. Keep these as distinct
// localStorage keys per page rather than the old shared "selectedWatchlist"
// key.
export const SELECTED_WATCHLIST_KEYS = {
  analysis: "selectedWatchlist:analysis",
  greek: "selectedWatchlist:greek",
};
