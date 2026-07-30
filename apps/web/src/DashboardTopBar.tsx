import LanguageSwitcher from "./LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";
import type { AuthUser } from "./types";

export function DashboardTopBar({
  user,
  title,
  subtitle,
}: {
  user: AuthUser;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="dashboard-page-header mx-auto mb-3 px-1">
      <div className="dashboard-top-bar card shadow-sm border-0">
        <div className="card-body d-flex align-items-center flex-wrap gap-3 py-3">
          <img src="/logo.png" alt="JOUDI" width={56} height={56} className="app-logo flex-shrink-0" />
          <div className="dashboard-top-bar-title min-w-0 flex-grow-1">
            <h1 className="dashboard-top-bar-heading fw-bold mb-0">{title}</h1>
            <p className="section-subtitle mb-0 mt-1">{subtitle}</p>
          </div>
          <div className="dashboard-top-bar-actions d-flex align-items-center flex-wrap gap-2 ms-md-auto">
            <NotificationBell />
            <span className="app-header-user badge rounded-pill">{user.name}</span>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
