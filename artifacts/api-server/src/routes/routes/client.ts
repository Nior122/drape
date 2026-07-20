import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  profilesTable,
  clientPreferencesTable,
  producerProfilesTable,
  ordersTable,
  orderReviewsTable,
  orderMessagesTable,
  measurementsTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, desc, asc, count } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import { createNotification } from "../../lib/create-notification";

const router: IRouter = Router();

router.use("/client", requireAuth);

/* ------------------------------------------------------------------ */
/* ORDERS                                                               */
/* ------------------------------------------------------------------ */

router.get("/client/orders", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;

  const orders = await db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      title: ordersTable.title,
      description: ordersTable.description,
      agreedPrice: ordersTable.agreedPrice,
      currency: ordersTable.currency,
      depositPaid: ordersTable.depositPaid,
      dueDate: ordersTable.dueDate,
      estimatedDays: ordersTable.estimatedDays,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
      producerName: usersTable.name,
      producerStudioName: producerProfilesTable.studioName,
      producerId: ordersTable.producerId,
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.producerId, usersTable.id))
    .leftJoin(producerProfilesTable, eq(ordersTable.producerId, producerProfilesTable.userId))
    .where(eq(ordersTable.clientId, userId))
    .orderBy(desc(ordersTable.updatedAt));

  const reviewedIds = orders.length > 0
    ? (await db
        .select({ orderId: orderReviewsTable.orderId })
        .from(orderReviewsTable)
        .where(eq(orderReviewsTable.clientId, userId)))
        .map((r) => r.orderId)
    : [];

  const result = orders.map((o) => ({
    ...o,
    reviewed: reviewedIds.includes(o.id),
  }));

  res.json(result);
});

router.get("/client/orders/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const orderId = req.params.id as string;

  const [order] = await db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      title: ordersTable.title,
      description: ordersTable.description,
      agreedPrice: ordersTable.agreedPrice,
      currency: ordersTable.currency,
      depositPaid: ordersTable.depositPaid,
      dueDate: ordersTable.dueDate,
      estimatedDays: ordersTable.estimatedDays,
      notes: ordersTable.notes,
      timelineEvents: ordersTable.timelineEvents,
      briefId: ordersTable.briefId,
      sessionId: ordersTable.sessionId,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
      producerId: ordersTable.producerId,
      producerName: usersTable.name,
      producerStudioName: producerProfilesTable.studioName,
      producerInstagram: producerProfilesTable.instagram,
      producerWhatsapp: profilesTable.whatsapp,
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.producerId, usersTable.id))
    .leftJoin(producerProfilesTable, eq(ordersTable.producerId, producerProfilesTable.userId))
    .leftJoin(profilesTable, eq(ordersTable.producerId, profilesTable.userId))
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.clientId, userId)));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [review] = await db
    .select()
    .from(orderReviewsTable)
    .where(and(eq(orderReviewsTable.orderId, orderId), eq(orderReviewsTable.clientId, userId)));

  const messages = await db
    .select()
    .from(orderMessagesTable)
    .where(eq(orderMessagesTable.orderId, orderId))
    .orderBy(asc(orderMessagesTable.createdAt))
    .limit(50);

  await db
    .update(orderMessagesTable)
    .set({ readByClient: true })
    .where(and(eq(orderMessagesTable.orderId, orderId), eq(orderMessagesTable.readByClient, false)));

  res.json({ ...order, review: review ?? null, messages });
});

router.post("/client/orders/:id/review", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const orderId = req.params.id as string;
  const { rating, comment } = req.body as { rating: number; comment?: string };

  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "rating must be 1–5" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.clientId, userId)));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.status !== "DELIVERED" && order.status !== "COMPLETED") {
    res.status(400).json({ error: "Can only review delivered orders" });
    return;
  }

  const existing = await db
    .select()
    .from(orderReviewsTable)
    .where(and(eq(orderReviewsTable.orderId, orderId), eq(orderReviewsTable.clientId, userId)));

  if (existing.length > 0) {
    res.status(409).json({ error: "Already reviewed" });
    return;
  }

  const [review] = await db
    .insert(orderReviewsTable)
    .values({ orderId, clientId: userId, rating, comment })
    .returning();

  void createNotification({
    userId: order.producerId,
    type: "REVIEW_RECEIVED",
    title: "New review received",
    body: comment ? comment.slice(0, 120) : `${rating} star${rating !== 1 ? "s" : ""}`,
    link: `/producer/orders/${orderId}`,
    relatedId: orderId,
  });

  res.status(201).json(review);
});

/* ------------------------------------------------------------------ */
/* MESSAGES                                                             */
/* ------------------------------------------------------------------ */

router.get("/client/messages/:orderId", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const orderId = req.params.orderId as string;

  const [order] = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.clientId, userId)));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const messages = await db
    .select()
    .from(orderMessagesTable)
    .where(eq(orderMessagesTable.orderId, orderId))
    .orderBy(asc(orderMessagesTable.createdAt));

  await db
    .update(orderMessagesTable)
    .set({ readByClient: true })
    .where(and(eq(orderMessagesTable.orderId, orderId), eq(orderMessagesTable.readByClient, false)));

  res.json(messages);
});

router.post("/client/messages/:orderId", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const orderId = req.params.orderId as string;
  const { content } = req.body as { content: string };

  if (!content?.trim()) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const [order] = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.clientId, userId)));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [message] = await db
    .insert(orderMessagesTable)
    .values({ orderId, senderId: userId, senderRole: "CLIENT", content: content.trim(), readByClient: true })
    .returning();

  await db.insert(notificationsTable).values({
    userId: (await db.select({ producerId: ordersTable.producerId }).from(ordersTable).where(eq(ordersTable.id, orderId)))[0]?.producerId ?? "",
    type: "MESSAGE",
    title: "New message from client",
    body: content.slice(0, 120),
    relatedId: orderId,
    link: `/producer/orders/${orderId}`,
  });

  res.status(201).json(message);
});

/* ------------------------------------------------------------------ */
/* NOTIFICATIONS                                                        */
/* ------------------------------------------------------------------ */

router.get("/client/notifications", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  const unreadCount = notifications.filter((n) => !n.read).length;

  res.json({ notifications, unreadCount });
});

router.patch("/client/notifications/:id/read", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const notifId = req.params.id as string;

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.id, notifId), eq(notificationsTable.userId, userId)));

  res.json({ ok: true });
});

router.patch("/client/notifications/read-all", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;

  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.userId, userId));

  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* MEASUREMENTS                                                         */
/* ------------------------------------------------------------------ */

router.get("/client/measurements", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;

  const [measurements] = await db
    .select()
    .from(measurementsTable)
    .where(eq(measurementsTable.userId, userId));

  res.json(measurements ?? null);
});

router.put("/client/measurements", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { unit, data, notes } = req.body as {
    unit?: "cm" | "in";
    data?: Record<string, number | null>;
    notes?: string;
  };

  const existing = await db
    .select({ id: measurementsTable.id })
    .from(measurementsTable)
    .where(eq(measurementsTable.userId, userId));

  let savedMeasurements;
  if (existing.length > 0) {
    const [updated] = await db
      .update(measurementsTable)
      .set({ ...(unit && { unit }), ...(data && { data }), ...(notes !== undefined && { notes }) })
      .where(eq(measurementsTable.userId, userId))
      .returning();
    savedMeasurements = updated;
  } else {
    const [created] = await db
      .insert(measurementsTable)
      .values({ userId, unit: unit ?? "cm", data: data ?? {}, notes })
      .returning();
    savedMeasurements = created;
  }

  // Notify producers of any open orders that client measurements are ready
  db.select({ producerId: ordersTable.producerId })
    .from(ordersTable)
    .where(eq(ordersTable.clientId, userId))
    .then((rows) => {
      const seen = new Set<string>();
      for (const { producerId } of rows) {
        if (!seen.has(producerId)) {
          seen.add(producerId);
          void createNotification({
            userId: producerId,
            type: "MEASUREMENTS_SUBMITTED",
            title: "Client measurements updated",
            body: "A client has submitted or updated their body measurements",
            link: `/producer/clients`,
          });
        }
      }
    })
    .catch(() => {});

  res.json(savedMeasurements);
});

/* ------------------------------------------------------------------ */
/* STYLE PROFILE                                                        */
/* ------------------------------------------------------------------ */

router.get("/client/profile", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  const [prefs] = await db.select().from(clientPreferencesTable).where(eq(clientPreferencesTable.userId, userId));
  const [measurements] = await db.select().from(measurementsTable).where(eq(measurementsTable.userId, userId));

  res.json({
    id: userId,
    name: user?.name,
    email: user?.email,
    phone: profile?.phone,
    whatsapp: profile?.whatsapp,
    city: profile?.city,
    country: profile?.country,
    bio: profile?.bio,
    stylePreferences: prefs?.stylePreferences ?? [],
    budgetMin: prefs?.budgetMin,
    budgetMax: prefs?.budgetMax,
    styleNote: prefs?.styleNote,
    measurements: measurements ?? null,
  });
});

router.patch("/client/profile", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { name, phone, whatsapp, city, country, bio, stylePreferences, budgetMin, budgetMax, styleNote } = req.body;

  if (name) {
    await db.update(usersTable).set({ name }).where(eq(usersTable.id, userId));
  }

  const profileFields: Record<string, unknown> = {};
  if (phone !== undefined) profileFields.phone = phone;
  if (whatsapp !== undefined) profileFields.whatsapp = whatsapp;
  if (city !== undefined) profileFields.city = city;
  if (country !== undefined) profileFields.country = country;
  if (bio !== undefined) profileFields.bio = bio;

  if (Object.keys(profileFields).length > 0) {
    const existingProfile = await db.select({ id: profilesTable.id }).from(profilesTable).where(eq(profilesTable.userId, userId));
    if (existingProfile.length > 0) {
      await db.update(profilesTable).set(profileFields).where(eq(profilesTable.userId, userId));
    } else {
      await db.insert(profilesTable).values({ userId, ...profileFields });
    }
  }

  const prefFields: Record<string, unknown> = {};
  if (stylePreferences !== undefined) prefFields.stylePreferences = stylePreferences;
  if (budgetMin !== undefined) prefFields.budgetMin = budgetMin;
  if (budgetMax !== undefined) prefFields.budgetMax = budgetMax;
  if (styleNote !== undefined) prefFields.styleNote = styleNote;

  if (Object.keys(prefFields).length > 0) {
    const existingPrefs = await db.select({ id: clientPreferencesTable.id }).from(clientPreferencesTable).where(eq(clientPreferencesTable.userId, userId));
    if (existingPrefs.length > 0) {
      await db.update(clientPreferencesTable).set(prefFields).where(eq(clientPreferencesTable.userId, userId));
    } else {
      await db.insert(clientPreferencesTable).values({ userId, ...prefFields });
    }
  }

  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* DESIGNERS (BROWSE)                                                   */
/* ------------------------------------------------------------------ */

router.get("/client/designers", async (req: Request, res: Response): Promise<void> => {
  const designers = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      studioName: producerProfilesTable.studioName,
      studioType: producerProfilesTable.studioType,
      specialties: producerProfilesTable.specialties,
      bio: producerProfilesTable.bio,
      priceMin: producerProfilesTable.priceMin,
      priceMax: producerProfilesTable.priceMax,
      instagram: producerProfilesTable.instagram,
      portfolioUrls: producerProfilesTable.portfolioUrls,
      city: profilesTable.city,
      country: profilesTable.country,
      whatsapp: profilesTable.whatsapp,
    })
    .from(producerProfilesTable)
    .innerJoin(usersTable, eq(producerProfilesTable.userId, usersTable.id))
    .leftJoin(profilesTable, eq(producerProfilesTable.userId, profilesTable.userId))
    .orderBy(asc(producerProfilesTable.studioName));

  res.json(designers);
});

export default router;
