/**
 * getDashboardUrl — returns the correct dashboard URL for a given role.
 */
export function getDashboardUrl(role: string): string {
  switch (role) {
    case "CLIENT":
      return "/marketplace";
    case "DESIGNER":
    case "PRODUCER":
      return "/designer/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    default:
      return "/marketplace";
  }
}

/**
 * getDashboardLabel — returns a human-readable label for the dashboard link.
 */
export function getDashboardLabel(role: string): string {
  switch (role) {
    case "CLIENT":
      return "My Orders";
    case "DESIGNER":
    case "PRODUCER":
      return "My Studio";
    case "ADMIN":
      return "Admin";
    default:
      return "Dashboard";
  }
}
