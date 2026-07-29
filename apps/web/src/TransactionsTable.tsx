import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "./i18n/I18nContext";
import type { MessageKey } from "./i18n/messages";
import { AuthUser, Role, Transaction } from "./types";
import type { TransactionListModule } from "./paths";
import { transactionListPath } from "./paths";
import { stageBadgeClass } from "./stageBadge";

interface TransactionsTableProps {
  transactions: Transaction[];
  filteredTransactionsCount: number;
  module: TransactionListModule;
  role: Role;
  setPage: (page: number) => void;
  currentPage: number;
  totalPages: number;
  showAccounting: boolean;
}

export default function TransactionsTable({
  transactions,
  filteredTransactionsCount,
  module,
  role,
  setPage,
  currentPage,
  totalPages,
  showAccounting,
}: TransactionsTableProps) {
  const { t, numberLocale } = useI18n();
  const navigate = useNavigate();

  return (
    <section className="dashboard-list-column card shadow-sm border-0">
      <div className="dashboard-list-toolbar d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-body-tertiary">
        <span className="small fw-semibold text-secondary text-truncate me-2">
          {t(
            (module === "transactions"
              ? "app.title"
              : module === "transfers"
              ? "transfer.app.title"
              : "export.app.title") as MessageKey
          )}
        </span>
        <span className="badge rounded-pill text-bg-primary">{filteredTransactionsCount}</span>
      </div>
      <div className="dashboard-table-scroll">
        <table className="table table-hover align-middle mb-0 sticky-table-head">
          <thead>
            <tr>
              <th>{t("list.col.client")}</th>
              <th>{t("list.col.shippingCompany")}</th>
              <th>{t("list.col.status")}</th>
              <th>{t("form.numberOfUnits" as MessageKey)}</th>
              <th>{t("list.col.storage" as MessageKey)}</th>
              {showAccounting ? <th>{t("list.col.accounting" as MessageKey)}</th> : null}
              <th>{t("list.col.createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="clickable-row"
                onClick={() => navigate(`${transactionListPath(module)}/${tx.id}`)}
              >
                <td>{tx.clientName}</td>
                <td>{tx.shippingCompanyName}</td>
                <td>
                  <span
                    className={`badge rounded-pill status-badge-pill ${stageBadgeClass(
                      tx.transactionStage
                    )}`}
                  >
                    {t(`stage.${tx.transactionStage ?? "PREPARATION"}` as MessageKey)} ·
                    {tx.clearanceStatus}
                  </span>
                </td>
                <td>{tx.unitCount || "—"}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {tx.transactionStage === "STORAGE" &&
                  (module === "transactions" || module === "transfers") ? (
                    <Link
                      to={`${transactionListPath(module)}/${tx.id}/storage`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      {t("storagePage.openCard" as MessageKey)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                {showAccounting ? (
                  <td onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`${transactionListPath(module)}/${tx.id}/accounting`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      {t("accountingPage.openCard" as MessageKey)}
                    </Link>
                  </td>
                ) : null}
                <td className="text-nowrap small">
                  {new Date(tx.createdAt).toLocaleString(numberLocale)}
                </td>
              </tr>
            ))}
            {!filteredTransactionsCount && (
              <tr>
                <td
                  colSpan={showAccounting ? 6 : 5}
                  className="text-center text-muted py-5"
                >
                  {t("list.noResults")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filteredTransactionsCount > 0 ? (
        <div className="dashboard-list-footer border-top px-3 py-2 bg-body-tertiary">
          <div className="d-flex flex-wrap gap-2 align-items-center justify-content-center">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
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
  );
}
