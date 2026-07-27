import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

const PLANS = ["free", "starter", "pro", "enterprise"] as const;
const STATUSES = ["active", "canceled", "past_due", "incomplete", "trialing", "paused"] as const;

interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: string;
  interval: string;
  currentPeriodEnd: string;
  createdAt: string;
}

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/api/admin/subscriptions`);
        if (!res.ok) throw new Error(`Failed to fetch subscriptions (${res.status})`);
        const json = await res.json();
        if (!cancelled) setSubscriptions(json.data ?? json.subscriptions ?? json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSubscriptions();
    return () => { cancelled = true; };
  }, []);

  const updateField = async (subId: string, field: string, value: string) => {
    try {
      setSaving(subId);
      const res = await fetch(`${API_BASE}/api/admin/subscriptions/${subId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error(`Failed to update ${field}`);
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, [field]: value } : s)),
      );
    } catch (err) {
      console.error(`Update ${field} failed:`, err);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Subscription Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage user subscriptions, plans, and billing status
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subscriptions</CardTitle>
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
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No subscriptions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">User ID</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Plan</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden sm:table-cell">Interval</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Period End</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 text-foreground font-mono text-xs">{sub.userId.slice(0, 12)}…</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Select
                            value={sub.plan}
                            onValueChange={(v) => updateField(sub.id, "plan", v)}
                            disabled={saving === sub.id}
                          >
                            <SelectTrigger className="h-8 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PLANS.map((p) => (
                                <SelectItem key={p} value={p}>
                                  {p.charAt(0).toUpperCase() + p.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {saving === sub.id && (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Select
                            value={sub.status}
                            onValueChange={(v) => updateField(sub.id, "status", v)}
                            disabled={saving === sub.id}
                          >
                            <SelectTrigger className={cn(
                              "h-8 w-28 text-xs",
                              sub.status === "active" && "border-green-500/30",
                              sub.status === "canceled" && "border-destructive/30",
                              sub.status === "past_due" && "border-yellow-500/30",
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell capitalize">
                        {sub.interval ?? "—"}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">
                        {sub.currentPeriodEnd
                          ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
