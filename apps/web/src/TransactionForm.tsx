import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { transactionListPath, type TransactionListModule } from "./paths";
import AutocompleteField, { type AutocompleteSuggestion } from "./AutocompleteField";
import { apiFetch } from "./api";
import type { MessageKey } from "./i18n/messages";
import { useI18n } from "./i18n/I18nContext";
import {
  API_BASE,
  Client,
  DocumentAttachment,
  DocumentCategory,
  GoodsQuality,
  GoodsUnit,
  InvoiceCurrency,
  Role,
  ShippingCompany,
  Transaction,
  TransactionStage,
} from "./types";

const UNIT_OPTIONS: { value: GoodsUnit; labelKey: string }[] = [
  { value: "kg", labelKey: "form.unit.kg" },
  { value: "ton", labelKey: "form.unit.ton" },
  { value: "piece", labelKey: "form.unit.piece" },
  { value: "carton", labelKey: "form.unit.carton" },
  { value: "pallet", labelKey: "form.unit.pallet" },
  { value: "cbm", labelKey: "form.unit.cbm" },
  { value: "liter", labelKey: "form.unit.liter" },
  { value: "set", labelKey: "form.unit.set" },
];

const QUALITY_OPTIONS: { value: GoodsQuality; labelKey: string }[] = [
  { value: "new", labelKey: "form.quality.new" },
  { value: "like_new", labelKey: "form.quality.like_new" },
  { value: "used", labelKey: "form.quality.used" },
  { value: "refurbished", labelKey: "form.quality.refurbished" },
  { value: "damaged", labelKey: "form.quality.damaged" },
  { value: "mixed", labelKey: "form.quality.mixed" },
];

const CURRENCY_OPTIONS: InvoiceCurrency[] = ["AED", "USD", "EUR", "SAR"];
const DECLARATION_TYPE_OPTIONS_BY_MODULE: Record<TransactionListModule, Array<{ value: string; labelKey: MessageKey }>> = {
  transactions: [
    { value: "Import", labelKey: "form.declarationType.import" },
    { value: "Import to Free Zone", labelKey: "form.declarationType.import_free_zone" },
    { value: "Import for Re-Export", labelKey: "form.declarationType.import_re_export" },
    { value: "Temporary Import", labelKey: "form.declarationType.temporary_import" },
    { value: "Transitin", labelKey: "form.declarationType.transitin" },
    { value: "Transitin from GCC", labelKey: "form.declarationType.transitin_gcc" },
  ],
  transfers: [{ value: "Transfer", labelKey: "form.declarationType.transfer" }],
  exports: [
    { value: "Export", labelKey: "form.declarationType.export" },
    { value: "Transit out", labelKey: "form.declarationType.transit_out" },
    { value: "Export to GCC", labelKey: "form.declarationType.export_gcc" },
  ],
};
const PORT_TYPE_OPTIONS = [
  { value: "Seaports", labelKey: "form.portType.seaports" },
  { value: "Free Zones", labelKey: "form.portType.free_zones" },
  { value: "Mainland", labelKey: "form.portType.mainland" },
] as const;
const DOCUMENT_CATEGORY_OPTIONS: { value: DocumentCategory; labelKey: MessageKey }[] = [
  { value: "bill_of_lading", labelKey: "docCategory.bill_of_lading" },
  { value: "certificate_of_origin", labelKey: "docCategory.certificate_of_origin" },
  { value: "invoice", labelKey: "docCategory.invoice" },
  { value: "packing_list", labelKey: "docCategory.packing_list" },
];
const STAGE_OPTIONS: TransactionStage[] = [
  "PREPARATION",
  "CUSTOMS_CLEARANCE",
  "TRANSPORTATION",
  "STORAGE",
];

type PendingDocument = { file: File; category: DocumentCategory | "" };

function isoToDateInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function isImageFile(name: string): boolean {
  return /\.(png|jpe?g|gif|webp)$/i.test(name);
}

function categoryLabel(category?: DocumentCategory | "", t?: (key: MessageKey) => string): string {
  if (!category) return t ? t("docCategory.uncategorized") : "Uncategorized";
  const key = DOCUMENT_CATEGORY_OPTIONS.find((o) => o.value === category)?.labelKey;
  return key && t ? t(key) : category;
}

type FormState = {
  clientName: string;
  shippingCompanyId?: string;
  shippingCompanyName: string;
  declarationNumber: string;
  declarationNumber2: string;
  declarationDate: string;
  orderDate: string;
  declarationType: string;
  declarationType2: string;
  portType: string;
  containerSize: string;
  portOfLading: string;
  portOfDischarge: string;
  destination: string;
  transportationTo: string;
  trachNo: string;
  transportationCompany: string;
  transportationFrom: string;
  transportationToLocation: string;
  tripCharge: string;
  waitingCharge: string;
  maccrikCharge: string;
  airwayBill: string;
  hsCode: string;
  goodsDescription: string;
  originCountry: string;
  invoiceValue: number;
  invoiceCurrency: InvoiceCurrency | "";
  documentStatus: "copy_received" | "original_received" | "telex_release";
  paymentStatus: "pending" | "paid";
  containerCount: string;
  goodsWeightKg: string;
  invoiceToWeightRateAedPerKg: string;
  containerArrivalDate: string;
  documentArrivalDate: string;
  fileNumber: string;
  containerNumbers: string;
  unitCount: string;
  unitNumber: string;
  isStopped: "no" | "yes";
  stopReason: string;
  goodsQuantity: string;
  goodsQuality: GoodsQuality | "";
  goodsUnit: GoodsUnit | "";
};

const emptyForm: FormState = {
  clientName: "",
  shippingCompanyId: "",
  shippingCompanyName: "",
  declarationNumber: "",
  declarationNumber2: "",
  declarationDate: "",
  orderDate: "",
  declarationType: "",
  declarationType2: "",
  portType: "",
  containerSize: "",
  portOfLading: "",
  portOfDischarge: "",
  destination: "",
  transportationTo: "",
  trachNo: "",
  transportationCompany: "",
  transportationFrom: "",
  transportationToLocation: "",
  tripCharge: "",
  waitingCharge: "",
  maccrikCharge: "",
  airwayBill: "",
  hsCode: "",
  goodsDescription: "",
  originCountry: "AE",
  invoiceValue: 1000,
  invoiceCurrency: "AED",
  documentStatus: "copy_received",
  paymentStatus: "pending",
  containerCount: "",
  goodsWeightKg: "",
  invoiceToWeightRateAedPerKg: "",
  containerArrivalDate: "",
  documentArrivalDate: "",
  fileNumber: "",
  containerNumbers: "",
  unitCount: "",
  unitNumber: "",
  isStopped: "no",
  stopReason: "",
  goodsQuantity: "",
  goodsQuality: "",
  goodsUnit: "cbm",
};

type EditReadOnlyMeta = {
  declarationNumber?: string;
  declarationNumber2?: string;
  releaseCode?: string;
  clearanceStatus?: string;
  createdAt?: string;
  transactionStage?: TransactionStage;
};

function appendOptionalNumber(fd: FormData, key: string, raw: string) {
  const t = raw.trim();
  if (t === "") return;
  const n = Number(t);
  if (!Number.isFinite(n)) return;
  fd.append(key, String(n));
}

async function parseApiErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  const status = res.status;
  try {
    const j = JSON.parse(text) as { error?: unknown };
    const e = j.error;
    if (e == null) return text.trim() ? `HTTP ${status}: ${text.trim().slice(0, 400)}` : `HTTP ${status}`;
    if (typeof e === "string") return e;
    if (typeof e === "object" && e !== null) return JSON.stringify(e);
    return String(e);
  } catch {
    return text.trim() ? `HTTP ${status}: ${text.trim().slice(0, 400)}` : `HTTP ${status}`;
  }
}

export default function TransactionForm({
  role,
  module = "transactions",
}: {
  role: Role;
  module?: TransactionListModule;
}) {
  const { t, numberLocale } = useI18n();
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  /** Treat `/transactions/new` style id as create, not edit (Boolean("new") is truthy). */
  const isEdit = Boolean(routeId && routeId !== "new");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retainedDocs, setRetainedDocs] = useState<DocumentAttachment[]>([]);
  const [newDocFiles, setNewDocFiles] = useState<PendingDocument[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [shippingCompanies, setShippingCompanies] = useState<ShippingCompany[]>([]);
  const [editMeta, setEditMeta] = useState<EditReadOnlyMeta | null>(null);
  const [stage, setStage] = useState<TransactionStage>("PREPARATION");

  if ((role === "accountant" || role === "employee2") && !isEdit) {
    return (
      <main className="container py-2">
        <h1 className="display-6 fw-bold mb-2">{t("form.accessLimitedTitle")}</h1>
        <p>{t("form.accessLimitedBody")}</p>
        <Link to="/" className="btn btn-outline-secondary btn-sm">
          {t("form.back")}
        </Link>
      </main>
    );
  }

  useEffect(() => {
    apiFetch("/api/clients")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Client[]) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]));
    apiFetch("/api/shipping-companies")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ShippingCompany[]) => setShippingCompanies(Array.isArray(data) ? data : []))
      .catch(() => setShippingCompanies([]));
  }, []);

  useEffect(() => {
    if (!isEdit || !routeId) return;
    apiFetch(`/api/${module}/${routeId}`)
      .then((res) => {
        if (!res.ok) throw new Error("not-found");
        return res.json();
      })
      .then((data: Transaction) => {
        setEditMeta({
          declarationNumber: data.declarationNumber,
          declarationNumber2: data.declarationNumber2,
          releaseCode: data.releaseCode,
          clearanceStatus: data.clearanceStatus,
          createdAt: data.createdAt,
          transactionStage: data.transactionStage,
        });
        setStage(data.transactionStage ?? "PREPARATION");
        setForm({
          clientName: data.clientName,
          shippingCompanyId: data.shippingCompanyId,
          shippingCompanyName: data.shippingCompanyName,
          declarationNumber: data.declarationNumber ?? "",
          declarationNumber2: data.declarationNumber2 ?? "",
          declarationDate: isoToDateInput(data.declarationDate),
          orderDate: isoToDateInput(data.orderDate),
          declarationType: data.declarationType ?? "",
          declarationType2: data.declarationType2 ?? "",
          portType: data.portType ?? "",
          containerSize: data.containerSize ?? "",
          portOfLading: data.portOfLading ?? "",
          portOfDischarge: data.portOfDischarge ?? "",
          destination: data.destination ?? "",
          transportationTo: data.transportationTo ?? "",
          trachNo: data.trachNo ?? "",
          transportationCompany: data.transportationCompany ?? "",
          transportationFrom: data.transportationFrom ?? "",
          transportationToLocation: data.transportationToLocation ?? "",
          tripCharge: data.tripCharge != null ? String(data.tripCharge) : "",
          waitingCharge: data.waitingCharge != null ? String(data.waitingCharge) : "",
          maccrikCharge: data.maccrikCharge != null ? String(data.maccrikCharge) : "",
          airwayBill: data.airwayBill,
          hsCode: data.hsCode,
          goodsDescription: data.goodsDescription,
          originCountry: data.originCountry,
          invoiceValue: data.invoiceValue,
          invoiceCurrency: data.invoiceCurrency ?? "AED",
          documentStatus: data.documentStatus,
          paymentStatus: data.paymentStatus,
          containerCount: data.containerCount != null ? String(data.containerCount) : "",
          goodsWeightKg: data.goodsWeightKg != null ? String(data.goodsWeightKg) : "",
          invoiceToWeightRateAedPerKg:
            data.invoiceToWeightRateAedPerKg != null ? String(data.invoiceToWeightRateAedPerKg) : "",
          containerArrivalDate: isoToDateInput(data.containerArrivalDate),
          documentArrivalDate: isoToDateInput(data.documentArrivalDate),
          fileNumber: data.fileNumber ?? "",
          containerNumbers: data.containerNumbers?.join(", ") ?? "",
          unitCount: data.unitCount != null ? String(data.unitCount) : "",
          unitNumber: data.unitNumber != null ? String(data.unitNumber) : "",
          isStopped: data.isStopped ? "yes" : "no",
          stopReason: data.stopReason ?? "",
          goodsQuantity: data.goodsQuantity != null ? String(data.goodsQuantity) : "",
          goodsQuality: data.goodsQuality ?? "",
          goodsUnit: data.goodsUnit ?? "cbm",
        });
        setRetainedDocs(data.documentAttachments ?? []);
        setNewDocFiles([]);
      })
      .catch(() => setError(t("form.loadError")));
  }, [routeId, isEdit, t, module]);

  const derivedWeight = useMemo(() => {
    const inv = Number(form.invoiceValue);
    const rate = Number(form.invoiceToWeightRateAedPerKg);
    if (!Number.isFinite(inv) || !Number.isFinite(rate) || rate <= 0) return null;
    return inv / rate;
  }, [form.invoiceValue, form.invoiceToWeightRateAedPerKg]);

  const clientSuggestions: AutocompleteSuggestion[] = useMemo(() => {
    const q = form.clientName.trim().toLowerCase();
    if (q.length < 1) return [];
    return clients
      .filter((c) => {
        const name = c.companyName.toLowerCase();
        const trn = c.trn.toLowerCase();
        const imm = (c.immigrationCode ?? "").toLowerCase();
        return name.includes(q) || trn.includes(q) || imm.includes(q);
      })
      .slice(0, 12)
      .map((c) => ({
        key: c.id,
        primary: c.companyName,
        secondary: [c.immigrationCode, c.trn].filter(Boolean).join(" · ") || undefined,
      }));
  }, [clients, form.clientName]);

  const shippingSuggestions: AutocompleteSuggestion[] = useMemo(() => {
    const q = form.shippingCompanyName.trim().toLowerCase();
    if (q.length < 1) return [];
    return shippingCompanies
      .filter((s) => {
        const name = s.companyName.toLowerCase();
        const code = s.code.toLowerCase();
        return name.includes(q) || code.includes(q);
      })
      .slice(0, 12)
      .map((s) => ({
        key: s.id,
        primary: s.companyName,
        secondary: s.code,
      }));
  }, [shippingCompanies, form.shippingCompanyName]);

  const groupedRetainedDocs = useMemo(() => {
    const groups = new Map<string, DocumentAttachment[]>();
    for (const d of retainedDocs) {
      const key = categoryLabel(d.category, t);
      const arr = groups.get(key) ?? [];
      arr.push(d);
      groups.set(key, arr);
    }
    return Array.from(groups.entries());
  }, [retainedDocs]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    // Without noValidate on <form>, invalid fields block the submit event entirely — React never runs this handler ("nothing happens").
    if (!formEl.checkValidity()) {
      setError(t("form.validationError"));
      formEl.reportValidity();
      return;
    }
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("clientName", form.clientName);
      const effectiveShippingCompanyName =
        module === "transactions"
          ? form.shippingCompanyName
          : form.destination.trim() || form.portOfDischarge.trim() || "N/A";
      const effectiveAirwayBill = module === "transactions" ? form.airwayBill : form.portOfLading.trim() || "N/A";
      const effectiveInvoiceValue =
        module === "transactions" ? Number(form.invoiceValue) : Math.max(1, Number(form.invoiceValue) || 1);
      fd.append("shippingCompanyName", effectiveShippingCompanyName);
      if (form.shippingCompanyId?.trim()) fd.append("shippingCompanyId", form.shippingCompanyId.trim());
      if (form.declarationNumber.trim()) fd.append("declarationNumber", form.declarationNumber.trim());
      if (form.declarationNumber2.trim()) fd.append("declarationNumber2", form.declarationNumber2.trim());
      if (form.declarationDate) fd.append("declarationDate", form.declarationDate);
      if (form.orderDate) fd.append("orderDate", form.orderDate);
      if (form.declarationType.trim()) fd.append("declarationType", form.declarationType.trim());
      if (form.declarationType2.trim()) fd.append("declarationType2", form.declarationType2.trim());
      if (form.portType.trim()) fd.append("portType", form.portType.trim());
      if (form.containerSize.trim()) fd.append("containerSize", form.containerSize.trim());
      if (form.portOfLading.trim()) fd.append("portOfLading", form.portOfLading.trim());
      if (form.portOfDischarge.trim()) fd.append("portOfDischarge", form.portOfDischarge.trim());
      if (form.destination.trim()) fd.append("destination", form.destination.trim());
      if (form.transportationTo.trim()) fd.append("transportationTo", form.transportationTo.trim());
      if (form.trachNo.trim()) fd.append("trachNo", form.trachNo.trim());
      if (form.transportationCompany.trim()) fd.append("transportationCompany", form.transportationCompany.trim());
      if (form.transportationFrom.trim()) fd.append("transportationFrom", form.transportationFrom.trim());
      if (form.transportationToLocation.trim()) fd.append("transportationToLocation", form.transportationToLocation.trim());
      appendOptionalNumber(fd, "tripCharge", form.tripCharge);
      appendOptionalNumber(fd, "waitingCharge", form.waitingCharge);
      appendOptionalNumber(fd, "maccrikCharge", form.maccrikCharge);
      fd.append("airwayBill", effectiveAirwayBill);
      fd.append("hsCode", form.hsCode);
      fd.append("goodsDescription", form.goodsDescription);
      fd.append("originCountry", form.originCountry.toUpperCase());
      fd.append("invoiceValue", String(effectiveInvoiceValue));
      if (form.invoiceCurrency) fd.append("invoiceCurrency", form.invoiceCurrency);
      fd.append("documentStatus", form.documentStatus);
      if (role !== "employee") fd.append("paymentStatus", form.paymentStatus);

      appendOptionalNumber(fd, "containerCount", form.containerCount);
      const weightStr =
        form.goodsWeightKg.trim() !== ""
          ? form.goodsWeightKg
          : derivedWeight != null
            ? String(Math.round(derivedWeight * 1000) / 1000)
            : "";
      appendOptionalNumber(fd, "goodsWeightKg", weightStr);
      appendOptionalNumber(fd, "invoiceToWeightRateAedPerKg", form.invoiceToWeightRateAedPerKg);
      if (form.containerArrivalDate) fd.append("containerArrivalDate", form.containerArrivalDate);
      if (form.documentArrivalDate) fd.append("documentArrivalDate", form.documentArrivalDate);
      if (form.fileNumber.trim()) fd.append("fileNumber", form.fileNumber.trim());
      if (form.containerNumbers.trim()) {
        const values = form.containerNumbers
          .split(/[\n,]+/)
          .map((v) => v.trim())
          .filter(Boolean);
        if (values.length) fd.append("containerNumbers", JSON.stringify(values));
      }
      appendOptionalNumber(fd, "unitCount", form.unitCount);
      appendOptionalNumber(fd, "unitNumber", form.unitNumber);
      fd.append("isStopped", form.isStopped === "yes" ? "true" : "false");
      if (form.stopReason.trim()) fd.append("stopReason", form.stopReason.trim());
      appendOptionalNumber(fd, "goodsQuantity", form.goodsQuantity);
      if (form.goodsQuality) fd.append("goodsQuality", form.goodsQuality);
      if (form.goodsUnit) fd.append("goodsUnit", form.goodsUnit);

      if (isEdit) {
        fd.append("existingAttachments", JSON.stringify(retainedDocs));
      }
      if (newDocFiles.some((item) => !item.category)) {
        setError(t("form.categoryRequiredError"));
        return;
      }
      if (newDocFiles.length) {
        fd.append(
          "documentPhotoCategories",
          JSON.stringify(newDocFiles.map((item) => item.category)),
        );
      }
      for (const item of newDocFiles) {
        fd.append("documentPhotos", item.file);
      }

      const res = await apiFetch(`/api/${module}${isEdit ? `/${routeId}` : ""}`, {
        method: isEdit ? "PUT" : "POST",
        body: fd,
      });
      if (!res.ok) {
        const detail = await parseApiErrorMessage(res);
        setError(detail ? `${t("form.saveError")} (${detail})` : t("form.saveError"));
        return;
      }
      const data = (await res.json()) as Transaction;
      navigate(`${transactionListPath(module)}/${data.id}`);
    } catch {
      setError(t("form.saveError"));
    } finally {
      setLoading(false);
    }
  };

  const stageLabel = (value: TransactionStage) => {
    switch (value) {
      case "PREPARATION":
        return t("stage.PREPARATION");
      case "CUSTOMS_CLEARANCE":
        return t("stage.CUSTOMS_CLEARANCE");
      case "TRANSPORTATION":
        return t("stage.TRANSPORTATION" as MessageKey);
      case "STORAGE":
        return t("stage.STORAGE");
      default:
        return value;
    }
  };

  const setTransactionStage = async (nextStage: TransactionStage) => {
    if (!isEdit || !routeId || nextStage === stage) return;
    const res = await apiFetch(`/api/${module}/${routeId}/stage`, {
      method: "POST",
      body: JSON.stringify({ stage: nextStage }),
    });
    if (!res.ok) {
      const detail = await parseApiErrorMessage(res);
      setError(detail || t("form.stageChangeError"));
      return;
    }
    const data = (await res.json()) as Transaction;
    setStage(data.transactionStage);
    setEditMeta((prev) =>
      prev ? { ...prev, transactionStage: data.transactionStage, clearanceStatus: data.clearanceStatus } : prev,
    );
  };

  const prepEditable = !isEdit || stage === "PREPARATION" || stage === "CUSTOMS_CLEARANCE";
  const customsEditable = !isEdit || stage === "PREPARATION" || stage === "CUSTOMS_CLEARANCE";
  const storageEditable = !isEdit || stage === "PREPARATION" || stage === "STORAGE";
  /** Imports & transfers in Storage: only warehouse fields stay editable (API-enforced). */
  const storageOnlyImportTransfer =
    isEdit && stage === "STORAGE" && (module === "transactions" || module === "transfers");
  const prepEditableEffective = prepEditable && !storageOnlyImportTransfer;
  const customsEditableEffective = customsEditable && !storageOnlyImportTransfer;
  const legacyStorageEditable = storageEditable && !storageOnlyImportTransfer;
  const fullyLocked = storageOnlyImportTransfer;
  /** Stage can move forward or back; only manager and employee2 may call the API. */
  const canSetStage = role === "manager" || role === "employee2";
  /** Customs Declaration + file number: hidden for new transactions and in Preparation; visible from Customs clearance onward when editing. */
  const showCustomsDeclarationSection = isEdit && stage !== "PREPARATION";
  const isTransferOrExport = module === "transfers" || module === "exports";
  const declarationTypeOptions = DECLARATION_TYPE_OPTIONS_BY_MODULE[module];
  const moduleStageOptions: TransactionStage[] =
    module === "exports" ? ["PREPARATION", "CUSTOMS_CLEARANCE", "TRANSPORTATION"] : STAGE_OPTIONS;

  if (isTransferOrExport) {
    const transferWarehouseOnly = isEdit && stage === "STORAGE" && module === "transfers";
    return (
      <main className="container py-2">
        <div className="page-actions">
          <Link to={`/${module}`} className="btn btn-outline-secondary btn-sm">
            {t("form.back")}
          </Link>
        </div>
        <h1 className="display-6 fw-bold mb-3">
          {module === "transfers"
            ? isEdit
              ? t("transfer.form.editTitle" as MessageKey)
              : t("transfer.form.newTitle" as MessageKey)
            : isEdit
              ? t("export.form.editTitle" as MessageKey)
              : t("export.form.newTitle" as MessageKey)}
        </h1>
        {error ? <p className="error alert alert-danger">{error}</p> : null}
        <form className="card shadow-sm mb-4" noValidate onSubmit={onSubmit}>
          <div className="card-body">
            <div className="row g-3">
          {isEdit ? (
            <label className="col-12 form-label w-100 mb-0">
              {t("form.stage")}
              <select className="form-select mt-1"
                value={stage}
                onChange={(e) => setTransactionStage(e.target.value as TransactionStage)}
                disabled={!canSetStage}
              >
                {moduleStageOptions.map((s) => (
                  <option key={s} value={s}>
                    {stageLabel(s)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {transferWarehouseOnly && routeId ? (
            <div className="col-12">
              <p className="muted" role="status">
                {t("form.storage.readOnlyHint" as MessageKey)}
              </p>
              <Link
                to={`/${module}/${routeId}/storage`}
                className="btn btn-primary btn-sm"
                style={{ display: "inline-block", marginTop: 8 }}
              >
                {t("form.storage.openDedicatedPage" as MessageKey)}
              </Link>
            </div>
          ) : null}
          <AutocompleteField
            label={t("form.clientName")}
            value={form.clientName}
            onChange={(clientName) => setForm({ ...form, clientName })}
            onSelectSuggestion={(key) => {
              const c = clients.find((x) => x.id === key);
              if (c) setForm((f) => ({ ...f, clientName: c.companyName }));
            }}
            suggestions={clientSuggestions}
            disabled={!prepEditableEffective}
            required
            hint={t("form.typeToSearch")}
          />
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.orderDate")}
            <input className="form-control mt-1"
              type="date"
              disabled={transferWarehouseOnly}
              value={form.orderDate}
              onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
              required
            />
          </label>
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.containerCount")}
            <input className="form-control mt-1"
              type="number"
              min={0}
              step={1}
              disabled={transferWarehouseOnly}
              value={form.containerCount}
              onChange={(e) => setForm({ ...form, containerCount: e.target.value })}
              required
            />
          </label>
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.containerSize")}
            <input className="form-control mt-1"
              disabled={transferWarehouseOnly}
              value={form.containerSize}
              onChange={(e) => setForm({ ...form, containerSize: e.target.value })}
              required
            />
          </label>
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.portOfLading")}
            <input className="form-control mt-1"
              disabled={transferWarehouseOnly}
              value={form.portOfLading}
              onChange={(e) => setForm({ ...form, portOfLading: e.target.value })}
              required
            />
          </label>
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.portOfDischarge")}
            <input className="form-control mt-1"
              disabled={transferWarehouseOnly}
              value={form.portOfDischarge}
              onChange={(e) => setForm({ ...form, portOfDischarge: e.target.value })}
              required
            />
          </label>
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.destination")}
            <input className="form-control mt-1"
              disabled={transferWarehouseOnly}
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              required
            />
          </label>
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.goodsWeightKg")}
            <input className="form-control mt-1"
              type="number"
              min={0}
              step="any"
              disabled={transferWarehouseOnly}
              value={form.goodsWeightKg}
              onChange={(e) => setForm({ ...form, goodsWeightKg: e.target.value })}
              required
            />
          </label>
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.origin")}
            <input className="form-control mt-1"
              disabled={transferWarehouseOnly}
              value={form.originCountry}
              onChange={(e) => setForm({ ...form, originCountry: e.target.value })}
              minLength={2}
              maxLength={2}
              required
            />
          </label>
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.unitNumber")}
            <input className="form-control mt-1"
              type="number"
              min={0}
              step={1}
              disabled={transferWarehouseOnly}
              value={form.unitNumber}
              onChange={(e) => setForm({ ...form, unitNumber: e.target.value })}
              required
            />
          </label>
          <label className="col-12 form-label w-100 mb-0">
            {t("form.goodsDescription")}
            <textarea className="form-control mt-1"
              disabled={transferWarehouseOnly}
              value={form.goodsDescription}
              onChange={(e) => setForm({ ...form, goodsDescription: e.target.value })}
              rows={3}
              required
            />
          </label>
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.goodsUnit")}
            <select className="form-select mt-1"
              disabled={transferWarehouseOnly}
              value={form.goodsUnit}
              onChange={(e) => setForm({ ...form, goodsUnit: e.target.value as GoodsUnit | "" })}
              required
            >
              <option value="">{t("form.optionalSelect")}</option>
              {UNIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.labelKey as MessageKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.stopTransaction")}
            <select className="form-select mt-1"
              disabled={transferWarehouseOnly}
              value={form.isStopped}
              onChange={(e) => setForm({ ...form, isStopped: e.target.value as "no" | "yes" })}
            >
              <option value="no">{t("form.no")}</option>
              <option value="yes">{t("form.yes")}</option>
            </select>
          </label>
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.hsCode")}
            <input className="form-control mt-1"
              disabled={transferWarehouseOnly}
              value={form.hsCode}
              onChange={(e) => setForm({ ...form, hsCode: e.target.value })}
              required
            />
          </label>
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.goodsQuality")}
            <select className="form-select mt-1"
              disabled={transferWarehouseOnly}
              value={form.goodsQuality}
              onChange={(e) => setForm({ ...form, goodsQuality: e.target.value as GoodsQuality | "" })}
              required
            >
              <option value="">{t("form.optionalSelect")}</option>
              {QUALITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.labelKey as MessageKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.goodsQuantity")}
            <input className="form-control mt-1"
              type="number"
              min={0}
              step="any"
              disabled={transferWarehouseOnly}
              value={form.goodsQuantity}
              onChange={(e) => setForm({ ...form, goodsQuantity: e.target.value })}
              required
            />
          </label>

          {showCustomsDeclarationSection ? (
            <>
              <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-3 mb-0">{t("form.customsDeclarationSection")}</h2>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.fileNumber")}
                <input className="form-control mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.fileNumber}
                  onChange={(e) => setForm({ ...form, fileNumber: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.declarationNumber1")}
                <input className="form-control mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.declarationNumber}
                  onChange={(e) => setForm({ ...form, declarationNumber: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.declarationNumber2")}
                <input className="form-control mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.declarationNumber2}
                  onChange={(e) => setForm({ ...form, declarationNumber2: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.declarationDate")}
                <input className="form-control mt-1"
                  type="date"
                  disabled={transferWarehouseOnly}
                  value={form.declarationDate}
                  onChange={(e) => setForm({ ...form, declarationDate: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.declarationType1")}
                <select className="form-select mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.declarationType}
                  onChange={(e) => setForm({ ...form, declarationType: e.target.value })}
                >
                  <option value="">{t("form.optionalSelect")}</option>
                  {declarationTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.declarationType2")}
                <select className="form-select mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.declarationType2}
                  onChange={(e) => setForm({ ...form, declarationType2: e.target.value })}
                >
                  <option value="">{t("form.optionalSelect")}</option>
                  {declarationTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("form.portType")}
                <select className="form-select mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.portType}
                  onChange={(e) => setForm({ ...form, portType: e.target.value })}
                >
                  <option value="">{t("form.optionalSelect")}</option>
                  {PORT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          {isEdit ? (
            <>
              <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-3 mb-0">{t("transportation.sectionTitle" as MessageKey)}</h2>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("transportation.toUpper" as MessageKey)}
                <input className="form-control mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.transportationTo}
                  onChange={(e) => setForm({ ...form, transportationTo: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("transportation.trachNo" as MessageKey)}
                <input className="form-control mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.trachNo}
                  onChange={(e) => setForm({ ...form, trachNo: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("transportation.company" as MessageKey)}
                <input className="form-control mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.transportationCompany}
                  onChange={(e) => setForm({ ...form, transportationCompany: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("transportation.from" as MessageKey)}
                <input className="form-control mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.transportationFrom}
                  onChange={(e) => setForm({ ...form, transportationFrom: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("transportation.to" as MessageKey)}
                <input className="form-control mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.transportationToLocation}
                  onChange={(e) => setForm({ ...form, transportationToLocation: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("transportation.tripCharge" as MessageKey)}
                <input className="form-control mt-1"
                  type="number"
                  min={0}
                  step="any"
                  disabled={transferWarehouseOnly}
                  value={form.tripCharge}
                  onChange={(e) => setForm({ ...form, tripCharge: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("transportation.waitingCharge" as MessageKey)}
                <input className="form-control mt-1"
                  type="number"
                  min={0}
                  step="any"
                  disabled={transferWarehouseOnly}
                  value={form.waitingCharge}
                  onChange={(e) => setForm({ ...form, waitingCharge: e.target.value })}
                />
              </label>
              <label className="col-12 col-md-6 form-label w-100 mb-0">
                {t("transportation.maccrikCharge" as MessageKey)}
                <input className="form-control mt-1"
                  type="number"
                  min={0}
                  step="any"
                  disabled={transferWarehouseOnly}
                  value={form.maccrikCharge}
                  onChange={(e) => setForm({ ...form, maccrikCharge: e.target.value })}
                />
              </label>
            </>
          ) : null}

          {form.isStopped === "yes" ? (
            <label className="col-12 form-label w-100 mb-0">
              {t("form.stopReason")}
              <textarea className="form-control mt-1"
                disabled={transferWarehouseOnly}
                value={form.stopReason}
                onChange={(e) => setForm({ ...form, stopReason: e.target.value })}
                rows={2}
                required
              />
            </label>
          ) : null}
          <div className="col-12 doc-upload-block doc-upload-prominent">
            <h2 className="doc-upload-heading">{t("form.documentPhotosSection")}</h2>
            <p className="muted">{t("form.documentPhotosHelp")}</p>
            <input className="form-control mt-1"
              type="file"
              accept="image/*,application/pdf"
              multiple
              disabled={transferWarehouseOnly}
              onChange={(e) =>
                setNewDocFiles(
                  Array.from(e.target.files ?? []).map((file) => ({
                    file,
                    category: "",
                  })),
                )
              }
            />
            {newDocFiles.length > 0 ? (
              <div className="col-12">
                {newDocFiles.map((item, idx) => (
                  <label className="col-12 col-md-6 form-label w-100 mb-0" key={`${item.file.name}-${idx}`}>
                    {item.file.name}
                    <select className="form-select mt-1"
                      value={item.category}
                      disabled={transferWarehouseOnly}
                      onChange={(e) =>
                        setNewDocFiles((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, category: e.target.value as DocumentCategory | "" } : p)),
                        )
                      }
                      required
                    >
                      <option value="">{t("form.selectDocumentCategory")}</option>
                      {DOCUMENT_CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(option.labelKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
          <div className="col-12">
            <button className="btn btn-primary" type="submit" disabled={loading || transferWarehouseOnly}>
              {loading ? t("form.saving") : t("form.save")}
            </button>
          </div>
            </div>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="container py-2">
      <div className="page-actions">
        <Link to={transactionListPath(module)} className="btn btn-outline-secondary btn-sm">
          {t("form.back")}
        </Link>
      </div>
      <h1 className="display-6 fw-bold mb-3">
        {module === "transactions"
          ? isEdit
            ? t("form.editTitle")
            : t("form.newTitle")
          : module === "transfers"
            ? isEdit
              ? t("transfer.form.editTitle" as MessageKey)
              : t("transfer.form.newTitle" as MessageKey)
            : isEdit
              ? t("export.form.editTitle" as MessageKey)
              : t("export.form.newTitle" as MessageKey)}
      </h1>
      {error ? <p className="error alert alert-danger">{error}</p> : null}
      <form className="card shadow-sm mb-4" noValidate onSubmit={onSubmit}>
          <div className="card-body">
            <div className="row g-3">
        {isEdit && editMeta ? (
          <>
            <label className="col-12 form-label w-100 mb-0">
              {t("form.stage")}
              <select className="form-select mt-1"
                value={stage}
                onChange={(e) => setTransactionStage(e.target.value as TransactionStage)}
                disabled={!canSetStage}
              >
                {moduleStageOptions.map((s) => (
                  <option key={s} value={s}>
                    {stageLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-3 mb-0">{t("form.snapshotReadOnly")}</h2>
            {editMeta.createdAt ? (
              <p className="details-item">
                <strong>{t("details.createdAt")}:</strong> {new Date(editMeta.createdAt).toLocaleString(numberLocale)}
              </p>
            ) : null}
            {editMeta.declarationNumber ? (
              <p className="details-item">
                <strong>{t("form.declarationNumber1")}:</strong> {editMeta.declarationNumber}
              </p>
            ) : null}
            {editMeta.declarationNumber2 ? (
              <p className="details-item">
                <strong>{t("form.declarationNumber2")}:</strong> {editMeta.declarationNumber2}
              </p>
            ) : null}
            {editMeta.releaseCode ? (
              <p className="details-item">
                <strong>{t("details.releaseCode")}:</strong> {editMeta.releaseCode}
              </p>
            ) : null}
            {editMeta.clearanceStatus ? (
              <p className="details-item">
                <strong>{t("details.status")}:</strong> {editMeta.clearanceStatus}
              </p>
            ) : null}
            <p className="details-item">
              <strong>{t("form.stage")}:</strong> {stageLabel(stage)}
            </p>
            {storageOnlyImportTransfer && routeId ? (
              <div className="details-item col-12">
                <p className="muted" role="status">
                  {t("form.storage.readOnlyHint" as MessageKey)}
                </p>
                <Link
                  to={`/${module}/${routeId}/storage`}
                  className="btn btn-primary btn-sm"
                  style={{ display: "inline-block", marginTop: 8 }}
                >
                  {t("form.storage.openDedicatedPage" as MessageKey)}
                </Link>
              </div>
            ) : null}
          </>
        ) : null}
        {showCustomsDeclarationSection ? (
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.fileNumber")}
            <input className="form-control mt-1" value={form.fileNumber} disabled={!customsEditableEffective} onChange={(e) => setForm({ ...form, fileNumber: e.target.value })} />
          </label>
        ) : null}
        <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-3 mb-0">{t("form.partiesSection")}</h2>
        <AutocompleteField
          label={t("form.clientName")}
          value={form.clientName}
          onChange={(clientName) => setForm({ ...form, clientName })}
          onSelectSuggestion={(key) => {
            const c = clients.find((x) => x.id === key);
            if (c) setForm((f) => ({ ...f, clientName: c.companyName }));
          }}
          suggestions={clientSuggestions}
          disabled={!prepEditableEffective}
          required
          hint={t("form.typeToSearch")}
        />
        <AutocompleteField
          label={t("form.shippingCompanyName")}
          value={form.shippingCompanyName}
          onChange={(shippingCompanyName) => setForm({ ...form, shippingCompanyName })}
          onSelectSuggestion={(key) => {
            const s = shippingCompanies.find((x) => x.id === key);
            if (s) setForm((f) => ({ ...f, shippingCompanyName: s.companyName, shippingCompanyId: s.id }));
          }}
          suggestions={shippingSuggestions}
          disabled={!prepEditableEffective}
          required
          hint={t("form.typeToSearch")}
        />
        <label className="col-12 col-md-6 form-label w-100 mb-0">
          {t("form.shippingCompanyId")}
          <input className="form-control mt-1"
            disabled={!prepEditableEffective}
            value={form.shippingCompanyId ?? ""}
            onChange={(e) => setForm({ ...form, shippingCompanyId: e.target.value })}
          />
        </label>

        {showCustomsDeclarationSection ? (
          <>
            <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-3 mb-0">{t("form.customsDeclarationSection")}</h2>
            <label className="col-12 col-md-6 form-label w-100 mb-0">
              {t("form.declarationNumber1")}
              <input className="form-control mt-1"
                disabled={!customsEditableEffective}
                maxLength={120}
                value={form.declarationNumber}
                onChange={(e) => setForm({ ...form, declarationNumber: e.target.value })}
              />
            </label>
            <label className="col-12 col-md-6 form-label w-100 mb-0">
              {t("form.declarationDate")}
              <input className="form-control mt-1"
                disabled={!customsEditableEffective}
                type="date"
                value={form.declarationDate}
                onChange={(e) => setForm({ ...form, declarationDate: e.target.value })}
              />
            </label>
            <label className="col-12 col-md-6 form-label w-100 mb-0">
              {t("form.declarationType1")}
              <select className="form-select mt-1" disabled={!customsEditableEffective} value={form.declarationType} onChange={(e) => setForm({ ...form, declarationType: e.target.value })}>
                <option value="">{t("form.optionalSelect")}</option>
                {declarationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-12 col-md-6 form-label w-100 mb-0">
              {t("form.declarationNumber2")}
              <input className="form-control mt-1"
                disabled={!customsEditableEffective}
                maxLength={120}
                value={form.declarationNumber2}
                onChange={(e) => setForm({ ...form, declarationNumber2: e.target.value })}
              />
            </label>
            <label className="col-12 col-md-6 form-label w-100 mb-0">
              {t("form.declarationType2")}
              <select className="form-select mt-1" disabled={!customsEditableEffective} value={form.declarationType2} onChange={(e) => setForm({ ...form, declarationType2: e.target.value })}>
                <option value="">{t("form.optionalSelect")}</option>
                {declarationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-12 col-md-6 form-label w-100 mb-0">
              {t("form.portType")}
              <select className="form-select mt-1" disabled={!customsEditableEffective} value={form.portType} onChange={(e) => setForm({ ...form, portType: e.target.value })}>
                <option value="">{t("form.optionalSelect")}</option>
                {PORT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-3 mb-0">{t("form.shipmentCoreSection")}</h2>
        <label className="col-12 col-md-6 form-label w-100 mb-0">
          {t("form.airwayBill")}
          <input className="form-control mt-1" disabled={!prepEditableEffective} value={form.airwayBill} onChange={(e) => setForm({ ...form, airwayBill: e.target.value })} required />
        </label>
        <label className="col-12 col-md-6 form-label w-100 mb-0">
          {t("form.hsCode")}
          <input className="form-control mt-1" disabled={!prepEditableEffective} value={form.hsCode} onChange={(e) => setForm({ ...form, hsCode: e.target.value })} required />
        </label>
        <label className="col-12 col-md-6 form-label w-100 mb-0">
          {t("form.origin")}
          <input className="form-control mt-1"
            value={form.originCountry}
            disabled={!prepEditableEffective}
            onChange={(e) => setForm({ ...form, originCountry: e.target.value })}
            minLength={2}
            maxLength={2}
            required
          />
        </label>
        <label className="col-12 col-md-6 form-label w-100 mb-0">
          {t("form.currency")}
          <select className="form-select mt-1"
            value={form.invoiceCurrency}
            disabled={!prepEditableEffective}
            onChange={(e) => setForm({ ...form, invoiceCurrency: e.target.value as InvoiceCurrency | "" })}
          >
            {CURRENCY_OPTIONS.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
        <label className="col-12 form-label w-100 mb-0">
          {t("form.goodsDescription")}
          <textarea className="form-control mt-1"
            value={form.goodsDescription}
            disabled={!prepEditableEffective}
            onChange={(e) => setForm({ ...form, goodsDescription: e.target.value })}
            rows={3}
            required
          />
        </label>
        {!isEdit ? (
          <>
            <label className="col-12 col-md-6 form-label w-100 mb-0">
              {t("form.numberOfUnits")}
              <input className="form-control mt-1"
                type="number"
                disabled={!legacyStorageEditable}
                min={0}
                step={1}
                value={form.unitCount}
                onChange={(e) => setForm({ ...form, unitCount: e.target.value })}
              />
            </label>
          </>
        ) : null}

        <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-3 mb-0">{t("form.cargoContainersSection")}</h2>
        <label className="col-12 col-md-6 form-label w-100 mb-0">
          {t("form.goodsWeightKg")}
          <input className="form-control mt-1"
            type="number"
            disabled={!prepEditableEffective}
            min={0}
            step="any"
            value={form.goodsWeightKg}
            onChange={(e) => setForm({ ...form, goodsWeightKg: e.target.value })}
            placeholder={derivedWeight != null ? `${t("form.derivedWeight")}: ${derivedWeight.toFixed(3)}` : undefined}
          />
        </label>
        <label className="col-12 col-md-6 form-label w-100 mb-0">
          {t("form.containerCount")}
          <input className="form-control mt-1"
            type="number"
            disabled={!prepEditableEffective}
            min={0}
            step={1}
            value={form.containerCount}
            onChange={(e) => setForm({ ...form, containerCount: e.target.value })}
          />
        </label>
        <label className="col-12 col-md-6 form-label w-100 mb-0">
          {t("form.containerArrivalDate")}
          <input className="form-control mt-1"
            type="date"
            disabled={!customsEditableEffective}
            value={form.containerArrivalDate}
            onChange={(e) => setForm({ ...form, containerArrivalDate: e.target.value })}
          />
        </label>
        <label className="col-12 col-md-6 form-label w-100 mb-0">
          {t("form.goodsQuantity")}
          <input className="form-control mt-1"
            type="number"
            disabled={!prepEditableEffective}
            min={0}
            step="any"
            value={form.goodsQuantity}
            onChange={(e) => setForm({ ...form, goodsQuantity: e.target.value })}
          />
        </label>
        <label className="col-12 col-md-6 form-label w-100 mb-0">
          {t("form.goodsQuality")}
          <select className="form-select mt-1"
            value={form.goodsQuality}
            disabled={!prepEditableEffective}
            onChange={(e) => setForm({ ...form, goodsQuality: e.target.value as GoodsQuality | "" })}
          >
            <option value="">{t("form.optionalSelect")}</option>
            {QUALITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.labelKey as MessageKey)}
              </option>
            ))}
          </select>
        </label>
        {isEdit ? (
          <>
            <label className="col-12 col-md-6 form-label w-100 mb-0">
              {t("form.goodsUnit")}
              <select className="form-select mt-1" disabled={!prepEditableEffective} value={form.goodsUnit} onChange={(e) => setForm({ ...form, goodsUnit: e.target.value as GoodsUnit | "" })}>
                <option value="">{t("form.optionalSelect")}</option>
                {UNIT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(o.labelKey as MessageKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-12 col-md-6 form-label w-100 mb-0">
              {t("form.numberOfUnits")}
              <input className="form-control mt-1"
                type="number"
                disabled={!legacyStorageEditable}
                min={0}
                step={1}
                value={form.unitCount}
                onChange={(e) => setForm({ ...form, unitCount: e.target.value })}
              />
            </label>
          </>
        ) : null}
        <label className="col-12 col-md-6 form-label w-100 mb-0">
          {t("form.documentArrivalDate")}
          <input className="form-control mt-1"
            type="date"
            disabled={!customsEditableEffective}
            value={form.documentArrivalDate}
            onChange={(e) => setForm({ ...form, documentArrivalDate: e.target.value })}
          />
        </label>
        <label className="col-12 col-md-6 form-label w-100 mb-0">
          {t("form.containerNumbers")}
          <textarea className="form-control mt-1"
            value={form.containerNumbers}
            disabled={!legacyStorageEditable}
            onChange={(e) => setForm({ ...form, containerNumbers: e.target.value })}
            rows={3}
            placeholder={t("form.containerNumbersPlaceholder")}
          />
        </label>

        <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-3 mb-0">{t("form.workflowStatusSection")}</h2>
        <label className="col-12 col-md-6 form-label w-100 mb-0">
          {t("form.stopTransaction")}
          <select className="form-select mt-1" disabled={!legacyStorageEditable} value={form.isStopped} onChange={(e) => setForm({ ...form, isStopped: e.target.value as "no" | "yes" })}>
            <option value="no">{t("form.no")}</option>
            <option value="yes">{t("form.yes")}</option>
          </select>
        </label>
        {form.isStopped === "yes" ? (
          <label className="col-12 col-md-6 form-label w-100 mb-0">
            {t("form.stopReason")}
            <textarea className="form-control mt-1"
              value={form.stopReason}
              disabled={!legacyStorageEditable}
              onChange={(e) => setForm({ ...form, stopReason: e.target.value })}
              rows={2}
              required
            />
          </label>
        ) : null}
        <label className="col-12 col-md-6 form-label w-100 mb-0">
          {t("form.documentStatus")}
          <select className="form-select mt-1"
            value={form.documentStatus}
            disabled={!customsEditableEffective}
            onChange={(e) => setForm({ ...form, documentStatus: e.target.value as typeof form.documentStatus })}
          >
            <option value="copy_received">{t("form.documentStatus.copy_received")}</option>
            <option value="original_received">{t("form.documentStatus.original_received")}</option>
            <option value="telex_release">{t("form.documentStatus.telex_release")}</option>
          </select>
        </label>
        <label className="col-12 col-md-6 form-label w-100 mb-0">
          {t("form.paymentStatus")}
          <select className="form-select mt-1"
            value={form.paymentStatus}
            onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as "pending" | "paid" })}
            disabled={!customsEditableEffective || role === "employee" || role === "employee2"}
          >
            <option value="pending">{t("form.paymentStatus.pending")}</option>
            <option value="paid">{t("form.paymentStatus.paid")}</option>
          </select>
        </label>

        <h2 className="form-section-title col-12 h5 border-bottom pb-2 mt-3 mb-0">{t("form.attachmentsSection")}</h2>
        <div className="col-12 doc-upload-block doc-upload-prominent">
          <h2 className="doc-upload-heading">{t("form.documentPhotosSection")}</h2>
          <p className="muted">{t("form.documentPhotosHelp")}</p>
          {isEdit && retainedDocs.length > 0 ? (
            <div className="retained-docs">
              {groupedRetainedDocs.map(([group, docs]) => (
                <div key={group} style={{ marginBottom: 10 }}>
                  <p style={{ margin: "0 0 6px 0", fontWeight: 600 }}>{group}</p>
                  <ul className="retained-docs">
                    {docs.map((d) => (
                      <li key={d.path}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          {isImageFile(d.originalName) ? (
                            <a href={`${API_BASE}${d.path}`} target="_blank" rel="noreferrer">
                              <img
                                src={`${API_BASE}${d.path}`}
                                alt={d.originalName}
                                style={{
                                  width: 56,
                                  height: 56,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                  border: "1px solid #d1d5db",
                                }}
                              />
                            </a>
                          ) : (
                            <span style={{ fontSize: 12, color: "#64748b" }}>PDF</span>
                          )}
                          <span>{d.originalName}</span>
                        </span>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0"
                          disabled={!prepEditableEffective}
                          onClick={() => setRetainedDocs((prev) => prev.filter((x) => x.path !== d.path))}
                        >
                          {t("form.removeAttachment")}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
          <input className="form-control mt-1"
            type="file"
            accept="image/*,application/pdf"
            multiple
            disabled={!prepEditableEffective}
            onChange={(e) =>
              setNewDocFiles(
                Array.from(e.target.files ?? []).map((file) => ({
                  file,
                  category: "",
                })),
              )
            }
          />
          {newDocFiles.length > 0 ? (
            <>
              <p className="muted">
                {newDocFiles.length} {t("form.filesSelected")}
              </p>
              <div className="col-12">
                {newDocFiles.map((item, idx) => (
                  <label className="col-12 col-md-6 form-label w-100 mb-0" key={`${item.file.name}-${idx}`}>
                    {item.file.name}
                    <select className="form-select mt-1"
                      value={item.category}
                      disabled={!prepEditableEffective}
                      onChange={(e) =>
                        setNewDocFiles((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, category: e.target.value as DocumentCategory | "" } : p,
                          ),
                        )
                      }
                      required
                    >
                      <option value="">{t("form.selectDocumentCategory")}</option>
                      {DOCUMENT_CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(option.labelKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </>
          ) : null}
        </div>
        {fullyLocked ? (
          <p className="muted col-12" role="status">
            {t("form.saveLockedHint")}
          </p>
        ) : null}
        <div className="col-12">
          <button className="btn btn-primary" type="submit" disabled={loading || fullyLocked}>
            {loading ? t("form.saving") : t("form.save")}
          </button>
        </div>
            </div>
          </div>
      </form>
    </main>
  );
}
