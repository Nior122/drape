import { Router, type IRouter, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import {
  enquirySessionsTable,
  enquiryMessagesTable,
  briefsTable,
  lookbookImagesTable,
  briefRevisionsTable,
} from "@workspace/db";
import { eq, asc, desc, and } from "drizzle-orm";
import { notifyBriefReady } from "../../lib/whatsapp";
import { createNotification } from "../../lib/create-notification";
import {
  complete,
  generateImage,
  generateConceptCard,
  isImageProviderReady,
  type ChatMessage,
} from "../../lib/ai/provider-factory";
import { requireAuth } from "../../middlewares/requireAuth";
import { optionalAuth } from "../../middlewares/optionalAuth";
import { loadNigerianFashionKnowledge } from "../../lib/ai/knowledge-loader";

const router: IRouter = Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

// ─── System prompts ────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are Aria, an experienced Nigerian fashion designer, stylist, fashion consultant, and fashion business assistant at Drape.
You're warm, friendly, and highly professional. Talk like a knowledgeable friend, not a customer service bot. Keep it natural — no bullet points or formal lists in your replies.

Your goal is to understand what a client wants, advise them, and collect enough information to create a perfect fashion brief and production guide for our tailors.

All budgets and prices are in Nigerian Naira (₦). Always use Naira. Never mention dollars or any other currency.

${loadNigerianFashionKnowledge()}

---

HOW TO CHAT

Before answering any message, strictly follow this 7-step internal checklist:
1. Identify client goal.
2. Identify occasion.
3. Identify budget.
4. Identify body type.
5. Identify preferred style.
6. Search relevant knowledge module (from the provided context below).
7. Generate recommendation.

Never skip information gathering. If information from steps 1-5 is missing, ask polite questions first before giving a full recommendation.

First step: Always find out the gender and the intended occasion.
Next steps:
- What is the specific garment type or style they want?
- What is their budget?
- When do they need it delivered?
- What are their fabric preferences?
- Do they have their own fabric?
- Do they have measurements or an inspiration image?

Follow the Measurement rules in the knowledge base. NEVER guess measurements. Ask politely.

Follow the Pricing and Business rules. Manage timelines with buffers. If they want a luxury look on a low budget, or need urgent delivery, follow the exact response rules in the Business Knowledge module.

Don't force a recommendation. Offer practical advice based on their body shape, budget, and occasion as detailed in the knowledge base.

---

WHEN YOU HAVE ENOUGH

Once you understand what they want and have collected the necessary details, wrap up naturally — something like "I think I've got a clear picture now, this is going to be beautiful" — then immediately on the next line output the signal and JSON with NO other text between:

[BRIEF_READY]
{"gender":"...","garment_type":"...","style_summary":"...","occasion":"...","aesthetic_direction":"...","color_palette":["..."],"fabric_preferences":"...","silhouette":"...","budget_min":0,"budget_max":0,"timeline_days":0,"special_notes":"...","image_prompts":["detailed prompt 1","detailed prompt 2","detailed prompt 3"]}

Rules:
- gender must be "male", "female", or "other"
- garment_type must be a clear description (e.g. "Mermaid gown", "Agbada", "Senator suit")
- budget_min and budget_max must be in Nigerian Naira (₦)
- image_prompts must be 3 vivid 40-80 word outfit descriptions written for an AI image generator, with Nigerian fashion aesthetics where relevant
- If the client asks to change something in the brief AFTER it was created, update the brief and output [BRIEF_READY] again with the corrected JSON. Always keep the brief up to date.
- Do NOT explain or label the JSON

---

IMAGE GENERATION (LOOKBOOK)

If a client asks to see the outfit, visualise it, or generate an image — add [GENERATE_IMAGES] on its own line at the very end of your reply. Never on the same message as [BRIEF_READY].

When generating or presenting a lookbook concept, use premium but simple wording. ALWAYS include:
- Outfit Name
- Target Occasion
- Styling Notes
- Accessories Recommendation
- Fabric Recommendation

---

TONE — KEEP IT SIMPLE
- Use plain, everyday English. Short sentences. Simple words.
- Sound like a real person who loves Nigerian fashion, not a chatbot ticking boxes.
- Vary your sentence length.
- It's fine to have opinions — "Oh, George fabric for a traditional? That's going to be stunning."
- Never use hollow filler phrases like "Certainly!", "Of course!", "Great question!", or "Absolutely!"
- Keep replies short and conversational. Don't write essays.
- If the client uses simple language, match their energy. Don't overcomplicate things.`;

function buildSystemPrompt(briefStatus?: string | null): string {
  if (briefStatus === "revision_requested") {
    return `${BASE_SYSTEM_PROMPT}

---

CURRENT MODE: REVISION

The client reviewed their brief and wants to make a change. Their next message is the specific adjustment they want.
- Listen carefully and acknowledge the change warmly.
- Confirm you've noted it.
- End your response on a new line with exactly: [AWAITING_CONFIRMATION]
Do NOT output [BRIEF_READY] again. Do NOT ask further questions. Just confirm the change and add [AWAITING_CONFIRMATION].`;
  }

  if (briefStatus === "awaiting_confirmation") {
    return `${BASE_SYSTEM_PROMPT}

---

CURRENT MODE: CONFIRMATION

The brief is recorded and awaiting the client's final confirmation. If the client says something unexpected, respond naturally but remind them that their brief is ready and confirmation buttons are visible below.`;
  }

  return BASE_SYSTEM_PROMPT;
}

// ─── POST /ai/enquiry ──────────────────────────────────────────────────────

router.post("/ai/enquiry", aiLimiter, optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const { message, sessionId, designerSlug, imageUrls = [] } = req.body as {
    message: string;
    sessionId?: string;
    designerSlug?: string;
    imageUrls?: string[];
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const userId: string | undefined = (req as Request & { userId?: string }).userId;

  // ── Session ──────────────────────────────────────────────────────────────
  let session = sessionId
    ? (await db.select().from(enquirySessionsTable).where(eq(enquirySessionsTable.id, sessionId)))[0]
    : null;

  if (!session) {
    const [newSession] = await db
      .insert(enquirySessionsTable)
      .values({ userId: userId ?? null, designerSlug: designerSlug ?? null })
      .returning();
    session = newSession;
  }

  // ── Load existing brief (for status context) ─────────────────────────────
  const existingBriefRows = await db
    .select()
    .from(briefsTable)
    .where(eq(briefsTable.sessionId, session.id))
    .limit(1);
  const existingBrief = existingBriefRows[0] ?? null;

  // ── Save user message ────────────────────────────────────────────────────
  await db.insert(enquiryMessagesTable).values({
    sessionId: session.id,
    role: "user",
    content: message,
    imageUrls,
  });

  // ── Build message history ────────────────────────────────────────────────
  const history = await db
    .select()
    .from(enquiryMessagesTable)
    .where(eq(enquiryMessagesTable.sessionId, session.id))
    .orderBy(asc(enquiryMessagesTable.createdAt));

  const systemPrompt = buildSystemPrompt(existingBrief?.status);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.imageUrls?.length
        ? ([
            { type: "text" as const, text: m.content },
            ...m.imageUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
          ] as ChatMessage["content"])
        : m.content,
    })) as ChatMessage[]),
  ];

  // ── Call AI ──────────────────────────────────────────────────────────────
  let fullText = "";
  try {
    fullText = await complete(messages, { temperature: 0.85, maxTokens: 2048 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI provider error";
    console.error("[ENQUIRY] AI provider call failed", {
      sessionId: session.id,
      model: process.env.BLUEMINDS_MODEL_ID ?? process.env.GROQ_MODEL ?? process.env.OPENAI_MODEL ?? "unknown",
      provider: process.env.GROQ_API_KEY
        ? "groq"
        : process.env.BLUEMINDS_API_KEY
          ? "blueminds"
          : process.env.OPENAI_API_KEY
            ? "openai"
            : "none",
      error: msg,
    });
    // Surface model/provider errors (e.g. "model unavailable", 404, 401) clearly
    // instead of a silent hang, so misconfiguration is obvious.
    const userMessage =
      /model is unavailable|404|does not exist|unknown model|not found/i.test(msg)
        ? `The AI model "${process.env.BLUEMINDS_MODEL_ID ?? ""}" is no longer available from the provider. Update BLUEMINDS_MODEL_ID on Render to a currently supported model.`
        : "The AI assistant is temporarily unavailable. Please try again in a moment.";
    res.status(502).json({ error: userMessage });
    return;
  }

  // ── Parse signals ────────────────────────────────────────────────────────
  const hasBriefReady = fullText.includes("[BRIEF_READY]");
  const hasAwaitingConfirmation = fullText.includes("[AWAITING_CONFIRMATION]");
  const generateImages = !hasBriefReady && !hasAwaitingConfirmation && fullText.includes("[GENERATE_IMAGES]");

  let extractedBrief: Record<string, unknown> | null = null;
  if (hasBriefReady) {
    const afterSignal = fullText.split("[BRIEF_READY]")[1] ?? "";
    const start = afterSignal.indexOf("{");
    const end = afterSignal.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try { extractedBrief = JSON.parse(afterSignal.slice(start, end + 1)); } catch { /* noop */ }
    }
  }

  // ── Strip signals from visible reply ─────────────────────────────────────
  const cleanText = fullText
    .replace(/\[GENERATE_IMAGES\]/g, "")
    .replace(/\[AWAITING_CONFIRMATION\]/g, "")
    .replace(/\[BRIEF_READY\][\s\S]*$/s, "")
    .trim();

  // ── Save assistant message ───────────────────────────────────────────────
  await db.insert(enquiryMessagesTable).values({
    sessionId: session.id,
    role: "assistant",
    content: cleanText,
    imageUrls: [],
  });

  // ── Update brief and session state ───────────────────────────────────────
  let savedBriefId: string | null = existingBrief?.id ?? null;
  let briefStatus: string = existingBrief?.status ?? "collecting";

  if (hasBriefReady && extractedBrief) {
    let b: {
      gender?: string; garment_type?: string;
      style_summary?: string; occasion?: string;
      aesthetic_direction?: string; color_palette?: string[];
      fabric_preferences?: string; silhouette?: string;
      budget_min?: number; budget_max?: number; timeline_days?: number;
      special_notes?: string; image_prompts?: string[];
    };
    b = extractedBrief as any;

    await db.update(enquirySessionsTable)
      .set({ briefReady: true, updatedAt: new Date() })
      .where(eq(enquirySessionsTable.id, session.id));

    if (!existingBrief) {
      const [savedBrief] = await db.insert(briefsTable).values({
        sessionId: session.id,
        userId: userId ?? null,
        designerSlug: designerSlug ?? null,
        status: "awaiting_confirmation",
        gender: b.gender ?? null,
        garmentType: b.garment_type ?? null,
        styleSummary: b.style_summary ?? null,
        occasion: b.occasion ?? null,
        aestheticDirection: b.aesthetic_direction ?? null,
        colorPalette: b.color_palette ?? [],
        fabricPreferences: b.fabric_preferences ?? null,
        silhouette: b.silhouette ?? null,
        budgetMin: b.budget_min ?? null,
        budgetMax: b.budget_max ?? null,
        timelineDays: b.timeline_days ?? null,
        specialNotes: b.special_notes ?? null,
        imagePrompts: b.image_prompts ?? [],
        confirmationAsked: true,
        updatedAt: new Date(),
      }).returning({ id: briefsTable.id });

      savedBriefId = savedBrief?.id ?? null;
      briefStatus = "awaiting_confirmation";

      if (userId && savedBrief) {
        void notifyBriefReady(userId, { id: savedBrief.id, styleSummary: b.style_summary ?? null, occasion: b.occasion ?? null });
        void createNotification({
          userId,
          type: "BRIEF_READY",
          title: "Your style brief is ready",
          body: b.style_summary ? b.style_summary.slice(0, 120) : "Your fashion brief has been recorded",
          link: "/client/orders",
          relatedId: savedBrief.id,
        });
      }
    } else {
      // Update existing brief with new data
      await db.update(briefsTable)
        .set({
          status: "awaiting_confirmation",
          gender: b.gender ?? existingBrief.gender,
          garmentType: b.garment_type ?? existingBrief.garmentType,
          styleSummary: b.style_summary ?? existingBrief.styleSummary,
          occasion: b.occasion ?? existingBrief.occasion,
          aestheticDirection: b.aesthetic_direction ?? existingBrief.aestheticDirection,
          colorPalette: b.color_palette ?? existingBrief.colorPalette,
          fabricPreferences: b.fabric_preferences ?? existingBrief.fabricPreferences,
          silhouette: b.silhouette ?? existingBrief.silhouette,
          budgetMin: b.budget_min ?? existingBrief.budgetMin,
          budgetMax: b.budget_max ?? existingBrief.budgetMax,
          timelineDays: b.timeline_days ?? existingBrief.timelineDays,
          specialNotes: b.special_notes ?? existingBrief.specialNotes,
          imagePrompts: b.image_prompts ?? existingBrief.imagePrompts,
          confirmationAsked: true,
          updatedAt: new Date(),
        })
        .where(eq(briefsTable.id, existingBrief.id));
      briefStatus = "awaiting_confirmation";
    }

    console.log("[ENQUIRY] brief saved as awaiting_confirmation", { sessionId: session.id, savedBriefId });
  } else if (hasAwaitingConfirmation && existingBrief) {
    // Revision acknowledged — flip back to awaiting_confirmation and log the revision
    await db.insert(briefRevisionsTable).values({
      briefId: existingBrief.id,
      changeText: message,
      source: "user",
    });

    await db.update(briefsTable)
      .set({ status: "awaiting_confirmation", confirmationAsked: true, updatedAt: new Date() })
      .where(eq(briefsTable.id, existingBrief.id));

    savedBriefId = existingBrief.id;
    briefStatus = "awaiting_confirmation";

    console.log("[ENQUIRY] revision recorded, back to awaiting_confirmation", { briefId: existingBrief.id, change: message.slice(0, 80) });
  }

  const awaitingConfirmation = briefStatus === "awaiting_confirmation";
  const briefReady = hasBriefReady || (existingBrief?.status === "awaiting_confirmation") || awaitingConfirmation;

  res.json({
    reply: cleanText,
    sessionId: session.id,
    briefReady,
    brief: (hasBriefReady && extractedBrief) ? extractedBrief : null,
    briefId: savedBriefId,
    briefStatus,
    awaitingConfirmation,
    generateImages,
  });
});

// ─── POST /ai/generate ────────────────────────────────────────────────────

router.post("/ai/generate", aiLimiter, optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, briefId } = req.body as { sessionId?: string; briefId?: string };
    const userId: string | undefined = (req as Request & { userId?: string }).userId;

    console.log("[AI GENERATE] start", { sessionId, briefId, userId });

    if (!sessionId && !briefId) {
      res.status(400).json({ success: false, message: "Either briefId or sessionId is required" });
      return;
    }

    const briefRows = briefId
      ? await db.select().from(briefsTable).where(eq(briefsTable.id, briefId)).limit(1)
      : await db.select().from(briefsTable).where(eq(briefsTable.sessionId, sessionId!)).limit(1);

    if (!briefRows || briefRows.length === 0) {
      console.log("[AI GENERATE] brief not found", { sessionId, briefId });
      res.status(404).json({ success: false, message: "No brief found. Complete the AI enquiry first." });
      return;
    }

    const brief = briefRows[0];
    const promptsToGenerate = Array.isArray(brief.imagePrompts) ? brief.imagePrompts.slice(0, 3) : [];

    if (promptsToGenerate.length === 0) {
      res.status(400).json({ success: false, message: "Brief has no image prompts. Please complete the enquiry." });
      return;
    }

    const useImageModel = isImageProviderReady();
    console.log("[AI GENERATE] provider ready:", useImageModel, "| prompts:", promptsToGenerate.length);

    const results: Array<{ id?: string; promptIndex: number; objectPath: string; prompt: string; mode: string; generatedAt: string }> = [];
    const errors: Array<{ promptIndex: number; prompt: string; mode: string; errorMessage: string }> = [];

    for (let i = 0; i < promptsToGenerate.length; i++) {
      const prompt = promptsToGenerate[i];
      console.log(`[AI GENERATE] generating ${i + 1}/${promptsToGenerate.length}`);

      let objectPath = "";
      let mode: "image" | "concept" = "concept";
      let concept = null;

      try {
        if (useImageModel) {
          objectPath = await generateImage(prompt);
          mode = "image";
        } else {
          concept = await generateConceptCard(prompt);
          mode = "concept";
        }

        const [saved] = await db.insert(lookbookImagesTable).values({
          briefId: brief.id,
          sessionId: brief.sessionId,
          userId: userId ?? null,
          objectPath,
          prompt,
          promptIndex: i,
          metadata: {
            mode,
            concept,
            provider: useImageModel ? "huggingface" : "text",
            model: useImageModel ? "black-forest-labs/FLUX.1-schnell" : "text-concept",
            generatedAt: new Date().toISOString(),
          },
        }).returning({ id: lookbookImagesTable.id });

        results.push({ id: saved?.id, promptIndex: i, objectPath, prompt, mode, generatedAt: new Date().toISOString() });
        console.log(`[AI GENERATE] saved prompt ${i}`);

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[AI GENERATE] failed prompt ${i}`, { errorMessage });
        errors.push({ promptIndex: i, prompt, mode: "error", errorMessage });

        try {
          await db.insert(lookbookImagesTable).values({
            briefId: brief.id,
            sessionId: brief.sessionId,
            userId: userId ?? null,
            objectPath: "",
            prompt,
            promptIndex: i,
            metadata: { mode: "error", errorMessage, generatedAt: new Date().toISOString() },
          });
        } catch { /* noop */ }
      }
    }

    console.log("[AI GENERATE] done", { results: results.length, errors: errors.length });
    res.json({ success: true, briefId: brief.id, sessionId: brief.sessionId, results, errors });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[AI GENERATE] fatal error", errorMessage);
    res.status(500).json({ success: false, message: "Failed to generate lookbook images", error: errorMessage });
  }
});

// ─── POST /ai/select-look ──────────────────────────────────────────────────

router.post("/ai/select-look", aiLimiter, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { briefId, sessionId, imageId, imageUrl, prompt, promptIndex } = req.body as {
    briefId?: string;
    sessionId?: string;
    imageId: string;
    imageUrl: string;
    prompt: string;
    promptIndex: number;
  };

  const userId: string | undefined = (req as Request & { userId?: string }).userId;

  if (!imageId || !imageUrl) {
    res.status(400).json({ error: "imageId and imageUrl are required" });
    return;
  }

  // Find the brief
  const briefRows = briefId
    ? await db.select().from(briefsTable).where(eq(briefsTable.id, briefId)).limit(1)
    : sessionId
    ? await db.select().from(briefsTable).where(eq(briefsTable.sessionId, sessionId)).limit(1)
    : [];

  if (!briefRows.length) {
    res.status(404).json({ error: "Brief not found" });
    return;
  }

  const brief = briefRows[0];

  // Verify ownership
  if (brief.userId && brief.userId !== userId) {
    res.status(403).json({ error: "Not authorised" });
    return;
  }

  await db.update(briefsTable)
    .set({
      selectedImageId: imageId,
      selectedImageUrl: imageUrl,
      selectedPrompt: prompt ?? null,
      selectedPromptIndex: promptIndex ?? null,
      selectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(briefsTable.id, brief.id));

  console.log("[SELECT-LOOK] image selected", { briefId: brief.id, imageId, promptIndex });

  res.json({ success: true, briefId: brief.id, selectedImageId: imageId });
});

// ─── POST /ai/brief/confirm ───────────────────────────────────────────────

router.post("/ai/brief/confirm", aiLimiter, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { briefId, sessionId, confirm } = req.body as {
    briefId?: string;
    sessionId?: string;
    confirm: boolean;
  };

  const userId: string | undefined = (req as Request & { userId?: string }).userId;

  if (typeof confirm !== "boolean") {
    res.status(400).json({ error: "confirm (boolean) is required" });
    return;
  }

  const briefRows = briefId
    ? await db.select().from(briefsTable).where(eq(briefsTable.id, briefId)).limit(1)
    : sessionId
    ? await db.select().from(briefsTable).where(eq(briefsTable.sessionId, sessionId)).limit(1)
    : [];

  if (!briefRows.length) {
    res.status(404).json({ error: "Brief not found" });
    return;
  }

  const brief = briefRows[0];

  if (brief.userId && brief.userId !== userId) {
    res.status(403).json({ error: "Not authorised" });
    return;
  }

  if (brief.status === "confirmed" || brief.status === "finalized") {
    res.json({ success: true, briefStatus: brief.status, reply: "Your brief is already confirmed." });
    return;
  }

  if (confirm) {
    // ── YES: finalize ────────────────────────────────────────────────────
    await db.update(briefsTable)
      .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
      .where(eq(briefsTable.id, brief.id));

    console.log("[BRIEF CONFIRM] confirmed", { briefId: brief.id });

    // Generate a final confirmation message via AI
    let confirmReply = "Your brief is confirmed and ready to be forwarded to your chosen designer. They'll be in touch to discuss the details and arrange a fitting.";
    try {
      const sessionHistory = await db
        .select({ role: enquiryMessagesTable.role, content: enquiryMessagesTable.content })
        .from(enquiryMessagesTable)
        .where(eq(enquiryMessagesTable.sessionId, brief.sessionId))
        .orderBy(asc(enquiryMessagesTable.createdAt))
        .limit(20);

      const confirmMessages: ChatMessage[] = [
        {
          role: "system",
          content: `You are Aria, the Drape fashion consultant. The client has just confirmed their brief. 
Write a warm, natural 2-3 sentence response celebrating their decision and letting them know what happens next — their brief is being sent to the designer. 
Mention the occasion or garment if relevant. Sound genuinely excited for them.`,
        },
        ...sessionHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: "[User clicked YES — brief confirmed]" },
      ];

      confirmReply = await complete(confirmMessages, { temperature: 0.8, maxTokens: 200 });
    } catch { /* use default reply */ }

    // Save the confirmation reply as an assistant message
    await db.insert(enquiryMessagesTable).values({
      sessionId: brief.sessionId,
      role: "assistant",
      content: confirmReply,
      imageUrls: [],
    });

    res.json({ success: true, briefStatus: "confirmed", reply: confirmReply });

  } else {
    // ── NO: revision requested ───────────────────────────────────────────
    await db.update(briefsTable)
      .set({ status: "revision_requested", updatedAt: new Date() })
      .where(eq(briefsTable.id, brief.id));

    console.log("[BRIEF CONFIRM] revision requested", { briefId: brief.id });

    // Generate a revision prompt via AI
    let revisionReply = "Of course! What would you like me to change before I finalise the brief?";
    try {
      const revisionMessages: ChatMessage[] = [
        {
          role: "system",
          content: `You are Aria, the Drape fashion consultant. The client declined to confirm their brief and wants to make a change.
Write one warm, natural sentence asking them what they'd like to adjust. Keep it brief and inviting.`,
        },
        { role: "user" as const, content: "[User clicked NO — wants to revise the brief]" },
      ];
      revisionReply = await complete(revisionMessages, { temperature: 0.8, maxTokens: 100 });
    } catch { /* use default reply */ }

    // Save the revision prompt as an assistant message
    await db.insert(enquiryMessagesTable).values({
      sessionId: brief.sessionId,
      role: "assistant",
      content: revisionReply,
      imageUrls: [],
    });

    res.json({ success: true, briefStatus: "revision_requested", reply: revisionReply });
  }
});

// ─── GET /ai/lookbook/:sessionId ──────────────────────────────────────────

router.get("/ai/lookbook/:sessionId", async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.params.sessionId as string;
  const brief = (await db.select().from(briefsTable).where(eq(briefsTable.sessionId, sessionId)))[0];
  if (!brief) { res.status(404).json({ error: "No brief found for this session" }); return; }
  const images = await db.select().from(lookbookImagesTable)
    .where(eq(lookbookImagesTable.sessionId, sessionId))
    .orderBy(asc(lookbookImagesTable.promptIndex));
  res.json({ brief, images });
});

// ─── GET /ai/sessions ─────────────────────────────────────────────────────

router.get("/ai/sessions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId?: string }).userId!;
  const { designerSlug } = req.query as { designerSlug?: string };

  const whereClause = designerSlug
    ? and(eq(enquirySessionsTable.userId, userId), eq(enquirySessionsTable.designerSlug, designerSlug))
    : eq(enquirySessionsTable.userId, userId);

  const sessions = await db.select().from(enquirySessionsTable)
    .where(whereClause)
    .orderBy(desc(enquirySessionsTable.updatedAt));

  const enriched = await Promise.all(
    sessions.map(async (s) => {
      const msgs = await db
        .select({ role: enquiryMessagesTable.role, content: enquiryMessagesTable.content, createdAt: enquiryMessagesTable.createdAt })
        .from(enquiryMessagesTable)
        .where(eq(enquiryMessagesTable.sessionId, s.id))
        .orderBy(asc(enquiryMessagesTable.createdAt));
      const lastMsg = msgs[msgs.length - 1] ?? null;
      return {
        ...s,
        messageCount: msgs.length,
        lastMessage: lastMsg ? { role: lastMsg.role, preview: lastMsg.content.slice(0, 80), createdAt: lastMsg.createdAt } : null,
      };
    })
  );

  res.json(enriched);
});

// ─── GET /ai/session/:sessionId/messages ─────────────────────────────────

router.get("/ai/session/:sessionId/messages", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as Request & { userId?: string }).userId!;
  const { sessionId } = req.params as { sessionId: string };

  const session = (await db.select().from(enquirySessionsTable).where(eq(enquirySessionsTable.id, sessionId)))[0];
  if (!session || session.userId !== userId) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const messages = await db.select().from(enquiryMessagesTable)
    .where(eq(enquiryMessagesTable.sessionId, sessionId))
    .orderBy(asc(enquiryMessagesTable.createdAt));

  const brief = (await db.select().from(briefsTable).where(eq(briefsTable.sessionId, sessionId)))[0] ?? null;

  res.json({ session, messages, brief });
});

// ─── POST /ai/lookbook ────────────────────────────────────────────────────

router.post("/ai/lookbook", aiLimiter, async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.body as { sessionId: string };
  if (!sessionId) { res.status(400).json({ error: "sessionId is required" }); return; }
  const brief = (await db.select().from(briefsTable).where(eq(briefsTable.sessionId, sessionId)))[0];
  if (!brief) { res.status(404).json({ error: "No brief found for this session" }); return; }
  const images = await db.select().from(lookbookImagesTable)
    .where(eq(lookbookImagesTable.sessionId, sessionId))
    .orderBy(asc(lookbookImagesTable.promptIndex));
  res.json({ brief, images });
});

// ─── POST /ai/brief/finalize ──────────────────────────────────────────────
// Generates a structured designer package and marks the brief as finalized.

router.post("/ai/brief/finalize", aiLimiter, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { briefId, sessionId } = req.body as { briefId?: string; sessionId?: string };
  const userId: string | undefined = (req as Request & { userId?: string }).userId;

  const briefRows = briefId
    ? await db.select().from(briefsTable).where(eq(briefsTable.id, briefId)).limit(1)
    : sessionId
    ? await db.select().from(briefsTable).where(eq(briefsTable.sessionId, sessionId)).limit(1)
    : [];

  if (!briefRows.length) { res.status(404).json({ error: "Brief not found" }); return; }
  const brief = briefRows[0];

  if (brief.userId && brief.userId !== userId) { res.status(403).json({ error: "Not authorised" }); return; }

  if (brief.status === "finalized" || brief.status === "forwarded") {
    res.json({ success: true, briefStatus: brief.status, designerPackage: brief.designerPackage });
    return;
  }

  // Build the designer package payload
  const designerPackage = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    client: { userId: brief.userId },
    brief: {
      occasion: brief.occasion,
      garmentType: brief.garmentType,
      styleSummary: brief.styleSummary,
      aestheticDirection: brief.aestheticDirection,
      colorPalette: brief.colorPalette,
      fabricPreferences: brief.fabricPreferences,
      silhouette: brief.silhouette,
      budgetMin: brief.budgetMin,
      budgetMax: brief.budgetMax,
      budgetCurrency: "NGN",
      timelineDays: brief.timelineDays,
      specialNotes: brief.specialNotes,
    },
    selectedConcept: brief.selectedImageUrl
      ? {
          imageUrl: brief.selectedImageUrl,
          prompt: brief.selectedPrompt,
          selectedAt: brief.selectedAt?.toISOString(),
        }
      : null,
    chatTranscriptUrl: `/api/ai/session/${brief.sessionId}/messages`,
    confirmedAt: brief.confirmedAt?.toISOString(),
  };

  await db.update(briefsTable)
    .set({ status: "finalized", finalizedAt: new Date(), designerPackage, updatedAt: new Date() })
    .where(eq(briefsTable.id, brief.id));

  console.log("[BRIEF FINALIZE] finalized", { briefId: brief.id });

  res.json({ success: true, briefStatus: "finalized", designerPackage });
});

// ─── POST /ai/brief/forward ──────────────────────────────────────────────
// Marks the brief as forwarded to the designer.

router.post("/ai/brief/forward", aiLimiter, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { briefId, sessionId } = req.body as { briefId?: string; sessionId?: string };
  const userId: string | undefined = (req as Request & { userId?: string }).userId;

  const briefRows = briefId
    ? await db.select().from(briefsTable).where(eq(briefsTable.id, briefId)).limit(1)
    : sessionId
    ? await db.select().from(briefsTable).where(eq(briefsTable.sessionId, sessionId)).limit(1)
    : [];

  if (!briefRows.length) { res.status(404).json({ error: "Brief not found" }); return; }
  const brief = briefRows[0];

  if (brief.userId && brief.userId !== userId) { res.status(403).json({ error: "Not authorised" }); return; }

  if (brief.status === "forwarded") {
    res.json({ success: true, briefStatus: "forwarded" });
    return;
  }

  // Finalize if not already
  let pkg = brief.designerPackage;
  if (brief.status !== "finalized" || !pkg) {
    pkg = {
      version: "1.0",
      generatedAt: new Date().toISOString(),
      client: { userId: brief.userId },
      brief: {
        occasion: brief.occasion, garmentType: brief.garmentType, styleSummary: brief.styleSummary,
        aestheticDirection: brief.aestheticDirection, colorPalette: brief.colorPalette,
        fabricPreferences: brief.fabricPreferences, silhouette: brief.silhouette,
        budgetMin: brief.budgetMin, budgetMax: brief.budgetMax, budgetCurrency: "NGN",
        timelineDays: brief.timelineDays, specialNotes: brief.specialNotes,
      },
      selectedConcept: brief.selectedImageUrl
        ? { imageUrl: brief.selectedImageUrl, prompt: brief.selectedPrompt, selectedAt: brief.selectedAt?.toISOString() }
        : null,
      chatTranscriptUrl: `/api/ai/session/${brief.sessionId}/messages`,
      confirmedAt: brief.confirmedAt?.toISOString(),
    };
  }

  const now = new Date();
  await db.update(briefsTable)
    .set({ status: "forwarded", forwardedAt: now, finalizedAt: brief.finalizedAt ?? now, designerPackage: pkg, updatedAt: now })
    .where(eq(briefsTable.id, brief.id));

  console.log("[BRIEF FORWARD] forwarded to designer", { briefId: brief.id, designerSlug: brief.designerSlug });

  res.json({ success: true, briefStatus: "forwarded", forwardedAt: now.toISOString() });
});

export default router;
