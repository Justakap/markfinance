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
      // Reduce connection overhead
      upgradeDuration: 10000,
      path: "/socket.io/",
    });

    // Handle connection events
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

/**
 * Batch market updates to reduce re-renders
 * Updates are sent in 2-second intervals instead of immediately
 */
function scheduleBatchFlush() {
  if (updateTimer) return; // Already scheduled

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

  // Emit batched updates to listeners
  // (Listeners should handle multiple updates at once)
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

/**
 * Register a batched stock update listener
 * Updates are batched and sent every 2 seconds
 */
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

/**
 * Register a market status listener (market open/close, trading hours)
 */
export function onMarketStatus(callback) {
  const marketSocket = getMarketSocket();
  marketSocket.on("marketStatus", callback);

  return () => {
    marketSocket.off("marketStatus", callback);
  };
}

/**
 * For internal use: batch individual stock updates
 */
export function batchStockUpdate(update) {
  updateBatch.push(update);

  if (updateBatch.length >= MAX_BATCH_SIZE) {
    // Flush immediately if batch is full
    if (updateTimer) {
      clearTimeout(updateTimer);
      updateTimer = null;
    }
    flushUpdateBatch();
  } else {
    scheduleBatchFlush();
  }
}

/**
 * Old API for backward compatibility - use batched updates instead
 */
export function onStockUpdate(callback) {
  const marketSocket = getMarketSocket();

  // Wrap individual updates to batch them
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
