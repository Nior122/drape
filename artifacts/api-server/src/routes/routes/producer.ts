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
} from "@workspace/db";
import { eq, and, desc, count, sum, countDistinct, inArray, gte, sql, ne } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  notifyStatusUpdate,
  notifyOrderAccepted,
  notifyMeasurementReminder,
} from "../../lib/whatsapp";
import { createNotification } from "../../lib/create-notification";

const router: IRouter = Router();

router.use("/producer", requireAuth);

async function requireProducer(req: Request, res: Response): Promise<string | null> {
  const userId = req.userId!;
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user || user.role !== "PRODUCER") {
    res.status(403).json({ error: "Producer access required" });
    return null;
  }
  return userId;
}

const ACTIVE_STATUSES = ["ENQUIRY", "ACCEPTED", "DEPOSIT_PAID", "IN_PRODUCTION", "FITTING", "FINAL_PAYMENT"] as const;
const DONE_STATUSES = ["DELIVERED", "COMPLETED"] as const;

router.get("/producer/dashboard", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireProducer(req, res);
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

  res.json({
    activeOrders: activeResult.count,
    revenueThisMonth: Number(revenueResult.total ?? 0),
    totalClients: clientResult.count,
    unreadMessages: unreadResult.count,
    recentOrders,
  });
});

router.get("/producer/orders", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireProducer(req, res);
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

router.get("/producer/orders/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireProducer(req, res);
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
      senderName: usersTable.name,
    })
    .from(orderMessagesTable)
    .innerJoin(usersTable, eq(orderMessagesTable.senderId, usersTable.id))
    .where(eq(orderMessagesTable.orderId, id))
    .orderBy(orderMessagesTable.createdAt);

  await db
    .update(orderMessagesTable)
    .set({ readByProducer: true })
    .where(and(eq(orderMessagesTable.orderId, id), eq(orderMessagesTable.readByProducer, false)));

  res.json({ ...order, client, measurements: measurements ?? null, brief: brief ?? null, lookbookImages, messages });
});

router.patch("/producer/orders/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireProducer(req, res);
  if (!userId) return;

  const { id } = req.params as Record<string, string>;
  const { status, notes, timelineEvents, agreedPrice, depositPaid, estimatedDays, dueDate } =
    req.body as {
      status?: typeof ordersTable.status._.data;
      notes?: string;
      timelineEvents?: Array<{ date: string; label: string; completed: boolean; note?: string }>;
      agreedPrice?: number;
      depositPaid?: boolean;
      estimatedDays?: number;
      dueDate?: string;
    };

  const [order] = await db
    .select({
      id: ordersTable.id,
      clientId: ordersTable.clientId,
      title: ordersTable.title,
      prevStatus: ordersTable.status,
    })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.producerId, userId)));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const updates: Partial<typeof ordersTable.$inferInsert> = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (timelineEvents !== undefined) updates.timelineEvents = timelineEvents;
  if (agreedPrice !== undefined) updates.agreedPrice = agreedPrice;
  if (depositPaid !== undefined) updates.depositPaid = depositPaid;
  if (estimatedDays !== undefined) updates.estimatedDays = estimatedDays;
  if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;

  const [updated] = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, id)).returning();

  if (status !== undefined) {
    const orderCtx = { id: order.id, title: order.title, status, producerId: userId };
    void notifyStatusUpdate(order.clientId, orderCtx);

    const statusLabel: Record<string, string> = {
      ACCEPTED: "accepted", IN_PROGRESS: "in progress", DELIVERED: "delivered",
      COMPLETED: "completed", CANCELLED: "cancelled",
    };
    void createNotification({
      userId: order.clientId,
      type: "STATUS_UPDATED",
      title: `Order ${statusLabel[status] ?? "updated"}`,
      body: `"${order.title}" has been updated`,
      link: `/client/orders/${order.id}`,
      relatedId: order.id,
    });

    if (status === "ACCEPTED") {
      void notifyOrderAccepted(userId, orderCtx);
      void createNotification({
        userId: order.clientId,
        type: "ORDER_ACCEPTED",
        title: "Your order has been accepted!",
        body: `"${order.title}" is confirmed — your tailor is ready to begin`,
        link: `/client/orders/${order.id}`,
        relatedId: order.id,
      });
      db.select({ id: measurementsTable.id })
        .from(measurementsTable)
        .where(eq(measurementsTable.userId, order.clientId))
        .then(([m]) => { if (!m) void notifyMeasurementReminder(order.clientId, orderCtx); })
        .catch(() => {});
    }
  }

  res.json(updated);
});

router.post("/producer/orders/:id/messages", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireProducer(req, res);
  if (!userId) return;

  const { id } = req.params as Record<string, string>;
  const { content } = req.body as { content: string };

  if (!content?.trim()) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const [order] = await db
    .select({ id: ordersTable.id, clientId: ordersTable.clientId, title: ordersTable.title })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, id), eq(ordersTable.producerId, userId)));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [message] = await db
    .insert(orderMessagesTable)
    .values({ orderId: id, senderId: userId, senderRole: "producer", content, readByProducer: true })
    .returning();

  void createNotification({
    userId: order.clientId,
    type: "MESSAGE",
    title: "New message from your studio",
    body: content.slice(0, 120),
    link: `/client/orders/${id}`,
    relatedId: id,
  });

  res.status(201).json(message);
});

router.get("/producer/clients", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireProducer(req, res);
  if (!userId) return;

  const rows = await db
    .select({
      clientId: ordersTable.clientId,
      clientName: usersTable.name,
      clientEmail: usersTable.email,
      clientCity: profilesTable.city,
      clientCountry: profilesTable.country,
      orderCount: count(ordersTable.id),
      totalSpend: sum(ordersTable.agreedPrice),
      lastOrderAt: sql<string>`max(${ordersTable.createdAt})`,
    })
    .from(ordersTable)
    .innerJoin(usersTable, eq(ordersTable.clientId, usersTable.id))
    .leftJoin(profilesTable, eq(profilesTable.userId, ordersTable.clientId))
    .where(eq(ordersTable.producerId, userId))
    .groupBy(ordersTable.clientId, usersTable.name, usersTable.email, profilesTable.city, profilesTable.country)
    .orderBy(desc(sql`max(${ordersTable.createdAt})`));

  const clientIds = rows.map((r) => r.clientId);
  const measurementRows =
    clientIds.length > 0
      ? await db
          .select({ userId: measurementsTable.userId, unit: measurementsTable.unit, data: measurementsTable.data })
          .from(measurementsTable)
          .where(inArray(measurementsTable.userId, clientIds))
      : [];

  const measMap = new Map(measurementRows.map((m) => [m.userId, m]));

  const clients = rows.map((r) => ({
    ...r,
    totalSpend: Number(r.totalSpend ?? 0),
    measurements: measMap.get(r.clientId) ?? null,
  }));

  res.json(clients);
});

router.get("/producer/storefront", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireProducer(req, res);
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

  res.json({ profile: profile ?? null, user: user ?? null });
});

router.patch("/producer/storefront", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireProducer(req, res);
  if (!userId) return;

  const { studioName, studioType, specialties, bio, priceMin, priceMax, instagram, portfolioUrls } =
    req.body as Partial<{
      studioName: string;
      studioType: "SOLO" | "STUDIO";
      specialties: string[];
      bio: string;
      priceMin: number;
      priceMax: number;
      instagram: string;
      portfolioUrls: string[];
    }>;

  const [existing] = await db
    .select({ id: producerProfilesTable.id })
    .from(producerProfilesTable)
    .where(eq(producerProfilesTable.userId, userId));

  const data = {
    ...(studioName !== undefined && { studioName }),
    ...(studioType !== undefined && { studioType }),
    ...(specialties !== undefined && { specialties }),
    ...(bio !== undefined && { bio }),
    ...(priceMin !== undefined && { priceMin }),
    ...(priceMax !== undefined && { priceMax }),
    ...(instagram !== undefined && { instagram }),
    ...(portfolioUrls !== undefined && { portfolioUrls }),
  };

  let profile;
  if (existing) {
    [profile] = await db
      .update(producerProfilesTable)
      .set(data)
      .where(eq(producerProfilesTable.userId, userId))
      .returning();
  } else {
    [profile] = await db
      .insert(producerProfilesTable)
      .values({ userId, ...data })
      .returning();
  }

  res.json(profile);
});

router.get("/producer/analytics", async (req: Request, res: Response): Promise<void> => {
  const userId = await requireProducer(req, res);
  if (!userId) return;

  const revenueByMonth = await db.execute(sql`
    SELECT
      to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
      COALESCE(SUM(agreed_price), 0)::integer AS revenue,
      COUNT(*)::integer AS order_count
    FROM orders
    WHERE producer_id = ${userId}
      AND status IN ('DELIVERED', 'COMPLETED')
      AND created_at >= NOW() - INTERVAL '6 months'
    GROUP BY month
    ORDER BY month ASC
  `);

  const ordersByStatus = await db.execute(sql`
    SELECT status, COUNT(*)::integer AS count
    FROM orders
    WHERE producer_id = ${userId}
    GROUP BY status
    ORDER BY count DESC
  `);

  const topClients = await db.execute(sql`
    SELECT
      u.id AS client_id,
      u.name AS client_name,
      COALESCE(SUM(o.agreed_price), 0)::integer AS total_spend,
      COUNT(o.id)::integer AS order_count
    FROM orders o
    JOIN users u ON o.client_id = u.id
    WHERE o.producer_id = ${userId}
    GROUP BY u.id, u.name
    ORDER BY total_spend DESC
    LIMIT 5
  `);

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

export default router;
