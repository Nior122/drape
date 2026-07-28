import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  usersTable, producerProfilesTable, profilesTable,
  clientPreferencesTable, adminProfilesTable,
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

/* ════════════════════════════════════════════════════════════════════
   SEED DEMO DATA — creates designers, clients & admins on demand
   ════════════════════════════════════════════════════════════════════ */

const SEED_DOMAIN = "drape.demo";
const SEED_PASSWORDS = {
  DESIGNER: "Designer@123",
  CLIENT: "Client@123",
  ADMIN: "Admin@123",
};
const BCRYPT_ROUNDS = 10;

function seedPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function seedRand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const SEED_CITIES = ["Lagos","Abuja","Ibadan","Port Harcourt","Benin","Enugu","Kaduna","Kano","Calabar","Jos","Abeokuta","Uyo","Owerri","Warri","Maiduguri"];
const SEED_SPECIALTIES = ["Bridal","Menswear","Native Wear","Ankara","Streetwear","Couture","Corporate","Wedding","Bespoke","Accessories","Embroidery","Knitwear","Lingerie","Sportswear","Sustainable"];
const SEED_BUSINESSES = ["Maison Luxe","Silhouette Studio","Thread & Needle","Aso Elegance","Royal Stitch","Kaftan Kings","Ankara Artistry","Bespoke House","Crimson Couture","Eclipse Tailoring","Velvet & Thread","Iroko Designs","Sapphire Styles","Golden Needle","Casa Couture","Zenith Fashion","Heritage Stitches","Urban Luxe","Diamond Stitch","Opulence Studio","Vogue Nigeria","Afro Elegance","The Style Studio","Lace & Linen","Couture Avenue","Stitch & Stone","Eko Fashion","Noble Attire","Tropical Threads","Bamboo Tailoring","Ivory & Ink","The Design Loft","Sartorial Lagos","Mosaic Fashion","Calabar Chic","Savannah Styles","Coastal Couture","Desert Rose","Rainforest","Platinum Stitch","Luxe Africa","Classic Cuts","Trendsetters NG","Delta Designs","Abia Bridal","Enugu Elegance","Makurdi Moda","Kano Creative","Surulere Styles","Lekki Luxury"];

const DESIGNER_FIRST = ["Amara","Chidi","Ngozi","Emeka","Zainab","Fatima","Tunde","Chioma","Ifeanyi","Adaeze","Yetunde","Segun","Kayode","Folake","Musa","Nnenna","Simi","Wale","Kemi","Yusuf","Tobi","Onyinye","Chisom","Ejiro","Femi","Bola","Damilola","Kelechi","Uche","Ijeoma","Oluchi","Chidera","Ebuka","Nnamdi","Zara","Halima","Amina","Bisi","Lola","Sade","Ayomide","Funmilayo","Olayinka","Ezinne","Chiamaka","Chinenye","Obinna","Chukwuma","Okechukwu","Ugochukwu"];
const DESIGNER_LAST = ["Adebayo","Okonkwo","Okafor","Balogun","Eze","Nwosu","Ogunlade","Ugwu","Osei","Diop","Adegoke","Oyedele","Nwachukwu","Oyelade","Akintola","Oluwole","Onyema","Ibekwe","Fashola","Akinwale","Ogunbiyi","Oshodi","Bello","Suleiman","Akinlade","Banjo","Obi","Okeke","Nwankwo"];
const CLIENT_FIRST = ["Sarah","Michael","Jennifer","David","Grace","Samuel","Esther","Daniel","Ruth","Joseph","Deborah","Joshua","Mary","Andrew","Cynthia","Peter","Martha","James","Peace","John","Faith","George","Mercy","Paul","Joy","Philip","Elizabeth","Mark","Blessing","Hannah","Gloria","Chris","Patience","Charles","Ngozi","Funke","Bolanle","Chinyere","Amara","Ezinne","Adaeze","Nnenna","Yetunde","Kemi","Simi","Folake","Halima","Amina","Bisi","Lola","Sade"];
const CLIENT_LAST = ["Williams","Johnson","Brown","Davis","Wilson","Taylor","Thomas","Jackson","White","Harris","Martin","Thompson","Robinson","Clark","Lewis","Walker","Hall","Allen","Young","King","Wright","Hill","Scott","Green","Adams","Baker","Nelson","Carter","Mitchell","Roberts","Campbell","Parker","Evans","Collins","Stewart","Morris","Okafor","Eze","Nwosu","Ugwu","Okonkwo","Balogun","Adebayo","Adegoke","Ogunbiyi","Fashola","Akinlade","Oshodi","Bello","Suleiman"];

router.post("/admin/demo/seed", async (req: Request, res: Response): Promise<void> => {
  try {
    const hashDesigner = await bcrypt.hash(SEED_PASSWORDS.DESIGNER, BCRYPT_ROUNDS);
    const hashClient = await bcrypt.hash(SEED_PASSWORDS.CLIENT, BCRYPT_ROUNDS);
    const hashAdmin = await bcrypt.hash(SEED_PASSWORDS.ADMIN, BCRYPT_ROUNDS);

    const designerIds: string[] = [];
    const clientIds: string[] = [];
    const countDesigner = 50;
    const countClient = 30;
    const countAdmin = 5;

    // ── Clear existing demo users ─────────────────────────────────────
    await db.delete(usersTable).where(sql`email LIKE ${"%" + "@" + SEED_DOMAIN}`);

    // ── Designers ─────────────────────────────────────────────────────
    for (let i = 0; i < countDesigner; i++) {
      const name = (DESIGNER_FIRST[i % DESIGNER_FIRST.length] + " " + DESIGNER_LAST[i % DESIGNER_LAST.length]).trim();
      const username = "designer" + String(i + 1).padStart(3, "0");
      const email = username + "@" + SEED_DOMAIN;
      const id = randomUUID(); designerIds.push(id);
      const city = SEED_CITIES[i % SEED_CITIES.length];
      const bizName = SEED_BUSINESSES[i % SEED_BUSINESSES.length];
      const specCount = (i % 4) + 1;
      const specs: string[] = [];
      while (specs.length < specCount) { const s = SEED_SPECIALTIES[(specs.length + i * 7) % SEED_SPECIALTIES.length]; if (!specs.includes(s)) specs.push(s); }
      const exp = (i % 25) + 2;

      await db.insert(usersTable).values({ id, email, name, role: "DESIGNER", passwordHash: hashDesigner, onboardingComplete: true });
      await db.insert(profilesTable).values({ userId: id, city, country: "Nigeria", bio: name + " — " + specs.slice(0,2).join(" & ") + " specialist.", phone: "+234" + String(seedRand(700, 909) * 10000000 + seedRand(100, 9999)) });
      await db.insert(producerProfilesTable).values({
        userId: id, brandName: bizName, specialty: specs[0], specialties: specs,
        studioName: bizName, studioType: (["SOLO","STUDIO","ATELIER","BRAND"])[i % 4] as any,
        experience: exp, location: city + ", Nigeria",
        priceMin: 15000 + i * 1200, priceMax: 100000 + i * 7000,
        portfolioUrls: [] as string[], availability: (["available","busy","limited"])[i % 3] as any,
      });
    }

    // ── Clients ───────────────────────────────────────────────────────
    for (let i = 0; i < countClient; i++) {
      const name = (CLIENT_FIRST[i % CLIENT_FIRST.length] + " " + CLIENT_LAST[i % CLIENT_LAST.length]).trim();
      const username = "client" + String(i + 1).padStart(3, "0");
      const email = username + "@" + SEED_DOMAIN;
      const id = randomUUID(); clientIds.push(id);
      const city = SEED_CITIES[i % SEED_CITIES.length];
      await db.insert(usersTable).values({ id, email, name, role: "CLIENT", passwordHash: hashClient, onboardingComplete: true });
      await db.insert(profilesTable).values({ userId: id, city, country: "Nigeria" });
      await db.insert(clientPreferencesTable).values({
        userId: id, stylePreferences: ["Modern", "Classic"], preferredColours: ["Bold colours", "Neutrals"],
        budgetMin: 50000 + i * 5000, budgetMax: 300000 + i * 15000,
      });
    }

    // ── Admins ────────────────────────────────────────────────────────
    for (let i = 0; i < countAdmin; i++) {
      const username = "admin" + String(i + 1).padStart(3, "0");
      const email = username + "@" + SEED_DOMAIN;
      const id = "a" + "00000000-0000-0000-0000-" + String(i + 1).padStart(12, "0");
      const city = SEED_CITIES[i + 5];
      await db.insert(usersTable).values({ id, email, name: "Admin " + (i + 1), role: "ADMIN", passwordHash: hashAdmin, onboardingComplete: true });
      await db.insert(profilesTable).values({ userId: id, city, country: "Nigeria" });
      await db.insert(adminProfilesTable).values({ userId: id, permissions: ["manage_users","manage_ai","view_analytics","manage_system","manage_demo_accounts"] });
    }

    await adminAudit(req.userId!, "SEED_DEMO_DATA", "demo", undefined, { designers: countDesigner, clients: countClient, admins: countAdmin });

    res.json({
      message: "Demo data seeded successfully.",
      accounts: { designers: countDesigner, clients: countClient, admins: countAdmin, total: countDesigner + countClient + countAdmin },
      passwords: { designer: SEED_PASSWORDS.DESIGNER, client: SEED_PASSWORDS.CLIENT, admin: SEED_PASSWORDS.ADMIN },
      domain: SEED_DOMAIN,
    });
  } catch (err) {
    console.error("Seed failed:", err);
    res.status(500).json({ error: "Seed failed: " + (err instanceof Error ? err.message : String(err)) });
  }
});

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
