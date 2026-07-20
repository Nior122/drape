import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Compass, Package, Sparkles, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth";
import {
  useGetClientNotifications,
  getGetClientNotificationsQueryKey,
} from "@workspace/api-client-react";
import NotificationsPanel from "@/components/client/NotificationsPanel";
import { useNotificationStream } from "@/hooks/use-notification-stream";

const NAV = [
  { href: "/client/discover", icon: Compass, label: "Discover" },
  { href: "/client/orders", icon: Package, label: "Orders" },
  { href: "/client/profile", icon: Sparkles, label: "Style" },
];

function isActive(location: string, href: string) {
  return location === href || location.startsWith(href + "/");
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();
  useNotificationStream(!!user);

  const { data: notifData } = useGetClientNotifications({
    query: { refetchInterval: 30_000, enabled: !!user, queryKey: getGetClientNotificationsQueryKey() },
  });
  const unreadCount = notifData?.unreadCount ?? 0;

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden lg:flex flex-col w-56 bg-sidebar border-r border-sidebar-border shrink-0">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <Link href="/">
            <span className="font-[Cormorant_Garamond] text-xl font-semibold tracking-[0.2em] text-primary cursor-pointer select-none">
              DRAPE
            </span>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = isActive(location, href);
            return (
              <Link key={href} href={href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer select-none",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                  )}
                >
                  <Icon size={17} strokeWidth={active ? 2.5 : 1.8} />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-sidebar-border space-y-0.5">
          <button
            onClick={() => setNotifOpen(true)}
            className="relative flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 transition-all"
          >
            <Bell size={17} strokeWidth={1.8} />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1.5">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[11px] font-bold shrink-0 select-none">
              {user?.name?.[0]?.toUpperCase() ?? "C"}
            </div>
            <span className="text-sm text-sidebar-foreground/55 truncate">
              {user?.name ?? user?.email}
            </span>
          </div>
        </div>
      </aside>

      {/* ── MAIN COLUMN ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-sidebar shrink-0">
          <Link href="/">
            <span className="font-[Cormorant_Garamond] text-lg font-semibold tracking-[0.2em] text-primary cursor-pointer select-none">
              DRAPE
            </span>
          </Link>
          <button
            onClick={() => setNotifOpen(true)}
            className="relative p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden flex border-t border-border bg-sidebar shrink-0 pb-safe">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = isActive(location, href);
            return (
              <Link key={href} href={href} className="flex-1">
                <div
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 transition-colors select-none",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon size={21} strokeWidth={active ? 2.5 : 1.5} />
                  <span className="text-[10px] font-medium">{label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Notifications slide-over */}
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
