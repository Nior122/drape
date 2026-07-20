import { pgTable, text, integer, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const orderStatusEnum = pgEnum("order_status", [
  "ENQUIRY", "ACCEPTED", "DEPOSIT_PAID", "IN_PRODUCTION", "FITTING", "FINAL_PAYMENT", "DELIVERED", "COMPLETED", "CANCELLED",
]);

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text("client_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  producerId: text("producer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  briefId: text("brief_id"),
  sessionId: text("session_id"),
  status: orderStatusEnum("status").notNull().default("ENQUIRY"),
  title: text("title").notNull(),
  description: text("description"),
  agreedPrice: integer("agreed_price"),
  currency: text("currency").notNull().default("GBP"),
  depositPaid: boolean("deposit_paid").notNull().default(false),
  dueDate: timestamp("due_date", { withTimezone: true }),
  estimatedDays: integer("estimated_days"),
  notes: text("notes"),
  timelineEvents: jsonb("timeline_events")
    .$type<Array<{ date: string; label: string; completed: boolean; note?: string }>>()
    .default([]),
  productionGuideContent: jsonb("production_guide_content").$type<{
    garmentType: string;
    orderSummary: string;
    fabricNotes: string;
    cuttingGuide: string[];
    sewingSequence: string[];
    finishingSteps: string[];
    fittingChecklist: string[];
    qualityChecklist: string[];
    technicalNotes: string;
    estimatedHours: number;
  } | null>().default(null),
  productionGuideAt: timestamp("production_guide_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const orderReviewsTable = pgTable("order_reviews", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  clientId: text("client_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderMessagesTable = pgTable("order_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  senderRole: text("sender_role").notNull(),
  content: text("content").notNull(),
  readByClient: boolean("read_by_client").notNull().default(false),
  readByProducer: boolean("read_by_producer").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderReviewSchema = createInsertSchema(orderReviewsTable).omit({ id: true, createdAt: true });
export const insertOrderMessageSchema = createInsertSchema(orderMessagesTable).omit({ id: true, createdAt: true });

export type Order = typeof ordersTable.$inferSelect;
export type OrderReview = typeof orderReviewsTable.$inferSelect;
export type OrderMessage = typeof orderMessagesTable.$inferSelect;
