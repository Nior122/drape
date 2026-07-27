import { useState, useEffect } from "react";
import { Loader2, Users, UserCheck, User, ShoppingBag, MessageSquare, CreditCard, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

interface DashboardData {
  totalUsers: number;
  totalDesigners: number;
  totalClients: number;
  totalOrders: number;
  reviewsPending: number;
  activeSubscriptions: number;
  revenue: number;
}

const KPI_CARDS: { key: keyof DashboardData; label: string; icon: React.ElementType; prefix?: string }[] = [
  { key: "totalUsers", label: "Total Users", icon: Users },
  { key: "totalDesigners", label: "Designers", icon: UserCheck },
  { key: "totalClients", label: "Clients", icon: User },
  { key: "totalOrders", label: "Orders", icon: ShoppingBag },
  { key: "reviewsPending", label: "Reviews Pending", icon: MessageSquare },
  { key: "activeSubscriptions", label: "Active Subscriptions", icon: CreditCard },
  { key: "revenue", label: "Revenue", icon: DollarSign, prefix: "£" },
];

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/api/admin/dashboard`);
        if (!res.ok) throw new Error(`Failed to fetch dashboard data (${res.status})`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDashboard();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
          <p className="font-medium">Failed to load dashboard</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of platform metrics and activity
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map(({ key, label, icon: Icon, prefix }) => {
          const value = data?.[key];
          const displayValue =
            value !== undefined && value !== null
              ? key === "revenue"
                ? `${prefix ?? ""}${(value as number).toLocaleString()}`
                : (value as number).toLocaleString()
              : "—";
          return (
            <Card key={key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{displayValue}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
