import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ---------------------------------------------------------------------------
// CORS — production-locked, development-open
//
// In production (NODE_ENV=production) the baseline allowed origin is always
// https://draped-dsr.pages.dev (the Cloudflare Pages deployment).
//
// Add a custom domain or extra origins with the ALLOWED_ORIGINS env var:
//   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
//
// In development every origin is allowed so local tooling is never blocked.
// ---------------------------------------------------------------------------
const IS_PROD = process.env.NODE_ENV === "production";

// ---------------------------------------------------------------------------
// CORS allowed origins.
//
// The BASELINE_ORIGINS list covers known Cloudflare Pages deployments.
// If your production frontend domain is NOT in this list, requests will be
// blocked by CORS. Add it via the ALLOWED_ORIGINS environment variable on Render:
//   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
//
// In development every origin is allowed.
// ---------------------------------------------------------------------------
const BASELINE_ORIGINS: string[] = [
  "https://draped-dsr.pages.dev",
  "https://drape-fzs.pages.dev",
  "https://drape.pages.dev",
  "https://draped.pages.dev",
];

const extraOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, "")) // strip trailing slashes
  .filter(Boolean);

const allowedOrigins = [...new Set([...BASELINE_ORIGINS, ...extraOrigins])];

// Log the allowed origins so Render logs show the configuration immediately.
// This makes CORS mismatches easy to diagnose without code changes.
if (IS_PROD) {
  logger.info({ allowedOrigins }, "[CORS] Production allowed origins");
} else {
  logger.info("[CORS] Development mode — all origins allowed");
}

app.use(
  cors({
    origin: IS_PROD
      ? (origin, cb) => {
          // No-origin requests (server-to-server, Cloudflare proxy, curl) are allowed.
          if (!origin) return cb(null, true);
          if (allowedOrigins.includes(origin)) return cb(null, true);
          logger.warn({ origin, allowedOrigins }, "[CORS] Blocked request from unlisted origin — add it to ALLOWED_ORIGINS on Render");
          cb(new Error(`CORS: origin '${origin}' is not allowed. Add it to ALLOWED_ORIGINS on Render.`));
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
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, private");
  next();
});

app.use("/api", router);

// ---------------------------------------------------------------------------
// Frontend — serve the built React app in production so the API server and
// UI can be deployed together from a single process on a single URL.
// In development the Vite dev server handles the frontend.
// ---------------------------------------------------------------------------
const frontendDist = path.resolve(process.cwd(), "artifacts/drape/dist/public");

if (IS_PROD && fs.existsSync(frontendDist)) {
  // Serve static assets (JS, CSS, images, etc.)
  app.use(
    express.static(frontendDist, {
      index: false,
      // Long-lived caching for hashed filenames; index.html stays no-cache
      setHeaders(res, filePath) {
        if (path.basename(filePath) === "index.html") {
          res.setHeader("Cache-Control", "no-store, private");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  // SPA fallback — every non-API path returns index.html so client-side
  // routing (wouter) works on direct navigation and refresh.
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else if (!IS_PROD) {
  // Development: helpful redirect so visiting the API URL takes you somewhere useful.
  app.get("/", (_req, res) => {
    res.redirect(301, "/api/health");
  });
}

// Global error handler — must have 4 args so Express recognises it as an error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error({ err }, "Unhandled error");
  if (!res.headersSent) {
    res.status(500).json({ error: message });
  }
});

export default app;
