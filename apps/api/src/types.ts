export type Role = "admin" | "client";

export type DocumentStatus = "copy_received" | "original_received" | "telex_release";
export type RiskLevel = "low" | "medium" | "high";
export type Channel = "green" | "yellow" | "red";
export type PaymentStatus = "pending" | "paid";
export type XrayResult = "not_required" | "passed" | "manual_inspection";
export type TransactionStage =
  | "PREPARATION"
  | "CUSTOMS_CLEARANCE"
  | "TRANSPORTATION"
  | "STORAGE";

/** Sub-steps within main Storage stage (warehouse card). */
export type StorageSubStage = "INPUT" | "OUTPUT" | "SEAL";

export type ClearanceStatus =
  | "DRAFT"
  | "SUBMITTED_TO_CUSTOMS"
  | "RISK_ASSESSMENT"
  | "GREEN_CHANNEL"
  | "YELLOW_CHANNEL"
  | "RED_CHANNEL"
  | "XRAY_QUEUED"
  | "XRAY_PASSED"
  | "MANUAL_INSPECTION_REQUIRED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "E_RELEASE_ISSUED"
  | "DELIVERED";

export type GoodsQuality = "new" | "like_new" | "used" | "refurbished" | "damaged" | "mixed";

export type GoodsUnit = "kg" | "ton" | "piece" | "carton" | "pallet" | "cbm" | "liter" | "set";
export type InvoiceCurrency = "AED" | "USD" | "EUR" | "SAR";
export type DocumentCategory = "bill_of_lading" | "certificate_of_origin" | "invoice" | "packing_list";

export interface DocumentAttachment {
  path: string;
  originalName: string;
  category?: DocumentCategory;
}

export type AppUserRole = "manager" | "employee" | "employee2" | "accountant";

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: AppUserRole;
}

export interface Client {
  id: string;
  companyName: string;
  trn: string;
  immigrationCode?: string;
  email?: string;
  country?: string;
  creditLimit: number;
  status: "active" | "suspended";
}

export interface Transaction {
  id: string;
  clientId?: string;
  clientName: string;
  shippingCompanyId?: string;
  shippingCompanyName: string;
  declarationNumber: string;
  /** Second DEC NO (e.g. transit / FZ paired declarations). */
  declarationNumber2?: string;
  declarationDate?: string;
  orderDate?: string;
  declarationType?: string;
  /** Second DEC TYPE when two declaration types apply. */
  declarationType2?: string;
  portType?: string;
  containerSize?: string;
  portOfLading?: string;
  portOfDischarge?: string;
  destination?: string;
  transportationTo?: string;
  trachNo?: string;
  transportationCompany?: string;
  transportationFrom?: string;
  transportationToLocation?: string;
  tripCharge?: number;
  waitingCharge?: number;
  maccrikCharge?: number;
  airwayBill: string;
  hsCode: string;
  goodsDescription: string;
  invoiceValue: number;
  invoiceCurrency?: InvoiceCurrency;
  originCountry: string;
  documentStatus: DocumentStatus;
  clearanceStatus: ClearanceStatus;
  riskLevel: RiskLevel;
  channel: Channel;
  paymentStatus: PaymentStatus;
  xrayResult: XrayResult;
  releaseCode?: string;
  documentAttachments?: DocumentAttachment[];
  containerCount?: number;
  goodsWeightKg?: number;
  invoiceToWeightRateAedPerKg?: number;
  containerArrivalDate?: string;
  documentArrivalDate?: string;
  fileNumber?: string;
  containerNumbers?: string[];
  unitCount?: string;
  unitNumber?: number;
  isStopped?: boolean;
  holdReason?: string;
  stopReason?: string;
  documentPostalNumber?: string;
  goodsQuantity?: number;
  goodsQuality?: GoodsQuality;
  goodsUnit?: GoodsUnit;
  /** Active tab within Storage (defaults to INPUT when entering Storage). */
  storageSubStage?: StorageSubStage;
  /** @deprecated Legacy flat storage; mapped from DB for older records. */
  storageEntryDate?: string;
  storageWorkersWages?: number;
  storageWorkersCompany?: string;
  storageStoreName?: string;
  storageSizeCbm?: number;
  storageFreightVehicleNumbers?: string;
  storageCrossPackaging?: string;
  storageUnity?: string;
  storageSealNumber?: string;
  /** A — Input (entry) data */
  storageInputEntryDate?: string;
  storageInputWorkersWages?: number;
  storageInputWorkersCompany?: string;
  storageInputStoreName?: string;
  storageInputVolumeCbm?: number;
  storageInputLoadingEquipmentFare?: number;
  /** B — Exit data */
  storageExitEntryDate?: string;
  storageExitWorkersWages?: number;
  storageExitWorkersCompany?: string;
  storageExitStoreName?: string;
  storageExitVolumeCbm?: number;
  storageExitLoadingEquipmentFare?: number;
  storageExitFreightVehicleNumbers?: string;
  storageExitCrossPackaging?: string;
  storageExitUnity?: string;
  /** C — Seal */
  storageSealReplaceContainers?: string;
  storageSealEntryLockNumbers?: string;
  storageSealSwitchDate?: string;
  storageSealEntryContainerNumbers?: string;
  storageSealOutLockNumbers?: string;
  storageSealUnitCount?: string;
  storageSealWorkersCompany?: string;
  storageSealWorkersWages?: number;
  transactionStage: TransactionStage;
  createdAt: string;
  updatedAt: string;
}
