import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * requireRole — blocks requests where the authenticated user's role is not
 * in the allowed set. Must be chained AFTER requireAuth (so req.userId exists).
 *
 * Examples:
 *   router.get("/producer/dashboard", requireAuth, requireRole("DESIGNER", "PRODUCER"), handler);
 *   router.get("/admin/users", requireAuth, requireRole("ADMIN"), handler);
 *   router.get("/client/orders", requireAuth, requireRole("CLIENT"), handler);
 *
 * 403 response includes the user's actual role for debugging.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as Request & { userRole?: string }).userRole;

    if (!userRole) {
      logger.warn({ allowedRoles }, "requireRole: no userRole on request — requireAuth may not have been called");
      res.status(403).json({ error: "Forbidden", detail: "Authentication required before role check" });
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      logger.warn({ userRole, allowedRoles, path: req.originalUrl }, "requireRole: access denied");
      res.status(403).json({
        error: "Forbidden",
        detail: `Role '${userRole}' is not permitted. Required: ${allowedRoles.join(" or ")}`,
      });
      return;
    }

    next();
  };
}
