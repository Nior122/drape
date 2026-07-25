import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/auth";
import {
  useGetClientNotifications,
  getGetClientNotificationsQueryKey,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, Users, Store, BarChart2, LogOut,
  ChevronRight, Scissors, Menu, X, Bell, Sparkles, ImageIcon,
  MessageSquare, UserCircle, Calendar, Shield, TrendingUp,
} from "lucide-react";
import NotificationsPanel from "@/components/client/NotificationsPanel";
import { useNotificationStream } from "@/hooks/use-notification-stream";

const NAV = [
  { href: "/designer/dashboard", hrefLegacy: "/producer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/designer/ai-studio", label: "AI Studio", icon: Sparkles },
  { href: "/designer/projects", hrefLegacy: "/producer/orders", label: "Projects", icon: Package },
  { href: "/designer/clients",   hrefLegacy: "/producer/clients", label: "Clients",   icon: Users },
  { href: "/designer/portfolio", label: "Portfolio", icon: ImageIcon },
  { href: "/designer/messages",  label: "Messages",  icon: MessageSquare },
  { href: "/designer/storefront", hrefLegacy: "/producer/storefront", label: "Storefront", icon: Store },
  { href: "/designer/analytics", hrefLegacy: "/producer/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/designer/calendar", label: "Calendar", icon: Calendar },
  { href: "/designer/team",     label: "Team",     icon: Shield },
  { href: "/designer/reports",  label: "Reports",  icon: TrendingUp },
  { href: "/designer/profile",   label: "Profile",   icon: UserCircle },
];

function isActive(loc: string, href: string, hrefLegacy?: string) {
  return loc === href || loc.startsWith(href + "/") || (!!hrefLegacy && (loc === hrefLegacy || loc.startsWith(hrefLegacy + "/")));
}

export default function ProducerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useNotificationStream(!!user);

  const { data } = useGetClientNotifications({
    query: { queryKey: getGetClientNotificationsQueryKey(), refetchInterval: 30_000 },
  });
  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "P";

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-2 mb-0.5">
          <Scissors className="h-4 w-4 text-[#C08B4E]" />
          <span className="text-base font-bold tracking-[0.2em] text-white">DRAPE</span>
        </div>
        <span className="text-[10px] tracking-[0.15em] text-white/30 uppercase pl-6">Designer Portal</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, hrefLegacy, label, icon: Icon }) => {
          const active = isActive(location, href, hrefLegacy);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                active ? "bg-[#C08B4E]/15 text-[#C08B4E]" : "text-white/50 hover:text-white hover:bg-white/5",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {active && <ChevronRight className="h-3 w-3 ml-auto text-[#C08B4E]" />}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-4 border-t border-white/10 pt-3 space-y-1">
        <button
          onClick={() => setNotifOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          <div className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#C08B4E] text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          Notifications
        </button>
        <button
          onClick={() => logout.mutate(undefined, { onSuccess: () => navigate("/login") })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
        <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
          <div className="w-7 h-7 rounded-full bg-[#C08B4E]/20 flex items-center justify-center text-[#C08B4E] text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name ?? "Designer"}</p>
            <p className="text-[10px] text-white/30 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0E0E0E] text-white overflow-hidden">
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-[#111111] border-r border-white/10">
        <Sidebar />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-[#111111] border-b border-white/10">
        <div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-[#C08B4E]" />
          <span className="text-sm font-bold tracking-[0.2em] text-white">DRAPE</span>
          <span className="text-[9px] tracking-wider text-white/30">STUDIO</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setNotifOpen(true)} className="relative p-2 text-white/50 hover:text-white">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-[#C08B4E] text-white text-[9px] font-bold rounded-full w-[14px] h-[14px] flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setMobileOpen(true)} className="p-2 text-white/50 hover:text-white">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-[#111111] h-full flex flex-col">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto md:pt-0 pt-14 md:pb-0 pb-16">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex bg-[#111111] border-t border-white/10 pb-safe">
        {NAV.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const active = isActive(location, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors",
                active ? "text-[#C08B4E]" : "text-white/40",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
