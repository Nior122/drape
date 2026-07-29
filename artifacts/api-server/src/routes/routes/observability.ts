import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

/**
 * GET /healthz — Liveness probe.
 * Returns immediately with no DB dependency.
 * Used by orchestration (Docker, Render, K8s) to check if the process is alive.
 */
router.get("/healthz", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * GET /api/health — Health check with DB dependency.
 * Used by monitoring and load balancers.
 */
router.get("/health", async (_req: Request, res: Response) => {
  let dbStatus = "ok";
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    dbStatus = "error";
  }

  res.json({
    status: dbStatus === "ok" ? "ok" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
    database: dbStatus,
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    version: process.env.npm_package_version ?? "0.0.0",
  });
});

/**
 * GET /api/ready — Readiness probe.
 * Indicates the server is ready to accept traffic.
 */
router.get("/ready", async (_req: Request, res: Response) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "not ready", timestamp: new Date().toISOString() });
  }
});

/**
 * GET /api/metrics — Basic application metrics.
 * For Prometheus or simple monitoring tools.
 */
router.get("/metrics", async (_req: Request, res: Response) => {
  const mem = process.memoryUsage();
  const uptime = process.uptime();

  res.json({
    process: {
      uptime_seconds: uptime,
      pid: process.pid,
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    memory: {
      rss_bytes: mem.rss,
      heap_total_bytes: mem.heapTotal,
      heap_used_bytes: mem.heapUsed,
      external_bytes: mem.external,
    },
    environment: {
      node_env: process.env.NODE_ENV ?? "development",
      port: process.env.PORT ?? "3000",
    },
  });
});

export default router;
