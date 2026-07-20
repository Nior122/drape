import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const clientPreferencesTable = pgTable("client_preferences", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  stylePreferences: text("style_preferences").array().notNull().default([]),
  budgetMin: integer("budget_min"),
  budgetMax: integer("budget_max"),
  styleNote: text("style_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClientPreferencesSchema = createInsertSchema(clientPreferencesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClientPreferences = z.infer<typeof insertClientPreferencesSchema>;
export type ClientPreferences = typeof clientPreferencesTable.$inferSelect;
