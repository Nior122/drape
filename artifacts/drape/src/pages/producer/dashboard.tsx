import { useLocation } from "wouter";
import {
  useGetProducerDashboard,
  getGetProducerDashboardQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/context/auth";
import { cn, formatDate } from "@/lib/utils";
import { Package, Users, DollarSign, MessageSquare, TrendingUp, ArrowRight, Clock, AlertCircle } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ENQUIRY:       { label: "Enquiry",       color: "text-blue-400",    bg: "bg-blue-400/10"   },
  ACCEPTED:      { label: "Accepted",      color: "text-emerald-400", bg: "bg-emerald-400/10"},
  DEPOSIT_PAID:  { label: "Deposit Paid",  color: "text-cyan-400",    bg: "bg-cyan-400/10"   },
  IN_PRODUCTION: { label: "In Production", color: "text-[#C08B4E]",   bg: "bg-[#C08B4E]/10"  },
  FITTING:       { label: "Fitting",       color: "text-purple-400",  bg: "bg-purple-400/10" },
  FINAL_PAYMENT: { label: "Final Payment", color: "text-yellow-400",  bg: "bg-yellow-400/10" },
  DELIVERED:     { label: "Delivered",     color: "text-green-400",   bg: "bg-green-400/10"  },
  COMPLETED:     { label: "Completed",     color: "text-green-500",   bg: "bg-green-500/10"  },
  CANCELLED:     { label: "Cancelled",     color: "text-red-400",     bg: "bg-red-400/10"    },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "text-white/60", bg: "bg-white/10" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide", cfg.color, cfg.bg)}>
      {cfg.label}
    </span>
  );
}

type RecentOrder = {
  id: string; title: string; status: string; agreedPrice: number | null;
  currency: string; dueDate: string | null; clientName: string | null; clientId: string; createdAt: string;
};

export default function ProducerDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading } = useGetProducerDashboard({
    query: { queryKey: getGetProducerDashboardQueryKey() },
  });

  const dash = data as {
    activeOrders: number; revenueThisMonth: number; totalClients: number;
    unreadMessages: number; recentOrders: RecentOrder[];
  } | undefined;

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const STATS = [
    { label: "Active Orders",      value: isLoading ? "—" : String(dash?.activeOrders ?? 0),                     icon: Package,       color: "text-[#C08B4E]",   bg: "bg-[#C08B4E]/10",  sub: "In progress"       },
    { label: "Revenue This Month", value: isLoading ? "—" : `£${((dash?.revenueThisMonth ?? 0) / 100).toFixed(0)}`, icon: DollarSign,    color: "text-emerald-400", bg: "bg-emerald-400/10",sub: "Completed orders"  },
    { label: "Total Clients",      value: isLoading ? "—" : String(dash?.totalClients ?? 0),                     icon: Users,         color: "text-blue-400",    bg: "bg-blue-400/10",   sub: "Lifetime"          },
    { label: "Unread Messages",    value: isLoading ? "—" : String(dash?.unreadMessages ?? 0),                   icon: MessageSquare, color: (dash?.unreadMessages ?? 0) > 0 ? "text-yellow-400" : "text-white/40", bg: (dash?.unreadMessages ?? 0) > 0 ? "bg-yellow-400/10" : "bg-white/5", sub: "From clients" },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 pb-24 md:pb-8">
      <div>
        <h1 className="text-xl font-bold text-white">{greeting}, {firstName}</h1>
        <p className="text-sm text-white/40 mt-0.5">Here's what's happening in your studio today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="bg-[#1A1A1A] rounded-xl p-4 border border-white/5">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", s.bg)}>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs font-medium text-white/60 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/80 tracking-wide uppercase">Recent Orders</h2>
          <button onClick={() => navigate("/producer/orders")} className="flex items-center gap-1 text-xs text-[#C08B4E] hover:text-[#d4a96a] transition-colors">
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />)}</div>
        ) : !dash?.recentOrders?.length ? (
          <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-white/5">
            <Package className="h-8 w-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/40">No orders yet</p>
            <p className="text-xs text-white/20 mt-1">Orders will appear here once clients book with you</p>
          </div>
        ) : (
          <div className="bg-[#1A1A1A] rounded-xl border border-white/5 overflow-hidden">
            {dash.recentOrders.map((order, i) => (
              <div
                key={order.id}
                onClick={() => navigate(`/producer/orders/${order.id}`)}
                className={cn("flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-white/5 transition-colors", i !== 0 && "border-t border-white/5")}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{order.title}</p>
                  <p className="text-xs text-white/40 mt-0.5">{order.clientName ?? "Unknown client"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <StatusBadge status={order.status} />
                  {order.dueDate && (
                    <p className="text-[10px] text-white/30 mt-1 flex items-center justify-end gap-1">
                      <Clock className="h-2.5 w-2.5" /> {formatDate(order.dueDate)}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-white/20 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white/80 tracking-wide uppercase mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate("/producer/storefront")} className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4 text-left hover:border-[#C08B4E]/30 transition-colors">
            <TrendingUp className="h-5 w-5 text-[#C08B4E] mb-2" />
            <p className="text-sm font-medium text-white">Edit Storefront</p>
            <p className="text-xs text-white/40 mt-0.5">Update your profile and portfolio</p>
          </button>
          <button onClick={() => navigate("/producer/analytics")} className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4 text-left hover:border-[#C08B4E]/30 transition-colors">
            <AlertCircle className="h-5 w-5 text-purple-400 mb-2" />
            <p className="text-sm font-medium text-white">View Analytics</p>
            <p className="text-xs text-white/40 mt-0.5">Revenue and performance data</p>
          </button>
        </div>
      </div>

      {/* Brief Inbox */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/80 tracking-wide uppercase">Brief Inbox</h2>
          <span className="text-[10px] text-white/30 bg-[#C08B4E]/15 text-[#C08B4E] px-2 py-0.5 rounded-full">2 new</span>
        </div>
        <div className="space-y-3">
          {[
            { name: "Adaeze Okonkwo", occasion: "Traditional engagement ceremony", style: "Regal Igbo bridal look with modern edge", budget: "₦280k–₦450k", days: "45d", hasImage: false, isNew: true, avatar: "https://api.dicebear.com/7.x/personas/svg?seed=adaeze" },
            { name: "Tunde Adeyemi", occasion: "Corporate dinner / black tie", style: "Sharp contemporary Agbada with slim tailoring", budget: "₦180k–₦250k", days: "28d", hasImage: true, isNew: false, avatar: "https://api.dicebear.com/7.x/personas/svg?seed=tunde" },
          ].map((brief, i) => (
            <div key={i} className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4 hover:border-[#C08B4E]/25 transition-colors cursor-pointer">
              <div className="flex items-start gap-3">
                <img src={brief.avatar} alt={brief.name} className="w-9 h-9 rounded-full bg-white/5 shrink-0 border border-white/10" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-white">{brief.name}</p>
                    {brief.isNew && (
                      <span className="text-[9px] font-bold bg-[#C08B4E]/20 text-[#C08B4E] px-1.5 py-0.5 rounded-full uppercase tracking-wider">New</span>
                    )}
                    {brief.hasImage && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-400/80 px-1.5 py-0.5 rounded-full">Visual concept</span>
                    )}
                  </div>
                  <p className="text-xs text-white/60 truncate">{brief.occasion}</p>
                  <p className="text-[11px] text-white/35 mt-0.5 truncate">{brief.style}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{brief.budget}</span>
                    <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{brief.days}</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-white/20 shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-white/25 text-center">
          Briefs are AI-built documents — occasion, aesthetic, budget, measurements, and selected visual concept all in one.
        </p>
      </div>
    </div>
  );
}
