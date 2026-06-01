import { io } from "socket.io-client";
import { API_URL } from "../config/api";

let socket = null;

export function getMarketSocket() {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }

  return socket;
}

export function disconnectMarketSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
