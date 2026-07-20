import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const studioTypeEnum = pgEnum("studio_type", ["SOLO", "STUDIO"]);

export const producerProfilesTable = pgTable("producer_profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  studioName: text("studio_name"),
  studioType: studioTypeEnum("studio_type").notNull().default("SOLO"),
  specialties: text("specialties").array().notNull().default([]),
  bio: text("bio"),
  priceMin: integer("price_min"),
  priceMax: integer("price_max"),
  instagram: text("instagram"),
  portfolioUrls: text("portfolio_urls").array().notNull().default([]),
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
