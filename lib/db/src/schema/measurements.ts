import { pgTable, text, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const measurementUnitEnum = pgEnum("measurement_unit", ["cm", "in"]);

export const measurementsTable = pgTable("measurements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  unit: measurementUnitEnum("unit").notNull().default("cm"),
  data: jsonb("data").$type<Record<string, number | null>>().notNull().default({}),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMeasurementsSchema = createInsertSchema(measurementsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Measurements = typeof measurementsTable.$inferSelect;
