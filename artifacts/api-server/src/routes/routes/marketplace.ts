import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable, producerProfilesTable, profilesTable, portfolioItemsTable,
  reviewsTable, bookingsTable, designerAvailabilityTable,
  savedDesignersTable, savedPortfoliosTable, collectionsTable, collectionItemsTable,
  profileViewsTable, marketplaceClicksTable, searchLogsTable,
} from "@workspace/db";
import { eq, and, or, like, desc, asc, sql, count, inArray, gte, lte, ne } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import { optionalAuth } from "../../middlewares/optionalAuth";
import { v4 as uuidv4 } from "uuid";

const router: IRouter = Router();

/* ── Helpers ────────────────────────────────────────────────────────────── */

const PUBLIC_SELECT = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  avatar: usersTable.avatar,
  role: usersTable.role,
  createdAt: usersTable.createdAt,
};

const PROFILE_SELECT = {
  brandName: producerProfilesTable.brandName,
  professionalName: producerProfilesTable.professionalName,
  bio: producerProfilesTable.bio,
  location: producerProfilesTable.location,
  specialization: producerProfilesTable.specialization,
  specialties: producerProfilesTable.specialties,
  studioName: producerProfilesTable.studioName,
  studioType: producerProfilesTable.studioType,
  experience: producerProfilesTable.experience,
  portfolioDescription: producerProfilesTable.portfolioDescription,
  portfolioUrls: producerProfilesTable.portfolioUrls,
  priceMin: producerProfilesTable.priceMin,
  priceMax: producerProfilesTable.priceMax,
  website: producerProfilesTable.website,
  instagram: producerProfilesTable.instagram,
  socialLinks: producerProfilesTable.socialLinks,
  availability: producerProfilesTable.availability,
};

/* ════════════════════════════════════════════════════════════════════
   MODULE 1 — PUBLIC MARKETPLACE: Search & List Designers
   ════════════════════════════════════════════════════════════════════ */

router.get("/marketplace/designers", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const {
    search, specialty, style, garmentType, location, city,
    budgetMin, budgetMax, language, minRating, maxPrice,
    experienceMin, experienceMax, sort = "newest",
    page = "1", limit = "12",
  } = req.query as Record<string, string | undefined>;

  const conditions = [
    sql`${usersTable.role} IN ('DESIGNER', 'PRODUCER')`,
  ];

  if (search) {
    conditions.push(sql`(
      ${usersTable.name} ILIKE ${`%${search}%`} OR
      ${producerProfilesTable.bio} ILIKE ${`%${search}%`} OR
      ${producerProfilesTable.specialization} ILIKE ${`%${search}%`} OR
      ${producerProfilesTable.brandName} ILIKE ${`%${search}%`}
    )`);
  }
  if (specialty) conditions.push(sql`${sql`${producerProfilesTable.specialties}::text`} ILIKE ${`%${specialty}%`}`);
  if (style) conditions.push(sql`${sql`${producerProfilesTable.specialties}::text`} ILIKE ${`%${style}%`}`);
  if (garmentType) conditions.push(sql`${sql`${producerProfilesTable.specialties}::text`} ILIKE ${`%${garmentType}%`}`);
  if (location) conditions.push(sql`${producerProfilesTable.location} ILIKE ${`%${location}%`}`);
  if (city) conditions.push(sql`${producerProfilesTable.location} ILIKE ${`%${city}%`}`);
  if (budgetMin) conditions.push(gte(producerProfilesTable.priceMin, Number(budgetMin)));
  if (budgetMax || maxPrice) conditions.push(lte(producerProfilesTable.priceMax, Number(budgetMax ?? maxPrice)));
  if (experienceMin) conditions.push(gte(producerProfilesTable.experience, Number(experienceMin)));
  if (experienceMax) conditions.push(lte(producerProfilesTable.experience, Number(experienceMax)));

  let orderBy;
  switch (sort) {
    case "rating": orderBy = desc(sql`(SELECT AVG(rating) FROM ${reviewsTable} WHERE ${reviewsTable.designerId} = ${usersTable.id})`); break;
    case "price_low": orderBy = asc(producerProfilesTable.priceMin); break;
    case "price_high": orderBy = desc(producerProfilesTable.priceMax); break;
    case "experience": orderBy = desc(producerProfilesTable.experience); break;
    case "newest": default: orderBy = desc(usersTable.createdAt); break;
  }

  const items = await db
    .select({
      ...PUBLIC_SELECT,
      ...PROFILE_SELECT,
      slug: sql<string>`lower(regexp_replace(${usersTable.name}, '[^a-zA-Z0-9]+', '-', 'g'))`,
      avgRating: sql<number>`COALESCE((SELECT AVG(rating) FROM ${reviewsTable} WHERE ${reviewsTable.designerId} = ${usersTable.id}), 0)`,
      reviewCount: sql<number>`(SELECT COUNT(*) FROM ${reviewsTable} WHERE ${reviewsTable.designerId} = ${usersTable.id})`,
      completedProjects: sql<number>`(SELECT COUNT(*) FROM ${ordersTable} WHERE producer_id = ${usersTable.id} AND status = 'COMPLETED')`,
    })
    .from(usersTable)
    .innerJoin(producerProfilesTable, eq(usersTable.id, producerProfilesTable.userId))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(Number(limit))
    .offset((Number(page) - 1) * Number(limit));

  const [totalResult] = await db
    .select({ c: count() })
    .from(usersTable)
    .innerJoin(producerProfilesTable, eq(usersTable.id, producerProfilesTable.userId))
    .where(and(...conditions));

  // Log search for analytics
  if (search) {
    try {
      await db.insert(searchLogsTable).values({
        query: search, filters: JSON.stringify({ specialty, location, sort }),
        resultCount: Number(totalResult?.c ?? 0),
        userId: req.userId,
      });
    } catch { /* fire-and-forget */ }
  }

  res.json({ designers: items, total: Number(totalResult?.c ?? 0), page: Number(page), limit: Number(limit) });
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 2 — PUBLIC DESIGNER PROFILE
   ════════════════════════════════════════════════════════════════════ */

router.get("/marketplace/designers/:idOrSlug", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const { idOrSlug } = req.params;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

  const userCondition = isUUID ? eq(usersTable.id, idOrSlug) : sql`lower(regexp_replace(${usersTable.name}, '[^a-zA-Z0-9]+', '-', 'g')) = ${idOrSlug.toLowerCase()}`;

  const [designer] = await db
    .select({
      ...PUBLIC_SELECT,
      ...PROFILE_SELECT,
      slug: sql<string>`lower(regexp_replace(${usersTable.name}, '[^a-zA-Z0-9]+', '-', 'g'))`,
    })
    .from(usersTable)
    .innerJoin(producerProfilesTable, eq(usersTable.id, producerProfilesTable.userId))
    .where(and(sql`${usersTable.role} IN ('DESIGNER', 'PRODUCER')`, userCondition))
    .limit(1);

  if (!designer) { res.status(404).json({ error: "Designer not found" }); return; }

  // Portfolio
  const portfolio = await db.select()
    .from(portfolioItemsTable)
    .where(eq(portfolioItemsTable.designerId, designer.id))
    .orderBy(desc(portfolioItemsTable.createdAt));

  // Reviews
  const reviews = await db.select({
    id: reviewsTable.id,
    rating: reviewsTable.rating,
    title: reviewsTable.title,
    comment: reviewsTable.comment,
    imageUrls: reviewsTable.imageUrls,
    createdAt: reviewsTable.createdAt,
    designerReply: reviewsTable.designerReply,
    clientName: usersTable.name,
    clientAvatar: usersTable.avatar,
  })
  .from(reviewsTable)
  .innerJoin(usersTable, eq(reviewsTable.clientId, usersTable.id))
  .where(and(eq(reviewsTable.designerId, designer.id), eq(reviewsTable.status, "APPROVED")))
  .orderBy(desc(reviewsTable.createdAt))
  .limit(20);

  // Availability
  const [availability] = await db.select()
    .from(designerAvailabilityTable)
    .where(eq(designerAvailabilityTable.designerId, designer.id));

  // Stats
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const [bookingCount] = await db.select({ c: count() }).from(bookingsTable).where(eq(bookingsTable.designerId, designer.id));

  // Record view
  try {
    await db.insert(profileViewsTable).values({
      designerId: designer.id,
      viewerId: req.userId,
      referrer: req.headers.referer,
      userAgent: req.headers["user-agent"],
    });
  } catch { /* fire-and-forget */ }

  // SEO-friendly slug
  const slug = designer.name?.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") ?? designer.id;

  res.json({
    designer: { ...designer, slug },
    portfolio,
    reviews,
    availability,
    stats: {
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length,
      bookingCount: Number(bookingCount?.c ?? 0),
    },
    seo: {
      title: `${designer.brandName || designer.name} — ${designer.specialization || "Fashion"} Designer | Drape`,
      description: designer.bio?.slice(0, 160) ?? `Bespoke fashion by ${designer.name}. Book a consultation on Drape.`,
      canonical: `/designer/${slug}`,
      image: (designer.portfolioUrls ?? [])[0] ?? null,
    },
  });
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 4 — BOOKING SYSTEM
   ════════════════════════════════════════════════════════════════════ */

// Get available slots for a designer
router.get("/marketplace/designers/:id/availability", async (req: Request, res: Response): Promise<void> => {
  const [availability] = await db.select()
    .from(designerAvailabilityTable)
    .where(eq(designerAvailabilityTable.designerId, req.params.id));
  if (!availability) {
    // Return default availability
    const defaultSlots = JSON.stringify(["09:00-10:00", "10:00-11:00", "11:00-12:00", "13:00-14:00", "14:00-15:00", "15:00-16:00"]);
    res.json({
      availability: null,
      defaultSlots: ["09:00-10:00", "10:00-11:00", "11:00-12:00", "13:00-14:00", "14:00-15:00", "15:00-16:00"],
    });
    return;
  }
  res.json({ availability });
});

// Set availability (designer only)
router.post("/marketplace/availability", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const existing = await db.select().from(designerAvailabilityTable).where(eq(designerAvailabilityTable.designerId, req.userId!));
  if (existing.length > 0) {
    const [updated] = await db.update(designerAvailabilityTable).set(req.body).where(eq(designerAvailabilityTable.designerId, req.userId!)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(designerAvailabilityTable).values({ ...req.body, designerId: req.userId! }).returning();
    res.status(201).json(created);
  }
});

// Create booking
router.post("/marketplace/bookings", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const [booking] = await db.insert(bookingsTable).values({ ...req.body, clientId: req.userId! }).returning();
  res.status(201).json(booking);
});

// Get my bookings (client or designer)
router.get("/marketplace/bookings", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { role } = req.query as Record<string, string>;
  const conditions = role === "designer"
    ? eq(bookingsTable.designerId, req.userId!)
    : eq(bookingsTable.clientId, req.userId!);
  const bookings = await db.select().from(bookingsTable).where(conditions).orderBy(desc(bookingsTable.startTime)).limit(50);
  res.json({ bookings });
});

// Update booking (reschedule/cancel)
router.patch("/marketplace/bookings/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const [booking] = await db.update(bookingsTable).set(req.body).where(eq(bookingsTable.id, req.params.id)).returning();
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
  res.json(booking);
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 5 — REVIEW SYSTEM
   ════════════════════════════════════════════════════════════════════ */

// Create review (client only, verified order)
router.post("/marketplace/reviews", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { orderId, rating, title, comment, imageUrls } = req.body as any;
  if (!orderId || !rating) { res.status(400).json({ error: "orderId and rating are required" }); return; }
  if (rating < 1 || rating > 5) { res.status(400).json({ error: "Rating must be 1-5" }); return; }

  // Verify order ownership
  const [order] = await db.select().from(ordersTable)
    .where(and(
      eq(import("@workspace/db").then(m => m.ordersTable).catch(() => null as any).id, orderId),
      eq(import("@workspace/db").then(m => m.ordersTable).catch(() => null as any).clientId, req.userId!),
      eq(import("@workspace/db").then(m => m.ordersTable).catch(() => null as any).status, "COMPLETED"),
    ));
  if (!order) { res.status(403).json({ error: "You can only review completed orders you placed" }); return; }

  const [review] = await db.insert(reviewsTable).values({
    orderId, clientId: req.userId!, designerId: order.producerId,
    rating, title, comment, imageUrls,
  }).returning();

  res.status(201).json(review);
});

// Designer reply to review
router.post("/marketplace/reviews/:id/reply", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { designerReply } = req.body as { designerReply: string };
  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, req.params.id));
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  if (review.designerId !== req.userId!) { res.status(403).json({ error: "Only the designer can reply" }); return; }
  const [updated] = await db.update(reviewsTable).set({ designerReply, designerRepliedAt: new Date() })
    .where(eq(reviewsTable.id, req.params.id)).returning();
  res.json(updated);
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 6 — FAVOURITES / SAVE
   ════════════════════════════════════════════════════════════════════ */

router.get("/marketplace/saved-designers", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const items = await db.select().from(savedDesignersTable).where(eq(savedDesignersTable.userId, req.userId!));
  res.json({ savedDesigners: items });
});

router.post("/marketplace/saved-designers", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { designerId } = req.body as { designerId: string };
  try {
    const [saved] = await db.insert(savedDesignersTable).values({ userId: req.userId!, designerId }).returning();
    res.status(201).json(saved);
  } catch {
    // Already saved — silently succeed
    res.json({ saved: true });
  }
});

router.delete("/marketplace/saved-designers/:designerId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  await db.delete(savedDesignersTable).where(and(
    eq(savedDesignersTable.userId, req.userId!),
    eq(savedDesignersTable.designerId, req.params.designerId),
  ));
  res.sendStatus(204);
});

// Collections
router.get("/marketplace/collections", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const collections = await db.select().from(collectionsTable).where(eq(collectionsTable.userId, req.userId!)).orderBy(desc(collectionsTable.updatedAt));
  res.json({ collections });
});

router.post("/marketplace/collections", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const [collection] = await db.insert(collectionsTable).values({ ...req.body, userId: req.userId! }).returning();
  res.status(201).json(collection);
});

router.post("/marketplace/collections/:id/items", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { itemType, itemId } = req.body as { itemType: string; itemId: string };
  const [item] = await db.insert(collectionItemsTable).values({ collectionId: req.params.id, itemType, itemId }).returning();
  res.status(201).json(item);
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 10 — ADMIN MODERATION
   ════════════════════════════════════════════════════════════════════ */

router.get("/admin/marketplace/reviews", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { status = "PENDING", page = "1", limit = "20" } = req.query as Record<string, string>;
  const items = await db.select().from(reviewsTable)
    .where(status === "ALL" ? undefined : eq(reviewsTable.status, status as any))
    .orderBy(desc(reviewsTable.createdAt)).limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
  const [total] = await db.select({ c: count() }).from(reviewsTable)
    .where(status === "ALL" ? undefined : eq(reviewsTable.status, status as any));
  res.json({ reviews: items, total: Number(total?.c ?? 0) });
});

router.patch("/admin/marketplace/reviews/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { status, moderatorNote } = req.body as { status?: string; moderatorNote?: string };
  const [updated] = await db.update(reviewsTable).set({
    status: status as any,
    moderatorNote,
    moderatedBy: req.userId!,
    moderatedAt: new Date(),
  }).where(eq(reviewsTable.id, req.params.id)).returning();
  res.json(updated);
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 11 — MARKETPLACE ANALYTICS
   ════════════════════════════════════════════════════════════════════ */

router.get("/marketplace/analytics", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { startDate, endDate } = req.query as Record<string, string | undefined>;
  const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate || new Date().toISOString();

  const [viewCount] = await db.select({ c: count() }).from(profileViewsTable)
    .where(and(eq(profileViewsTable.designerId, userId), gte(profileViewsTable.createdAt, start)));
  const [bookingsCount] = await db.select({ c: count() }).from(bookingsTable)
    .where(and(eq(bookingsTable.designerId, userId), gte(bookingsTable.createdAt, start)));
  const [savedCount] = await db.select({ c: count() }).from(savedDesignersTable)
    .where(eq(savedDesignersTable.designerId, userId));
  const reviews = await db.select({ rating: reviewsTable.rating }).from(reviewsTable)
    .where(eq(reviewsTable.designerId, userId));
  const avgR = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  res.json({
    profileViews: Number(viewCount?.c ?? 0),
    bookings: Number(bookingsCount?.c ?? 0),
    savedByUsers: Number(savedCount?.c ?? 0),
    avgRating: Math.round(avgR * 10) / 10,
    totalReviews: reviews.length,
  });
});

/* ════════════════════════════════════════════════════════════════════
   MODULE 9 — SEO HELPERS
   ════════════════════════════════════════════════════════════════════ */

router.get("/sitemap.xml", async (_req: Request, res: Response): Promise<void> => {
  const designers = await db.select({ name: usersTable.name })
    .from(usersTable).where(sql`${usersTable.role} IN ('DESIGNER', 'PRODUCER')`);
  const urls = designers.map((d) => {
    const slug = d.name?.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `  <url><loc>https://drape.app/designer/${slug}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
  }).join("\n");
  res.header("Content-Type", "application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://drape.app/</loc><priority>1.0</priority></url>\n  <url><loc>https://drape.app/marketplace</loc><priority>0.9</priority></url>\n${urls}\n</urlset>`);
});

router.get("/robots.txt", async (_req: Request, res: Response): Promise<void> => {
  res.header("Content-Type", "text/plain");
  res.send("User-agent: *\nAllow: /\nSitemap: https://drape.app/sitemap.xml\n");
});

export default router;
