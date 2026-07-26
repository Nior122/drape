import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const profileViewsTable = pgTable("profile_views", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  designerId: text("designer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  viewerId: text("viewer_id").references(() => usersTable.id, { onDelete: "set null" }),
  ipAddress: text("ip_address"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("profile_views_designer_idx").on(t.designerId),
  index("profile_views_created_idx").on(t.createdAt),
]);

export const marketplaceClicksTable = pgTable("marketplace_clicks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  designerId: text("designer_id").references(() => usersTable.id, { onDelete: "cascade" }),
  clickType: text("click_type").notNull(), // "profile_card", "contact", "book", "portfolio"
  viewerId: text("viewer_id").references(() => usersTable.id, { onDelete: "set null" }),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("marketplace_clicks_designer_idx").on(t.designerId),
  index("marketplace_clicks_type_idx").on(t.clickType),
]);

export const searchLogsTable = pgTable("search_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  query: text("query").notNull(),
  filters: text("filters"),
  resultCount: integer("result_count"),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("search_logs_query_idx").on(t.query),
  index("search_logs_created_idx").on(t.createdAt),
]);

export const insertProfileViewSchema = createInsertSchema(profileViewsTable).omit({ id: true, createdAt: true });
export type ProfileView = typeof profileViewsTable.$inferSelect;
