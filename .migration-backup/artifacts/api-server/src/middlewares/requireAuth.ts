import { type Request, type Response, type NextFunction } from "express";
import { verifyToken, tokenFromRequest } from "../lib/auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
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
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}
