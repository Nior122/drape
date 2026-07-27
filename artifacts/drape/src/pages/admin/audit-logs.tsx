import { useState, useEffect, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

const PAGE_SIZE = 30;

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const COMMON_ACTIONS = [
  "ALL",
  "user.created",
  "user.deleted",
  "user.role_updated",
  "designer.created",
  "designer.approved",
  "designer.rejected",
  "review.approved",
  "review.rejected",
  "subscription.created",
  "subscription.updated",
  "subscription.canceled",
  "order.created",
  "order.updated",
  "order.cancelled",
  "flag.updated",
  "login",
  "logout",
];

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entitySearch, setEntitySearch] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (actionFilter !== "ALL") params.set("action", actionFilter);
      if (entitySearch) params.set("entity_search", entitySearch);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`${API_BASE}/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch audit logs (${res.status})`);
      const json = await res.json();
      setLogs(json.data ?? json.logs ?? json);
      setTotalPages(json.totalPages ?? json.total_pages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entitySearch, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track administrative actions and system events
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-lg">Logs</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entity ID..."
                  value={entitySearch}
                  onChange={(e) => { setEntitySearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select
                value={actionFilter}
                onValueChange={(v) => { setActionFilter(v); setPage(1); }}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {COMMON_ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a === "ALL" ? "All Actions" : a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No audit logs found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Action</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden sm:table-cell">Entity</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Entity ID</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">User ID</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs font-mono text-foreground">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell capitalize">
                          {log.entity}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground font-mono text-xs hidden md:table-cell">
                          {log.entityId ? (log.entityId.length > 16 ? `${log.entityId.slice(0, 16)}…` : log.entityId) : "—"}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground font-mono text-xs hidden md:table-cell">
                          {log.userId ? `${log.userId.slice(0, 12)}…` : "—"}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
