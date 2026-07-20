/**
 * Provider Factory
 *
 * Single import point for all AI capabilities.
 * Business logic, routes, and services import only from here.
 *
 * Architecture:
 *   Business Logic
 *       ↓
 *   provider-factory  ← import everything from here
 *       ↓
 *   text-provider.ts  |  image-provider.ts
 *       ↓                      ↓
 *   BLUEMINDS_TEXT_MODEL_ID   BLUEMINDS_IMAGE_MODEL_ID
 *       ↓                      ↓
 *            BlueMinds OpenAI-Compatible API
 *
 * No route, page, service, or component should import directly
 * from text-provider.ts or image-provider.ts.
 */

export {
  streamChat,
  complete,
  completeJSON,
  generateConceptCard,
  analyseImage,
} from "./text-provider";

export {
  generateImage,
  generateImages,
  isImageProviderReady,
} from "./image-provider";

export type {
  ChatMessage,
  ContentPart,
  TextOptions,
  ImageOptions,
  ImageSize,
  FashionBrief,
  ConceptCard,
  VisionAnalysis,
  ProductionGuideData,
} from "./types";
