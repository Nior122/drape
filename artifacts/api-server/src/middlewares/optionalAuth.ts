import { type Request, type Response, type NextFunction } from "express";
import { verifyToken, tokenFromRequest } from "../lib/auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Optional auth middleware.
 *
 * Unlike requireAuth, this never blocks the request.
 * - If a valid token is present → attaches req.userId and proceeds
 * - If no token or invalid token → proceeds WITHOUT blocking (req.userId = undefined)
 *
 * Use this on routes that should be publicly accessible but can
 * benefit from knowing who the user is if they're logged in.
 * e.g. /ai/enquiry, /ai/generate — guest visitors on designer pages
 * should be able to chat with Aria and generate lookbooks.
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = tokenFromRequest(req as Parameters<typeof tokenFromRequest>[0]);
    if (token) {
      const userId = await verifyToken(token);
      if (userId) {
        const [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, userId));
        if (user) {
          req.userId = userId;
        }
      }
    }
  } catch {
    // Ignore any auth errors — just proceed as unauthenticated
  }
  next();
}
