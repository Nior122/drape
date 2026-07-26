import { pgTable, text, integer, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { invoicesTable } from "./invoices";

export const paymentMethodEnum = pgEnum("payment_method", [
  "STRIPE", "PAYSTACK", "FLUTTERWAVE", "BANK_TRANSFER", "CASH", "OTHER",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING", "SUCCESSFUL", "FAILED", "REFUNDED", "PARTIAL_REFUND",
]);

export const paymentTransactionsTable = pgTable("payment_transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  invoiceId: text("invoice_id").references(() => invoicesTable.id, { onDelete: "set null" }),

  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("NGN"),
  fee: integer("fee").notNull().default(0),
  net: integer("net").notNull().default(0),
  method: paymentMethodEnum("method").notNull(),
  status: paymentStatusEnum("status").notNull().default("PENDING"),
  reference: text("reference"),
  gatewayReference: text("gateway_reference"),
  gatewayResponse: jsonb("gateway_response"),

  description: text("description"),
  // For deposits / installments
  paymentType: text("payment_type").notNull().default("full"), // "deposit", "balance", "full", "refund"
  orderId: text("order_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("payment_transactions_user_idx").on(t.userId),
  index("payment_transactions_invoice_idx").on(t.invoiceId),
  index("payment_transactions_status_idx").on(t.status),
]);

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type PaymentTransaction = typeof paymentTransactionsTable.$inferSelect;
