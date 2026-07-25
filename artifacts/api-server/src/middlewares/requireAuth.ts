import { type Request, type Response, type NextFunction } from "express";
import { verifyToken, tokenFromRequest } from "../lib/auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: "CLIENT" | "DESIGNER" | "PRODUCER" | "ADMIN";
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = tokenFromRequest(req as Parameters<typeof tokenFromRequest>[0]);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = await verifyToken(token);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    logger.warn({ userId }, "requireAuth: userId not found in DB");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  logger.debug({ userId, role: user.role }, "requireAuth: authenticated");
  req.userId = userId;
  req.userRole = user.role;
  next();
}
