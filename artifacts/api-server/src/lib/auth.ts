import { SignJWT, jwtVerify } from "jose";
import { db } from "@workspace/db";
import {
  usersTable, profilesTable, clientPreferencesTable,
  producerProfilesTable, adminProfilesTable, type User,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) { throw new Error("JWT_SECRET environment variable is required but not set. Add it to Replit Secrets."); }
const secret = new TextEncoder().encode(JWT_SECRET);
const EXPIRY = "7d";

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<string | null> {
  try { const { payload } = await jwtVerify(token, secret); return payload.sub ?? null; }
  catch { return null; }
}

// ─── In-memory payload cache (5s TTL) ───────────────────────────────────────
const payloadCache = new Map<string, { payload: any; expiresAt: number }>();
const CACHE_TTL_MS = 5_000;

function getCachedPayload(userId: string): any | null {
  const entry = payloadCache.get(userId);
  if (entry && Date.now() < entry.expiresAt) return entry.payload;
  payloadCache.delete(userId);
  return null;
}

function setCachedPayload(userId: string, payload: any): void {
  payloadCache.set(userId, { payload, expiresAt: Date.now() + CACHE_TTL_MS });
  if (payloadCache.size > 500) {
    const oldest = [...payloadCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt).slice(0, 100);
    for (const [k] of oldest) payloadCache.delete(k);
  }
}

export type AuthUserPayload = {
  id: string; email: string; name: string | null;
  role: "CLIENT" | "DESIGNER" | "PRODUCER" | "ADMIN";
  onboardingComplete: boolean; avatar: string | null;
  phone: string | null; whatsapp: string | null;
  city: string | null; country: string | null; bio: string | null;
  stylePreferences: string[]; preferredColours: string[];
  budgetMin: number | null; budgetMax: number | null; styleNote: string | null;
  brandName: string | null; professionalName: string | null;
  studioName: string | null; studioType: string | null;
  specialties: string[]; specialization: string | null;
  experience: number | null; portfolioDescription: string | null;
  portfolioUrls: string[]; priceMin: number | null; priceMax: number | null;
  instagram: string | null; website: string | null;
  socialLinks: Record<string, string>; availability: string | null;
  location: string | null; permissions: string[];
};

export async function buildUserPayload(user: User): Promise<AuthUserPayload> {
  const cached = getCachedPayload(user.id);
  if (cached) return cached;

  const rows = await db.execute(sql`
    SELECT
      p."phone", p."whatsapp", p."city", p."country", p."bio",
      cp."style_preferences", cp."preferred_colours", cp."budget_min", cp."budget_max", cp."style_note",
      pp."brand_name", pp."professional_name", pp."studio_name", pp."studio_type",
      pp."specialties", pp."specialization", pp."experience",
      pp."portfolio_description", pp."portfolio_urls",
      pp."price_min", pp."price_max", pp."instagram", pp."website",
      pp."social_links", pp."availability", pp."location",
      ap."permissions"
    FROM (SELECT 1 AS dummy) AS _
    LEFT JOIN ${profilesTable} p ON p."user_id" = ${user.id}
    LEFT JOIN ${clientPreferencesTable} cp ON cp."user_id" = ${user.id}
    LEFT JOIN ${producerProfilesTable} pp ON pp."user_id" = ${user.id}
    LEFT JOIN ${adminProfilesTable} ap ON ap."user_id" = ${user.id}
  `);

  const r = rows.rows?.[0] ?? {};

  const payload: AuthUserPayload = {
    id: user.id, email: user.email, name: user.name ?? null,
    role: user.role, onboardingComplete: user.onboardingComplete, avatar: user.avatar ?? null,
    phone: r.phone ?? null, whatsapp: r.whatsapp ?? null,
    city: r.city ?? null, country: r.country ?? null, bio: r.bio ?? null,
    stylePreferences: r.style_preferences ?? [],
    preferredColours: r.preferred_colours ?? [],
    budgetMin: r.budget_min ?? null, budgetMax: r.budget_max ?? null, styleNote: r.style_note ?? null,
    brandName: r.brand_name ?? null, professionalName: r.professional_name ?? null,
    studioName: r.studio_name ?? null, studioType: r.studio_type ?? null,
    specialties: r.specialties ?? [], specialization: r.specialization ?? null,
    experience: r.experience ?? null, portfolioDescription: r.portfolio_description ?? null,
    portfolioUrls: r.portfolio_urls ?? [],
    priceMin: r.price_min ?? null, priceMax: r.price_max ?? null,
    instagram: r.instagram ?? null, website: r.website ?? null,
    socialLinks: r.social_links ?? {}, availability: r.availability ?? null,
    location: r.location ?? null, permissions: r.permissions ?? [],
  };

  setCachedPayload(user.id, payload);
  return payload;
}

export function tokenFromRequest(req: { cookies?: Record<string, string>; headers: Record<string, string | string[] | undefined> }): string | null {
  if (req.cookies?.["drape_token"]) return req.cookies["drape_token"];
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export function setTokenCookie(res: { cookie: (name: string, value: string, options: object) => void }, token: string): void {
  const IS_PROD = process.env.NODE_ENV === "production";
  res.cookie("drape_token", token, {
    httpOnly: true, secure: IS_PROD, sameSite: IS_PROD ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, path: "/",
  });
}

export function clearTokenCookie(res: { clearCookie: (name: string, options: object) => void }): void {
  res.clearCookie("drape_token", { path: "/" });
}

export function invalidatePayloadCache(userId: string): void {
  payloadCache.delete(userId);
}
