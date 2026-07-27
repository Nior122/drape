import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import v1Router from "./routes/v1";
import { logger } from "./lib/logger";
import { securityHeaders } from "./lib/security-headers";
import { requestId } from "./lib/request-id";
import { standardLimiter } from "./lib/rate-limit";
import { apiVersion } from "./lib/api-version";

const app: Express = express();

// ─── Request ID (early — before logging) ───────────────────────────
app.use(requestId);

// ─── Security Headers ──────────────────────────────────────────────
app.use(securityHeaders);

// ─── CORS —─────────────────────────────────────────────────────────
const IS_PROD = process.env.NODE_ENV === "production";

const BASELINE_ORIGINS: string[] = [
  "https://draped-dsr.pages.dev",
  "https://drape-fzs.pages.dev",
  "https://drape.pages.dev",
  "https://draped.pages.dev",
];

const extraOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = [...new Set([...BASELINE_ORIGINS, ...extraOrigins])];

if (IS_PROD) {
  logger.info({ allowedOrigins }, "[CORS] Production allowed origins");
} else {
  logger.info("[CORS] Development mode — all origins allowed");
}

app.use(
  cors({
    origin: IS_PROD
      ? (origin, cb) => {
          if (!origin) return cb(null, true);
          if (allowedOrigins.includes(origin)) return cb(null, true);
          logger.warn({ origin }, "[CORS] Blocked request from unlisted origin");
          // Return a generic error — don't leak the origin list
          cb(new Error("Origin not permitted by CORS policy"));
        }
      : true,
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ─── Body parsers ──────────────────────────────────────────────────
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// ─── Global rate limiter ───────────────────────────────────────────
app.use("/api", standardLimiter);

// ─── API Versioning ────────────────────────────────────────────────
// Main /api routes (backward-compatible)
app.use("/api", router);
// Versioned /api/v1 routes (same handlers, future-proof)
app.use("/api/v1", v1Router);

// ─── Cache control for API responses ───────────────────────────────
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, private");
  next();
});

// ─── Frontend (production) ─────────────────────────────────────────
const frontendDist = path.resolve(process.cwd(), "artifacts/drape/dist/public");

if (IS_PROD && fs.existsSync(frontendDist)) {
  app.use(
    express.static(frontendDist, {
      index: false,
      setHeaders(res, filePath) {
        if (path.basename(filePath) === "index.html") {
          res.setHeader("Cache-Control", "no-store, private");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else if (!IS_PROD) {
  app.get("/", (_req, res) => {
    res.redirect(301, "/api/health");
  });
}

// ─── Global Error Handler ──────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const errorPayload = {
    error: err instanceof Error ? err.message : "Internal server error",
    requestId: _req.id,
    ...(IS_PROD ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  };

  // Rate limit errors
  if (err instanceof Error && err.message.includes("CORS")) {
    logger.warn({ err: err.message }, "[CORS] Rejected");
    res.status(403).json({ error: "Origin not permitted" });
    return;
  }

  logger.error({ err, requestId: _req.id }, "Unhandled error");

  if (!res.headersSent) {
    res.status(500).json(errorPayload);
  }
});

export default app;
