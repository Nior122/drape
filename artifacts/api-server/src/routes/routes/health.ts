import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { isImageProviderReady } from "../../lib/ai/provider-factory";
import { complete } from "../../lib/ai/provider-factory";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/healthz — existing lightweight ping (keep for uptime monitors)
// ---------------------------------------------------------------------------
router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// ---------------------------------------------------------------------------
// GET /api/health — deep health check: DB + AI + env vars
// ---------------------------------------------------------------------------
router.get("/health", async (_req, res) => {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  // 1. Environment variables
  const requiredEnvVars = [
    "JWT_SECRET",
    "DATABASE_URL",
    "BLUEMINDS_BASE_URL",
    "BLUEMINDS_API_KEY",
    "BLUEMINDS_MODEL_ID",
  ];
  const optionalEnvVars = ["BLUEMINDS_IMAGE_MODEL_ID", "GOOGLE_CLIENT_ID", "ALLOWED_ORIGINS"];

  const missing = requiredEnvVars.filter((k) => !process.env[k]);
  const presentOptional = optionalEnvVars.filter((k) => !!process.env[k]);

  checks.env = {
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? `All required vars set. Optional: [${presentOptional.join(", ") || "none"}]`
        : `Missing required vars: ${missing.join(", ")}`,
  };

  // 2. Database
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = { ok: true, detail: "Connected and responding" };
  } catch (err) {
    checks.database = {
      ok: false,
      detail: err instanceof Error ? err.message : "Unknown DB error",
    };
  }

  // 3. AI text provider — config check (no live call, instant)
  const groqKey = process.env.GROQ_API_KEY;
  // Accept both BLUEMINDS_BASE_URL and the legacy BLUEMINDS_API_URL alias.
  const blueMindsBaseUrl = process.env.BLUEMINDS_BASE_URL ?? process.env.BLUEMINDS_API_URL;
  const aiVarsReady = groqKey
    ? true  // Groq mode: only needs GROQ_API_KEY
    : (!!blueMindsBaseUrl &&
       !!process.env.BLUEMINDS_API_KEY &&
       !!process.env.BLUEMINDS_MODEL_ID);

  const activeModel = groqKey
    ? (process.env.GROQ_MODEL ?? "llama-3.1-8b-instant") + " (Groq)"
    : process.env.BLUEMINDS_MODEL_ID;

  const baseUrlSource = process.env.BLUEMINDS_BASE_URL
    ? "BLUEMINDS_BASE_URL"
    : process.env.BLUEMINDS_API_URL
      ? "BLUEMINDS_API_URL (legacy alias)"
      : "(not set)";

  checks.ai_text = {
    ok: aiVarsReady,
    detail: aiVarsReady
      ? `Model: ${activeModel} | base URL from: ${baseUrlSource}`
      : `Missing vars: ${[
          !blueMindsBaseUrl && "BLUEMINDS_BASE_URL (or BLUEMINDS_API_URL)",
          !process.env.BLUEMINDS_API_KEY && "BLUEMINDS_API_KEY",
          !process.env.BLUEMINDS_MODEL_ID && "BLUEMINDS_MODEL_ID",
        ].filter(Boolean).join(", ")}`,
  };

  // 4. AI image provider — optional, uses separate IMAGE_API_KEY
  const imageReady = isImageProviderReady();
  checks.ai_image = {
    ok: imageReady,
    detail: imageReady
      ? `Model: ${process.env.IMAGE_MODEL_ID ?? "dall-e-3"} via ${process.env.IMAGE_BASE_URL ?? "https://api.openai.com/v1"}`
      : "IMAGE_API_KEY not set — image generation disabled (concept cards used instead)",
  };

  const allOk = Object.values(checks).every((c) => c.ok);

  res.status(allOk ? 200 : 207).json({
    status: allOk ? "ok" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// POST /api/test-ai — live round-trip to BlueMinds, no auth required
// ---------------------------------------------------------------------------
router.post("/test-ai", async (_req, res) => {
  // Accept both BLUEMINDS_BASE_URL and the legacy BLUEMINDS_API_URL alias.
  const blueMindsBaseUrl = process.env.BLUEMINDS_BASE_URL ?? process.env.BLUEMINDS_API_URL;
  if (
    !blueMindsBaseUrl ||
    !process.env.BLUEMINDS_API_KEY ||
    !process.env.BLUEMINDS_MODEL_ID
  ) {
    res.status(503).json({
      ok: false,
      error: `AI provider not configured. Missing: ${[
        !blueMindsBaseUrl && "BLUEMINDS_BASE_URL (or BLUEMINDS_API_URL)",
        !process.env.BLUEMINDS_API_KEY && "BLUEMINDS_API_KEY",
        !process.env.BLUEMINDS_MODEL_ID && "BLUEMINDS_MODEL_ID",
      ].filter(Boolean).join(", ")}`,
    });
    return;
  }

  const started = Date.now();
  try {
    const response = await complete(
      [
        {
          role: "system",
          content: "You are a Drape fashion assistant. Reply in one sentence.",
        },
        {
          role: "user",
          content: "Say hello and confirm you are working.",
        },
      ],
      { maxTokens: 64, temperature: 0.3 },
    );

    res.json({
      ok: true,
      model: process.env.BLUEMINDS_MODEL_ID,
      response,
      latency_ms: Date.now() - started,
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : "AI provider error",
      latency_ms: Date.now() - started,
    });
  }
});

export default router;
