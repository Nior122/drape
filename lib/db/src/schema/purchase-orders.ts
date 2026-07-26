import { pgTable, text, integer, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { suppliersTable } from "./suppliers";

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "DRAFT", "ORDERED", "PARTIAL", "RECEIVED", "CANCELLED",
]);

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  supplierId: text("supplier_id").notNull().references(() => suppliersTable.id, { onDelete: "cascade" }),

  poNumber: text("po_number").notNull(),
  status: purchaseOrderStatusEnum("status").notNull().default("DRAFT"),
  items: jsonb("items").$type<Array<{
    itemId?: string;
    name: string;
    sku?: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    received: number;
  }>>().notNull().default([]),
  subtotal: integer("subtotal").notNull().default(0),
  tax: integer("tax").notNull().default(0),
  total: integer("total").notNull().default(0),
  notes: text("notes"),
  orderDate: timestamp("order_date", { withTimezone: true }).notNull().defaultNow(),
  expectedDate: timestamp("expected_date", { withTimezone: true }),
  receivedDate: timestamp("received_date", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("purchase_orders_user_idx").on(t.userId),
  index("purchase_orders_supplier_idx").on(t.supplierId),
]);

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
