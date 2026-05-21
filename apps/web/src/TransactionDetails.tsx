import { useEffect, useState } from "react";
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

  const onAccountingAction = async (action: "pay" | "release") => {
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
              onClick={() => onAccountingAction("pay")}
              disabled={processing || transaction?.paymentStatus === "paid"}
            >
              {t("details.markPaid")}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onAccountingAction("release")}
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
        <section className="details-card card shadow-sm border-0">
          <div className="card-body">
          <div className="row row-cols-1 row-cols-md-2 g-3">
          <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-2 mb-0">{t("form.snapshotReadOnly")}</h2>
          <p className="details-item">
            <strong>{t("details.createdAt")}:</strong> {new Date(transaction.createdAt).toLocaleString(numberLocale)}
          </p>
          <p className="details-item">
            <strong>{t("form.declarationNumber1")}:</strong> {transaction.declarationNumber}
          </p>
          {transaction.declarationNumber2 ? (
            <p className="details-item">
              <strong>{t("form.declarationNumber2")}:</strong> {transaction.declarationNumber2}
            </p>
          ) : null}
          <p className="details-item">
            <strong>{t("details.status")}:</strong> {transaction.clearanceStatus}
          </p>
          <p className="details-item">
            <strong>{t("form.stage")}:</strong> {stageLabel(transaction.transactionStage, t)}
          </p>
          {transaction.transactionStage === "STORAGE" && (module === "transactions" || module === "transfers") ? (
            <p className="details-item col-12">
              <Link className="btn btn-primary btn-sm" style={{ display: "inline-block" }} to={`/${module}/${transaction.id}/storage`}>
                {t("details.linkStorage" as MessageKey)}
              </Link>
            </p>
          ) : null}
          {transaction.releaseCode ? (
            <p className="details-item col-12">
              <strong>{t("details.releaseCode")}:</strong> {transaction.releaseCode}
            </p>
          ) : null}

          <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-2 mb-0">{t("form.partiesSection")}</h2>
          <p className="details-item">
            <strong>{t("details.client")}:</strong> {transaction.clientName}
          </p>
          <p className="details-item">
            <strong>{t("details.shippingCompany")}:</strong> {transaction.shippingCompanyName}
          </p>
          {transaction.shippingCompanyId ? (
            <p className="details-item">
              <strong>{t("form.shippingCompanyId")}:</strong> {transaction.shippingCompanyId}
            </p>
          ) : null}

          {showCustomsDeclarationSection ? (
            <>
              <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-2 mb-0">{t("form.customsDeclarationSection")}</h2>
              <p className="details-item">
                  <strong>{t("form.declarationNumber1")}:</strong> {transaction.declarationNumber}
              </p>
              {transaction.declarationNumber2 ? (
                <p className="details-item">
                    <strong>{t("form.declarationNumber2")}:</strong> {transaction.declarationNumber2}
                </p>
              ) : null}
              {transaction.declarationDate ? (
                <p className="details-item">
                  <strong>{t("form.declarationDate")}:</strong> {new Date(transaction.declarationDate).toLocaleString(numberLocale)}
                </p>
              ) : null}
              {transaction.declarationType ? (
                <p className="details-item">
                  <strong>{t("form.declarationType1")}:</strong> {declarationTypeLabel(transaction.declarationType, t)}
                </p>
              ) : null}
              {transaction.declarationType2 ? (
                <p className="details-item">
                  <strong>{t("form.declarationType2")}:</strong> {declarationTypeLabel(transaction.declarationType2, t)}
                </p>
              ) : null}
              {transaction.portType ? (
                <p className="details-item">
                  <strong>{t("form.portType")}:</strong> {portTypeLabel(transaction.portType, t)}
                </p>
              ) : null}
            </>
          ) : null}

          {(transaction.portOfLading || transaction.portOfDischarge || transaction.destination) ? (
            <>
              <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-2 mb-0">{t("transfer.details.title" as MessageKey)}</h2>
              {transaction.portOfLading ? (
                <p className="details-item">
                  <strong>{t("form.portOfLading")}:</strong> {transaction.portOfLading}
                </p>
              ) : null}
              {transaction.portOfDischarge ? (
                <p className="details-item">
                  <strong>{t("form.portOfDischarge")}:</strong> {transaction.portOfDischarge}
                </p>
              ) : null}
              {transaction.destination ? (
                <p className="details-item">
                  <strong>{t("form.destination")}:</strong> {transaction.destination}
                </p>
              ) : null}
            </>
          ) : null}

          <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-2 mb-0">{t("form.shipmentCoreSection")}</h2>
          <p className="details-item">
            <strong>{t("details.airwayBill")}:</strong> {transaction.airwayBill}
          </p>
          <p className="details-item">
            <strong>{t("details.hsCode")}:</strong> {transaction.hsCode}
          </p>
          <p className="details-item">
            <strong>{t("details.goods")}:</strong> {transaction.goodsDescription}
          </p>
          <p className="details-item">
            <strong>{t("details.origin")}:</strong> {transaction.originCountry}
          </p>
          <p className="details-item">
            <strong>{t("form.invoiceValue")}:</strong> {transaction.invoiceValue.toLocaleString(numberLocale)}{" "}
            {transaction.invoiceCurrency ?? t("details.currencySuffix")}
          </p>

          <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-2 mb-0">{t("form.cargoContainersSection")}</h2>
          {transaction.containerCount != null ? (
            <p className="details-item">
              <strong>{t("details.containerCount")}:</strong> {transaction.containerCount}
            </p>
          ) : null}
          {transaction.goodsWeightKg != null ? (
            <p className="details-item">
              <strong>{t("details.goodsWeightKg")}:</strong> {transaction.goodsWeightKg.toLocaleString(numberLocale)}
            </p>
          ) : null}
          {transaction.invoiceToWeightRateAedPerKg != null ? (
            <p className="details-item">
              <strong>{t("details.invoiceToWeightRate")}:</strong>{" "}
              {transaction.invoiceToWeightRateAedPerKg.toLocaleString(numberLocale)}
            </p>
          ) : null}
          {transaction.containerArrivalDate ? (
            <p className="details-item">
              <strong>{t("details.containerArrivalDate")}:</strong>{" "}
              {new Date(transaction.containerArrivalDate).toLocaleString(numberLocale)}
            </p>
          ) : null}
          {transaction.documentArrivalDate ? (
            <p className="details-item">
              <strong>{t("details.documentArrivalDate")}:</strong>{" "}
              {new Date(transaction.documentArrivalDate).toLocaleString(numberLocale)}
            </p>
          ) : null}
          {showCustomsDeclarationSection && transaction.fileNumber ? (
            <p className="details-item">
              <strong>{t("form.fileNumber")}:</strong> {transaction.fileNumber}
            </p>
          ) : null}
          {transaction.containerNumbers && transaction.containerNumbers.length > 0 ? (
            <p className="details-item">
              <strong>{t("form.containerNumbers")}:</strong> {transaction.containerNumbers.join(", ")}
            </p>
          ) : null}
          {transaction.unitCount != null ? (
            <p className="details-item">
              <strong>{t("form.numberOfUnits")}:</strong> {transaction.unitCount}
            </p>
          ) : null}

          {transaction.transactionStage === "TRANSPORTATION" &&
          (transaction.transportationTo ||
            transaction.trachNo ||
            transaction.transportationCompany ||
            transaction.transportationFrom ||
            transaction.transportationToLocation ||
            transaction.tripCharge != null ||
            transaction.waitingCharge != null ||
            transaction.maccrikCharge != null) ? (
            <>
              <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-2 mb-0">{t("transportation.sectionTitle" as MessageKey)}</h2>
              {transaction.transportationTo ? (
                <p className="details-item">
                  <strong>{t("transportation.toUpper" as MessageKey)}:</strong> {transaction.transportationTo}
                </p>
              ) : null}
              {transaction.trachNo ? (
                <p className="details-item">
                  <strong>{t("transportation.trachNo" as MessageKey)}:</strong> {transaction.trachNo}
                </p>
              ) : null}
              {transaction.transportationCompany ? (
                <p className="details-item">
                  <strong>{t("transportation.company" as MessageKey)}:</strong> {transaction.transportationCompany}
                </p>
              ) : null}
              {transaction.transportationFrom ? (
                <p className="details-item">
                  <strong>{t("transportation.from" as MessageKey)}:</strong> {transaction.transportationFrom}
                </p>
              ) : null}
              {transaction.transportationToLocation ? (
                <p className="details-item">
                  <strong>{t("transportation.to" as MessageKey)}:</strong> {transaction.transportationToLocation}
                </p>
              ) : null}
              {transaction.tripCharge != null ? (
                <p className="details-item">
                  <strong>{t("transportation.tripCharge" as MessageKey)}:</strong> {transaction.tripCharge.toLocaleString(numberLocale)}
                </p>
              ) : null}
              {transaction.waitingCharge != null ? (
                <p className="details-item">
                  <strong>{t("transportation.waitingCharge" as MessageKey)}:</strong> {transaction.waitingCharge.toLocaleString(numberLocale)}
                </p>
              ) : null}
              {transaction.maccrikCharge != null ? (
                <p className="details-item">
                  <strong>{t("transportation.maccrikCharge" as MessageKey)}:</strong> {transaction.maccrikCharge.toLocaleString(numberLocale)}
                </p>
              ) : null}
            </>
          ) : null}

          <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-2 mb-0">{t("form.workflowStatusSection")}</h2>
          <p className="details-item">
            <strong>{t("details.document")}:</strong> {transaction.documentStatus}
          </p>
          <p className="details-item">
            <strong>{t("details.payment")}:</strong> {transaction.paymentStatus}
          </p>
          <p className="details-item">
            <strong>{t("form.stopTransaction")}:</strong> {transaction.isStopped ? t("form.yes") : t("form.no")}
          </p>
          {transaction.isStopped && transaction.stopReason ? (
            <p className="details-item">
              <strong>{t("form.stopReason")}:</strong> {transaction.stopReason}
            </p>
          ) : null}
          {transaction.goodsQuantity != null ? (
            <p className="details-item">
              <strong>{t("details.goodsQuantity")}:</strong> {transaction.goodsQuantity.toLocaleString(numberLocale)}
            </p>
          ) : null}
          {transaction.goodsQuality ? (
            <p className="details-item">
              <strong>{t("details.goodsQuality")}:</strong> {t(`form.quality.${transaction.goodsQuality}` as MessageKey)}
            </p>
          ) : null}
          {transaction.goodsUnit ? (
            <p className="details-item">
              <strong>{t("details.goodsUnit")}:</strong> {t(`form.unit.${transaction.goodsUnit}` as MessageKey)}
            </p>
          ) : null}
          {transaction.documentAttachments && transaction.documentAttachments.length > 0 ? (
            <div className="details-item col-12">
              <p>
                <strong>{t("details.documentPhotos")}</strong>
              </p>
              {Object.entries(groupedAttachments).map(([group, items]) => (
                <div key={group} style={{ marginBottom: 12 }}>
                  <p style={{ margin: "0 0 6px 0", fontWeight: 600 }}>{group}</p>
                  <ul className="attachment-grid">
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
          ) : null}
          </div>
          </div>
        </section>
        </>
      )}
      <ShippingPaperModal open={shippingPaperOpen} transaction={transaction} onClose={() => setShippingPaperOpen(false)} />
    </main>
  );
}
