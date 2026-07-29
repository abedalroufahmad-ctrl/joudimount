import type { Role, TransactionStage } from "./types";
import { roleCanWorkAtStage } from "./stageRolePermissions";

/** Mirrors apps/api/src/server.ts stage1EmployeeFields */
export const EMPLOYEE1_EDIT_FIELDS = new Set<string>([
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
  "containerCount",
  "goodsWeightKg",
  "goodsQuantity",
  "unitNumber",
  "goodsQuality",
  "goodsUnit",
  "transportationTo",
  "trachNo",
  "transportationCompany",
  "transportationFrom",
  "transportationToLocation",
  "tripCharge",
  "waitingCharge",
  "maccrikCharge",
]);

/** Mirrors apps/api/src/server.ts stage2EmployeeFields */
export const EMPLOYEE2_EDIT_FIELDS = new Set<string>([
  "containerArrivalDate",
  "documentArrivalDate",
  "fileNumber",
  "documentPostalNumber",
  "documentStatus",
  "clearanceStatus",
  "containerNumbers",
  "unitCount",
  "isStopped",
  "stopReason",
  "transportationTo",
  "trachNo",
  "transportationCompany",
  "transportationFrom",
  "transportationToLocation",
  "tripCharge",
  "waitingCharge",
  "maccrikCharge",
]);

/** Warehouse fields at STORAGE (imports/transfers). */
export const STORAGE_WAREHOUSE_FIELDS = new Set<string>([
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
]);

export function getAllowedUpdateFields(
  role: Role,
  stage: TransactionStage,
  atStorage: boolean,
): Set<string> | "all" {
  if (role === "manager") return "all";
  if (role === "accountant") return new Set(["paymentStatus"]);
  if (!roleCanWorkAtStage(role, stage)) return new Set();
  if (role === "employee") return EMPLOYEE1_EDIT_FIELDS;
  if (role === "employee2") {
    return atStorage ? STORAGE_WAREHOUSE_FIELDS : EMPLOYEE2_EDIT_FIELDS;
  }
  return new Set();
}

export function canRoleSubmitField(
  role: Role,
  field: string,
  isEdit: boolean,
  stage: TransactionStage,
): boolean {
  if (!isEdit) return role === "manager" || role === "employee";
  const allowed = getAllowedUpdateFields(role, stage, stage === "STORAGE");
  if (allowed === "all") return true;
  return allowed.has(field);
}
