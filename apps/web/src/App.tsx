import { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { DashboardHome, DashboardSidebar, DASHBOARD_MODULES } from "./DashboardHome";
import TransactionDetails from "./TransactionDetails";
import TransactionForm from "./TransactionForm";
import TransactionStoragePage from "./TransactionStoragePage";
import TransactionAccountingPage from "./TransactionAccountingPage";
import ClientsPage from "./ClientsPage";
import ClientDetailPage from "./ClientDetailPage";
import ShippingCompaniesPage from "./ShippingCompaniesPage";
import ShippingCompanyDetailPage from "./ShippingCompanyDetailPage";
import EmployeeSection from "./EmployeeSection";
import Login from "./Login";
import { DashboardTopBar } from "./DashboardTopBar";
import { stageBadgeClass } from "./stageBadge";
import { NotificationsProvider } from "./useNotifications";
import { apiFetch, getCurrentUser, logout } from "./api";
import { useI18n } from "./i18n/I18nContext";
import type { MessageKey } from "./i18n/messages";
import { AuthUser, Role, Transaction } from "./types";
import type { TransactionListModule } from "./paths";
import { transactionListPath } from "./paths";

function TransactionsList({
  role,
  user,
  onLogout,
  module = "transactions",
}: {
  role: Role;
  user: AuthUser;
  onLogout: () => void;
  module?: TransactionListModule;
}) {
  const { t, numberLocale } = useI18n();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const pageSize = 30;
  const showAccounting = role === "manager" || role === "accountant";

  useEffect(() => {
    apiFetch(`/api/${module}`)
      .then((res) => res.json())
      .then((data) => setTransactions(data))
      .catch(() => setError(t(module === "transactions" ? "list.loadError" : (module === "transfers" ? "transfer.list.loadError" : "export.list.loadError") as MessageKey)));
  }, [role, t, module]);

  const filteredTransactions = transactions.filter((tx) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      tx.clientName.toLowerCase().includes(q) ||
      tx.shippingCompanyName.toLowerCase().includes(q) ||
      tx.declarationNumber.toLowerCase().includes(q) ||
      (tx.declarationNumber2 ?? "").toLowerCase().includes(q) ||
      tx.airwayBill.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || tx.clearanceStatus === statusFilter;
    const matchesStage = stageFilter === "all" || (tx.transactionStage ?? "PREPARATION") === stageFilter;
    return matchesQuery && matchesStatus && matchesStage;
  });

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, stageFilter]);

  const statusOptions = Array.from(new Set(transactions.map((tx) => tx.clearanceStatus)));
  const stageOptions = Array.from(new Set(transactions.map((tx) => tx.transactionStage ?? "PREPARATION")));
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const moduleTitle = t((module === "transactions" ? "app.title" : module === "transfers" ? "transfer.app.title" : "export.app.title") as MessageKey);
  const moduleTagline = t((module === "transactions" ? "app.tagline" : module === "transfers" ? "transfer.app.tagline" : "export.app.tagline") as MessageKey);

  return (
    <main className="dashboard-page py-3 px-2 px-md-3">
      <DashboardTopBar user={user} title={moduleTitle} subtitle={moduleTagline} />

      <div className="dashboard-shell mx-auto">
        {error ? <p className="error alert alert-danger mb-3">{error}</p> : null}

        <section className="dashboard-top-tools card shadow-sm border-0 mb-3 p-3 p-md-4">
          <h2 className="h6 small text-uppercase text-secondary fw-semibold mb-3 dashboard-tools-heading">{t("dashboard.toolsHeading" as MessageKey)}</h2>
          <div className="module-cards dashboard-top-module-cards">
            {DASHBOARD_MODULES.map((item) => (
              <Link
                key={item.id}
                to={item.route}
                className={`module-card card text-decoration-none ${module === item.id ? "module-card-active" : ""}`}
              >
                <span className="module-card-icon" aria-hidden>
                  {item.id === "transactions" ? "📦" : item.id === "transfers" ? "↔" : "🚢"}
                </span>
                <span className="module-card-title">{t(item.titleKey)}</span>
                <span className="module-card-desc">{t(item.descKey)}</span>
              </Link>
            ))}
          </div>
          <hr className="my-3 text-secondary opacity-25" />
          <div className="row g-2 g-lg-3">
            <div className="col-12 col-lg-6">
              <label className="form-label small text-secondary mb-1 d-none d-md-block">{t("list.searchPlaceholder")}</label>
              <input
                className="form-control"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("list.searchPlaceholder")}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label small text-secondary mb-1 d-none d-md-block">{t("list.filterAllStatuses")}</label>
              <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">{t("list.filterAllStatuses")}</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label small text-secondary mb-1 d-none d-md-block">{t("list.filterAllStages")}</label>
              <select className="form-select" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                <option value="all">{t("list.filterAllStages")}</option>
                {stageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {t(`stage.${stage}` as MessageKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="dashboard-layout-split">
          <DashboardSidebar highlight={module} user={user} role={role} onLogout={onLogout} addModule={module} />

          <section className="dashboard-list-column card shadow-sm border-0">
            <div className="dashboard-list-toolbar d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-body-tertiary">
              <span className="small fw-semibold text-secondary text-truncate me-2">{moduleTitle}</span>
              <span className="badge rounded-pill text-bg-primary">{filteredTransactions.length}</span>
            </div>
            <div className="dashboard-table-scroll">
              <table className="table table-hover align-middle mb-0 sticky-table-head">
                <thead>
                  <tr>
                    <th>{t("list.col.client")}</th>
                    <th>{t("list.col.shippingCompany")}</th>
                    <th>{t("list.col.status")}</th>
                    <th>{t("list.col.storage" as MessageKey)}</th>
                    {showAccounting ? <th>{t("list.col.accounting" as MessageKey)}</th> : null}
                    <th>{t("list.col.createdAt")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTransactions.map((tx) => (
                    <tr key={tx.id} className="clickable-row" onClick={() => navigate(`${transactionListPath(module)}/${tx.id}`)}>
                      <td>{tx.clientName}</td>
                      <td>{tx.shippingCompanyName}</td>
                      <td>
                        <span className={`badge rounded-pill status-badge-pill ${stageBadgeClass(tx.transactionStage)}`}>
                          {t(`stage.${tx.transactionStage ?? "PREPARATION"}` as MessageKey)} · {tx.clearanceStatus}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {tx.transactionStage === "STORAGE" && (module === "transactions" || module === "transfers") ? (
                          <Link to={`${transactionListPath(module)}/${tx.id}/storage`} className="btn btn-sm btn-outline-primary">
                            {t("storagePage.openCard" as MessageKey)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      {showAccounting ? (
                        <td onClick={(e) => e.stopPropagation()}>
                          <Link to={`${transactionListPath(module)}/${tx.id}/accounting`} className="btn btn-sm btn-outline-primary">
                            {t("accountingPage.openCard" as MessageKey)}
                          </Link>
                        </td>
                      ) : null}
                      <td className="text-nowrap small">{new Date(tx.createdAt).toLocaleString(numberLocale)}</td>
                    </tr>
                  ))}
                  {!filteredTransactions.length && (
                    <tr>
                      <td colSpan={showAccounting ? 6 : 5} className="text-center text-muted py-5">
                        {t("list.noResults")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredTransactions.length > 0 ? (
              <div className="dashboard-list-footer border-top px-3 py-2 bg-body-tertiary">
                <div className="d-flex flex-wrap gap-2 align-items-center justify-content-center">
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>
                    {t("list.paginationPrev")}
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      type="button"
                      key={p}
                      className={p === currentPage ? "btn btn-sm btn-primary" : "btn btn-sm btn-outline-secondary"}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    {t("list.paginationNext")}
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser());

  useEffect(() => {
    const onLogoutEvent = () => setUser(null);
    window.addEventListener("auth:logout", onLogoutEvent);
    return () => window.removeEventListener("auth:logout", onLogoutEvent);
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  return !user ? (
    <Login onLogin={setUser} />
  ) : (
    <NotificationsProvider>
      <AuthenticatedRoutes user={user} onLogout={handleLogout} />
    </NotificationsProvider>
  );
}

function NotFoundPage() {
  const { t } = useI18n();
  return (
    <main className="empty-state-page container py-5">
      <div className="empty-state-card card shadow-sm border-0 text-center mx-auto">
        <div className="card-body py-5 px-4">
          <div className="empty-state-icon mb-3" aria-hidden>
            404
          </div>
          <h1 className="h3 fw-bold mb-2">{t("notFound.title")}</h1>
          <Link to="/" className="btn btn-primary mt-2">
            {t("notFound.dashboard")}
          </Link>
        </div>
      </div>
    </main>
  );
}

function AuthenticatedRoutes({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const role = user.role;
  return (
    <Routes>
      <Route path="/" element={<DashboardHome user={user} role={role} onLogout={onLogout} />} />
      <Route path="/transactions" element={<TransactionsList role={role} user={user} onLogout={onLogout} module="transactions" />} />
      <Route path="/transfers" element={<TransactionsList role={role} user={user} onLogout={onLogout} module="transfers" />} />
      <Route path="/exports" element={<TransactionsList role={role} user={user} onLogout={onLogout} module="exports" />} />
      <Route path="/employees" element={<EmployeeSection role={role} />} />
      <Route path="/clients" element={<ClientsPage role={role} />} />
      <Route path="/clients/:id" element={<ClientDetailPage />} />
      <Route path="/shipping-companies" element={<ShippingCompaniesPage role={role} />} />
      <Route path="/shipping-companies/:id" element={<ShippingCompanyDetailPage />} />
      <Route path="/transactions/new" element={<TransactionForm role={role} module="transactions" />} />
      <Route path="/transactions/:id/edit" element={<TransactionForm role={role} module="transactions" />} />
      <Route path="/transactions/:id" element={<TransactionDetails role={role} module="transactions" />} />
      <Route path="/transactions/:id/storage" element={<TransactionStoragePage role={role} module="transactions" />} />
      <Route path="/transactions/:id/accounting" element={<TransactionAccountingPage role={role} module="transactions" />} />
      <Route path="/transfers/new" element={<TransactionForm role={role} module="transfers" />} />
      <Route path="/transfers/:id/edit" element={<TransactionForm role={role} module="transfers" />} />
      <Route path="/transfers/:id" element={<TransactionDetails role={role} module="transfers" />} />
      <Route path="/transfers/:id/storage" element={<TransactionStoragePage role={role} module="transfers" />} />
      <Route path="/transfers/:id/accounting" element={<TransactionAccountingPage role={role} module="transfers" />} />
      <Route path="/exports/new" element={<TransactionForm role={role} module="exports" />} />
      <Route path="/exports/:id/edit" element={<TransactionForm role={role} module="exports" />} />
      <Route path="/exports/:id" element={<TransactionDetails role={role} module="exports" />} />
      <Route path="/exports/:id/accounting" element={<TransactionAccountingPage role={role} module="exports" />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
