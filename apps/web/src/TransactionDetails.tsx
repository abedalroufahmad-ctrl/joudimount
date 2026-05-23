import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { transactionListPath } from "./paths";
import { apiFetch } from "./api";
import type { MessageKey } from "./i18n/messages";
import { useI18n } from "./i18n/I18nContext";
import ShippingPaperModal from "./ShippingPaperModal";
import { stageBadgeClass } from "./stageBadge";
import { API_BASE, DocumentAttachment, Role, Transaction } from "./types";

const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  bill_of_lading: "docCategory.bill_of_lading",
  certificate_of_origin: "docCategory.certificate_of_origin",
  invoice: "docCategory.invoice",
  packing_list: "docCategory.packing_list",
};

function categoryLabel(category: string | undefined, t: (key: MessageKey) => string): string {
  if (!category) return t("docCategory.uncategorized");
  const key = DOCUMENT_CATEGORY_LABELS[category] as MessageKey | undefined;
  return key ? t(key) : category;
}

function stageLabel(stage: string | undefined, t: (key: MessageKey) => string): string {
  switch (stage) {
    case "PREPARATION":
      return t("stage.PREPARATION");
    case "CUSTOMS_CLEARANCE":
      return t("stage.CUSTOMS_CLEARANCE");
    case "TRANSPORTATION":
      return t("stage.TRANSPORTATION" as MessageKey);
    case "STORAGE":
      return t("stage.STORAGE");
    default:
      return stage || t("stage.PREPARATION");
  }
}

function declarationTypeLabel(value: string | undefined, t: (key: MessageKey) => string): string {
  const map: Record<string, MessageKey> = {
    Import: "form.declarationType.import",
    "Import to Free Zone": "form.declarationType.import_free_zone",
    "Import for Re-Export": "form.declarationType.import_re_export",
    "Temporary Import": "form.declarationType.temporary_import",
    Transfer: "form.declarationType.transfer",
    Export: "form.declarationType.export",
    "Transit out": "form.declarationType.transit_out",
    "Export to GCC": "form.declarationType.export_gcc",
    Transitin: "form.declarationType.transitin",
    "Transitin from GCC": "form.declarationType.transitin_gcc",
  };
  if (!value) return "";
  const key = map[value];
  return key ? t(key) : value;
}

function portTypeLabel(value: string | undefined, t: (key: MessageKey) => string): string {
  const map: Record<string, MessageKey> = {
    Seaports: "form.portType.seaports",
    "Free Zones": "form.portType.free_zones",
    Mainland: "form.portType.mainland",
  };
  if (!value) return "";
  const key = map[value];
  return key ? t(key) : value;
}

type TransactionModule = "transactions" | "transfers" | "exports";

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="details-section-card card shadow-sm border-0 mb-3">
      <div className="card-body">
        <h2 className="form-section-title h5 border-bottom pb-2 mb-3 mt-0">{title}</h2>
        <div className="row row-cols-1 row-cols-md-2 g-3">{children}</div>
      </div>
    </section>
  );
}

function DetailField({ label, children, fullWidth }: { label: string; children: ReactNode; fullWidth?: boolean }) {
  return (
    <p className={`details-item mb-0${fullWidth ? " col-12" : ""}`}>
      <strong>{label}:</strong> {children}
    </p>
  );
}

export default function TransactionDetails({
  role,
  module = "transactions",
}: {
  role: Role;
  module?: TransactionModule;
}) {
  const { t, numberLocale } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [shippingPaperOpen, setShippingPaperOpen] = useState(false);
  const groupedAttachments = (transaction?.documentAttachments ?? []).reduce<Record<string, DocumentAttachment[]>>(
    (acc, item) => {
      const key = categoryLabel(item.category, t);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {},
  );
  const showCustomsDeclarationSection = transaction?.transactionStage !== "PREPARATION";

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/${module}/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("not-found");
        return res.json();
      })
      .then((data) => setTransaction(data))
      .catch(() => setError(t("details.loadError")));
  }, [id, t, module]);

  const onDelete = async () => {
    if (!id) return;
    if (!window.confirm(t("details.deleteConfirm"))) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/${module}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete-failed");
      navigate(transactionListPath(module));
    } catch {
      setError(t("details.deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  const onPostAction = async (action: "pay" | "release" | "original-bl") => {
    if (!id) return;
    setProcessing(true);
    setError("");
    try {
      const res = await apiFetch(`/api/${module}/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "failed");
      }
      const data = await res.json();
      setTransaction(data);
    } catch (eventError) {
      const message = eventError instanceof Error ? eventError.message : "";
      setError(message && message !== "failed" ? message : t("details.actionError"));
    } finally {
      setProcessing(false);
    }
  };

  const pageTitle =
    module === "transactions"
      ? t("details.title")
      : module === "transfers"
        ? t("transfer.details.title" as MessageKey)
        : t("export.details.title" as MessageKey);

  return (
    <main className="container page-content py-3">
      <div className="page-actions btn-toolbar gap-2 flex-wrap" role="toolbar">
        <Link to={transactionListPath(module)} className="btn btn-outline-secondary btn-sm">
          ← {t("details.back")}
        </Link>
        {id && role !== "accountant" ? (
          <>
            <Link to={`/${module}/${id}/edit`} className="btn btn-outline-primary btn-sm">
              {t("details.edit")}
            </Link>
            <button className="btn btn-outline-danger btn-sm" onClick={onDelete} disabled={deleting}>
              {deleting ? t("details.deleting") : t("details.delete")}
            </button>
          </>
        ) : null}
        {id && (role === "manager" || role === "accountant") ? (
          <>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onPostAction("pay")}
              disabled={processing || transaction?.paymentStatus === "paid"}
            >
              {t("details.markPaid")}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onPostAction("release")}
              disabled={
                processing ||
                transaction?.paymentStatus !== "paid" ||
                (transaction?.documentStatus !== "original_received" && transaction?.documentStatus !== "telex_release")
              }
            >
              {t("details.release")}
            </button>
          </>
        ) : null}
        {id && module === "transactions" && (role === "manager" || role === "employee") ? (
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => onPostAction("original-bl")}
            disabled={processing}
          >
            {t("details.originalBl")}
          </button>
        ) : null}
        {transaction ? (
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setShippingPaperOpen(true)}>
            {t("details.shippingPaperButton")}
          </button>
        ) : null}
      </div>

      {error ? <p className="error alert alert-danger">{error}</p> : null}
      {!transaction && !error ? (
        <div className="empty-state-card card shadow-sm border-0 text-center py-5">
          <p className="text-muted mb-0">{t("details.loading")}</p>
        </div>
      ) : null}

      {transaction && (
        <>
          <div className="details-hero card border-0 shadow-sm mb-3">
            <div className="card-body d-flex flex-wrap align-items-start justify-content-between gap-3">
              <div>
                <h1 className="details-hero-title h4 fw-bold mb-1">{pageTitle}</h1>
                <p className="details-hero-meta mb-0 text-break">
                  <strong>{transaction.clientName}</strong>
                  <span className="mx-2 opacity-50">·</span>
                  {transaction.declarationNumber}
                </p>
              </div>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <span className={`badge rounded-pill ${stageBadgeClass(transaction.transactionStage)}`}>
                  {stageLabel(transaction.transactionStage, t)}
                </span>
                <span className="badge rounded-pill text-bg-light border">{transaction.clearanceStatus}</span>
              </div>
            </div>
          </div>
        <DetailSection title={t("form.snapshotReadOnly")}>
          <DetailField label={t("details.createdAt")}>
            {new Date(transaction.createdAt).toLocaleString(numberLocale)}
          </DetailField>
          <DetailField label={t("form.declarationNumber1")}>{transaction.declarationNumber}</DetailField>
          {transaction.declarationNumber2 ? (
            <DetailField label={t("form.declarationNumber2")}>{transaction.declarationNumber2}</DetailField>
          ) : null}
          {transaction.fileNumber ? (
            <DetailField label={t("form.fileNumber")}>{transaction.fileNumber}</DetailField>
          ) : null}
          <DetailField label={t("details.status")}>{transaction.clearanceStatus}</DetailField>
          <DetailField label={t("form.stage")}>{stageLabel(transaction.transactionStage, t)}</DetailField>
          {transaction.transactionStage === "STORAGE" && (module === "transactions" || module === "transfers") ? (
            <p className="details-item col-12 mb-0">
              <Link className="btn btn-primary btn-sm" to={`/${module}/${transaction.id}/storage`}>
                {t("details.linkStorage" as MessageKey)}
              </Link>
            </p>
          ) : null}
          {transaction.releaseCode ? (
            <DetailField label={t("details.releaseCode")} fullWidth>
              {transaction.releaseCode}
            </DetailField>
          ) : null}
        </DetailSection>

        <DetailSection title={t("form.partiesSection")}>
          <DetailField label={t("details.client")}>{transaction.clientName}</DetailField>
          <DetailField label={t("details.shippingCompany")}>{transaction.shippingCompanyName}</DetailField>
          {transaction.shippingCompanyId ? (
            <DetailField label={t("form.shippingCompanyId")}>{transaction.shippingCompanyId}</DetailField>
          ) : null}
        </DetailSection>

        {showCustomsDeclarationSection ? (
          <DetailSection title={t("form.customsDeclarationSection")}>
            <DetailField label={t("form.declarationNumber1")}>{transaction.declarationNumber}</DetailField>
            {transaction.declarationNumber2 ? (
              <DetailField label={t("form.declarationNumber2")}>{transaction.declarationNumber2}</DetailField>
            ) : null}
            {transaction.declarationDate ? (
              <DetailField label={t("form.declarationDate")}>
                {new Date(transaction.declarationDate).toLocaleString(numberLocale)}
              </DetailField>
            ) : null}
            {transaction.declarationType ? (
              <DetailField label={t("form.declarationType1")}>
                {declarationTypeLabel(transaction.declarationType, t)}
              </DetailField>
            ) : null}
            {transaction.declarationType2 ? (
              <DetailField label={t("form.declarationType2")}>
                {declarationTypeLabel(transaction.declarationType2, t)}
              </DetailField>
            ) : null}
            {transaction.portType ? (
              <DetailField label={t("form.portType")}>{portTypeLabel(transaction.portType, t)}</DetailField>
            ) : null}
          </DetailSection>
        ) : null}

        {(transaction.portOfLading || transaction.portOfDischarge || transaction.destination) ? (
          <DetailSection title={t("transfer.details.title" as MessageKey)}>
            {transaction.portOfLading ? (
              <DetailField label={t("form.portOfLading")}>{transaction.portOfLading}</DetailField>
            ) : null}
            {transaction.portOfDischarge ? (
              <DetailField label={t("form.portOfDischarge")}>{transaction.portOfDischarge}</DetailField>
            ) : null}
            {transaction.destination ? (
              <DetailField label={t("form.destination")}>{transaction.destination}</DetailField>
            ) : null}
          </DetailSection>
        ) : null}

        <DetailSection title={t("form.shipmentCoreSection")}>
          <DetailField label={t("details.airwayBill")}>{transaction.airwayBill}</DetailField>
          <DetailField label={t("details.hsCode")}>{transaction.hsCode}</DetailField>
          <DetailField label={t("details.goods")}>{transaction.goodsDescription}</DetailField>
          <DetailField label={t("details.origin")}>{transaction.originCountry}</DetailField>
          <DetailField label={t("form.invoiceValue")}>
            {transaction.invoiceValue.toLocaleString(numberLocale)} {transaction.invoiceCurrency ?? t("details.currencySuffix")}
          </DetailField>
        </DetailSection>

        <DetailSection title={t("form.cargoContainersSection")}>
          {transaction.orderDate ? (
            <DetailField label={t("form.orderDate")}>
              {new Date(transaction.orderDate).toLocaleString(numberLocale)}
            </DetailField>
          ) : null}
          {transaction.containerSize ? (
            <DetailField label={t("form.containerSize")}>{transaction.containerSize}</DetailField>
          ) : null}
          {transaction.containerCount != null ? (
            <DetailField label={t("details.containerCount")}>{transaction.containerCount}</DetailField>
          ) : null}
          {transaction.goodsWeightKg != null ? (
            <DetailField label={t("details.goodsWeightKg")}>
              {transaction.goodsWeightKg.toLocaleString(numberLocale)}
            </DetailField>
          ) : null}
          {transaction.invoiceToWeightRateAedPerKg != null ? (
            <DetailField label={t("details.invoiceToWeightRate")}>
              {transaction.invoiceToWeightRateAedPerKg.toLocaleString(numberLocale)}
            </DetailField>
          ) : null}
          {transaction.containerArrivalDate ? (
            <DetailField label={t("details.containerArrivalDate")}>
              {new Date(transaction.containerArrivalDate).toLocaleString(numberLocale)}
            </DetailField>
          ) : null}
          {transaction.documentArrivalDate ? (
            <DetailField label={t("details.documentArrivalDate")}>
              {new Date(transaction.documentArrivalDate).toLocaleString(numberLocale)}
            </DetailField>
          ) : null}
          {transaction.containerNumbers && transaction.containerNumbers.length > 0 ? (
            <DetailField label={t("form.containerNumbers")}>{transaction.containerNumbers.join(", ")}</DetailField>
          ) : null}
          {transaction.unitCount != null ? (
            <DetailField label={t("form.numberOfUnits")}>{transaction.unitCount}</DetailField>
          ) : null}
          {transaction.unitNumber != null ? (
            <DetailField label={t("form.unitNumber")}>{transaction.unitNumber}</DetailField>
          ) : null}
        </DetailSection>

        {transaction.transactionStage === "TRANSPORTATION" &&
        (transaction.transportationTo ||
          transaction.trachNo ||
          transaction.transportationCompany ||
          transaction.transportationFrom ||
          transaction.transportationToLocation ||
          transaction.tripCharge != null ||
          transaction.waitingCharge != null ||
          transaction.maccrikCharge != null) ? (
          <DetailSection title={t("transportation.sectionTitle" as MessageKey)}>
            {transaction.transportationTo ? (
              <DetailField label={t("transportation.toUpper" as MessageKey)}>{transaction.transportationTo}</DetailField>
            ) : null}
            {transaction.trachNo ? (
              <DetailField label={t("transportation.trachNo" as MessageKey)}>{transaction.trachNo}</DetailField>
            ) : null}
            {transaction.transportationCompany ? (
              <DetailField label={t("transportation.company" as MessageKey)}>{transaction.transportationCompany}</DetailField>
            ) : null}
            {transaction.transportationFrom ? (
              <DetailField label={t("transportation.from" as MessageKey)}>{transaction.transportationFrom}</DetailField>
            ) : null}
            {transaction.transportationToLocation ? (
              <DetailField label={t("transportation.to" as MessageKey)}>{transaction.transportationToLocation}</DetailField>
            ) : null}
            {transaction.tripCharge != null ? (
              <DetailField label={t("transportation.tripCharge" as MessageKey)}>
                {transaction.tripCharge.toLocaleString(numberLocale)}
              </DetailField>
            ) : null}
            {transaction.waitingCharge != null ? (
              <DetailField label={t("transportation.waitingCharge" as MessageKey)}>
                {transaction.waitingCharge.toLocaleString(numberLocale)}
              </DetailField>
            ) : null}
            {transaction.maccrikCharge != null ? (
              <DetailField label={t("transportation.maccrikCharge" as MessageKey)}>
                {transaction.maccrikCharge.toLocaleString(numberLocale)}
              </DetailField>
            ) : null}
          </DetailSection>
        ) : null}

        <DetailSection title={t("form.workflowStatusSection")}>
          {transaction.documentPostalNumber ? (
            <DetailField label={t("details.documentPostalNumber")}>{transaction.documentPostalNumber}</DetailField>
          ) : null}
          <DetailField label={t("details.document")}>{transaction.documentStatus}</DetailField>
          <DetailField label={t("details.payment")}>{transaction.paymentStatus}</DetailField>
          <DetailField label={t("form.stopTransaction")}>
            {transaction.isStopped ? t("form.yes") : t("form.no")}
          </DetailField>
          {transaction.isStopped && transaction.stopReason ? (
            <DetailField label={t("form.stopReason")}>{transaction.stopReason}</DetailField>
          ) : null}
          {transaction.goodsQuantity != null ? (
            <DetailField label={t("details.goodsQuantity")}>
              {transaction.goodsQuantity.toLocaleString(numberLocale)}
            </DetailField>
          ) : null}
          {transaction.goodsQuality ? (
            <DetailField label={t("details.goodsQuality")}>
              {t(`form.quality.${transaction.goodsQuality}` as MessageKey)}
            </DetailField>
          ) : null}
          {transaction.goodsUnit ? (
            <DetailField label={t("details.goodsUnit")}>{t(`form.unit.${transaction.goodsUnit}` as MessageKey)}</DetailField>
          ) : null}
        </DetailSection>

        {transaction.documentAttachments && transaction.documentAttachments.length > 0 ? (
          <section className="details-section-card card shadow-sm border-0 mb-3">
            <div className="card-body">
              <h2 className="form-section-title h5 border-bottom pb-2 mb-3 mt-0">{t("details.documentPhotos")}</h2>
              {Object.entries(groupedAttachments).map(([group, items]) => (
                <div key={group} className="mb-3">
                  <p className="mb-2 fw-semibold text-secondary">{group}</p>
                  <ul className="attachment-grid mb-0">
                    {items.map((a) => {
                      const href = `${API_BASE}${a.path}`;
                      const isImg = /\.(png|jpe?g|gif|webp)$/i.test(a.originalName);
                      return (
                        <li key={a.path} className="attachment-tile">
                          {isImg ? (
                            <a href={href} target="_blank" rel="noreferrer">
                              <img src={href} alt="" className="attachment-thumb" />
                            </a>
                          ) : null}
                          <a href={href} target="_blank" rel="noreferrer">
                            {a.originalName} ({t("details.openAttachment")})
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        </>
      )}
      <ShippingPaperModal open={shippingPaperOpen} transaction={transaction} onClose={() => setShippingPaperOpen(false)} />
    </main>
  );
}
