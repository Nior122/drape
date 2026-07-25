import { pgTable, text, boolean, timestamp, jsonb, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

/* ── Image Analysis Status ──────────────────────────────────────── */
export const analysisStatusEnum = pgEnum("analysis_status", ["QUEUED", "PROCESSING", "COMPLETED", "FAILED"]);

/* ── Vision Images — uploaded by users ──────────────────────────── */
export const visionImagesTable = pgTable("vision_images", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => ordersTable.id, { onDelete: "set null" }),

  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size"),
  width: integer("width"),
  height: integer("height"),

  // Storage paths
  originalPath: text("original_path").notNull(),
  thumbnailPath: text("thumbnail_path"),
  optimisedPath: text("optimised_path"),

  // AI-generated metadata
  aiTags: text("ai_tags").array().default([]),
  aiDescription: text("ai_description"),
  dominantColors: jsonb("dominant_colors").$type<Array<{ hex: string; name: string; percentage: number }>>().default([]),
  garmentType: text("garment_type"),
  styleLabels: text("style_labels").array().default([]),

  // Tracking
  analysisStatus: analysisStatusEnum("analysis_status").notNull().default("QUEUED"),
  analysisId: text("analysis_id"), // FK to vision_analyses
  collectionId: text("collection_id"),
  isFavourite: boolean("is_favourite").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ── Vision Analyses — stored results for each analysis type ────── */
export const analysisTypeEnum = pgEnum("analysis_type", [
  "FULL", "FABRIC", "COLOUR", "DECONSTRUCT", "IMPROVE", "TREND", "COMPARE", "MOOD",
]);

export const visionAnalysesTable = pgTable("vision_analyses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  imageId: text("image_id").references(() => visionImagesTable.id, { onDelete: "cascade" }),
  compareImageId: text("compare_image_id"),

  type: analysisTypeEnum("type").notNull(),
  result: jsonb("result").$type<Record<string, unknown>>().notNull(),
  modelUsed: text("model_used"),
  tokensUsed: integer("tokens_used"),
  processingTimeMs: integer("processing_time_ms"),
  status: analysisStatusEnum("status").notNull().default("COMPLETED"),
  error: text("error"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Mood Boards ────────────────────────────────────────────────── */
export const moodBoardsTable = pgTable("mood_boards", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => ordersTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  theme: text("theme"),
  keywords: text("keywords").array().default([]),
  colourDirection: text("colour_direction"),
  styleDirection: text("style_direction"),
  trendSummary: text("trend_summary"),

  thumbnailUrl: text("thumbnail_url"),
  isArchived: boolean("is_archived").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ── Mood Board Items ───────────────────────────────────────────── */
export const moodBoardItemsTable = pgTable("mood_board_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  moodBoardId: text("mood_board_id").notNull().references(() => moodBoardsTable.id, { onDelete: "cascade" }),
  imageId: text("image_id").notNull().references(() => visionImagesTable.id, { onDelete: "cascade" }),
  positionX: integer("position_x").notNull().default(0),
  positionY: integer("position_y").notNull().default(0),
  width: integer("width").notNull().default(300),
  height: integer("height").notNull().default(300),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Vision Generations — AI-created images ────────────────────── */
export const visionGenerationsTable = pgTable("vision_generations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => ordersTable.id, { onDelete: "set null" }),

  prompt: text("prompt").notNull(),
  negativePrompt: text("negative_prompt"),
  modelUsed: text("model_used").notNull().default("FLUX.1-schnell"),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  width: integer("width").notNull().default(1024),
  height: integer("height").notNull().default(1024),
  isFavourite: boolean("is_favourite").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Image Tags — user-editable ─────────────────────────────────── */
export const imageTagsTable = pgTable("image_tags", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  imageId: text("image_id").notNull().references(() => visionImagesTable.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
  source: text("source").notNull().default("user"), // "ai" | "user"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Insert Schemas ─────────────────────────────────────────────── */
export const insertVisionImageSchema = createInsertSchema(visionImagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVisionAnalysisSchema = createInsertSchema(visionAnalysesTable).omit({ id: true, createdAt: true });
export const insertMoodBoardSchema = createInsertSchema(moodBoardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMoodBoardItemSchema = createInsertSchema(moodBoardItemsTable).omit({ id: true, createdAt: true });
export const insertVisionGenerationSchema = createInsertSchema(visionGenerationsTable).omit({ id: true, createdAt: true });
export const insertImageTagSchema = createInsertSchema(imageTagsTable).omit({ id: true, createdAt: true });

/* ── Types ───────────────────────────────────────────────────────── */
export type VisionImage = typeof visionImagesTable.$inferSelect;
export type VisionAnalysis = typeof visionAnalysesTable.$inferSelect;
export type MoodBoard = typeof moodBoardsTable.$inferSelect;
export type MoodBoardItem = typeof moodBoardItemsTable.$inferSelect;
export type VisionGeneration = typeof visionGenerationsTable.$inferSelect;
export type ImageTag = typeof imageTagsTable.$inferSelect;
