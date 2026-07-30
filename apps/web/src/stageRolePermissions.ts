import type { Role, TransactionStage } from "./types";

export const EMPLOYEE_WORK_STAGES = new Set<TransactionStage>(["PREPARATION", "CUSTOMS_CLEARANCE"]);
export const EMPLOYEE2_WORK_STAGES = new Set<TransactionStage>(["TRANSPORTATION", "STORAGE"]);
export const WAREHOUSE_WORK_STAGES = new Set<TransactionStage>(["STORAGE"]);

export function roleCanWorkAtStage(role: Role, stage: TransactionStage): boolean {
  if (role === "manager") return true;
  if (role === "employee") return EMPLOYEE_WORK_STAGES.has(stage);
  if (role === "employee2") return EMPLOYEE2_WORK_STAGES.has(stage);
  if (role === "warehouse") return WAREHOUSE_WORK_STAGES.has(stage);
  return false;
}

export function roleCanChangeStage(role: Role, currentStage: TransactionStage): boolean {
  if (role === "manager") return true;
  if (role === "warehouse") return false;
  return roleCanWorkAtStage(role, currentStage);
}

export function stageOptionsForRole(role: Role, options: TransactionStage[]): TransactionStage[] {
  if (role === "manager") return options;
  if (role === "employee") return options.filter((s) => EMPLOYEE_WORK_STAGES.has(s));
  if (role === "employee2") return options.filter((s) => EMPLOYEE2_WORK_STAGES.has(s));
  if (role === "warehouse") return options.filter((s) => WAREHOUSE_WORK_STAGES.has(s));
  return [];
}
