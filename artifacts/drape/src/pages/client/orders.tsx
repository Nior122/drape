import { useState } from "react";
import { Link } from "wouter";
import { Package, ChevronRight, Plus, CheckCircle } from "lucide-react";
import { useGetClientOrders } from "@workspace/api-client-react";
import type { ClientOrder } from "@workspace/api-client-react";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { motion } from "framer-motion";

const STATUS_CONFIG: Record<
  string,
  { label: string; text: string; bg: string }
> = {
  ENQUIRY: { label: "Enquiry", text: "text-slate-400", bg: "bg-slate-400/10" },
  ACCEPTED: { label: "Accepted", text: "text-blue-400", bg: "bg-blue-400/10" },
  DEPOSIT_PAID: { label: "Deposit Paid", text: "text-indigo-400", bg: "bg-indigo-400/10" },
  IN_PRODUCTION: { label: "In Production", text: "text-amber-400", bg: "bg-amber-400/10" },
  FITTING: { label: "Fitting", text: "text-purple-400", bg: "bg-purple-400/10" },
  FINAL_PAYMENT: { label: "Final Payment", text: "text-orange-400", bg: "bg-orange-400/10" },
  DELIVERED: { label: "Delivered", text: "text-green-400", bg: "bg-green-400/10" },
  COMPLETED: { label: "Completed", text: "text-emerald-400", bg: "bg-emerald-400/10" },
  CANCELLED: { label: "Cancelled", text: "text-red-400", bg: "bg-red-400/10" },
};

const ACTIVE = new Set([
  "ENQUIRY", "ACCEPTED", "DEPOSIT_PAID", "IN_PRODUCTION", "FITTING", "FINAL_PAYMENT",
]);

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    text: "text-muted-foreground",
    bg: "bg-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0",
        cfg.text,
        cfg.bg
      )}
    >
      {cfg.label}
    </span>
  );
}

function OrderCard({ order }: { order: ClientOrder }) {
  return (
    <Link href={`/client/orders/${order.id}`}>
      <motion.div
        className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-card/70 hover:border-border/60 cursor-pointer transition-colors"
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Package size={17} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{order.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {order.producerStudioName ?? order.producerName ?? "Designer"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <StatusBadge status={order.status} />
              {order.agreedPrice != null && (
                <span className="text-xs font-medium text-foreground">
                  {formatPrice(order.agreedPrice, order.currency)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            {order.dueDate ? (
              <span className="text-xs text-muted-foreground">
                Due {formatDate(order.dueDate)}
              </span>
            ) : (
              <span />
            )}
            <span className="text-xs text-muted-foreground/60">
              {formatDate(order.updatedAt)}
            </span>
          </div>
        </div>

        <ChevronRight
          size={15}
          className="text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground/60 transition-colors"
        />
      </motion.div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="flex gap-4 p-4 rounded-xl border border-border bg-card animate-pulse">
      <div className="h-10 w-10 rounded-lg bg-muted/40 shrink-0" />
      <div className="flex-1 space-y-2.5 py-1">
        <div className="flex justify-between gap-4">
          <div className="h-3 bg-muted/40 rounded w-1/3" />
          <div className="h-5 bg-muted/30 rounded-full w-20" />
        </div>
        <div className="h-2.5 bg-muted/30 rounded w-1/4" />
        <div className="h-2 bg-muted/20 rounded w-1/5 mt-1" />
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [tab, setTab] = useState<"active" | "history">("active");
  const { data: orders = [], isLoading, isError } = useGetClientOrders();

  const active = orders.filter((o) => ACTIVE.has(o.status));
  const history = orders.filter((o) => !ACTIVE.has(o.status));
  const displayed = tab === "active" ? active : history;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[Cormorant_Garamond] text-2xl font-semibold text-foreground">
            Orders
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track your bespoke pieces
          </p>
        </div>
        <Link href="/client/discover">
          <button className="flex items-center gap-1.5 text-sm text-primary font-medium hover:text-primary/80 transition-colors">
            <Plus size={14} />
            New
          </button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-muted/40 rounded-xl mb-5">
        {(
          [
            { key: "active", label: "Active", count: active.length },
            { key: "history", label: "History", count: history.length },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
              tab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {count > 0 && (
              <span
                className={cn(
                  "h-5 min-w-[1.25rem] flex items-center justify-center rounded-full text-[11px] font-semibold px-1",
                  tab === key
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/40 flex items-center justify-center">
            <Package size={26} className="text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground">Unable to load orders</p>
          <p className="text-xs text-muted-foreground/50">Check your connection and try again.</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/40 flex items-center justify-center">
            <Package size={26} className="text-muted-foreground/30" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {tab === "active" ? "No active orders" : "No completed orders yet"}
            </p>
            {tab === "active" && (
              <Link href="/client/discover">
                <button className="mt-3 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                  Browse designers →
                </button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <motion.div
          className="space-y-3"
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.05 } },
            hidden: {},
          }}
        >
          {displayed.map((order) => (
            <motion.div
              key={order.id}
              variants={{
                hidden: { opacity: 0, y: 6 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <OrderCard order={order} />
            </motion.div>
          ))}

          {tab === "history" && displayed.some((o) => o.reviewed) && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60 pt-2">
              <CheckCircle size={12} />
              Reviewed orders are marked
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
