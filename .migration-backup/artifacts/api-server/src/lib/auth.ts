import { SignJWT, jwtVerify } from "jose";
import { db } from "@workspace/db";
import {
  usersTable,
  profilesTable,
  clientPreferencesTable,
  producerProfilesTable,
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
  role: "CLIENT" | "PRODUCER" | "ADMIN";
  onboardingComplete: boolean;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  stylePreferences: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  styleNote: string | null;
  studioName: string | null;
  studioType: string | null;
  specialties: string[];
  priceMin: number | null;
  priceMax: number | null;
  instagram: string | null;
  portfolioUrls: string[];
};

export async function buildUserPayload(user: User): Promise<AuthUserPayload> {
  const [profile, clientPref, producerProf] = await Promise.all([
    db.select().from(profilesTable).where(eq(profilesTable.userId, user.id)).then(r => r[0] ?? null),
    db.select().from(clientPreferencesTable).where(eq(clientPreferencesTable.userId, user.id)).then(r => r[0] ?? null),
    db.select().from(producerProfilesTable).where(eq(producerProfilesTable.userId, user.id)).then(r => r[0] ?? null),
  ]);

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    role: user.role,
    onboardingComplete: user.onboardingComplete,
    phone: profile?.phone ?? null,
    whatsapp: profile?.whatsapp ?? null,
    city: profile?.city ?? null,
    country: profile?.country ?? null,
    bio: profile?.bio ?? null,
    stylePreferences: clientPref?.stylePreferences ?? [],
    budgetMin: clientPref?.budgetMin ?? null,
    budgetMax: clientPref?.budgetMax ?? null,
    styleNote: clientPref?.styleNote ?? null,
    studioName: producerProf?.studioName ?? null,
    studioType: producerProf?.studioType ?? null,
    specialties: producerProf?.specialties ?? [],
    priceMin: producerProf?.priceMin ?? null,
    priceMax: producerProf?.priceMax ?? null,
    instagram: producerProf?.instagram ?? null,
    portfolioUrls: producerProf?.portfolioUrls ?? [],
  };
}

export function tokenFromRequest(req: { cookies?: Record<string, string>; headers: Record<string, string | string[] | undefined> }): string | null {
  if (req.cookies?.["drape_token"]) return req.cookies["drape_token"];
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export function setTokenCookie(res: { cookie: (name: string, value: string, options: object) => void }, token: string): void {
  res.cookie("drape_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearTokenCookie(res: { clearCookie: (name: string, options: object) => void }): void {
  res.clearCookie("drape_token", { path: "/" });
}
