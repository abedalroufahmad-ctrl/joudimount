import { promises as fs } from "fs";
import { assessRisk } from "./risk.js";
import {
  sanitizeAccountingCustomFieldsForSave,
  type AccountingFixedPayload,
} from "./accounting.js";
import type { UserRole } from "./auth.js";
import type {
  AccountingCustomField,
  Client,
  ClearanceStatus,
  DocumentAttachment,
  Employee,
  EmployeeProfile,
  Transaction,
  TransactionStage,
} from "./types.js";
import { ClientModel, CounterModel, EmployeeModel, ExportModel, ShippingCompanyModel, TransactionModel, TransferModel } from "./models.js";
import { absolutePathFromPublicPath } from "./uploads.js";
import { hashPassword } from "./password.js";

/** Single document in `counters` collection; $inc is atomic (fixes E11000 duplicate declarationNumber). */
const DECLARATION_COUNTER_ID = "declaration_dxb_2026";
const TRANSFER_DECLARATION_COUNTER_ID = "transfer_declaration_dxb_2026";
const EXPORT_DECLARATION_COUNTER_ID = "export_declaration_dxb_2026";

async function computeMaxDeclarationSeqFromExisting(
  model: { find: typeof TransactionModel.find },
  prefix = "DXB-2026",
): Promise<number> {
  const pattern = new RegExp(`^${prefix}-\\d+$`);
  const docs = await model
    .find({ declarationNumber: { $regex: pattern } })
    .select({ declarationNumber: 1 })
    .lean();
  let max = 0;
  for (const d of docs) {
    const last = d.declarationNumber?.split("-").pop();
    const n = Number(last);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

async function ensureDeclarationCounterInitialized(
  counterId: string,
  model: { find: typeof TransactionModel.find },
  prefix = "DXB-2026",
): Promise<void> {
  const exists = await CounterModel.exists({ _id: counterId });
  if (exists) return;
  const maxSeq = await computeMaxDeclarationSeqFromExisting(model, prefix);
  try {
    await CounterModel.create({ _id: counterId, seq: maxSeq });
  } catch (e: unknown) {
    const code = (e as { code?: number })?.code;
    if (code !== 11000) throw e;
  }
}

async function getNextDeclarationCounter(counterId: string, model: { find: typeof TransactionModel.find }, prefix = "DXB-2026"): Promise<number> {
  await ensureDeclarationCounterInitialized(counterId, model, prefix);
  const updated = (await CounterModel.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true },
  ).lean()) as { seq?: number } | null;
  if (!updated || typeof updated.seq !== "number") {
    throw new Error("Declaration counter update failed");
  }
  return updated.seq;
}

function generateDeclarationNumber(counter: number, prefix = "DXB-2026") {
  const padded = String(counter).padStart(6, "0");
  return `${prefix}-${padded}`;
}

function mapEmployeePublic(doc: any): Employee {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    role: doc.role,
  };
}

function mapEmployeeProfile(doc: any): EmployeeProfile {
  return {
    ...mapEmployeePublic(doc),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

export async function getEmployeeProfile(id: string): Promise<EmployeeProfile | null> {
  const doc = await EmployeeModel.findById(id).lean();
  return doc ? mapEmployeeProfile(doc) : null;
}

export async function listEmployees(): Promise<Employee[]> {
  const docs = await EmployeeModel.find().sort({ name: 1 }).lean();
  return docs.map(mapEmployeePublic);
}

export async function createEmployee(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<Employee> {
  const email = input.email.toLowerCase().trim();
  const created = await EmployeeModel.create({
    name: input.name.trim(),
    email,
    password: await hashPassword(input.password),
    role: input.role,
  });
  return mapEmployeePublic(created.toObject());
}

export async function updateEmployee(
  id: string,
  input: Partial<{ name: string; email: string; password: string; role: UserRole }>,
): Promise<Employee | null> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.email !== undefined) patch.email = input.email.toLowerCase().trim();
  if (input.password !== undefined && input.password.length > 0) {
    patch.password = await hashPassword(input.password);
  }
  if (input.role !== undefined) patch.role = input.role;
  if (Object.keys(patch).length === 0) {
    const existing = await EmployeeModel.findById(id).lean();
    return existing ? mapEmployeePublic(existing) : null;
  }
  const updated = await EmployeeModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean();
  return updated ? mapEmployeePublic(updated) : null;
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const deleted = await EmployeeModel.findByIdAndDelete(id).lean();
  return Boolean(deleted);
}

function mapClient(doc: any): Client {
  return {
    id: String(doc._id),
    companyName: doc.companyName,
    trn: doc.trn,
    immigrationCode: doc.immigrationCode,
    email: doc.email,
    country: doc.country,
    creditLimit: doc.creditLimit,
    status: doc.status,
  };
}

function mapOptionalDate(value: unknown): string | undefined {
  if (value == null) return undefined;
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function normalizeDateOnly(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string" && value.trim().length === 0) return undefined;
  const d = new Date(value as string | number | Date);
  if (Number.isNaN(d.getTime())) return typeof value === "string" ? value : undefined;
  return d.toISOString().slice(0, 10);
}

function sameTransactionField(key: keyof Transaction, nextValue: unknown, currentValue: unknown): boolean {
  if (
    key === "declarationDate" ||
    key === "orderDate" ||
    key === "containerArrivalDate" ||
    key === "documentArrivalDate" ||
    key === "storageEntryDate" ||
    key === "storageInputEntryDate" ||
    key === "storageExitEntryDate" ||
    key === "storageSealSwitchDate"
  ) {
    return normalizeDateOnly(nextValue) === normalizeDateOnly(currentValue);
  }
  if (Array.isArray(nextValue) || Array.isArray(currentValue)) {
    const a = Array.isArray(nextValue) ? nextValue : [];
    const b = Array.isArray(currentValue) ? currentValue : [];
    return JSON.stringify(a) === JSON.stringify(b);
  }
  if (nextValue == null && currentValue == null) return true;
  return nextValue === currentValue;
}

function mapTransaction(doc: any): Transaction {
  const attachments: DocumentAttachment[] | undefined = Array.isArray(doc.documentAttachments)
    ? doc.documentAttachments.map((a: { path: string; originalName: string; category?: DocumentAttachment["category"] }) => ({
        path: a.path,
        originalName: a.originalName,
        category: a.category,
      }))
    : undefined;

  return {
    id: String(doc._id),
    clientId: doc.clientId,
    clientName: doc.clientName ?? "Unknown Client",
    shippingCompanyId: doc.shippingCompanyId,
    shippingCompanyName: doc.shippingCompanyName ?? "Unknown Shipping Company",
    declarationNumber: doc.declarationNumber,
    declarationNumber2: doc.declarationNumber2,
    declarationDate: mapOptionalDate(doc.declarationDate),
    orderDate: mapOptionalDate(doc.orderDate),
    declarationType: doc.declarationType,
    declarationType2: doc.declarationType2,
    portType: doc.portType,
    containerSize: doc.containerSize,
    portOfLading: doc.portOfLading,
    portOfDischarge: doc.portOfDischarge,
    destination: doc.destination,
    transportationTo: doc.transportationTo,
    trachNo: doc.trachNo,
    transportationCompany: doc.transportationCompany,
    transportationFrom: doc.transportationFrom,
    transportationToLocation: doc.transportationToLocation,
    tripCharge: doc.tripCharge,
    waitingCharge: doc.waitingCharge,
    maccrikCharge: doc.maccrikCharge,
    airwayBill: doc.airwayBill,
    hsCode: doc.hsCode,
    goodsDescription: doc.goodsDescription,
    invoiceValue: doc.invoiceValue,
    invoiceCurrency: doc.invoiceCurrency,
    originCountry: doc.originCountry,
    documentStatus: doc.documentStatus,
    clearanceStatus: doc.clearanceStatus,
    riskLevel: doc.riskLevel,
    channel: doc.channel,
    paymentStatus: doc.paymentStatus,
    xrayResult: doc.xrayResult,
    releaseCode: doc.releaseCode,
    documentAttachments: attachments,
    containerCount: doc.containerCount,
    goodsWeightKg: doc.goodsWeightKg,
    containerArrivalDate: mapOptionalDate(doc.containerArrivalDate),
    documentArrivalDate: mapOptionalDate(doc.documentArrivalDate),
    fileNumber: doc.fileNumber,
    containerNumbers: Array.isArray(doc.containerNumbers) ? doc.containerNumbers : undefined,
    unitCount: doc.unitCount,
    unitNumber: doc.unitNumber,
    isStopped: doc.isStopped,
    holdReason: doc.holdReason,
    stopReason: doc.stopReason,
    documentPostalNumber: doc.documentPostalNumber,
    goodsQuantity: doc.goodsQuantity,
    goodsQuality: doc.goodsQuality,
    goodsUnit: doc.goodsUnit,
    storageSubStage: doc.storageSubStage,
    storageEntryDate: mapOptionalDate(doc.storageEntryDate),
    storageWorkersWages: doc.storageWorkersWages,
    storageWorkersCompany: doc.storageWorkersCompany,
    storageStoreName: doc.storageStoreName,
    storageSizeCbm: doc.storageSizeCbm,
    storageFreightVehicleNumbers: doc.storageFreightVehicleNumbers,
    storageCrossPackaging: doc.storageCrossPackaging,
    storageUnity: doc.storageUnity,
    storageSealNumber: doc.storageSealNumber,
    storageInputEntryDate: mapOptionalDate(doc.storageInputEntryDate ?? doc.storageEntryDate),
    storageInputWorkersWages: doc.storageInputWorkersWages ?? doc.storageWorkersWages,
    storageInputWorkersCompany: doc.storageInputWorkersCompany ?? doc.storageWorkersCompany,
    storageInputStoreName: doc.storageInputStoreName ?? doc.storageStoreName,
    storageInputVolumeCbm: doc.storageInputVolumeCbm ?? doc.storageSizeCbm,
    storageInputLoadingEquipmentFare: doc.storageInputLoadingEquipmentFare,
    storageExitEntryDate: mapOptionalDate(doc.storageExitEntryDate),
    storageExitWorkersWages: doc.storageExitWorkersWages,
    storageExitWorkersCompany: doc.storageExitWorkersCompany,
    storageExitStoreName: doc.storageExitStoreName,
    storageExitVolumeCbm: doc.storageExitVolumeCbm,
    storageExitLoadingEquipmentFare: doc.storageExitLoadingEquipmentFare,
    storageExitFreightVehicleNumbers: doc.storageExitFreightVehicleNumbers ?? doc.storageFreightVehicleNumbers,
    storageExitCrossPackaging: doc.storageExitCrossPackaging ?? doc.storageCrossPackaging,
    storageExitUnity: doc.storageExitUnity ?? doc.storageUnity,
    storageSealReplaceContainers: doc.storageSealReplaceContainers,
    storageSealEntryLockNumbers: doc.storageSealEntryLockNumbers,
    storageSealSwitchDate: mapOptionalDate(doc.storageSealSwitchDate),
    storageSealEntryContainerNumbers: doc.storageSealEntryContainerNumbers,
    storageSealOutLockNumbers: doc.storageSealOutLockNumbers,
    storageSealUnitCount: doc.storageSealUnitCount,
    storageSealWorkersCompany: doc.storageSealWorkersCompany,
    storageSealWorkersWages: doc.storageSealWorkersWages,
    accountingCustomFields: Array.isArray(doc.accountingCustomFields)
      ? doc.accountingCustomFields.map((f: { id: string; title?: string; value?: string }) => ({
          id: f.id,
          title: f.title ?? "",
          value: f.value ?? "",
        }))
      : undefined,
    transactionStage: doc.transactionStage ?? "PREPARATION",
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

const stageOrder: TransactionStage[] = [
  "PREPARATION",
  "CUSTOMS_CLEARANCE",
  "TRANSPORTATION",
  "STORAGE",
];

const preparationFields = new Set<keyof Transaction>([
  "clientName",
  "clientId",
  "shippingCompanyId",
  "shippingCompanyName",
  "declarationNumber",
  "declarationNumber2",
  "declarationDate",
  "orderDate",
  "declarationType",
  "declarationType2",
  "portType",
  "containerSize",
  "portOfLading",
  "portOfDischarge",
  "destination",
  "airwayBill",
  "hsCode",
  "goodsDescription",
  "invoiceValue",
  "invoiceCurrency",
  "originCountry",
  "goodsWeightKg",
  "containerCount",
  "goodsQuantity",
  "goodsQuality",
  "goodsUnit",
  "documentAttachments",
]);

const customsFields = new Set<keyof Transaction>([
  "documentArrivalDate",
  "containerArrivalDate",
  "documentStatus",
  "paymentStatus",
  "clearanceStatus",
  "fileNumber",
  "documentPostalNumber",
]);

const storageFields = new Set<keyof Transaction>([
  "containerNumbers",
  "unitCount",
  "unitNumber",
  "isStopped",
  "holdReason",
  "stopReason",
]);

const transportationFields = new Set<keyof Transaction>([
  "transportationTo",
  "trachNo",
  "transportationCompany",
  "transportationFrom",
  "transportationToLocation",
  "tripCharge",
  "waitingCharge",
  "maccrikCharge",
]);

/** Imports & transfers at STORAGE: only these transaction fields may be updated. */
export const STORAGE_STAGE_EDITABLE_FIELDS = new Set<keyof Transaction>([
  "storageSubStage",
  "storageEntryDate",
  "storageWorkersWages",
  "storageWorkersCompany",
  "storageStoreName",
  "storageSizeCbm",
  "storageFreightVehicleNumbers",
  "storageCrossPackaging",
  "storageUnity",
  "storageSealNumber",
  "storageInputEntryDate",
  "storageInputWorkersWages",
  "storageInputWorkersCompany",
  "storageInputStoreName",
  "storageInputVolumeCbm",
  "storageInputLoadingEquipmentFare",
  "storageExitEntryDate",
  "storageExitWorkersWages",
  "storageExitWorkersCompany",
  "storageExitStoreName",
  "storageExitVolumeCbm",
  "storageExitLoadingEquipmentFare",
  "storageExitFreightVehicleNumbers",
  "storageExitCrossPackaging",
  "storageExitUnity",
  "storageSealReplaceContainers",
  "storageSealEntryLockNumbers",
  "storageSealSwitchDate",
  "storageSealEntryContainerNumbers",
  "storageSealOutLockNumbers",
  "storageSealUnitCount",
  "storageSealWorkersCompany",
  "storageSealWorkersWages",
]);

const TRANSACTION_PATCH_KEYS: (keyof Transaction)[] = [
  "clientName",
  "clientId",
  "shippingCompanyId",
  "shippingCompanyName",
  "declarationNumber",
  "declarationNumber2",
  "declarationDate",
  "orderDate",
  "declarationType",
  "declarationType2",
  "portType",
  "containerSize",
  "portOfLading",
  "portOfDischarge",
  "destination",
  "transportationTo",
  "trachNo",
  "transportationCompany",
  "transportationFrom",
  "transportationToLocation",
  "tripCharge",
  "waitingCharge",
  "maccrikCharge",
  "airwayBill",
  "hsCode",
  "goodsDescription",
  "invoiceValue",
  "invoiceCurrency",
  "originCountry",
  "documentStatus",
  "clearanceStatus",
  "paymentStatus",
  "documentAttachments",
  "containerCount",
  "goodsWeightKg",
  "containerArrivalDate",
  "documentArrivalDate",
  "fileNumber",
  "containerNumbers",
  "unitCount",
  "unitNumber",
  "isStopped",
  "holdReason",
  "stopReason",
  "documentPostalNumber",
  "goodsQuantity",
  "goodsQuality",
  "goodsUnit",
  "transactionStage",
  "storageEntryDate",
  "storageWorkersWages",
  "storageWorkersCompany",
  "storageStoreName",
  "storageSizeCbm",
  "storageFreightVehicleNumbers",
  "storageCrossPackaging",
  "storageUnity",
  "storageSealNumber",
  "storageSubStage",
  "storageInputEntryDate",
  "storageInputWorkersWages",
  "storageInputWorkersCompany",
  "storageInputStoreName",
  "storageInputVolumeCbm",
  "storageInputLoadingEquipmentFare",
  "storageExitEntryDate",
  "storageExitWorkersWages",
  "storageExitWorkersCompany",
  "storageExitStoreName",
  "storageExitVolumeCbm",
  "storageExitLoadingEquipmentFare",
  "storageExitFreightVehicleNumbers",
  "storageExitCrossPackaging",
  "storageExitUnity",
  "storageSealReplaceContainers",
  "storageSealEntryLockNumbers",
  "storageSealSwitchDate",
  "storageSealEntryContainerNumbers",
  "storageSealOutLockNumbers",
  "storageSealUnitCount",
  "storageSealWorkersCompany",
  "storageSealWorkersWages",
];

function getLockedFieldsForStage(stage: TransactionStage, model: typeof TransactionModel): Set<keyof Transaction> {
  const importOrTransferAtStorage =
    stage === "STORAGE" && (model === TransactionModel || model === TransferModel);
  if (importOrTransferAtStorage) {
    return new Set(TRANSACTION_PATCH_KEYS.filter((k) => !STORAGE_STAGE_EDITABLE_FIELDS.has(k)));
  }
  if (stage === "PREPARATION") return new Set();
  if (stage === "CUSTOMS_CLEARANCE") return new Set();
  if (stage === "TRANSPORTATION") return new Set([...preparationFields, ...customsFields]);
  return new Set([...preparationFields, ...customsFields, ...transportationFields, ...storageFields]);
}

function nextStageOnArrival(current: TransactionStage, documentArrivalDate?: string): TransactionStage {
  if (current === "PREPARATION" && documentArrivalDate && documentArrivalDate.trim().length > 0) {
    return "CUSTOMS_CLEARANCE";
  }
  return current;
}

export async function listClients() {
  const docs = await ClientModel.find().sort({ createdAt: -1 }).lean();
  return docs.map(mapClient);
}

export async function getClientById(id: string): Promise<Client | null> {
  const doc = await ClientModel.findById(id).lean();
  return doc ? mapClient(doc) : null;
}

export async function createClient(input: Omit<Client, "id">): Promise<Client> {
  const created = await ClientModel.create(input);
  return mapClient(created.toObject());
}

export async function updateClient(id: string, input: Partial<Omit<Client, "id">>) {
  const updated = await ClientModel.findByIdAndUpdate(id, input, { new: true }).lean();
  return updated ? mapClient(updated) : null;
}

export async function deleteClient(id: string) {
  const deleted = await ClientModel.findByIdAndDelete(id).lean();
  return Boolean(deleted);
}

function mapShippingCompany(doc: any) {
  return {
    id: String(doc._id),
    companyName: doc.companyName,
    code: doc.code,
    contactName: doc.contactName,
    phone: doc.phone,
    email: doc.email,
    dispatchFormTemplate: doc.dispatchFormTemplate,
    latitude: doc.latitude,
    longitude: doc.longitude,
    location: doc.location,
    status: doc.status,
  };
}

export async function listShippingCompanies() {
  const docs = await ShippingCompanyModel.find().sort({ createdAt: -1 }).lean();
  return docs.map(mapShippingCompany);
}

export async function getShippingCompanyById(id: string) {
  const doc = await ShippingCompanyModel.findById(id).lean();
  return doc ? mapShippingCompany(doc) : null;
}

export async function createShippingCompany(input: {
  companyName: string;
  code: string;
  contactName?: string;
  phone?: string;
  email?: string;
  dispatchFormTemplate?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  status?: "active" | "inactive";
}) {
  const created = await ShippingCompanyModel.create(input);
  return mapShippingCompany(created.toObject());
}

export async function updateShippingCompany(
  id: string,
  input: Partial<{
    companyName: string;
    code: string;
    contactName?: string;
    phone?: string;
    email?: string | null;
    dispatchFormTemplate?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    location?: string | null;
    status: "active" | "inactive";
  }>,
) {
  const { latitude, longitude, location, email, dispatchFormTemplate, ...rest } = input;

  const $set: Record<string, unknown> = { ...rest };
  const $unset: Record<string, 1> = {};

  if (email === null) $unset.email = 1;
  else if (email !== undefined) $set.email = email;

  if (dispatchFormTemplate === null) $unset.dispatchFormTemplate = 1;
  else if (dispatchFormTemplate !== undefined) $set.dispatchFormTemplate = dispatchFormTemplate;

  if (location === null) $unset.location = 1;
  else if (location !== undefined) $set.location = location;

  if (latitude === null && longitude === null) {
    $unset.latitude = 1;
    $unset.longitude = 1;
  } else if (
    latitude !== undefined &&
    longitude !== undefined &&
    latitude !== null &&
    longitude !== null
  ) {
    $set.latitude = latitude;
    $set.longitude = longitude;
  }

  const hasSet = Object.keys($set).length > 0;
  const hasUnset = Object.keys($unset).length > 0;
  if (!hasSet && !hasUnset) {
    const updated = await ShippingCompanyModel.findByIdAndUpdate(id, {}, { new: true }).lean();
    return updated ? mapShippingCompany(updated) : null;
  }

  const update: Record<string, unknown> = {};
  if (hasSet) update.$set = $set;
  if (hasUnset) update.$unset = $unset;

  const updated = await ShippingCompanyModel.findByIdAndUpdate(id, update, { new: true }).lean();
  return updated ? mapShippingCompany(updated) : null;
}

export async function deleteShippingCompany(id: string) {
  const deleted = await ShippingCompanyModel.findByIdAndDelete(id).lean();
  return Boolean(deleted);
}

type EntityModel = typeof TransactionModel;

async function listEntity(model: EntityModel, clientId?: string, limit?: number) {
  let query = model.find(clientId ? { clientId } : {}).sort({ createdAt: -1 });
  if (limit) query = query.limit(limit);
  const docs = await query.lean();
  return docs.map(mapTransaction);
}

async function getEntity(model: EntityModel, id: string) {
  const doc = await model.findById(id).lean();
  return doc ? mapTransaction(doc) : undefined;
}

type CreateTransactionFields = Pick<
  Transaction,
  | "clientName"
  | "clientId"
  | "shippingCompanyId"
  | "shippingCompanyName"
  | "airwayBill"
  | "hsCode"
  | "goodsDescription"
  | "invoiceValue"
  | "invoiceCurrency"
  | "originCountry"
> &
  Partial<
    Pick<
      Transaction,
      | "declarationNumber"
      | "declarationNumber2"
      | "declarationDate"
      | "orderDate"
      | "declarationType"
      | "declarationType2"
      | "portType"
      | "containerSize"
      | "portOfLading"
      | "portOfDischarge"
      | "destination"
      | "transportationTo"
      | "trachNo"
      | "transportationCompany"
      | "transportationFrom"
      | "transportationToLocation"
      | "tripCharge"
      | "waitingCharge"
      | "maccrikCharge"
      | "transportationTo"
      | "trachNo"
      | "transportationCompany"
      | "transportationFrom"
      | "transportationToLocation"
      | "tripCharge"
      | "waitingCharge"
      | "maccrikCharge"
      | "documentAttachments"
      | "containerCount"
      | "goodsWeightKg"
      | "containerArrivalDate"
      | "documentArrivalDate"
      | "fileNumber"
      | "containerNumbers"
      | "unitCount"
      | "unitNumber"
      | "isStopped"
      | "holdReason"
      | "stopReason"
      | "documentPostalNumber"
      | "goodsQuantity"
      | "goodsQuality"
      | "goodsUnit"
      | "storageEntryDate"
      | "storageWorkersWages"
      | "storageWorkersCompany"
      | "storageStoreName"
      | "storageSizeCbm"
      | "storageFreightVehicleNumbers"
      | "storageCrossPackaging"
      | "storageUnity"
      | "storageSealNumber"
      | "storageSubStage"
      | "storageInputEntryDate"
      | "storageInputWorkersWages"
      | "storageInputWorkersCompany"
      | "storageInputStoreName"
      | "storageInputVolumeCbm"
      | "storageInputLoadingEquipmentFare"
      | "storageExitEntryDate"
      | "storageExitWorkersWages"
      | "storageExitWorkersCompany"
      | "storageExitStoreName"
      | "storageExitVolumeCbm"
      | "storageExitLoadingEquipmentFare"
      | "storageExitFreightVehicleNumbers"
      | "storageExitCrossPackaging"
      | "storageExitUnity"
      | "storageSealReplaceContainers"
      | "storageSealEntryLockNumbers"
      | "storageSealSwitchDate"
      | "storageSealEntryContainerNumbers"
      | "storageSealOutLockNumbers"
      | "storageSealUnitCount"
      | "storageSealWorkersCompany"
      | "storageSealWorkersWages"
    >
  >;

async function createEntity(
  model: EntityModel,
  counterId: string,
  input: CreateTransactionFields,
  declarationPrefix = "DXB-2026",
) {
  const risk = assessRisk(input);
  const status: ClearanceStatus = risk.channel === "green" ? "GREEN_CHANNEL" : risk.channel === "yellow" ? "YELLOW_CHANNEL" : "RED_CHANNEL";
  const { containerArrivalDate, documentArrivalDate, declarationDate, orderDate, declarationNumber, ...restInput } = input;
  const isDuplicateDeclarationError = (err: unknown): boolean => {
    const asRecord = err as { code?: number; keyPattern?: Record<string, unknown>; message?: string };
    if (asRecord?.code !== 11000) return false;
    if (asRecord?.keyPattern?.declarationNumber) return true;
    return typeof asRecord?.message === "string" && asRecord.message.includes("declarationNumber");
  };

  // Retry only when declaration number is auto-generated (counter drift safety).
  const maxAttempts = declarationNumber ? 1 : 10;
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const nextCounter = declarationNumber ? undefined : await getNextDeclarationCounter(counterId, model, declarationPrefix);
      const created = await model.create({
        ...restInput,
        ...risk,
        declarationNumber: declarationNumber ?? generateDeclarationNumber(nextCounter!, declarationPrefix),
        documentStatus: "copy_received",
        paymentStatus: "pending",
        xrayResult: risk.channel === "red" ? "manual_inspection" : "not_required",
        clearanceStatus: status,
        declarationDate: declarationDate ? new Date(declarationDate) : undefined,
        orderDate: orderDate ? new Date(orderDate) : undefined,
        containerArrivalDate: containerArrivalDate ? new Date(containerArrivalDate) : undefined,
        documentArrivalDate: documentArrivalDate ? new Date(documentArrivalDate) : undefined,
        transactionStage: documentArrivalDate ? "CUSTOMS_CLEARANCE" : "PREPARATION",
      });
      return mapTransaction(created.toObject());
    } catch (err) {
      if (!declarationNumber && isDuplicateDeclarationError(err)) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError ?? new Error("Could not allocate a unique declaration number");
}

async function setEntityStage(model: EntityModel, id: string, stage: TransactionStage) {
  const current = (await model.findById(id).lean()) as { transactionStage?: TransactionStage } | null;
  if (!current) return null;
  const currentStage = current.transactionStage ?? "PREPARATION";
  if (currentStage === stage) return getEntity(model, id);

  const fromIdx = stageOrder.indexOf(currentStage);
  const toIdx = stageOrder.indexOf(stage);
  if (fromIdx < 0 || toIdx < 0) return false;

  const $set: Record<string, unknown> = { transactionStage: stage };
  if (stage === "STORAGE" && currentStage !== "STORAGE") {
    $set.storageSubStage = "INPUT";
  }

  const updated = await model.findByIdAndUpdate(id, { $set }, { new: true }).lean();
  return updated ? mapTransaction(updated) : null;
}

export async function markOriginalBl(id: string) {
  const updated = await TransactionModel.findByIdAndUpdate(id, { documentStatus: "original_received" }, { new: true }).lean();
  return updated ? mapTransaction(updated) : null;
}

export async function markPaid(id: string) {
  const updated = await TransactionModel.findByIdAndUpdate(
    id,
    { paymentStatus: "paid", clearanceStatus: "PAID" },
    { new: true },
  ).lean();
  return updated ? mapTransaction(updated) : null;
}

export async function issueRelease(id: string) {
  const tx = (await TransactionModel.findById(id).lean()) as
    | { paymentStatus?: string; documentStatus?: string }
    | null;
  if (!tx) return null;
  const canRelease = tx.paymentStatus === "paid" && (tx.documentStatus === "original_received" || tx.documentStatus === "telex_release");
  if (!canRelease) return false;
  const updated = await TransactionModel.findByIdAndUpdate(
    id,
    {
      releaseCode: Math.random().toString(36).slice(2, 10).toUpperCase(),
      clearanceStatus: "E_RELEASE_ISSUED",
    },
    { new: true },
  ).lean();
  return updated ? mapTransaction(updated) : null;
}

async function updateEntity(
  model: EntityModel,
  id: string,
  input: Partial<
    Pick<
      Transaction,
      | "clientName"
      | "clientId"
      | "shippingCompanyId"
      | "shippingCompanyName"
      | "declarationNumber"
      | "declarationNumber2"
      | "declarationDate"
      | "orderDate"
      | "declarationType"
      | "declarationType2"
      | "portType"
      | "containerSize"
      | "portOfLading"
      | "portOfDischarge"
      | "destination"
      | "transportationTo"
      | "trachNo"
      | "transportationCompany"
      | "transportationFrom"
      | "transportationToLocation"
      | "tripCharge"
      | "waitingCharge"
      | "maccrikCharge"
      | "transportationTo"
      | "trachNo"
      | "transportationCompany"
      | "transportationFrom"
      | "transportationToLocation"
      | "tripCharge"
      | "waitingCharge"
      | "maccrikCharge"
      | "airwayBill"
      | "hsCode"
      | "goodsDescription"
      | "invoiceValue"
      | "invoiceCurrency"
      | "originCountry"
      | "documentStatus"
      | "clearanceStatus"
      | "paymentStatus"
      | "documentAttachments"
      | "containerCount"
      | "goodsWeightKg"
      | "containerArrivalDate"
      | "documentArrivalDate"
      | "fileNumber"
      | "containerNumbers"
      | "unitCount"
      | "unitNumber"
      | "isStopped"
      | "holdReason"
      | "stopReason"
      | "documentPostalNumber"
      | "goodsQuantity"
      | "goodsQuality"
      | "goodsUnit"
      | "storageEntryDate"
      | "storageWorkersWages"
      | "storageWorkersCompany"
      | "storageStoreName"
      | "storageSizeCbm"
      | "storageFreightVehicleNumbers"
      | "storageCrossPackaging"
      | "storageUnity"
      | "storageSealNumber"
      | "storageSubStage"
      | "storageInputEntryDate"
      | "storageInputWorkersWages"
      | "storageInputWorkersCompany"
      | "storageInputStoreName"
      | "storageInputVolumeCbm"
      | "storageInputLoadingEquipmentFare"
      | "storageExitEntryDate"
      | "storageExitWorkersWages"
      | "storageExitWorkersCompany"
      | "storageExitStoreName"
      | "storageExitVolumeCbm"
      | "storageExitLoadingEquipmentFare"
      | "storageExitFreightVehicleNumbers"
      | "storageExitCrossPackaging"
      | "storageExitUnity"
      | "storageSealReplaceContainers"
      | "storageSealEntryLockNumbers"
      | "storageSealSwitchDate"
      | "storageSealEntryContainerNumbers"
      | "storageSealOutLockNumbers"
      | "storageSealUnitCount"
      | "storageSealWorkersCompany"
      | "storageSealWorkersWages"
      | "transactionStage"
    >
  >,
) {
  const current = await getEntity(model, id);
  if (!current) return null;

  const currentStage = current.transactionStage ?? "PREPARATION";
  const targetStage = nextStageOnArrival(currentStage, input.documentArrivalDate);
  const lockedFields = getLockedFieldsForStage(targetStage, model);
  const attemptedLocked = Object.entries(input)
    .filter(([key, nextValue]) => {
      const field = key as keyof Transaction;
      if (!lockedFields.has(field)) return false;
      return !sameTransactionField(field, nextValue, current[field]);
    })
    .map(([key]) => key);
  if (attemptedLocked.length > 0) {
    throw new Error(`Fields are locked for stage ${targetStage}: ${attemptedLocked.join(", ")}`);
  }

  const invoiceValue = input.invoiceValue ?? current.invoiceValue;
  const hsCode = input.hsCode ?? current.hsCode;
  const originCountry = input.originCountry ?? current.originCountry;
  const risk = assessRisk({ invoiceValue, hsCode, originCountry });
  const suggestedStatus: ClearanceStatus =
    risk.channel === "green" ? "GREEN_CHANNEL" : risk.channel === "yellow" ? "YELLOW_CHANNEL" : "RED_CHANNEL";

  const {
    containerArrivalDate,
    documentArrivalDate,
    declarationDate,
    orderDate,
    storageEntryDate,
    storageInputEntryDate,
    storageExitEntryDate,
    storageSealSwitchDate,
    ...rest
  } = input;
  const datePatch: Record<string, unknown> = { ...rest };
  if (declarationDate !== undefined) {
    datePatch.declarationDate = declarationDate ? new Date(declarationDate) : null;
  }
  if (orderDate !== undefined) {
    datePatch.orderDate = orderDate ? new Date(orderDate) : null;
  }
  if (containerArrivalDate !== undefined) {
    datePatch.containerArrivalDate = containerArrivalDate ? new Date(containerArrivalDate) : null;
  }
  if (documentArrivalDate !== undefined) {
    datePatch.documentArrivalDate = documentArrivalDate ? new Date(documentArrivalDate) : null;
  }
  if (storageEntryDate !== undefined) {
    datePatch.storageEntryDate = storageEntryDate ? new Date(storageEntryDate) : null;
  }
  if (storageInputEntryDate !== undefined) {
    datePatch.storageInputEntryDate = storageInputEntryDate ? new Date(storageInputEntryDate) : null;
  }
  if (storageExitEntryDate !== undefined) {
    datePatch.storageExitEntryDate = storageExitEntryDate ? new Date(storageExitEntryDate) : null;
  }
  if (storageSealSwitchDate !== undefined) {
    datePatch.storageSealSwitchDate = storageSealSwitchDate ? new Date(storageSealSwitchDate) : null;
  }

  const updated = await model.findByIdAndUpdate(
    id,
    {
      ...datePatch,
      riskLevel: risk.riskLevel,
      channel: risk.channel,
      clearanceStatus: input.clearanceStatus ?? suggestedStatus,
      transactionStage: targetStage,
    },
    { new: true },
  ).lean();

  return updated ? mapTransaction(updated) : null;
}

async function deleteEntity(model: EntityModel, id: string) {
  const existing = await model.findById(id).lean();
  if (!existing) return false;
  const attachments = (existing as { documentAttachments?: DocumentAttachment[] }).documentAttachments;
  if (Array.isArray(attachments)) {
    for (const a of attachments) {
      try {
        await fs.unlink(absolutePathFromPublicPath(a.path));
      } catch {
        /* ignore */
      }
    }
  }
  const deleted = await model.findByIdAndDelete(id).lean();
  return Boolean(deleted);
}

export async function listTransactions(clientId?: string, limit?: number) {
  return listEntity(TransactionModel, clientId, limit);
}

export async function getTransaction(id: string) {
  return getEntity(TransactionModel, id);
}

export async function createTransaction(input: CreateTransactionFields) {
  return createEntity(TransactionModel, DECLARATION_COUNTER_ID, input, "DXB-2026");
}

export async function setTransactionStage(id: string, stage: TransactionStage) {
  return setEntityStage(TransactionModel, id, stage);
}

export async function updateTransaction(
  id: string,
  input: Partial<
    Pick<
      Transaction,
      | "clientName"
      | "clientId"
      | "shippingCompanyId"
      | "shippingCompanyName"
      | "declarationNumber"
      | "declarationNumber2"
      | "declarationDate"
      | "orderDate"
      | "declarationType"
      | "declarationType2"
      | "portType"
      | "containerSize"
      | "portOfLading"
      | "portOfDischarge"
      | "destination"
      | "transportationTo"
      | "trachNo"
      | "transportationCompany"
      | "transportationFrom"
      | "transportationToLocation"
      | "tripCharge"
      | "waitingCharge"
      | "maccrikCharge"
      | "transportationTo"
      | "trachNo"
      | "transportationCompany"
      | "transportationFrom"
      | "transportationToLocation"
      | "tripCharge"
      | "waitingCharge"
      | "maccrikCharge"
      | "airwayBill"
      | "hsCode"
      | "goodsDescription"
      | "invoiceValue"
      | "invoiceCurrency"
      | "originCountry"
      | "documentStatus"
      | "clearanceStatus"
      | "paymentStatus"
      | "documentAttachments"
      | "containerCount"
      | "goodsWeightKg"
      | "containerArrivalDate"
      | "documentArrivalDate"
      | "fileNumber"
      | "containerNumbers"
      | "unitCount"
      | "unitNumber"
      | "isStopped"
      | "holdReason"
      | "stopReason"
      | "documentPostalNumber"
      | "goodsQuantity"
      | "goodsQuality"
      | "goodsUnit"
      | "storageEntryDate"
      | "storageWorkersWages"
      | "storageWorkersCompany"
      | "storageStoreName"
      | "storageSizeCbm"
      | "storageFreightVehicleNumbers"
      | "storageCrossPackaging"
      | "storageUnity"
      | "storageSealNumber"
      | "storageSubStage"
      | "storageInputEntryDate"
      | "storageInputWorkersWages"
      | "storageInputWorkersCompany"
      | "storageInputStoreName"
      | "storageInputVolumeCbm"
      | "storageInputLoadingEquipmentFare"
      | "storageExitEntryDate"
      | "storageExitWorkersWages"
      | "storageExitWorkersCompany"
      | "storageExitStoreName"
      | "storageExitVolumeCbm"
      | "storageExitLoadingEquipmentFare"
      | "storageExitFreightVehicleNumbers"
      | "storageExitCrossPackaging"
      | "storageExitUnity"
      | "storageSealReplaceContainers"
      | "storageSealEntryLockNumbers"
      | "storageSealSwitchDate"
      | "storageSealEntryContainerNumbers"
      | "storageSealOutLockNumbers"
      | "storageSealUnitCount"
      | "storageSealWorkersCompany"
      | "storageSealWorkersWages"
      | "transactionStage"
    >
  >,
) {
  return updateEntity(TransactionModel, id, input);
}

export async function deleteTransaction(id: string) {
  return deleteEntity(TransactionModel, id);
}

export async function listTransfers(clientId?: string, limit?: number) {
  return listEntity(TransferModel, clientId, limit);
}

export async function getTransfer(id: string) {
  return getEntity(TransferModel, id);
}

export async function createTransfer(input: CreateTransactionFields) {
  return createEntity(TransferModel, TRANSFER_DECLARATION_COUNTER_ID, input, "TRF-2026");
}

export async function setTransferStage(id: string, stage: TransactionStage) {
  return setEntityStage(TransferModel, id, stage);
}

export async function updateTransfer(
  id: string,
  input: Partial<
    Pick<
      Transaction,
      | "clientName"
      | "clientId"
      | "shippingCompanyId"
      | "shippingCompanyName"
      | "declarationNumber"
      | "declarationNumber2"
      | "declarationDate"
      | "orderDate"
      | "declarationType"
      | "declarationType2"
      | "portType"
      | "containerSize"
      | "portOfLading"
      | "portOfDischarge"
      | "destination"
      | "transportationTo"
      | "trachNo"
      | "transportationCompany"
      | "transportationFrom"
      | "transportationToLocation"
      | "tripCharge"
      | "waitingCharge"
      | "maccrikCharge"
      | "transportationTo"
      | "trachNo"
      | "transportationCompany"
      | "transportationFrom"
      | "transportationToLocation"
      | "tripCharge"
      | "waitingCharge"
      | "maccrikCharge"
      | "airwayBill"
      | "hsCode"
      | "goodsDescription"
      | "invoiceValue"
      | "invoiceCurrency"
      | "originCountry"
      | "documentStatus"
      | "clearanceStatus"
      | "paymentStatus"
      | "documentAttachments"
      | "containerCount"
      | "goodsWeightKg"
      | "containerArrivalDate"
      | "documentArrivalDate"
      | "fileNumber"
      | "containerNumbers"
      | "unitCount"
      | "unitNumber"
      | "isStopped"
      | "holdReason"
      | "stopReason"
      | "documentPostalNumber"
      | "goodsQuantity"
      | "goodsQuality"
      | "goodsUnit"
      | "storageEntryDate"
      | "storageWorkersWages"
      | "storageWorkersCompany"
      | "storageStoreName"
      | "storageSizeCbm"
      | "storageFreightVehicleNumbers"
      | "storageCrossPackaging"
      | "storageUnity"
      | "storageSealNumber"
      | "storageSubStage"
      | "storageInputEntryDate"
      | "storageInputWorkersWages"
      | "storageInputWorkersCompany"
      | "storageInputStoreName"
      | "storageInputVolumeCbm"
      | "storageInputLoadingEquipmentFare"
      | "storageExitEntryDate"
      | "storageExitWorkersWages"
      | "storageExitWorkersCompany"
      | "storageExitStoreName"
      | "storageExitVolumeCbm"
      | "storageExitLoadingEquipmentFare"
      | "storageExitFreightVehicleNumbers"
      | "storageExitCrossPackaging"
      | "storageExitUnity"
      | "storageSealReplaceContainers"
      | "storageSealEntryLockNumbers"
      | "storageSealSwitchDate"
      | "storageSealEntryContainerNumbers"
      | "storageSealOutLockNumbers"
      | "storageSealUnitCount"
      | "storageSealWorkersCompany"
      | "storageSealWorkersWages"
      | "transactionStage"
    >
  >,
) {
  return updateEntity(TransferModel, id, input);
}

export async function deleteTransfer(id: string) {
  return deleteEntity(TransferModel, id);
}

export async function markTransferPaid(id: string) {
  const updated = await TransferModel.findByIdAndUpdate(
    id,
    { paymentStatus: "paid", clearanceStatus: "PAID" },
    { new: true },
  ).lean();
  return updated ? mapTransaction(updated) : null;
}

export async function issueTransferRelease(id: string) {
  const tx = (await TransferModel.findById(id).lean()) as
    | { paymentStatus?: string; documentStatus?: string }
    | null;
  if (!tx) return null;
  const canRelease = tx.paymentStatus === "paid" && (tx.documentStatus === "original_received" || tx.documentStatus === "telex_release");
  if (!canRelease) return false;
  const updated = await TransferModel.findByIdAndUpdate(
    id,
    {
      releaseCode: Math.random().toString(36).slice(2, 10).toUpperCase(),
      clearanceStatus: "E_RELEASE_ISSUED",
    },
    { new: true },
  ).lean();
  return updated ? mapTransaction(updated) : null;
}

export async function listExports(clientId?: string, limit?: number) {
  return listEntity(ExportModel, clientId, limit);
}

export async function getExport(id: string) {
  return getEntity(ExportModel, id);
}

export async function createExport(input: CreateTransactionFields) {
  return createEntity(ExportModel, EXPORT_DECLARATION_COUNTER_ID, input, "EXP-2026");
}

export async function setExportStage(id: string, stage: TransactionStage) {
  if (stage === "STORAGE") return false;
  return setEntityStage(ExportModel, id, stage);
}

export async function updateExport(
  id: string,
  input: Partial<
    Pick<
      Transaction,
      | "clientName"
      | "clientId"
      | "shippingCompanyId"
      | "shippingCompanyName"
      | "declarationNumber"
      | "declarationNumber2"
      | "declarationDate"
      | "declarationType"
      | "declarationType2"
      | "portType"
      | "airwayBill"
      | "hsCode"
      | "goodsDescription"
      | "invoiceValue"
      | "invoiceCurrency"
      | "originCountry"
      | "documentStatus"
      | "clearanceStatus"
      | "paymentStatus"
      | "documentAttachments"
      | "containerCount"
      | "goodsWeightKg"
      | "containerArrivalDate"
      | "documentArrivalDate"
      | "fileNumber"
      | "containerNumbers"
      | "unitCount"
      | "isStopped"
      | "holdReason"
      | "stopReason"
      | "documentPostalNumber"
      | "goodsQuantity"
      | "goodsQuality"
      | "goodsUnit"
      | "storageEntryDate"
      | "storageWorkersWages"
      | "storageWorkersCompany"
      | "storageStoreName"
      | "storageSizeCbm"
      | "storageFreightVehicleNumbers"
      | "storageCrossPackaging"
      | "storageUnity"
      | "storageSealNumber"
      | "storageSubStage"
      | "storageInputEntryDate"
      | "storageInputWorkersWages"
      | "storageInputWorkersCompany"
      | "storageInputStoreName"
      | "storageInputVolumeCbm"
      | "storageInputLoadingEquipmentFare"
      | "storageExitEntryDate"
      | "storageExitWorkersWages"
      | "storageExitWorkersCompany"
      | "storageExitStoreName"
      | "storageExitVolumeCbm"
      | "storageExitLoadingEquipmentFare"
      | "storageExitFreightVehicleNumbers"
      | "storageExitCrossPackaging"
      | "storageExitUnity"
      | "storageSealReplaceContainers"
      | "storageSealEntryLockNumbers"
      | "storageSealSwitchDate"
      | "storageSealEntryContainerNumbers"
      | "storageSealOutLockNumbers"
      | "storageSealUnitCount"
      | "storageSealWorkersCompany"
      | "storageSealWorkersWages"
      | "transactionStage"
    >
  >,
) {
  return updateEntity(ExportModel, id, input);
}

export async function deleteExport(id: string) {
  return deleteEntity(ExportModel, id);
}

export async function markExportPaid(id: string) {
  const updated = await ExportModel.findByIdAndUpdate(
    id,
    { paymentStatus: "paid", clearanceStatus: "PAID" },
    { new: true },
  ).lean();
  return updated ? mapTransaction(updated) : null;
}

export async function issueExportRelease(id: string) {
  const tx = (await ExportModel.findById(id).lean()) as
    | { paymentStatus?: string; documentStatus?: string }
    | null;
  if (!tx) return null;
  const canRelease = tx.paymentStatus === "paid" && (tx.documentStatus === "original_received" || tx.documentStatus === "telex_release");
  if (!canRelease) return false;
  const updated = await ExportModel.findByIdAndUpdate(
    id,
    {
      releaseCode: Math.random().toString(36).slice(2, 10).toUpperCase(),
      clearanceStatus: "E_RELEASE_ISSUED",
    },
    { new: true },
  ).lean();
  return updated ? mapTransaction(updated) : null;
}

async function updateEntityAccounting(
  model: typeof TransactionModel,
  id: string,
  fields: AccountingCustomField[],
  fixed: AccountingFixedPayload,
) {
  const normalized = sanitizeAccountingCustomFieldsForSave(fields);
  const update: Record<string, unknown> = {
    accountingCustomFields: normalized,
    ...fixed,
  };
  if (fixed.paymentStatus === "paid") {
    update.clearanceStatus = "PAID";
  }
  const updated = await model.findByIdAndUpdate(id, update, { new: true }).lean();
  return updated ? mapTransaction(updated) : null;
}

export async function updateTransactionAccounting(
  id: string,
  fields: AccountingCustomField[],
  fixed: AccountingFixedPayload,
) {
  return updateEntityAccounting(TransactionModel, id, fields, fixed);
}

export async function updateTransferAccounting(
  id: string,
  fields: AccountingCustomField[],
  fixed: AccountingFixedPayload,
) {
  return updateEntityAccounting(TransferModel, id, fields, fixed);
}

export async function updateExportAccounting(
  id: string,
  fields: AccountingCustomField[],
  fixed: AccountingFixedPayload,
) {
  return updateEntityAccounting(ExportModel, id, fields, fixed);
}
