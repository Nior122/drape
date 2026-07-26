import { pgTable, text, integer, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const inventoryCategoryEnum = pgEnum("inventory_category", [
  "FABRIC", "THREADS", "BUTTONS", "ZIPPERS", "ACCESSORIES",
  "PACKAGING", "LABELS", "EQUIPMENT", "OTHER",
]);

export const inventoryUnitEnum = pgEnum("inventory_unit", [
  "METER", "YARD", "PIECE", "ROLL", "SPOOL", "PACK", "SET", "KG", "GRAM", "LITER", "UNIT",
]);

export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "PURCHASE", "SALE", "RETURN", "ADJUSTMENT", "TRANSFER", "WASTE", "EXPIRED",
]);

export const inventoryItemsTable = pgTable("inventory_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  description: text("description"),
  category: inventoryCategoryEnum("category").notNull().default("OTHER"),
  sku: text("sku"),
  barcode: text("barcode"),
  unit: inventoryUnitEnum("unit").notNull().default("UNIT"),
  unitCost: integer("unit_cost"),
  sellingCost: integer("selling_cost"),
  quantity: integer("quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  storageLocation: text("storage_location"),
  supplierId: text("supplier_id"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("inventory_user_idx").on(t.userId),
  index("inventory_category_idx").on(t.category),
  index("inventory_sku_idx").on(t.sku),
]);

export const inventoryMovementsTable = pgTable("inventory_movements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull().references(() => inventoryItemsTable.id, { onDelete: "cascade" }),
  type: inventoryMovementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("inventory_movements_item_idx").on(t.itemId),
  index("inventory_movements_user_idx").on(t.userId),
]);

export const insertInventoryItemSchema = createInsertSchema(inventoryItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInventoryMovementSchema = createInsertSchema(inventoryMovementsTable).omit({ id: true, createdAt: true });

export type InventoryItem = typeof inventoryItemsTable.$inferSelect;
export type InventoryMovement = typeof inventoryMovementsTable.$inferSelect;
