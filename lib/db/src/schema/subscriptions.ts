import { pgTable, text, integer, boolean, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free", "starter", "professional", "studio", "enterprise",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active", "trialing", "past_due", "cancelled", "expired", "incomplete",
]);

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),

  name: text("name").notNull(),
  key: subscriptionPlanEnum("key").notNull().unique(),
  description: text("description"),
  priceMonthly: integer("price_monthly").notNull().default(0),
  priceYearly: integer("price_yearly").notNull().default(0),
  currency: text("currency").notNull().default("USD"),

  // Feature flags
  maxProjects: integer("max_projects").notNull().default(0),
  maxInventory: integer("max_inventory").notNull().default(0),
  maxTeamMembers: integer("max_team_members").notNull().default(0),
  maxClients: integer("max_clients").notNull().default(0),
  hasAiStudio: boolean("has_ai_studio").notNull().default(false),
  hasVisionAi: boolean("has_vision_ai").notNull().default(false),
  hasAnalytics: boolean("has_analytics").notNull().default(false),
  hasInventory: boolean("has_inventory").notNull().default(false),
  hasInvoicing: boolean("has_invoicing").notNull().default(false),
  hasReports: boolean("has_reports").notNull().default(false),
  hasTeam: boolean("has_team").notNull().default(false),
  hasApiAccess: boolean("has_api_access").notNull().default(false),
  hasCustomBranding: boolean("has_custom_branding").notNull().default(false),
  hasPrioritySupport: boolean("has_priority_support").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const userSubscriptionsTable = pgTable("user_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),

  planKey: subscriptionPlanEnum("plan_key").notNull().default("free"),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  billingInterval: text("billing_interval").notNull().default("monthly"), // monthly | yearly
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull().defaultNow(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  paystackCustomerCode: text("paystack_customer_code"),
  flutterwaveCustomerId: text("flutterwave_customer_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("user_subscriptions_user_idx").on(t.userId),
  index("user_subscriptions_plan_idx").on(t.planKey),
]);

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptionsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type UserSubscription = typeof userSubscriptionsTable.$inferSelect;
