import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const businessSettingsTable = pgTable("business_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),

  brandName: text("brand_name"),
  brandLogo: text("brand_logo"),
  businessAddress: text("business_address"),
  currency: text("currency").notNull().default("NGN"),
  timezone: text("timezone").notNull().default("Africa/Lagos"),
  taxRate: text("tax_rate").notNull().default("0"),
  taxId: text("tax_id"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV-"),
  invoiceNextNumber: text("invoice_next_number").notNull().default("1"),
  defaultPaymentTerms: text("default_payment_terms").notNull().default("net30"),
  paymentInstructions: text("payment_instructions"),

  // Notification prefs
  notifyLowStock: text("notify_low_stock").notNull().default("true"),
  notifyNewOrder: text("notify_new_order").notNull().default("true"),
  notifyPayment: text("notify_payment").notNull().default("true"),
  notifyInvoiceOverdue: text("notify_invoice_overdue").notNull().default("true"),
  emailNotifications: text("email_notifications").notNull().default("true"),

  // Subscription
  subscriptionPlan: text("subscription_plan").notNull().default("free"),
  subscriptionStatus: text("subscription_status").notNull().default("active"),
  subscriptionStart: timestamp("subscription_start", { withTimezone: true }),
  subscriptionEnd: timestamp("subscription_end", { withTimezone: true }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBusinessSettingsSchema = createInsertSchema(businessSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type BusinessSettings = typeof businessSettingsTable.$inferSelect;
