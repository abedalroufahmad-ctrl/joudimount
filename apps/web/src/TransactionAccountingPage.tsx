import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { transactionListPath } from "./paths";
import type { TransactionListModule } from "./paths";
import { apiFetch } from "./api";
import type { MessageKey } from "./i18n/messages";
import { useI18n } from "./i18n/I18nContext";
import { API_BASE, AccountingCustomField, Role, DocumentAttachment } from "./types";

const INVOICE_CHARGE_KEYS = [
  "deliveryOrderCharge",
  "customsDeclarationCharge",
  "freightShippingCompanyCharge",
  "customsBillCdrCopyCharge",
  "portChargeDpw",
  "inspectionForMerciCharge",
  "clearingCharges",
  "exitCertificateCharge",
  "manifestSgaServicesCharge",
  "gatePassCharge",
  "tripCharge",
  "toCharge",
  "labourCharge",
  "repackingCharge",
  "exitSummitDoCustomsCharge",
  "vatAmount",
] as const;

type InvoiceChargeKey = (typeof INVOICE_CHARGE_KEYS)[number];

type AccountingFixed = {
  invoiceValue: number;
  invoiceCurrency?: string;
  tripCharge?: number;
  waitingCharge?: number;
  maccrikCharge?: number;
  paymentStatus: string;
  storageInputWorkersWages?: number;
  storageExitWorkersWages?: number;
  storageSealWorkersWages?: number;
  storageInputLoadingEquipmentFare?: number;
  storageExitLoadingEquipmentFare?: number;
} & Partial<Record<InvoiceChargeKey, number>>;

type FixedFormState = {
  invoiceValue: string;
  invoiceCurrency: string;
  waitingCharge: string;
  maccrikCharge: string;
  paymentStatus: "pending" | "paid";
  storageInputWorkersWages: string;
  storageExitWorkersWages: string;
  storageSealWorkersWages: string;
  storageInputLoadingEquipmentFare: string;
  storageExitLoadingEquipmentFare: string;
} & Record<InvoiceChargeKey, string>;

type AccountingPayload = {
  id: string;
  clientName: string;
  declarationNumber: string;
  fixed: AccountingFixed;
  customFields: AccountingCustomField[];
  isAccountingFinalized?: boolean;
  accountingInvoices?: DocumentAttachment[];
};

function newCustomField(): AccountingCustomField {
  return { id: crypto.randomUUID(), title: "", value: "" };
}

function numToStr(n: number | undefined): string {
  return n != null && Number.isFinite(n) ? String(n) : "";
}

function emptyInvoiceCharges(): Record<InvoiceChargeKey, string> {
  return Object.fromEntries(INVOICE_CHARGE_KEYS.map((k) => [k, ""])) as Record<InvoiceChargeKey, string>;
}

function fixedToForm(f: AccountingFixed): FixedFormState {
  const charges = emptyInvoiceCharges();
  for (const key of INVOICE_CHARGE_KEYS) {
    charges[key] = numToStr(f[key]);
  }
  return {
    invoiceValue: numToStr(f.invoiceValue),
    invoiceCurrency: f.invoiceCurrency ?? "AED",
    waitingCharge: numToStr(f.waitingCharge),
    maccrikCharge: numToStr(f.maccrikCharge),
    paymentStatus: f.paymentStatus === "paid" ? "paid" : "pending",
    storageInputWorkersWages: numToStr(f.storageInputWorkersWages),
    storageExitWorkersWages: numToStr(f.storageExitWorkersWages),
    storageSealWorkersWages: numToStr(f.storageSealWorkersWages),
    storageInputLoadingEquipmentFare: numToStr(f.storageInputLoadingEquipmentFare),
    storageExitLoadingEquipmentFare: numToStr(f.storageExitLoadingEquipmentFare),
    ...charges,
  };
}

function appendOptionalNumber(target: Record<string, unknown>, key: string, raw: string) {
  const t = raw.trim();
  if (t === "") return;
  const n = Number(t);
  if (Number.isFinite(n) && n >= 0) target[key] = n;
}

function formToFixedPayload(form: FixedFormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    invoiceCurrency: form.invoiceCurrency,
    paymentStatus: form.paymentStatus,
  };
  const inv = Number(form.invoiceValue.trim());
  if (Number.isFinite(inv) && inv > 0) payload.invoiceValue = inv;
  appendOptionalNumber(payload, "waitingCharge", form.waitingCharge);
  appendOptionalNumber(payload, "maccrikCharge", form.maccrikCharge);
  appendOptionalNumber(payload, "storageInputWorkersWages", form.storageInputWorkersWages);
  appendOptionalNumber(payload, "storageExitWorkersWages", form.storageExitWorkersWages);
  appendOptionalNumber(payload, "storageSealWorkersWages", form.storageSealWorkersWages);
  appendOptionalNumber(payload, "storageInputLoadingEquipmentFare", form.storageInputLoadingEquipmentFare);
  appendOptionalNumber(payload, "storageExitLoadingEquipmentFare", form.storageExitLoadingEquipmentFare);
  for (const key of INVOICE_CHARGE_KEYS) {
    appendOptionalNumber(payload, key, form[key]);
  }
  return payload;
}

function chargeLabelKey(key: InvoiceChargeKey): MessageKey {
  if (key === "tripCharge") return "transportation.tripCharge" as MessageKey;
  return `accountingPage.fixed.${key}` as MessageKey;
}

export default function TransactionAccountingPage({
  role,
  module,
}: {
  role: Role;
  module: TransactionListModule;
}) {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [data, setData] = useState<AccountingPayload | null>(null);
  const [fixedForm, setFixedForm] = useState<FixedFormState | null>(null);
  const [customFields, setCustomFields] = useState<AccountingCustomField[]>([]);
  const [isFinalized, setIsFinalized] = useState(false);
  const [retainedInvoices, setRetainedInvoices] = useState<DocumentAttachment[]>([]);
  const [newInvoiceFiles, setNewInvoiceFiles] = useState<{ file: File }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const canEdit = role === "manager" || role === "accountant";
  const apiBase = `/api/${module}`;

  useEffect(() => {
    if (!id) return;
    setError("");
    apiFetch(`${apiBase}/${id}/accounting`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<AccountingPayload>;
      })
      .then((payload) => {
        setData(payload);
        setFixedForm(fixedToForm(payload.fixed));
        setCustomFields(payload.customFields);
        setIsFinalized(payload.isAccountingFinalized ?? false);
        setRetainedInvoices(payload.accountingInvoices ?? []);
        setNewInvoiceFiles([]);
      })
      .catch(() => setError(t("accountingPage.loadError" as MessageKey)));
  }, [id, apiBase, t]);

  function updateFixed(patch: Partial<FixedFormState>) {
    setFixedForm((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaved(false);
  }

  function updateField(index: number, patch: Partial<AccountingCustomField>) {
    setCustomFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
    setSaved(false);
  }

  function removeField(index: number) {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  function handleAddFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const added = Array.from(e.target.files).map((f) => ({ file: f }));
    setNewInvoiceFiles((prev) => [...prev, ...added]);
    e.target.value = "";
    setSaved(false);
  }

  function removeNewFile(index: number) {
    setNewInvoiceFiles((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  function removeRetainedInvoice(path: string) {
    setRetainedInvoices((prev) => prev.filter((d) => d.path !== path));
    setSaved(false);
  }

  function addField() {
    setCustomFields((prev) => [...prev, newCustomField()]);
    setSaved(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || !canEdit || !fixedForm) return;
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const payloadObj = {
        fixed: formToFixedPayload(fixedForm),
        customFields,
        isAccountingFinalized: isFinalized,
      };

      const fd = new FormData();
      fd.append("payload", JSON.stringify(payloadObj));
      fd.append("existingAttachments", JSON.stringify(retainedInvoices));

      for (const item of newInvoiceFiles) {
        fd.append("documentPhotos", item.file);
      }

      const res = await apiFetch(`${apiBase}/${id}/accounting`, {
        method: "PUT",
        body: fd,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "save failed");
      }
      const payload = (await res.json()) as AccountingPayload;
      setData(payload);
      setFixedForm(fixedToForm(payload.fixed));
      setCustomFields(payload.customFields);
      setIsFinalized(payload.isAccountingFinalized ?? false);
      setRetainedInvoices(payload.accountingInvoices ?? []);
      setNewInvoiceFiles([]);
      setSaved(true);
    } catch {
      setError(t("accountingPage.saveError" as MessageKey));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container page-content py-3">
      <div className="page-actions mb-3">
        <Link to={id ? `${transactionListPath(module)}/${id}` : transactionListPath(module)} className="btn btn-outline-secondary btn-sm">
          ← {t("accountingPage.backToRecord" as MessageKey)}
        </Link>
      </div>

      <div className="details-card card shadow-sm border-0 mb-3">
        <div className="card-body">
          <h1 className="h4 fw-bold mb-1">{t("accountingPage.title" as MessageKey)}</h1>
          {data ? (
            <p className="text-muted mb-0">
              <strong>{data.clientName}</strong>
              <span className="mx-2 opacity-50">·</span>
              {data.declarationNumber}
            </p>
          ) : null}
        </div>
      </div>

      {error ? <p className="alert alert-danger">{error}</p> : null}
      {saved ? <p className="alert alert-success">{t("accountingPage.saved" as MessageKey)}</p> : null}

      {!data && !error ? (
        <div className="card border-0 shadow-sm text-center py-5">
          <p className="text-muted mb-0">{t("details.loading")}</p>
        </div>
      ) : null}

      {data && fixedForm ? (
        <form onSubmit={onSubmit} className="details-card card shadow-sm border-0">
          <div className="card-body">
            <h2 className="h6 fw-semibold mb-3">{t("accountingPage.fixedSection" as MessageKey)}</h2>
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-6">
                <label className="form-label small mb-1">{t("accountingPage.fixed.invoiceValue" as MessageKey)}</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  step="any"
                  value={fixedForm.invoiceValue}
                  disabled={!canEdit}
                  onChange={(e) => updateFixed({ invoiceValue: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small mb-1">{t("form.invoiceCurrency" as MessageKey)}</label>
                <select
                  className="form-select"
                  value={fixedForm.invoiceCurrency}
                  disabled={!canEdit}
                  onChange={(e) => updateFixed({ invoiceCurrency: e.target.value })}
                >
                  <option value="AED">AED</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="SAR">SAR</option>
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small mb-1">{t("transportation.waitingCharge" as MessageKey)}</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  step="any"
                  value={fixedForm.waitingCharge}
                  disabled={!canEdit}
                  onChange={(e) => updateFixed({ waitingCharge: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small mb-1">{t("transportation.maccrikCharge" as MessageKey)}</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  step="any"
                  value={fixedForm.maccrikCharge}
                  disabled={!canEdit}
                  onChange={(e) => updateFixed({ maccrikCharge: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small mb-1">{t("form.paymentStatus" as MessageKey)}</label>
                <select
                  className="form-select"
                  value={fixedForm.paymentStatus}
                  disabled={!canEdit}
                  onChange={(e) => updateFixed({ paymentStatus: e.target.value as "pending" | "paid" })}
                >
                  <option value="pending">{t("form.paymentStatus.pending")}</option>
                  <option value="paid">{t("form.paymentStatus.paid")}</option>
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small mb-1">{t("accountingPage.fixed.storageInputWages" as MessageKey)}</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  step="any"
                  value={fixedForm.storageInputWorkersWages}
                  disabled={!canEdit}
                  onChange={(e) => updateFixed({ storageInputWorkersWages: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small mb-1">{t("accountingPage.fixed.storageExitWages" as MessageKey)}</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  step="any"
                  value={fixedForm.storageExitWorkersWages}
                  disabled={!canEdit}
                  onChange={(e) => updateFixed({ storageExitWorkersWages: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small mb-1">{t("accountingPage.fixed.storageSealWages" as MessageKey)}</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  step="any"
                  value={fixedForm.storageSealWorkersWages}
                  disabled={!canEdit}
                  onChange={(e) => updateFixed({ storageSealWorkersWages: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small mb-1">{t("accountingPage.fixed.storageInputFare" as MessageKey)}</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  step="any"
                  value={fixedForm.storageInputLoadingEquipmentFare}
                  disabled={!canEdit}
                  onChange={(e) => updateFixed({ storageInputLoadingEquipmentFare: e.target.value })}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small mb-1">{t("accountingPage.fixed.storageExitFare" as MessageKey)}</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  step="any"
                  value={fixedForm.storageExitLoadingEquipmentFare}
                  disabled={!canEdit}
                  onChange={(e) => updateFixed({ storageExitLoadingEquipmentFare: e.target.value })}
                />
              </div>
            </div>

            <h2 className="h6 fw-semibold mb-3 mt-2">{t("accountingPage.invoiceChargesSection" as MessageKey)}</h2>
            <div className="row g-3 mb-4">
              {INVOICE_CHARGE_KEYS.map((key) => (
                <div className="col-12 col-md-6" key={key}>
                  <label className="form-label small mb-1">{t(chargeLabelKey(key))}</label>
                  <input
                    className="form-control"
                    type="number"
                    min={0}
                    step="any"
                    value={fixedForm[key]}
                    disabled={!canEdit}
                    onChange={(e) => updateFixed({ [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <h2 className="h6 fw-semibold mb-3">{t("accountingPage.customSection" as MessageKey)}</h2>
            <div className="d-flex flex-column gap-3">
              {customFields.map((field, index) => (
                <div key={field.id} className="border rounded p-3 bg-body-tertiary">
                  <div className="row g-2 align-items-end">
                    <div className="col-12 col-md-5">
                      <label className="form-label small mb-1">{t("accountingPage.fieldTitle" as MessageKey)}</label>
                      <input
                        className="form-control"
                        type="text"
                        value={field.title}
                        placeholder={t("accountingPage.emptyTitlePlaceholder" as MessageKey)}
                        disabled={!canEdit}
                        onChange={(e) => updateField(index, { title: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-5">
                      <label className="form-label small mb-1">{t("accountingPage.fieldValue" as MessageKey)}</label>
                      <input
                        className="form-control"
                        type="text"
                        value={field.value}
                        disabled={!canEdit}
                        onChange={(e) => updateField(index, { value: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-2 d-flex gap-2">
                      {customFields.length > 0 && canEdit ? (
                        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeField(index)}>
                          {t("accountingPage.removeField" as MessageKey)}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <hr className="my-4" />

            <h2 className="h6 fw-semibold mb-3">{t("form.attachmentsSection" as MessageKey)}</h2>
            <div className="border rounded p-3 bg-body-tertiary">
              {retainedInvoices.length > 0 && (
                <div className="mb-3">
                  <h3 className="h6 mb-2">Saved Documents</h3>
                  <ul className="list-unstyled mb-0">
                    {retainedInvoices.map((doc) => (
                      <li key={doc.path} className="d-flex align-items-center gap-2 mb-2">
                        <a href={`${API_BASE}${doc.path}`} target="_blank" rel="noreferrer" className="text-decoration-none">
                          {doc.originalName}
                        </a>
                        {canEdit && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-0 px-2"
                            onClick={() => removeRetainedInvoice(doc.path)}
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {canEdit && (
                <div className="mb-3">
                  <label className="btn btn-outline-primary btn-sm mb-2">
                    Add Document
                    <input type="file" multiple hidden onChange={handleAddFile} />
                  </label>
                  {newInvoiceFiles.length > 0 && (
                    <ul className="list-unstyled mb-0">
                      {newInvoiceFiles.map((f, index) => (
                        <li key={index} className="d-flex align-items-center gap-2 mb-2">
                          <span className="text-muted">{f.file.name}</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-0 px-2"
                            onClick={() => removeNewFile(index)}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {role === "manager" && (
              <>
                <hr className="my-4" />
                <div className="d-flex align-items-center gap-3 bg-light border rounded p-3">
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="finalizeAccounting"
                      checked={isFinalized}
                      onChange={(e) => {
                        setIsFinalized(e.target.checked);
                        setSaved(false);
                      }}
                    />
                    <label className="form-check-label fw-bold" htmlFor="finalizeAccounting">
                      Finalize / Activate Transaction
                    </label>
                  </div>
                  <small className="text-muted">Manager only action</small>
                </div>
              </>
            )}

            {canEdit ? (
              <div className="mt-4 d-flex flex-wrap gap-2">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={addField}>
                  {t("accountingPage.addField" as MessageKey)}
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                  {loading ? t("form.saving") : t("form.save")}
                </button>
              </div>
            ) : null}
          </div>
        </form>
      ) : null}
    </main>
  );
}
