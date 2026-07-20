import app from "./app";
import { logger } from "./lib/logger";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Run DB schema push on startup so columns added in schema updates
// are automatically applied to the production database.
// Uses --force to skip interactive prompts (safe for additive changes).
try {
  const dbDir = path.resolve(__dirname, "../../../lib/db");
  logger.info("Syncing DB schema...");
  execSync(`npx drizzle-kit push --force --config ${path.join(dbDir, "drizzle.config.ts")}`, {
    cwd: dbDir,
    env: { ...process.env },
    stdio: "pipe",
  });
  logger.info("DB schema up to date.");
} catch (err) {
  // Non-fatal — log and continue. Server will still start.
  logger.warn({ err }, "DB schema push failed (non-fatal) — check schema manually.");
}

const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
