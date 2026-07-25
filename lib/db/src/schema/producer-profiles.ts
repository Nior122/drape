import { pgTable, text, integer, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const studioTypeEnum = pgEnum("studio_type", ["SOLO", "STUDIO", "ATELIER", "BRAND"]);

export const producerProfilesTable = pgTable("producer_profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),

  // Designer identity
  brandName: text("brand_name"),
  professionalName: text("professional_name"),
  bio: text("bio"),

  // Location & specialization
  location: text("location"),
  specialization: text("specialization"),
  specialties: text("specialties").array().notNull().default([]),

  // Studio info
  studioName: text("studio_name"),
  studioType: studioTypeEnum("studio_type").notNull().default("SOLO"),

  // Experience & portfolio
  experience: integer("experience"), // years
  portfolioDescription: text("portfolio_description"),
  portfolioUrls: text("portfolio_urls").array().notNull().default([]),

  // Pricing
  priceMin: integer("price_min"),
  priceMax: integer("price_max"),

  // Contact & social
  website: text("website"),
  instagram: text("instagram"),
  socialLinks: jsonb("social_links").$type<Record<string, string>>().default({}),

  // Availability
  availability: text("availability").default("available").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProducerProfileSchema = createInsertSchema(producerProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProducerProfile = z.infer<typeof insertProducerProfileSchema>;
export type ProducerProfile = typeof producerProfilesTable.$inferSelect;
