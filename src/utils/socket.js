import { io } from "socket.io-client";
import { API_URL } from "../config/api";

let socket = null;
let updateTimer = null;

export function resumeMarketSocket() {
  const marketSocket = getMarketSocket();
  if (!marketSocket.connected) {
    marketSocket.connect();
  }
}

export function getMarketSocket() {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
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

function clearUpdateBatch() {
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }
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

export function onMarketTick(callback) {
  const marketSocket = getMarketSocket();

  marketSocket.on("marketTick", callback);

  return () => {
    marketSocket.off("marketTick", callback);
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
