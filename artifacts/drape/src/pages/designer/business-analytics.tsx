import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn, formatPrice } from "@/lib/utils";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Wallet,
  Package,
  Users,
  Calendar,
  Loader2,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

type BusinessAnalytics = {
  stats: {
    totalRevenue: number;
    totalOrders: number;
    totalExpenses: number;
    profit: number;
    inventoryValue: number;
    activeClients: number;
  };
  expensesByCategory: Array<{ category: string; total: number; count: number }>;
  topClients: Array<{ id: string; name: string; totalSpend: number; orderCount: number }>;
  revenueTrend: Array<{ month: string; revenue: number }>;
};

const CATEGORY_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: { category?: string } }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground mb-1">{label ?? payload[0]?.payload?.category}</p>
      <p className="text-primary font-semibold">£{(payload[0].value / 100).toFixed(0)}</p>
    </div>
  );
}

export default function BusinessAnalyticsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading, error } = useQuery<BusinessAnalytics>({
    queryKey: ["business-analytics", dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const qs = params.toString();
      return fetchApi<BusinessAnalytics>(
        `/api/business/analytics${qs ? `?${qs}` : ""}`
      );
    },
  });

  const analytics = data;

  const KPI_CARDS = [
    {
      label: "Total Revenue",
      value: analytics
        ? `£${(analytics.stats.totalRevenue / 100).toFixed(0)}`
        : "—",
      icon: DollarSign,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Total Orders",
      value: analytics ? String(analytics.stats.totalOrders) : "—",
      icon: ShoppingCart,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Total Expenses",
      value: analytics
        ? `£${(analytics.stats.totalExpenses / 100).toFixed(0)}`
        : "—",
      icon: Wallet,
      color: "text-red-400",
      bg: "bg-red-400/10",
    },
    {
      label: "Net Profit",
      value: analytics
        ? `£${(analytics.stats.profit / 100).toFixed(0)}`
        : "—",
      icon: TrendingUp,
      color: analytics?.stats.profit && analytics.stats.profit > 0
        ? "text-emerald-400"
        : "text-red-400",
      bg: analytics?.stats.profit && analytics.stats.profit > 0
        ? "bg-emerald-400/10"
        : "bg-red-400/10",
    },
    {
      label: "Inventory Value",
      value: analytics
        ? `£${(analytics.stats.inventoryValue / 100).toFixed(0)}`
        : "—",
      icon: Package,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      label: "Active Clients",
      value: analytics ? String(analytics.stats.activeClients) : "—",
      icon: Users,
      color: "text-cyan-400",
      bg: "bg-cyan-400/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm font-medium">Failed to load analytics</p>
        <p className="text-xs text-muted-foreground">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Business Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track your business performance and financial health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36"
            placeholder="From"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36"
            placeholder="To"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {KPI_CARDS.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center mb-3",
                kpi.bg
              )}
            >
              <kpi.icon className={cn("h-4 w-4", kpi.color)} />
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground">
              {kpi.value}
            </p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Expenses by Category Bar Chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Expenses by Category
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Breakdown of spending
              </p>
            </div>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          {!analytics?.expensesByCategory?.length ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              No expense data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={analytics.expensesByCategory}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                  tickFormatter={(v) => `£${(v / 100).toFixed(0)}`}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }}
                  width={80}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={16}>
                  {analytics.expensesByCategory.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                      }
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue Trend */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Revenue Trend
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monthly revenue
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          {!analytics?.revenueTrend?.length ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              No revenue data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={analytics.revenueTrend}
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                  tickFormatter={(v) => `£${(v / 100).toFixed(0)}`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={24}>
                  {analytics.revenueTrend.map((_, i) => (
                    <Cell
                      key={i}
                      fill={"#C08B4E"}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Clients */}
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold text-foreground mb-1">
            Top Clients
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            By total spend
          </p>
          {!analytics?.topClients?.length ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              No client data yet
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.topClients.map((client, i) => {
                const maxSpend =
                  analytics.topClients[0]?.totalSpend || 1;
                const pct = (client.totalSpend / maxSpend) * 100;
                return (
                  <div key={client.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-muted-foreground w-3 shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-xs font-medium text-foreground truncate">
                          {client.name ?? "Unknown"}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {client.orderCount} order
                          {client.orderCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-primary shrink-0">
                        £{(client.totalSpend / 100).toFixed(0)}
                      </p>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary stats */}
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold text-foreground mb-1">
            Financial Summary
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Period overview
          </p>
          {analytics ? (
            <div className="space-y-3">
              {[
                {
                  label: "Revenue",
                  value: analytics.stats.totalRevenue,
                  color: "text-emerald-400",
                },
                {
                  label: "Expenses",
                  value: analytics.stats.totalExpenses,
                  color: "text-red-400",
                },
                {
                  label: "Profit",
                  value: analytics.stats.profit,
                  color:
                    analytics.stats.profit > 0
                      ? "text-emerald-400"
                      : "text-red-400",
                },
              ].map((item) => {
                const maxVal = Math.max(
                  analytics.stats.totalRevenue,
                  1
                );
                const pct = (Math.abs(item.value) / maxVal) * 100;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold font-mono",
                          item.color
                        )}
                      >
                        £{(item.value / 100).toFixed(0)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          item.label === "Revenue"
                            ? "bg-emerald-500"
                            : item.label === "Expenses"
                              ? "bg-red-500"
                              : "bg-primary"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Inventory Value
                  </span>
                  <span className="font-semibold text-foreground font-mono">
                    £
                    {(
                      analytics.stats.inventoryValue / 100
                    ).toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
