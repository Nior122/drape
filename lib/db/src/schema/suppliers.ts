import { pgTable, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const suppliersTable = pgTable("suppliers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  website: text("website"),

  productsSupplied: text("products_supplied").array().default([]),
  leadTimeDays: integer("lead_time_days"),
  rating: integer("rating"),
  notes: text("notes"),
  isActive: text("is_active").notNull().default("true"),

  totalPurchases: integer("total_purchases").notNull().default(0),
  outstandingAmount: integer("outstanding_amount").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("suppliers_user_idx").on(t.userId),
]);

export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Supplier = typeof suppliersTable.$inferSelect;
