import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  profilesTable,
  clientPreferencesTable,
  producerProfilesTable,
  adminProfilesTable,
} from "@workspace/db";
import {
  signToken,
  buildUserPayload,
  setTokenCookie,
  clearTokenCookie,
  tokenFromRequest,
  verifyToken,
} from "../../lib/auth";
import { requireAuth } from "../../middlewares/requireAuth";

const router: IRouter = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const VALID_ROLES = ["CLIENT", "DESIGNER", "PRODUCER", "ADMIN"] as const;

async function ensureProfile(userId: string): Promise<void> {
  const existing = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  if (existing.length === 0) {
    await db.insert(profilesTable).values({ userId });
  }
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name || !role) {
    res.status(400).json({ error: "email, password, name, and role are required" });
    return;
  }
  if (!VALID_ROLES.includes(role)) {
    res.status(400).json({ error: "role must be CLIENT, DESIGNER, PRODUCER, or ADMIN" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "password must be at least 8 characters" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ email, passwordHash, name, role }).returning();
  await ensureProfile(user.id);

  // Auto-create role-specific profile placeholder for non-admin roles
  if (role === "CLIENT") {
    const existing = await db.select().from(clientPreferencesTable).where(eq(clientPreferencesTable.userId, user.id));
    if (existing.length === 0) {
      await db.insert(clientPreferencesTable).values({ userId: user.id });
    }
  } else if (role === "DESIGNER" || role === "PRODUCER") {
    const existing = await db.select().from(producerProfilesTable).where(eq(producerProfilesTable.userId, user.id));
    if (existing.length === 0) {
      await db.insert(producerProfilesTable).values({ userId: user.id });
    }
  } else if (role === "ADMIN") {
    const existing = await db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id));
    if (existing.length === 0) {
      await db.insert(adminProfilesTable).values({ userId: user.id, permissions: ["manage_users", "manage_ai", "view_analytics", "manage_system"] });
    }
  }

  const token = await signToken(user.id);
  setTokenCookie(res, token);
  const payload = await buildUserPayload(user);
  req.log.info({ userId: user.id, role }, "User signed up");
  res.status(201).json({ user: payload, token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = await signToken(user.id);
  setTokenCookie(res, token);
  const payload = await buildUserPayload(user);
  req.log.info({ userId: user.id }, "User logged in");
  res.json({ user: payload, token });
});

router.post("/auth/google", async (req, res): Promise<void> => {
  const { idToken, role } = req.body;
  if (!idToken) {
    res.status(400).json({ error: "idToken is required" });
    return;
  }

  let googleId: string;
  let email: string;
  let name: string | undefined;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload?.email) {
      res.status(400).json({ error: "Invalid Google token" });
      return;
    }
    googleId = payload.sub;
    email = payload.email;
    name = payload.name;
  } catch {
    res.status(400).json({ error: "Invalid Google token" });
    return;
  }

  let [user] = await db.select().from(usersTable).where(eq(usersTable.googleId, googleId));
  if (!user) {
    const [byEmail] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (byEmail) {
      await db.update(usersTable).set({ googleId }).where(eq(usersTable.id, byEmail.id));
      user = { ...byEmail, googleId };
    } else {
      const assignedRole = (VALID_ROLES.includes(role) ? role : "CLIENT") as typeof VALID_ROLES[number];
      const [created] = await db.insert(usersTable).values({ email, name, googleId, role: assignedRole }).returning();
      user = created;
    }
  }

  await ensureProfile(user.id);
  const token = await signToken(user.id);
  setTokenCookie(res, token);
  const payload = await buildUserPayload(user);
  req.log.info({ userId: user.id }, "Google auth");
  res.json({ user: payload, token });
});

router.post("/auth/logout", (req, res): void => {
  clearTokenCookie(res);
  res.sendStatus(204);
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const payload = await buildUserPayload(user);
  res.json(payload);
});

router.patch("/auth/onboarding/shared", requireAuth, async (req, res): Promise<void> => {
  const { name, phone, whatsapp, city, country } = req.body;
  const userId = req.userId!;

  if (name != null) {
    await db.update(usersTable).set({ name }).where(eq(usersTable.id, userId));
  }

  const profileUpdate: Record<string, string> = {};
  if (phone != null) profileUpdate.phone = phone;
  if (whatsapp != null) profileUpdate.whatsapp = whatsapp;
  if (city != null) profileUpdate.city = city;
  if (country != null) profileUpdate.country = country;

  if (Object.keys(profileUpdate).length > 0) {
    const existing = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
    if (existing.length > 0) {
      await db.update(profilesTable).set(profileUpdate).where(eq(profilesTable.userId, userId));
    } else {
      await db.insert(profilesTable).values({ userId, ...profileUpdate });
    }
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const payload = await buildUserPayload(user);
  res.json(payload);
});

router.patch("/auth/onboarding/client", requireAuth, async (req, res): Promise<void> => {
  const { stylePreferences, preferredColours, budgetMin, budgetMax, styleNote, fullName, phone, location } = req.body;
  const userId = req.userId!;

  const update: Record<string, unknown> = {};
  if (stylePreferences != null) update.stylePreferences = stylePreferences;
  if (preferredColours != null) update.preferredColours = preferredColours;
  if (budgetMin != null) update.budgetMin = budgetMin;
  if (budgetMax != null) update.budgetMax = budgetMax;
  if (styleNote != null) update.styleNote = styleNote;
  if (fullName != null) update.fullName = fullName;
  if (phone != null) update.phone = phone;
  if (location != null) update.location = location;

  if (Object.keys(update).length > 0) {
    const existing = await db.select().from(clientPreferencesTable).where(eq(clientPreferencesTable.userId, userId));
    if (existing.length > 0) {
      await db.update(clientPreferencesTable).set(update).where(eq(clientPreferencesTable.userId, userId));
    } else {
      await db.insert(clientPreferencesTable).values({ userId, ...update });
    }
  }

  await db.update(usersTable).set({ onboardingComplete: true }).where(eq(usersTable.id, userId));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const payload = await buildUserPayload(user);
  res.json(payload);
});

router.patch("/auth/onboarding/designer", requireAuth, async (req, res): Promise<void> => {
  const {
    brandName, professionalName, bio, location, specialization,
    specialties, studioName, studioType, experience, portfolioDescription,
    portfolioUrls, priceMin, priceMax, website, instagram, socialLinks, availability,
  } = req.body;
  const userId = req.userId!;

  const update: Record<string, unknown> = {};
  if (brandName != null) update.brandName = brandName;
  if (professionalName != null) update.professionalName = professionalName;
  if (bio != null) update.bio = bio;
  if (location != null) update.location = location;
  if (specialization != null) update.specialization = specialization;
  if (specialties != null) update.specialties = specialties;
  if (studioName != null) update.studioName = studioName;
  if (studioType != null) update.studioType = studioType;
  if (experience != null) update.experience = experience;
  if (portfolioDescription != null) update.portfolioDescription = portfolioDescription;
  if (portfolioUrls != null) update.portfolioUrls = portfolioUrls;
  if (priceMin != null) update.priceMin = priceMin;
  if (priceMax != null) update.priceMax = priceMax;
  if (website != null) update.website = website;
  if (instagram != null) update.instagram = instagram;
  if (socialLinks != null) update.socialLinks = socialLinks;
  if (availability != null) update.availability = availability;

  if (Object.keys(update).length > 0) {
    const existing = await db.select().from(producerProfilesTable).where(eq(producerProfilesTable.userId, userId));
    if (existing.length > 0) {
      await db.update(producerProfilesTable).set(update).where(eq(producerProfilesTable.userId, userId));
    } else {
      await db.insert(producerProfilesTable).values({ userId, ...update });
    }
  }

  await db.update(usersTable).set({ onboardingComplete: true }).where(eq(usersTable.id, userId));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const payload = await buildUserPayload(user);
  res.json(payload);
});

// CRIT-01 FIX: Single /auth/onboarding/producer handler with requireAuth.
// Previously had TWO handlers: first returned 400 "use /designer", second lacked requireAuth and was dead code.
// Now: one correct handler with requireAuth that accepts both producer and designer field names.
router.patch("/auth/onboarding/producer", requireAuth, async (req, res): Promise<void> => {
  const {
    studioName, studioType, specialties, bio,
    priceMin, priceMax, instagram, portfolioUrls,
    brandName, professionalName, location, specialization,
    experience, portfolioDescription, website, socialLinks, availability,
  } = req.body;
  const userId = req.userId!;

  const update: Record<string, unknown> = {};
  if (brandName != null) update.brandName = brandName;
  if (professionalName != null) update.professionalName = professionalName;
  if (bio != null) update.bio = bio;
  if (location != null) update.location = location;
  if (specialization != null) update.specialization = specialization;
  if (specialties != null) update.specialties = specialties;
  if (studioName != null) update.studioName = studioName;
  if (studioType != null) update.studioType = studioType;
  if (experience != null) update.experience = experience;
  if (portfolioDescription != null) update.portfolioDescription = portfolioDescription;
  if (portfolioUrls != null) update.portfolioUrls = portfolioUrls;
  if (priceMin != null) update.priceMin = priceMin;
  if (priceMax != null) update.priceMax = priceMax;
  if (website != null) update.website = website;
  if (instagram != null) update.instagram = instagram;
  if (socialLinks != null) update.socialLinks = socialLinks;
  if (availability != null) update.availability = availability;

  if (Object.keys(update).length > 0) {
    const existing = await db.select().from(producerProfilesTable).where(eq(producerProfilesTable.userId, userId));
    if (existing.length > 0) {
      await db.update(producerProfilesTable).set(update).where(eq(producerProfilesTable.userId, userId));
    } else {
      await db.insert(producerProfilesTable).values({ userId, ...update });
    }
  }

  await db.update(usersTable).set({ onboardingComplete: true }).where(eq(usersTable.id, userId));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const payload = await buildUserPayload(user);
  res.json(payload);
});

export default router;