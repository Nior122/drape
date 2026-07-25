import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderMessagesTable,
  usersTable,
  profilesTable,
  producerProfilesTable,
  briefsTable,
  lookbookImagesTable,
  measurementsTable,
  portfolioItemsTable,
  aiConversationsTable,
} from "@workspace/db";
import { eq, and, desc, count, sum, countDistinct, inArray, gte, sql, ne, asc } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  notifyStatusUpdate,
  notifyOrderAccepted,
  notifyMeasurementReminder,
} from "../../lib/whatsapp";
import { createNotification } from "../../lib/create-notification";

const router: IRouter = Router();

router.use(requireAuth);

// Allow both DESIGNER and PRODUCER roles for all routes in this router
const VALID_ROLES = ["DESIGNER", "PRODUCER"] as const;

async function requireDesignerOrProducer(req: Request, res: Response): Promise<string | null> {
  const userId = req.userId!;
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user || !VALID_ROLES.includes(user.role as typeof VALID_ROLES[number])) {
    res.status(403).json({ error: "Designer or Producer access required" });
    return null;
  }
  return userId;
}

const ACTIVE_STATUSES = ["ENQUIRY", "ACCEPTED", "DEPOSIT_PAID", "IN_PRODUCTION", "FITTING", "FINAL_PAYMENT"] as const;
const DONE_STATUSES = ["DELIVERED", "COMPLETED"] as const;

// ─── Dashboard ────────────────────────────────────────────────────────────

router.get("/producer/dashboard", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [activeResult] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(and(eq(ordersTable.producerId, userId), inArray(ordersTable.status, [...ACTIVE_STATUSES])));

  const [revenueResult] = await db
    .select({ total: sum(ordersTable.agreedPrice) })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.producerId, userId),
        inArray(ordersTable.status, [...DONE_STATUSES]),
        gte(ordersTable.createdAt, startOfMonth),
      ),
    );

  const [clientResult] = await db
    .select({ count: countDistinct(ordersTable.clientId) })
    .from(ordersTable)
    .where(eq(ordersTable.producerId, userId));

  const [unreadResult] = await db
    .select({ count: count() })
    .from(orderMessagesTable)
    .innerJoin(ordersTable, eq(orderMessagesTable.orderId, ordersTable.id))
    .where(
      and(
        eq(ordersTable.producerId, userId),
        eq(orderMessagesTable.readByProducer, false),
        ne(orderMessagesTable.senderId, userId),
      ),
    );

  const recentOrders = await db
    .select({
      id: ordersTable.id,
      title: ordersTable.title,
      status: ordersTable.status,
      agreedPrice: ordersTable.agreedPrice,
      currency: ordersTable.currency,
      dueDate: ordersTable.dueDate,
      createdAt: ordersTable.createdAt,
      clientName: usersTable.name,
      clientId: ordersTable.clientId,
    })
    .from(ordersTable)
    .innerJoin(usersTable, eq(ordersTable.clientId, usersTable.id))
    .where(eq(ordersTable.producerId, userId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(8);

  const [portfolioCount] = await db
    .select({ count: count() })
    .from(portfolioItemsTable)
    .where(eq(portfolioItemsTable.designerId, userId));

  res.json({
    activeOrders: activeResult.count,
    revenueThisMonth: Number(revenueResult.total ?? 0),
    totalClients: clientResult.count,
    unreadMessages: unreadResult.count,
    portfolioItems: portfolioCount.count,
    recentOrders,
  });
});

// ─── Orders ───────────────────────────────────────────────────────────────

router.get("/producer/orders", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const { status } = req.query as { status?: string };

  const conditions = [eq(ordersTable.producerId, userId)];
  if (status && status !== "ALL") {
    conditions.push(eq(ordersTable.status, status as typeof ordersTable.status._.data));
  }

  const orders = await db
    .select({
      id: ordersTable.id,
      title: ordersTable.title,
      status: ordersTable.status,
      agreedPrice: ordersTable.agreedPrice,
      currency: ordersTable.currency,
      depositPaid: ordersTable.depositPaid,
      dueDate: ordersTable.dueDate,
      estimatedDays: ordersTable.estimatedDays,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
      productionGuideAt: ordersTable.productionGuideAt,
      clientId: ordersTable.clientId,
      clientName: usersTable.name,
      clientEmail: usersTable.email,
    })
    .from(ordersTable)
    .innerJoin(usersTable, eq(ordersTable.clientId, usersTable.id))
    .where(and(...conditions))
    .orderBy(desc(ordersTable.updatedAt));

  res.json(orders);
});

// ─── Order Detail ─────────────────────────────────────────────────────────

router.get("/producer/orders/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const { id } = req.params as Record<string, string>;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.producerId, userId)));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [client] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: profilesTable.phone,
      whatsapp: profilesTable.whatsapp,
      city: profilesTable.city,
      country: profilesTable.country,
    })
    .from(usersTable)
    .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
    .where(eq(usersTable.id, order.clientId));

  const [measurements] = await db
    .select()
    .from(measurementsTable)
    .where(eq(measurementsTable.userId, order.clientId));

  const [brief] = order.briefId
    ? await db.select().from(briefsTable).where(eq(briefsTable.id, order.briefId))
    : order.sessionId
      ? await db.select().from(briefsTable).where(eq(briefsTable.sessionId, order.sessionId))
      : [null];

  const lookbookImages = order.sessionId
    ? await db
        .select()
        .from(lookbookImagesTable)
        .where(eq(lookbookImagesTable.sessionId, order.sessionId))
        .orderBy(lookbookImagesTable.promptIndex)
    : [];

  const messages = await db
    .select({
      id: orderMessagesTable.id,
      orderId: orderMessagesTable.orderId,
      senderId: orderMessagesTable.senderId,
      senderRole: orderMessagesTable.senderRole,
      content: orderMessagesTable.content,
      readByClient: orderMessagesTable.readByClient,
      readByProducer: orderMessagesTable.readByProducer,
      createdAt: orderMessagesTable.createdAt,
    })
    .from(orderMessagesTable)
    .where(eq(orderMessagesTable.orderId, id))
    .orderBy(asc(orderMessagesTable.createdAt));

  res.json({ order, client, brief, lookbookImages, measurements, messages });
});

// ─── Clients ──────────────────────────────────────────────────────────────

router.get("/producer/clients", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const clients = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: profilesTable.phone,
      city: profilesTable.city,
      country: profilesTable.country,
      orderCount: count(ordersTable.id),
      lastActivity: sql<string>`MAX(${ordersTable.updatedAt})`,
    })
    .from(usersTable)
    .innerJoin(ordersTable, eq(ordersTable.clientId, usersTable.id))
    .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
    .where(eq(ordersTable.producerId, userId))
    .groupBy(usersTable.id, profilesTable.id)
    .orderBy(desc(sql`MAX(${ordersTable.updatedAt})`));

  res.json(clients);
});

// ─── Orders Status Update ─────────────────────────────────────────────────

router.patch("/producer/orders/:id/status", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const { id } = req.params as Record<string, string>;
  const { status } = req.body as { status: string };

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.producerId, userId)));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  await db.update(ordersTable).set({ status: status as any, updatedAt: new Date() }).where(eq(ordersTable.id, id));

  // Notify client
  notifyStatusUpdate(order.clientId, order.title, status, id);
  createNotification(order.clientId, {
    type: "STATUS_UPDATED",
    title: "Order status updated",
    body: `"${order.title}" is now ${status.replace("_", " ").toLowerCase()}.`,
    link: `/client/orders/${id}`,
  });

  res.json({ success: true });
});

// ─── Storefront ───────────────────────────────────────────────────────────

router.get("/producer/storefront", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const [profile] = await db
    .select()
    .from(producerProfilesTable)
    .where(eq(producerProfilesTable.userId, userId));

  const [user] = await db
    .select({
      name: usersTable.name,
      email: usersTable.email,
      phone: profilesTable.phone,
      city: profilesTable.city,
      country: profilesTable.country,
    })
    .from(usersTable)
    .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id))
    .where(eq(usersTable.id, userId));

  res.json({ profile, user });
});

router.put("/producer/storefront", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const { studioName, studioType, specialties, bio, priceMin, priceMax, instagram, portfolioUrls } = req.body;

  const update: Record<string, unknown> = {};
  if (studioName !== undefined) update.studioName = studioName;
  if (studioType !== undefined) update.studioType = studioType;
  if (specialties !== undefined) update.specialties = specialties;
  if (bio !== undefined) update.bio = bio;
  if (priceMin !== undefined) update.priceMin = priceMin;
  if (priceMax !== undefined) update.priceMax = priceMax;
  if (instagram !== undefined) update.instagram = instagram;
  if (portfolioUrls !== undefined) update.portfolioUrls = portfolioUrls;

  if (Object.keys(update).length > 0) {
    await db.update(producerProfilesTable).set(update).where(eq(producerProfilesTable.userId, userId));
  }

  const [profile] = await db.select().from(producerProfilesTable).where(eq(producerProfilesTable.userId, userId));
  res.json({ profile });
});

// ─── Analytics ────────────────────────────────────────────────────────────

router.get("/producer/analytics", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const revenueByMonth = await db.execute(
    sql`
      SELECT
        to_char(${ordersTable.createdAt}, 'YYYY-MM') AS month,
        COALESCE(SUM(${ordersTable.agreedPrice}), 0) AS revenue,
        COUNT(*)::int AS order_count
      FROM ${ordersTable}
      WHERE ${ordersTable.producerId} = ${userId}
        AND ${ordersTable.status} IN (${sql.join(DONE_STATUSES.map(s => sql`${s}`), sql`, `)})
      GROUP BY month
      ORDER BY month ASC
    `,
  );

  const ordersByStatus = await db.execute(
    sql`
      SELECT ${ordersTable.status} AS status, COUNT(*)::int AS count
      FROM ${ordersTable}
      WHERE ${ordersTable.producerId} = ${userId}
      GROUP BY ${ordersTable.status}
    `,
  );

  const topClients = await db.execute(
    sql`
      SELECT
        ${usersTable.id} AS client_id,
        ${usersTable.name} AS client_name,
        COALESCE(SUM(${ordersTable.agreedPrice}), 0) AS total_spend,
        COUNT(*)::int AS order_count
      FROM ${ordersTable}
      INNER JOIN ${usersTable} ON ${ordersTable.clientId} = ${usersTable.id}
      WHERE ${ordersTable.producerId} = ${userId}
        AND ${ordersTable.status} IN (${sql.join(DONE_STATUSES.map(s => sql`${s}`), sql`, `)})
      GROUP BY ${usersTable.id}, ${usersTable.name}
      ORDER BY total_spend DESC
      LIMIT 10
    `,
  );

  const [totals] = await db
    .select({
      totalRevenue: sum(ordersTable.agreedPrice),
      activeOrders: count(),
    })
    .from(ordersTable)
    .where(and(eq(ordersTable.producerId, userId), inArray(ordersTable.status, [...DONE_STATUSES])));

  const [activeCount] = await db
    .select({ count: count() })
    .from(ordersTable)
    .where(and(eq(ordersTable.producerId, userId), inArray(ordersTable.status, [...ACTIVE_STATUSES])));

  res.json({
    revenueByMonth: revenueByMonth.rows,
    ordersByStatus: ordersByStatus.rows,
    topClients: topClients.rows,
    stats: {
      totalRevenue: Number(totals?.totalRevenue ?? 0),
      completedOrders: totals?.activeOrders ?? 0,
      activeOrders: activeCount?.count ?? 0,
    },
  });
});

// ─── Designer Profile ─────────────────────────────────────────────────────

router.get("/designer/profile", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const [profile] = await db
    .select()
    .from(producerProfilesTable)
    .where(eq(producerProfilesTable.userId, userId));

  const [user] = await db
    .select({
      name: usersTable.name,
      email: usersTable.email,
      avatar: usersTable.avatar,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  const portfolioCount = await db
    .select({ count: count() })
    .from(portfolioItemsTable)
    .where(eq(portfolioItemsTable.designerId, userId));

  res.json({ profile, user, portfolioItemCount: portfolioCount[0]?.count ?? 0 });
});

router.patch("/designer/profile", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const {
    brandName, professionalName, bio, location, specialization,
    specialties, studioName, studioType, experience, portfolioDescription,
    portfolioUrls, priceMin, priceMax, website, instagram, socialLinks, availability,
  } = req.body;

  const update: Record<string, unknown> = {};
  if (brandName !== undefined) update.brandName = brandName;
  if (professionalName !== undefined) update.professionalName = professionalName;
  if (bio !== undefined) update.bio = bio;
  if (location !== undefined) update.location = location;
  if (specialization !== undefined) update.specialization = specialization;
  if (specialties !== undefined) update.specialties = specialties;
  if (studioName !== undefined) update.studioName = studioName;
  if (studioType !== undefined) update.studioType = studioType;
  if (experience !== undefined) update.experience = experience;
  if (portfolioDescription !== undefined) update.portfolioDescription = portfolioDescription;
  if (portfolioUrls !== undefined) update.portfolioUrls = portfolioUrls;
  if (priceMin !== undefined) update.priceMin = priceMin;
  if (priceMax !== undefined) update.priceMax = priceMax;
  if (website !== undefined) update.website = website;
  if (instagram !== undefined) update.instagram = instagram;
  if (socialLinks !== undefined) update.socialLinks = socialLinks;
  if (availability !== undefined) update.availability = availability;

  if (Object.keys(update).length > 0) {
    await db.update(producerProfilesTable).set(update).where(eq(producerProfilesTable.userId, userId));
  }

  const [profile] = await db.select().from(producerProfilesTable).where(eq(producerProfilesTable.userId, userId));
  res.json({ profile });
});

// ─── Portfolio (CRUD) ─────────────────────────────────────────────────────

router.get("/designer/portfolio", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const items = await db
    .select()
    .from(portfolioItemsTable)
    .where(eq(portfolioItemsTable.designerId, userId))
    .orderBy(desc(portfolioItemsTable.createdAt));

  res.json(items);
});

router.post("/designer/portfolio", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const { title, description, imageUrls, category, tags } = req.body;
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const [item] = await db.insert(portfolioItemsTable).values({
    designerId: userId,
    title,
    description: description ?? null,
    imageUrls: imageUrls ?? [],
    category: category ?? null,
    tags: tags ?? [],
  }).returning();

  res.status(201).json(item);
});

router.delete("/designer/portfolio/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const { id } = req.params as Record<string, string>;

  const [item] = await db
    .select()
    .from(portfolioItemsTable)
    .where(and(eq(portfolioItemsTable.id, id), eq(portfolioItemsTable.designerId, userId)));

  if (!item) {
    res.status(404).json({ error: "Portfolio item not found" });
    return;
  }

  await db.delete(portfolioItemsTable).where(eq(portfolioItemsTable.id, id));
  res.json({ success: true });
});

// ─── AI Studio (Conversations) ────────────────────────────────────────────

router.get("/designer/ai-studio/conversations", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const conversations = await db
    .select()
    .from(aiConversationsTable)
    .where(eq(aiConversationsTable.designerId, userId))
    .orderBy(desc(aiConversationsTable.updatedAt));

  res.json(conversations);
});

router.post("/designer/ai-studio/conversations", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const { title } = req.body;
  const [conversation] = await db.insert(aiConversationsTable).values({
    designerId: userId,
    title: title ?? "New Design Session",
    messages: [],
  }).returning();

  res.status(201).json(conversation);
});

router.get("/designer/ai-studio/conversations/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const { id } = req.params as Record<string, string>;

  const [conversation] = await db
    .select()
    .from(aiConversationsTable)
    .where(and(eq(aiConversationsTable.id, id), eq(aiConversationsTable.designerId, userId)));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.json(conversation);
});

router.post("/designer/ai-studio/conversations/:id/messages", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const { id } = req.params as Record<string, string>;
  const { role, content } = req.body as { role: "user" | "assistant"; content: string };

  if (!role || !content) {
    res.status(400).json({ error: "role and content are required" });
    return;
  }

  const [conversation] = await db
    .select()
    .from(aiConversationsTable)
    .where(and(eq(aiConversationsTable.id, id), eq(aiConversationsTable.designerId, userId)));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const updatedMessages = [
    ...(conversation.messages as Array<{ role: string; content: string; createdAt: string }>),
    { role, content, createdAt: new Date().toISOString() },
  ];

  await db.update(aiConversationsTable)
    .set({ messages: updatedMessages, updatedAt: new Date() })
    .where(eq(aiConversationsTable.id, id));

  res.json({ success: true, messages: updatedMessages });
});

router.delete("/designer/ai-studio/conversations/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const { id } = req.params as Record<string, string>;

  const [conversation] = await db
    .select()
    .from(aiConversationsTable)
    .where(and(eq(aiConversationsTable.id, id), eq(aiConversationsTable.designerId, userId)));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.delete(aiConversationsTable).where(eq(aiConversationsTable.id, id));
  res.json({ success: true });
});

// ─── Messages ─────────────────────────────────────────────────────────────

router.get("/designer/messages", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const messages = await db
    .select({
      id: orderMessagesTable.id,
      orderId: orderMessagesTable.orderId,
      senderId: orderMessagesTable.senderId,
      content: orderMessagesTable.content,
      readByProducer: orderMessagesTable.readByProducer,
      createdAt: orderMessagesTable.createdAt,
      orderTitle: ordersTable.title,
      clientName: usersTable.name,
    })
    .from(orderMessagesTable)
    .innerJoin(ordersTable, eq(orderMessagesTable.orderId, ordersTable.id))
    .innerJoin(usersTable, eq(ordersTable.clientId, usersTable.id))
    .where(eq(ordersTable.producerId, userId))
    .orderBy(desc(orderMessagesTable.createdAt));

  // Deduplicate: keep only the latest message per order
  const seen = new Set<string>();
  const deduped = messages.filter((m) => {
    if (seen.has(m.orderId)) return false;
    seen.add(m.orderId);
    return true;
  });

  res.json(deduped);
});


// ─── AI Studio Prompt ──────────────────────────────────────────────────────

router.post("/designer/ai-studio/prompt", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireDesignerOrProducer(req, res);
  if (!userId) return;

  const { prompt } = req.body as { prompt: string };
  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  try {
    const systemMsg = "You are Aria, an expert fashion designer AI assistant. Help fashion designers with design concepts, fabric suggestions, styling ideas, and production advice. Be concise and practical.";
    const reply = await aiComplete([
      { role: "system", content: systemMsg } as ChatMessage,
      { role: "user", content: prompt } as ChatMessage,
    ], { temperature: 0.8, maxTokens: 1024 });
    res.json({ reply });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI provider error";
    console.error("[AI STUDIO] prompt failed", { error: msg });
    res.status(502).json({ error: "AI temporarily unavailable", reply: "I apologize, but I'm having trouble processing your request right now. Please try again." });
  }
});

export default router;
