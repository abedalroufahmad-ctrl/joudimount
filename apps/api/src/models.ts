import mongoose, { Schema } from "mongoose";
import type {
  Channel,
  ClearanceStatus,
  DocumentStatus,
  GoodsQuality,
  GoodsUnit,
  InvoiceCurrency,
  PaymentStatus,
  RiskLevel,
  XrayResult,
} from "./types.js";

interface ClientDoc {
  companyName: string;
  trn: string;
  immigrationCode?: string;
  email?: string;
  country?: string;
  creditLimit: number;
  status: "active" | "suspended";
}

/** Atomic sequence for declaration numbers (avoids E11000 under concurrent creates). */
interface CounterDoc {
  _id: string;
  seq: number;
}

interface EmployeeDoc {
  name: string;
  email: string;
  password: string;
  role: "manager" | "employee" | "employee2" | "accountant";
  fcmTokens?: string[];
}

interface NotificationDoc {
  recipientId: mongoose.Types.ObjectId;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  title: string;
  message: string;
  read: boolean;
}

interface ShippingCompanyDoc {
  companyName: string;
  code: string;
  contactName?: string;
  phone?: string;
  email?: string;
  /** Default text for the shipping dispatch form notes area; employees can edit per print. */
  dispatchFormTemplate?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  status: "active" | "inactive";
}

interface TransactionDoc {
  clientId?: string;
  clientName: string;
  shippingCompanyId?: string;
  shippingCompanyName: string;
  declarationNumber: string;
  declarationNumber2?: string;
  declarationDate?: Date;
  orderDate?: Date;
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
  documentAttachments?: {
    path: string;
    originalName: string;
    category?: "bill_of_lading" | "certificate_of_origin" | "invoice" | "packing_list";
  }[];
  containerCount?: number;
  goodsWeightKg?: number;
  containerArrivalDate?: Date;
  documentArrivalDate?: Date;
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
  storageSubStage?: "INPUT" | "OUTPUT" | "SEAL";
  storageEntryDate?: Date;
  storageWorkersWages?: number;
  storageWorkersCompany?: string;
  storageStoreName?: string;
  storageSizeCbm?: number;
  storageFreightVehicleNumbers?: string;
  storageCrossPackaging?: string;
  storageUnity?: string;
  storageSealNumber?: string;
  storageInputEntryDate?: Date;
  storageInputWorkersWages?: number;
  storageInputWorkersCompany?: string;
  storageInputStoreName?: string;
  storageInputVolumeCbm?: number;
  storageInputLoadingEquipmentFare?: number;
  storageExitEntryDate?: Date;
  storageExitWorkersWages?: number;
  storageExitWorkersCompany?: string;
  storageExitStoreName?: string;
  storageExitVolumeCbm?: number;
  storageExitLoadingEquipmentFare?: number;
  storageExitFreightVehicleNumbers?: string;
  storageExitCrossPackaging?: string;
  storageExitUnity?: string;
  storageSealReplaceContainers?: string;
  storageSealEntryLockNumbers?: string;
  storageSealSwitchDate?: Date;
  storageSealEntryContainerNumbers?: string;
  storageSealOutLockNumbers?: string;
  storageSealUnitCount?: string;
  storageSealWorkersCompany?: string;
  storageSealWorkersWages?: number;
  accountingCustomFields?: { id: string; title: string; value: string }[];
  transactionStage: "PREPARATION" | "CUSTOMS_CLEARANCE" | "TRANSPORTATION" | "STORAGE";
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<ClientDoc>(
  {
    companyName: { type: String, required: true },
    trn: { type: String, required: true, unique: true },
    immigrationCode: { type: String },
    email: { type: String },
    country: { type: String },
    creditLimit: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
  },
  { timestamps: true },
);

const transactionSchema = new Schema<TransactionDoc>(
  {
    clientId: { type: String, index: true },
    clientName: { type: String, required: true, index: true },
    shippingCompanyId: { type: String, index: true },
    shippingCompanyName: { type: String, required: true, index: true },
    declarationNumber: { type: String, required: true, unique: true, index: true },
    declarationNumber2: { type: String },
    declarationDate: { type: Date },
    orderDate: { type: Date },
    declarationType: { type: String },
    declarationType2: { type: String },
    portType: { type: String },
    containerSize: { type: String },
    portOfLading: { type: String },
    portOfDischarge: { type: String },
    destination: { type: String },
    transportationTo: { type: String },
    trachNo: { type: String },
    transportationCompany: { type: String },
    transportationFrom: { type: String },
    transportationToLocation: { type: String },
    tripCharge: { type: Number },
    waitingCharge: { type: Number },
    maccrikCharge: { type: Number },
    airwayBill: { type: String, required: true },
    hsCode: { type: String, required: true },
    goodsDescription: { type: String, required: true },
    invoiceValue: { type: Number, required: true },
    invoiceCurrency: { type: String, enum: ["AED", "USD", "EUR", "SAR"], default: "AED" },
    originCountry: { type: String, required: true },
    documentStatus: { type: String, enum: ["copy_received", "original_received", "telex_release"], default: "copy_received" },
    clearanceStatus: {
      type: String,
      enum: [
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
      ],
      default: "DRAFT",
    },
    riskLevel: { type: String, enum: ["low", "medium", "high"], default: "low" },
    channel: { type: String, enum: ["green", "yellow", "red"], default: "green" },
    paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
    xrayResult: { type: String, enum: ["not_required", "passed", "manual_inspection"], default: "not_required" },
    releaseCode: { type: String },
    documentAttachments: [
      {
        path: { type: String, required: true },
        originalName: { type: String, required: true },
        category: {
          type: String,
          enum: ["bill_of_lading", "certificate_of_origin", "invoice", "packing_list"],
        },
      },
    ],
    containerCount: { type: Number },
    goodsWeightKg: { type: Number },
    containerArrivalDate: { type: Date },
    documentArrivalDate: { type: Date },
    fileNumber: { type: String },
    containerNumbers: [{ type: String }],
    unitCount: { type: String },
    unitNumber: { type: Number },
    isStopped: { type: Boolean, default: false },
    holdReason: { type: String },
    stopReason: { type: String },
    documentPostalNumber: { type: String },
    goodsQuantity: { type: Number },
    goodsQuality: {
      type: String,
      enum: ["new", "like_new", "used", "refurbished", "damaged", "mixed"],
    },
    goodsUnit: {
      type: String,
      enum: ["kg", "ton", "piece", "carton", "pallet", "cbm", "liter", "set"],
    },
    storageSubStage: { type: String, enum: ["INPUT", "OUTPUT", "SEAL"] },
    storageEntryDate: { type: Date },
    storageWorkersWages: { type: Number },
    storageWorkersCompany: { type: String },
    storageStoreName: { type: String },
    storageSizeCbm: { type: Number },
    storageFreightVehicleNumbers: { type: String },
    storageCrossPackaging: { type: String },
    storageUnity: { type: String },
    storageSealNumber: { type: String },
    storageInputEntryDate: { type: Date },
    storageInputWorkersWages: { type: Number },
    storageInputWorkersCompany: { type: String },
    storageInputStoreName: { type: String },
    storageInputVolumeCbm: { type: Number },
    storageInputLoadingEquipmentFare: { type: Number },
    storageExitEntryDate: { type: Date },
    storageExitWorkersWages: { type: Number },
    storageExitWorkersCompany: { type: String },
    storageExitStoreName: { type: String },
    storageExitVolumeCbm: { type: Number },
    storageExitLoadingEquipmentFare: { type: Number },
    storageExitFreightVehicleNumbers: { type: String },
    storageExitCrossPackaging: { type: String },
    storageExitUnity: { type: String },
    storageSealReplaceContainers: { type: String },
    storageSealEntryLockNumbers: { type: String },
    storageSealSwitchDate: { type: Date },
    storageSealEntryContainerNumbers: { type: String },
    storageSealOutLockNumbers: { type: String },
    storageSealUnitCount: { type: String },
    storageSealWorkersCompany: { type: String },
    storageSealWorkersWages: { type: Number },
    accountingCustomFields: [
      {
        id: { type: String, required: true },
        title: { type: String, default: "" },
        value: { type: String, default: "" },
      },
    ],
    transactionStage: {
      type: String,
      enum: ["PREPARATION", "CUSTOMS_CLEARANCE", "TRANSPORTATION", "STORAGE"],
      default: "PREPARATION",
      index: true,
    },
  },
  { timestamps: true },
);

const employeeSchema = new Schema<EmployeeDoc>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["manager", "employee", "employee2", "accountant"], required: true },
    fcmTokens: { type: [String], default: [] },
  },
  { timestamps: true },
);

const notificationSchema = new Schema<NotificationDoc>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    actorId: { type: String, required: true },
    actorName: { type: String, required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    entityLabel: { type: String },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const shippingCompanySchema = new Schema<ShippingCompanyDoc>(
  {
    companyName: { type: String, required: true },
    code: { type: String, required: true, unique: true, index: true },
    contactName: { type: String },
    phone: { type: String },
    email: { type: String },
    dispatchFormTemplate: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    location: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

const counterSchema = new Schema<CounterDoc>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true },
  },
  { collection: "counters" },
);

export const ClientModel = mongoose.models.Client || mongoose.model<ClientDoc>("Client", clientSchema);
export const TransactionModel =
  mongoose.models.Transaction || mongoose.model<TransactionDoc>("Transaction", transactionSchema);
export const TransferModel =
  mongoose.models.Transfer || mongoose.model<TransactionDoc>("Transfer", transactionSchema);
export const ExportModel =
  mongoose.models.Export || mongoose.model<TransactionDoc>("Export", transactionSchema);
export const EmployeeModel = mongoose.models.Employee || mongoose.model<EmployeeDoc>("Employee", employeeSchema);
export const NotificationModel =
  mongoose.models.Notification || mongoose.model<NotificationDoc>("Notification", notificationSchema);
export const ShippingCompanyModel =
  mongoose.models.ShippingCompany || mongoose.model<ShippingCompanyDoc>("ShippingCompany", shippingCompanySchema);
export const CounterModel = mongoose.models.Counter || mongoose.model<CounterDoc>("Counter", counterSchema);
