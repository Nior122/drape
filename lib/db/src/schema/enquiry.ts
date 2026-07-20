import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

export const enquirySessionsTable = pgTable("enquiry_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id"),
  designerSlug: text("designer_slug"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  briefReady: boolean("brief_ready").default(false).notNull(),
});

export const enquiryMessagesTable = pgTable("enquiry_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id").notNull(),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  imageUrls: text("image_urls").array().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Brief status lifecycle:
// collecting → awaiting_confirmation → confirmed → finalized → forwarded
// At any point: revision_requested → awaiting_confirmation (loop)
export const briefsTable = pgTable("briefs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id").notNull().unique(),
  userId: text("user_id"),
  designerSlug: text("designer_slug"),

  // Lifecycle status
  status: text("status").default("collecting").notNull(),

  // Core brief fields
  gender: text("gender"),
  styleSummary: text("style_summary"),
  occasion: text("occasion"),
  garmentType: text("garment_type"),
  aestheticDirection: text("aesthetic_direction"),
  colorPalette: text("color_palette").array().default([]).notNull(),
  fabricPreferences: text("fabric_preferences"),
  silhouette: text("silhouette"),
  budgetMin: integer("budget_min"),
  budgetMax: integer("budget_max"),
  timelineDays: integer("timeline_days"),
  specialNotes: text("special_notes"),
  imagePrompts: text("image_prompts").array().default([]).notNull(),

  // Selected image (from lookbook)
  selectedImageId: text("selected_image_id"),
  selectedImageUrl: text("selected_image_url"),
  selectedPrompt: text("selected_prompt"),
  selectedPromptIndex: integer("selected_prompt_index"),
  selectedAt: timestamp("selected_at"),

  // Designer package — structured JSON payload sent to the designer
  designerPackage: jsonb("designer_package"),

  // Additional notes for the designer (internal)
  designerNotes: text("designer_notes"),

  // Confirmation
  confirmationAsked: boolean("confirmation_asked").default(false).notNull(),
  confirmedAt: timestamp("confirmed_at"),
  finalizedAt: timestamp("finalized_at"),
  forwardedAt: timestamp("forwarded_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const lookbookImagesTable = pgTable("lookbook_images", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  briefId: text("brief_id").notNull(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id"),
  objectPath: text("object_path").notNull(),
  prompt: text("prompt").notNull(),
  promptIndex: integer("prompt_index").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const briefRevisionsTable = pgTable("brief_revisions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  briefId: text("brief_id").notNull(),
  changeText: text("change_text").notNull(),
  source: text("source").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEnquirySessionSchema = createInsertSchema(enquirySessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEnquiryMessageSchema = createInsertSchema(enquiryMessagesTable).omit({ id: true, createdAt: true });
export const insertBriefSchema = createInsertSchema(briefsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLookbookImageSchema = createInsertSchema(lookbookImagesTable).omit({ id: true, createdAt: true });
export const insertBriefRevisionSchema = createInsertSchema(briefRevisionsTable).omit({ id: true, createdAt: true });

export type EnquirySession = typeof enquirySessionsTable.$inferSelect;
export type EnquiryMessage = typeof enquiryMessagesTable.$inferSelect;
export type Brief = typeof briefsTable.$inferSelect;
export type LookbookImage = typeof lookbookImagesTable.$inferSelect;
export type BriefRevision = typeof briefRevisionsTable.$inferSelect;
