export type NotificationAction =
  | "created"
  | "updated"
  | "deleted"
  | "stage_changed"
  | "paid"
  | "released"
  | "original_bl";

export interface AppNotification {
  id: string;
  recipientId: string;
  actorId: string;
  actorName: string;
  action: NotificationAction;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
