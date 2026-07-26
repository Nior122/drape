import { pgTable, text, integer, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT", "SENT", "PAID", "PARTIAL", "OVERDUE", "CANCELLED", "REFUNDED",
]);

export const invoicesTable = pgTable("invoices", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  clientId: text("client_id").references(() => usersTable.id, { onDelete: "set null" }),

  invoiceNumber: text("invoice_number").notNull(),
  status: invoiceStatusEnum("status").notNull().default("DRAFT"),
  items: jsonb("items").$type<Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>>().notNull().default([]),
  subtotal: integer("subtotal").notNull().default(0),
  taxRate: text("tax_rate").notNull().default("0"),
  taxAmount: integer("tax_amount").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  total: integer("total").notNull().default(0),
  amountPaid: integer("amount_paid").notNull().default(0),
  balanceDue: integer("balance_due").notNull().default(0),
  currency: text("currency").notNull().default("NGN"),

  clientName: text("client_name"),
  clientEmail: text("client_email"),
  clientAddress: text("client_address"),
  clientPhone: text("client_phone"),

  dueDate: timestamp("due_date", { withTimezone: true }),
  issueDate: timestamp("issue_date", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  notes: text("notes"),
  paymentTerms: text("payment_terms"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("invoices_user_idx").on(t.userId),
  index("invoices_client_idx").on(t.clientId),
  index("invoices_status_idx").on(t.status),
]);

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Invoice = typeof invoicesTable.$inferSelect;
