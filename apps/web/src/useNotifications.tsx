import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "./api";
import { connectNotificationSocket, disconnectNotificationSocket } from "./socket";
import type { AppNotification } from "./notifications";

type NotificationsContextValue = {
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [listRes, countRes] = await Promise.all([
      apiFetch("/api/notifications?limit=50"),
      apiFetch("/api/notifications/unread-count"),
    ]);
    if (listRes.ok) {
      setItems((await listRes.json()) as AppNotification[]);
    }
    if (countRes.ok) {
      const data = (await countRes.json()) as { count: number };
      setUnreadCount(data.count);
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    const res = await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
    if (!res.ok) return;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    const res = await apiFetch("/api/notifications/read-all", { method: "POST" });
    if (!res.ok) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(async () => {
    const res = await apiFetch("/api/notifications/clear", { method: "POST" });
    if (!res.ok) return;
    setItems([]);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    refresh()
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    connectNotificationSocket((payload) => {
      const notification = payload as AppNotification;
      setItems((prev) => [notification, ...prev.filter((n) => n.id !== notification.id)].slice(0, 50));
      setUnreadCount((c) => c + 1);
    });

    return () => {
      active = false;
      disconnectNotificationSocket();
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ items, unreadCount, loading, refresh, markRead, markAllRead, clearAll }),
    [items, unreadCount, loading, refresh, markRead, markAllRead, clearAll],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
