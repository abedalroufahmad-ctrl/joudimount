import { Link } from "react-router-dom";
import { useI18n } from "./i18n/I18nContext";
import type { MessageKey } from "./i18n/messages";
import type { TransactionListModule } from "./paths";
import { DASHBOARD_MODULES } from "./DashboardHome";

interface TransactionFilterControlsProps {
  module: TransactionListModule;
  query: string;
  setQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  stageFilter: string;
  setStageFilter: (stage: string) => void;
  statusOptions: string[];
  stageOptions: string[];
}

export default function TransactionFilterControls({
  module,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  stageFilter,
  setStageFilter,
  statusOptions,
  stageOptions,
}: TransactionFilterControlsProps) {
  const { t } = useI18n();

  return (
    <section className="dashboard-top-tools card shadow-sm border-0 mb-3 p-3 p-md-4">
      <h2 className="h6 small text-uppercase text-secondary fw-semibold mb-3 dashboard-tools-heading">
        {t("dashboard.toolsHeading" as MessageKey)}
      </h2>
      <div className="module-cards dashboard-top-module-cards">
        {DASHBOARD_MODULES.map((item) => (
          <Link
            key={item.id}
            to={item.route}
            className={`module-card card text-decoration-none ${
              module === item.id ? "module-card-active" : ""
            }`}
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
          <label className="form-label small text-secondary mb-1 d-none d-md-block">
            {t("list.searchPlaceholder")}
          </label>
          <input
            className="form-control"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("list.searchPlaceholder")}
          />
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <label className="form-label small text-secondary mb-1 d-none d-md-block">
            {t("list.filterAllStatuses")}
          </label>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{t("list.filterAllStatuses")}</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          <label className="form-label small text-secondary mb-1 d-none d-md-block">
            {t("list.filterAllStages")}
          </label>
          <select
            className="form-select"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
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
  );
}
