/**
 * Image Provider
 *
 * Uses Hugging Face Inference (fal-ai provider) with FLUX.1-schnell.
 * Falls back to the legacy OpenAI-compatible path if HF_TOKEN is absent
 * but IMAGE_API_KEY is set (backward-compatible).
 *
 * Environment variables:
 *   HF_TOKEN        — Hugging Face API token (preferred, enables FLUX)
 *   IMAGE_API_KEY   — Legacy OpenAI-compatible key (fallback)
 *   IMAGE_BASE_URL  — Legacy base URL (default: https://api.openai.com/v1)
 *   IMAGE_MODEL_ID  — Legacy model name (default: dall-e-3)
 */
import { InferenceClient } from "@huggingface/inference";
import OpenAI from "openai";
import type { ImageSize, ImageOptions } from "./types";

const HF_TOKEN = process.env.HF_TOKEN;
const IMAGE_API_KEY = process.env.IMAGE_API_KEY;
const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL ?? "https://api.openai.com/v1";
const IMAGE_MODEL_ID = process.env.IMAGE_MODEL_ID ?? "dall-e-3";

const HF_MODEL = "black-forest-labs/FLUX.1-schnell";

const hfClient = HF_TOKEN ? new InferenceClient(HF_TOKEN) : null;

const legacyClient = !HF_TOKEN && IMAGE_API_KEY
  ? new OpenAI({ baseURL: IMAGE_BASE_URL, apiKey: IMAGE_API_KEY, timeout: 35_000, maxRetries: 0 })
  : null;

/** Wrap any promise with a hard timeout so the route never hangs. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/** Convert a Blob returned by the HF SDK to a base64 data URL the frontend can render directly. */
async function blobToDataUrl(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mime = blob.type || "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

/**
 * Generate a single fashion image.
 *
 * Priority:
 *  1. HF_TOKEN set → use FLUX.1-schnell via fal-ai (returns Blob → data URL)
 *  2. IMAGE_API_KEY set → use legacy OpenAI-compatible endpoint (returns URL string)
 *  3. Neither set → throws so caller can fall back to concept cards
 */
export async function generateImage(
  prompt: string,
  _options: ImageOptions = {},
): Promise<string> {
  if (hfClient) {
    console.log(`[image-provider] HF FLUX call starting — model: ${HF_MODEL}`);
    const blob = await withTimeout(
      hfClient.textToImage({
        provider: "fal-ai",
        model: HF_MODEL,
        inputs:
          `Fashion design concept illustration: ${prompt}. ` +
          `Editorial style, clean white background, detailed garment construction visible, ` +
          `premium fashion lookbook aesthetic, high-end studio lighting, realistic fabric texture, ` +
          `professional presentation.`,
      }),
      90_000,
    );
    console.log(`[image-provider] HF FLUX returned blob — type: ${blob.type}, size: ${blob.size}`);
    return blobToDataUrl(blob);
  }

  if (legacyClient) {
    console.log(`[image-provider] Legacy OpenAI call starting — model: ${IMAGE_MODEL_ID}`);
    const resp = await legacyClient.images.generate({
      model: IMAGE_MODEL_ID,
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "url",
    });
    const url = resp.data?.[0]?.url;
    if (!url) throw new Error("No image URL returned from legacy provider");
    return url;
  }

  throw new Error(
    "Image provider not configured. Set HF_TOKEN on Render to enable FLUX image generation.",
  );
}

/**
 * Generate multiple images from a list of prompts.
 * Returns results with index, url, and any per-item errors.
 */
export async function generateImages(
  prompts: string[],
  options: ImageOptions = {},
): Promise<Array<{ index: number; url: string | null; error: string | null }>> {
  const results = await Promise.allSettled(
    prompts.map((prompt) => generateImage(prompt, options)),
  );
  return results.map((result, index) => ({
    index,
    url: result.status === "fulfilled" ? result.value : null,
    error: result.status === "rejected" ? String(result.reason) : null,
  }));
}

/**
 * True when at least one image provider is configured.
 * The generate route uses this to decide whether to attempt real images
 * or fall back to text concept cards.
 */
export function isImageProviderReady(): boolean {
  return !!(HF_TOKEN || IMAGE_API_KEY);
}
