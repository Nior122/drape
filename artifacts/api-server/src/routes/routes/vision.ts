import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { eq, and, desc, like, asc, or, sql } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  visionImagesTable,
  visionAnalysesTable,
  moodBoardsTable,
  moodBoardItemsTable,
  visionGenerationsTable,
  imageTagsTable,
  ordersTable,
  usersTable,
  producerProfilesTable,
} from "@workspace/db";
import { complete as aiComplete, type ChatMessage } from "../../lib/ai/text-provider";
import { generateImage as aiGenerateImage } from "../../lib/ai/image-provider";
import { generateConceptCard } from "../../lib/ai/text-provider";

const router: IRouter = Router();
router.use(requireAuth);

// =========================================================================
// SYSTEM PROMPTS — Extended vision analysis prompts
// =========================================================================

const VISION_SYSTEM_FULL = `You are an expert fashion analyst with deep knowledge of garment construction, textiles, and design. Analyse the image and return a structured JSON with:
{
  "styleSummary": "2-3 sentence overview",
  "garmentType": "specific garment category",
  "silhouette": "silhouette description",
  "constructionStyle": "notable construction details",
  "sleeveType": "sleeve description or null",
  "neckline": "neckline description or null",
  "length": "hem length description or null",
  "fit": "fit description (e.g. tailored, oversized)",
  "targetAudience": "who this is designed for",
  "occasion": "suitable occasion",
  "complexityLevel": 1-10,
  "luxuryScore": 1-10,
  "commercialPotential": 1-10,
  "trendRelevance": "current/emerging/timeless",
  "estimatedProductionDifficulty": "easy/medium/hard"
}
Output ONLY valid JSON. Base your analysis only on what is visible in the image.`;

const VISION_SYSTEM_FABRIC = `You are an expert textile analyst. Analyse the fabric visible in the image and return a structured JSON with:
{
  "likelyFabric": "name of the most likely fabric",
  "alternativeFabrics": ["alternative 1", "alternative 2", "alternative 3"],
  "weight": "lightweight/medium/heavy with reasoning",
  "texture": "texture description",
  "stretch": "amount of stretch (none/minimal/moderate/high)",
  "breathability": "breathability rating (low/medium/high)",
  "luxuryRating": 1-10,
  "climateSuitability": ["climate 1", "climate 2"],
  "careInstructions": ["instruction 1", "instruction 2"],
  "estimatedCostRange": "budget/mid-range/premium/luxury"
}
Output ONLY valid JSON. Base your analysis only on what is visible in the image.`;

const VISION_SYSTEM_COLOUR = `Analyse the colours in this fashion image and return:
{
  "primaryColours": [{"hex": "#xxxxxx", "name": "colour name", "percentage": 0-100}],
  "secondaryColours": [{"hex": "#xxxxxx", "name": "colour name", "percentage": 0-100}],
  "accentColours": [{"hex": "#xxxxxx", "name": "colour name", "percentage": 0-100}],
  "contrast": "low/medium/high",
  "harmony": "complementary/analogous/monochromatic/triadic",
  "colourPsychology": "psychological associations of this palette",
  "seasonCompatibility": ["Spring", "Summer", "Autumn", "Winter"],
  "suggestedPalette": [{"hex": "#xxxxxx", "name": "colour name", "use": "primary/secondary/accent"}]
}
Output ONLY valid JSON.`;

const VISION_SYSTEM_DECONSTRUCT = `Deconstruct this garment into its components. Return:
{
  "garmentType": "type of garment",
  "components": [
    {"name": "component name", "description": "description", "constructionNotes": "how it's constructed", "stitchType": "type of stitch used"}
  ],
  "constructionOrder": ["step 1", "step 2", "step 3", ...],
  "totalComponents": number,
  "estimatedConstructionTime": "estimated time",
  "skillLevelRequired": "beginner/intermediate/advanced/expert"
}
Output ONLY valid JSON.`;

const VISION_SYSTEM_IMPROVE = `You are a senior fashion design consultant. Analyse this design concept and suggest improvements. Return:
{
  "proportionSuggestions": ["suggestion 1", "suggestion 2"],
  "colourImprovements": ["improvement 1", "improvement 2"],
  "constructionImprovements": ["improvement 1", "improvement 2"],
  "luxuryEnhancements": ["enhancement 1", "enhancement 2"],
  "costReductions": ["reduction 1", "reduction 2"],
  "productionSimplifications": ["simplification 1", "simplification 2"],
  "alternativeMaterials": [{"material": "name", "reason": "why better"}],
  "commercialImprovements": ["improvement 1", "improvement 2"],
  "overallRating": 1-10,
  "keyRecommendation": "single most important change"
}
Output ONLY valid JSON.`;

const VISION_SYSTEM_TREND = `Analyse this fashion image for trend potential. Return:
{
  "currentTrends": ["trend 1", "trend 2"],
  "emergingTrends": ["trend 1", "trend 2"],
  "trendLifespan": "short/medium/long term",
  "luxuryPositioning": "mass/premium/luxury/haute",
  "massMarketPotential": 1-10,
  "targetDemographic": "description of target customer",
  "suggestedCollectionPlacement": "which collection type this fits",
  "seasonalRelevance": ["Spring", "Summer", "Autumn", "Winter"],
  "competitiveLandscape": "brief analysis of similar designs in market"
}
Output ONLY valid JSON.`;

const VISION_SYSTEM_MOOD = `Analyse these fashion inspiration images and create a cohesive mood board analysis. Return:
{
  "visualTheme": "overarching theme description",
  "keywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"],
  "colourDirections": [{"hex": "#xxxxxx", "name": "colour name", "use": "how to use"}],
  "fabricSuggestions": ["fabric 1", "fabric 2", "fabric 3"],
  "styleDirection": "overall style direction",
  "trendSummary": "summary of trends",
  "collectionInspiration": "how this could inspire a collection"
}
Output ONLY valid JSON.`;

const VISION_SYSTEM_COMPARE = `Compare these two fashion designs and return:
{
  "differences": ["difference 1", "difference 2", "difference 3"],
  "designAStrengths": ["strength 1", "strength 2"],
  "designBStrengths": ["strength 1", "strength 2"],
  "designAWeaknesses": ["weakness 1", "weakness 2"],
  "designBWeaknesses": ["weakness 1", "weakness 2"],
  "constructionChanges": ["change 1", "change 2"],
  "fabricDifferences": "analysis of fabric differences",
  "fitChanges": "changes in fit",
  "commercialValueDifference": "which has more commercial potential and why",
  "trendRelevanceComparison": "which is more trend-relevant",
  "recommendation": "which design is stronger and why"
}
Output ONLY valid JSON.`;

// =========================================================================
// HELPER: Analyse image with a vision model
// =========================================================================

async function analyseVisionImage(
  imageUrl: string,
  systemPrompt: string,
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<Record<string, unknown>> {
  const resp = await aiComplete([
    { role: "system", content: systemPrompt } as ChatMessage,
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: "Analyse this fashion image according to the instructions." },
        { type: "image_url" as const, image_url: { url: imageUrl } },
      ],
    },
  ], { temperature: options.temperature ?? 0.3, maxTokens: options.maxTokens ?? 2048 });

  // Extract JSON from response
  const startIdx = resp.indexOf("{");
  const endIdx = resp.lastIndexOf("}");
  if (startIdx !== -1 && endIdx !== -1) {
    try {
      return JSON.parse(resp.slice(startIdx, endIdx + 1));
    } catch {
      return { raw: resp };
    }
  }
  return { raw: resp };
}

// =========================================================================
// IMAGE MANAGEMENT
// =========================================================================

// Upload via base64 (no external storage dependency)
router.post("/designer/vision/images/upload", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { fileName, mimeType, fileSize, base64Data, projectId } = req.body as {
    fileName?: string; mimeType?: string; fileSize?: number; base64Data?: string; projectId?: string;
  };

  if (!base64Data) { res.status(400).json({ error: "base64Data is required" }); return; }

  // Validate mime type
  const safeMime = mimeType ?? "image/jpeg";
  if (!["image/png", "image/jpeg", "image/webp", "image/jpg"].includes(safeMime)) {
    res.status(400).json({ error: "Unsupported file type. Use PNG, JPG, JPEG, or WEBP." });
    return;
  }

  // Validate size (max 10MB)
  const rawSize = Buffer.byteLength(base64Data, "base64");
  if (rawSize > 10 * 1024 * 1024) {
    res.status(400).json({ error: "File too large. Maximum 10MB." });
    return;
  }

  // Store as data URL (in production, upload to GCS/R2 and store path)
  const dataUrl = `data:${safeMime};base64,${base64Data}`;

  const [image] = await db.insert(visionImagesTable).values({
    userId,
    projectId: projectId ?? null,
    originalName: fileName ?? "uploaded-image",
    mimeType: safeMime,
    fileSize: rawSize,
    originalPath: dataUrl,
    analysisStatus: "QUEUED",
  }).returning();

  // Auto-analyse in background (fire and forget)
  analyseVisionImage(dataUrl, VISION_SYSTEM_FULL).then(async (result) => {
    const [analysis] = await db.insert(visionAnalysesTable).values({
      userId, imageId: image.id, type: "FULL", result, status: "COMPLETED",
      modelUsed: "gpt-4o-vision", processingTimeMs: 0,
    }).returning();

    await db.update(visionImagesTable).set({
      analysisStatus: "COMPLETED", analysisId: analysis.id,
      garmentType: (result.garmentType as string) ?? null,
      dominantColors: (result.primaryColours ?? []) as Array<{ hex: string; name: string; percentage: number }>,
      aiDescription: result.styleSummary as string,
      aiTags: ["fashion", result.garmentType as string, result.occasion as string].filter(Boolean),
    }).where(eq(visionImagesTable.id, image.id));
  }).catch(async (err) => {
    console.error("[VISION] auto-analysis failed:", err);
    await db.update(visionImagesTable).set({ analysisStatus: "FAILED" }).where(eq(visionImagesTable.id, image.id));
  });

  res.status(201).json(image);
});

// List images
router.get("/designer/vision/images", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { projectId, isFavourite, isArchived, search, garmentType, collectionId } = req.query as Record<string, string | undefined>;

  const conditions = [eq(visionImagesTable.userId, userId)];
  if (projectId) conditions.push(eq(visionImagesTable.projectId, projectId));
  if (isFavourite === "true") conditions.push(eq(visionImagesTable.isFavourite, true));
  if (isArchived === "true") conditions.push(eq(visionImagesTable.isArchived, true));
  else conditions.push(eq(visionImagesTable.isArchived, false));
  if (garmentType) conditions.push(eq(visionImagesTable.garmentType, garmentType));
  if (collectionId) conditions.push(eq(visionImagesTable.collectionId, collectionId));
  if (search) conditions.push(sql`(${visionImagesTable.aiDescription} ILIKE ${`%${search}%`} OR ${visionImagesTable.originalName} ILIKE ${`%${search}%`})`);

  const images = await db.select().from(visionImagesTable)
    .where(and(...conditions))
    .orderBy(desc(visionImagesTable.createdAt));

  res.json(images);
});

// Get single image with analysis
router.get("/designer/vision/images/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [image] = await db.select().from(visionImagesTable)
    .where(and(eq(visionImagesTable.id, req.params.id), eq(visionImagesTable.userId, userId)));
  if (!image) { res.status(404).json({ error: "Image not found" }); return; }

  const analyses = await db.select().from(visionAnalysesTable)
    .where(eq(visionAnalysesTable.imageId, image.id)).orderBy(desc(visionAnalysesTable.createdAt));

  const tags = await db.select().from(imageTagsTable).where(eq(imageTagsTable.imageId, image.id));

  res.json({ image, analyses, tags });
});

// Delete image
router.delete("/designer/vision/images/:id", async (req: Request, res: Response): Promise<void> => {
  const deleted = await db.delete(visionImagesTable)
    .where(and(eq(visionImagesTable.id, req.params.id), eq(visionImagesTable.userId, req.userId!)))
    .returning();
  if (!deleted.length) { res.status(404).json({ error: "Image not found" }); return; }
  res.json({ success: true });
});

// Update image (favourite, archive, collection, tags)
router.patch("/designer/vision/images/:id", async (req: Request, res: Response): Promise<void> => {
  const { isFavourite, isArchived, collectionId, garmentType, aiTags } = req.body;
  const update: Record<string, unknown> = {};
  if (isFavourite !== undefined) update.isFavourite = isFavourite;
  if (isArchived !== undefined) update.isArchived = isArchived;
  if (collectionId !== undefined) update.collectionId = collectionId;
  if (garmentType !== undefined) update.garmentType = garmentType;
  if (aiTags !== undefined) update.aiTags = aiTags;

  const [updated] = await db.update(visionImagesTable).set(update)
    .where(and(eq(visionImagesTable.id, req.params.id), eq(visionImagesTable.userId, req.userId!)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Image not found" }); return; }
  res.json(updated);
});

// =========================================================================
// VISION ANALYSIS ENDPOINTS
// =========================================================================

// Full analysis
router.post("/designer/vision/analyse/:imageId", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [image] = await db.select().from(visionImagesTable)
    .where(and(eq(visionImagesTable.id, req.params.imageId), eq(visionImagesTable.userId, userId)));
  if (!image) { res.status(404).json({ error: "Image not found" }); return; }

  const startTime = Date.now();
  const result = await analyseVisionImage(image.originalPath, VISION_SYSTEM_FULL, { temperature: 0.3 });
  const processingTimeMs = Date.now() - startTime;

  const [analysis] = await db.insert(visionAnalysesTable).values({
    userId, imageId: image.id, type: "FULL", result, status: "COMPLETED",
    modelUsed: "gpt-4o-vision", processingTimeMs,
  }).returning();

  // Update image metadata
  await db.update(visionImagesTable).set({
    analysisStatus: "COMPLETED", analysisId: analysis.id,
    garmentType: (result.garmentType as string) ?? image.garmentType,
    dominantColors: (result.primaryColours ?? image.dominantColors) as Array<{ hex: string; name: string; percentage: number }>,
    aiDescription: (result.styleSummary as string) ?? image.aiDescription,
  }).where(eq(visionImagesTable.id, image.id));

  res.json({ analysis, result });
});

// Fabric detection
router.post("/designer/vision/analyse/fabric/:imageId", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [image] = await db.select().from(visionImagesTable)
    .where(and(eq(visionImagesTable.id, req.params.imageId), eq(visionImagesTable.userId, userId)));
  if (!image) { res.status(404).json({ error: "Image not found" }); return; }

  const startTime = Date.now();
  const result = await analyseVisionImage(image.originalPath, VISION_SYSTEM_FABRIC);
  const [analysis] = await db.insert(visionAnalysesTable).values({
    userId, imageId: image.id, type: "FABRIC", result, status: "COMPLETED",
    modelUsed: "gpt-4o-vision", processingTimeMs: Date.now() - startTime,
  }).returning();
  res.json({ analysis, result });
});

// Colour extraction
router.post("/designer/vision/analyse/colour/:imageId", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [image] = await db.select().from(visionImagesTable)
    .where(and(eq(visionImagesTable.id, req.params.imageId), eq(visionImagesTable.userId, userId)));
  if (!image) { res.status(404).json({ error: "Image not found" }); return; }

  const result = await analyseVisionImage(image.originalPath, VISION_SYSTEM_COLOUR);
  const [analysis] = await db.insert(visionAnalysesTable).values({
    userId, imageId: image.id, type: "COLOUR", result, status: "COMPLETED", modelUsed: "gpt-4o-vision",
  }).returning();
  res.json({ analysis, result });
});

// Garment deconstruction
router.post("/designer/vision/analyse/deconstruct/:imageId", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [image] = await db.select().from(visionImagesTable)
    .where(and(eq(visionImagesTable.id, req.params.imageId), eq(visionImagesTable.userId, userId)));
  if (!image) { res.status(404).json({ error: "Image not found" }); return; }

  const result = await analyseVisionImage(image.originalPath, VISION_SYSTEM_DECONSTRUCT);
  const [analysis] = await db.insert(visionAnalysesTable).values({
    userId, imageId: image.id, type: "DECONSTRUCT", result, status: "COMPLETED", modelUsed: "gpt-4o-vision",
  }).returning();
  res.json({ analysis, result });
});

// Design improvement suggestions
router.post("/designer/vision/analyse/improve/:imageId", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [image] = await db.select().from(visionImagesTable)
    .where(and(eq(visionImagesTable.id, req.params.imageId), eq(visionImagesTable.userId, userId)));
  if (!image) { res.status(404).json({ error: "Image not found" }); return; }

  const result = await analyseVisionImage(image.originalPath, VISION_SYSTEM_IMPROVE);
  const [analysis] = await db.insert(visionAnalysesTable).values({
    userId, imageId: image.id, type: "IMPROVE", result, status: "COMPLETED", modelUsed: "gpt-4o-vision",
  }).returning();
  res.json({ analysis, result });
});

// Trend analysis
router.post("/designer/vision/analyse/trend/:imageId", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [image] = await db.select().from(visionImagesTable)
    .where(and(eq(visionImagesTable.id, req.params.imageId), eq(visionImagesTable.userId, userId)));
  if (!image) { res.status(404).json({ error: "Image not found" }); return; }

  const result = await analyseVisionImage(image.originalPath, VISION_SYSTEM_TREND);
  const [analysis] = await db.insert(visionAnalysesTable).values({
    userId, imageId: image.id, type: "TREND", result, status: "COMPLETED", modelUsed: "gpt-4o-vision",
  }).returning();
  res.json({ analysis, result });
});

// =========================================================================
// IMAGE GENERATION
// =========================================================================

router.post("/designer/vision/generate", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { prompt, negativePrompt, projectId } = req.body as {
    prompt?: string; negativePrompt?: string; projectId?: string;
  };

  if (!prompt?.trim()) { res.status(400).json({ error: "prompt is required" }); return; }

  let imageUrl: string;
  try {
    imageUrl = await aiGenerateImage(prompt);
  } catch (err) {
    // Fallback: generate text concept card
    const concept = await generateConceptCard(prompt);
    imageUrl = `data:text/plain;base64,${Buffer.from(JSON.stringify(concept)).toString("base64")}`;
  }

  const [generation] = await db.insert(visionGenerationsTable).values({
    userId, projectId: projectId ?? null, prompt: prompt.trim(),
    negativePrompt: negativePrompt ?? null, imageUrl,
  }).returning();

  res.status(201).json(generation);
});

// List generations
router.get("/designer/vision/generations", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { projectId, isFavourite } = req.query as Record<string, string | undefined>;
  const conditions = [eq(visionGenerationsTable.userId, userId)];
  if (projectId) conditions.push(eq(visionGenerationsTable.projectId, projectId));
  if (isFavourite === "true") conditions.push(eq(visionGenerationsTable.isFavourite, true));

  const gens = await db.select().from(visionGenerationsTable)
    .where(and(...conditions)).orderBy(desc(visionGenerationsTable.createdAt));
  res.json(gens);
});

router.delete("/designer/vision/generations/:id", async (req: Request, res: Response): Promise<void> => {
  await db.delete(visionGenerationsTable)
    .where(and(eq(visionGenerationsTable.id, req.params.id), eq(visionGenerationsTable.userId, req.userId!)));
  res.json({ success: true });
});

// =========================================================================
// MOOD BOARDS
// =========================================================================

// List mood boards
router.get("/designer/vision/mood-boards", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const boards = await db.select().from(moodBoardsTable)
    .where(eq(moodBoardsTable.userId, userId))
    .orderBy(desc(moodBoardsTable.updatedAt));
  res.json(boards);
});

// Create mood board
router.post("/designer/vision/mood-boards", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { title, description, theme, projectId } = req.body as {
    title?: string; description?: string; theme?: string; projectId?: string;
  };
  if (!title?.trim()) { res.status(400).json({ error: "title is required" }); return; }

  const [board] = await db.insert(moodBoardsTable).values({
    userId, projectId: projectId ?? null, title: title.trim(),
    description: description ?? null, theme: theme ?? null,
  }).returning();
  res.status(201).json(board);
});

// Get mood board with items
router.get("/designer/vision/mood-boards/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [board] = await db.select().from(moodBoardsTable)
    .where(and(eq(moodBoardsTable.id, req.params.id), eq(moodBoardsTable.userId, userId)));
  if (!board) { res.status(404).json({ error: "Mood board not found" }); return; }

  const items = await db.select({
    item: moodBoardItemsTable,
    image: visionImagesTable,
  }).from(moodBoardItemsTable)
    .innerJoin(visionImagesTable, eq(moodBoardItemsTable.imageId, visionImagesTable.id))
    .where(eq(moodBoardItemsTable.moodBoardId, board.id))
    .orderBy(asc(moodBoardItemsTable.sortOrder));

  res.json({ board, items });
});

// Update mood board
router.patch("/designer/vision/mood-boards/:id", async (req: Request, res: Response): Promise<void> => {
  const { title, description, theme, keywords, colourDirection, styleDirection, trendSummary } = req.body;
  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (description !== undefined) update.description = description;
  if (theme !== undefined) update.theme = theme;
  if (keywords !== undefined) update.keywords = keywords;
  if (colourDirection !== undefined) update.colourDirection = colourDirection;
  if (styleDirection !== undefined) update.styleDirection = styleDirection;
  if (trendSummary !== undefined) update.trendSummary = trendSummary;

  const [updated] = await db.update(moodBoardsTable).set(update)
    .where(and(eq(moodBoardsTable.id, req.params.id), eq(moodBoardsTable.userId, req.userId!)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Mood board not found" }); return; }
  res.json(updated);
});

// Delete mood board
router.delete("/designer/vision/mood-boards/:id", async (req: Request, res: Response): Promise<void> => {
  await db.delete(moodBoardsTable)
    .where(and(eq(moodBoardsTable.id, req.params.id), eq(moodBoardsTable.userId, req.userId!)));
  res.json({ success: true });
});

// Add image to mood board
router.post("/designer/vision/mood-boards/:id/items", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { imageId, positionX, positionY, width, height, caption } = req.body as {
    imageId?: string; positionX?: number; positionY?: number;
    width?: number; height?: number; caption?: string;
  };
  if (!imageId) { res.status(400).json({ error: "imageId is required" }); return; }

  // Verify image ownership
  const [img] = await db.select().from(visionImagesTable)
    .where(and(eq(visionImagesTable.id, imageId), eq(visionImagesTable.userId, userId)));
  if (!img) { res.status(404).json({ error: "Image not found" }); return; }

  const [item] = await db.insert(moodBoardItemsTable).values({
    moodBoardId: req.params.id, imageId,
    positionX: positionX ?? 0, positionY: positionY ?? 0,
    width: width ?? 300, height: height ?? 300, caption: caption ?? null,
  }).returning();

  // Auto-analyse mood board
  const boardItems = await db.select({ path: visionImagesTable.originalPath })
    .from(moodBoardItemsTable).innerJoin(visionImagesTable, eq(moodBoardItemsTable.imageId, visionImagesTable.id))
    .where(eq(moodBoardItemsTable.moodBoardId, req.params.id));
  const imageUrls = boardItems.map((i) => i.path).filter(Boolean);

  if (imageUrls.length >= 2) {
    const moodResult = await analyseVisionImage(imageUrls[0], VISION_SYSTEM_MOOD).catch(() => ({}));
    if (moodResult.keywords) {
      await db.update(moodBoardsTable).set({
        keywords: moodResult.keywords as string[],
        styleDirection: moodResult.styleDirection as string,
        colourDirection: JSON.stringify(moodResult.colourDirections),
        trendSummary: moodResult.trendSummary as string,
      }).where(eq(moodBoardsTable.id, req.params.id));
    }
  }

  res.status(201).json(item);
});

// Remove item from mood board
router.delete("/designer/vision/mood-boards/:boardId/items/:itemId", async (req: Request, res: Response): Promise<void> => {
  await db.delete(moodBoardItemsTable).where(eq(moodBoardItemsTable.id, req.params.itemId));
  res.json({ success: true });
});

// =========================================================================
// DESIGN COMPARISON
// =========================================================================

router.post("/designer/vision/compare", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { imageIdA, imageIdB } = req.body as { imageIdA?: string; imageIdB?: string };
  if (!imageIdA || !imageIdB) { res.status(400).json({ error: "imageIdA and imageIdB are required" }); return; }

  const [imgA] = await db.select().from(visionImagesTable).where(and(eq(visionImagesTable.id, imageIdA), eq(visionImagesTable.userId, userId)));
  const [imgB] = await db.select().from(visionImagesTable).where(and(eq(visionImagesTable.id, imageIdB), eq(visionImagesTable.userId, userId)));
  if (!imgA || !imgB) { res.status(404).json({ error: "One or both images not found" }); return; }

  // Analyse both images
  const [resultA, resultB] = await Promise.all([
    analyseVisionImage(imgA.originalPath, VISION_SYSTEM_FULL),
    analyseVisionImage(imgB.originalPath, VISION_SYSTEM_FULL),
  ]);

  // Compare using AI
  const compareResult = await aiComplete([
    { role: "system", content: VISION_SYSTEM_COMPARE } as ChatMessage,
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: `Design A: ${JSON.stringify(resultA)}\n\nDesign B: ${JSON.stringify(resultB)}\n\nCompare these two fashion designs.` },
      ],
    },
  ]);

  const startIdx = compareResult.indexOf("{");
  const endIdx = compareResult.lastIndexOf("}");
  const parsed = startIdx !== -1 && endIdx !== -1
    ? JSON.parse(compareResult.slice(startIdx, endIdx + 1))
    : { raw: compareResult };

  const [analysis] = await db.insert(visionAnalysesTable).values({
    userId, type: "COMPARE", result: parsed, status: "COMPLETED",
    modelUsed: "gpt-4o-vision", compareImageId: imageIdB,
  }).returning();

  res.json({ analysis, designA: resultA, designB: resultB, comparison: parsed });
});

// =========================================================================
// SMART TAGGING
// =========================================================================

router.get("/designer/vision/tags/:imageId", async (req: Request, res: Response): Promise<void> => {
  const tags = await db.select().from(imageTagsTable)
    .where(eq(imageTagsTable.imageId, req.params.imageId));
  res.json(tags);
});

router.post("/designer/vision/tags/:imageId", async (req: Request, res: Response): Promise<void> => {
  const { tag, source } = req.body as { tag?: string; source?: string };
  if (!tag?.trim()) { res.status(400).json({ error: "tag is required" }); return; }
  const [created] = await db.insert(imageTagsTable).values({
    imageId: req.params.imageId, tag: tag.trim().toLowerCase(), source: source ?? "user",
  }).returning();
  res.status(201).json(created);
});

router.delete("/designer/vision/tags/:imageId/:tagId", async (req: Request, res: Response): Promise<void> => {
  await db.delete(imageTagsTable)
    .where(and(eq(imageTagsTable.id, req.params.tagId), eq(imageTagsTable.imageId, req.params.imageId)));
  res.json({ success: true });
});

// =========================================================================
// SEARCH
// =========================================================================

router.get("/designer/vision/search", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { q, colour, garmentType, tags } = req.query as Record<string, string | undefined>;
  const conditions: ReturnType<typeof eq>[] = [eq(visionImagesTable.userId, userId), eq(visionImagesTable.isArchived, false)];

  if (q) conditions.push(sql`(${visionImagesTable.aiDescription} ILIKE ${`%${q}%`} OR ${visionImagesTable.originalName} ILIKE ${`%${q}%`})`);
  if (garmentType) conditions.push(sql`${visionImagesTable.garmentType} ILIKE ${`%${garmentType}%`}`);
  if (colour) conditions.push(sql`${visionImagesTable.dominantColors}::text ILIKE ${`%${colour}%`}`);

  let results = await db.select().from(visionImagesTable)
    .where(and(...conditions))
    .orderBy(desc(visionImagesTable.createdAt))
    .limit(50);

  // Filter by tags (if provided)
  if (tags) {
    const tagList = tags.split(",").map((t) => t.trim().toLowerCase());
    const taggedImageIds = (await db.select({ imageId: imageTagsTable.imageId })
      .from(imageTagsTable)
      .where(inArray(imageTagsTable.tag, tagList)))
      .map((r) => r.imageId);
    results = results.filter((img) => taggedImageIds.includes(img.id));
  }

  res.json(results);
});

export default router;
