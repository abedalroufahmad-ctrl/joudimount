/** CSS class for colored stage pills in lists and details. */
export function stageBadgeClass(stage?: string): string {
  switch (stage) {
    case "PREPARATION":
      return "stage-badge stage-badge--prep";
    case "CUSTOMS_CLEARANCE":
      return "stage-badge stage-badge--customs";
    case "STORAGE":
      return "stage-badge stage-badge--storage";
    case "TRANSPORTATION":
      return "stage-badge stage-badge--transport";
    default:
      return "stage-badge stage-badge--prep";
  }
}
