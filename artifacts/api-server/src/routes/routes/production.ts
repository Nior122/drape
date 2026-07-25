import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { eq, and, desc, asc, like, or, sql, inArray, count, gte, lte } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import {
  projectsTable,
  teamMembersTable,
  projectTasksTable,
  calendarEventsTable,
  activityLogsTable,
  projectFilesTable,
  projectNotesTable,
  projectCollaborationTable,
  projectApprovalsTable,
  projectTimelineTable,
  automationRulesTable,
  usersTable,
  notificationsTable,
} from "@workspace/db";

const router: IRouter = Router();
router.use(requireAuth);

/* ════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════ */

/** Record an action in the activity log. Fire-and-forget safe. */
async function logActivity(
  projectId: string | null,
  userId: string | null,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(activityLogsTable).values({
      projectId, userId, action, entityType, entityId, metadata: metadata ?? {},
    });
  } catch (err) {
    console.error("[ACTIVITY] log failed:", err);
  }
}

/** Verify the user owns or is a team member of a project. Returns the project or null. */
async function getAuthorizedProject(projectId: string, userId: string) {
  const [project] = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.designerId, userId)));
  if (project) return project;
  // Check team membership
  const [membership] = await db.select().from(teamMembersTable)
    .innerJoin(projectsTable, eq(projectsTable.designerId, teamMembersTable.studioId))
    .where(and(eq(projectsTable.id, projectId), eq(teamMembersTable.userId, userId), eq(teamMembersTable.status, "ACTIVE")));
  if (membership) {
    const [p] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    return p ?? null;
  }
  return null;
}

const KANBAN_COLUMNS = [
  "NEW_REQUEST", "CONSULTATION", "DESIGN_BRIEF", "DESIGNING", "CLIENT_REVIEW",
  "APPROVED", "PATTERN_CUTTING", "PRODUCTION", "QUALITY_CHECK", "PACKAGING",
  "DELIVERY", "COMPLETED", "ARCHIVED",
];

/* ════════════════════════════════════════════════════════════════════
   PROJECTS — CRUD + Kanban
   ════════════════════════════════════════════════════════════════════ */

// List projects (kanban board data)
router.get("/production/projects", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { status, priority, search, archived } = req.query as Record<string, string | undefined>;

  const conditions = [eq(projectsTable.designerId, userId)];
  if (archived === "true") conditions.push(sql`${projectsTable.archivedAt} IS NOT NULL`);
  else conditions.push(sql`${projectsTable.archivedAt} IS NULL`);
  if (status) conditions.push(eq(projectsTable.status, status as typeof projectsTable.status._.data));
  if (priority) conditions.push(eq(projectsTable.priority, priority as typeof projectsTable.priority._.data));
  if (search) conditions.push(sql`(${projectsTable.title} ILIKE ${`%${search}%`} OR ${projectsTable.description} ILIKE ${`%${search}%`})`);

  const projects = await db.select().from(projectsTable)
    .where(and(...conditions))
    .orderBy(desc(projectsTable.updatedAt));

  // Attach task counts per project
  const projectIds = projects.map((p) => p.id);
  let taskCounts: Record<string, { total: number; done: number }> = {};
  if (projectIds.length > 0) {
    const tasks = await db.select({
      projectId: projectTasksTable.projectId,
      status: projectTasksTable.status,
    }).from(projectTasksTable).where(inArray(projectTasksTable.projectId, projectIds));
    for (const t of tasks) {
      if (!taskCounts[t.projectId]) taskCounts[t.projectId] = { total: 0, done: 0 };
      taskCounts[t.projectId].total++;
      if (t.status === "DONE") taskCounts[t.projectId].done++;
    }
  }

  res.json(projects.map((p) => ({ ...p, taskCount: taskCounts[p.id]?.total ?? 0, tasksDone: taskCounts[p.id]?.done ?? 0 })));
});

// Create project
router.post("/production/projects", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { clientId, title, description, priority, budget, currency, dueDate, estimatedDays, tags, colour } = req.body;
  if (!title?.trim() || !clientId) { res.status(400).json({ error: "title and clientId are required" }); return; }

  const [project] = await db.insert(projectsTable).values({
    clientId, designerId: userId, title: title.trim(), description: description ?? null,
    priority: priority ?? "MEDIUM", budget: budget ?? null, currency: currency ?? "NGN",
    dueDate: dueDate ? new Date(dueDate) : null, estimatedDays: estimatedDays ?? null,
    tags: tags ?? [], colour: colour ?? "#C08B4E",
  }).returning();

  // Seed default timeline milestones
  const defaultMilestones = [
    { label: "Consultation", order: 0 }, { label: "Design Approved", order: 1 },
    { label: "Fabric Purchased", order: 2 }, { label: "Production Started", order: 3 },
    { label: "Quality Check", order: 4 }, { label: "Completed", order: 5 },
  ];
  for (const m of defaultMilestones) {
    await db.insert(projectTimelineTable).values({
      projectId: project.id, label: m.label, sortOrder: m.order,
      date: dueDate ? new Date(dueDate) : new Date(),
    });
  }

  await logActivity(project.id, userId, "PROJECT_CREATED", "project", project.id, { title: project.title });
  res.status(201).json(project);
});

// Get single project (full workspace data)
router.get("/production/projects/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const project = await getAuthorizedProject(req.params.id, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [client, tasks, timeline, filesCount, notesCount, approvals, activity] = await Promise.all([
    db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, project.clientId)).then((r) => r[0] ?? null),
    db.select().from(projectTasksTable).where(eq(projectTasksTable.projectId, project.id)).orderBy(asc(projectTasksTable.sortOrder)),
    db.select().from(projectTimelineTable).where(eq(projectTimelineTable.projectId, project.id)).orderBy(asc(projectTimelineTable.sortOrder)),
    db.select({ count: count() }).from(projectFilesTable).where(eq(projectFilesTable.projectId, project.id)).then((r) => r[0]?.count ?? 0),
    db.select({ count: count() }).from(projectNotesTable).where(eq(projectNotesTable.projectId, project.id)).then((r) => r[0]?.count ?? 0),
    db.select().from(projectApprovalsTable).where(eq(projectApprovalsTable.projectId, project.id)).orderBy(desc(projectApprovalsTable.createdAt)),
    db.select().from(activityLogsTable).where(eq(activityLogsTable.projectId, project.id)).orderBy(desc(activityLogsTable.createdAt)).limit(20),
  ]);

  res.json({ project, client, tasks, timeline, filesCount, notesCount, approvals, activity });
});

// Update project
router.patch("/production/projects/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const project = await getAuthorizedProject(req.params.id, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const { title, description, priority, budget, currency, dueDate, estimatedDays, tags, colour, status } = req.body;
  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (description !== undefined) update.description = description;
  if (priority !== undefined) update.priority = priority;
  if (budget !== undefined) update.budget = budget;
  if (currency !== undefined) update.currency = currency;
  if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null;
  if (estimatedDays !== undefined) update.estimatedDays = estimatedDays;
  if (tags !== undefined) update.tags = tags;
  if (colour !== undefined) update.colour = colour;

  if (status !== undefined && status !== project.status) {
    if (!KANBAN_COLUMNS.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
    update.status = status;
    update.statusChangedAt = new Date();
    if (status === "COMPLETED") update.completedAt = new Date();
    if (status === "ARCHIVED") update.archivedAt = new Date();
    await logActivity(project.id, userId, "PROJECT_STATUS_CHANGED", "project", project.id, { from: project.status, to: status });
  }

  const [updated] = await db.update(projectsTable).set(update).where(eq(projectsTable.id, project.id)).returning();
  res.json(updated);
});

// Kanban move (dedicated endpoint for drag & drop)
router.patch("/production/projects/:id/move", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const project = await getAuthorizedProject(req.params.id, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const { status } = req.body as { status?: string };
  if (!status || !KANBAN_COLUMNS.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }

  const update: Record<string, unknown> = { status, statusChangedAt: new Date() };
  if (status === "COMPLETED") update.completedAt = new Date();
  if (status === "ARCHIVED") update.archivedAt = new Date();

  const [updated] = await db.update(projectsTable).set(update).where(eq(projectsTable.id, project.id)).returning();
  await logActivity(project.id, userId, "PROJECT_MOVED", "project", project.id, { from: project.status, to: status });
  res.json(updated);
});

// Delete project
router.delete("/production/projects/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [project] = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.id, req.params.id), eq(projectsTable.designerId, userId)));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  await db.delete(projectsTable).where(eq(projectsTable.id, project.id));
  res.json({ success: true });
});

/* ════════════════════════════════════════════════════════════════════
   TASKS
   ════════════════════════════════════════════════════════════════════ */

router.get("/production/projects/:id/tasks", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const project = await getAuthorizedProject(req.params.id, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const tasks = await db.select().from(projectTasksTable)
    .where(eq(projectTasksTable.projectId, project.id)).orderBy(asc(projectTasksTable.sortOrder));
  res.json(tasks);
});

router.post("/production/projects/:id/tasks", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const project = await getAuthorizedProject(req.params.id, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const { title, description, assigneeId, priority, dueDate, parentId, estimatedMinutes, checklist, tags } = req.body;
  if (!title?.trim()) { res.status(400).json({ error: "title is required" }); return; }

  const [task] = await db.insert(projectTasksTable).values({
    projectId: project.id, parentId: parentId ?? null, assigneeId: assigneeId ?? null,
    createdById: userId, title: title.trim(), description: description ?? null,
    priority: priority ?? "MEDIUM", dueDate: dueDate ? new Date(dueDate) : null,
    estimatedMinutes: estimatedMinutes ?? null, checklist: checklist ?? [], tags: tags ?? [],
  }).returning();

  await logActivity(project.id, userId, "TASK_CREATED", "task", task.id, { title: task.title });
  res.status(201).json(task);
});

router.patch("/production/tasks/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [task] = await db.select().from(projectTasksTable).where(eq(projectTasksTable.id, req.params.id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  const project = await getAuthorizedProject(task.projectId, userId);
  if (!project) { res.status(403).json({ error: "Not authorized" }); return; }

  const { title, description, assigneeId, priority, dueDate, status, estimatedMinutes, actualMinutes, checklist, tags, sortOrder } = req.body;
  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (description !== undefined) update.description = description;
  if (assigneeId !== undefined) update.assigneeId = assigneeId;
  if (priority !== undefined) update.priority = priority;
  if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null;
  if (estimatedMinutes !== undefined) update.estimatedMinutes = estimatedMinutes;
  if (actualMinutes !== undefined) update.actualMinutes = actualMinutes;
  if (checklist !== undefined) update.checklist = checklist;
  if (tags !== undefined) update.tags = tags;
  if (sortOrder !== undefined) update.sortOrder = sortOrder;

  if (status !== undefined && status !== task.status) {
    update.status = status;
    if (status === "DONE") update.completedAt = new Date();
    await logActivity(task.projectId, userId, "TASK_STATUS_CHANGED", "task", task.id, { from: task.status, to: status, title: task.title });
  }

  const [updated] = await db.update(projectTasksTable).set(update).where(eq(projectTasksTable.id, task.id)).returning();
  res.json(updated);
});

router.delete("/production/tasks/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [task] = await db.select().from(projectTasksTable).where(eq(projectTasksTable.id, req.params.id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  const project = await getAuthorizedProject(task.projectId, userId);
  if (!project) { res.status(403).json({ error: "Not authorized" }); return; }
  await db.delete(projectTasksTable).where(eq(projectTasksTable.id, task.id));
  await logActivity(task.projectId, userId, "TASK_DELETED", "task", task.id, { title: task.title });
  res.json({ success: true });
});

/* ════════════════════════════════════════════════════════════════════
   TEAM MANAGEMENT
   ════════════════════════════════════════════════════════════════════ */

router.get("/production/team", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const members = await db.select({
    member: teamMembersTable,
    user: { name: usersTable.name, email: usersTable.email, avatar: usersTable.avatar },
  }).from(teamMembersTable)
    .leftJoin(usersTable, eq(teamMembersTable.userId, usersTable.id))
    .where(eq(teamMembersTable.studioId, userId))
    .orderBy(desc(teamMembersTable.createdAt));
  res.json(members);
});

router.post("/production/team/invite", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { email, role, permissions } = req.body as { email?: string; role?: string; permissions?: string[] };
  if (!email?.trim()) { res.status(400).json({ error: "email is required" }); return; }

  // Check if user already exists
  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  const [member] = await db.insert(teamMembersTable).values({
    studioId: userId, userId: existingUser?.id ?? null, email,
    role: (role as typeof teamMembersTable.role._.data) ?? "ASSISTANT",
    permissions: permissions ?? [], status: existingUser ? "ACTIVE" : "INVITED",
    invitedById: userId, joinedAt: existingUser ? new Date() : null,
  }).returning();

  await logActivity(null, userId, "TEAM_MEMBER_INVITED", "team_member", member.id, { email, role });
  res.status(201).json(member);
});

router.patch("/production/team/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { role, permissions, status } = req.body;
  const [member] = await db.select().from(teamMembersTable)
    .where(and(eq(teamMembersTable.id, req.params.id), eq(teamMembersTable.studioId, userId)));
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const update: Record<string, unknown> = {};
  if (role !== undefined) update.role = role;
  if (permissions !== undefined) update.permissions = permissions;
  if (status !== undefined) update.status = status;

  const [updated] = await db.update(teamMembersTable).set(update).where(eq(teamMembersTable.id, member.id)).returning();
  res.json(updated);
});

router.delete("/production/team/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  await db.delete(teamMembersTable)
    .where(and(eq(teamMembersTable.id, req.params.id), eq(teamMembersTable.studioId, userId)));
  res.json({ success: true });
});

/* ════════════════════════════════════════════════════════════════════
   CALENDAR
   ════════════════════════════════════════════════════════════════════ */

router.get("/production/calendar", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { start, end, projectId } = req.query as Record<string, string | undefined>;
  const conditions = [eq(calendarEventsTable.userId, userId)];
  if (start) conditions.push(gte(calendarEventsTable.startTime, new Date(start)));
  if (end) conditions.push(lte(calendarEventsTable.startTime, new Date(end)));
  if (projectId) conditions.push(eq(calendarEventsTable.projectId, projectId));

  const events = await db.select().from(calendarEventsTable)
    .where(and(...conditions)).orderBy(asc(calendarEventsTable.startTime));
  res.json(events);
});

router.post("/production/calendar", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { title, type, startTime, endTime, location, notes, projectId, attendees, isAllDay } = req.body;
  if (!title?.trim() || !startTime) { res.status(400).json({ error: "title and startTime are required" }); return; }

  const [event] = await db.insert(calendarEventsTable).values({
    userId, projectId: projectId ?? null, title: title.trim(),
    type: type ?? "OTHER", startTime: new Date(startTime), endTime: endTime ? new Date(endTime) : null,
    location: location ?? null, notes: notes ?? null, attendees: attendees ?? [], isAllDay: isAllDay ?? false,
  }).returning();
  res.status(201).json(event);
});

router.patch("/production/calendar/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { title, type, startTime, endTime, location, notes, isAllDay } = req.body;
  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (type !== undefined) update.type = type;
  if (startTime !== undefined) update.startTime = new Date(startTime);
  if (endTime !== undefined) update.endTime = endTime ? new Date(endTime) : null;
  if (location !== undefined) update.location = location;
  if (notes !== undefined) update.notes = notes;
  if (isAllDay !== undefined) update.isAllDay = isAllDay;

  const [updated] = await db.update(calendarEventsTable).set(update)
    .where(and(eq(calendarEventsTable.id, req.params.id), eq(calendarEventsTable.userId, userId))).returning();
  if (!updated) { res.status(404).json({ error: "Event not found" }); return; }
  res.json(updated);
});

router.delete("/production/calendar/:id", async (req: Request, res: Response): Promise<void> => {
  await db.delete(calendarEventsTable)
    .where(and(eq(calendarEventsTable.id, req.params.id), eq(calendarEventsTable.userId, req.userId!)));
  res.json({ success: true });
});

/* ════════════════════════════════════════════════════════════════════
   ACTIVITY LOG
   ════════════════════════════════════════════════════════════════════ */

router.get("/production/activity", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { projectId, limit = "50" } = req.query as Record<string, string | undefined>;
  const conditions: ReturnType<typeof eq>[] = [];
  if (projectId) conditions.push(eq(activityLogsTable.projectId, projectId));
  else {
    // All activity for the user's projects
    const userProjects = await db.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.designerId, userId));
    const projectIds = userProjects.map((p) => p.id);
    if (projectIds.length === 0) { res.json([]); return; }
    conditions.push(inArray(activityLogsTable.projectId, projectIds));
  }

  const activity = await db.select({
    log: activityLogsTable,
    userName: usersTable.name,
  }).from(activityLogsTable)
    .leftJoin(usersTable, eq(activityLogsTable.userId, usersTable.id))
    .where(and(...conditions))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(parseInt(limit, 10));
  res.json(activity);
});

/* ════════════════════════════════════════════════════════════════════
   PROJECT FILES
   ════════════════════════════════════════════════════════════════════ */

router.get("/production/projects/:id/files", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const project = await getAuthorizedProject(req.params.id, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const { folder, category } = req.query as Record<string, string | undefined>;
  const conditions = [eq(projectFilesTable.projectId, project.id)];
  if (folder) conditions.push(eq(projectFilesTable.folder, folder));
  if (category) conditions.push(eq(projectFilesTable.category, category as typeof projectFilesTable.category._.data));

  const files = await db.select().from(projectFilesTable)
    .where(and(...conditions)).orderBy(desc(projectFilesTable.createdAt));
  res.json(files);
});

router.post("/production/projects/:id/files", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const project = await getAuthorizedProject(req.params.id, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const { name, category, mimeType, fileSize, path, folder, tags, description, base64Data } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }

  // If base64 provided, store as data URL (production: upload to R2/GCS)
  const storedPath = base64Data ? `data:${mimeType ?? "application/octet-stream"};base64,${base64Data}` : (path ?? "");

  const [file] = await db.insert(projectFilesTable).values({
    projectId: project.id, uploadedById: userId, name: name.trim(),
    category: category ?? "OTHER", mimeType: mimeType ?? null, fileSize: fileSize ?? null,
    path: storedPath, folder: folder ?? "/", tags: tags ?? [], description: description ?? null,
  }).returning();

  await logActivity(project.id, userId, "FILE_UPLOADED", "file", file.id, { name: file.name, category: file.category });
  res.status(201).json(file);
});

router.delete("/production/files/:id", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const [file] = await db.select().from(projectFilesTable).where(eq(projectFilesTable.id, req.params.id));
  if (!file) { res.status(404).json({ error: "File not found" }); return; }
  const project = await getAuthorizedProject(file.projectId, userId);
  if (!project) { res.status(403).json({ error: "Not authorized" }); return; }
  await db.delete(projectFilesTable).where(eq(projectFilesTable.id, file.id));
  res.json({ success: true });
});

/* ════════════════════════════════════════════════════════════════════
   INTERNAL NOTES (team-only)
   ════════════════════════════════════════════════════════════════════ */

router.get("/production/projects/:id/notes", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const project = await getAuthorizedProject(req.params.id, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const notes = await db.select({
    note: projectNotesTable, authorName: usersTable.name,
  }).from(projectNotesTable)
    .leftJoin(usersTable, eq(projectNotesTable.authorId, usersTable.id))
    .where(eq(projectNotesTable.projectId, project.id))
    .orderBy(desc(projectNotesTable.isPinned), desc(projectNotesTable.createdAt));
  res.json(notes);
});

router.post("/production/projects/:id/notes", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const project = await getAuthorizedProject(req.params.id, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const { content, isPinned, mentions, attachments } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }

  const [note] = await db.insert(projectNotesTable).values({
    projectId: project.id, authorId: userId, content: content.trim(),
    isPinned: isPinned ?? false, mentions: mentions ?? [], attachments: attachments ?? [],
  }).returning();
  await logActivity(project.id, userId, "NOTE_ADDED", "note", note.id);
  res.status(201).json(note);
});

router.patch("/production/notes/:id", async (req: Request, res: Response): Promise<void> => {
  const { content, isPinned } = req.body;
  const update: Record<string, unknown> = {};
  if (content !== undefined) update.content = content;
  if (isPinned !== undefined) update.isPinned = isPinned;
  const [updated] = await db.update(projectNotesTable).set(update).where(eq(projectNotesTable.id, req.params.id)).returning();
  if (!updated) { res.status(404).json({ error: "Note not found" }); return; }
  res.json(updated);
});

router.delete("/production/notes/:id", async (req: Request, res: Response): Promise<void> => {
  await db.delete(projectNotesTable).where(eq(projectNotesTable.id, req.params.id));
  res.json({ success: true });
});

/* ════════════════════════════════════════════════════════════════════
   CLIENT COLLABORATION (comments, revisions, references)
   ════════════════════════════════════════════════════════════════════ */

router.get("/production/projects/:id/collaboration", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const project = await getAuthorizedProject(req.params.id, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const items = await db.select({
    item: projectCollaborationTable, authorName: usersTable.name,
  }).from(projectCollaborationTable)
    .leftJoin(usersTable, eq(projectCollaborationTable.authorId, usersTable.id))
    .where(eq(projectCollaborationTable.projectId, project.id))
    .orderBy(desc(projectCollaborationTable.createdAt));
  res.json(items);
});

router.post("/production/projects/:id/collaboration", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const project = await getAuthorizedProject(req.params.id, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const { type, content, attachments } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }

  const [item] = await db.insert(projectCollaborationTable).values({
    projectId: project.id, authorId: userId, type: type ?? "COMMENT",
    content: content.trim(), attachments: attachments ?? [],
  }).returning();

  await logActivity(project.id, userId, `COLLABORATION_${(type ?? "COMMENT").toUpperCase()}`, "collaboration", item.id);
  // Notify the other party
  const notifyUserId = userId === project.designerId ? project.clientId : project.designerId;
  await db.insert(notificationsTable).values({
    userId: notifyUserId, type: "MESSAGE", title: "New project update",
    body: content.slice(0, 120), relatedId: project.id, link: `/client/projects/${project.id}`,
  });
  res.status(201).json(item);
});

/* ════════════════════════════════════════════════════════════════════
   PROJECT APPROVALS (formal design approvals)
   ════════════════════════════════════════════════════════════════════ */

router.get("/production/projects/:id/approvals", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const project = await getAuthorizedProject(req.params.id, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const approvals = await db.select().from(projectApprovalsTable)
    .where(eq(projectApprovalsTable.projectId, project.id)).orderBy(desc(projectApprovalsTable.createdAt));
  res.json(approvals);
});

router.post("/production/projects/:id/approvals", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const project = await getAuthorizedProject(req.params.id, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const { title, description, attachments } = req.body;
  if (!title?.trim()) { res.status(400).json({ error: "title is required" }); return; }

  const [approval] = await db.insert(projectApprovalsTable).values({
    projectId: project.id, requestedById: userId, title: title.trim(),
    description: description ?? null, attachments: attachments ?? [],
  }).returning();

  await logActivity(project.id, userId, "APPROVAL_REQUESTED", "approval", approval.id, { title });
  // Notify client
  await db.insert(notificationsTable).values({
    userId: project.clientId, type: "ORDER_UPDATE", title: "Design approval requested",
    body: `"${title}" is ready for your review.`, relatedId: project.id, link: `/client/projects/${project.id}`,
  });
  res.status(201).json(approval);
});

router.patch("/production/approvals/:id/decide", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { status, comment } = req.body as { status?: string; comment?: string };
  if (!status || !["APPROVED", "REJECTED", "CHANGES_REQUESTED"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }

  const [approval] = await db.select().from(projectApprovalsTable).where(eq(projectApprovalsTable.id, req.params.id));
  if (!approval) { res.status(404).json({ error: "Approval not found" }); return; }
  const project = await getAuthorizedProject(approval.projectId, userId);
  // Allow client (the requester's counterpart) to decide too
  const isClient = approval.projectId && project?.clientId === userId;
  if (!project && !isClient) { res.status(403).json({ error: "Not authorized" }); return; }

  const [updated] = await db.update(projectApprovalsTable).set({
    status: status as typeof projectApprovalsTable.status._.data,
    comment: comment ?? null, decidedById: userId, decidedAt: new Date(),
  }).where(eq(projectApprovalsTable.id, approval.id)).returning();

  await logActivity(approval.projectId, userId, `APPROVAL_${status}`, "approval", approval.id, { title: approval.title });
  res.json(updated);
});

/* ════════════════════════════════════════════════════════════════════
   PROJECT TIMELINE (milestones)
   ════════════════════════════════════════════════════════════════════ */

router.get("/production/projects/:id/timeline", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const project = await getAuthorizedProject(req.params.id, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const timeline = await db.select().from(projectTimelineTable)
    .where(eq(projectTimelineTable.projectId, project.id)).orderBy(asc(projectTimelineTable.sortOrder));
  res.json(timeline);
});

router.post("/production/projects/:id/timeline", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const project = await getAuthorizedProject(req.params.id, userId);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  const { label, date, notes, sortOrder } = req.body;
  if (!label?.trim() || !date) { res.status(400).json({ error: "label and date are required" }); return; }

  const [milestone] = await db.insert(projectTimelineTable).values({
    projectId: project.id, label: label.trim(), date: new Date(date),
    notes: notes ?? null, sortOrder: sortOrder ?? 0,
  }).returning();
  res.status(201).json(milestone);
});

router.patch("/production/timeline/:id", async (req: Request, res: Response): Promise<void> => {
  const { label, date, completed, notes, sortOrder } = req.body;
  const update: Record<string, unknown> = {};
  if (label !== undefined) update.label = label;
  if (date !== undefined) update.date = new Date(date);
  if (notes !== undefined) update.notes = notes;
  if (sortOrder !== undefined) update.sortOrder = sortOrder;
  if (completed !== undefined) {
    update.completed = completed;
    update.completedAt = completed ? new Date() : null;
  }
  const [updated] = await db.update(projectTimelineTable).set(update).where(eq(projectTimelineTable.id, req.params.id)).returning();
  if (!updated) { res.status(404).json({ error: "Milestone not found" }); return; }
  res.json(updated);
});

router.delete("/production/timeline/:id", async (req: Request, res: Response): Promise<void> => {
  await db.delete(projectTimelineTable).where(eq(projectTimelineTable.id, req.params.id));
  res.json({ success: true });
});

/* ════════════════════════════════════════════════════════════════════
   AUTOMATION RULES
   ════════════════════════════════════════════════════════════════════ */

router.get("/production/automation", async (req: Request, res: Response): Promise<void> => {
  const rules = await db.select().from(automationRulesTable)
    .where(eq(automationRulesTable.studioId, req.userId!)).orderBy(desc(automationRulesTable.createdAt));
  res.json(rules);
});

router.post("/production/automation", async (req: Request, res: Response): Promise<void> => {
  const { name, trigger, conditions, actions } = req.body;
  if (!name?.trim() || !trigger) { res.status(400).json({ error: "name and trigger are required" }); return; }
  const [rule] = await db.insert(automationRulesTable).values({
    studioId: req.userId!, name: name.trim(), trigger,
    conditions: conditions ?? {}, actions: actions ?? [],
  }).returning();
  res.status(201).json(rule);
});

router.patch("/production/automation/:id", async (req: Request, res: Response): Promise<void> => {
  const { name, trigger, conditions, actions, isActive } = req.body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (trigger !== undefined) update.trigger = trigger;
  if (conditions !== undefined) update.conditions = conditions;
  if (actions !== undefined) update.actions = actions;
  if (isActive !== undefined) update.isActive = isActive;
  const [updated] = await db.update(automationRulesTable).set(update)
    .where(and(eq(automationRulesTable.id, req.params.id), eq(automationRulesTable.studioId, req.userId!))).returning();
  if (!updated) { res.status(404).json({ error: "Rule not found" }); return; }
  res.json(updated);
});

router.delete("/production/automation/:id", async (req: Request, res: Response): Promise<void> => {
  await db.delete(automationRulesTable)
    .where(and(eq(automationRulesTable.id, req.params.id), eq(automationRulesTable.studioId, req.userId!)));
  res.json({ success: true });
});

/* ════════════════════════════════════════════════════════════════════
   DASHBOARD (aggregated stats)
   ════════════════════════════════════════════════════════════════════ */

router.get("/production/dashboard", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in7Days = new Date(); in7Days.setDate(in7Days.getDate() + 7);

  const [projects, tasks, overdueTasks, upcomingEvents, pendingApprovals, recentActivity] = await Promise.all([
    db.select().from(projectsTable).where(and(eq(projectsTable.designerId, userId), sql`${projectsTable.archivedAt} IS NULL`)),
    db.select().from(projectTasksTable)
      .innerJoin(projectsTable, eq(projectTasksTable.projectId, projectsTable.id))
      .where(eq(projectsTable.designerId, userId)),
    db.select({ count: count() }).from(projectTasksTable)
      .innerJoin(projectsTable, eq(projectTasksTable.projectId, projectsTable.id))
      .where(and(eq(projectsTable.designerId, userId), sql`${projectTasksTable.status} != 'DONE'`, lte(projectTasksTable.dueDate, today)))
      .then((r) => r[0]?.count ?? 0),
    db.select().from(calendarEventsTable)
      .where(and(eq(calendarEventsTable.userId, userId), gte(calendarEventsTable.startTime, today), lte(calendarEventsTable.startTime, in7Days)))
      .orderBy(asc(calendarEventsTable.startTime)),
    db.select({ count: count() }).from(projectApprovalsTable)
      .innerJoin(projectsTable, eq(projectApprovalsTable.projectId, projectsTable.id))
      .where(and(eq(projectsTable.designerId, userId), eq(projectApprovalsTable.status, "PENDING")))
      .then((r) => r[0]?.count ?? 0),
    db.select().from(activityLogsTable)
      .innerJoin(projectsTable, eq(activityLogsTable.projectId, projectsTable.id))
      .where(eq(projectsTable.designerId, userId))
      .orderBy(desc(activityLogsTable.createdAt)).limit(10),
  ]);

  // Status distribution for kanban summary
  const statusCounts: Record<string, number> = {};
  for (const p of projects) statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;

  const todaysTasks = tasks.filter((t) => {
    if (!t.projectTasks.dueDate) return false;
    const d = new Date(t.projectTasks.dueDate);
    return d.toDateString() === today.toDateString() && t.projectTasks.status !== "DONE";
  });

  res.json({
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => !["COMPLETED", "ARCHIVED"].includes(p.status)).length,
    statusCounts,
    totalTasks: tasks.length,
    tasksDone: tasks.filter((t) => t.projectTasks.status === "DONE").length,
    overdueTasks,
    todaysTasks: todaysTasks.map((t) => t.projectTasks),
    upcomingEvents,
    pendingApprovals,
    recentActivity,
  });
});

/* ════════════════════════════════════════════════════════════════════
   REPORTS
   ════════════════════════════════════════════════════════════════════ */

router.get("/production/reports", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projects = await db.select().from(projectsTable).where(eq(projectsTable.designerId, userId));

  const completed = projects.filter((p) => p.status === "COMPLETED");
  const cancelled = projects.filter((p) => p.status === "ARCHIVED");

  // Completion time analysis
  const completionTimes = completed
    .filter((p) => p.completedAt)
    .map((p) => ({
      id: p.id, title: p.title,
      days: Math.ceil((new Date(p.completedAt!).getTime() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
    }));
  const avgCompletionDays = completionTimes.length
    ? Math.round(completionTimes.reduce((sum, c) => sum + c.days, 0) / completionTimes.length)
    : 0;

  // Status distribution
  const statusDistribution: Record<string, number> = {};
  for (const p of projects) statusDistribution[p.status] = (statusDistribution[p.status] ?? 0) + 1;

  // Priority distribution
  const priorityDistribution: Record<string, number> = {};
  for (const p of projects) priorityDistribution[p.priority] = (priorityDistribution[p.priority] ?? 0) + 1;

  res.json({
    totalProjects: projects.length,
    completed: completed.length,
    cancelled: cancelled.length,
    active: projects.length - completed.length - cancelled.length,
    avgCompletionDays,
    completionTimes,
    statusDistribution,
    priorityDistribution,
    totalRevenue: projects.reduce((sum, p) => sum + (p.budget ?? 0), 0),
  });
});

/* ════════════════════════════════════════════════════════════════════
   GLOBAL SEARCH
   ════════════════════════════════════════════════════════════════════ */

router.get("/production/search", async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { q } = req.query as { q?: string };
  if (!q?.trim()) { res.json({ projects: [], tasks: [], files: [] }); return; }
  const term = `%${q.trim()}%`;

  const [projects, tasks, files] = await Promise.all([
    db.select().from(projectsTable)
      .where(and(eq(projectsTable.designerId, userId), or(like(projectsTable.title, term), like(projectsTable.description, term))))
      .limit(20),
    db.select({ task: projectTasksTable, projectTitle: projectsTable.title }).from(projectTasksTable)
      .innerJoin(projectsTable, eq(projectTasksTable.projectId, projectsTable.id))
      .where(and(eq(projectsTable.designerId, userId), like(projectTasksTable.title, term)))
      .limit(20),
    db.select({ file: projectFilesTable, projectTitle: projectsTable.title }).from(projectFilesTable)
      .innerJoin(projectsTable, eq(projectFilesTable.projectId, projectsTable.id))
      .where(and(eq(projectsTable.designerId, userId), like(projectFilesTable.name, term)))
      .limit(20),
  ]);

  res.json({ projects, tasks, files });
});

export default router;
