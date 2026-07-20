import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = path.resolve(__dirname, "../../../../knowledge/nigeria-fashion");

let cachedKnowledge = "";

/**
 * Loads all markdown files from the knowledge directory and concatenates them
 * into a single knowledge string to be injected into the system prompt.
 * 
 * If the directory doesn't exist, returns an empty string (fails gracefully).
 */
export function loadNigerianFashionKnowledge(): string {
  if (cachedKnowledge) {
    return cachedKnowledge;
  }

  try {
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
      logger.warn({ dir: KNOWLEDGE_DIR }, "Knowledge directory not found. Aria will use basic knowledge.");
      return "";
    }

    const files = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith(".md"));
    let fullKnowledge = "--- NIGERIAN FASHION KNOWLEDGE BASE ---\n\n";

    for (const file of files) {
      const content = fs.readFileSync(path.join(KNOWLEDGE_DIR, file), "utf-8");
      fullKnowledge += `--- [SOURCE: ${file}] ---\n\n${content}\n\n`;
    }

    cachedKnowledge = fullKnowledge;
    return cachedKnowledge;
  } catch (err) {
    logger.error({ err }, "Failed to load Nigerian fashion knowledge files.");
    return "";
  }
}
