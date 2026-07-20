/**
 * Text Provider
 *
 * Handles all text and chat AI features for Drape.
 * Reads model configuration exclusively from environment variables.
 *
 * Priority order for AI provider:
 *   1. GROQ_API_KEY set → Groq (llama-3.1-8b-instant or GROQ_MODEL)
 *   2. BLUEMINDS_API_KEY set → BlueMINDS OpenAI-compatible endpoint
 *   3. OPENAI_API_KEY set → OpenAI directly (Replit AI integration)
 *
 * Features handled:
 *   - Client enquiry conversations (streaming)
 *   - Fashion brief generation
 *   - Style recommendations
 *   - Measurement interpretation
 *   - Order summaries
 *   - Production checklist generation
 *   - Production guide text generation
 *   - Designer assistant workflows
 *   - Notification message generation
 *   - PDF content generation
 *   - Lookbook written content
 *   - Fabric & colour recommendations
 *   - Fashion design descriptions
 *   - Quality control checklists
 *   - Vision analysis (when model supports image input)
 */
import OpenAI from "openai";
import type { Stream } from "openai/streaming";
import type { ChatCompletionChunk } from "openai/resources/chat";
import type {
  ChatMessage,
  TextOptions,
  ConceptCard,
  VisionAnalysis,
} from "./types";
import { CONCEPT_CARD_SYSTEM } from "./prompts/concepts";
import { VISION_ANALYSIS_SYSTEM } from "./prompts/vision";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const BLUEMINDS_API_KEY = process.env.BLUEMINDS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Lazily resolved provider config + OpenAI client.
 *
 * Resolved on first use (not at module import) so that a missing or
 * misnamed env var cannot crash the entire API server at boot. A bad
 * configuration now surfaces as a per-request 502 with a clear message
 * instead of taking down every route that imports this module.
 */
let cachedClient: OpenAI | null = null;
let cachedModel: string | null = null;

function buildClient(): { client: OpenAI; model: string } {
  if (cachedClient && cachedModel) return { client: cachedClient, model: cachedModel };

  if (GROQ_API_KEY) {
    const model = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
    const client = new OpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: GROQ_API_KEY });
    cachedClient = client;
    cachedModel = model;
    return { client, model };
  }

  if (BLUEMINDS_API_KEY) {
    const baseURL = process.env.BLUEMINDS_BASE_URL;
    const model = process.env.BLUEMINDS_MODEL_ID;
    if (!baseURL) {
      throw new Error(
        "BLUEMINDS_BASE_URL is missing. Set it on Render (e.g. https://api.bluesminds.com/v1) so the AI can reach BlueMinds.",
      );
    }
    if (!model) {
      throw new Error(
        "BLUEMINDS_MODEL_ID is missing. Set it on Render (e.g. gpt-4o-mini) so the AI knows which model to use.",
      );
    }
    const client = new OpenAI({ baseURL, apiKey: BLUEMINDS_API_KEY });
    cachedClient = client;
    cachedModel = model;
    return { client, model };
  }

  if (OPENAI_API_KEY) {
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const client = new OpenAI({ apiKey: OPENAI_API_KEY });
    cachedClient = client;
    cachedModel = model;
    return { client, model };
  }

  throw new Error(
    "No AI API key configured. Set BLUEMINDS_API_KEY (preferred), GROQ_API_KEY, or OPENAI_API_KEY on Render.",
  );
}

/**
 * Streaming chat completion.
 * Used for: client enquiry conversation, real-time assistant responses.
 */
export function streamChat(
  messages: ChatMessage[],
  options: TextOptions = {},
): Promise<Stream<ChatCompletionChunk>> {
  const { client, model: TEXT_MODEL } = buildClient();
  return client.chat.completions.create({
    model: TEXT_MODEL,
    messages,
    stream: true,
    temperature: options.temperature ?? 0.75,
    max_tokens: options.maxTokens ?? 1024,
  });
}

/**
 * Single-shot text completion.
 * Used for: briefs, checklists, PDF guide sections, order summaries,
 *           fabric recommendations, notification messages, design descriptions.
 */
export async function complete(
  messages: ChatMessage[],
  options: TextOptions = {},
): Promise<string> {
  const { client, model: TEXT_MODEL } = buildClient();
  const resp = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages,
    stream: false,
    temperature: options.temperature ?? 0.5,
    max_tokens: options.maxTokens ?? 2048,
  });
  return resp.choices[0]?.message?.content ?? "";
}

/**
 * Structured JSON completion — parses the model's response as JSON.
 * Used for: checklist generation, fabric recommendations, QC checklists.
 */
export async function completeJSON<T>(
  messages: ChatMessage[],
  options: TextOptions = {},
): Promise<T> {
  const text = await complete(messages, options);
  const start = text.indexOf("[") !== -1 && (text.indexOf("[") < text.indexOf("{") || text.indexOf("{") === -1)
    ? text.indexOf("[")
    : text.indexOf("{");
  const isArray = text[start] === "[";
  const end = isArray ? text.lastIndexOf("]") : text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model did not return valid JSON");
  return JSON.parse(text.slice(start, end + 1)) as T;
}

/**
 * Outfit concept card — text description of a fashion concept.
 * Fallback when image model is unavailable or not yet configured.
 */
export async function generateConceptCard(prompt: string): Promise<ConceptCard> {
  return completeJSON<ConceptCard>([
    { role: "system", content: CONCEPT_CARD_SYSTEM },
    { role: "user", content: prompt },
  ], { temperature: 0.7, maxTokens: 512 });
}

/**
 * Vision / image analysis — analyses an uploaded reference image.
 * Only works with vision-capable models (e.g. gpt-4o, gpt-4-vision).
 * Inputs: sketch, fabric sample, moodboard, inspiration photo, finished garment.
 * Outputs: style summary, garment type, colour palette, fabric suggestions,
 *           silhouette analysis, construction notes.
 */
export async function analyseImage(imageUrl: string): Promise<VisionAnalysis> {
  return completeJSON<VisionAnalysis>([
    { role: "system", content: VISION_ANALYSIS_SYSTEM },
    {
      role: "user",
      content: [
        { type: "text", text: "Please analyse this fashion reference image." },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ], { temperature: 0.3, maxTokens: 600 });
}
