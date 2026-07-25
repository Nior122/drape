import { pgTable, text, boolean, timestamp, jsonb, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/* ── Prompt Templates ───────────────────────────────────────────── */
export const promptCategoryEnum = pgEnum("prompt_category", [
  "FASHION_DESIGN", "PRODUCTION", "MARKETING", "CLIENT_COMMUNICATION",
  "BRANDING", "PATTERN_MAKING", "PRICING", "COLLECTIONS", "GENERAL",
]);

export const promptTemplatesTable = pgTable("prompt_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: promptCategoryEnum("category").notNull().default("GENERAL"),
  prompt: text("prompt").notNull(),
  systemPrompt: text("system_prompt"),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  isFavourite: boolean("is_favourite").notNull().default(false),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ── AI Conversations Enhancement ────────────────────────────────── */
export const aiStudioConversationsTable = pgTable("ai_studio_conversations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New Design Session"),
  messages: jsonb("messages").$type<Array<{
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }>>().notNull().default([]),
  folderId: text("folder_id"),
  pinned: boolean("pinned").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  tags: text("tags").array().default([]),
  context: jsonb("context").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const aiStudioFoldersTable = pgTable("ai_studio_folders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#C08B4E"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── AI Memory ──────────────────────────────────────────────────── */
export const aiMemoryTable = pgTable("ai_memory", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value").notNull(),
  category: text("category").notNull().default("general"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ── AI Exports ─────────────────────────────────────────────────── */
export const aiExportsTable = pgTable("ai_exports", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id"),
  title: text("title").notNull(),
  format: text("format").notNull().default("md"),
  content: text("content").notNull(),
  attachedToProjectId: text("attached_to_project_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── AI Settings ────────────────────────────────────────────────── */
export const aiSettingsTable = pgTable("ai_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  model: text("model").notNull().default("openai/gpt-4o-mini"),
  temperature: integer("temperature").notNull().default(70),
  maxTokens: integer("max_tokens").notNull().default(2048),
  language: text("language").notNull().default("auto"),
  tone: text("tone").notNull().default("professional"),
  autoSave: boolean("auto_save").notNull().default(true),
  contextMemory: boolean("context_memory").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ── AI Collections ─────────────────────────────────────────────── */
export const aiCollectionsTable = pgTable("ai_collections", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  theme: text("theme"),
  season: text("season"),
  targetAudience: text("target_audience"),
  numberOfOutfits: integer("number_of_outfits"),
  concept: text("concept"),
  looks: jsonb("looks").$type<Array<{
    name: string;
    description: string;
    silhouette: string;
    colors: string[];
    fabrics: string[];
    styling: string;
  }>>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ── Insert Schemas ─────────────────────────────────────────────── */
export const insertPromptTemplateSchema = createInsertSchema(promptTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiStudioConversationSchema = createInsertSchema(aiStudioConversationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiStudioFolderSchema = createInsertSchema(aiStudioFoldersTable).omit({ id: true, createdAt: true });
export const insertAiMemorySchema = createInsertSchema(aiMemoryTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiExportSchema = createInsertSchema(aiExportsTable).omit({ id: true, createdAt: true });
export const insertAiSettingSchema = createInsertSchema(aiSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiCollectionSchema = createInsertSchema(aiCollectionsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type PromptTemplate = typeof promptTemplatesTable.$inferSelect;
export type AiStudioConversation = typeof aiStudioConversationsTable.$inferSelect;
export type AiStudioFolder = typeof aiStudioFoldersTable.$inferSelect;
export type AiMemory = typeof aiMemoryTable.$inferSelect;
export type AiExport = typeof aiExportsTable.$inferSelect;
export type AiSetting = typeof aiSettingsTable.$inferSelect;
export type AiCollection = typeof aiCollectionsTable.$inferSelect;
