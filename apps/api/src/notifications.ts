import type { Server as HttpServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import type { Socket } from "socket.io";
import { verifyAuthToken, type UserRole } from "./auth.js";
import { EmployeeModel, NotificationModel } from "./models.js";
import { sendFcmToTokens } from "./fcm.js";
import type { AppNotification, NotificationAction } from "./types.js";

export interface ProjectActionInput {
  actor: { id: string; name: string; role: UserRole };
  action: NotificationAction;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  detail?: string;
}

let io: SocketServer | null = null;

function mapNotification(doc: {
  _id: unknown;
  recipientId: unknown;
  actorId: string;
  actorName: string;
  action: NotificationAction;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  title: string;
  message: string;
  read: boolean;
  createdAt?: Date;
}): AppNotification {
  return {
    id: String(doc._id),
    recipientId: String(doc.recipientId),
    actorId: doc.actorId,
    actorName: doc.actorName,
    action: doc.action,
    entityType: doc.entityType,
    entityId: doc.entityId,
    entityLabel: doc.entityLabel,
    title: doc.title,
    message: doc.message,
    read: doc.read,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
  };
}

function buildCopy(input: ProjectActionInput): { title: string; message: string } {
  const who = input.actor.name;
  const label = input.entityLabel?.trim() || input.entityId || "item";
  const entity = input.entityType.replace(/_/g, " ");
  switch (input.action) {
    case "created":
      return { title: "New record", message: `${who} created ${entity}: ${label}` };
    case "updated":
      return { title: "Record updated", message: `${who} updated ${entity}: ${label}` };
    case "deleted":
      return { title: "Record deleted", message: `${who} deleted ${entity}: ${label}` };
    case "stage_changed":
      return {
        title: "Stage changed",
        message: `${who} moved ${entity} ${label}${input.detail ? ` to ${input.detail}` : ""}`,
      };
    case "paid":
      return { title: "Payment recorded", message: `${who} marked ${entity} ${label} as paid` };
    case "released":
      return { title: "Release issued", message: `${who} issued release for ${entity} ${label}` };
    case "original_bl":
      return { title: "Original B/L marked", message: `${who} marked original B/L on ${label}` };
    default:
      return { title: "Project update", message: `${who} changed ${entity}: ${label}` };
  }
}

async function resolveRecipientIds(actorId: string, actorRole: UserRole): Promise<string[]> {
  const employees = await EmployeeModel.find({}, { _id: 1, role: 1 }).lean();
  const ids: string[] = [];
  for (const emp of employees) {
    const id = String(emp._id);
    if (id === actorId) continue;
    const role = emp.role as UserRole;
    if (actorRole === "manager") {
      if (role === "manager") ids.push(id);
      continue;
    }
    if (
      actorRole === "employee" ||
      actorRole === "employee2" ||
      actorRole === "warehouse" ||
      actorRole === "accountant"
    ) {
      if (role === "manager") ids.push(id);
    }
  }
  return ids;
}

async function deliverToUser(userId: string, notification: AppNotification): Promise<void> {
  io?.to(`user:${userId}`).emit("notification", notification);
  const doc = await EmployeeModel.findById(userId).lean();
  const tokens = ((doc as { fcmTokens?: string[] } | null)?.fcmTokens ?? []).filter(Boolean);
  if (tokens.length === 0) return;
  await sendFcmToTokens(tokens, {
    title: notification.title,
    body: notification.message,
    data: {
      notificationId: notification.id,
      entityType: notification.entityType,
      entityId: notification.entityId ?? "",
      action: notification.action,
    },
  });
}

export async function publishProjectAction(input: ProjectActionInput): Promise<void> {
  const recipientIds = await resolveRecipientIds(input.actor.id, input.actor.role);
  if (recipientIds.length === 0) return;
  const copy = buildCopy(input);
  const docs = await NotificationModel.insertMany(
    recipientIds.map((recipientId) => ({
      recipientId,
      actorId: input.actor.id,
      actorName: input.actor.name,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      title: copy.title,
      message: copy.message,
      read: false,
    })),
  );
  await Promise.all(
    docs.map(async (doc) => {
      const notification = mapNotification(doc as Parameters<typeof mapNotification>[0]);
      await deliverToUser(String(doc.recipientId), notification);
    }),
  );
}

export function initNotificationSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.use((socket: Socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "");
    if (!token) return next(new Error("Unauthorized"));
    try {
      const user = verifyAuthToken(token);
      (socket.data as { user?: typeof user }).user = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket.data as { user?: { id: string } }).user;
    if (!user?.id) {
      socket.disconnect(true);
      return;
    }
    socket.join(`user:${user.id}`);
  });

  return io;
}

export async function listNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
  const docs = await NotificationModel.find({ recipientId: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return docs.map((doc) => mapNotification(doc as unknown as Parameters<typeof mapNotification>[0]));
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return NotificationModel.countDocuments({ recipientId: userId, read: false });
}

export async function markNotificationRead(userId: string, id: string): Promise<boolean> {
  const result = await NotificationModel.updateOne(
    { _id: id, recipientId: userId },
    { $set: { read: true } },
  );
  return result.modifiedCount > 0;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await NotificationModel.updateMany(
    { recipientId: userId, read: false },
    { $set: { read: true } },
  );
  return result.modifiedCount;
}

export async function clearAllNotifications(userId: string): Promise<number> {
  const result = await NotificationModel.deleteMany({ recipientId: userId });
  return result.deletedCount ?? 0;
}

export async function registerFcmToken(userId: string, token: string): Promise<void> {
  if (!token.trim()) return;
  await EmployeeModel.updateOne({ _id: userId }, { $addToSet: { fcmTokens: token.trim() } });
}

export async function unregisterFcmToken(userId: string, token: string): Promise<void> {
  if (!token.trim()) return;
  await EmployeeModel.updateOne({ _id: userId }, { $pull: { fcmTokens: token.trim() } });
}
