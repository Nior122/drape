import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const adminProfilesTable = pgTable("admin_profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),

  // Admin permissions — array of permission strings, e.g. ["manage_users", "manage_ai", "view_analytics", "manage_system"]
  permissions: jsonb("permissions").$type<string[]>().default([]).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAdminProfileSchema = createInsertSchema(adminProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAdminProfile = z.infer<typeof insertAdminProfileSchema>;
export type AdminProfile = typeof adminProfilesTable.$inferSelect;
