import { useQuery } from "@tanstack/react-query";
import { getToken } from "@/lib/token-storage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BarChart3, TrendingUp, Clock, CheckCircle2, XCircle, Download,
  Package, DollarSign, Target, Calendar,
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

interface Report {
  totalProjects: number; completed: number; cancelled: number; active: number;
  avgCompletionDays: number; totalRevenue: number;
  statusDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  completionTimes: Array<{ id: string; title: string; days: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  NEW_REQUEST: "#94a3b8", CONSULTATION: "#60a5fa", DESIGN_BRIEF: "#818cf8", DESIGNING: "#a78bfa",
  CLIENT_REVIEW: "#fbbf24", APPROVED: "#4ade80", PATTERN_CUTTING: "#22d3ee", PRODUCTION: "#fb923c",
  QUALITY_CHECK: "#facc15", PACKAGING: "#2dd4bf", DELIVERY: "#34d399", COMPLETED: "#22c55e", ARCHIVED: "#64748b",
};

export default function ReportsPage() {
  const token = getToken();
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const { data: report, isLoading } = useQuery({
    queryKey: ["production", "reports"],
    queryFn: () => fetch(`${API_BASE}/api/production/reports`, { headers }).then((r) => r.json()),
  });

  const exportCSV = () => {
    if (!report) return;
    const rows = [["Metric", "Value"],
      ["Total Projects", report.totalProjects], ["Completed", report.completed],
      ["Active", report.active], ["Archived", report.cancelled],
      ["Avg Completion (days)", report.avgCompletionDays], ["Total Revenue", report.totalRevenue],
    ];
    Object.entries(report.statusDistribution).forEach(([k, v]) => rows.push([`Status: ${k}`, v]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "drape-report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !report) {
    return <div className="flex items-center justify-center h-full"><div className="animate-pulse text-muted-foreground">Loading reports...</div></div>;
  }

  const r = report as Report;
  const maxStatus = Math.max(...Object.values(r.statusDistribution), 1);
  const completionRate = r.totalProjects > 0 ? Math.round((r.completed / r.totalProjects) * 100) : 0;

  const stats = [
    { label: "Total Projects", value: r.totalProjects, icon: Package, color: "text-blue-400" },
    { label: "Completion Rate", value: `${completionRate}%`, icon: Target, color: "text-green-400" },
    { label: "Avg. Completion", value: `${r.avgCompletionDays}d`, icon: Clock, color: "text-amber-400" },
    { label: "Total Revenue", value: `₦${r.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400" },
  ];

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-2xl font-serif font-medium">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Production performance overview</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2 rounded-lg"><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <Card key={s.label} className="p-5">
                <s.icon className={cn("h-6 w-6 mb-3", s.color)} />
                <p className="text-2xl font-semibold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Status distribution bar chart */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Projects by Status</h3>
              <div className="space-y-2.5">
                {Object.entries(r.statusDistribution).map(([status, count]) => (
                  <div key={status}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{status.replace(/_/g, " ")}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(count / maxStatus) * 100}%`, backgroundColor: STATUS_COLORS[status] ?? "#94a3b8" }} />
                    </div>
                  </div>
                ))}
                {Object.keys(r.statusDistribution).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>}
              </div>
            </Card>

            {/* Priority distribution */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Projects by Priority</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(r.priorityDistribution).map(([prio, count]) => (
                  <div key={prio} className="bg-muted/20 rounded-lg p-4 text-center">
                    <p className="text-2xl font-semibold">{count}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-1">{prio.toLowerCase()}</p>
                  </div>
                ))}
                {Object.keys(r.priorityDistribution).length === 0 && <p className="col-span-2 text-sm text-muted-foreground text-center py-4">No data yet</p>}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-green-400/5 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <div><p className="text-lg font-semibold">{r.completed}</p><p className="text-[10px] text-muted-foreground">Completed</p></div>
                </div>
                <div className="bg-red-400/5 rounded-lg p-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <div><p className="text-lg font-semibold">{r.cancelled}</p><p className="text-[10px] text-muted-foreground">Archived</p></div>
                </div>
              </div>
            </Card>
          </div>

          {/* Completion times */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Project Completion Times</h3>
            {r.completionTimes.length > 0 ? (
              <div className="space-y-2">
                {r.completionTimes.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-sm flex-1 truncate">{c.title}</span>
                    <div className="w-40 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((c.days / Math.max(...r.completionTimes.map((x) => x.days), 1)) * 100, 100)}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">{c.days}d</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-4">No completed projects yet</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
