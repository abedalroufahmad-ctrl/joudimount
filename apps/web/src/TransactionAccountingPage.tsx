import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { transactionListPath } from "./paths";
import type { TransactionListModule } from "./paths";
import { apiFetch } from "./api";
import type { MessageKey } from "./i18n/messages";
import { useI18n } from "./i18n/I18nContext";
import { AccountingCustomField, Role } from "./types";

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
};

type FixedFormState = {
  invoiceValue: string;
  invoiceCurrency: string;
  tripCharge: string;
  waitingCharge: string;
  maccrikCharge: string;
  paymentStatus: "pending" | "paid";
  storageInputWorkersWages: string;
  storageExitWorkersWages: string;
  storageSealWorkersWages: string;
  storageInputLoadingEquipmentFare: string;
  storageExitLoadingEquipmentFare: string;
};

type AccountingPayload = {
  id: string;
  clientName: string;
  declarationNumber: string;
  fixed: AccountingFixed;
  customFields: AccountingCustomField[];
};

function newCustomField(): AccountingCustomField {
  return { id: crypto.randomUUID(), title: "", value: "" };
}

function numToStr(n: number | undefined): string {
  return n != null && Number.isFinite(n) ? String(n) : "";
}

function fixedToForm(f: AccountingFixed): FixedFormState {
  return {
    invoiceValue: numToStr(f.invoiceValue),
    invoiceCurrency: f.invoiceCurrency ?? "AED",
    tripCharge: numToStr(f.tripCharge),
    waitingCharge: numToStr(f.waitingCharge),
    maccrikCharge: numToStr(f.maccrikCharge),
    paymentStatus: f.paymentStatus === "paid" ? "paid" : "pending",
    storageInputWorkersWages: numToStr(f.storageInputWorkersWages),
    storageExitWorkersWages: numToStr(f.storageExitWorkersWages),
    storageSealWorkersWages: numToStr(f.storageSealWorkersWages),
    storageInputLoadingEquipmentFare: numToStr(f.storageInputLoadingEquipmentFare),
    storageExitLoadingEquipmentFare: numToStr(f.storageExitLoadingEquipmentFare),
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
  appendOptionalNumber(payload, "tripCharge", form.tripCharge);
  appendOptionalNumber(payload, "waitingCharge", form.waitingCharge);
  appendOptionalNumber(payload, "maccrikCharge", form.maccrikCharge);
  appendOptionalNumber(payload, "storageInputWorkersWages", form.storageInputWorkersWages);
  appendOptionalNumber(payload, "storageExitWorkersWages", form.storageExitWorkersWages);
  appendOptionalNumber(payload, "storageSealWorkersWages", form.storageSealWorkersWages);
  appendOptionalNumber(payload, "storageInputLoadingEquipmentFare", form.storageInputLoadingEquipmentFare);
  appendOptionalNumber(payload, "storageExitLoadingEquipmentFare", form.storageExitLoadingEquipmentFare);
  return payload;
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
      const res = await apiFetch(`${apiBase}/${id}/accounting`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixed: formToFixedPayload(fixedForm), customFields }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "save failed");
      }
      const payload = (await res.json()) as AccountingPayload;
      setData(payload);
      setFixedForm(fixedToForm(payload.fixed));
      setCustomFields(payload.customFields);
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
                <label className="form-label small mb-1">{t("transportation.tripCharge" as MessageKey)}</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  step="any"
                  value={fixedForm.tripCharge}
                  disabled={!canEdit}
                  onChange={(e) => updateFixed({ tripCharge: e.target.value })}
                />
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
                      {customFields.length > 1 && canEdit ? (
                        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeField(index)}>
                          {t("accountingPage.removeField" as MessageKey)}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {canEdit ? (
              <div className="mt-3 d-flex flex-wrap gap-2">
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
