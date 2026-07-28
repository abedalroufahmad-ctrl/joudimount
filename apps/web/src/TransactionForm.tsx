import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
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
import { canRoleSubmitField } from "./transactionFieldPermissions";
import { roleCanChangeStage, roleCanWorkAtStage, stageOptionsForRole } from "./stageRolePermissions";

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

function FormSection({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="details-section-card card shadow-sm border-0 mb-4">
      <div className="card-body">
        <h2 className="details-section-title h5 mb-0">{title}</h2>
        <div className="details-fields-grid">{children}</div>
        {footer ? <div className="details-section-footer">{footer}</div> : null}
      </div>
    </section>
  );
}

function FormReadonlyField({ label, children, fullWidth }: { label: string; children: ReactNode; fullWidth?: boolean }) {
  return (
    <div className={`details-field${fullWidth ? " details-field--full" : ""}`}>
      <div className="details-field-label">{label}</div>
      <div className="details-field-value">{children}</div>
    </div>
  );
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
  documentPostalNumber: string;
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
  documentPostalNumber: "",
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
          transportationTo: isoToDateInput(data.transportationTo ?? ""),
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
          unitCount: data.unitCount ?? "",
          unitNumber: data.unitNumber != null ? String(data.unitNumber) : "",
          isStopped: data.isStopped ? "yes" : "no",
          stopReason: data.stopReason ?? "",
          goodsQuantity: data.goodsQuantity != null ? String(data.goodsQuantity) : "",
          goodsQuality: data.goodsQuality ?? "",
          goodsUnit: data.goodsUnit ?? "cbm",
          documentPostalNumber: data.documentPostalNumber ?? "",
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
      const put = (key: string, value: string) => {
        if (canRoleSubmitField(role, key, isEdit, stage)) fd.append(key, value);
      };
      const putIfPresent = (key: string, value: string) => {
        if (value.trim()) put(key, value.trim());
      };
      const putOptionalNumber = (key: string, raw: string) => {
        if (canRoleSubmitField(role, key, isEdit, stage)) appendOptionalNumber(fd, key, raw);
      };

      put("clientName", form.clientName);
      const effectiveShippingCompanyName =
        module === "transactions"
          ? form.shippingCompanyName
          : form.destination.trim() || form.portOfDischarge.trim() || "N/A";
      const effectiveAirwayBill = module === "transactions" ? form.airwayBill : form.portOfLading.trim() || "N/A";
      const effectiveInvoiceValue =
        module === "transactions" ? Number(form.invoiceValue) : Math.max(1, Number(form.invoiceValue) || 1);
      put("shippingCompanyName", effectiveShippingCompanyName);
      putIfPresent("shippingCompanyId", form.shippingCompanyId ?? "");
      putIfPresent("declarationNumber", form.declarationNumber);
      putIfPresent("declarationNumber2", form.declarationNumber2);
      if (form.declarationDate) put("declarationDate", form.declarationDate);
      if (form.orderDate) put("orderDate", form.orderDate);
      putIfPresent("declarationType", form.declarationType);
      putIfPresent("declarationType2", form.declarationType2);
      putIfPresent("portType", form.portType);
      putIfPresent("containerSize", form.containerSize);
      putIfPresent("portOfLading", form.portOfLading);
      putIfPresent("portOfDischarge", form.portOfDischarge);
      putIfPresent("destination", form.destination);
      putIfPresent("transportationTo", form.transportationTo);
      putIfPresent("trachNo", form.trachNo);
      putIfPresent("transportationCompany", form.transportationCompany);
      putIfPresent("transportationFrom", form.transportationFrom);
      putIfPresent("transportationToLocation", form.transportationToLocation);
      putOptionalNumber("tripCharge", form.tripCharge);
      putOptionalNumber("waitingCharge", form.waitingCharge);
      putOptionalNumber("maccrikCharge", form.maccrikCharge);
      put("airwayBill", effectiveAirwayBill);
      put("hsCode", form.hsCode);
      put("goodsDescription", form.goodsDescription);
      put("originCountry", form.originCountry.toUpperCase());
      put("invoiceValue", String(effectiveInvoiceValue));
      if (form.invoiceCurrency) put("invoiceCurrency", form.invoiceCurrency);
      put("documentStatus", form.documentStatus);
      put("paymentStatus", form.paymentStatus);

      putOptionalNumber("containerCount", form.containerCount);
      const weightStr =
        form.goodsWeightKg.trim() !== ""
          ? form.goodsWeightKg
          : derivedWeight != null
            ? String(Math.round(derivedWeight * 1000) / 1000)
            : "";
      putOptionalNumber("goodsWeightKg", weightStr);
      putOptionalNumber("invoiceToWeightRateAedPerKg", form.invoiceToWeightRateAedPerKg);
      if (form.containerArrivalDate) put("containerArrivalDate", form.containerArrivalDate);
      if (form.documentArrivalDate) put("documentArrivalDate", form.documentArrivalDate);
      putIfPresent("fileNumber", form.fileNumber);
      putIfPresent("documentPostalNumber", form.documentPostalNumber);
      if (form.containerNumbers.trim()) {
        const values = form.containerNumbers
          .split(/[\n,]+/)
          .map((v) => v.trim())
          .filter(Boolean);
        if (values.length && canRoleSubmitField(role, "containerNumbers", isEdit, stage)) {
          fd.append("containerNumbers", JSON.stringify(values));
        }
      }
      putIfPresent("unitCount", form.unitCount);
      putOptionalNumber("unitNumber", form.unitNumber);
      put("isStopped", form.isStopped === "yes" ? "true" : "false");
      putIfPresent("stopReason", form.stopReason);
      putOptionalNumber("goodsQuantity", form.goodsQuantity);
      if (form.goodsQuality) put("goodsQuality", form.goodsQuality);
      if (form.goodsUnit) put("goodsUnit", form.goodsUnit);

      if (isEdit && (role === "manager" || role === "employee")) {
        fd.append("existingAttachments", JSON.stringify(retainedDocs));
      }
      if (newDocFiles.some((item) => !item.category)) {
        setError(t("form.categoryRequiredError"));
        return;
      }
      if (newDocFiles.length && (role === "manager" || role === "employee" || !isEdit)) {
        fd.append(
          "documentPhotoCategories",
          JSON.stringify(newDocFiles.map((item) => item.category)),
        );
      }
      if (role === "manager" || role === "employee" || !isEdit) {
        for (const item of newDocFiles) {
          fd.append("documentPhotos", item.file);
        }
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
      try {
        const j = await res.clone().json();
        if (j && j.error === "missing_fields" && Array.isArray(j.missing)) {
          const labels = j.missing.map((m: string) => t(`form.${m}` as MessageKey)).join(", ");
          setError(`${t("form.missingFieldsBeforeClearance")}: ${labels}`);
          return;
        }
      } catch (_) {}
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
  const canWorkThisStage = role === "manager" || roleCanWorkAtStage(role, stage);
  const prepEditableEffective =
    prepEditable && !storageOnlyImportTransfer && (role === "manager" || (role === "employee" && canWorkThisStage) || !isEdit);
  const customsEditableEffective =
    customsEditable && !storageOnlyImportTransfer && (role === "manager" || (role === "employee" && canWorkThisStage));
  const legacyStorageEditable =
    storageEditable && !storageOnlyImportTransfer && (role === "manager" || (role === "employee2" && stage === "STORAGE"));
  const showTransportationSection = isEdit && stage === "TRANSPORTATION";
  const transportationEditableEffective =
    showTransportationSection &&
    !storageOnlyImportTransfer &&
    (role === "manager" || (role === "employee2" && canWorkThisStage));
  const fullyLocked = storageOnlyImportTransfer;
  const canSetStage = roleCanChangeStage(role, stage);
  /** Customs Declaration + file number: hidden for new transactions and in Preparation; visible from Customs clearance onward when editing. */
  const showCustomsDeclarationSection = isEdit && stage !== "PREPARATION";
  const isTransferOrExport = module === "transfers" || module === "exports";
  const declarationTypeOptions = DECLARATION_TYPE_OPTIONS_BY_MODULE[module];
  const moduleStageOptions: TransactionStage[] =
    module === "exports" ? ["PREPARATION", "CUSTOMS_CLEARANCE", "TRANSPORTATION"] : STAGE_OPTIONS;
  const selectableStages = stageOptionsForRole(role, moduleStageOptions);

  if (isTransferOrExport) {
    const transferWarehouseOnly = isEdit && stage === "STORAGE" && module === "transfers";
    return (
      <main className="container py-2">
        <div className="page-actions btn-toolbar gap-2 flex-wrap">
          <Link to={transactionListPath(module)} className="btn btn-outline-secondary btn-sm">
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
        <form className="transaction-form mb-4" noValidate onSubmit={onSubmit}>
          {isEdit ? (
            <FormSection
              title={t("form.snapshotReadOnly")}
              footer={
                transferWarehouseOnly && routeId ? (
                  <div>
                    <p className="muted small mb-2" role="status">
                      {t("form.storage.readOnlyHint" as MessageKey)}
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                      <Link to={`${transactionListPath(module)}/${routeId}/storage`} className="btn btn-primary btn-sm">
                        {t("form.storage.openDedicatedPage" as MessageKey)}
                      </Link>
                      {role === "manager" || role === "accountant" ? (
                        <Link to={`${transactionListPath(module)}/${routeId}/accounting`} className="btn btn-outline-primary btn-sm">
                          {t("details.linkAccounting" as MessageKey)}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : role === "manager" || role === "accountant" ? (
                  <Link to={`${transactionListPath(module)}/${routeId}/accounting`} className="btn btn-outline-primary btn-sm">
                    {t("details.linkAccounting" as MessageKey)}
                  </Link>
                ) : undefined
              }
            >
              <label className="form-field-box form-field-box--full form-label w-100 mb-0">
                {t("form.stage")}
                <select className="form-select mt-1"
                  value={stage}
                  onChange={(e) => setTransactionStage(e.target.value as TransactionStage)}
                  disabled={!canSetStage}
                >
                  {selectableStages.map((s) => (
                    <option key={s} value={s}>
                      {stageLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              {showCustomsDeclarationSection ? (
                <label className="form-field-box form-label w-100 mb-0">
                  {t("form.fileNumber")}
                  <input className="form-control mt-1"
                    disabled={transferWarehouseOnly}
                    value={form.fileNumber}
                    onChange={(e) => setForm({ ...form, fileNumber: e.target.value })}
                  />
                </label>
              ) : null}
            </FormSection>
          ) : null}

          <FormSection title={t("form.partiesSection")}>
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
          </FormSection>

          <FormSection title={t("form.shipmentCoreSection")}>
          <label className="form-field-box form-label w-100 mb-0">
            {t("form.orderDate")}
            <input className="form-control mt-1"
              type="date"
              disabled={transferWarehouseOnly}
              value={form.orderDate}
              onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
              required
            />
          </label>
          </FormSection>

          <FormSection title={t("form.cargoContainersSection")}>
          <label className="form-field-box form-label w-100 mb-0">
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
          <label className="form-field-box form-label w-100 mb-0">
            {t("form.containerSize")}
            <input className="form-control mt-1"
              disabled={transferWarehouseOnly}
              value={form.containerSize}
              onChange={(e) => setForm({ ...form, containerSize: e.target.value })}
              required
            />
          </label>
          <label className="form-field-box form-label w-100 mb-0">
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
          <label className="form-field-box form-label w-100 mb-0">
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
          <label className="form-field-box form-label w-100 mb-0">
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
          <label className="form-field-box form-field-box--full form-label w-100 mb-0">
            {t("form.goodsDescription")}
            <textarea className="form-control mt-1"
              disabled={transferWarehouseOnly}
              value={form.goodsDescription}
              onChange={(e) => setForm({ ...form, goodsDescription: e.target.value })}
              rows={3}
              required
            />
          </label>
          <label className="form-field-box form-label w-100 mb-0">
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
          <label className="form-field-box form-label w-100 mb-0">
            {t("form.hsCode")}
            <input className="form-control mt-1"
              disabled={transferWarehouseOnly}
              value={form.hsCode}
              onChange={(e) => setForm({ ...form, hsCode: e.target.value })}
              required
            />
          </label>
          <label className="form-field-box form-label w-100 mb-0">
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
          <label className="form-field-box form-label w-100 mb-0">
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
          </FormSection>

          {showCustomsDeclarationSection ? (
            <FormSection title={t("form.customsDeclarationSection")}>
              <label className="form-field-box form-label w-100 mb-0">
                {t("form.declarationNumber1")}
                <input className="form-control mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.declarationNumber}
                  onChange={(e) => setForm({ ...form, declarationNumber: e.target.value })}
                />
              </label>
              <label className="form-field-box form-label w-100 mb-0">
                {t("form.declarationNumber2")}
                <input className="form-control mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.declarationNumber2}
                  onChange={(e) => setForm({ ...form, declarationNumber2: e.target.value })}
                />
              </label>
              <label className="form-field-box form-label w-100 mb-0">
                {t("form.declarationDate")}
                <input className="form-control mt-1"
                  type="date"
                  disabled={transferWarehouseOnly}
                  value={form.declarationDate}
                  onChange={(e) => setForm({ ...form, declarationDate: e.target.value })}
                />
              </label>
              <label className="form-field-box form-label w-100 mb-0">
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
              <label className="form-field-box form-label w-100 mb-0">
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
              <label className="form-field-box form-label w-100 mb-0">
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
            </FormSection>
          ) : null}

          <FormSection
            title={module === "exports" ? t("export.form.exportDetails") : t("transfer.details.title" as MessageKey)}
          >
              <label className="form-field-box form-label w-100 mb-0">
                {t("form.portOfLading")}
                <input className="form-control mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.portOfLading}
                  onChange={(e) => setForm({ ...form, portOfLading: e.target.value })}
                />
              </label>
              <label className="form-field-box form-label w-100 mb-0">
                {t("form.portOfDischarge")}
                <input className="form-control mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.portOfDischarge}
                  onChange={(e) => setForm({ ...form, portOfDischarge: e.target.value })}
                />
              </label>
              <label className="form-field-box form-label w-100 mb-0">
                {t("form.destination")}
                <input className="form-control mt-1"
                  disabled={transferWarehouseOnly}
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                />
              </label>
          </FormSection>

          {showTransportationSection ? (
            <FormSection title={t("transportation.sectionTitle" as MessageKey)}>
              <label className="form-field-box form-label w-100 mb-0">
                {t("transportation.toUpper" as MessageKey)}
                <input className="form-control mt-1"
                  disabled={!transportationEditableEffective}
                  value={form.transportationTo}
                  onChange={(e) => setForm({ ...form, transportationTo: e.target.value })}
                />
              </label>
              <label className="form-field-box form-label w-100 mb-0">
                {t("transportation.trachNo" as MessageKey)}
                <input className="form-control mt-1"
                  disabled={!transportationEditableEffective}
                  value={form.trachNo}
                  onChange={(e) => setForm({ ...form, trachNo: e.target.value })}
                />
              </label>
              <label className="form-field-box form-label w-100 mb-0">
                {t("transportation.company" as MessageKey)}
                <input className="form-control mt-1"
                  disabled={!transportationEditableEffective}
                  value={form.transportationCompany}
                  onChange={(e) => setForm({ ...form, transportationCompany: e.target.value })}
                />
              </label>
              <label className="form-field-box form-label w-100 mb-0">
                {t("transportation.from" as MessageKey)}
                <input className="form-control mt-1"
                  disabled={!transportationEditableEffective}
                  value={form.transportationFrom}
                  onChange={(e) => setForm({ ...form, transportationFrom: e.target.value })}
                />
              </label>
              <label className="form-field-box form-label w-100 mb-0">
                {t("transportation.to" as MessageKey)}
                <input className="form-control mt-1"
                  disabled={!transportationEditableEffective}
                  value={form.transportationToLocation}
                  onChange={(e) => setForm({ ...form, transportationToLocation: e.target.value })}
                />
              </label>
              <label className="form-field-box form-label w-100 mb-0">
                {t("transportation.tripCharge" as MessageKey)}
                <input className="form-control mt-1"
                  type="number"
                  min={0}
                  step="any"
                  disabled={!transportationEditableEffective}
                  value={form.tripCharge}
                  onChange={(e) => setForm({ ...form, tripCharge: e.target.value })}
                />
              </label>
              <label className="form-field-box form-label w-100 mb-0">
                {t("transportation.waitingCharge" as MessageKey)}
                <input className="form-control mt-1"
                  type="number"
                  min={0}
                  step="any"
                  disabled={!transportationEditableEffective}
                  value={form.waitingCharge}
                  onChange={(e) => setForm({ ...form, waitingCharge: e.target.value })}
                />
              </label>
              <label className="form-field-box form-label w-100 mb-0">
                {t("transportation.maccrikCharge" as MessageKey)}
                <input className="form-control mt-1"
                  type="number"
                  min={0}
                  step="any"
                  disabled={!transportationEditableEffective}
                  value={form.maccrikCharge}
                  onChange={(e) => setForm({ ...form, maccrikCharge: e.target.value })}
                />
              </label>
            </FormSection>
          ) : null}

          <FormSection title={t("form.workflowStatusSection")}>
          <label className="form-field-box form-label w-100 mb-0">
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
          {form.isStopped === "yes" ? (
            <label className="form-field-box form-field-box--full form-label w-100 mb-0">
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
          </FormSection>

          <FormSection title={t("form.attachmentsSection")}>
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
                  <label className="form-field-box form-label w-100 mb-0" key={`${item.file.name}-${idx}`}>
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
          </FormSection>

          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-primary" type="submit" disabled={loading || transferWarehouseOnly}>
              {loading ? t("form.saving") : t("form.save")}
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="container py-2">
      <div className="page-actions btn-toolbar gap-2 flex-wrap">
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
      <form className="transaction-form mb-4" noValidate onSubmit={onSubmit}>
        {isEdit && editMeta ? (
          <FormSection
            title={t("form.snapshotReadOnly")}
            footer={
              storageOnlyImportTransfer && routeId ? (
                <div>
                  <p className="muted small mb-2" role="status">
                    {t("form.storage.readOnlyHint" as MessageKey)}
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <Link to={`${transactionListPath(module)}/${routeId}/storage`} className="btn btn-primary btn-sm">
                      {t("form.storage.openDedicatedPage" as MessageKey)}
                    </Link>
                    {role === "manager" || role === "accountant" ? (
                      <Link to={`${transactionListPath(module)}/${routeId}/accounting`} className="btn btn-outline-primary btn-sm">
                        {t("details.linkAccounting" as MessageKey)}
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : role === "manager" || role === "accountant" ? (
                <Link to={`${transactionListPath(module)}/${routeId}/accounting`} className="btn btn-outline-primary btn-sm">
                  {t("details.linkAccounting" as MessageKey)}
                </Link>
              ) : undefined
            }
          >
            <label className="form-field-box form-field-box--full form-label w-100 mb-0">
              {t("form.stage")}
              <select className="form-select mt-1"
                value={stage}
                onChange={(e) => setTransactionStage(e.target.value as TransactionStage)}
                disabled={!canSetStage}
              >
                {selectableStages.map((s) => (
                  <option key={s} value={s}>
                    {stageLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            {editMeta.createdAt ? (
              <FormReadonlyField label={t("details.createdAt")}>
                {new Date(editMeta.createdAt).toLocaleString(numberLocale)}
              </FormReadonlyField>
            ) : null}
            {editMeta.declarationNumber ? (
              <FormReadonlyField label={t("form.declarationNumber1")}>{editMeta.declarationNumber}</FormReadonlyField>
            ) : null}
            {editMeta.declarationNumber2 ? (
              <FormReadonlyField label={t("form.declarationNumber2")}>{editMeta.declarationNumber2}</FormReadonlyField>
            ) : null}
            {showCustomsDeclarationSection ? (
              <label className="form-field-box form-label w-100 mb-0">
                {t("form.fileNumber")}
                <input className="form-control mt-1" value={form.fileNumber} disabled={!customsEditableEffective} onChange={(e) => setForm({ ...form, fileNumber: e.target.value })} />
              </label>
            ) : null}
            {editMeta.releaseCode ? (
              <FormReadonlyField label={t("details.releaseCode")}>{editMeta.releaseCode}</FormReadonlyField>
            ) : null}
            {editMeta.clearanceStatus ? (
              <FormReadonlyField label={t("details.status")}>{editMeta.clearanceStatus}</FormReadonlyField>
            ) : null}
          </FormSection>
        ) : null}

        <FormSection title={t("form.partiesSection")}>
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
        <label className="form-field-box form-label w-100 mb-0">
          {t("form.shippingCompanyId")}
          <input className="form-control mt-1"
            disabled={!prepEditableEffective}
            value={form.shippingCompanyId ?? ""}
            onChange={(e) => setForm({ ...form, shippingCompanyId: e.target.value })}
          />
        </label>
        </FormSection>

        {showCustomsDeclarationSection ? (
          <FormSection title={t("form.customsDeclarationSection")}>
            <label className="form-field-box form-label w-100 mb-0">
              {t("form.declarationNumber1")}
              <input className="form-control mt-1"
                disabled={!customsEditableEffective}
                maxLength={120}
                value={form.declarationNumber}
                onChange={(e) => setForm({ ...form, declarationNumber: e.target.value })}
              />
            </label>
            <label className="form-field-box form-label w-100 mb-0">
              {t("form.declarationDate")}
              <input className="form-control mt-1"
                disabled={!customsEditableEffective}
                type="date"
                value={form.declarationDate}
                onChange={(e) => setForm({ ...form, declarationDate: e.target.value })}
              />
            </label>
            <label className="form-field-box form-label w-100 mb-0">
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
            <label className="form-field-box form-label w-100 mb-0">
              {t("form.declarationNumber2")}
              <input className="form-control mt-1"
                disabled={!customsEditableEffective}
                maxLength={120}
                value={form.declarationNumber2}
                onChange={(e) => setForm({ ...form, declarationNumber2: e.target.value })}
              />
            </label>
            <label className="form-field-box form-label w-100 mb-0">
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
            <label className="form-field-box form-label w-100 mb-0">
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
          </FormSection>
        ) : null}

        <FormSection title={t("form.shipmentCoreSection")}>
        <label className="form-field-box form-label w-100 mb-0">
          {t("form.airwayBill")}
          <input className="form-control mt-1" disabled={!prepEditableEffective} value={form.airwayBill} onChange={(e) => setForm({ ...form, airwayBill: e.target.value })} required />
        </label>
        <label className="form-field-box form-label w-100 mb-0">
          {t("form.hsCode")}
          <input className="form-control mt-1" disabled={!prepEditableEffective} value={form.hsCode} onChange={(e) => setForm({ ...form, hsCode: e.target.value })} required />
        </label>
        <label className="form-field-box form-label w-100 mb-0">
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
        <label className="form-field-box form-label w-100 mb-0">
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
        <label className="form-field-box form-label w-100 mb-0">
          {t("form.invoiceValue")}
          <input className="form-control mt-1"
            type="number"
            min={0}
            step="any"
            disabled={!prepEditableEffective}
            value={form.invoiceValue}
            onChange={(e) => setForm({ ...form, invoiceValue: Number(e.target.value) })}
            required
          />
        </label>
        <label className="form-field-box form-label w-100 mb-0">
          {t("form.invoiceToWeightRate")}
          <input className="form-control mt-1"
            type="number"
            min={0}
            step="any"
            disabled={!prepEditableEffective}
            value={form.invoiceToWeightRateAedPerKg}
            onChange={(e) => setForm({ ...form, invoiceToWeightRateAedPerKg: e.target.value })}
          />
          <span className="form-text">{t("form.invoiceToWeightRateHint")}</span>
        </label>
        <label className="form-field-box form-label w-100 mb-0">
          {t("form.orderDate")}
          <input className="form-control mt-1"
            type="date"
            disabled={!prepEditableEffective}
            value={form.orderDate}
            onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
          />
        </label>
        <label className="form-field-box form-field-box--full form-label w-100 mb-0">
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
            <label className="form-field-box form-label w-100 mb-0">
              {t("form.numberOfUnits")}
              <input className="form-control mt-1"
                type="text"
                disabled={!legacyStorageEditable}
                value={form.unitCount}
                onChange={(e) => setForm({ ...form, unitCount: e.target.value })}
              />
            </label>
          </>
        ) : null}
        </FormSection>

        <FormSection title={t("form.cargoContainersSection")}>
        <label className="form-field-box form-label w-100 mb-0">
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
        <label className="form-field-box form-label w-100 mb-0">
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
        <label className="form-field-box form-label w-100 mb-0">
          {t("form.containerArrivalDate")}
          <input className="form-control mt-1"
            type="date"
            disabled={!customsEditableEffective}
            value={form.containerArrivalDate}
            onChange={(e) => setForm({ ...form, containerArrivalDate: e.target.value })}
          />
        </label>
        <label className="form-field-box form-label w-100 mb-0">
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
        <label className="form-field-box form-label w-100 mb-0">
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
            <label className="form-field-box form-label w-100 mb-0">
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
            <label className="form-field-box form-label w-100 mb-0">
              {t("form.numberOfUnits")}
              <input className="form-control mt-1"
                type="text"
                disabled={!legacyStorageEditable}
                value={form.unitCount}
                onChange={(e) => setForm({ ...form, unitCount: e.target.value })}
              />
            </label>
          </>
        ) : null}
        <label className="form-field-box form-label w-100 mb-0">
          {t("form.documentArrivalDate")}
          <input className="form-control mt-1"
            type="date"
            disabled={!customsEditableEffective}
            value={form.documentArrivalDate}
            onChange={(e) => setForm({ ...form, documentArrivalDate: e.target.value })}
          />
        </label>
        <label className="form-field-box form-label w-100 mb-0">
          {t("form.containerNumbers")}
          <textarea className="form-control mt-1"
            value={form.containerNumbers}
            disabled={!legacyStorageEditable}
            onChange={(e) => setForm({ ...form, containerNumbers: e.target.value })}
            rows={3}
            placeholder={t("form.containerNumbersPlaceholder")}
          />
        </label>
        </FormSection>

        {showTransportationSection ? (
          <FormSection title={t("transportation.sectionTitle" as MessageKey)}>
            <label className="form-field-box form-label w-100 mb-0">
              {t("transportation.toUpper" as MessageKey)}
              <input className="form-control mt-1"
                disabled={!transportationEditableEffective}
                value={form.transportationTo}
                onChange={(e) => setForm({ ...form, transportationTo: e.target.value })}
              />
            </label>
            <label className="form-field-box form-label w-100 mb-0">
              {t("transportation.trachNo" as MessageKey)}
              <input className="form-control mt-1"
                disabled={!transportationEditableEffective}
                value={form.trachNo}
                onChange={(e) => setForm({ ...form, trachNo: e.target.value })}
              />
            </label>
            <label className="form-field-box form-label w-100 mb-0">
              {t("transportation.company" as MessageKey)}
              <input className="form-control mt-1"
                disabled={!transportationEditableEffective}
                value={form.transportationCompany}
                onChange={(e) => setForm({ ...form, transportationCompany: e.target.value })}
              />
            </label>
            <label className="form-field-box form-label w-100 mb-0">
              {t("transportation.from" as MessageKey)}
              <input className="form-control mt-1"
                disabled={!transportationEditableEffective}
                value={form.transportationFrom}
                onChange={(e) => setForm({ ...form, transportationFrom: e.target.value })}
              />
            </label>
            <label className="form-field-box form-label w-100 mb-0">
              {t("transportation.to" as MessageKey)}
              <input className="form-control mt-1"
                disabled={!transportationEditableEffective}
                value={form.transportationToLocation}
                onChange={(e) => setForm({ ...form, transportationToLocation: e.target.value })}
              />
            </label>
            <label className="form-field-box form-label w-100 mb-0">
              {t("transportation.tripCharge" as MessageKey)}
              <input className="form-control mt-1"
                type="number"
                min={0}
                step="any"
                disabled={!transportationEditableEffective}
                value={form.tripCharge}
                onChange={(e) => setForm({ ...form, tripCharge: e.target.value })}
              />
            </label>
            <label className="form-field-box form-label w-100 mb-0">
              {t("transportation.waitingCharge" as MessageKey)}
              <input className="form-control mt-1"
                type="number"
                min={0}
                step="any"
                disabled={!transportationEditableEffective}
                value={form.waitingCharge}
                onChange={(e) => setForm({ ...form, waitingCharge: e.target.value })}
              />
            </label>
            <label className="form-field-box form-label w-100 mb-0">
              {t("transportation.maccrikCharge" as MessageKey)}
              <input className="form-control mt-1"
                type="number"
                min={0}
                step="any"
                disabled={!transportationEditableEffective}
                value={form.maccrikCharge}
                onChange={(e) => setForm({ ...form, maccrikCharge: e.target.value })}
              />
            </label>
          </FormSection>
        ) : null}

        <FormSection title={t("form.workflowStatusSection")}>
        <label className="form-field-box form-label w-100 mb-0">
          {t("form.documentPostalNumber")}
          <input className="form-control mt-1"
            disabled={!customsEditableEffective}
            value={form.documentPostalNumber}
            onChange={(e) => setForm({ ...form, documentPostalNumber: e.target.value })}
          />
        </label>
        <label className="form-field-box form-label w-100 mb-0">
          {t("form.stopTransaction")}
          <select className="form-select mt-1" disabled={!legacyStorageEditable} value={form.isStopped} onChange={(e) => setForm({ ...form, isStopped: e.target.value as "no" | "yes" })}>
            <option value="no">{t("form.no")}</option>
            <option value="yes">{t("form.yes")}</option>
          </select>
        </label>
        {form.isStopped === "yes" ? (
          <label className="form-field-box form-label w-100 mb-0">
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
        <label className="form-field-box form-label w-100 mb-0">
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
        <label className="form-field-box form-label w-100 mb-0">
          {t("form.paymentStatus")}
          <select className="form-select mt-1"
            value={form.paymentStatus}
            onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as "pending" | "paid" })}
            disabled={!(role === "manager" || role === "accountant")}
          >
            <option value="pending">{t("form.paymentStatus.pending")}</option>
            <option value="paid">{t("form.paymentStatus.paid")}</option>
          </select>
        </label>
        </FormSection>

        <FormSection title={t("form.attachmentsSection")}>
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
                  <label className="form-field-box form-label w-100 mb-0" key={`${item.file.name}-${idx}`}>
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
        </FormSection>

        {fullyLocked ? (
          <p className="muted mb-3" role="status">
            {t("form.saveLockedHint")}
          </p>
        ) : null}
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-primary" type="submit" disabled={loading || fullyLocked}>
            {loading ? t("form.saving") : t("form.save")}
          </button>
        </div>
      </form>
    </main>
  );
}
