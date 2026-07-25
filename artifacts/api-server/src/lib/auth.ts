import { SignJWT, jwtVerify } from "jose";
import { db } from "@workspace/db";
import {
  usersTable,
  profilesTable,
  clientPreferencesTable,
  producerProfilesTable,
  adminProfilesTable,
  type User,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required but not set. Add it to Replit Secrets.");
}
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
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export type AuthUserPayload = {
  id: string;
  email: string;
  name: string | null;
  role: "CLIENT" | "DESIGNER" | "PRODUCER" | "ADMIN";
  onboardingComplete: boolean;
  avatar: string | null;

  // Profile (shared)
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;

  // Client-specific
  stylePreferences: string[];
  preferredColours: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  styleNote: string | null;

  // Designer-specific (same as producer-profiles)
  brandName: string | null;
  professionalName: string | null;
  studioName: string | null;
  studioType: string | null;
  specialties: string[];
  specialization: string | null;
  experience: number | null;
  portfolioDescription: string | null;
  portfolioUrls: string[];
  priceMin: number | null;
  priceMax: number | null;
  instagram: string | null;
  website: string | null;
  socialLinks: Record<string, string>;
  availability: string | null;
  location: string | null;

  // Admin-specific
  permissions: string[];
};

export async function buildUserPayload(user: User): Promise<AuthUserPayload> {
  const [profile, clientPref, producerProf, adminProf] = await Promise.all([
    db.select().from(profilesTable).where(eq(profilesTable.userId, user.id)).then(r => r[0] ?? null),
    db.select().from(clientPreferencesTable).where(eq(clientPreferencesTable.userId, user.id)).then(r => r[0] ?? null),
    db.select().from(producerProfilesTable).where(eq(producerProfilesTable.userId, user.id)).then(r => r[0] ?? null),
    db.select().from(adminProfilesTable).where(eq(adminProfilesTable.userId, user.id)).then(r => r[0] ?? null),
  ]);

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    role: user.role,
    onboardingComplete: user.onboardingComplete,
    avatar: user.avatar ?? null,

    // Profile (shared)
    phone: profile?.phone ?? null,
    whatsapp: profile?.whatsapp ?? null,
    city: profile?.city ?? null,
    country: profile?.country ?? null,
    bio: profile?.bio ?? null,

    // Client-specific
    stylePreferences: clientPref?.stylePreferences ?? [],
    preferredColours: clientPref?.preferredColours ?? [],
    budgetMin: clientPref?.budgetMin ?? null,
    budgetMax: clientPref?.budgetMax ?? null,
    styleNote: clientPref?.styleNote ?? null,

    // Designer-specific
    brandName: producerProf?.brandName ?? null,
    professionalName: producerProf?.professionalName ?? null,
    studioName: producerProf?.studioName ?? null,
    studioType: producerProf?.studioType ?? null,
    specialties: producerProf?.specialties ?? [],
    specialization: producerProf?.specialization ?? null,
    experience: producerProf?.experience ?? null,
    portfolioDescription: producerProf?.portfolioDescription ?? null,
    portfolioUrls: producerProf?.portfolioUrls ?? [],
    priceMin: producerProf?.priceMin ?? null,
    priceMax: producerProf?.priceMax ?? null,
    instagram: producerProf?.instagram ?? null,
    website: producerProf?.website ?? null,
    socialLinks: producerProf?.socialLinks ?? {},
    availability: producerProf?.availability ?? null,
    location: producerProf?.location ?? null,

    // Admin-specific
    permissions: adminProf?.permissions ?? [],
  };
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
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearTokenCookie(res: { clearCookie: (name: string, options: object) => void }): void {
  res.clearCookie("drape_token", { path: "/" });
}
