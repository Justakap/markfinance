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

/**
 * Forces an immediate reconnect attempt on the EXISTING socket singleton
 * (cycles the transport) rather than destroying and recreating it —
 * destroying it (see disconnectMarketSocket()) would orphan every
 * already-registered `.on()` listener elsewhere in the app. Socket.IO
 * already auto-reconnects with backoff on its own; this is purely a
 * manual "don't wait for backoff" escape hatch for a user-facing Refresh
 * button when a feed looks stale.
 */
export function forceReconnectMarketSocket() {
  const marketSocket = getMarketSocket();
  marketSocket.disconnect();
  marketSocket.connect();
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

/**
 * Grid Trading Simulator (PAPER TRADING ONLY) — joins the authenticated,
 * ownership-verified Socket.IO room for one session (backend verifies the
 * JWT + that this session belongs to that user before letting the socket
 * join; see app.js's `subscribeGridSession` handler). This is NOT the
 * same channel as `marketTick` — that's a public, unauthenticated price
 * broadcast; this one carries a session's private holdings/cash/trades,
 * so it is deliberately never broadcast globally.
 *
 * Re-joins automatically on every reconnect (a fresh connection has no
 * memory of previously-joined rooms), and the caller should always follow
 * a join with a one-time REST reload to reconcile anything that happened
 * while disconnected — this function alone does not replay missed events.
 */
export function joinGridSession(sessionId) {
  const marketSocket = getMarketSocket();
  const token = localStorage.getItem("token");

  const join = () => {
    if (token) marketSocket.emit("subscribeGridSession", { sessionId, token });
  };

  join();
  marketSocket.on("connect", join);

  return () => {
    marketSocket.off("connect", join);
    marketSocket.emit("unsubscribeGridSession", { sessionId });
  };
}

export function onGridSimulatorUpdate(callback) {
  const marketSocket = getMarketSocket();
  const wrapped = (payload) => callback(payload);
  marketSocket.on("gridSimulatorUpdate", wrapped);
  return () => {
    marketSocket.off("gridSimulatorUpdate", wrapped);
  };
}

/** Connected / reconnecting / disconnected — for an honest status badge.
 *  Never infer "live" from this alone; it only means the Socket.IO
 *  transport itself is up, not that any genuine market tick has arrived
 *  (see the session's own `lastFeedStatus` for that). */
export function onSocketConnectionChange(callback) {
  const marketSocket = getMarketSocket();
  const onConnect = () => callback("connected");
  const onDisconnect = () => callback("disconnected");
  const onReconnectAttempt = () => callback("reconnecting");

  marketSocket.on("connect", onConnect);
  marketSocket.on("disconnect", onDisconnect);
  marketSocket.io.on("reconnect_attempt", onReconnectAttempt);

  callback(marketSocket.connected ? "connected" : "disconnected");

  return () => {
    marketSocket.off("connect", onConnect);
    marketSocket.off("disconnect", onDisconnect);
    marketSocket.io.off("reconnect_attempt", onReconnectAttempt);
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
