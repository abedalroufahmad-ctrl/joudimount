export type GoodsQuality = "new" | "like_new" | "used" | "refurbished" | "damaged" | "mixed";

export type GoodsUnit = "kg" | "ton" | "piece" | "carton" | "pallet" | "cbm" | "liter" | "set";
export type InvoiceCurrency = "AED" | "USD" | "EUR" | "SAR";
export type DocumentCategory = "bill_of_lading" | "certificate_of_origin" | "invoice" | "packing_list";
export type TransactionStage =
  | "PREPARATION"
  | "CUSTOMS_CLEARANCE"
  | "TRANSPORTATION"
  | "STORAGE";

export type StorageSubStage = "INPUT" | "OUTPUT" | "SEAL";

export interface DocumentAttachment {
  path: string;
  originalName: string;
  category?: DocumentCategory;
}

export interface Transaction {
  id: string;
  clientName: string;
  shippingCompanyId?: string;
  shippingCompanyName: string;
  declarationNumber: string;
  declarationNumber2?: string;
  declarationDate?: string;
  orderDate?: string;
  declarationType?: string;
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
  originCountry: string;
  invoiceValue: number;
  invoiceCurrency?: InvoiceCurrency;
  riskLevel: string;
  channel: string;
  documentStatus: "copy_received" | "original_received" | "telex_release";
  clearanceStatus: string;
  paymentStatus: "pending" | "paid";
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
  stopReason?: string;
  documentPostalNumber?: string;
  goodsQuantity?: number;
  goodsQuality?: GoodsQuality;
  goodsUnit?: GoodsUnit;
  storageSubStage?: StorageSubStage;
  storageEntryDate?: string;
  storageWorkersWages?: number;
  storageWorkersCompany?: string;
  storageStoreName?: string;
  storageSizeCbm?: number;
  storageFreightVehicleNumbers?: string;
  storageCrossPackaging?: string;
  storageUnity?: string;
  storageSealNumber?: string;
  storageInputEntryDate?: string;
  storageInputWorkersWages?: number;
  storageInputWorkersCompany?: string;
  storageInputStoreName?: string;
  storageInputVolumeCbm?: number;
  storageInputLoadingEquipmentFare?: number;
  storageExitEntryDate?: string;
  storageExitWorkersWages?: number;
  storageExitWorkersCompany?: string;
  storageExitStoreName?: string;
  storageExitVolumeCbm?: number;
  storageExitLoadingEquipmentFare?: number;
  storageExitFreightVehicleNumbers?: string;
  storageExitCrossPackaging?: string;
  storageExitUnity?: string;
  storageSealReplaceContainers?: string;
  storageSealSwitchDate?: string;
  storageSealEntryContainerNumbers?: string;
  storageSealUnitCount?: string;
  storageSealWorkersCompany?: string;
  storageSealWorkersWages?: number;
  transactionStage: TransactionStage;
  createdAt: string;
  updatedAt: string;
}

export const API_BASE = "http://localhost:4000";

export type Role = "manager" | "employee" | "employee2" | "accountant";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
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

export interface ShippingCompany {
  id: string;
  companyName: string;
  code: string;
  contactName?: string;
  phone?: string;
  email?: string;
  /** Default dispatch form message; prefilled in the print dialog for employees to edit. */
  dispatchFormTemplate?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  status: "active" | "inactive";
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
}
