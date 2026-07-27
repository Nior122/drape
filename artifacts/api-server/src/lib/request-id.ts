import { type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";

/**
 * Request-ID middleware.
 * Assigns a unique ID to every request for tracing and debugging.
 * Preserves incoming X-Request-Id headers from reverse proxies.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers["x-request-id"] as string) ?? randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
}
