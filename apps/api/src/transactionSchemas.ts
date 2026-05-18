import { z } from "zod";

const emptyToUndef = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : v);

export const optionalPositiveNumber = z.preprocess(emptyToUndef, z.coerce.number().positive().optional());

/** Optional number ≥ 0 (quantity, weight after rounding, etc.). */
export const optionalNonNegativeNumber = z.preprocess(emptyToUndef, z.coerce.number().nonnegative().optional());

export const optionalNonNegativeInt = z.preprocess(emptyToUndef, z.coerce.number().int().nonnegative().optional());
export const optionalBoolean = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v != 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }
  return v;
}, z.boolean().optional());

export const requiredBoolean = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }
  return v;
}, z.boolean());

export const optionalDateIso = z.preprocess(emptyToUndef, z.string().optional());

export const optionalPostal = z.preprocess(emptyToUndef, z.string().max(120).optional());
export const optionalFileNumber = z.preprocess(emptyToUndef, z.string().max(120).optional());
export const optionalStopReason = z.preprocess(emptyToUndef, z.string().max(500).optional());
export const optionalHoldReason = z.preprocess(emptyToUndef, z.string().max(500).optional());

const optionalStorageShort = z.preprocess(emptyToUndef, z.string().max(120).optional());
const optionalStorageMedium = z.preprocess(emptyToUndef, z.string().max(200).optional());
const optionalStorageLong = z.preprocess(emptyToUndef, z.string().max(500).optional());
const optionalStorageSubStage = z.preprocess(emptyToUndef, z.enum(["INPUT", "OUTPUT", "SEAL"]).optional());

const parseOptionalStringArray = (v: unknown): string[] | undefined => {
  if (v == null || v === "") return undefined;
  if (Array.isArray(v)) {
    return v
      .map((x) => String(x).trim())
      .filter((x) => x.length > 0);
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return undefined;
    try {
      const parsed = JSON.parse(s) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((x) => String(x).trim())
          .filter((x) => x.length > 0);
      }
    } catch {
      // Fallback to CSV/newline parsing.
    }
    return s
      .split(/[\n,]+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  }
  return undefined;
};

export const optionalContainerNumbers = z.preprocess(
  parseOptionalStringArray,
  z.array(z.string().min(1).max(60)).max(200).optional(),
);

export const goodsQualityEnum = z.enum(["new", "like_new", "used", "refurbished", "damaged", "mixed"]);

export const goodsUnitEnum = z.enum(["kg", "ton", "piece", "carton", "pallet", "cbm", "liter", "set"]);
export const declarationTypeEnum = z.enum([
  "Import",
  "Import to Free Zone",
  "Import for Re-Export",
  "Temporary Import",
  "Transfer",
  "Transitin",
  "Transitin from GCC",
  "Export",
  "Transit out",
  "Export to GCC",
]);
export const portTypeEnum = z.enum(["Seaports", "Free Zones", "Mainland"]);

export const optionalGoodsQuality = z.preprocess(emptyToUndef, goodsQualityEnum.optional());

export const optionalGoodsUnit = z.preprocess(emptyToUndef, goodsUnitEnum.optional());
export const optionalDeclarationType = z.preprocess(emptyToUndef, declarationTypeEnum.optional());
export const optionalPortType = z.preprocess(emptyToUndef, portTypeEnum.optional());
export const optionalInvoiceCurrency = z.preprocess(
  emptyToUndef,
  z.enum(["AED", "USD", "EUR", "SAR"]).optional(),
);

export const createTransactionPayloadSchema = z.object({
  clientName: z.string().min(2),
  clientId: z.preprocess(emptyToUndef, z.string().optional()),
  shippingCompanyId: z.preprocess(emptyToUndef, z.string().optional()),
  shippingCompanyName: z.string().min(2),
  declarationNumber: z.preprocess(emptyToUndef, z.string().min(2).optional()),
  declarationNumber2: z.preprocess(emptyToUndef, z.string().min(1).max(120).optional()),
  declarationDate: optionalDateIso,
  orderDate: optionalDateIso,
  declarationType: optionalDeclarationType,
  declarationType2: optionalDeclarationType,
  portType: optionalPortType,
  containerSize: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  portOfLading: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  portOfDischarge: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  destination: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  transportationTo: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  trachNo: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  transportationCompany: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  transportationFrom: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  transportationToLocation: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  tripCharge: optionalNonNegativeNumber,
  waitingCharge: optionalNonNegativeNumber,
  maccrikCharge: optionalNonNegativeNumber,
  airwayBill: z.string().min(1),
  hsCode: z.string().min(2),
  goodsDescription: z.string().min(2),
  invoiceValue: z.coerce.number().positive(),
  invoiceCurrency: optionalInvoiceCurrency,
  originCountry: z.string().length(2),
  containerCount: optionalNonNegativeInt,
  goodsWeightKg: optionalNonNegativeNumber,
  invoiceToWeightRateAedPerKg: optionalPositiveNumber,
  containerArrivalDate: optionalDateIso,
  documentArrivalDate: optionalDateIso,
  fileNumber: optionalFileNumber,
  containerNumbers: optionalContainerNumbers,
  unitCount: z.preprocess(emptyToUndef, z.string().optional()),
  unitNumber: optionalNonNegativeInt,
  isStopped: requiredBoolean,
  holdReason: optionalHoldReason,
  stopReason: optionalStopReason,
  documentPostalNumber: optionalPostal,
  goodsQuantity: optionalNonNegativeNumber,
  goodsQuality: optionalGoodsQuality,
  goodsUnit: optionalGoodsUnit,
  storageEntryDate: optionalDateIso,
  storageWorkersWages: optionalNonNegativeNumber,
  storageWorkersCompany: optionalStorageMedium,
  storageStoreName: optionalStorageMedium,
  storageSizeCbm: optionalNonNegativeNumber,
  storageFreightVehicleNumbers: optionalStorageLong,
  storageCrossPackaging: optionalStorageMedium,
  storageUnity: optionalStorageShort,
  storageSealNumber: optionalStorageShort,
  storageSubStage: optionalStorageSubStage,
  storageInputEntryDate: optionalDateIso,
  storageInputWorkersWages: optionalNonNegativeNumber,
  storageInputWorkersCompany: optionalStorageMedium,
  storageInputStoreName: optionalStorageMedium,
  storageInputVolumeCbm: optionalNonNegativeNumber,
  storageInputLoadingEquipmentFare: optionalNonNegativeNumber,
  storageExitEntryDate: optionalDateIso,
  storageExitWorkersWages: optionalNonNegativeNumber,
  storageExitWorkersCompany: optionalStorageMedium,
  storageExitStoreName: optionalStorageMedium,
  storageExitVolumeCbm: optionalNonNegativeNumber,
  storageExitLoadingEquipmentFare: optionalNonNegativeNumber,
  storageExitFreightVehicleNumbers: optionalStorageLong,
  storageExitCrossPackaging: optionalStorageMedium,
  storageExitUnity: optionalStorageShort,
  storageSealReplaceContainers: optionalStorageLong,
  storageSealEntryLockNumbers: optionalStorageLong,
  storageSealSwitchDate: optionalDateIso,
  storageSealEntryContainerNumbers: optionalStorageLong,
  storageSealOutLockNumbers: optionalStorageLong,
  storageSealUnitCount: z.preprocess(emptyToUndef, z.string().optional()),
  storageSealWorkersCompany: optionalStorageMedium,
  storageSealWorkersWages: optionalNonNegativeNumber,
});

export const updateTransactionPayloadSchema = z
  .object({
    clientName: z.string().min(2).optional(),
    clientId: z.preprocess(emptyToUndef, z.string().optional()),
    shippingCompanyId: z.preprocess(emptyToUndef, z.string().optional()),
    shippingCompanyName: z.string().min(2).optional(),
    declarationNumber: z.preprocess(emptyToUndef, z.string().min(2).optional()),
    declarationNumber2: z.preprocess(emptyToUndef, z.string().min(1).max(120).optional()),
    declarationDate: optionalDateIso,
    orderDate: optionalDateIso,
    declarationType: optionalDeclarationType,
    declarationType2: optionalDeclarationType,
    portType: optionalPortType,
    containerSize: z.preprocess(emptyToUndef, z.string().max(120).optional()),
    portOfLading: z.preprocess(emptyToUndef, z.string().max(120).optional()),
    portOfDischarge: z.preprocess(emptyToUndef, z.string().max(120).optional()),
    destination: z.preprocess(emptyToUndef, z.string().max(120).optional()),
    transportationTo: z.preprocess(emptyToUndef, z.string().max(120).optional()),
    trachNo: z.preprocess(emptyToUndef, z.string().max(120).optional()),
    transportationCompany: z.preprocess(emptyToUndef, z.string().max(120).optional()),
    transportationFrom: z.preprocess(emptyToUndef, z.string().max(120).optional()),
    transportationToLocation: z.preprocess(emptyToUndef, z.string().max(120).optional()),
    tripCharge: optionalNonNegativeNumber,
    waitingCharge: optionalNonNegativeNumber,
    maccrikCharge: optionalNonNegativeNumber,
    airwayBill: z.string().min(1).optional(),
    hsCode: z.string().min(2).optional(),
    goodsDescription: z.string().min(2).optional(),
    invoiceValue: z.coerce.number().positive().optional(),
    invoiceCurrency: optionalInvoiceCurrency,
    originCountry: z.string().length(2).optional(),
    documentStatus: z.enum(["copy_received", "original_received", "telex_release"]).optional(),
    clearanceStatus: z
      .enum([
        "DRAFT",
        "SUBMITTED_TO_CUSTOMS",
        "RISK_ASSESSMENT",
        "GREEN_CHANNEL",
        "YELLOW_CHANNEL",
        "RED_CHANNEL",
        "XRAY_QUEUED",
        "XRAY_PASSED",
        "MANUAL_INSPECTION_REQUIRED",
        "PAYMENT_PENDING",
        "PAID",
        "E_RELEASE_ISSUED",
        "DELIVERED",
      ])
      .optional(),
    paymentStatus: z.enum(["pending", "paid"]).optional(),
    containerCount: optionalNonNegativeInt,
    goodsWeightKg: optionalNonNegativeNumber,
    invoiceToWeightRateAedPerKg: optionalPositiveNumber,
    containerArrivalDate: optionalDateIso,
    documentArrivalDate: optionalDateIso,
    fileNumber: optionalFileNumber,
    containerNumbers: optionalContainerNumbers,
    unitCount: z.preprocess(emptyToUndef, z.string().optional()),
    unitNumber: optionalNonNegativeInt,
    isStopped: optionalBoolean,
    holdReason: optionalHoldReason,
    stopReason: optionalStopReason,
    documentPostalNumber: optionalPostal,
    goodsQuantity: optionalNonNegativeNumber,
    goodsQuality: optionalGoodsQuality,
    goodsUnit: optionalGoodsUnit,
    storageEntryDate: optionalDateIso,
    storageWorkersWages: optionalNonNegativeNumber,
    storageWorkersCompany: optionalStorageMedium,
    storageStoreName: optionalStorageMedium,
    storageSizeCbm: optionalNonNegativeNumber,
    storageFreightVehicleNumbers: optionalStorageLong,
    storageCrossPackaging: optionalStorageMedium,
    storageUnity: optionalStorageShort,
    storageSealNumber: optionalStorageShort,
    storageSubStage: optionalStorageSubStage,
    storageInputEntryDate: optionalDateIso,
    storageInputWorkersWages: optionalNonNegativeNumber,
    storageInputWorkersCompany: optionalStorageMedium,
    storageInputStoreName: optionalStorageMedium,
    storageInputVolumeCbm: optionalNonNegativeNumber,
    storageInputLoadingEquipmentFare: optionalNonNegativeNumber,
    storageExitEntryDate: optionalDateIso,
    storageExitWorkersWages: optionalNonNegativeNumber,
    storageExitWorkersCompany: optionalStorageMedium,
    storageExitStoreName: optionalStorageMedium,
    storageExitVolumeCbm: optionalNonNegativeNumber,
    storageExitLoadingEquipmentFare: optionalNonNegativeNumber,
    storageExitFreightVehicleNumbers: optionalStorageLong,
    storageExitCrossPackaging: optionalStorageMedium,
    storageExitUnity: optionalStorageShort,
    storageSealReplaceContainers: optionalStorageLong,
    storageSealEntryLockNumbers: optionalStorageLong,
    storageSealSwitchDate: optionalDateIso,
    storageSealEntryContainerNumbers: optionalStorageLong,
    storageSealOutLockNumbers: optionalStorageLong,
    storageSealUnitCount: z.preprocess(emptyToUndef, z.string().optional()),
    storageSealWorkersCompany: optionalStorageMedium,
    storageSealWorkersWages: optionalNonNegativeNumber,
  });
