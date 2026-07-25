import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { eq, and, desc, asc, like, or, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  aiStudioConversationsTable,
  aiStudioFoldersTable,
  promptTemplatesTable,
  aiMemoryTable,
  aiExportsTable,
  aiSettingsTable,
  aiCollectionsTable,
  aiConversationsTable,
  usersTable,
  producerProfilesTable,
  notificationsTable,
} from "@workspace/db";
import { complete, type ChatMessage } from "../../lib/ai/text-provider";

const router: IRouter = Router();
router.use(requireAuth);

// =========================================================================
// SYSTEM PROMPTS
// =========================================================================

const SYSTEM_PROMPTS: Record<string, string> = {
  default: `You are Aria, Drape's expert fashion design AI assistant. Help fashion designers with creative concepts, technical specifications, fabric recommendations, production advice, and business insights. Be concise, practical, and inspiring. Always consider the Nigerian and African fashion context.`,
  brief: `You are a professional fashion design brief generator. Create comprehensive, structured fashion design briefs with all essential sections. Output in clear markdown with headings for: Overview, Target Customer, Occasion, Silhouette, Colour Palette, Fabric Recommendation, Materials, Accessories, Construction Notes, Challenges, Production Notes, Quality Expectations.`,
  production: `You are an expert fashion production guide generator. Create detailed production guides with: Materials, Measurements, Cutting Guide, Construction Order, Stitching Notes, Finishing, Quality Control Checklist, Packaging Notes, Estimated Production Time, Difficulty Rating, Estimated Cost. Be specific and practical.`,
  fabric: `You are a fabric expert with deep knowledge of textiles, their properties, costs, and best uses in fashion. Give specific fabric names, weights, drapes, and care instructions. Include both African and global fabric options.`,
  colour: `You are a colour theory expert for fashion. Generate harmonious colour palettes with HEX codes, explain colour psychology, and suggest combinations for different skin tones, occasions, and seasons.`,
  collection: `You are a fashion collection director. Generate complete collection concepts with individual looks, colour stories, styling notes, and runway presentation ideas. Create cohesive, marketable collections.`,
  brand: `You are a fashion brand strategist and copywriter. Generate compelling brand stories, product descriptions, and marketing copy that captures the essence of African luxury fashion.`,
  pricing: `You are a fashion business consultant specializing in pricing strategy. Calculate suggested retail and wholesale prices based on materials, labour, complexity, overhead, and desired margins. Use Naira (₦) as the primary currency.`,
  critique: `You are an experienced fashion design critic. Analyse designs for balance, proportion, construction feasibility, fabric suitability, colour harmony, trend alignment, commercial potential, and production risks. Provide constructive, actionable feedback.`,
};

// =========================================================================
// HELPER
// =========================================================================

async function safeComplete(messages: ChatMessage[], options: { temperature?: number; maxTokens?: number } = {}): Promise<string> {
  try {
    return await complete(messages, { temperature: options.temperature ?? 0.7, maxTokens: options.maxTokens ?? 2048 });
  } catch (err) {
    console.error("[AI STUDIO] Generation failed:", err);
    return "I apologize, but I'm having trouble processing your request right now. Please try again or rephrase your question.";
  }
}

// =========================================================================
// CONVERSATIONS — Full CRUD + enhanced features
// =========================================================================

router.get("/designer/ai-studio/conversations", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { folderId, pinned, search, archived } = req.query as Record<string, string | undefined>;

  const conditions = [eq(aiStudioConversationsTable.userId, userId)];
  if (folderId) conditions.push(eq(aiStudioConversationsTable.folderId, folderId));
  if (pinned === "true") conditions.push(eq(aiStudioConversationsTable.pinned, true));
  if (archived === "true") conditions.push(eq(aiStudioConversationsTable.archived, true));
  else if (!archived) conditions.push(eq(aiStudioConversationsTable.archived, false));
  if (search) conditions.push(like(aiStudioConversationsTable.title, `%${search}%`));

  const conversations = await db
    .select()
    .from(aiStudioConversationsTable)
    .where(and(...conditions))
    .orderBy(desc(aiStudioConversationsTable.pinned), desc(aiStudioConversationsTable.updatedAt));

  res.json(conversations);
});

router.post("/designer/ai-studio/conversations", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { title, folderId, context } = req.body as { title?: string; folderId?: string; context?: Record<string, unknown> };

  const [conversation] = await db
    .insert(aiStudioConversationsTable)
    .values({
      userId,
      title: title ?? "New Design Session",
      folderId: folderId ?? null,
      context: context ?? {},
      messages: [],
    })
    .returning();

  res.status(201).json(conversation);
});

router.get("/designer/ai-studio/conversations/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [conv] = await db
    .select()
    .from(aiStudioConversationsTable)
    .where(and(eq(aiStudioConversationsTable.id, req.params.id), eq(aiStudioConversationsTable.userId, userId)));

  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  res.json(conv);
});

router.patch("/designer/ai-studio/conversations/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { title, folderId, pinned, archived, tags, context } = req.body;

  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (folderId !== undefined) update.folderId = folderId;
  if (pinned !== undefined) update.pinned = pinned;
  if (archived !== undefined) update.archived = archived;
  if (tags !== undefined) update.tags = tags;
  if (context !== undefined) update.context = context;

  const [conv] = await db
    .update(aiStudioConversationsTable)
    .set(update)
    .where(and(eq(aiStudioConversationsTable.id, req.params.id), eq(aiStudioConversationsTable.userId, userId)))
    .returning();

  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  res.json(conv);
});

router.delete("/designer/ai-studio/conversations/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const deleted = await db
    .delete(aiStudioConversationsTable)
    .where(and(eq(aiStudioConversationsTable.id, req.params.id), eq(aiStudioConversationsTable.userId, userId)))
    .returning();
  if (!deleted.length) { res.status(404).json({ error: "Conversation not found" }); return; }
  res.json({ success: true });
});

router.post("/designer/ai-studio/conversations/:id/messages", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const conversationId = req.params.id;
  const { content, mode } = req.body as { content: string; mode?: string };

  if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }

  const [conv] = await db
    .select()
    .from(aiStudioConversationsTable)
    .where(and(eq(aiStudioConversationsTable.id, conversationId), eq(aiStudioConversationsTable.userId, userId)));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  // Determine system prompt
  const systemPrompt = mode && SYSTEM_PROMPTS[mode] ? SYSTEM_PROMPTS[mode] : SYSTEM_PROMPTS.default;

  // Get current messages and context
  const currentMessages = (conv.messages || []) as Array<{ role: string; content: string; createdAt: string }>;
  const context = (conv.context || {}) as Record<string, string>;

  // Build context string
  const contextStr = Object.entries(context)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const fullSystemPrompt = contextStr
    ? `${systemPrompt}\n\nCurrent project context:\n${contextStr}`
    : systemPrompt;

  // Build messages array
  const historyMessages: ChatMessage[] = currentMessages.slice(-10).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const aiMessages: ChatMessage[] = [
    { role: "system", content: fullSystemPrompt },
    ...historyMessages,
    { role: "user", content },
  ];

  // Add user message to DB
  const userMsg = { role: "user" as const, content, createdAt: new Date().toISOString() };
  const updatedMessages = [...currentMessages, userMsg];

  await db
    .update(aiStudioConversationsTable)
    .set({ messages: updatedMessages, updatedAt: new Date() })
    .where(eq(aiStudioConversationsTable.id, conversationId));

  // Get AI response
  const reply = await safeComplete(aiMessages, { temperature: 0.7, maxTokens: 2048 });

  // Add assistant message
  const assistantMsg = { role: "assistant" as const, content: reply, createdAt: new Date().toISOString() };
  const finalMessages = [...updatedMessages, assistantMsg];

  const [updated] = await db
    .update(aiStudioConversationsTable)
    .set({ messages: finalMessages, updatedAt: new Date() })
    .where(eq(aiStudioConversationsTable.id, conversationId))
    .returning();

  res.json(updated);
});

// ── Export conversation ──────────────────────────────────────────

router.post("/designer/ai-studio/conversations/:id/export", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const conversationId = req.params.id;
  const { format = "md" } = req.body as { format?: string };

  const [conv] = await db
    .select()
    .from(aiStudioConversationsTable)
    .where(and(eq(aiStudioConversationsTable.id, conversationId), eq(aiStudioConversationsTable.userId, userId)));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const msgs = (conv.messages || []) as Array<{ role: string; content: string }>;
  let content = `# ${conv.title}\n\n`;
  msgs.forEach((m) => {
    content += `**${m.role === "user" ? "You" : "Aria"}**:\n${m.content}\n\n---\n\n`;
  });

  const [exported] = await db.insert(aiExportsTable).values({ userId, conversationId, title: conv.title, format, content }).returning();
  res.json({ ...exported, content });
});

// =========================================================================
// FOLDERS
// =========================================================================

router.get("/designer/ai-studio/folders", async (req: Request, res: Response): Promise<void> => {
  const folders = await db
    .select()
    .from(aiStudioFoldersTable)
    .where(eq(aiStudioFoldersTable.userId, req.userId!))
    .orderBy(asc(aiStudioFoldersTable.name));
  res.json(folders);
});

router.post("/designer/ai-studio/folders", async (req: Request, res: Response): Promise<void> => {
  const { name, color } = req.body as { name: string; color?: string };
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  const [folder] = await db.insert(aiStudioFoldersTable).values({ userId: req.userId!, name, color }).returning();
  res.status(201).json(folder);
});

router.patch("/designer/ai-studio/folders/:id", async (req: Request, res: Response): Promise<void> => {
  const { name, color } = req.body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (color !== undefined) update.color = color;
  const [folder] = await db.update(aiStudioFoldersTable).set(update)
    .where(and(eq(aiStudioFoldersTable.id, req.params.id), eq(aiStudioFoldersTable.userId, req.userId!)))
    .returning();
  if (!folder) { res.status(404).json({ error: "Folder not found" }); return; }
  res.json(folder);
});

router.delete("/designer/ai-studio/folders/:id", async (req: Request, res: Response): Promise<void> => {
  await db.update(aiStudioConversationsTable).set({ folderId: null })
    .where(eq(aiStudioConversationsTable.folderId, req.params.id));
  await db.delete(aiStudioFoldersTable)
    .where(and(eq(aiStudioFoldersTable.id, req.params.id), eq(aiStudioFoldersTable.userId, req.userId!)));
  res.json({ success: true });
});

// =========================================================================
// PROMPT TEMPLATES
// =========================================================================

router.get("/designer/ai-studio/prompts", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const prompts = await db
    .select()
    .from(promptTemplatesTable)
    .where(or(eq(promptTemplatesTable.userId, userId), eq(promptTemplatesTable.isBuiltIn, true)))
    .orderBy(desc(promptTemplatesTable.usageCount));
  res.json(prompts);
});

router.post("/designer/ai-studio/prompts", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { title, description, category, prompt, systemPrompt } = req.body;
  if (!title?.trim() || !prompt?.trim()) { res.status(400).json({ error: "title and prompt are required" }); return; }
  const [created] = await db.insert(promptTemplatesTable).values({ userId, title, description, category, prompt, systemPrompt, isBuiltIn: false }).returning();
  res.status(201).json(created);
});

router.patch("/designer/ai-studio/prompts/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { title, description, category, prompt, systemPrompt, isFavourite } = req.body;
  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (description !== undefined) update.description = description;
  if (category !== undefined) update.category = category;
  if (prompt !== undefined) update.prompt = prompt;
  if (systemPrompt !== undefined) update.systemPrompt = systemPrompt;
  if (isFavourite !== undefined) update.isFavourite = isFavourite;
  const [updated] = await db.update(promptTemplatesTable).set(update)
    .where(and(eq(promptTemplatesTable.id, req.params.id), eq(promptTemplatesTable.userId, userId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Prompt not found" }); return; }
  res.json(updated);
});

router.delete("/designer/ai-studio/prompts/:id", async (req: Request, res: Response): Promise<void> => {
  await db.delete(promptTemplatesTable)
    .where(and(eq(promptTemplatesTable.id, req.params.id), eq(promptTemplatesTable.userId, req.userId!), eq(promptTemplatesTable.isBuiltIn, false)));
  res.json({ success: true });
});

// =========================================================================
// AI MEMORY
// =========================================================================

router.get("/designer/ai-studio/memory", async (req: Request, res: Response): Promise<void> => {
  const memory = await db.select().from(aiMemoryTable).where(eq(aiMemoryTable.userId, req.userId!)).orderBy(desc(aiMemoryTable.updatedAt));
  res.json(memory);
});

router.post("/designer/ai-studio/memory", async (req: Request, res: Response): Promise<void> => {
  const { key, value, category } = req.body;
  if (!key?.trim() || !value?.trim()) { res.status(400).json({ error: "key and value are required" }); return; }
  const existing = await db.select().from(aiMemoryTable).where(and(eq(aiMemoryTable.userId, req.userId!), eq(aiMemoryTable.key, key)));
  if (existing.length > 0) {
    const [updated] = await db.update(aiMemoryTable).set({ value, category }).where(eq(aiMemoryTable.id, existing[0].id)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(aiMemoryTable).values({ userId: req.userId!, key, value, category }).returning();
    res.status(201).json(created);
  }
});

router.delete("/designer/ai-studio/memory/:key", async (req: Request, res: Response): Promise<void> => {
  await db.delete(aiMemoryTable).where(and(eq(aiMemoryTable.userId, req.userId!), eq(aiMemoryTable.key, req.params.key)));
  res.json({ success: true });
});

router.delete("/designer/ai-studio/memory", async (req: Request, res: Response): Promise<void> => {
  await db.delete(aiMemoryTable).where(eq(aiMemoryTable.userId, req.userId!));
  res.json({ success: true });
});

// =========================================================================
// AI SETTINGS
// =========================================================================

router.get("/designer/ai-studio/settings", async (req: Request, res: Response): Promise<void> => {
  const [settings] = await db.select().from(aiSettingsTable).where(eq(aiSettingsTable.userId, req.userId!));
  if (!settings) {
    const [created] = await db.insert(aiSettingsTable).values({ userId: req.userId! }).returning();
    res.json(created);
  } else {
    res.json(settings);
  }
});

router.patch("/designer/ai-studio/settings", async (req: Request, res: Response): Promise<void> => {
  const { model, temperature, maxTokens, language, tone, autoSave, contextMemory } = req.body;
  const update: Record<string, unknown> = {};
  if (model !== undefined) update.model = model;
  if (temperature !== undefined) update.temperature = temperature;
  if (maxTokens !== undefined) update.maxTokens = maxTokens;
  if (language !== undefined) update.language = language;
  if (tone !== undefined) update.tone = tone;
  if (autoSave !== undefined) update.autoSave = autoSave;
  if (contextMemory !== undefined) update.contextMemory = contextMemory;

  const existing = await db.select().from(aiSettingsTable).where(eq(aiSettingsTable.userId, req.userId!));
  if (existing.length > 0) {
    const [updated] = await db.update(aiSettingsTable).set(update).where(eq(aiSettingsTable.userId, req.userId!)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(aiSettingsTable).values({ userId: req.userId!, ...update }).returning();
    res.json(created);
  }
});

// =========================================================================
// AI GENERATION ENDPOINTS
// =========================================================================

// ── Brief generation ─────────────────────────────────────────────

router.post("/designer/ai-studio/generate/brief", async (req: Request, res: Response): Promise<void> => {
  const { description, occasion, client, budget } = req.body as Record<string, string | undefined>;
  const prompt = `Generate a professional fashion design brief based on these details:
${description ? `Description: ${description}` : ""}
${occasion ? `Occasion: ${occasion}` : ""}
${client ? `Client: ${client}` : ""}
${budget ? `Budget: ${budget}` : ""}

Create a comprehensive brief with all standard sections. Format in clear markdown.`;
  const reply = await safeComplete([
    { role: "system", content: SYSTEM_PROMPTS.brief },
    { role: "user", content: prompt },
  ], { temperature: 0.7, maxTokens: 2048 });
  res.json({ reply });
});

// ── Production guide generation ──────────────────────────────────

router.post("/designer/ai-studio/generate/production-guide", async (req: Request, res: Response): Promise<void> => {
  const { garmentType, fabric, complexity, notes } = req.body as Record<string, string | undefined>;
  const prompt = `Generate a detailed production guide for:
${garmentType ? `Garment: ${garmentType}` : ""}
${fabric ? `Fabric: ${fabric}` : ""}
${complexity ? `Complexity: ${complexity}` : ""}
${notes ? `Additional notes: ${notes}` : ""}

Include all sections: Materials, Measurements, Cutting Guide, Construction Order, Stitching Notes, Finishing, QC Checklist, Packaging, Time & Cost Estimates.`;
  const reply = await safeComplete([
    { role: "system", content: SYSTEM_PROMPTS.production },
    { role: "user", content: prompt },
  ], { temperature: 0.6, maxTokens: 2048 });
  res.json({ reply });
});

// ── Fabric recommendation ────────────────────────────────────────

router.post("/designer/ai-studio/generate/fabric", async (req: Request, res: Response): Promise<void> => {
  const { garment, climate, budget: budgetStr, preferences } = req.body as Record<string, string | undefined>;
  const prompt = `Recommend fabrics for:
${garment ? `Garment: ${garment}` : ""}
${climate ? `Climate/Occasion: ${climate}` : ""}
${budgetStr ? `Budget range: ${budgetStr}` : ""}
${preferences ? `Preferences: ${preferences}` : ""}

For each fabric: name, description, advantages, disadvantages, care instructions, estimated cost, alternative options.`;
  const reply = await safeComplete([
    { role: "system", content: SYSTEM_PROMPTS.fabric },
    { role: "user", content: prompt },
  ], { temperature: 0.7, maxTokens: 1536 });
  res.json({ reply });
});

// ── Colour palette generation ────────────────────────────────────

router.post("/designer/ai-studio/generate/colour", async (req: Request, res: Response): Promise<void> => {
  const { theme, season, mood, garmentType: ct } = req.body as Record<string, string | undefined>;
  const prompt = `Generate a colour palette for:
${theme ? `Theme: ${theme}` : ""}
${season ? `Season: ${season}` : ""}
${mood ? `Mood: ${mood}` : ""}
${ct ? `Garment type: ${ct}` : ""}

Include HEX codes, colour names, psychological associations, suggested combinations.`;
  const reply = await safeComplete([
    { role: "system", content: SYSTEM_PROMPTS.colour },
    { role: "user", content: prompt },
  ], { temperature: 0.8, maxTokens: 1024 });
  res.json({ reply });
});

// ── Collection generation ────────────────────────────────────────

router.post("/designer/ai-studio/generate/collection", async (req: Request, res: Response): Promise<void> => {
  const { theme, season, targetAudience, numberOfOutfits } = req.body as Record<string, string | undefined>;
  const prompt = `Design a fashion collection:
${theme ? `Theme: ${theme}` : ""}
${season ? `Season: ${season}` : ""}
${targetAudience ? `Target audience: ${targetAudience}` : ""}
${numberOfOutfits ? `Number of outfits: ${numberOfOutfits}` : "Number of outfits: 6"}

Include: collection concept, individual looks with descriptions, colour story, styling notes, runway order suggestion.`;
  const reply = await safeComplete([
    { role: "system", content: SYSTEM_PROMPTS.collection },
    { role: "user", content: prompt },
  ], { temperature: 0.8, maxTokens: 2048 });
  res.json({ reply });
});

// ── Brand content generation ─────────────────────────────────────

router.post("/designer/ai-studio/generate/brand-content", async (req: Request, res: Response): Promise<void> => {
  const { brandName, product, audience, format: fmt } = req.body as Record<string, string | undefined>;
  const prompt = `Generate fashion ${fmt || "content"}:
${brandName ? `Brand: ${brandName}` : ""}
${product ? `Product: ${product}` : ""}
${audience ? `Target audience: ${audience}` : ""}

Create compelling, market-ready copy that captures the essence of African luxury fashion.`;
  const reply = await safeComplete([
    { role: "system", content: SYSTEM_PROMPTS.brand },
    { role: "user", content: prompt },
  ], { temperature: 0.8, maxTokens: 1536 });
  res.json({ reply });
});

// ── Pricing estimation ───────────────────────────────────────────

router.post("/designer/ai-studio/generate/pricing", async (req: Request, res: Response): Promise<void> => {
  const { garment, fabricCost, labourHours, complexity: comp, profitMargin } = req.body as Record<string, string | undefined>;
  const prompt = `Estimate pricing for:
${garment ? `Garment: ${garment}` : ""}
${fabricCost ? `Fabric cost: ${fabricCost}` : ""}
${labourHours ? `Labour hours: ${labourHours}` : ""}
${comp ? `Complexity: ${comp}` : ""}
${profitMargin ? `Target profit margin: ${profitMargin}` : ""}

Provide: material cost breakdown, labour calculation, overheads, suggested retail price, suggested wholesale price, estimated profit. Use Naira (₦).`;
  const reply = await safeComplete([
    { role: "system", content: SYSTEM_PROMPTS.pricing },
    { role: "user", content: prompt },
  ], { temperature: 0.5, maxTokens: 1536 });
  res.json({ reply });
});

// ── Fashion critique ─────────────────────────────────────────────

router.post("/designer/ai-studio/generate/critique", async (req: Request, res: Response): Promise<void> => {
  const { description, imageAnalysis } = req.body as Record<string, string | undefined>;
  const prompt = `Provide a professional fashion critique for:
${description ? `Description: ${description}` : ""}
${imageAnalysis ? `Image analysis: ${imageAnalysis}` : ""}

Analyse: balance & proportion, construction feasibility, fabric suitability, colour harmony, trend alignment, commercial potential, production risks. Provide constructive, actionable feedback.`;
  const reply = await safeComplete([
    { role: "system", content: SYSTEM_PROMPTS.critique },
    { role: "user", content: prompt },
  ], { temperature: 0.6, maxTokens: 1536 });
  res.json({ reply });
});

// ── Client consultation ──────────────────────────────────────────

router.post("/designer/ai-studio/generate/consultation", async (req: Request, res: Response): Promise<void> => {
  const { clientRequest, style, occasion: occ, budget: bgt } = req.body as Record<string, string | undefined>;
  const prompt = `Help with a client consultation:
${clientRequest ? `Client request: ${clientRequest}` : ""}
${style ? `Style preferences: ${style}` : ""}
${occ ? `Occasion: ${occ}` : ""}
${bgt ? `Budget: ${bgt}` : ""}

Provide: recommended styles, colours, fabrics, estimated budget, and thoughtful follow-up questions to refine the brief.`;
  const reply = await safeComplete([
    { role: "system", content: SYSTEM_PROMPTS.default },
    { role: "user", content: prompt },
  ], { temperature: 0.7, maxTokens: 1536 });
  res.json({ reply });
});

// =========================================================================
// EXPORTS
// =========================================================================

router.get("/designer/ai-studio/exports", async (req: Request, res: Response): Promise<void> => {
  const exports = await db.select()
    .from(aiExportsTable)
    .where(eq(aiExportsTable.userId, req.userId!))
    .orderBy(desc(aiExportsTable.createdAt));
  res.json(exports);
});

router.delete("/designer/ai-studio/exports/:id", async (req: Request, res: Response): Promise<void> => {
  await db.delete(aiExportsTable)
    .where(and(eq(aiExportsTable.id, req.params.id), eq(aiExportsTable.userId, req.userId!)));
  res.json({ success: true });
});

// =========================================================================
// BUILT-IN PROMPT TEMPLATES (seed)
// =========================================================================

const BUILT_IN_PROMPTS = [
  { title: "Luxury Evening Gown Concept", category: "FASHION_DESIGN", prompt: "Design a luxury evening gown concept. Include silhouette, fabric recommendations, colour palette, embellishments, and styling suggestions.", systemPrompt: SYSTEM_PROMPTS.default, isBuiltIn: true },
  { title: "Modern Agbada Design", category: "FASHION_DESIGN", prompt: "Design a modern agbada that blends traditional Nigerian craftsmanship with contemporary silhouettes. Include construction notes, fabric suggestions, and styling recommendations.", systemPrompt: SYSTEM_PROMPTS.default, isBuiltIn: true },
  { title: "Streetwear Collection Brief", category: "COLLECTIONS", prompt: "Create a streetwear collection brief. Include target audience, key pieces, colour story, fabric direction, and brand positioning.", systemPrompt: SYSTEM_PROMPTS.brief, isBuiltIn: true },
  { title: "Fabric Recommendations for Tropical Climate", category: "FASHION_DESIGN", prompt: "Recommend the best fabrics for a tropical climate wedding collection. Consider breathability, drape, durability, and cost.", systemPrompt: SYSTEM_PROMPTS.fabric, isBuiltIn: true },
  { title: "Production Guide — Cocktail Dress", category: "PRODUCTION", prompt: "Generate a detailed production guide for a silk cocktail dress with lace overlay.", systemPrompt: SYSTEM_PROMPTS.production, isBuiltIn: true },
  { title: "Colour Palette — Autumn/Winter Collection", category: "FASHION_DESIGN", prompt: "Generate a sophisticated autumn/winter colour palette for a luxury womenswear collection. Include HEX codes and styling combinations.", systemPrompt: SYSTEM_PROMPTS.colour, isBuiltIn: true },
  { title: "Instagram Caption — New Collection Launch", category: "MARKETING", prompt: "Write captivating Instagram caption for a new fashion collection launch. Include emojis, hashtags, and a call-to-action.", systemPrompt: SYSTEM_PROMPTS.brand, isBuiltIn: true },
  { title: "Pricing — Bespoke Wedding Gown", category: "PRICING", prompt: "Calculate the pricing for a custom bespoke wedding gown. Factor in materials, labour (120 hours), fittings, and premium finishing.", systemPrompt: SYSTEM_PROMPTS.pricing, isBuiltIn: true },
  { title: "Client Consultation — Bridal", category: "CLIENT_COMMUNICATION", prompt: "Help me consult with a bride-to-be who wants a custom wedding dress but doesn't know where to start. Ask the right questions and provide guidance.", systemPrompt: SYSTEM_PROMPTS.default, isBuiltIn: true },
  { title: "Fashion Critique — My Design", category: "FASHION_DESIGN", prompt: "Review my fashion design concept and provide constructive critique on balance, feasibility, and market potential.", systemPrompt: SYSTEM_PROMPTS.critique, isBuiltIn: true },
  { title: "Brand Story — Luxury African Fashion House", category: "BRANDING", prompt: "Write a compelling brand story for a luxury African fashion house that celebrates heritage, craftsmanship, and modernity.", systemPrompt: SYSTEM_PROMPTS.brand, isBuiltIn: true },
  { title: "Pattern Making — Aso Ebi Gown", category: "PATTERN_MAKING", prompt: "Provide pattern making guidance for a traditional Nigerian Aso Ebi gown with fitted bodice and flared skirt.", systemPrompt: SYSTEM_PROMPTS.production, isBuiltIn: true },
];

// Seed built-in prompts (idempotent)
router.post("/designer/ai-studio/seed-prompts", async (_req: Request, res: Response): Promise<void> => {
  const existing = await db.select().from(promptTemplatesTable).where(eq(promptTemplatesTable.isBuiltIn, true));
  if (existing.length > 0) {
    res.json({ seeded: false, count: existing.length });
    return;
  }
  for (const p of BUILT_IN_PROMPTS) {
    await db.insert(promptTemplatesTable).values({ ...p, userId: null, isBuiltIn: true, description: p.category });
  }
  res.json({ seeded: true, count: BUILT_IN_PROMPTS.length });
});

export default router;
