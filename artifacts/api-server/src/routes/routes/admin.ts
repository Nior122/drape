import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable, producerProfilesTable, profilesTable,
  reviewsTable, subscriptionPlansTable, userSubscriptionsTable,
  bookingsTable, ordersTable, projectsTable, notificationsTable,
  auditLogsTable,
} from "@workspace/db";
import { eq, and, or, desc, asc, sql, count, gte, lte, inArray } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import { requireRole } from "../../middlewares/requireRole";

const router: IRouter = Router();
router.use(requireAuth, requireRole("ADMIN"));

async function adminAudit(userId: string, action: string, entity: string, entityId?: string, details?: Record<string, unknown>) {
  try {
    await db.insert(auditLogsTable).values({ userId, action, entity, entityId, details: details ?? {} });
  } catch { /* fire-and-forget */ }
}

/* ════════════════════════════════════════════════════════════════════
   DASHBOARD — platform KPIs
   ════════════════════════════════════════════════════════════════════ */

router.get("/admin/dashboard", async (req: Request, res: Response): Promise<void> => {
  const [userCount] = await db.select({ c: count() }).from(usersTable);
  const [designerCount] = await db.select({ c: count() }).from(usersTable).where(sql`role IN ('DESIGNER', 'PRODUCER')`);
  const [clientCount] = await db.select({ c: count() }).from(usersTable).where(eq(usersTable.role, "CLIENT"));
  const [orderCount] = await db.select({ c: count() }).from(ordersTable);
  const [reviewCount] = await db.select({ c: count() }).from(reviewsTable);
  const [pendingReviews] = await db.select({ c: count() }).from(reviewsTable).where(eq(reviewsTable.status, "PENDING"));
  const [activeSubs] = await db.select({ c: count() }).from(userSubscriptionsTable).where(eq(userSubscriptionsTable.status, "active"));
  const [freeSubs] = await db.select({ c: count() }).from(userSubscriptionsTable).where(eq(userSubscriptionsTable.planKey, "free"));

  res.json({
    users: Number(userCount?.c ?? 0), designers: Number(designerCount?.c ?? 0),
    clients: Number(clientCount?.c ?? 0), orders: Number(orderCount?.c ?? 0),
    reviews: Number(reviewCount?.c ?? 0), pendingReviews: Number(pendingReviews?.c ?? 0),
    activeSubscriptions: Number(activeSubs?.c ?? 0), freeUsers: Number(freeSubs?.c ?? 0),
  });
});

/* ════════════════════════════════════════════════════════════════════
   USER MANAGEMENT
   ════════════════════════════════════════════════════════════════════ */

router.get("/admin/users", async (req: Request, res: Response): Promise<void> => {
  const { search, role, page = "1", limit = "50" } = req.query as Record<string, string | undefined>;
  const conditions: any[] = [];
  if (role) conditions.push(eq(usersTable.role, role as any));
  if (search) conditions.push(sql`(${usersTable.name} ILIKE ${`%${search}%`} OR ${usersTable.email} ILIKE ${`%${search}%`})`);
  const users = await db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email,
    role: usersTable.role, onboardingComplete: usersTable.onboardingComplete,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(usersTable.createdAt)).limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
  const [total] = await db.select({ c: count() }).from(usersTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  res.json({ users, total: Number(total?.c ?? 0) });
});

router.patch("/admin/users/:id", async (req: Request, res: Response): Promise<void> => {
  const { role, onboardingComplete, name } = req.body as any;
  const update: Record<string, unknown> = {};
  if (role) update.role = role;
  if (onboardingComplete !== undefined) update.onboardingComplete = onboardingComplete;
  if (name) update.name = name;
  if (Object.keys(update).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }
  const [user] = await db.update(usersTable).set(update).where(eq(usersTable.id, req.params.id)).returning({ id: usersTable.id, name: usersTable.name, role: usersTable.role });
  await adminAudit(req.userId!, "UPDATE_USER", "user", req.params.id, update);
  res.json(user);
});

router.delete("/admin/users/:id", async (req: Request, res: Response): Promise<void> => {
  await db.delete(usersTable).where(eq(usersTable.id, req.params.id));
  await adminAudit(req.userId!, "DELETE_USER", "user", req.params.id);
  res.sendStatus(204);
});

/* ════════════════════════════════════════════════════════════════════
   DESIGNER MANAGEMENT
   ════════════════════════════════════════════════════════════════════ */

router.get("/admin/designers", async (req: Request, res: Response): Promise<void> => {
  const conditions = [sql`${usersTable.role} IN ('DESIGNER', 'PRODUCER')`];
  const designers = await db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email,
    brandName: producerProfilesTable.brandName,
    location: producerProfilesTable.location,
    specialization: producerProfilesTable.specialization,
    experience: producerProfilesTable.experience,
    verificationStatus: sql<string>`CASE WHEN ${producerProfilesTable.experience} >= 5 THEN 'VERIFIED' WHEN ${producerProfilesTable.experience} >= 2 THEN 'PENDING' ELSE 'UNVERIFIED' END`,
    createdAt: usersTable.createdAt,
  }).from(usersTable).innerJoin(producerProfilesTable, eq(usersTable.id, producerProfilesTable.userId))
    .where(and(...conditions)).orderBy(desc(usersTable.createdAt)).limit(100);
  res.json({ designers });
});

/* ════════════════════════════════════════════════════════════════════
   REVIEW MODERATION
   ════════════════════════════════════════════════════════════════════ */

router.get("/admin/reviews", async (req: Request, res: Response): Promise<void> => {
  const { status = "PENDING", page = "1", limit = "20" } = req.query as Record<string, string | undefined>;
  const items = await db.select({
    id: reviewsTable.id, rating: reviewsTable.rating, title: reviewsTable.title,
    comment: reviewsTable.comment, status: reviewsTable.status,
    imageUrls: reviewsTable.imageUrls, createdAt: reviewsTable.createdAt,
    clientId: reviewsTable.clientId, designerId: reviewsTable.designerId,
  }).from(reviewsTable)
    .where(status === "ALL" ? undefined : eq(reviewsTable.status, status as any))
    .orderBy(desc(reviewsTable.createdAt)).limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
  const [total] = await db.select({ c: count() }).from(reviewsTable)
    .where(status === "ALL" ? undefined : eq(reviewsTable.status, status as any));
  res.json({ reviews: items, total: Number(total?.c ?? 0) });
});

router.patch("/admin/reviews/:id", async (req: Request, res: Response): Promise<void> => {
  const { status, moderatorNote } = req.body as { status?: string; moderatorNote?: string };
  const [updated] = await db.update(reviewsTable).set({
    status: status as any, moderatorNote,
    moderatedBy: req.userId!, moderatedAt: new Date(),
  }).where(eq(reviewsTable.id, req.params.id)).returning();
  await adminAudit(req.userId!, "MODERATE_REVIEW", "review", req.params.id, { status });
  res.json(updated);
});

/* ════════════════════════════════════════════════════════════════════
   SUBSCRIPTION MANAGEMENT
   ════════════════════════════════════════════════════════════════════ */

router.get("/admin/subscriptions", async (req: Request, res: Response): Promise<void> => {
  const subs = await db.select({
    id: userSubscriptionsTable.id, userId: userSubscriptionsTable.userId,
    planKey: userSubscriptionsTable.planKey, status: userSubscriptionsTable.status,
    billingInterval: userSubscriptionsTable.billingInterval,
    currentPeriodEnd: userSubscriptionsTable.currentPeriodEnd,
    createdAt: userSubscriptionsTable.createdAt,
  }).from(userSubscriptionsTable).orderBy(desc(userSubscriptionsTable.createdAt)).limit(100);
  res.json({ subscriptions: subs });
});

router.patch("/admin/subscriptions/:id", async (req: Request, res: Response): Promise<void> => {
  const { planKey, status } = req.body as { planKey?: string; status?: string };
  const update: Record<string, unknown> = {};
  if (planKey) update.planKey = planKey;
  if (status) update.status = status;
  const [sub] = await db.update(userSubscriptionsTable).set(update).where(eq(userSubscriptionsTable.id, req.params.id)).returning();
  await adminAudit(req.userId!, "UPDATE_SUBSCRIPTION", "subscription", req.params.id, update);
  res.json(sub);
});

/* ════════════════════════════════════════════════════════════════════
   FEATURE FLAGS
   ════════════════════════════════════════════════════════════════════ */

const featureFlags: Record<string, boolean> = {
  ai_enabled: true, marketplace_enabled: true, bookings_enabled: true,
  reviews_enabled: true, business_finance: true, admin_panel: true,
  maintenance_mode: false, signup_enabled: true,
};

router.get("/admin/feature-flags", (_req: Request, res: Response): void => { res.json({ flags: featureFlags }); });

router.patch("/admin/feature-flags", (req: Request, res: Response): void => {
  const { flags } = req.body as { flags: Record<string, boolean> };
  if (flags) Object.assign(featureFlags, flags);
  res.json({ flags: featureFlags });
});

/* ════════════════════════════════════════════════════════════════════
   AUDIT LOGS
   ════════════════════════════════════════════════════════════════════ */

router.get("/admin/audit-logs", async (req: Request, res: Response): Promise<void> => {
  const { page = "1", limit = "50" } = req.query as Record<string, string | undefined>;
  const logs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt))
    .limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
  const [total] = await db.select({ c: count() }).from(auditLogsTable);
  res.json({ logs, total: Number(total?.c ?? 0) });
});

/* ════════════════════════════════════════════════════════════════════
   ANNOUNCEMENTS
   ════════════════════════════════════════════════════════════════════ */

router.get("/admin/announcements", async (req: Request, res: Response): Promise<void> => {
  const announcements = await db.select().from(notificationsTable)
    .where(sql`${notificationsTable.type} = 'GENERAL'`).orderBy(desc(notificationsTable.createdAt)).limit(20);
  res.json({ announcements });
});

router.post("/admin/announcements", async (req: Request, res: Response): Promise<void> => {
  const { title, body, link } = req.body as { title: string; body?: string; link?: string };
  const [notif] = await db.insert(notificationsTable).values({
    userId: req.userId!, type: "GENERAL", title, body, link,
  }).returning();
  await adminAudit(req.userId!, "ANNOUNCEMENT", "announcement", notif.id, { title });
  res.status(201).json(notif);
});

/* ════════════════════════════════════════════════════════════════════
   PLATFORM STATS
   ════════════════════════════════════════════════════════════════════ */

router.get("/admin/platform", async (req: Request, res: Response): Promise<void> => {
  const oneDayAgo = new Date(Date.now() - 86400000);
  const [dau] = await db.select({ c: count() }).from(auditLogsTable).where(gte(auditLogsTable.createdAt, oneDayAgo));
  const [bookingCount] = await db.select({ c: count() }).from(bookingsTable);
  const [completedProjects] = await db.select({ c: count() }).from(projectsTable).where(eq(projectsTable.status, "COMPLETED"));
  res.json({
    dailyActiveUsers: Number(dau?.c ?? 0), totalBookings: Number(bookingCount?.c ?? 0),
    completedProjects: Number(completedProjects?.c ?? 0), timestamp: new Date().toISOString(),
  });
});

/* ════════════════════════════════════════════════════════════════════
   DEMO DATA MANAGEMENT
   ════════════════════════════════════════════════════════════════════ */

router.post("/admin/demo/clear", async (req: Request, res: Response): Promise<void> => {
  const result = await db.delete(usersTable).where(sql`email ILIKE '%@drape-demo.com'`).returning({ id: usersTable.id });
  await adminAudit(req.userId!, "CLEAR_DEMO_DATA", "demo", undefined, { count: result.length });
  res.json({ cleared: result.length, message: "Demo data cleared successfully." });
});

router.get("/admin/demo/status", async (req: Request, res: Response): Promise<void> => {
  const [designers] = await db.select({ c: count() }).from(usersTable).where(and(sql`role IN ('DESIGNER','PRODUCER')`, sql`email ILIKE '%@drape-demo.com'`));
  const [clients] = await db.select({ c: count() }).from(usersTable).where(and(eq(usersTable.role, "CLIENT"), sql`email ILIKE '%@drape-demo.com'`));
  res.json({
    hasDemoData: Number(designers?.c ?? 0) > 0,
    designerCount: Number(designers?.c ?? 0),
    clientCount: Number(clients?.c ?? 0),
    message: Number(designers?.c ?? 0) > 0 ? "Demo data present" : "No demo data found",
  });
});


/* ════════════════════════════════════════════════════════════════════
   DEMO ACCOUNTS — list, search, export (v2, @drape.demo)
   ════════════════════════════════════════════════════════════════════ */

const DEMO_DOMAIN = "drape.demo";

router.get("/admin/demo-accounts", async (req: Request, res: Response): Promise<void> => {
  const { search, role, page = "1", limit = "50", format } = req.query as Record<string, string | undefined>;
  const conditions: ReturnType<typeof sql>[] = [sql`${usersTable.email} LIKE ${"%" + "@" + DEMO_DOMAIN}`];
  if (role) conditions.push(eq(usersTable.role, role as any));
  if (search) {
    conditions.push(sql`(${usersTable.name} ILIKE ${"%" + search + "%"} OR ${usersTable.email} ILIKE ${"%" + search + "%"})`);
  }
  const accounts = await db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email,
    role: usersTable.role, onboardingComplete: usersTable.onboardingComplete,
    createdAt: usersTable.createdAt, city: profilesTable.city,
    brandName: producerProfilesTable.brandName,
  })
  .from(usersTable)
  .leftJoin(profilesTable, eq(usersTable.id, profilesTable.userId))
  .leftJoin(producerProfilesTable, eq(usersTable.id, producerProfilesTable.userId))
  .where(and(...conditions))
  .orderBy(desc(usersTable.createdAt))
  .limit(Number(limit))
  .offset((Number(page) - 1) * Number(limit));

  const [totalResult] = await db.select({ c: count() }).from(usersTable)
    .leftJoin(profilesTable, eq(usersTable.id, profilesTable.userId))
    .leftJoin(producerProfilesTable, eq(usersTable.id, producerProfilesTable.userId))
    .where(and(...conditions));

  const accountsWithPasswords = accounts.map(a => ({
    ...a,
    defaultPassword: a.role === "ADMIN" ? "Admin@123"
      : a.role === "DESIGNER" || a.role === "PRODUCER" ? "Designer@123" : "Client@123",
    verificationStatus: a.role === "DESIGNER" || a.role === "PRODUCER"
      ? (a.brandName ? "VERIFIED" : "PENDING") : "N/A",
  }));

  if (format === "csv") {
    const headers = ["Name","Email","Password","Role","City","State","BusinessName","VerificationStatus","CreatedAt"];
    const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.join(",")];
    for (const a of accountsWithPasswords) {
      lines.push(headers.map(h => { switch (h) {
        case "Name": return esc(a.name ?? ""); case "Email": return esc(a.email);
        case "Password": return esc(a.defaultPassword); case "Role": return esc(a.role);
        case "City": return esc(a.city ?? ""); case "State": return esc("");
        case "BusinessName": return esc(a.brandName ?? ""); case "VerificationStatus": return esc(a.verificationStatus);
        case "CreatedAt": return esc(a.createdAt?.toISOString() ?? ""); default: return "";
      }}).join(","));
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=demo_accounts.csv");
    res.send(lines.join("\n")); return;
  }

  res.json({ accounts: accountsWithPasswords, total: Number(totalResult?.c ?? 0), page: Number(page), limit: Number(limit) });
});

router.get("/admin/demo-accounts/stats", async (_req: Request, res: Response): Promise<void> => {
  const [totalDesigners] = await db.select({ c: count() }).from(usersTable)
    .where(and(sql`${usersTable.email} LIKE ${"%" + "@" + DEMO_DOMAIN}`, sql`${usersTable.role} IN ('DESIGNER', 'PRODUCER')`));
  const [totalClients] = await db.select({ c: count() }).from(usersTable)
    .where(and(sql`${usersTable.email} LIKE ${"%" + "@" + DEMO_DOMAIN}`, eq(usersTable.role, "CLIENT")));
  const [totalAdmins] = await db.select({ c: count() }).from(usersTable)
    .where(and(sql`${usersTable.email} LIKE ${"%" + "@" + DEMO_DOMAIN}`, eq(usersTable.role, "ADMIN")));
  res.json({ totalDesigners: Number(totalDesigners?.c ?? 0), totalClients: Number(totalClients?.c ?? 0), totalAdmins: Number(totalAdmins?.c ?? 0) });
});
export default router;
