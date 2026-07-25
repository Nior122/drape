import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { getToken } from "@/lib/token-storage";
import { cn, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, Calendar, Clock, AlertTriangle, GripVertical,
  Package, CheckCircle2, XCircle, Filter, LayoutGrid, List,
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

interface Project {
  id: string; title: string; description?: string; status: string; priority: string;
  budget?: number; currency: string; dueDate?: string; colour?: string;
  taskCount: number; tasksDone: number; createdAt: string; clientId: string;
}

const COLUMNS: { id: string; label: string; color: string }[] = [
  { id: "NEW_REQUEST", label: "New Request", color: "border-t-slate-400" },
  { id: "CONSULTATION", label: "Consultation", color: "border-t-blue-400" },
  { id: "DESIGN_BRIEF", label: "Design Brief", color: "border-t-indigo-400" },
  { id: "DESIGNING", label: "Designing", color: "border-t-purple-400" },
  { id: "CLIENT_REVIEW", label: "Client Review", color: "border-t-amber-400" },
  { id: "APPROVED", label: "Approved", color: "border-t-green-400" },
  { id: "PATTERN_CUTTING", label: "Pattern Cutting", color: "border-t-cyan-400" },
  { id: "PRODUCTION", label: "Production", color: "border-t-orange-400" },
  { id: "QUALITY_CHECK", label: "Quality Check", color: "border-t-yellow-400" },
  { id: "PACKAGING", label: "Packaging", color: "border-t-teal-400" },
  { id: "DELIVERY", label: "Delivery", color: "border-t-emerald-400" },
  { id: "COMPLETED", label: "Completed", color: "border-t-green-500" },
];

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: { label: "Low", className: "bg-slate-400/10 text-slate-400" },
  MEDIUM: { label: "Medium", className: "bg-blue-400/10 text-blue-400" },
  HIGH: { label: "High", className: "bg-amber-400/10 text-amber-400" },
  URGENT: { label: "Urgent", className: "bg-red-400/10 text-red-400" },
};

export default function ProjectsBoardPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const [search, setSearch] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newClientId, setNewClientId] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["production", "projects", search],
    queryFn: () => fetch(`${API_BASE}/api/production/projects${search ? `?search=${encodeURIComponent(search)}` : ""}`, { headers }).then((r) => r.json()),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`${API_BASE}/api/production/projects/${id}/move`, { method: "PATCH", headers, body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["production", "projects"] }),
  });

  const createMutation = useMutation({
    mutationFn: () => fetch(`${API_BASE}/api/production/projects`, {
      method: "POST", headers, body: JSON.stringify({ title: newTitle, clientId: newClientId }),
    }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["production"] }); setShowNewProject(false); setNewTitle(""); toast({ description: "Project created!" }); },
    onError: () => toast({ description: "Failed to create project. Client ID is required.", variant: "destructive" }),
  });

  const handleDrop = (status: string) => {
    if (draggedId) {
      moveMutation.mutate({ id: draggedId, status });
      setDraggedId(null);
      setDragOverCol(null);
    }
  };

  const isOverdue = (dueDate?: string) => dueDate && new Date(dueDate) < new Date();

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-2xl font-serif font-medium">Production Board</h1>
          <p className="text-sm text-muted-foreground">{(projects as Project[]).length} projects</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects..." className="pl-10 w-56" />
          </div>
          <Button onClick={() => setShowNewProject(true)} className="gap-2 bg-primary hover:bg-primary/80 rounded-lg">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      {/* New project inline form */}
      {showNewProject && (
        <div className="px-6 py-3 border-b border-border bg-card flex gap-2 items-center">
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Project title..." className="flex-1" autoFocus />
          <Input value={newClientId} onChange={(e) => setNewClientId(e.target.value)} placeholder="Client ID..." className="w-64" />
          <Button onClick={() => createMutation.mutate()} disabled={!newTitle.trim()} className="bg-primary hover:bg-primary/80">Create</Button>
          <Button onClick={() => setShowNewProject(false)} variant="outline">Cancel</Button>
        </div>
      )}

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        {isLoading ? (
          <div className="flex gap-3 h-full">
            {COLUMNS.slice(0, 5).map((c) => (
              <div key={c.id} className="w-72 shrink-0 bg-muted/20 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 h-full">
            {COLUMNS.map((col) => {
              const colProjects = (projects as Project[]).filter((p) => p.status === col.id);
              return (
                <div
                  key={col.id}
                  className={cn("w-72 shrink-0 flex flex-col rounded-xl border-t-2 bg-muted/10 transition-colors", col.color,
                    dragOverCol === col.id && "bg-primary/5 ring-2 ring-primary/30")}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
                  onDragLeave={() => setDragOverCol((c) => (c === col.id ? null : c))}
                  onDrop={() => handleDrop(col.id)}
                >
                  <div className="flex items-center justify-between px-3 py-2.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</span>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{colProjects.length}</Badge>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                    {colProjects.map((project) => {
                      const prio = PRIORITY_CONFIG[project.priority] ?? PRIORITY_CONFIG.MEDIUM;
                      const progress = project.taskCount > 0 ? Math.round((project.tasksDone / project.taskCount) * 100) : 0;
                      return (
                        <motion.div
                          key={project.id}
                          layout
                          draggable
                          onDragStart={() => setDraggedId(project.id)}
                          onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
                          className={cn("group bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-md transition-all",
                            draggedId === project.id && "opacity-50")}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100" />
                            <div className="flex-1 min-w-0">
                              <Link href={`/designer/projects/${project.id}`}>
                                <p className="text-sm font-medium leading-tight hover:text-primary transition-colors line-clamp-2">{project.title}</p>
                              </Link>
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                <Badge className={cn("text-[9px] h-4 px-1.5", prio.className)}>{prio.label}</Badge>
                                {project.budget != null && (
                                  <span className="text-[10px] text-muted-foreground">{project.currency} {project.budget.toLocaleString()}</span>
                                )}
                              </div>
                              {project.taskCount > 0 && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                    <span>Tasks</span><span>{project.tasksDone}/{project.taskCount}</span>
                                  </div>
                                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                                  </div>
                                </div>
                              )}
                              {project.dueDate && (
                                <div className={cn("flex items-center gap-1 mt-2 text-[10px]", isOverdue(project.dueDate) ? "text-red-400" : "text-muted-foreground")}>
                                  {isOverdue(project.dueDate) ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                                  {formatDate(project.dueDate)}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    {colProjects.length === 0 && (
                      <div className="text-center py-6 text-[11px] text-muted-foreground/40 border border-dashed border-border/50 rounded-lg">
                        Drop projects here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
