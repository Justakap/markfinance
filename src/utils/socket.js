import { io } from "socket.io-client";
import { API_URL } from "../config/api";

let socket = null;
let updateBatch = [];
let updateTimer = null;
const UPDATE_BATCH_INTERVAL = 2000; // 2 seconds - update every 2 seconds when market is open
const MAX_BATCH_SIZE = 100; // Max updates to batch before sending

export function getMarketSocket() {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      upgradeDuration: 10000,
      path: "/socket.io/",
    });

    socket.on("connect", () => {
      console.log("Market socket connected");
    });

    socket.on("disconnect", () => {
      console.log("Market socket disconnected");
      clearUpdateBatch();
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  }

  return socket;
}

export function disconnectMarketSocket() {
  if (socket) {
    clearUpdateBatch();
    socket.disconnect();
    socket = null;
  }
}

// Internal batching functions
function scheduleBatchFlush() {
  if (updateTimer) return;
  updateTimer = setTimeout(() => {
    flushUpdateBatch();
  }, UPDATE_BATCH_INTERVAL);
}

function flushUpdateBatch() {
  if (updateBatch.length === 0) {
    updateTimer = null;
    return;
  }

  const batch = [...updateBatch];
  updateBatch = [];
  updateTimer = null;

  const marketSocket = socket;
  if (marketSocket) {
    marketSocket.emit("batchedStockUpdates", batch);
  }
}

function clearUpdateBatch() {
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }
  updateBatch = [];
}

// Public API for batched updates
export function onBatchedStockUpdates(callback) {
  const marketSocket = getMarketSocket();

  const wrappedCallback = (updates) => {
    if (Array.isArray(updates) && updates.length > 0) {
      callback(updates);
    }
  };

  marketSocket.on("batchedStockUpdates", wrappedCallback);

  return () => {
    marketSocket.off("batchedStockUpdates", wrappedCallback);
  };
}

// Legacy API - for backward compatibility
export function onStockUpdate(callback) {
  const marketSocket = getMarketSocket();

  const batchedCallback = (updates) => {
    if (Array.isArray(updates)) {
      updates.forEach(callback);
    } else {
      callback(updates);
    }
  };

  marketSocket.on("batchedStockUpdates", batchedCallback);

  return () => {
    marketSocket.off("batchedStockUpdates", batchedCallback);
  };
}
