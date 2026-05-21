import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "./api";
import { useI18n } from "./i18n/I18nContext";
import type { MessageKey } from "./i18n/messages";
import type { AuthUser, Role, Transaction } from "./types";
import type { TransactionListModule } from "./paths";
import { transactionListPath } from "./paths";
import { DashboardTopBar } from "./DashboardTopBar";
import { stageBadgeClass } from "./stageBadge";

type Highlight = "home" | TransactionListModule;

function roleLabel(role: Role, t: (key: MessageKey) => string) {
  if (role === "manager") return t("role.manager");
  if (role === "employee") return t("role.employee");
  if (role === "employee2") return t("app.roleEmployee2");
  return t("role.accountant");
}

export const DASHBOARD_MODULES: Array<{ id: TransactionListModule; route: string; titleKey: MessageKey; descKey: MessageKey }> = [
  { id: "transactions", route: "/transactions", titleKey: "app.title", descKey: "dashboard.transactionsDesc" },
  { id: "transfers", route: "/transfers", titleKey: "transfer.app.title" as MessageKey, descKey: "dashboard.transfersDesc" as MessageKey },
  { id: "exports", route: "/exports", titleKey: "export.app.title" as MessageKey, descKey: "dashboard.exportsDesc" as MessageKey },
];

type ActivityRow = { module: TransactionListModule; tx: Transaction };

export function DashboardSidebar({
  highlight,
  user,
  role,
  onLogout,
  addModule,
}: {
  highlight: Highlight;
  user: AuthUser;
  role: Role;
  onLogout: () => void;
  addModule: TransactionListModule;
}) {
  const { t } = useI18n();
  const itemClass = (key: Highlight) =>
    `list-group-item list-group-item-action sidebar-link${highlight === key ? " active" : ""}`;
  return (
    <aside className="sidebar-panel card shadow-sm border-0">
      <div className="sidebar-user">
        <span className="muted">{t("app.loggedInAs")}</span>
        <strong>{user.name}</strong>
        <span className="muted">{roleLabel(role, t)}</span>
      </div>
      <nav className="sidebar-links list-group">
        <Link to="/" className={itemClass("home")}>
          {t("nav.home")}
        </Link>
        <Link to="/transactions" className={itemClass("transactions")}>
          {t("nav.imports")}
        </Link>
        <Link to="/transfers" className={itemClass("transfers")}>
          {t("nav.transfers")}
        </Link>
        <Link to="/exports" className={itemClass("exports")}>
          {t("nav.exports")}
        </Link>
        <Link to="/employees" className="list-group-item list-group-item-action sidebar-link">
          {t("nav.employeeSection")}
        </Link>
        <Link to="/clients" className="list-group-item list-group-item-action sidebar-link">
          {t("nav.clients")}
        </Link>
        <Link to="/shipping-companies" className="list-group-item list-group-item-action sidebar-link">
          {t("nav.shippingCompanies")}
        </Link>
      </nav>
      {role === "manager" || role === "employee" ? (
        <Link to={`/${addModule}/new`} className="btn btn-primary sidebar-cta">
          {t(
            (addModule === "transactions"
              ? "nav.addTransaction"
              : addModule === "transfers"
                ? "nav.addTransfer"
                : "nav.addExport") as MessageKey,
          )}
        </Link>
      ) : null}
      <button type="button" className="btn btn-outline-danger sidebar-logout" onClick={onLogout}>
        {t("nav.logout")}
      </button>
    </aside>
  );
}

export function DashboardHome({
  user,
  role,
  onLogout,
}: {
  user: AuthUser;
  role: Role;
  onLogout: () => void;
}) {
  const { t, numberLocale } = useI18n();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [counts, setCounts] = useState<{ transactions: number; transfers: number; exports: number }>({
    transactions: 0,
    transfers: 0,
    exports: 0,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const limit = 40;
    Promise.all([
      apiFetch(`/api/transactions?limit=${limit}`)
        .then((res) => res.json())
        .then((data: Transaction[]) => (Array.isArray(data) ? data : [])),
      apiFetch(`/api/transfers?limit=${limit}`)
        .then((res) => res.json())
        .then((data: Transaction[]) => (Array.isArray(data) ? data : [])),
      apiFetch(`/api/exports?limit=${limit}`)
        .then((res) => res.json())
        .then((data: Transaction[]) => (Array.isArray(data) ? data : [])),
    ])
      .then(([importsList, transfersList, exportsList]) => {
        if (cancelled) return;
        setCounts({
          transactions: importsList.length,
          transfers: transfersList.length,
          exports: exportsList.length,
        });
        const merged: ActivityRow[] = [
          ...importsList.map((tx) => ({ module: "transactions" as const, tx })),
          ...transfersList.map((tx) => ({ module: "transfers" as const, tx })),
          ...exportsList.map((tx) => ({ module: "exports" as const, tx })),
        ];
        merged.sort((a, b) => new Date(b.tx.createdAt).getTime() - new Date(a.tx.createdAt).getTime());
        setRows(merged.slice(0, 80));
      })
      .catch(() => {
        if (!cancelled) setError(t("home.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const moduleLabel = (m: TransactionListModule): MessageKey =>
    m === "transactions" ? "app.title" : m === "transfers" ? ("transfer.app.title" as MessageKey) : ("export.app.title" as MessageKey);

  return (
    <main className="dashboard-page py-3 px-2 px-md-3">
      <DashboardTopBar user={user} title={t("home.title")} subtitle={t("home.tagline")} />

      <div className="dashboard-shell mx-auto">
        {error ? <p className="error alert alert-danger mb-3">{error}</p> : null}

        <section className="dashboard-top-tools card shadow-sm border-0 mb-3 p-3 p-md-4">
          <h2 className="h6 small text-uppercase text-secondary fw-semibold mb-3 dashboard-tools-heading">
            {t("home.modulesHeading")}
          </h2>
          <div className="module-cards dashboard-top-module-cards">
            {DASHBOARD_MODULES.map((item) => (
              <Link key={item.id} to={item.route} className="module-card card text-decoration-none">
                <span className="module-card-icon" aria-hidden>
                  {item.id === "transactions" ? "📦" : item.id === "transfers" ? "↔" : "🚢"}
                </span>
                <span className="module-card-title">{t(item.titleKey)}</span>
                <span className="module-card-desc">{t(item.descKey)}</span>
                <span className="module-card-cta">{t("home.openFullList")} →</span>
              </Link>
            ))}
          </div>
          <p className="small text-secondary mt-3 mb-0">{t("home.snapshotHint")}</p>
          <div className="row g-2 mt-3">
            <div className="col-md-4">
              <div className="stat-card stat-card--imports">
                <div className="stat-card-label">{t("app.title")}</div>
                <div className="stat-card-value">{loading ? "…" : counts.transactions}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="stat-card stat-card--transfers">
                <div className="stat-card-label">{t("transfer.app.title" as MessageKey)}</div>
                <div className="stat-card-value">{loading ? "…" : counts.transfers}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="stat-card stat-card--exports">
                <div className="stat-card-label">{t("export.app.title" as MessageKey)}</div>
                <div className="stat-card-value">{loading ? "…" : counts.exports}</div>
              </div>
            </div>
          </div>
        </section>

        <div className="dashboard-layout-split">
          <DashboardSidebar highlight="home" user={user} role={role} onLogout={onLogout} addModule="transactions" />

          <section className="dashboard-list-column card shadow-sm border-0">
            <div className="dashboard-list-toolbar d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-body-tertiary">
              <span className="small fw-semibold text-secondary text-truncate me-2">
                {t("home.activityHeading")}
              </span>
              <span className="badge rounded-pill text-bg-primary">{loading ? "…" : rows.length}</span>
            </div>
            <div className="dashboard-table-scroll">
              <table className="table table-hover align-middle mb-0 sticky-table-head">
                <thead>
                  <tr>
                    <th>{t("home.col.module")}</th>
                    <th>{t("list.col.client")}</th>
                    <th>{t("list.col.declaration")}</th>
                    <th>{t("list.col.status")}</th>
                    <th>{t("list.col.createdAt")}</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading &&
                    rows.map(({ module, tx }) => (
                      <tr
                        key={`${module}-${tx.id}`}
                        className="clickable-row"
                        onClick={() => navigate(`${transactionListPath(module)}/${tx.id}`)}
                      >
                        <td>
                          <span className="badge rounded-pill text-bg-light border">{t(moduleLabel(module))}</span>
                        </td>
                        <td>{tx.clientName}</td>
                        <td className="small text-break">{tx.declarationNumber}</td>
                        <td>
                          <span className={`badge rounded-pill status-badge-pill ${stageBadgeClass(tx.transactionStage)}`}>
                            {t(`stage.${tx.transactionStage ?? "PREPARATION"}` as MessageKey)} · {tx.clearanceStatus}
                          </span>
                        </td>
                        <td className="text-nowrap small">{new Date(tx.createdAt).toLocaleString(numberLocale)}</td>
                      </tr>
                    ))}
                  {loading && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-5">
                        {t("home.loading")}
                      </td>
                    </tr>
                  )}
                  {!loading && !rows.length && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-5">
                        {t("home.empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
