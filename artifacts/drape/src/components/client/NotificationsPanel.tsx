import { useCallback } from "react";
import { useLocation } from "wouter";
import {
  X, Bell, CheckCheck, FileText, CheckCircle2, RefreshCw,
  Ruler, BookOpen, Star, MessageCircle, Package, ShoppingBag,
  Image as ImageIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetClientNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  getGetClientNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useNotificationStream } from "@/hooks/use-notification-stream";
import { useAuth } from "@/context/auth";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Type metadata                                                         */
/* ------------------------------------------------------------------ */

interface TypeConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  BRIEF_READY:            { icon: FileText,      color: "text-indigo-400",  bg: "bg-indigo-400/10"  },
  ORDER_ACCEPTED:         { icon: CheckCircle2,  color: "text-emerald-400", bg: "bg-emerald-400/10" },
  STATUS_UPDATED:         { icon: RefreshCw,     color: "text-amber-400",   bg: "bg-amber-400/10"   },
  MEASUREMENTS_SUBMITTED: { icon: Ruler,         color: "text-violet-400",  bg: "bg-violet-400/10"  },
  PRODUCTION_GUIDE_READY: { icon: BookOpen,      color: "text-teal-400",    bg: "bg-teal-400/10"    },
  REVIEW_RECEIVED:        { icon: Star,          color: "text-yellow-400",  bg: "bg-yellow-400/10"  },
  REVIEW_REQUEST:         { icon: Star,          color: "text-yellow-400",  bg: "bg-yellow-400/10"  },
  MESSAGE:                { icon: MessageCircle, color: "text-slate-300",   bg: "bg-slate-400/10"   },
  ORDER_UPDATE:           { icon: Package,       color: "text-orange-400",  bg: "bg-orange-400/10"  },
  NEW_ORDER:              { icon: ShoppingBag,   color: "text-blue-400",    bg: "bg-blue-400/10"    },
  LOOKBOOK_READY:         { icon: ImageIcon,     color: "text-pink-400",    bg: "bg-pink-400/10"    },
  GENERAL:                { icon: Bell,          color: "text-slate-400",   bg: "bg-slate-400/10"   },
};

function getConfig(type: string): TypeConfig {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG["GENERAL"];
}

/* ------------------------------------------------------------------ */
/* Time helpers                                                          */
/* ------------------------------------------------------------------ */

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function startOfDay(d: Date): number {
  const c = new Date(d); c.setHours(0, 0, 0, 0); return c.getTime();
}

/* ------------------------------------------------------------------ */
/* Notification type (subset of server type)                            */
/* ------------------------------------------------------------------ */

interface Notif {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

interface Group { label: string; items: Notif[] }

function groupByDate(items: Notif[]): Group[] {
  const now = new Date();
  const todayMs   = startOfDay(now);
  const yesterMs  = todayMs - 86_400_000;
  const weekMs    = todayMs - 6 * 86_400_000;

  const buckets: Group[] = [
    { label: "Today",     items: [] },
    { label: "Yesterday", items: [] },
    { label: "This week", items: [] },
    { label: "Older",     items: [] },
  ];

  for (const n of items) {
    const t = new Date(n.createdAt).getTime();
    if (t >= todayMs)   buckets[0].items.push(n);
    else if (t >= yesterMs)  buckets[1].items.push(n);
    else if (t >= weekMs)    buckets[2].items.push(n);
    else                     buckets[3].items.push(n);
  }

  return buckets.filter((b) => b.items.length > 0);
}

/* ------------------------------------------------------------------ */
/* Panel                                                                 */
/* ------------------------------------------------------------------ */

export default function NotificationsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  useNotificationStream(!!user);

  const { data, isLoading } = useGetClientNotifications({
    query: {
      queryKey: getGetClientNotificationsQueryKey(),
      refetchInterval: 30_000,
      enabled: !!user,
    },
  });

  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: getGetClientNotificationsQueryKey() });
  }, [qc]);

  const handleMarkAll = useCallback(() => {
    markAll.mutate(undefined, { onSuccess: invalidate });
  }, [markAll, invalidate]);

  const handleClickNotif = useCallback(
    (n: Notif) => {
      if (!n.read) {
        markOne.mutate({ id: n.id }, { onSuccess: invalidate });
      }
      if (n.link) navigate(n.link);
      onClose();
    },
    [markOne, invalidate, navigate, onClose],
  );

  const notifications = (data?.notifications ?? []) as Notif[];
  const unreadCount = data?.unreadCount ?? 0;
  const groups = groupByDate(notifications);

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* ── Slide-in panel ── */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-sm",
          "bg-[#0F0F0F] border-l border-white/[0.08] shadow-[−24px_0_48px_rgba(0,0,0,0.6)]",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-2.5">
            <Bell className="h-[15px] w-[15px] text-[#C08B4E]" />
            <span className="text-sm font-semibold text-white tracking-wide">Notifications</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-[#C08B4E] text-[10px] font-bold text-white leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={markAll.isPending}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-[#C08B4E] hover:bg-[#C08B4E]/10 disabled:opacity-50 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-white/30 hover:text-white hover:bg-white/6 transition-colors ml-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <LoadingSkeleton />
          ) : notifications.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="py-1">
              {groups.map((group) => (
                <div key={group.label}>
                  {/* Group label */}
                  <div className="sticky top-0 z-10 bg-[#0F0F0F]/95 backdrop-blur-sm px-5 pt-3 pb-1.5">
                    <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/22">
                      {group.label}
                    </span>
                  </div>

                  {/* Notifications */}
                  {group.items.map((n) => (
                    <NotifRow
                      key={n.id}
                      n={n}
                      onClick={() => handleClickNotif(n)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-5 py-3 border-t border-white/[0.06] shrink-0">
            <p className="text-[10px] text-white/18 text-center">
              Last {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Notification row                                                      */
/* ------------------------------------------------------------------ */

function NotifRow({ n, onClick }: { n: Notif; onClick: () => void }) {
  const { icon: Icon, color, bg } = getConfig(n.type);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3.5 px-5 py-3.5 text-left transition-colors group",
        n.read
          ? "hover:bg-white/[0.03]"
          : "bg-white/[0.04] hover:bg-white/[0.065]",
      )}
    >
      {/* Icon badge */}
      <div className={cn("shrink-0 h-8 w-8 rounded-lg flex items-center justify-center mt-0.5", bg)}>
        <Icon className={cn("h-[15px] w-[15px]", color)} strokeWidth={1.8} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-[13px] leading-snug",
            n.read ? "text-white/50 font-normal" : "text-white font-medium",
          )}>
            {n.title}
          </p>
          {/* Gold unread dot */}
          {!n.read && (
            <span className="shrink-0 mt-[5px] h-1.5 w-1.5 rounded-full bg-[#C08B4E]" />
          )}
        </div>
        {n.body && (
          <p className="text-[12px] text-white/30 mt-0.5 leading-snug line-clamp-2">
            {n.body}
          </p>
        )}
        <p className="text-[11px] text-white/18 mt-1 font-medium">{timeAgo(n.createdAt)}</p>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                      */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="py-2 space-y-0">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-3.5 px-5 py-3.5">
          <div className="shrink-0 h-8 w-8 rounded-lg bg-white/5 animate-pulse" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
            <div className="h-2.5 bg-white/[0.03] rounded animate-pulse w-1/2" />
            <div className="h-2 bg-white/[0.03] rounded animate-pulse w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                           */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[16rem] px-8 text-center">
      <div className="h-12 w-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
        <Bell className="h-5 w-5 text-white/15" />
      </div>
      <p className="text-sm text-white/35 font-medium">All caught up</p>
      <p className="text-xs text-white/18 mt-1.5 leading-relaxed max-w-[200px]">
        Order updates, messages, and activity will appear here in real time.
      </p>
    </div>
  );
}
