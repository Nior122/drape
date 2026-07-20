import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetProducerOrders,
  getGetProducerOrdersQueryKey,
} from "@workspace/api-client-react";
import { cn, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Package, Search, ArrowRight, Clock, FileText } from "lucide-react";

const STATUSES = [
  { value: "ALL",           label: "All"           },
  { value: "ENQUIRY",       label: "Enquiry"       },
  { value: "ACCEPTED",      label: "Accepted"      },
  { value: "IN_PRODUCTION", label: "In Production" },
  { value: "FITTING",       label: "Fitting"       },
  { value: "FINAL_PAYMENT", label: "Final Payment" },
  { value: "DELIVERED",     label: "Delivered"     },
  { value: "COMPLETED",     label: "Completed"     },
  { value: "CANCELLED",     label: "Cancelled"     },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  ENQUIRY:       { color: "text-blue-400",    bg: "bg-blue-400/10",   dot: "bg-blue-400"    },
  ACCEPTED:      { color: "text-emerald-400", bg: "bg-emerald-400/10",dot: "bg-emerald-400" },
  DEPOSIT_PAID:  { color: "text-cyan-400",    bg: "bg-cyan-400/10",   dot: "bg-cyan-400"    },
  IN_PRODUCTION: { color: "text-[#C08B4E]",   bg: "bg-[#C08B4E]/10",  dot: "bg-[#C08B4E]"  },
  FITTING:       { color: "text-purple-400",  bg: "bg-purple-400/10", dot: "bg-purple-400"  },
  FINAL_PAYMENT: { color: "text-yellow-400",  bg: "bg-yellow-400/10", dot: "bg-yellow-400"  },
  DELIVERED:     { color: "text-green-400",   bg: "bg-green-400/10",  dot: "bg-green-400"   },
  COMPLETED:     { color: "text-green-500",   bg: "bg-green-500/10",  dot: "bg-green-500"   },
  CANCELLED:     { color: "text-red-400",     bg: "bg-red-400/10",    dot: "bg-red-400"     },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { color: "text-white/60", bg: "bg-white/10", dot: "bg-white/40" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide", cfg.color, cfg.bg)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

type OrderSummary = {
  id: string; title: string; status: string; agreedPrice: number | null; currency: string;
  depositPaid: boolean; dueDate: string | null; createdAt: string; updatedAt: string;
  productionGuideAt: string | null; clientId: string; clientName: string | null; clientEmail: string;
};

export default function ProducerOrders() {
  const [, navigate] = useLocation();
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const statusParam = activeStatus === "ALL" ? {} : { status: activeStatus };
  const { data, isLoading } = useGetProducerOrders(statusParam, {
    query: { queryKey: getGetProducerOrdersQueryKey(statusParam) },
  });

  const orders = (data as OrderSummary[] | undefined) ?? [];
  const filtered = orders.filter(
    (o) =>
      !search ||
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      (o.clientName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      o.clientEmail.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 md:p-8 pb-24 md:pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Orders</h1>
        <p className="text-sm text-white/40 mt-0.5">{orders.length} total orders</p>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders or clients…"
            className="pl-9 bg-[#1A1A1A] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#C08B4E]/30"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setActiveStatus(s.value)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                activeStatus === s.value
                  ? "bg-[#C08B4E] text-white"
                  : "bg-[#1A1A1A] text-white/50 hover:text-white border border-white/10",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#1A1A1A] rounded-xl border border-white/5">
          <Package className="h-8 w-8 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/40">{search ? "No orders match your search" : "No orders in this category"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/producer/orders/${order.id}`)}
              className="bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-4 cursor-pointer hover:border-[#C08B4E]/20 transition-all hover:bg-[#1E1E1E] group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white group-hover:text-[#C08B4E] transition-colors truncate">
                      {order.title}
                    </p>
                    {order.productionGuideAt && (
                      <span className="flex items-center gap-1 text-[9px] text-[#C08B4E]/70 bg-[#C08B4E]/10 px-1.5 py-0.5 rounded">
                        <FileText className="h-2.5 w-2.5" /> Guide ready
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">{order.clientName ?? order.clientEmail}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <StatusBadge status={order.status} />
                    {order.agreedPrice && (
                      <span className="text-xs text-white/50">
                        £{(order.agreedPrice / 100).toFixed(0)}
                        {order.depositPaid && <span className="text-emerald-400/70 ml-1">· dep. paid</span>}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {order.dueDate && (
                    <span className="text-[10px] text-white/30 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" /> {formatDate(order.dueDate)}
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-[#C08B4E] transition-colors mt-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
