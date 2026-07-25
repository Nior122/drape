import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { getToken } from "@/lib/token-storage";
import { cn, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Package, CheckSquare, Calendar, FileText, StickyNote,
  MessageSquare, ShieldCheck, Activity, Plus, Trash2, Pin, Clock,
  AlertTriangle, CheckCircle2, XCircle, User, Mail, Download, Upload,
  ChevronRight, Circle, PlayCircle,
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

interface Task {
  id: string; title: string; description?: string; status: string; priority: string;
  dueDate?: string; checklist?: Array<{ id: string; label: string; done: boolean }>;
  estimatedMinutes?: number; actualMinutes?: number;
}
interface TimelineItem { id: string; label: string; date: string; completed: boolean; notes?: string; sortOrder: number; }
interface Note { note: { id: string; content: string; isPinned: boolean; createdAt: string }; authorName?: string; }
interface CollabItem { item: { id: string; type: string; content: string; createdAt: string; resolved: boolean }; authorName?: string; }
interface Approval { id: string; title: string; description?: string; status: string; comment?: string; createdAt: string; decidedAt?: string; }
interface ActivityItem { log: { id: string; action: string; createdAt: string; metadata?: Record<string, unknown> }; userName?: string; }

const TASK_STATUS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  TODO: { label: "To Do", icon: Circle, color: "text-slate-400" },
  IN_PROGRESS: { label: "In Progress", icon: PlayCircle, color: "text-blue-400" },
  REVIEW: { label: "Review", icon: Clock, color: "text-amber-400" },
  DONE: { label: "Done", icon: CheckCircle2, color: "text-green-400" },
  BLOCKED: { label: "Blocked", icon: AlertTriangle, color: "text-red-400" },
};

const APPROVAL_STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-400/10 text-amber-400" },
  APPROVED: { label: "Approved", className: "bg-green-400/10 text-green-400" },
  REJECTED: { label: "Rejected", className: "bg-red-400/10 text-red-400" },
  CHANGES_REQUESTED: { label: "Changes Requested", className: "bg-orange-400/10 text-orange-400" },
};

export default function ProjectWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const fetchUrl = (path: string) => fetch(`${API_BASE}${path}`, { headers });

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newApprovalTitle, setNewApprovalTitle] = useState("");
  const [newMilestone, setNewMilestone] = useState({ label: "", date: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["production", "project", id],
    queryFn: () => fetchUrl(`/api/production/projects/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: files = [] } = useQuery({
    queryKey: ["production", "project", id, "files"],
    queryFn: () => fetchUrl(`/api/production/projects/${id}/files`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: collab = [] } = useQuery({
    queryKey: ["production", "project", id, "collab"],
    queryFn: () => fetchUrl(`/api/production/projects/${id}/collaboration`).then((r) => r.json()),
    enabled: !!id,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["production", "project", id] });

  const createTask = useMutation({
    mutationFn: () => fetchUrl(`/api/production/projects/${id}/tasks`, { method: "POST", headers, body: JSON.stringify({ title: newTaskTitle }) }).then((r) => r.json()),
    onSuccess: () => { setNewTaskTitle(""); invalidate(); },
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, ...body }: Record<string, unknown>) => fetchUrl(`/api/production/tasks/${taskId}`, { method: "PATCH", headers, body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });

  const addNote = useMutation({
    mutationFn: () => fetchUrl(`/api/production/projects/${id}/notes`, { method: "POST", headers, body: JSON.stringify({ content: newNote }) }).then((r) => r.json()),
    onSuccess: () => { setNewNote(""); invalidate(); },
  });

  const togglePin = useMutation({
    mutationFn: ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => fetchUrl(`/api/production/notes/${noteId}`, { method: "PATCH", headers, body: JSON.stringify({ isPinned }) }),
    onSuccess: invalidate,
  });

  const addComment = useMutation({
    mutationFn: (type: string) => fetchUrl(`/api/production/projects/${id}/collaboration`, { method: "POST", headers, body: JSON.stringify({ type, content: newComment }) }).then((r) => r.json()),
    onSuccess: () => { setNewComment(""); qc.invalidateQueries({ queryKey: ["production", "project", id, "collab"] }); },
  });

  const requestApproval = useMutation({
    mutationFn: () => fetchUrl(`/api/production/projects/${id}/approvals`, { method: "POST", headers, body: JSON.stringify({ title: newApprovalTitle }) }).then((r) => r.json()),
    onSuccess: () => { setNewApprovalTitle(""); invalidate(); toast({ description: "Approval requested — client notified." }); },
  });

  const decideApproval = useMutation({
    mutationFn: ({ approvalId, status }: { approvalId: string; status: string }) => fetchUrl(`/api/production/approvals/${approvalId}/decide`, { method: "PATCH", headers, body: JSON.stringify({ status }) }),
    onSuccess: invalidate,
  });

  const addMilestone = useMutation({
    mutationFn: () => fetchUrl(`/api/production/projects/${id}/timeline`, { method: "POST", headers, body: JSON.stringify(newMilestone) }).then((r) => r.json()),
    onSuccess: () => { setNewMilestone({ label: "", date: "" }); invalidate(); },
  });

  const toggleMilestone = useMutation({
    mutationFn: ({ timelineId, completed }: { timelineId: string; completed: boolean }) => fetchUrl(`/api/production/timeline/${timelineId}`, { method: "PATCH", headers, body: JSON.stringify({ completed }) }),
    onSuccess: invalidate,
  });

  if (isLoading || !data) {
    return <div className="flex items-center justify-center h-full"><div className="animate-pulse text-muted-foreground">Loading project...</div></div>;
  }

  const { project, client, tasks = [], timeline = [], approvals = [], activity = [] } = data;
  const progress = tasks.length > 0 ? Math.round((tasks.filter((t: Task) => t.status === "DONE").length / tasks.length) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <Link href="/designer/projects" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-3 w-3" /> Production Board
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-serif font-medium">{project.title}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="outline" className="text-[10px]">{project.status.replace(/_/g, " ")}</Badge>
              <Badge variant="outline" className="text-[10px]">{project.priority}</Badge>
              {project.dueDate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Due {formatDate(project.dueDate)}</span>}
            </div>
          </div>
          <div className="text-right">
            {project.budget != null && <p className="text-lg font-semibold">{project.currency} {project.budget.toLocaleString()}</p>}
            <p className="text-xs text-muted-foreground">{progress}% of tasks done</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden max-w-md">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="px-6 py-2 bg-transparent border-b border-border rounded-none h-auto w-full justify-start gap-1 shrink-0">
          {[
            { id: "overview", label: "Overview", icon: Package },
            { id: "tasks", label: "Tasks", icon: CheckSquare },
            { id: "timeline", label: "Timeline", icon: Calendar },
            { id: "files", label: "Files", icon: FileText },
            { id: "notes", label: "Notes", icon: StickyNote },
            { id: "collaboration", label: "Collaboration", icon: MessageSquare },
            { id: "approvals", label: "Approvals", icon: ShieldCheck },
            { id: "activity", label: "Activity", icon: Activity },
          ].map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="m-0 p-6">
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Client</h3>
                {client ? (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{client.name ?? "Unnamed client"}</p>
                    {client.email && <p className="text-muted-foreground flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {client.email}</p>}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No client linked.</p>}
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-3">Project Details</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Status:</span> {project.status.replace(/_/g, " ")}</p>
                  <p><span className="text-muted-foreground">Priority:</span> {project.priority}</p>
                  <p><span className="text-muted-foreground">Estimated:</span> {project.estimatedDays ? `${project.estimatedDays} days` : "—"}</p>
                  <p><span className="text-muted-foreground">Created:</span> {formatDate(project.createdAt)}</p>
                </div>
              </div>
              {project.description && (
                <div className="md:col-span-2 bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── TASKS ── */}
          <TabsContent value="tasks" className="m-0 p-6">
            <div className="max-w-3xl">
              <div className="flex gap-2 mb-4">
                <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Add a task..."
                  onKeyDown={(e) => e.key === "Enter" && newTaskTitle.trim() && createTask.mutate()} className="flex-1" />
                <Button onClick={() => createTask.mutate()} disabled={!newTaskTitle.trim()} className="bg-primary hover:bg-primary/80"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                {(tasks as Task[]).map((task) => {
                  const st = TASK_STATUS[task.status] ?? TASK_STATUS.TODO;
                  return (
                    <div key={task.id} className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 group">
                      <button onClick={() => updateTask.mutate({ taskId: task.id, status: task.status === "DONE" ? "TODO" : "DONE" })}>
                        <st.icon className={cn("h-5 w-5 transition-colors", st.color)} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm", task.status === "DONE" && "line-through text-muted-foreground")}>{task.title}</p>
                        {task.dueDate && <p className="text-[11px] text-muted-foreground">{formatDate(task.dueDate)}</p>}
                      </div>
                      <select value={task.status} onChange={(e) => updateTask.mutate({ taskId: task.id, status: e.target.value })}
                        className="text-xs bg-muted/30 border border-border rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  );
                })}
                {tasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No tasks yet. Add one above.</p>}
              </div>
            </div>
          </TabsContent>

          {/* ── TIMELINE ── */}
          <TabsContent value="timeline" className="m-0 p-6">
            <div className="max-w-2xl">
              <div className="flex gap-2 mb-6">
                <Input value={newMilestone.label} onChange={(e) => setNewMilestone((m) => ({ ...m, label: e.target.value }))} placeholder="Milestone label..." className="flex-1" />
                <Input type="date" value={newMilestone.date} onChange={(e) => setNewMilestone((m) => ({ ...m, date: e.target.value }))} className="w-40" />
                <Button onClick={() => addMilestone.mutate()} disabled={!newMilestone.label || !newMilestone.date} className="bg-primary hover:bg-primary/80"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="relative space-y-0">
                {(timeline as TimelineItem[]).map((m, i) => {
                  const overdue = !m.completed && new Date(m.date) < new Date();
                  return (
                    <div key={m.id} className="relative flex gap-4 pb-6">
                      {i < timeline.length - 1 && <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />}
                      <button onClick={() => toggleMilestone.mutate({ timelineId: m.id, completed: !m.completed })}
                        className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 z-10 transition-colors",
                          m.completed ? "bg-primary border-primary" : overdue ? "border-red-400" : "border-muted-foreground/40")}>
                        {m.completed && <CheckCircle2 className="h-4 w-4 text-primary-foreground" />}
                      </button>
                      <div className="flex-1">
                        <p className={cn("text-sm font-medium", m.completed && "text-muted-foreground line-through")}>{m.label}</p>
                        <p className={cn("text-xs", overdue ? "text-red-400" : "text-muted-foreground")}>{formatDate(m.date)}{overdue && " — overdue"}</p>
                      </div>
                    </div>
                  );
                })}
                {timeline.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No milestones yet.</p>}
              </div>
            </div>
          </TabsContent>

          {/* ── FILES ── */}
          <TabsContent value="files" className="m-0 p-6">
            <div className="max-w-3xl">
              <div className="grid md:grid-cols-3 gap-3">
                {(files as Array<{ id: string; name: string; category: string; createdAt: string; path: string }>).map((f) => (
                  <div key={f.id} className="bg-card border border-border rounded-lg p-4 group hover:border-primary/40 transition-colors">
                    <FileText className="h-6 w-6 text-primary/60 mb-2" />
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-[11px] text-muted-foreground">{f.category} · {formatDate(f.createdAt)}</p>
                    {f.path.startsWith("data:image") && <img src={f.path} alt={f.name} className="mt-2 rounded w-full h-24 object-cover" />}
                  </div>
                ))}
                {files.length === 0 && <p className="md:col-span-3 text-sm text-muted-foreground text-center py-8">No files uploaded yet.</p>}
              </div>
            </div>
          </TabsContent>

          {/* ── NOTES (internal) ── */}
          <TabsContent value="notes" className="m-0 p-6">
            <div className="max-w-2xl">
              <div className="flex gap-2 mb-4">
                <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add an internal note (private to your team)..." className="min-h-[70px] flex-1" />
                <Button onClick={() => addNote.mutate()} disabled={!newNote.trim()} className="bg-primary hover:bg-primary/80 self-end"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-3">
                {(data.notes ?? []).length === 0 && <NotesList notes={[]} />}
                <NotesList notes={data.notes ?? []} onTogglePin={(noteId, isPinned) => togglePin.mutate({ noteId, isPinned })} />
              </div>
            </div>
          </TabsContent>

          {/* ── COLLABORATION ── */}
          <TabsContent value="collaboration" className="m-0 p-6">
            <div className="max-w-2xl">
              <div className="flex gap-2 mb-4">
                <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Post an update for the client..." className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && newComment.trim() && addComment.mutate("COMMENT")} />
                <Button onClick={() => addComment.mutate("COMMENT")} disabled={!newComment.trim()} className="bg-primary hover:bg-primary/80">Send</Button>
              </div>
              <div className="space-y-3">
                {(collab as CollabItem[]).map((c) => (
                  <div key={c.item.id} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">{c.authorName ?? "Team"}</span>
                      <Badge variant="outline" className="text-[9px]">{c.item.type.replace(/_/g, " ")}</Badge>
                      <span className="text-[11px] text-muted-foreground ml-auto">{formatDate(c.item.createdAt)}</span>
                    </div>
                    <p className="text-sm">{c.item.content}</p>
                  </div>
                ))}
                {collab.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No collaboration yet.</p>}
              </div>
            </div>
          </TabsContent>

          {/* ── APPROVALS ── */}
          <TabsContent value="approvals" className="m-0 p-6">
            <div className="max-w-2xl">
              <div className="flex gap-2 mb-4">
                <Input value={newApprovalTitle} onChange={(e) => setNewApprovalTitle(e.target.value)} placeholder="Request approval for... (e.g. Final design concept)" className="flex-1" />
                <Button onClick={() => requestApproval.mutate()} disabled={!newApprovalTitle.trim()} className="bg-primary hover:bg-primary/80">Request</Button>
              </div>
              <div className="space-y-3">
                {(approvals as Approval[]).map((a) => {
                  const st = APPROVAL_STATUS[a.status] ?? APPROVAL_STATUS.PENDING;
                  return (
                    <div key={a.id} className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">{a.title}</p>
                        <Badge className={cn("text-[10px]", st.className)}>{st.label}</Badge>
                      </div>
                      {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">Requested {formatDate(a.createdAt)}</p>
                      {a.status === "PENDING" && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" onClick={() => decideApproval.mutate({ approvalId: a.id, status: "APPROVED" })} className="bg-green-600 hover:bg-green-700 text-white gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => decideApproval.mutate({ approvalId: a.id, status: "CHANGES_REQUESTED" })} className="gap-1"><ChevronRight className="h-3.5 w-3.5" /> Request Changes</Button>
                          <Button size="sm" variant="outline" onClick={() => decideApproval.mutate({ approvalId: a.id, status: "REJECTED" })} className="text-red-400 gap-1"><XCircle className="h-3.5 w-3.5" /> Reject</Button>
                        </div>
                      )}
                      {a.comment && <p className="text-xs mt-2 p-2 bg-muted/30 rounded">"{a.comment}"</p>}
                    </div>
                  );
                })}
                {approvals.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No approvals requested yet.</p>}
              </div>
            </div>
          </TabsContent>

          {/* ── ACTIVITY ── */}
          <TabsContent value="activity" className="m-0 p-6">
            <div className="max-w-2xl space-y-2">
              {(activity as ActivityItem[]).map((a) => (
                <div key={a.log.id} className="flex items-center gap-3 text-sm py-2 border-b border-border/50 last:border-0">
                  <Activity className="h-4 w-4 text-primary/50 shrink-0" />
                  <span className="font-medium">{a.userName ?? "System"}</span>
                  <span className="text-muted-foreground">{a.log.action.replace(/_/g, " ").toLowerCase()}</span>
                  <span className="text-[11px] text-muted-foreground/60 ml-auto">{formatDate(a.log.createdAt)}</span>
                </div>
              ))}
              {activity.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet.</p>}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function NotesList({ notes, onTogglePin }: { notes: Note[]; onTogglePin?: (id: string, pinned: boolean) => void }) {
  if (notes.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">No internal notes yet.</p>;
  return (
    <>
      {notes.map((n) => (
        <div key={n.note.id} className={cn("bg-card border rounded-lg p-4", n.note.isPinned ? "border-primary/40" : "border-border")}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold">{n.authorName ?? "Team"}</span>
            {n.note.isPinned && <Pin className="h-3 w-3 text-primary" />}
            <span className="text-[11px] text-muted-foreground ml-auto">{formatDate(n.note.createdAt)}</span>
            {onTogglePin && (
              <button onClick={() => onTogglePin(n.note.id, !n.note.isPinned)} className="text-muted-foreground hover:text-primary">
                <Pin className={cn("h-3.5 w-3.5", n.note.isPinned && "fill-primary text-primary")} />
              </button>
            )}
          </div>
          <p className="text-sm whitespace-pre-wrap">{n.note.content}</p>
        </div>
      ))}
    </>
  );
}
