import { useState, useEffect } from "react";
import { DashboardSidebar } from "./DashboardHome";
import { DashboardTopBar } from "./DashboardTopBar";
import { useI18n } from "./i18n/I18nContext";
import type { MessageKey } from "./i18n/messages";
import { AuthUser, Role, Transaction } from "./types";
import type { TransactionListModule } from "./paths";
import TransactionFilterControls from "./TransactionFilterControls";
import TransactionsTable from "./TransactionsTable";
import { apiFetch } from "./api"; // Still needed for useTransactions hook
import { useToast } from "./components/useToast";

function useTransactions(module: TransactionListModule, t: (key: MessageKey) => string, role?: Role) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState(role === "warehouse" ? "STORAGE" : "all");
  const [page, setPage] = useState(1);
  const pageSize = 30;
  const { showToast } = useToast();

  useEffect(() => {
    apiFetch(`/api/${module}`)
      .then((res) => res.json())
      .then((data) => setTransactions(data))
      .catch((err) => showToast(err.message || t(module === "transactions" ? "list.loadError" : (module === "transfers" ? "transfer.list.loadError" : "export.list.loadError") as MessageKey), "error"));
  }, [t, module]);

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
    const effectiveStageFilter = role === "warehouse" ? "STORAGE" : stageFilter;
    const matchesStage = effectiveStageFilter === "all" || (tx.transactionStage ?? "PREPARATION") === effectiveStageFilter;
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

  return {
    transactions: pagedTransactions,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    stageFilter,
    setStageFilter,
    page,
    setPage,
    totalPages,
    currentPage,
    filteredTransactionsCount: filteredTransactions.length,
    statusOptions,
    stageOptions,
  };
}

export default function TransactionListPage({
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
  const { t } = useI18n();
  const showAccounting = role === "manager" || role === "accountant";

  const {
    transactions,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    stageFilter,
    setStageFilter,
    setPage,
    totalPages,
    currentPage,
    filteredTransactionsCount,
    statusOptions,
    stageOptions,
  } = useTransactions(module, t, role);

  const moduleTitle = t((module === "transactions" ? "app.title" : module === "transfers" ? "transfer.app.title" : "export.app.title") as MessageKey);
  const moduleTagline = t((module === "transactions" ? "app.tagline" : module === "transfers" ? "transfer.app.tagline" : "export.app.tagline") as MessageKey);

  return (
    <main className="dashboard-page py-3 px-2 px-md-3">
      <DashboardTopBar user={user} title={moduleTitle} subtitle={moduleTagline} />

      <div className="dashboard-shell mx-auto">

        <TransactionFilterControls
          module={module}
          query={query}
          setQuery={setQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          stageFilter={stageFilter}
          setStageFilter={setStageFilter}
          statusOptions={statusOptions}
          stageOptions={stageOptions}
        />

        <div className="dashboard-layout-split">
          <DashboardSidebar highlight={module} user={user} role={role} onLogout={onLogout} addModule={module} />

          <TransactionsTable
            transactions={transactions}
            filteredTransactionsCount={filteredTransactionsCount}
            module={module}
            role={role}
            setPage={setPage}
            currentPage={currentPage}
            totalPages={totalPages}
            showAccounting={showAccounting}
          />
        </div>
      </div>
    </main>
  );
}
