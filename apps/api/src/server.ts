import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
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
} from "./store.js";
import type { DocumentAttachment, Transaction } from "./types.js";
import { absolutePathFromPublicPath, publicPathForUploadedFile, transactionDocsUpload } from "./uploads.js";

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

app.post("/api/auth/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(4),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const { verifyPassword, hashPassword, isPasswordHashed } = await import("./password.js");
  const email = result.data.email.toLowerCase().trim();
  const user = (await EmployeeModel.findOne({ email }).lean()) as
    | { _id: string; email: string; name: string; role: UserRole; password: string }
    | null;
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const passwordOk = await verifyPassword(result.data.password, user.password);
  if (!passwordOk) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  if (!isPasswordHashed(user.password)) {
    await EmployeeModel.updateOne(
      { _id: user._id },
      { $set: { password: await hashPassword(result.data.password) } },
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

app.put("/api/auth/me", authenticate, async (req: AuthRequest, res) => {
  const schema = z
    .object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      password: optionalEmployeePassword,
    })
    .refine((value) => Object.keys(value).length > 0, "At least one field is required");

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  try {
    const updated = await updateEmployee(req.user!.id, result.data);
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

app.post("/api/employees", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(4),
    role: z.enum(["manager", "employee", "employee2", "accountant"]),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  try {
    return res.status(201).json(await createEmployee(result.data));
  } catch (err: unknown) {
    if ((err as { code?: number })?.code === 11000) {
      return res.status(409).json({ error: "email_taken" });
    }
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/employees/:id", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;
  const schema = z
    .object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      password: optionalEmployeePassword,
      role: z.enum(["manager", "employee", "employee2", "accountant"]).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, "At least one field is required");

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  if (result.data.role !== undefined && result.data.role !== "manager") {
    const current = (await EmployeeModel.findById(req.params.id).lean()) as { role?: UserRole } | null;
    if (current?.role === "manager") {
      const managers = await EmployeeModel.countDocuments({ role: "manager" });
      if (managers <= 1) {
        return res.status(400).json({ error: "last_manager_role" });
      }
    }
  }

  try {
    const updated = await updateEmployee(req.params.id, result.data);
    if (!updated) return res.status(404).json({ error: "Employee not found" });
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

app.post("/api/clients", authenticate, async (req, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;
  const schema = z.object({
    companyName: z.string().min(2),
    trn: z.string().min(2),
    immigrationCode: z.string().optional(),
    email: optionalClientEmail,
    country: optionalClientCountry,
    creditLimit: z.number().nonnegative().default(0),
    status: z.enum(["active", "suspended"]).default("active"),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  return res.status(201).json(await createClient(result.data));
});

app.put("/api/clients/:id", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;
  const schema = z
    .object({
      companyName: z.string().min(2).optional(),
      trn: z.string().min(2).optional(),
      immigrationCode: z.string().optional(),
      email: optionalClientEmail,
      country: optionalClientCountry,
      creditLimit: z.number().nonnegative().optional(),
      status: z.enum(["active", "suspended"]).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, "At least one field is required");

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const client = await updateClient(req.params.id, result.data);
  if (!client) return res.status(404).json({ error: "Client not found" });
  return res.json(client);
});

app.delete("/api/clients/:id", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;
  const ok = await deleteClient(req.params.id);
  if (!ok) return res.status(404).json({ error: "Client not found" });
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

app.post("/api/shipping-companies", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;
  const schema = z
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
    );
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  return res.status(201).json(await createShippingCompany(result.data));
});

app.put("/api/shipping-companies/:id", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;
  const schema = z
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
    );
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  const item = await updateShippingCompany(req.params.id, result.data);
  if (!item) return res.status(404).json({ error: "Shipping company not found" });
  return res.json(item);
});

app.delete("/api/shipping-companies/:id", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager"]);
  if (!denied) return;
  const ok = await deleteShippingCompany(req.params.id);
  if (!ok) return res.status(404).json({ error: "Shipping company not found" });
  return res.status(204).send();
});

app.get("/api/transactions", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee", "employee2", "accountant"]);
  if (!denied) return;
  const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  res.json(await listTransactions(clientId, limit));
});

app.post("/api/transactions", authenticate, maybeUpload, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee"]);
  if (!denied) return;
  try {
    const result = createTransactionPayloadSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.flatten() });
    }
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
      ...result.data,
      originCountry: result.data.originCountry.toUpperCase(),
      documentAttachments: documentAttachments.length ? documentAttachments : undefined,
    };
    return res.status(201).json(await createTransaction(data));
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

app.post("/api/transactions/:id/original-bl", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee"]);
  if (!denied) return;
  const tx = await markOriginalBl(req.params.id);
  if (!tx) return res.status(404).json({ error: "Transaction not found" });
  return res.json(tx);
});

app.post("/api/transactions/:id/pay", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "accountant"]);
  if (!denied) return;
  const tx = await markPaid(req.params.id);
  if (!tx) return res.status(404).json({ error: "Transaction not found" });
  return res.json(tx);
});

app.post("/api/transactions/:id/release", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "accountant"]);
  if (!denied) return;
  const result = await issueRelease(req.params.id);
  if (result === null) return res.status(404).json({ error: "Transaction not found" });
  if (result === false) return res.status(400).json({ error: "Payment and Original BL/Telex are required before release" });
  return res.json(result);
});

app.post("/api/transactions/:id/stage", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee2"]);
  if (!denied) return;
  const schema = z.object({
    stage: z.enum(["PREPARATION", "CUSTOMS_CLEARANCE", "TRANSPORTATION", "STORAGE"]),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
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
  if (updated === null) return res.status(404).json({ error: "Transaction not found" });
  if (updated === false) return res.status(400).json({ error: "Invalid stage transition" });
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

    if (role === "employee") {
      if (atStorage) {
        const invalidFields = Object.keys(result.data).filter(
          (key) => !STORAGE_STAGE_EDITABLE_FIELDS.has(key as keyof Transaction),
        );
        if (invalidFields.length > 0) {
          return res.status(403).json({
            error: `At Storage stage, employee may only edit warehouse fields: ${invalidFields.join(", ")}`,
          });
        }
      } else {
        const invalidFields = Object.keys(result.data).filter((key) => !stage1EmployeeFields.has(key));
        if (invalidFields.length > 0) {
          return res.status(403).json({ error: `Employee can only edit stage 1 fields: ${invalidFields.join(", ")}` });
        }
      }
    }
    if (role === "employee2") {
      if (atStorage) {
        const invalidFields = Object.keys(result.data).filter(
          (key) => !STORAGE_STAGE_EDITABLE_FIELDS.has(key as keyof Transaction),
        );
        if (invalidFields.length > 0) {
          return res.status(403).json({
            error: `At Storage stage, employee2 may only edit warehouse fields: ${invalidFields.join(", ")}`,
          });
        }
      } else {
        const invalidFields = Object.keys(result.data).filter((key) => !stage2EmployeeFields.has(key));
        if (invalidFields.length > 0) {
          return res.status(403).json({ error: `Employee2 can only edit stage 2 fields: ${invalidFields.join(", ")}` });
        }
      }
    }

    if (role === "accountant") {
      const nonAccountingFieldProvided = Object.keys(result.data).some((key) => key !== "paymentStatus");
      if (nonAccountingFieldProvided) {
        return res.status(403).json({ error: "Accountant can only update paymentStatus via edit endpoint" });
      }
    }

    const hasMultipart = hasMultipartEarly;
    let payload: Parameters<typeof updateTransaction>[1] = { ...result.data };
    if (result.data.originCountry !== undefined) {
      payload.originCountry = result.data.originCountry.toUpperCase();
    }

    if (hasMultipart) {
      const files = ((req as Request & { files?: Express.Multer.File[] }).files ?? []) as Express.Multer.File[];
      if (role === "employee2" && files.length > 0) {
        return res.status(403).json({ error: "Employee2 cannot upload attachments" });
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
    return res.json(tx);
  } catch (e) {
    console.error("PUT /api/transactions/:id", e);
    const message = e instanceof Error ? e.message : "Transaction update failed";
    return res.status(500).json({ error: message });
  }
});

app.delete("/api/transactions/:id", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee"]);
  if (!denied) return;
  const ok = await deleteTransaction(req.params.id);
  if (!ok) return res.status(404).json({ error: "Transaction not found" });
  return res.status(204).send();
});

app.get("/api/transfers", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee", "employee2", "accountant"]);
  if (!denied) return;
  const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  res.json(await listTransfers(clientId, limit));
});

app.post("/api/transfers", authenticate, maybeUpload, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee"]);
  if (!denied) return;
  try {
    const result = createTransactionPayloadSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });
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
      ...result.data,
      originCountry: result.data.originCountry.toUpperCase(),
      documentAttachments: documentAttachments.length ? documentAttachments : undefined,
    };
    return res.status(201).json(await createTransfer(data));
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

app.post("/api/transfers/:id/pay", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "accountant"]);
  if (!denied) return;
  const tx = await markTransferPaid(req.params.id);
  if (!tx) return res.status(404).json({ error: "Transfer not found" });
  return res.json(tx);
});

app.post("/api/transfers/:id/release", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "accountant"]);
  if (!denied) return;
  const result = await issueTransferRelease(req.params.id);
  if (result === null) return res.status(404).json({ error: "Transfer not found" });
  if (result === false) return res.status(400).json({ error: "Payment and Original BL/Telex are required before release" });
  return res.json(result);
});

app.post("/api/transfers/:id/stage", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee2"]);
  if (!denied) return;
  const schema = z.object({
    stage: z.enum(["PREPARATION", "CUSTOMS_CLEARANCE", "TRANSPORTATION", "STORAGE"]),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
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
  if (updated === null) return res.status(404).json({ error: "Transfer not found" });
  if (updated === false) return res.status(400).json({ error: "Invalid stage transition" });
  return res.json(updated);
});

app.put("/api/transfers/:id", authenticate, maybeUpload, async (req: AuthRequest, res) => {
  const role = req.user?.role;
  if (!role) return res.status(401).json({ error: "Unauthorized" });
  try {
    const body = req.body as Record<string, unknown>;
    const existingRaw = body.existingAttachments;
    const bodyForZod = { ...body };
    delete bodyForZod.existingAttachments;
    const result = updateTransactionPayloadSchema.safeParse(bodyForZod);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });

    const hasMultipartTransferEarly = (req.headers["content-type"] || "").includes("multipart/form-data");
    const prev = await getTransfer(req.params.id);
    if (!prev) return res.status(404).json({ error: "Transfer not found" });
    const atStorage = prev.transactionStage === "STORAGE";

    if (Object.keys(result.data).length === 0) {
      if (
        atStorage &&
        hasMultipartTransferEarly &&
        attachmentPathSetsEqual(prev.documentAttachments, parseExistingAttachmentsJson(existingRaw))
      ) {
        return res.json(prev);
      }
      return res.status(400).json({ error: "No fields to update" });
    }

    if ((role === "employee" || role === "employee2") && result.data.paymentStatus !== undefined) {
      return res.status(403).json({ error: "Employee cannot manage accounting fields" });
    }
    if (role === "employee") {
      if (atStorage) {
        const invalidFields = Object.keys(result.data).filter(
          (key) => !STORAGE_STAGE_EDITABLE_FIELDS.has(key as keyof Transaction),
        );
        if (invalidFields.length > 0) {
          return res.status(403).json({
            error: `At Storage stage, employee may only edit warehouse fields: ${invalidFields.join(", ")}`,
          });
        }
      } else {
        const invalidFields = Object.keys(result.data).filter((key) => !stage1EmployeeFields.has(key));
        if (invalidFields.length > 0) return res.status(403).json({ error: `Employee can only edit stage 1 fields: ${invalidFields.join(", ")}` });
      }
    }
    if (role === "employee2") {
      if (atStorage) {
        const invalidFields = Object.keys(result.data).filter(
          (key) => !STORAGE_STAGE_EDITABLE_FIELDS.has(key as keyof Transaction),
        );
        if (invalidFields.length > 0) {
          return res.status(403).json({
            error: `At Storage stage, employee2 may only edit warehouse fields: ${invalidFields.join(", ")}`,
          });
        }
      } else {
        const invalidFields = Object.keys(result.data).filter((key) => !stage2EmployeeFields.has(key));
        if (invalidFields.length > 0) return res.status(403).json({ error: `Employee2 can only edit stage 2 fields: ${invalidFields.join(", ")}` });
      }
    }
    if (role === "accountant") {
      const nonAccountingFieldProvided = Object.keys(result.data).some((key) => key !== "paymentStatus");
      if (nonAccountingFieldProvided) return res.status(403).json({ error: "Accountant can only update paymentStatus via edit endpoint" });
    }

    const hasMultipart = hasMultipartTransferEarly;
    let payload: Parameters<typeof updateTransfer>[1] = { ...result.data };
    if (result.data.originCountry !== undefined) {
      payload.originCountry = result.data.originCountry.toUpperCase();
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
    return res.json(tx);
  } catch (e) {
    console.error("PUT /api/transfers/:id", e);
    const message = e instanceof Error ? e.message : "Transfer update failed";
    return res.status(500).json({ error: message });
  }
});

app.delete("/api/transfers/:id", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee"]);
  if (!denied) return;
  const ok = await deleteTransfer(req.params.id);
  if (!ok) return res.status(404).json({ error: "Transfer not found" });
  return res.status(204).send();
});

app.get("/api/exports", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee", "employee2", "accountant"]);
  if (!denied) return;
  const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  res.json(await listExports(clientId, limit));
});

app.post("/api/exports", authenticate, maybeUpload, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee"]);
  if (!denied) return;
  try {
    const result = createTransactionPayloadSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });
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
      ...result.data,
      originCountry: result.data.originCountry.toUpperCase(),
      documentAttachments: documentAttachments.length ? documentAttachments : undefined,
    };
    return res.status(201).json(await createExport(data));
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

app.post("/api/exports/:id/pay", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "accountant"]);
  if (!denied) return;
  const tx = await markExportPaid(req.params.id);
  if (!tx) return res.status(404).json({ error: "Export not found" });
  return res.json(tx);
});

app.post("/api/exports/:id/release", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "accountant"]);
  if (!denied) return;
  const result = await issueExportRelease(req.params.id);
  if (result === null) return res.status(404).json({ error: "Export not found" });
  if (result === false) return res.status(400).json({ error: "Payment and Original BL/Telex are required before release" });
  return res.json(result);
});

app.post("/api/exports/:id/stage", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee2"]);
  if (!denied) return;
  const schema = z.object({
    stage: z.enum(["PREPARATION", "CUSTOMS_CLEARANCE", "TRANSPORTATION"]),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });
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
  if (updated === null) return res.status(404).json({ error: "Export not found" });
  if (updated === false) return res.status(400).json({ error: "Invalid stage transition" });
  return res.json(updated);
});

app.put("/api/exports/:id", authenticate, maybeUpload, async (req: AuthRequest, res) => {
  const role = req.user?.role;
  if (!role) return res.status(401).json({ error: "Unauthorized" });
  try {
    const body = req.body as Record<string, unknown>;
    const existingRaw = body.existingAttachments;
    const bodyForZod = { ...body };
    delete bodyForZod.existingAttachments;
    const result = updateTransactionPayloadSchema.safeParse(bodyForZod);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });
    if (Object.keys(result.data).length === 0) return res.status(400).json({ error: "No fields to update" });

    if ((role === "employee" || role === "employee2") && result.data.paymentStatus !== undefined) {
      return res.status(403).json({ error: "Employee cannot manage accounting fields" });
    }
    if (role === "employee") {
      const invalidFields = Object.keys(result.data).filter((key) => !stage1EmployeeFields.has(key));
      if (invalidFields.length > 0) return res.status(403).json({ error: `Employee can only edit stage 1 fields: ${invalidFields.join(", ")}` });
    }
    if (role === "employee2") {
      const invalidFields = Object.keys(result.data).filter((key) => !stage2EmployeeFields.has(key));
      if (invalidFields.length > 0) return res.status(403).json({ error: `Employee2 can only edit stage 2 fields: ${invalidFields.join(", ")}` });
    }
    if (role === "accountant") {
      const nonAccountingFieldProvided = Object.keys(result.data).some((key) => key !== "paymentStatus");
      if (nonAccountingFieldProvided) return res.status(403).json({ error: "Accountant can only update paymentStatus via edit endpoint" });
    }

    const hasMultipart = (req.headers["content-type"] || "").includes("multipart/form-data");
    let payload: Parameters<typeof updateExport>[1] = { ...result.data };
    if (result.data.originCountry !== undefined) {
      payload.originCountry = result.data.originCountry.toUpperCase();
    }
    if (hasMultipart) {
      const prev = await getExport(req.params.id);
      if (!prev) return res.status(404).json({ error: "Export not found" });
      const files = ((req as Request & { files?: Express.Multer.File[] }).files ?? []) as Express.Multer.File[];
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
    return res.json(tx);
  } catch (e) {
    console.error("PUT /api/exports/:id", e);
    const message = e instanceof Error ? e.message : "Export update failed";
    return res.status(500).json({ error: message });
  }
});

app.delete("/api/exports/:id", authenticate, async (req: AuthRequest, res) => {
  const denied = ensureRole(req, res, ["manager", "employee"]);
  if (!denied) return;
  const ok = await deleteExport(req.params.id);
  if (!ok) return res.status(404).json({ error: "Export not found" });
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
    for (const item of defaults) {
      await EmployeeModel.updateOne({ email: item.email }, { $setOnInsert: item }, { upsert: true });
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
    app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect database", error);
    process.exit(1);
  });
