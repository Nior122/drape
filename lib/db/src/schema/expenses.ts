import { pgTable, text, integer, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const expenseCategoryEnum = pgEnum("expense_category", [
  "FABRIC", "TRANSPORT", "LABOUR", "UTILITIES", "EQUIPMENT",
  "MARKETING", "RENT", "SUPPLIES", "SOFTWARE", "INSURANCE", "TAX", "OTHER",
]);

export const expensesTable = pgTable("expenses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),

  description: text("description").notNull(),
  category: expenseCategoryEnum("category").notNull().default("OTHER"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("NGN"),
  taxDeductible: text("tax_deductible").notNull().default("false"),
  receipt: text("receipt"),
  notes: text("notes"),
  vendor: text("vendor"),
  expenseDate: timestamp("expense_date", { withTimezone: true }).notNull().defaultNow(),
  projectId: text("project_id"),
  isRecurring: text("is_recurring").notNull().default("false"),
  recurringInterval: text("recurring_interval"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("expenses_user_idx").on(t.userId),
  index("expenses_category_idx").on(t.category),
  index("expenses_date_idx").on(t.expenseDate),
]);

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Expense = typeof expensesTable.$inferSelect;
