/**
 * Shared types for the Drape AI provider layer.
 * Business logic imports only from here — never from provider implementations.
 */
import type { ChatCompletionMessageParam, ChatCompletionContentPart } from "openai/resources/chat";

export type ChatMessage = ChatCompletionMessageParam;
export type ContentPart = ChatCompletionContentPart;

export interface TextOptions {
  temperature?: number;
  maxTokens?: number;
}

export type ImageSize = "1024x1024" | "1024x1792" | "1792x1024";

export interface ImageOptions {
  size?: ImageSize;
}

/** Structured fashion brief extracted from enquiry conversation */
export interface FashionBrief {
  gender: string;
  garment_type: string;
  style_summary: string;
  occasion: string;
  aesthetic_direction: string;
  color_palette: string[];
  fabric_preferences: string;
  silhouette: string;
  budget_min: number;
  budget_max: number;
  timeline_days: number;
  special_notes: string;
  image_prompts: string[];
}

/** Outfit concept card — returned by text model when image model is unavailable */
export interface ConceptCard {
  title: string;
  palette: string[];
  silhouette: string;
  fabrics: string;
  keyDetails: string;
  stylingNotes: string;
}

/** Analysis of an uploaded reference image */
export interface VisionAnalysis {
  styleSummary: string;
  garmentType: string;
  colorPalette: string[];
  fabricSuggestions: string[];
  silhouetteAnalysis: string;
  constructionNotes: string;
}

/** Production guide data structure */
export interface ProductionGuideData {
  clientName: string;
  designerName: string;
  orderRef: string;
  brief: FashionBrief;
  measurements: Record<string, number | string>;
  fabricRequirements: string;
  cuttingInstructions: string;
  sewingInstructions: string;
  assemblySequence: string;
  fittingProcess: string;
  finishingProcess: string;
  qcChecklist: string[];
  deliveryChecklist: string[];
}
