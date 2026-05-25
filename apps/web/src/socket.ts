import { io, Socket } from "socket.io-client";
import { API_BASE } from "./types";
import { getToken } from "./api";

let socket: Socket | null = null;

export function connectNotificationSocket(onNotification: (payload: unknown) => void): void {
  const token = getToken();
  if (!token) return;
  disconnectNotificationSocket();
  socket = io(API_BASE, {
    auth: { token },
    transports: ["websocket", "polling"],
  });
  socket.on("notification", onNotification);
}

export function disconnectNotificationSocket(): void {
  if (!socket) return;
  socket.off("notification");
  socket.disconnect();
  socket = null;
}
