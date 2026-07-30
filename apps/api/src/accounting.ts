import { z } from "zod";
import { optionalNonNegativeNumber, optionalPositiveNumber } from "./transactionSchemas.js";
import type { AccountingCustomField, Transaction } from "./types.js";

export const accountingCustomFieldSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  value: z.string(),
});

export const accountingFixedPayloadSchema = z.object({
  invoiceValue: optionalPositiveNumber,
  invoiceCurrency: z.enum(["AED", "USD", "EUR", "SAR"]).optional(),
  tripCharge: optionalNonNegativeNumber,
  waitingCharge: optionalNonNegativeNumber,
  maccrikCharge: optionalNonNegativeNumber,
  paymentStatus: z.enum(["pending", "paid"]).optional(),
  storageInputWorkersWages: optionalNonNegativeNumber,
  storageExitWorkersWages: optionalNonNegativeNumber,
  storageSealWorkersWages: optionalNonNegativeNumber,
  storageInputLoadingEquipmentFare: optionalNonNegativeNumber,
  storageExitLoadingEquipmentFare: optionalNonNegativeNumber,
  /** Tax invoice line items (JOUDI cargo invoice) */
  deliveryOrderCharge: optionalNonNegativeNumber,
  customsDeclarationCharge: optionalNonNegativeNumber,
  freightShippingCompanyCharge: optionalNonNegativeNumber,
  customsBillCdrCopyCharge: optionalNonNegativeNumber,
  portChargeDpw: optionalNonNegativeNumber,
  inspectionForMerciCharge: optionalNonNegativeNumber,
  clearingCharges: optionalNonNegativeNumber,
  exitCertificateCharge: optionalNonNegativeNumber,
  manifestSgaServicesCharge: optionalNonNegativeNumber,
  gatePassCharge: optionalNonNegativeNumber,
  toCharge: optionalNonNegativeNumber,
  labourCharge: optionalNonNegativeNumber,
  repackingCharge: optionalNonNegativeNumber,
  exitSummitDoCustomsCharge: optionalNonNegativeNumber,
  vatAmount: optionalNonNegativeNumber,
});

export const updateAccountingPayloadSchema = z.object({
  fixed: accountingFixedPayloadSchema,
  customFields: z.array(accountingCustomFieldSchema),
  isAccountingFinalized: z.boolean().optional(),
});

export type AccountingFixedPayload = z.infer<typeof accountingFixedPayloadSchema>;

export function createEmptyAccountingField(): AccountingCustomField {
  return { id: crypto.randomUUID(), title: "", value: "" };
}

export function normalizeAccountingCustomFields(
  raw: AccountingCustomField[] | undefined,
): AccountingCustomField[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f) => ({ id: f.id, title: f.title ?? "", value: f.value ?? "" }));
}

export function sanitizeAccountingCustomFieldsForSave(
  raw: AccountingCustomField[],
): AccountingCustomField[] {
  return raw.map((f) => ({
    id: (f.id && String(f.id).trim()) || crypto.randomUUID(),
    title: f.title ?? "",
    value: f.value ?? "",
  }));
}

const ACCOUNTING_TOTAL_KEYS = [
  "invoiceValue",
  "tripCharge",
  "waitingCharge",
  "maccrikCharge",
  "storageInputWorkersWages",
  "storageExitWorkersWages",
  "storageSealWorkersWages",
  "storageInputLoadingEquipmentFare",
  "storageExitLoadingEquipmentFare",
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
  "toCharge",
  "labourCharge",
  "repackingCharge",
  "exitSummitDoCustomsCharge",
  "vatAmount",
] as const;

export function parseAccountingCustomFieldAmount(value: string | undefined): number {
  const t = (value ?? "").trim().replace(/,/g, "");
  if (!t) return 0;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function computeAccountingTotal(
  fixed: Record<string, number | string | undefined>,
  customFields: AccountingCustomField[] | undefined,
): number {
  let sum = 0;
  for (const key of ACCOUNTING_TOTAL_KEYS) {
    const v = fixed[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) sum += v;
  }
  if (customFields) {
    for (const f of customFields) sum += parseAccountingCustomFieldAmount(f.value);
  }
  return sum;
}

export function buildAccountingFixedFields(tx: Transaction): AccountingFixedPayload {
  return {
    invoiceValue: tx.invoiceValue,
    invoiceCurrency: tx.invoiceCurrency,
    tripCharge: tx.tripCharge,
    waitingCharge: tx.waitingCharge,
    maccrikCharge: tx.maccrikCharge,
    paymentStatus: tx.paymentStatus,
    storageInputWorkersWages: tx.storageInputWorkersWages,
    storageExitWorkersWages: tx.storageExitWorkersWages,
    storageSealWorkersWages: tx.storageSealWorkersWages,
    storageInputLoadingEquipmentFare: tx.storageInputLoadingEquipmentFare,
    storageExitLoadingEquipmentFare: tx.storageExitLoadingEquipmentFare,
    deliveryOrderCharge: tx.deliveryOrderCharge,
    customsDeclarationCharge: tx.customsDeclarationCharge,
    freightShippingCompanyCharge: tx.freightShippingCompanyCharge,
    customsBillCdrCopyCharge: tx.customsBillCdrCopyCharge,
    portChargeDpw: tx.portChargeDpw,
    inspectionForMerciCharge: tx.inspectionForMerciCharge,
    clearingCharges: tx.clearingCharges,
    exitCertificateCharge: tx.exitCertificateCharge,
    manifestSgaServicesCharge: tx.manifestSgaServicesCharge,
    gatePassCharge: tx.gatePassCharge,
    toCharge: tx.toCharge,
    labourCharge: tx.labourCharge,
    repackingCharge: tx.repackingCharge,
    exitSummitDoCustomsCharge: tx.exitSummitDoCustomsCharge,
    vatAmount: tx.vatAmount,
  };
}

export function buildAccountingResponse(tx: Transaction) {
  const fixed = buildAccountingFixedFields(tx);
  const customFields = normalizeAccountingCustomFields(tx.accountingCustomFields);
  return {
    id: tx.id,
    clientName: tx.clientName,
    declarationNumber: tx.declarationNumber,
    fixed,
    customFields,
    total: computeAccountingTotal(fixed, customFields),
    isAccountingFinalized: tx.isAccountingFinalized,
    accountingInvoices: tx.accountingInvoices ?? [],
  };
}
