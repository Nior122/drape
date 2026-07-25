import { pgTable, text, integer, boolean, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { ordersTable } from "./orders";

/* ════════════════════════════════════════════════════════════════════
   PHASE 6 — Collaboration & Production Operating System
   ════════════════════════════════════════════════════════════════════ */

/* ── Project Status (Kanban columns) ────────────────────────────── */
export const projectStatusEnum = pgEnum("project_status", [
  "NEW_REQUEST", "CONSULTATION", "DESIGN_BRIEF", "DESIGNING", "CLIENT_REVIEW",
  "APPROVED", "PATTERN_CUTTING", "PRODUCTION", "QUALITY_CHECK", "PACKAGING",
  "DELIVERY", "COMPLETED", "ARCHIVED",
]);

export const projectPriorityEnum = pgEnum("project_priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);

/* ── Projects ───────────────────────────────────────────────────── */
export const projectsTable = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  clientId: text("client_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  designerId: text("designer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  orderId: text("order_id").references(() => ordersTable.id, { onDelete: "set null" }),

  title: text("title").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("NEW_REQUEST"),
  priority: projectPriorityEnum("priority").notNull().default("MEDIUM"),

  budget: integer("budget"),
  currency: text("currency").notNull().default("NGN"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  estimatedDays: integer("estimated_days"),

  tags: text("tags").array().default([]),
  colour: text("colour").default("#C08B4E"),

  statusChangedAt: timestamp("status_changed_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("projects_designer_idx").on(t.designerId),
  index("projects_client_idx").on(t.clientId),
  index("projects_status_idx").on(t.status),
]);

/* ── Team Roles ─────────────────────────────────────────────────── */
export const teamRoleEnum = pgEnum("team_role", [
  "OWNER", "MANAGER", "DESIGNER", "PATTERN_MAKER", "TAILOR",
  "PRODUCTION_STAFF", "QUALITY_INSPECTOR", "ASSISTANT",
]);

export const teamMemberStatusEnum = pgEnum("team_member_status", ["INVITED", "ACTIVE", "REMOVED"]);

/* ── Team Members ───────────────────────────────────────────────── */
export const teamMembersTable = pgTable("team_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studioId: text("studio_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  email: text("email"),
  role: teamRoleEnum("role").notNull().default("ASSISTANT"),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  status: teamMemberStatusEnum("status").notNull().default("INVITED"),
  invitedById: text("invited_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("team_members_studio_idx").on(t.studioId),
  index("team_members_user_idx").on(t.userId),
]);

/* ── Task Status & Priority ─────────────────────────────────────── */
export const taskStatusEnum = pgEnum("task_status", ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"]);
export const taskPriorityEnum = pgEnum("task_priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);

/* ── Project Tasks ──────────────────────────────────────────────── */
export const projectTasksTable = pgTable("project_tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  parentId: text("parent_id").references(() => projectTasksTable.id, { onDelete: "cascade" }),
  assigneeId: text("assignee_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdById: text("created_by_id").references(() => usersTable.id, { onDelete: "set null" }),

  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("TODO"),
  priority: taskPriorityEnum("priority").notNull().default("MEDIUM"),
  dueDate: timestamp("due_date", { withTimezone: true }),

  estimatedMinutes: integer("estimated_minutes"),
  actualMinutes: integer("actual_minutes"),

  checklist: jsonb("checklist").$type<Array<{ id: string; label: string; done: boolean }>>().default([]),
  dependencies: text("dependencies").array().default([]),
  tags: text("tags").array().default([]),

  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringPattern: text("recurring_pattern"),

  sortOrder: integer("sort_order").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("project_tasks_project_idx").on(t.projectId),
  index("project_tasks_assignee_idx").on(t.assigneeId),
  index("project_tasks_status_idx").on(t.status),
]);

/* ── Calendar Event Types ───────────────────────────────────────── */
export const calendarEventTypeEnum = pgEnum("calendar_event_type", [
  "MEETING", "CONSULTATION", "DEADLINE", "FITTING", "DELIVERY", "MILESTONE", "OTHER",
]);

/* ── Calendar Events ────────────────────────────────────────────── */
export const calendarEventsTable = pgTable("calendar_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: calendarEventTypeEnum("type").notNull().default("OTHER"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  location: text("location"),
  notes: text("notes"),
  attendees: jsonb("attendees").$type<Array<{ userId: string; name: string; email?: string }>>().default([]),
  isAllDay: boolean("is_all_day").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("calendar_events_user_idx").on(t.userId),
  index("calendar_events_project_idx").on(t.projectId),
  index("calendar_events_start_idx").on(t.startTime),
]);

/* ── Activity Logs ──────────────────────────────────────────────── */
export const activityLogsTable = pgTable("activity_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("activity_logs_project_idx").on(t.projectId),
  index("activity_logs_user_idx").on(t.userId),
  index("activity_logs_created_idx").on(t.createdAt),
]);

/* ── Project Files ──────────────────────────────────────────────── */
export const projectFileCategoryEnum = pgEnum("project_file_category", [
  "IMAGE", "SKETCH", "VIDEO", "PDF", "TECH_PACK", "PRODUCTION_GUIDE",
  "INVOICE", "MOOD_BOARD", "CONTRACT", "OTHER",
]);

export const projectFilesTable = pgTable("project_files", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  uploadedById: text("uploaded_by_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  parentId: text("parent_id").references(() => projectFilesTable.id, { onDelete: "set null" }), // version chain

  name: text("name").notNull(),
  category: projectFileCategoryEnum("category").notNull().default("OTHER"),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  path: text("path").notNull(),
  thumbnailPath: text("thumbnail_path"),

  folder: text("folder").default("/"),
  tags: text("tags").array().default([]),
  version: integer("version").notNull().default(1),
  description: text("description"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("project_files_project_idx").on(t.projectId),
  index("project_files_category_idx").on(t.category),
]);

/* ── Internal Notes (private, team-only) ────────────────────────── */
export const projectNotesTable = pgTable("project_notes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  mentions: text("mentions").array().default([]),
  attachments: jsonb("attachments").$type<Array<{ name: string; path: string }>>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("project_notes_project_idx").on(t.projectId),
]);

/* ── Client Collaboration (comments, approvals, revisions) ──────── */
export const collaborationTypeEnum = pgEnum("collaboration_type", [
  "COMMENT", "APPROVAL", "REJECTION", "REVISION_REQUEST", "REFERENCE_UPLOAD",
]);

export const projectCollaborationTable = pgTable("project_collaboration", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: collaborationTypeEnum("type").notNull().default("COMMENT"),
  content: text("content").notNull(),
  attachments: jsonb("attachments").$type<Array<{ name: string; path: string; type?: string }>>().default([]),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("project_collab_project_idx").on(t.projectId),
]);

/* ── Project Approvals (formal design approvals) ────────────────── */
export const approvalStatusEnum = pgEnum("project_approval_status", [
  "PENDING", "APPROVED", "REJECTED", "CHANGES_REQUESTED",
]);

export const projectApprovalsTable = pgTable("project_approvals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  requestedById: text("requested_by_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  decidedById: text("decided_by_id").references(() => usersTable.id, { onDelete: "set null" }),

  title: text("title").notNull(),
  description: text("description"),
  attachments: jsonb("attachments").$type<Array<{ name: string; path: string }>>().default([]),

  status: approvalStatusEnum("status").notNull().default("PENDING"),
  comment: text("comment"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("project_approvals_project_idx").on(t.projectId),
  index("project_approvals_status_idx").on(t.status),
]);

/* ── Project Timeline (milestones) ──────────────────────────────── */
export const projectTimelineTable = pgTable("project_timeline", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("project_timeline_project_idx").on(t.projectId),
]);

/* ── Workflow Automation Rules ──────────────────────────────────── */
export const automationRulesTable = pgTable("automation_rules", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studioId: text("studio_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(), // e.g. "project.status_changed", "task.completed"
  conditions: jsonb("conditions").$type<Record<string, unknown>>().default({}),
  actions: jsonb("actions").$type<Array<{ type: string; params: Record<string, unknown> }>>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  runCount: integer("run_count").notNull().default(0),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("automation_rules_studio_idx").on(t.studioId),
]);

/* ── Insert Schemas ─────────────────────────────────────────────── */
export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTeamMemberSchema = createInsertSchema(teamMembersTable).omit({ id: true, createdAt: true });
export const insertProjectTaskSchema = createInsertSchema(projectTasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCalendarEventSchema = createInsertSchema(calendarEventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({ id: true, createdAt: true });
export const insertProjectFileSchema = createInsertSchema(projectFilesTable).omit({ id: true, createdAt: true });
export const insertProjectNoteSchema = createInsertSchema(projectNotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectCollaborationSchema = createInsertSchema(projectCollaborationTable).omit({ id: true, createdAt: true });
export const insertProjectApprovalSchema = createInsertSchema(projectApprovalsTable).omit({ id: true, createdAt: true });
export const insertProjectTimelineSchema = createInsertSchema(projectTimelineTable).omit({ id: true, createdAt: true });
export const insertAutomationRuleSchema = createInsertSchema(automationRulesTable).omit({ id: true, createdAt: true });

/* ── Types ──────────────────────────────────────────────────────── */
export type Project = typeof projectsTable.$inferSelect;
export type TeamMember = typeof teamMembersTable.$inferSelect;
export type ProjectTask = typeof projectTasksTable.$inferSelect;
export type CalendarEvent = typeof calendarEventsTable.$inferSelect;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
export type ProjectFile = typeof projectFilesTable.$inferSelect;
export type ProjectNote = typeof projectNotesTable.$inferSelect;
export type ProjectCollaboration = typeof projectCollaborationTable.$inferSelect;
export type ProjectApproval = typeof projectApprovalsTable.$inferSelect;
export type ProjectTimeline = typeof projectTimelineTable.$inferSelect;
export type AutomationRule = typeof automationRulesTable.$inferSelect;
