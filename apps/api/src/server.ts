import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { createServer } from "node:http";
import multer from "multer";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { validate } from "./middlewares/validate.js";
import { signAuthToken, UserRole, verifyAuthToken } from "./auth.js";
import { connectDb } from "./db.js";
import { EmployeeModel } from "./models.js";
import { createTransactionPayloadSchema, updateTransactionPayloadSchema } from "./transactionSchemas.js";
import {
  createClient,
  createEmployee,
  createShippingCompany,
  createExport,
  createTransfer,
  createTransaction,
  deleteClient,
  deleteEmployee,
  deleteExport,
  deleteShippingCompany,
  deleteTransfer,
  deleteTransaction,
  getExport,
  getClientById,
  getShippingCompanyById,
  getTransfer,
  getTransaction,
  issueExportRelease,
  issueTransferRelease,
  issueRelease,
  listExports,
  listClients,
  getEmployeeProfile,
  listEmployees,
  listShippingCompanies,
  listTransfers,
  listTransactions,
  markExportPaid,
  markOriginalBl,
  markPaid,
  markTransferPaid,
  setExportStage,
  setTransferStage,
  setTransactionStage,
  updateEmployee,
  updateExport,
  updateShippingCompany,
  updateTransfer,
  updateClient,
  STORAGE_STAGE_EDITABLE_FIELDS,
  updateTransaction,
  updateTransactionAccounting,
  updateTransferAccounting,
  updateExportAccounting,
} from "./store.js";
import {
  buildAccountingResponse,
  updateAccountingPayloadSchema,
  type AccountingFixedPayload,
} from "./accounting.js";
import type { AccountingCustomField, DocumentAttachment, Transaction, TransactionStage } from "./types.js";
import { absolutePathFromPublicPath, publicPathForUploadedFile, transactionDocsUpload } from "./uploads.js";
import {
  initNotificationSocket,
  listNotifications,
  clearAllNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  publishProjectAction,
  registerFcmToken,
  unregisterFcmToken,
  unreadNotificationCount,
  type ProjectActionInput,
} from "./notifications.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const documentCategoryEnum = z.enum(["bill_of_lading", "certificate_of_origin", "invoice", "packing_list"]);
const stage1EmployeeFields = new Set([
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
  "invoiceToWeightRateAedPerKg",
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
const stage2EmployeeFields = new Set([
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

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

function actionActor(req: AuthRequest): ProjectActionInput["actor"] {
  return { id: req.user!.id, name: req.user!.name, role: req.user!.role };
}

function notifyAction(req: AuthRequest, input: Omit<ProjectActionInput, "actor">): void {
  void publishProjectAction({ ...input, actor: actionActor(req) });
}

function txLabel(tx: { declarationNumber?: string; clientName?: string }): string {
  return tx.declarationNumber?.trim() || tx.clientName?.trim() || "transaction";
}

function registerAccountingRoutes(
  apiPrefix: "transactions" | "transfers" | "exports",
  entityType: "transaction" | "transfer" | "export",
  getOne: (id: string) => Promise<Transaction | undefined>,
  updateAccounting: (
    id: string,
    fields: AccountingCustomField[],
    fixed: AccountingFixedPayload,
  ) => Promise<Transaction | null>,
) {
  app.get(`/api/${apiPrefix}/:id/accounting`, authenticate, async (req: AuthRequest, res) => {
    const denied = ensureRole(req, res, ["manager", "accountant"]);
    if (!denied) return;
    const tx = await getOne(req.params.id);
    if (!tx) return res.status(404).json({ error: "Record not found" });
    return res.json(buildAccountingResponse(tx));
  });

  app.put(`/api/${apiPrefix}/:id/accounting`, authenticate, async (req: AuthRequest, res) => {
    const denied = ensureRole(req, res, ["manager", "accountant"]);
    if (!denied) return;
    const parsed = updateAccountingPayloadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const existing = await getOne(req.params.id);
    if (!existing) return res.status(404).json({ error: "Record not found" });
    const tx = await updateAccounting(req.params.id, parsed.data.customFields, parsed.data.fixed);
    if (!tx) return res.status(404).json({ error: "Record not found" });
    notifyAction(req, {
      action: "updated",
      entityType,
      entityId: tx.id,
      entityLabel: txLabel(tx),
    });
    return res.json(buildAccountingResponse(tx));
  });
}

const EMPLOYEE_WORK_STAGES = new Set<TransactionStage>(["PREPARATION", "CUSTOMS_CLEARANCE"]);
const EMPLOYEE2_WORK_STAGES = new Set<TransactionStage>(["TRANSPORTATION", "STORAGE"]);

function txStageOf(tx: { transactionStage?: TransactionStage }): TransactionStage {
  return tx.transactionStage ?? "PREPARATION";
}

function roleMayEditAtStage(role: UserRole, stage: TransactionStage): boolean {
  if (role === "manager") return true;
  if (role === "employee") return EMPLOYEE_WORK_STAGES.has(stage);
  if (role === "employee2") return EMPLOYEE2_WORK_STAGES.has(stage);
  return false;
}

function roleMaySetTargetStage(role: UserRole, target: TransactionStage): boolean {
  if (role === "manager") return true;
  if (role === "employee") return EMPLOYEE_WORK_STAGES.has(target);
  if (role === "employee2") return EMPLOYEE2_WORK_STAGES.has(target);
  return false;
}

function validateRoleFieldUpdates(
  role: UserRole,
  stage: TransactionStage,
  data: Record<string, unknown>,
): string | null {
  if (role === "manager") return null;
  if (role === "accountant") {
    const nonAccounting = Object.keys(data).some((key) => key !== "paymentStatus");
    return nonAccounting ? "Accountant can only update paymentStatus via edit endpoint" : null;
  }
  if (!roleMayEditAtStage(role, stage)) {
    return role === "employee"
      ? "Employee can only edit during Preparation and Customs clearance"
      : "Employee2 can only edit during Transportation and Storage";
  }
  if (role === "employee") {
    const invalidFields = Object.keys(data).filter((key) => !stage1EmployeeFields.has(key));
    if (invalidFields.length > 0) {
      return `Employee can only edit stage 1 fields: ${invalidFields.join(", ")}`;
    }
    return null;
  }
  if (role === "employee2") {
    const atStorage = stage === "STORAGE";
    const invalidFields = Object.keys(data).filter((key) => {
      if (atStorage) return !STORAGE_STAGE_EDITABLE_FIELDS.has(key as keyof Transaction);
      return !stage2EmployeeFields.has(key);
    });
    if (invalidFields.length > 0) {
      return atStorage
        ? `At Storage stage, employee2 may only edit warehouse fields: ${invalidFields.join(", ")}`
        : `Employee2 can only edit stage 2 fields: ${invalidFields.join(", ")}`;
    }
    return null;
  }
  return "Forbidden";
}

function authenticate(req: AuthRequest, res: Response, next: () => void) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = header.slice("Bearer ".length).trim();
  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.user = payload;
  next();
}

function ensureRole(req: AuthRequest, res: Response, allowed: UserRole[]) {
  const role = req.user?.role;
  if (!role || !allowed.includes(role)) {
    res.status(403).json({ error: `Role '${role}' is not allowed for this action` });
    return null;
  }
  return role;
}

function maybeUpload(req: Request, res: Response, next: () => void) {
  const ct = req.headers["content-type"] || "";
  if (ct.includes("multipart/form-data")) {
    transactionDocsUpload.array("documentPhotos", 40)(req, res, next);
  } else {
    next();
  }
}

function attachmentPathSetsEqual(prev: DocumentAttachment[] | undefined, retained: DocumentAttachment[]): boolean {
  const a = new Set((prev ?? []).map((x) => x.path));
  const b = new Set(retained.map((x) => x.path));
  if (a.size !== b.size) return false;
  for (const p of a) if (!b.has(p)) return false;
  return true;
}

function parseExistingAttachmentsJson(raw: unknown): DocumentAttachment[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    const out: DocumentAttachment[] = [];
    for (const item of v) {
      if (
        typeof item === "object" &&
        item !== null &&
        typeof (item as { path?: unknown }).path === "string" &&
        typeof (item as { originalName?: unknown }).originalName === "string" &&
        ((item as { category?: unknown }).category === undefined ||
          documentCategoryEnum.safeParse((item as { category?: unknown }).category).success)
      ) {
        out.push({
          path: (item as DocumentAttachment).path,
          originalName: (item as DocumentAttachment).originalName,
          category: (item as DocumentAttachment).category,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

function parseDocumentPhotoCategories(raw: unknown, fileCount: number): string[] {
  if (fileCount <= 0) return [];
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, fileCount).map((x) => (typeof x === "string" ? x : ""));
  } catch {
    return [];
  }
}

function attachmentDisplayNameFromStoredFilename(filename: string): string {
  const ext = path.extname(filename) || ".bin";
  const id = path.basename(filename, ext).replace(/-/g, "").slice(0, 12);
  return `doc_${id}${ext.toLowerCase()}`;
}

function isBlankString(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

function getMissingFieldsBeforeCustomsClearance(tx: Transaction): string[] {
  const missing: string[] = [];
  const requiredStringFields: Array<[keyof Transaction, string]> = [
    ["clientName", "clientName"],
    ["shippingCompanyName", "shippingCompanyName"],
    ["airwayBill", "airwayBill"],
    ["hsCode", "hsCode"],
    ["goodsDescription", "goodsDescription"],
    ["originCountry", "originCountry"],
    ["invoiceCurrency", "invoiceCurrency"],
  ];

  for (const [key, label] of requiredStringFields) {
    if (isBlankString(tx[key])) missing.push(label);
  }
  if (!Number.isFinite(tx.invoiceValue) || tx.invoiceValue <= 0) missing.push("invoiceValue");
  if (tx.containerCount === undefined || tx.containerCount < 0) missing.push("containerCount");
  if (tx.goodsWeightKg === undefined || tx.goodsWeightKg < 0) missing.push("goodsWeightKg");
  if (tx.invoiceToWeightRateAedPerKg === undefined || tx.invoiceToWeightRateAedPerKg <= 0) {
    missing.push("invoiceToWeightRateAedPerKg");
  }
  if (tx.goodsQuantity === undefined || tx.goodsQuantity < 0) missing.push("goodsQuantity");
  if (isBlankString(tx.goodsQuality)) missing.push("goodsQuality");
  if (isBlankString(tx.goodsUnit)) missing.push("goodsUnit");
  if (isBlankString(tx.unitCount)) missing.push("unitCount");
  if (tx.isStopped === true && isBlankString(tx.stopReason)) {
    missing.push("stopReason");
  }

  return missing;
}

function getMissingFieldsBeforeCustomsClearanceForTransferOrExport(tx: Transaction): string[] {
  const missing: string[] = [];
  const requiredStringFields: Array<[keyof Transaction, string]> = [
    ["clientName", "clientName"],
    ["originCountry", "originCountry"],
    ["goodsDescription", "goodsDescription"],
    ["hsCode", "hsCode"],
    ["containerSize", "containerSize"],
    ["goodsQuality", "goodsQuality"],
    ["goodsUnit", "goodsUnit"],
  ];
  for (const [key, label] of requiredStringFields) {
    if (isBlankString(tx[key])) missing.push(label);
  }
  if (!tx.orderDate) missing.push("orderDate");
  if (tx.containerCount === undefined || tx.containerCount < 0) missing.push("containerCount");
  if (tx.goodsWeightKg === undefined || tx.goodsWeightKg < 0) missing.push("goodsWeightKg");
  if (tx.unitNumber === undefined || tx.unitNumber < 0) missing.push("unitNumber");
  if (tx.goodsQuantity === undefined || tx.goodsQuantity < 0) missing.push("goodsQuantity");
  if (tx.isStopped === true && isBlankString(tx.stopReason)) missing.push("stopReason");
  return missing;
}

async function removeOrphanFiles(previous: DocumentAttachment[] | undefined, merged: DocumentAttachment[]) {
  const prev = new Set((previous ?? []).map((a) => a.path));
  const next = new Set(merged.map((a) => a.path));
  for (const p of prev) {
    if (!next.has(p)) {
      try {
        await fs.unlink(absolutePathFromPublicPath(p));
      } catch {
        /* ignore missing file */
      }
    }
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/login", validate(z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(4),
  })
})), async (req, res) => {
  const { verifyPassword, hashPassword, isPasswordHashed } = await import("./password.js");
  const email = (req.body as any).email.toLowerCase().trim();
  const user = (await EmployeeModel.findOne({ email }).lean()) as
    | { _id: string; email: string; name: string; role: UserRole; password: string }
    | null;
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const passwordOk = await verifyPassword((req.body as any).password, user.password);
  if (!passwordOk) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  if (!isPasswordHashed(user.password)) {
    await EmployeeModel.updateOne(
      { _id: user._id },
      { $set: { password: await hashPassword((req.body as any).password) } },
    );
  }

  const token = signAuthToken({
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return res.json({
    token,
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

app.post("/api/auth/logout", (_req, res) => {
  return res.json({ ok: true });
});

const optionalEmployeePassword = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().min(4).optional(),
);

app.get("/api/auth/me", authenticate, async (req: AuthRequest, res) => {
  const profile = await getEmployeeProfile(req.user!.id);
  if (!profile) return res.status(404).json({ error: "User not found" });
  return res.json(profile);
});

app.put("/api/auth/me", authenticate, validate(z.object({
  body: z
    .object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      password: optionalEmployeePassword,
    })
    .refine((value) => Object.keys(value).length > 0, "At least one field is required"),
})), async (req: AuthRequest, res) => {
  try {
    const updated = await updateEmployee(req.user!.id, req.body);
    if (!updated) return res.status(404).json({ error: "User not found" });
    const profile = await getEmployeeProfile(updated.id);
    if (!profile) return res.status(404).json({ error: "User not found" });
    const token = signAuthToken({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
    });
    return res.json({ user: profile, token });
  } catch (err: unknown) {
    if ((err as { code?: number })?.code === 11000) {
      return res.status(409).json({ error: "email_taken" });
    }
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/employees", authenticate, async (_req, res) => {
  res.json(await listEmployees());
});

app.get("/api/notifications", authenticate, async (req: AuthRequest, res) => {
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 100) : 50;
  return res.json(await listNotifications(req.user!.id, limit));
});

app.get("/api/notifications/unread-count", authenticate, async (req: AuthRequest, res) => {
  return res.json({ count: await unreadNotificationCount(req.user!.id) });
});

app.post("/api/notifications/:id/read", authenticate, async (req: AuthRequest, res) => {
  const ok = await markNotificationRead(req.user!.id, req.params.id);
  if (!ok) return res.status(404).json({ error: "Notification not found" });
  return res.json({ ok: true });
});

app.post("/api/notifications/read-all", authenticate, async (req: AuthRequest, res) => {
  const count = await markAllNotificationsRead(req.user!.id);
  return res.json({ count });
});

app.post("/api/notifications/clear", authenticate, async (req: AuthRequest, res) => {
  const count = await clearAllNotifications(req.user!.id);
  return res.json({ count });
});

app.post("/api/devices/fcm", authenticate, async (req: AuthRequest, res) => {
  const schema = z.object({ token: z.string().min(10) });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  await registerFcmToken(req.user!.id, result.data.token);
  return res.json({ ok: true });
});

app.delete("/api/devices/fcm", authenticate, async (req: AuthRequest, res) => {
  const token =
    (typeof req.query.token === "string" ? req.query.token : "") ||
    (typeof req.body?.token === "string" ? req.body.token : "");
  const parsed = z.string().min(10).safeParse(token);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  await unregisterFcmToken(req.user!.id, parsed.data);
  return res.json({ ok: true });
});

app.post("/api/employees", authenticate, validate(z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(4),
    role: z.enum(["manager", "employee", "employee2", "accountant"]),
  }),
})), async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;
  try {
    const created = await createEmployee(req.body as any);
    notifyAction(req, {
      action: "created",
      entityType: "employee",
      entityId: created.id,
      entityLabel: created.name,
    });
    return res.status(201).json(created);
  } catch (err: unknown) {
    if ((err as { code?: number })?.code === 11000) {
      return res.status(409).json({ error: "email_taken" });
    }
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/employees/:id", authenticate, validate(z.object({
  body: z
    .object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      password: optionalEmployeePassword,
      role: z.enum(["manager", "employee", "employee2", "accountant"]).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, "At least one field is required"),
})), async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;

  if (req.body.role !== undefined && req.body.role !== "manager") {
    const current = (await EmployeeModel.findById(req.params.id).lean()) as { role?: UserRole } | null;
    if (current?.role === "manager") {
      const managers = await EmployeeModel.countDocuments({ role: "manager" });
      if (managers <= 1) {
        return res.status(400).json({ error: "last_manager_role" });
      }
    }
  }

  try {
    const updated = await updateEmployee(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Employee not found" });
    notifyAction(req, {
      action: "updated",
      entityType: "employee",
      entityId: updated.id,
      entityLabel: updated.name,
    });
    return res.json(updated);
  } catch (err: unknown) {
    if ((err as { code?: number })?.code === 11000) {
      return res.status(409).json({ error: "email_taken" });
    }
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/employees/:id", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;
  if (req.params.id === req.user?.id) {
    return res.status(400).json({ error: "delete_self" });
  }
  const target = (await EmployeeModel.findById(req.params.id).lean()) as { role?: UserRole } | null;
  if (!target) return res.status(404).json({ error: "Employee not found" });
  if (target.role === "manager") {
    const managers = await EmployeeModel.countDocuments({ role: "manager" });
    if (managers <= 1) {
      return res.status(400).json({ error: "last_manager_delete" });
    }
  }
  const ok = await deleteEmployee(req.params.id);
  if (!ok) return res.status(404).json({ error: "Employee not found" });
  notifyAction(req, {
    action: "deleted",
    entityType: "employee",
    entityId: req.params.id,
    entityLabel: (target as { name?: string }).name ?? req.params.id,
  });
  return res.status(204).send();
});

app.get("/api/clients", authenticate, async (_req, res) => {
  res.json(await listClients());
});

app.get("/api/clients/:id", authenticate, async (req, res) => {
  const client = await getClientById(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });
  return res.json(client);
});

const optionalClientEmail = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().email().optional(),
);
const optionalClientCountry = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().optional(),
);

app.post("/api/clients", authenticate, validate(z.object({
  body: z.object({
    companyName: z.string().min(2),
    trn: z.string().min(2),
    immigrationCode: z.string().optional(),
    email: optionalClientEmail,
    country: optionalClientCountry,
    creditLimit: z.number().nonnegative().default(0),
    status: z.enum(["active", "suspended"]).default("active"),
  }),
})), async (req, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;
  const created = await createClient(req.body);
  notifyAction(req, {
    action: "created",
    entityType: "client",
    entityId: created.id,
    entityLabel: created.companyName,
  });
  return res.status(201).json(created);
});

app.put("/api/clients/:id", authenticate, validate(z.object({
  body: z
    .object({
      companyName: z.string().min(2).optional(),
      trn: z.string().min(2).optional(),
      immigrationCode: z.string().optional(),
      email: optionalClientEmail,
      country: optionalClientCountry,
      creditLimit: z.number().nonnegative().optional(),
      status: z.enum(["active", "suspended"]).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, "At least one field is required"),
})), async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;

  const client = await updateClient(req.params.id, req.body);
  if (!client) return res.status(404).json({ error: "Client not found" });
  notifyAction(req, {
    action: "updated",
    entityType: "client",
    entityId: client.id,
    entityLabel: client.companyName,
  });
  return res.json(client);
});

app.delete("/api/clients/:id", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;
  const existingClient = await getClientById(req.params.id);
  const ok = await deleteClient(req.params.id);
  if (!ok) return res.status(404).json({ error: "Client not found" });
  notifyAction(req, {
    action: "deleted",
    entityType: "client",
    entityId: req.params.id,
    entityLabel: existingClient?.companyName ?? req.params.id,
  });
  return res.status(204).send();
});

app.get("/api/shipping-companies", authenticate, async (_req, res) => {
  res.json(await listShippingCompanies());
});

app.get("/api/shipping-companies/:id", authenticate, async (req, res) => {
  const item = await getShippingCompanyById(req.params.id);
  if (!item) return res.status(404).json({ error: "Shipping company not found" });
  return res.json(item);
});

app.post("/api/shipping-companies", authenticate, validate(z.object({
  body: z
    .object({
      companyName: z.string().min(2),
      code: z.string().min(2),
      contactName: z.string().optional(),
      phone: z.string().optional(),
      email: z.preprocess(
        (v) => (v === "" || v === null || v === undefined ? undefined : v),
        z.string().email().optional(),
      ),
      dispatchFormTemplate: z.string().max(8000).optional(),
      latitude: z.number().gte(-90).lte(90).optional(),
      longitude: z.number().gte(-180).lte(180).optional(),
      location: z.string().optional(),
      status: z.enum(["active", "inactive"]).default("active"),
    })
    .refine(
      (d) =>
        (d.latitude === undefined && d.longitude === undefined) ||
        (d.latitude !== undefined && d.longitude !== undefined),
      { message: "latitude and longitude must both be set or both omitted", path: ["latitude"] },
    ),
})), async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;
  const created = await createShippingCompany(req.body);
  notifyAction(req, {
    action: "created",
    entityType: "shipping_company",
    entityId: created.id,
    entityLabel: created.companyName,
  });
  return res.status(201).json(created);
});

app.put("/api/shipping-companies/:id", authenticate, validate(z.object({
  body: z
    .object({
      companyName: z.string().min(2).optional(),
      code: z.string().min(2).optional(),
      contactName: z.string().optional(),
      phone: z.string().optional(),
      email: z.preprocess(
        (v) => (v === "" || v === null ? null : v === undefined ? undefined : v),
        z.union([z.string().email(), z.null()]).optional(),
      ),
      dispatchFormTemplate: z.union([z.string().max(8000), z.null()]).optional(),
      latitude: z.union([z.number().gte(-90).lte(90), z.null()]).optional(),
      longitude: z.union([z.number().gte(-180).lte(180), z.null()]).optional(),
      location: z.union([z.string(), z.null()]).optional(),
      status: z.enum(["active", "inactive"]).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, "At least one field is required")
    .refine(
      (d) =>
        (d.latitude === undefined && d.longitude === undefined) ||
        (d.latitude !== undefined && d.longitude !== undefined) ||
        (d.latitude === null && d.longitude === null),
      { message: "latitude and longitude must both be set, both omitted, or both null", path: ["latitude"] },
    ),
})), async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;
  const item = await updateShippingCompany(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: "Shipping company not found" });
  notifyAction(req, {
    action: "updated",
    entityType: "shipping_company",
    entityId: item.id,
    entityLabel: item.companyName,
  });
  return res.json(item);
});

app.delete("/api/shipping-companies/:id", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;
  const existingShipping = await getShippingCompanyById(req.params.id);
  const ok = await deleteShippingCompany(req.params.id);
  if (!ok) return res.status(404).json({ error: "Shipping company not found" });
  notifyAction(req, {
    action: "deleted",
    entityType: "shipping_company",
    entityId: req.params.id,
    entityLabel: existingShipping?.companyName ?? req.params.id,
  });
  return res.status(204).send();
});

app.get("/api/transactions", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee", "employee2", "accountant"]);
  if (!denied) return;
  const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  res.json(await listTransactions(clientId, limit));
});

app.post("/api/transactions", authenticate, maybeUpload, validate(z.object({ body: createTransactionPayloadSchema })), async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee"]);
  if (!denied) return;
  try {
    const files = ((req as Request & { files?: Express.Multer.File[] }).files ?? []) as Express.Multer.File[];
    const categories = parseDocumentPhotoCategories((req.body as Record<string, unknown>).documentPhotoCategories, files.length);
    if (files.length > 0 && categories.length !== files.length) {
      return res.status(400).json({ error: "Each uploaded document must have a category" });
    }
    for (const c of categories) {
      if (!documentCategoryEnum.safeParse(c).success) {
        return res.status(400).json({ error: "Invalid document category" });
      }
    }
    const documentAttachments: DocumentAttachment[] = files.map((f, idx) => ({
      path: publicPathForUploadedFile(f.filename),
      originalName: attachmentDisplayNameFromStoredFilename(f.filename),
      category: categories[idx] as DocumentAttachment["category"],
    }));
    const data = {
      ...req.body,
      originCountry: (req.body as any).originCountry.toUpperCase(),
      documentAttachments: documentAttachments.length ? documentAttachments : undefined,
    };
    const created = await createTransaction(data);
    notifyAction(req, {
      action: "created",
      entityType: "transaction",
      entityId: created.id,
      entityLabel: txLabel(created),
    });
    return res.status(201).json(created);
  } catch (e) {
    console.error("POST /api/transactions", e);
    const message = e instanceof Error ? e.message : "Transaction create failed";
    return res.status(500).json({ error: message });
  }
});

app.get("/api/transactions/:id", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee", "employee2", "accountant"]);
  if (!denied) return;
  const tx = await getTransaction(req.params.id);
  if (!tx) return res.status(404).json({ error: "Transaction not found" });
  return res.json(tx);
});

registerAccountingRoutes("transactions", "transaction", getTransaction, updateTransactionAccounting);

app.post("/api/transactions/:id/original-bl", authenticate, async (req: AuthRequest, res) => {
  const role = ensureRole(req, res, ["manager", "employee"]);
  if (!role) return;
  const existing = await getTransaction(req.params.id);
  if (!existing) return res.status(404).json({ error: "Transaction not found" });
  if (role === "employee" && !EMPLOYEE_WORK_STAGES.has(txStageOf(existing))) {
    return res.status(403).json({ error: "Employee can only act during Preparation and Customs clearance" });
  }
  const tx = await markOriginalBl(req.params.id);
  if (!tx) return res.status(404).json({ error: "Transaction not found" });
  notifyAction(req, {
    action: "original_bl",
    entityType: "transaction",
    entityId: tx.id,
    entityLabel: txLabel(tx),
  });
  return res.json(tx);
});

app.post("/api/transactions/:id/pay", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "accountant"]);
  if (!denied) return;
  const tx = await markPaid(req.params.id);
  if (!tx) return res.status(404).json({ error: "Transaction not found" });
  notifyAction(req, {
    action: "paid",
    entityType: "transaction",
    entityId: tx.id,
    entityLabel: txLabel(tx),
  });
  return res.json(tx);
});

app.post("/api/transactions/:id/release", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "accountant"]);
  if (!denied) return;
  const result = await issueRelease(req.params.id);
  if (result === null) return res.status(404).json({ error: "Transaction not found" });
  if (result === false) return res.status(400).json({ error: "Payment and Original BL/Telex are required before release" });
  notifyAction(req, {
    action: "released",
    entityType: "transaction",
    entityId: result.id,
    entityLabel: txLabel(result),
  });
  return res.json(result);
});

app.post("/api/transactions/:id/stage", authenticate, async (req: AuthRequest, res) => {
  const role = ensureRole(req, res, ["manager", "employee", "employee2"]);
  if (!role) return;
  const schema = z.object({
    stage: z.enum(["PREPARATION", "CUSTOMS_CLEARANCE", "TRANSPORTATION", "STORAGE"]),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  if (!roleMaySetTargetStage(role, result.data.stage)) {
    return res.status(403).json({ error: "Your role cannot move the record to this stage" });
  }
  if (result.data.stage === "CUSTOMS_CLEARANCE") {
    const tx = await getTransaction(req.params.id);
    if (!tx) return res.status(404).json({ error: "Transaction not found" });
    const currentStage = tx.transactionStage ?? "PREPARATION";
    if (currentStage === "PREPARATION") {
      const missing = getMissingFieldsBeforeCustomsClearance(tx);
      if (missing.length > 0) {
        return res.status(400).json({
          error: `Fill all required preparation fields before Customs clearance: ${missing.join(", ")}`,
        });
      }
    }
  }
  const updated = await setTransactionStage(req.params.id, result.data.stage);
  if (updated === false) return res.status(400).json({ error: "Invalid stage transition" });
  if (!updated) return res.status(404).json({ error: "Transaction not found" });
  notifyAction(req, {
    action: "stage_changed",
    entityType: "transaction",
    entityId: updated.id,
    entityLabel: txLabel(updated),
    detail: result.data.stage,
  });
  return res.json(updated);
});

app.put("/api/transactions/:id", authenticate, maybeUpload, async (req: AuthRequest, res) => {
  const role = req.user?.role;
  if (!role) return res.status(401).json({ error: "Unauthorized" });

  try {
    const body = req.body as Record<string, unknown>;
    const existingRaw = body.existingAttachments;
    const bodyForZod = { ...body };
    delete bodyForZod.existingAttachments;

    const result = updateTransactionPayloadSchema.safeParse(bodyForZod);
    if (!result.success) {
      return res.status(400).json({ error: result.error.flatten() });
    }

    const hasMultipartEarly = (req.headers["content-type"] || "").includes("multipart/form-data");
    const prev = await getTransaction(req.params.id);
    if (!prev) return res.status(404).json({ error: "Transaction not found" });
    const atStorage = prev.transactionStage === "STORAGE";

    if (Object.keys(result.data).length === 0) {
      if (
        atStorage &&
        hasMultipartEarly &&
        attachmentPathSetsEqual(prev.documentAttachments, parseExistingAttachmentsJson(existingRaw))
      ) {
        return res.json(prev);
      }
      return res.status(400).json({ error: "No fields to update" });
    }

    if (role === "employee" && result.data.paymentStatus !== undefined) {
      return res.status(403).json({ error: "Employee cannot manage accounting fields" });
    }
    if (role === "employee2" && result.data.paymentStatus !== undefined) {
      return res.status(403).json({ error: "Employee2 cannot manage accounting fields" });
    }

    const fieldError = validateRoleFieldUpdates(role, txStageOf(prev), result.data);
    if (fieldError) return res.status(403).json({ error: fieldError });

    const hasMultipart = hasMultipartEarly;
    let payload: Partial<Transaction> = { ...result.data };
    if (typeof payload.originCountry === "string" && payload.originCountry !== undefined) {
      payload.originCountry = payload.originCountry.toUpperCase();
    }

    if (hasMultipart) {
      const files = ((req as Request & { files?: Express.Multer.File[] }).files ?? []) as Express.Multer.File[];
      if (role === "employee2" && files.length > 0 && txStageOf(prev) !== "TRANSPORTATION") {
        return res.status(403).json({ error: "Employee2 can upload attachments only during Transportation stage" });
      }
      if (role === "employee" && files.length > 0 && !EMPLOYEE_WORK_STAGES.has(txStageOf(prev))) {
        return res.status(403).json({ error: "Employee can upload attachments only during Preparation and Customs clearance" });
      }
      if (atStorage) {
        if (files.length > 0) {
          return res.status(400).json({ error: "Cannot upload new documents while the transaction is in Storage stage" });
        }
        const retained = parseExistingAttachmentsJson(existingRaw);
        if (!attachmentPathSetsEqual(prev.documentAttachments, retained)) {
          return res.status(400).json({ error: "Cannot add or remove document attachments in Storage stage" });
        }
      } else {
        const categories = parseDocumentPhotoCategories(body.documentPhotoCategories, files.length);
        if (files.length > 0 && categories.length !== files.length) {
          return res.status(400).json({ error: "Each uploaded document must have a category" });
        }
        for (const c of categories) {
          if (!documentCategoryEnum.safeParse(c).success) {
            return res.status(400).json({ error: "Invalid document category" });
          }
        }
        const uploaded: DocumentAttachment[] = files.map((f, idx) => ({
          path: publicPathForUploadedFile(f.filename),
          originalName: attachmentDisplayNameFromStoredFilename(f.filename),
          category: categories[idx] as DocumentAttachment["category"],
        }));
        const retained = parseExistingAttachmentsJson(existingRaw);
        const merged = [...retained, ...uploaded];
        await removeOrphanFiles(prev.documentAttachments, merged);
        payload = { ...payload, documentAttachments: merged };
      }
    }

    const tx = await updateTransaction(req.params.id, payload);
    if (!tx) return res.status(404).json({ error: "Transaction not found" });
    notifyAction(req, {
      action: "updated",
      entityType: "transaction",
      entityId: tx.id,
      entityLabel: txLabel(tx),
    });
    return res.json(tx);
  } catch (e) {
    console.error("PUT /api/transactions/:id", e);
    const message = e instanceof Error ? e.message : "Transaction update failed";
    return res.status(500).json({ error: message });
  }
});

app.delete("/api/transactions/:id", authenticate, async (req: AuthRequest, res) => {
  const role = ensureRole(req, res, ["manager", "employee"]);
  if (!role) return;
  const existingTx = await getTransaction(req.params.id);
  if (existingTx && role === "employee" && !EMPLOYEE_WORK_STAGES.has(txStageOf(existingTx))) {
    return res.status(403).json({ error: "Employee can only delete during Preparation and Customs clearance" });
  }
  const ok = await deleteTransaction(req.params.id);
  if (!ok) return res.status(404).json({ error: "Transaction not found" });
  notifyAction(req, {
    action: "deleted",
    entityType: "transaction",
    entityId: req.params.id,
    entityLabel: existingTx ? txLabel(existingTx) : req.params.id,
  });
  return res.status(204).send();
});

app.get("/api/transfers", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee", "employee2", "accountant"]);
  if (!denied) return;
  const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  res.json(await listTransfers(clientId, limit));
});

app.post("/api/transfers", authenticate, maybeUpload, validate(z.object({ body: createTransactionPayloadSchema })), async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee"]);
  if (!denied) return;
  try {
    const files = ((req as Request & { files?: Express.Multer.File[] }).files ?? []) as Express.Multer.File[];
    const categories = parseDocumentPhotoCategories((req.body as Record<string, unknown>).documentPhotoCategories, files.length);
    if (files.length > 0 && categories.length !== files.length) {
      return res.status(400).json({ error: "Each uploaded document must have a category" });
    }
    for (const c of categories) {
      if (!documentCategoryEnum.safeParse(c).success) return res.status(400).json({ error: "Invalid document category" });
    }
    const documentAttachments: DocumentAttachment[] = files.map((f, idx) => ({
      path: publicPathForUploadedFile(f.filename),
      originalName: attachmentDisplayNameFromStoredFilename(f.filename),
      category: categories[idx] as DocumentAttachment["category"],
    }));
    const data = {
      ...req.body,
      originCountry: (req.body as any).originCountry.toUpperCase(),
      documentAttachments: documentAttachments.length ? documentAttachments : undefined,
    };
    const created = await createTransfer(data);
    notifyAction(req, {
      action: "created",
      entityType: "transfer",
      entityId: created.id,
      entityLabel: txLabel(created),
    });
    return res.status(201).json(created);
  } catch (e) {
    console.error("POST /api/transfers", e);
    const message = e instanceof Error ? e.message : "Transfer create failed";
    return res.status(500).json({ error: message });
  }
});

app.get("/api/transfers/:id", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee", "employee2", "accountant"]);
  if (!denied) return;
  const tx = await getTransfer(req.params.id);
  if (!tx) return res.status(404).json({ error: "Transfer not found" });
  return res.json(tx);
});

registerAccountingRoutes("transfers", "transfer", getTransfer, updateTransferAccounting);

app.post("/api/transfers/:id/pay", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "accountant"]);
  if (!denied) return;
  const tx = await markTransferPaid(req.params.id);
  if (!tx) return res.status(404).json({ error: "Transfer not found" });
  notifyAction(req, {
    action: "paid",
    entityType: "transfer",
    entityId: tx.id,
    entityLabel: txLabel(tx),
  });
  return res.json(tx);
});

app.post("/api/transfers/:id/release", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "accountant"]);
  if (!denied) return;
  const result = await issueTransferRelease(req.params.id);
  if (result === null) return res.status(404).json({ error: "Transfer not found" });
  if (result === false) return res.status(400).json({ error: "Payment and Original BL/Telex are required before release" });
  notifyAction(req, {
    action: "released",
    entityType: "transfer",
    entityId: result.id,
    entityLabel: txLabel(result),
  });
  return res.json(result);
});

app.post("/api/transfers/:id/stage", authenticate, async (req: AuthRequest, res) => {
  const role = ensureRole(req, res, ["manager", "employee", "employee2"]);
  if (!role) return;
  const schema = z.object({
    stage: z.enum(["PREPARATION", "CUSTOMS_CLEARANCE", "TRANSPORTATION", "STORAGE"]),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  if (!roleMaySetTargetStage(role, result.data.stage)) {
    return res.status(403).json({ error: "Your role cannot move the record to this stage" });
  }
  if (result.data.stage === "CUSTOMS_CLEARANCE") {
    const tx = await getTransfer(req.params.id);
    if (!tx) return res.status(404).json({ error: "Transfer not found" });
    const currentStage = tx.transactionStage ?? "PREPARATION";
    if (currentStage === "PREPARATION") {
      const missing = getMissingFieldsBeforeCustomsClearanceForTransferOrExport(tx);
      if (missing.length > 0) {
        return res.status(400).json({
          error: `Fill all required preparation fields before Customs clearance: ${missing.join(", ")}`,
        });
      }
    }
  }
  const updated = await setTransferStage(req.params.id, result.data.stage);
  if (updated === false) return res.status(400).json({ error: "Invalid stage transition" });
  if (!updated) return res.status(404).json({ error: "Transfer not found" });
  notifyAction(req, {
    action: "stage_changed",
    entityType: "transfer",
    entityId: updated.id,
    entityLabel: txLabel(updated),
    detail: result.data.stage,
  });
  return res.json(updated);
});

app.put("/api/transfers/:id", authenticate, maybeUpload, validate(z.object({ body: updateTransactionPayloadSchema })), async (req: AuthRequest, res) => {
  const role = req.user?.role;
  if (!role) return res.status(401).json({ error: "Unauthorized" });
  try {
    const body = req.body as Record<string, unknown>;
    const existingRaw = body.existingAttachments;
    const bodyForZod = { ...body };
    delete bodyForZod.existingAttachments;
    
    const hasMultipartTransferEarly = (req.headers["content-type"] || "").includes("multipart/form-data");
    const prev = await getTransfer(req.params.id);
    if (!prev) return res.status(404).json({ error: "Transfer not found" });
    const atStorage = prev.transactionStage === "STORAGE";

    if (Object.keys(req.body).length === 0) {
      if (
        atStorage &&
        hasMultipartTransferEarly &&
        attachmentPathSetsEqual(prev.documentAttachments, parseExistingAttachmentsJson(existingRaw))
      ) {
        return res.json(prev);
      }
      return res.status(400).json({ error: "No fields to update" });
    }

    if ((role === "employee" || role === "employee2") && (req.body as any).paymentStatus !== undefined) {
      return res.status(403).json({ error: "Employee cannot manage accounting fields" });
    }
    const fieldError = validateRoleFieldUpdates(role, txStageOf(prev), req.body);
    if (fieldError) return res.status(403).json({ error: fieldError });

    const hasMultipart = hasMultipartTransferEarly;
    let payload: Parameters<typeof updateTransfer>[1] = { ...req.body };
    if ((req.body as any).originCountry !== undefined) {
      payload.originCountry = (req.body as any).originCountry.toUpperCase();
    }
    if (hasMultipart) {
      const files = ((req as Request & { files?: Express.Multer.File[] }).files ?? []) as Express.Multer.File[];
      if (atStorage) {
        if (files.length > 0) {
          return res.status(400).json({ error: "Cannot upload new documents while the transfer is in Storage stage" });
        }
        const retained = parseExistingAttachmentsJson(existingRaw);
        if (!attachmentPathSetsEqual(prev.documentAttachments, retained)) {
          return res.status(400).json({ error: "Cannot add or remove document attachments in Storage stage" });
        }
      } else {
        if (role === "employee2" && files.length > 0 && txStageOf(prev) !== "TRANSPORTATION") {
          return res.status(403).json({ error: "Employee2 can upload attachments only during Transportation stage" });
        }
        if (role === "employee" && files.length > 0 && !EMPLOYEE_WORK_STAGES.has(txStageOf(prev))) {
          return res.status(403).json({ error: "Employee can upload attachments only during Preparation and Customs clearance" });
        }
        const categories = parseDocumentPhotoCategories(body.documentPhotoCategories, files.length);
        if (files.length > 0 && categories.length !== files.length) return res.status(400).json({ error: "Each uploaded document must have a category" });
        for (const c of categories) {
          if (!documentCategoryEnum.safeParse(c).success) return res.status(400).json({ error: "Invalid document category" });
        }
        const uploaded: DocumentAttachment[] = files.map((f, idx) => ({
          path: publicPathForUploadedFile(f.filename),
          originalName: attachmentDisplayNameFromStoredFilename(f.filename),
          category: categories[idx] as DocumentAttachment["category"],
        }));
        const retained = parseExistingAttachmentsJson(existingRaw);
        const merged = [...retained, ...uploaded];
        await removeOrphanFiles(prev.documentAttachments, merged);
        payload = { ...payload, documentAttachments: merged };
      }
    }
    const tx = await updateTransfer(req.params.id, payload);
    if (!tx) return res.status(404).json({ error: "Transfer not found" });
    notifyAction(req, {
      action: "updated",
      entityType: "transfer",
      entityId: tx.id,
      entityLabel: txLabel(tx),
    });
    return res.json(tx);
  } catch (e) {
    console.error("PUT /api/transfers/:id", e);
    const message = e instanceof Error ? e.message : "Transfer update failed";
    return res.status(500).json({ error: message });
  }
});

app.delete("/api/transfers/:id", authenticate, async (req: AuthRequest, res) => {
  const role = ensureRole(req, res, ["manager", "employee"]);
  if (!role) return;
  const existingTransfer = await getTransfer(req.params.id);
  if (existingTransfer && role === "employee" && !EMPLOYEE_WORK_STAGES.has(txStageOf(existingTransfer))) {
    return res.status(403).json({ error: "Employee can only delete during Preparation and Customs clearance" });
  }
  const ok = await deleteTransfer(req.params.id);
  if (!ok) return res.status(404).json({ error: "Transfer not found" });
  notifyAction(req, {
    action: "deleted",
    entityType: "transfer",
    entityId: req.params.id,
    entityLabel: existingTransfer ? txLabel(existingTransfer) : req.params.id,
  });
  return res.status(204).send();
});

app.get("/api/exports", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee", "employee2", "accountant"]);
  if (!denied) return;
  const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  res.json(await listExports(clientId, limit));
});

app.post("/api/exports", authenticate, maybeUpload, validate(z.object({ body: createTransactionPayloadSchema })), async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee"]);
  if (!denied) return;
  try {
    const files = ((req as Request & { files?: Express.Multer.File[] }).files ?? []) as Express.Multer.File[];
    const categories = parseDocumentPhotoCategories((req.body as Record<string, unknown>).documentPhotoCategories, files.length);
    if (files.length > 0 && categories.length !== files.length) {
      return res.status(400).json({ error: "Each uploaded document must have a category" });
    }
    for (const c of categories) {
      if (!documentCategoryEnum.safeParse(c).success) return res.status(400).json({ error: "Invalid document category" });
    }
    const documentAttachments: DocumentAttachment[] = files.map((f, idx) => ({
      path: publicPathForUploadedFile(f.filename),
      originalName: attachmentDisplayNameFromStoredFilename(f.filename),
      category: categories[idx] as DocumentAttachment["category"],
    }));
    const data = {
      ...req.body,
      originCountry: (req.body as any).originCountry.toUpperCase(),
      documentAttachments: documentAttachments.length ? documentAttachments : undefined,
    };
    const created = await createExport(data);
    notifyAction(req, {
      action: "created",
      entityType: "export",
      entityId: created.id,
      entityLabel: txLabel(created),
    });
    return res.status(201).json(created);
  } catch (e) {
    console.error("POST /api/exports", e);
    const message = e instanceof Error ? e.message : "Export create failed";
    return res.status(500).json({ error: message });
  }
});

app.get("/api/exports/:id", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee", "employee2", "accountant"]);
  if (!denied) return;
  const tx = await getExport(req.params.id);
  if (!tx) return res.status(404).json({ error: "Export not found" });
  return res.json(tx);
});

registerAccountingRoutes("exports", "export", getExport, updateExportAccounting);

app.post("/api/exports/:id/pay", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "accountant"]);
  if (!denied) return;
  const tx = await markExportPaid(req.params.id);
  if (!tx) return res.status(404).json({ error: "Export not found" });
  notifyAction(req, {
    action: "paid",
    entityType: "export",
    entityId: tx.id,
    entityLabel: txLabel(tx),
  });
  return res.json(tx);
});

app.post("/api/exports/:id/release", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "accountant"]);
  if (!denied) return;
  const result = await issueExportRelease(req.params.id);
  if (result === null) return res.status(404).json({ error: "Export not found" });
  if (result === false) return res.status(400).json({ error: "Payment and Original BL/Telex are required before release" });
  notifyAction(req, {
    action: "released",
    entityType: "export",
    entityId: result.id,
    entityLabel: txLabel(result),
  });
  return res.json(result);
});

app.post("/api/exports/:id/stage", authenticate, async (req: AuthRequest, res) => {
  const role = ensureRole(req, res, ["manager", "employee", "employee2"]);
  if (!role) return;
  const schema = z.object({
    stage: z.enum(["PREPARATION", "CUSTOMS_CLEARANCE", "TRANSPORTATION"]),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
  if (!roleMaySetTargetStage(role, result.data.stage)) {
    return res.status(403).json({ error: "Your role cannot move the record to this stage" });
  }
  if (result.data.stage === "CUSTOMS_CLEARANCE") {
    const tx = await getExport(req.params.id);
    if (!tx) return res.status(404).json({ error: "Export not found" });
    const currentStage = tx.transactionStage ?? "PREPARATION";
    if (currentStage === "PREPARATION") {
      const missing = getMissingFieldsBeforeCustomsClearanceForTransferOrExport(tx);
      if (missing.length > 0) {
        return res.status(400).json({
          error: `Fill all required preparation fields before Customs clearance: ${missing.join(", ")}`,
        });
      }
    }
  }
  const updated = await setExportStage(req.params.id, result.data.stage);
  if (updated === false) return res.status(400).json({ error: "Invalid stage transition" });
  if (!updated) return res.status(404).json({ error: "Export not found" });
  const stageTx = updated;
  notifyAction(req, {
    action: "stage_changed",
    entityType: "export",
    entityId: stageTx.id,
    entityLabel: txLabel(stageTx),
    detail: result.data.stage,
  });
  return res.json(stageTx);
});

app.put("/api/exports/:id", authenticate, maybeUpload, validate(z.object({ body: updateTransactionPayloadSchema })), async (req: AuthRequest, res) => {
  const role = req.user?.role;
  if (!role) return res.status(401).json({ error: "Unauthorized" });
  try {
    const body = req.body as Record<string, unknown>;
    const existingRaw = body.existingAttachments;
    const bodyForZod = { ...body };
    delete bodyForZod.existingAttachments;
    if (Object.keys(req.body).length === 0) return res.status(400).json({ error: "No fields to update" });

    const prev = await getExport(req.params.id);
    if (!prev) return res.status(404).json({ error: "Export not found" });

    if ((role === "employee" || role === "employee2") && (req.body as any).paymentStatus !== undefined) {
      return res.status(403).json({ error: "Employee cannot manage accounting fields" });
    }
    const fieldError = validateRoleFieldUpdates(role, txStageOf(prev), req.body);
    if (fieldError) return res.status(403).json({ error: fieldError });

    const hasMultipart = (req.headers["content-type"] || "").includes("multipart/form-data");
    let payload: Parameters<typeof updateExport>[1] = { ...req.body };
    if ((req.body as any).originCountry !== undefined) {
      payload.originCountry = (req.body as any).originCountry.toUpperCase();
    }
    if (hasMultipart) {
      const files = ((req as Request & { files?: Express.Multer.File[] }).files ?? []) as Express.Multer.File[];
      if (role === "employee2" && files.length > 0 && txStageOf(prev) !== "TRANSPORTATION") {
        return res.status(403).json({ error: "Employee2 can upload attachments only during Transportation stage" });
      }
      if (role === "employee" && files.length > 0 && !EMPLOYEE_WORK_STAGES.has(txStageOf(prev))) {
        return res.status(403).json({ error: "Employee can upload attachments only during Preparation and Customs clearance" });
      }
      const categories = parseDocumentPhotoCategories(body.documentPhotoCategories, files.length);
      if (files.length > 0 && categories.length !== files.length) return res.status(400).json({ error: "Each uploaded document must have a category" });
      for (const c of categories) {
        if (!documentCategoryEnum.safeParse(c).success) return res.status(400).json({ error: "Invalid document category" });
      }
      const uploaded: DocumentAttachment[] = files.map((f, idx) => ({
        path: publicPathForUploadedFile(f.filename),
        originalName: attachmentDisplayNameFromStoredFilename(f.filename),
        category: categories[idx] as DocumentAttachment["category"],
      }));
      const retained = parseExistingAttachmentsJson(existingRaw);
      const merged = [...retained, ...uploaded];
      await removeOrphanFiles(prev.documentAttachments, merged);
      payload = { ...payload, documentAttachments: merged };
    }
    const tx = await updateExport(req.params.id, payload);
    if (!tx) return res.status(404).json({ error: "Export not found" });
    notifyAction(req, {
      action: "updated",
      entityType: "export",
      entityId: tx.id,
      entityLabel: txLabel(tx),
    });
    return res.json(tx);
  } catch (e) {
    console.error("PUT /api/exports/:id", e);
    const message = e instanceof Error ? e.message : "Export update failed";
    return res.status(500).json({ error: message });
  }
});

app.delete("/api/exports/:id", authenticate, async (req: AuthRequest, res) => {
  const role = ensureRole(req, res, ["manager", "employee"]);
  if (!role) return;
  const existingExport = await getExport(req.params.id);
  if (existingExport && role === "employee" && !EMPLOYEE_WORK_STAGES.has(txStageOf(existingExport))) {
    return res.status(403).json({ error: "Employee can only delete during Preparation and Customs clearance" });
  }
  const ok = await deleteExport(req.params.id);
  if (!ok) return res.status(404).json({ error: "Export not found" });
  notifyAction(req, {
    action: "deleted",
    entityType: "export",
    entityId: req.params.id,
    entityLabel: existingExport ? txLabel(existingExport) : req.params.id,
  });
  return res.status(204).send();
});

function isMulterError(err: unknown): err is multer.MulterError {
  return typeof err === "object" && err !== null && "code" in err && typeof (err as { code: unknown }).code === "string";
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (isMulterError(err)) {
    return res.status(400).json({
      error: `Upload error (${err.code}): ${err.message}${err.field ? ` — field: ${err.field}` : ""}`,
    });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  return res.status(500).json({ error: message });
});

const port = Number(process.env.PORT ?? 4000);
connectDb()
  .then(async () => {
    const { hashPassword, isPasswordHashed } = await import("./password.js");
    const defaultPasswordHash = await hashPassword("123456");
    const defaults = [
      { name: "Main Manager", email: "manager@tracker.local", password: defaultPasswordHash, role: "manager" as const },
      { name: "Operations Employee", email: "employee@tracker.local", password: defaultPasswordHash, role: "employee" as const },
      { name: "Finance Accountant", email: "accountant@tracker.local", password: defaultPasswordHash, role: "accountant" as const },
      { name: "employee2", email: "employee2@tracker.local", password: defaultPasswordHash, role: "employee2" as const },
    ];
    const isProduction = process.env.NODE_ENV === "production";
    for (const item of defaults) {
      if (isProduction) {
        await EmployeeModel.updateOne({ email: item.email }, { $setOnInsert: item }, { upsert: true });
      } else {
        // Dev/demo: keep default logins working (manager@tracker.local / 123456).
        await EmployeeModel.updateOne(
          { email: item.email },
          { $set: { name: item.name, role: item.role, password: defaultPasswordHash } },
          { upsert: true },
        );
      }
    }
    const legacyEmployees = await EmployeeModel.find({
      password: { $not: { $regex: /^\$2[aby]\$/ } },
    }).lean();
    for (const emp of legacyEmployees) {
      const plain = (emp as { password?: string }).password;
      if (plain && !isPasswordHashed(plain)) {
        await EmployeeModel.updateOne(
          { _id: (emp as { _id: unknown })._id },
          { $set: { password: await hashPassword(plain) } },
        );
      }
    }
    const httpServer = createServer(app);
    initNotificationSocket(httpServer);
    httpServer.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect database", error);
    process.exit(1);
  });
