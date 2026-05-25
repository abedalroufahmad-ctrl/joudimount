import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "./i18n/I18nContext";
import { notificationTargetPath } from "./notificationRoutes";
import { useNotifications } from "./useNotifications";

export function NotificationBell() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { items, unreadCount, loading, markRead, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleOpen = (id: string, path: string | null) => {
    void markRead(id);
    setOpen(false);
    if (path) navigate(path);
  };

  return (
    <div className="notification-bell position-relative" ref={rootRef}>
      <button
        type="button"
        className="btn btn-light btn-sm position-relative notification-bell-btn"
        aria-label={t("notifications.title")}
        onClick={() => setOpen((v) => !v)}
      >
        🔔
        {unreadCount > 0 ? (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger notification-bell-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="notification-panel card shadow border-0">
          <div className="card-header d-flex align-items-center justify-content-between py-2 px-3 gap-2">
            <strong className="small mb-0">{t("notifications.title")}</strong>
            <div className="d-flex align-items-center gap-2">
              {unreadCount > 0 ? (
                <button type="button" className="btn btn-link btn-sm p-0" onClick={() => void markAllRead()}>
                  {t("notifications.markAllRead")}
                </button>
              ) : null}
              {items.length > 0 ? (
                <button type="button" className="btn btn-link btn-sm p-0 text-danger" onClick={() => void clearAll()}>
                  {t("notifications.clearList")}
                </button>
              ) : null}
            </div>
          </div>
          <div className="notification-panel-list list-group list-group-flush">
            {loading ? (
              <div className="list-group-item small text-secondary">{t("notifications.loading")}</div>
            ) : items.length === 0 ? (
              <div className="list-group-item small text-secondary">{t("notifications.empty")}</div>
            ) : (
              items.map((item) => {
                const path = notificationTargetPath(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`list-group-item list-group-item-action text-start ${item.read ? "" : "notification-unread"}`}
                    onClick={() => handleOpen(item.id, path)}
                  >
                    <div className="fw-semibold small">{item.title}</div>
                    <div className="small text-secondary">{item.message}</div>
                    <div className="small text-muted mt-1">{new Date(item.createdAt).toLocaleString()}</div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
