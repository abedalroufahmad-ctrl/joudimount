import type { AppNotification } from "./notifications";

export function notificationTargetPath(notification: AppNotification): string | null {
  const id = notification.entityId?.trim();
  if (!id) {
    if (notification.entityType === "employee") return "/employees";
    return null;
  }
  switch (notification.entityType) {
    case "transaction":
      return `/transactions/${id}`;
    case "transfer":
      return `/transfers/${id}`;
    case "export":
      return `/exports/${id}`;
    case "client":
      return `/clients/${id}`;
    case "shipping_company":
      return `/shipping-companies/${id}`;
    case "employee":
      return "/employees";
    default:
      return null;
  }
}
