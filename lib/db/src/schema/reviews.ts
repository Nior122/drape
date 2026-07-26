import { pgTable, text, integer, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

export const reviewStatusEnum = pgEnum("review_status", ["PENDING", "APPROVED", "REJECTED", "FLAGGED"]);

export const reviewsTable = pgTable("reviews", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id").notNull().unique().references(() => ordersTable.id, { onDelete: "cascade" }),
  clientId: text("client_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  designerId: text("designer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),

  rating: integer("rating").notNull(),
  title: text("title"),
  comment: text("comment"),
  imageUrls: text("image_urls").array().default([]),
  status: reviewStatusEnum("status").notNull().default("APPROVED"),

  designerReply: text("designer_reply"),
  designerRepliedAt: timestamp("designer_replied_at", { withTimezone: true }),

  moderatorNote: text("moderator_note"),
  moderatedBy: text("moderated_by"),
  moderatedAt: timestamp("moderated_at", { withTimezone: true }),

  helpfulCount: integer("helpful_count").notNull().default(0),
  reportedCount: integer("reported_count").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("reviews_designer_idx").on(t.designerId),
  index("reviews_client_idx").on(t.clientId),
  index("reviews_rating_idx").on(t.rating),
  index("reviews_status_idx").on(t.status),
]);

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Review = typeof reviewsTable.$inferSelect;
