import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { apiFetch } from "../utils/api";
import {
  confirmAction,
  showError,
  showSuccess,
} from "../utils/toast";

const WatchlistSelector = ({
  selectedWatchlist,
  setSelectedWatchlist,
  watchlists,
  onWatchlistsChange,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newWatchlist, setNewWatchlist] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [loading, setLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const mongoId = user?.mongoId;

  const activeWatchlist = watchlists.find(
    (watchlist) => watchlist._id === selectedWatchlist,
  );

  const createWatchlist = async () => {
    if (!newWatchlist.trim()) return;

    try {
      setLoading(true);

      const data = await apiFetch("/api/watchlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newWatchlist,
          userId: mongoId,
        }),
      });

      onWatchlistsChange((prev) => [data, ...prev]);

      localStorage.setItem("selectedWatchlist", data._id);

      setSelectedWatchlist(data._id);

      setNewWatchlist("");
      setShowModal(false);
    } catch (error) {
      console.error(error);
      showError(error.message || "Failed to create watchlist");
    } finally {
      setLoading(false);
    }
  };

  const renameWatchlist = async () => {
    if (!selectedWatchlist || !renameValue.trim()) return;

    try {
      setLoading(true);

      const data = await apiFetch(`/api/watchlists/${selectedWatchlist}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: renameValue,
        }),
      });

      onWatchlistsChange((prev) =>
        prev.map((watchlist) =>
          watchlist._id === selectedWatchlist ? data : watchlist,
        ),
      );

      setRenameValue("");
      setShowRenameModal(false);
      showSuccess("Watchlist renamed");
    } catch (error) {
      console.error(error);
      showError(error.message || "Failed to rename watchlist");
    } finally {
      setLoading(false);
    }
  };

  const deleteWatchlist = async () => {
    if (!selectedWatchlist) return;

    const confirmed = await confirmAction({
      title: "Delete watchlist",
      message: `Delete "${activeWatchlist?.name || "this watchlist"}"? This cannot be undone.`,
      confirmText: "Delete",
    });

    if (!confirmed) return;

    try {
      setLoading(true);

      await apiFetch(`/api/watchlists/${selectedWatchlist}`, {
        method: "DELETE",
      });

      const remaining = watchlists.filter(
        watchlist => watchlist._id !== selectedWatchlist,
      );

      onWatchlistsChange(remaining);
      showSuccess("Watchlist deleted");

      if (remaining.length > 0) {
        localStorage.setItem("selectedWatchlist", remaining[0]._id);
        setSelectedWatchlist(remaining[0]._id);
      } else {
        localStorage.removeItem("selectedWatchlist");
        setSelectedWatchlist("");
      }
    } catch (error) {
      console.error(error);
      showError(error.message || "Failed to delete watchlist");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 mt-3">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Active Watchlist
            </h2>

            <p className="text-xs text-gray-500">Select Watchlist</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedWatchlist}
              onChange={(e) => {
                localStorage.setItem("selectedWatchlist", e.target.value);

                setSelectedWatchlist(e.target.value);
              }}
              className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg"
            >
              {watchlists.map((watchlist) => (
                <option key={watchlist._id} value={watchlist._id}>
                  {watchlist.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setRenameValue(activeWatchlist?.name || "");
                setShowRenameModal(true);
              }}
              disabled={!selectedWatchlist}
              className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-gray-300 text-blue-600 hover:bg-blue-50 disabled:opacity-40"
              title="Rename watchlist"
            >
              <Pencil size={16} />
            </button>

            <button
              onClick={deleteWatchlist}
              disabled={!selectedWatchlist || loading}
              className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-gray-300 text-red-500 hover:bg-red-50 disabled:opacity-40"
              title="Delete watchlist"
            >
              <Trash2 size={16} />
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              + New
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl p-6 w-[400px] shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Create Watchlist
            </h2>

            <input
              type="text"
              placeholder="Enter watchlist name"
              value={newWatchlist}
              onChange={(e) => setNewWatchlist(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  setNewWatchlist("");
                }}
                className="border border-gray-300 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={createWatchlist}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameModal && (
        <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl p-6 w-[400px] shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Rename Watchlist
            </h2>

            <input
              type="text"
              placeholder="Enter watchlist name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setRenameValue("");
                }}
                className="border border-gray-300 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={renameWatchlist}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WatchlistSelector;
