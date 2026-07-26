import { pgTable, text, integer, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const bookingTypeEnum = pgEnum("booking_type", [
  "CONSULTATION", "MEASUREMENTS", "VIRTUAL_MEETING", "STUDIO_VISIT", "FITTING",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING", "CONFIRMED", "RESCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW",
]);

export const bookingsTable = pgTable("bookings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text("client_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  designerId: text("designer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  orderId: text("order_id"),

  type: bookingTypeEnum("type").notNull().default("CONSULTATION"),
  status: bookingStatusEnum("status").notNull().default("PENDING"),
  title: text("title").notNull(),
  notes: text("notes"),

  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  timezone: text("timezone").notNull().default("UTC"),

  location: text("location"),
  meetingLink: text("meeting_link"),
  isVirtual: boolean("is_virtual").notNull().default(false),

  reminderSent: boolean("reminder_sent").notNull().default(false),
  reminderAt: timestamp("reminder_at", { withTimezone: true }),
  cancelledBy: text("cancelled_by"),
  cancellationReason: text("cancellation_reason"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("bookings_designer_idx").on(t.designerId),
  index("bookings_client_idx").on(t.clientId),
  index("bookings_time_idx").on(t.startTime),
]);

export const designerAvailabilityTable = pgTable("designer_availability", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  designerId: text("designer_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),

  monday: text("monday").notNull().default("[]"),
  tuesday: text("tuesday").notNull().default("[]"),
  wednesday: text("wednesday").notNull().default("[]"),
  thursday: text("thursday").notNull().default("[]"),
  friday: text("friday").notNull().default("[]"),
  saturday: text("saturday").notNull().default("[]"),
  sunday: text("sunday").notNull().default("[]"),

  timezone: text("timezone").notNull().default("UTC"),
  bufferMinutes: integer("buffer_minutes").notNull().default(30),
  isActive: boolean("is_active").notNull().default(true),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Booking = typeof bookingsTable.$inferSelect;
