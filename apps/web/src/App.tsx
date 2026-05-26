import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { DashboardHome, DashboardSidebar } from "./DashboardHome";
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
import TransactionListPage from "./TransactionListPage";
import { NotificationsProvider } from "./useNotifications";
import { getCurrentUser, logout } from "./api";
import { useI18n } from "./i18n/I18nContext";
import type { MessageKey } from "./i18n/messages";
import { AuthUser, Role } from "./types";


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
      <Route path="/transactions" element={<TransactionListPage role={role} user={user} onLogout={onLogout} module="transactions" />} />
      <Route path="/transfers" element={<TransactionListPage role={role} user={user} onLogout={onLogout} module="transfers" />} />
      <Route path="/exports" element={<TransactionListPage role={role} user={user} onLogout={onLogout} module="exports" />} />
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
