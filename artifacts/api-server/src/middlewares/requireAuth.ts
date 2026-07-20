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
  console.log("[DEBUG] requireAuth:", req.method, req.originalUrl);
  console.log("[DEBUG] origin:", req.headers["origin"] ?? "(none)");
  console.log("[DEBUG] cookie present:", !!req.cookies?.["drape_token"]);
  console.log("[DEBUG] bearer present:", typeof req.headers["authorization"] === "string" && req.headers["authorization"].startsWith("Bearer "));

  const token = tokenFromRequest(req as Parameters<typeof tokenFromRequest>[0]);
  if (!token) {
    console.log("[DEBUG] requireAuth: no token found → 401");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = await verifyToken(token);
  if (!userId) {
    console.log("[DEBUG] requireAuth: token invalid/expired → 401");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    console.log("[DEBUG] requireAuth: userId not found in DB → 401", { userId });
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  console.log("[DEBUG] requireAuth: authenticated userId:", userId);
  req.userId = userId;
  next();
}
