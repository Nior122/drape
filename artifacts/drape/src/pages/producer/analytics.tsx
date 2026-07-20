import {
  useGetProducerAnalytics,
  getGetProducerAnalyticsQueryKey,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Package, Users, DollarSign, Loader2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  ENQUIRY: "#3B82F6", ACCEPTED: "#10B981", DEPOSIT_PAID: "#06B6D4",
  IN_PRODUCTION: "#C08B4E", FITTING: "#A855F7", FINAL_PAYMENT: "#EAB308",
  DELIVERED: "#22C55E", COMPLETED: "#16A34A", CANCELLED: "#EF4444",
};

type Analytics = {
  revenueByMonth: Array<{ month: string; revenue: number; order_count: number }>;
  ordersByStatus: Array<{ status: string; count: number }>;
  topClients: Array<{ client_id: string; client_name: string | null; total_spend: number; order_count: number }>;
  stats: { totalRevenue: number; completedOrders: number; activeOrders: number };
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-xs">
      <p className="text-white/60 mb-1">{label}</p>
      <p className="text-[#C08B4E] font-semibold">£{(payload[0].value / 100).toFixed(0)}</p>
    </div>
  );
}

export default function ProducerAnalytics() {
  const { data, isLoading } = useGetProducerAnalytics({ query: { queryKey: getGetProducerAnalyticsQueryKey() } });
  const analytics = data as Analytics | undefined;

  const revenueData = (analytics?.revenueByMonth ?? []).map((r) => ({
    month: r.month?.slice(5) ?? r.month,
    revenue: r.revenue,
    orders: r.order_count,
  }));

  const statusData = (analytics?.ordersByStatus ?? []).map((s) => ({
    name: (s.status ?? "").replace(/_/g, " "),
    value: s.count,
    color: STATUS_COLORS[s.status] ?? "#888",
  }));

  const topClients = analytics?.topClients ?? [];
  const stats = analytics?.stats;

  const STAT_CARDS = [
    { label: "Total Revenue",    value: stats ? `£${(stats.totalRevenue / 100).toFixed(0)}` : "—",   icon: DollarSign, color: "text-[#C08B4E]",   bg: "bg-[#C08B4E]/10"   },
    { label: "Completed Orders", value: stats ? String(stats.completedOrders) : "—",                  icon: Package,    color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Active Orders",    value: stats ? String(stats.activeOrders) : "—",                     icon: TrendingUp, color: "text-blue-400",    bg: "bg-blue-400/10"    },
    { label: "Top Clients",      value: stats ? String(topClients.length) : "—",                      icon: Users,      color: "text-purple-400",  bg: "bg-purple-400/10"  },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-[#C08B4E]" /></div>;
  }

  return (
    <div className="p-6 md:p-8 pb-24 md:pb-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-white/40 mt-0.5">Your studio's performance overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="bg-[#1A1A1A] rounded-xl border border-white/5 p-4">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", s.bg)}>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-5">
        <p className="text-sm font-semibold text-white mb-1">Revenue</p>
        <p className="text-xs text-white/40 mb-5">Completed orders, last 6 months</p>
        {revenueData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-white/20 text-sm">No completed orders yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#ffffff40", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#ffffff40", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(v / 100).toFixed(0)}`} width={48} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff08" }} />
              <Bar dataKey="revenue" fill="#C08B4E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-5">
          <p className="text-sm font-semibold text-white mb-1">Orders by Status</p>
          <p className="text-xs text-white/40 mb-4">All-time distribution</p>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-white/20 text-sm">No orders yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={7} formatter={(value) => <span style={{ color: "#ffffff60", fontSize: 10 }}>{value}</span>} />
                <Tooltip formatter={(value) => [value, "orders"]} contentStyle={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-5">
          <p className="text-sm font-semibold text-white mb-1">Top Clients</p>
          <p className="text-xs text-white/40 mb-4">By total spend</p>
          {topClients.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-white/20 text-sm">No clients yet</div>
          ) : (
            <div className="space-y-3">
              {topClients.map((client, i) => {
                const maxSpend = topClients[0]?.total_spend || 1;
                const pct = (client.total_spend / maxSpend) * 100;
                return (
                  <div key={client.client_id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/30 w-3">{i + 1}</span>
                        <p className="text-xs font-medium text-white">{client.client_name ?? "Unknown"}</p>
                        <span className="text-[10px] text-white/30">{client.order_count} order{client.order_count !== 1 ? "s" : ""}</span>
                      </div>
                      <p className="text-xs font-semibold text-[#C08B4E]">£{(client.total_spend / 100).toFixed(0)}</p>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#C08B4E] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
