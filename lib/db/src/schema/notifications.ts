import { pgTable, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const notificationTypeEnum = pgEnum("notification_type", [
  "ORDER_UPDATE",
  "MESSAGE",
  "LOOKBOOK_READY",
  "REVIEW_REQUEST",
  "GENERAL",
  "BRIEF_READY",
  "NEW_ORDER",
  "ORDER_ACCEPTED",
  "STATUS_UPDATED",
  "MEASUREMENTS_SUBMITTED",
  "PRODUCTION_GUIDE_READY",
  "REVIEW_RECEIVED",
]);

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull().default("GENERAL"),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  relatedId: text("related_id"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type Notification = typeof notificationsTable.$inferSelect;
