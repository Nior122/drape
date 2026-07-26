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
  Box, Truck, ShoppingCart, FileText, Wallet, Calculator,
  CreditCard, SettingsIcon, ClipboardList,
} from "lucide-react";
import NotificationsPanel from "@/components/client/NotificationsPanel";
import { useNotificationStream } from "@/hooks/use-notification-stream";

const NAV = [
  { href: "/designer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/designer/ai-studio", label: "AI Studio", icon: Sparkles },
  { href: "/designer/projects", label: "Projects", icon: Package },
  { href: "/designer/clients",  label: "Clients",   icon: Users },
  { href: "/designer/portfolio", label: "Portfolio", icon: ImageIcon },
  { href: "/designer/messages",  label: "Messages",  icon: MessageSquare },
  { href: "/designer/storefront", label: "Storefront", icon: Store },
  { href: "/designer/analytics", label: "Analytics", icon: BarChart2 },
  // ── Phase 7 — Business Management ──
  { href: "/designer/inventory", label: "Inventory", icon: Box },
  { href: "/designer/suppliers", label: "Suppliers", icon: Truck },
  { href: "/designer/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
  { href: "/designer/invoices", label: "Invoices", icon: FileText },
  { href: "/designer/expenses", label: "Expenses", icon: Wallet },
  { href: "/designer/profit-calculator", label: "Profit Calculator", icon: Calculator },
  { href: "/designer/business-analytics", label: "Business Analytics", icon: TrendingUp },
  { href: "/designer/subscription", label: "Subscription", icon: CreditCard },
  { href: "/designer/business-settings", label: "Business Settings", icon: SettingsIcon },
  { href: "/designer/business-reports", label: "Reports", icon: ClipboardList },
  { href: "/designer/calendar", label: "Calendar", icon: Calendar },
  { href: "/designer/team",     label: "Team",     icon: Shield },
  { href: "/designer/profile",   label: "Profile",   icon: UserCircle },
];

function isActive(loc: string, href: string, hrefLegacy?: string) {
  return loc === href || loc.startsWith(href + "/") || (!!hrefLegacy && (loc === hrefLegacy || loc.startsWith(hrefLegacy + "/")));
}

export default function ProducerLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  useNotificationStream(!!user);

  const { data: notifData } = useGetClientNotifications({
    query: { refetchInterval: 30_000, enabled: !!user, queryKey: getGetClientNotificationsQueryKey() },
  });
  const unreadCount = notifData?.unreadCount ?? 0;

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* ── MOBILE HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-40 lg:hidden flex items-center justify-between px-4 h-14 bg-sidebar border-b border-sidebar-border">
        <button onClick={() => setSidebarOpen(true)} className="text-white/70 hover:text-white">
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-[Cormorant_Garamond] text-lg font-semibold tracking-[0.2em] text-primary">DRAPE</span>
        <button onClick={() => setNotifOpen(true)} className="relative text-white/70 hover:text-white">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] flex items-center justify-center font-medium text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
      </header>

      {/* ── SIDEBAR OVERLAY (mobile) ── */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-56 bg-sidebar border-r border-sidebar-border shrink-0 transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
          <Link href="/">
            <span className="font-[Cormorant_Garamond] text-xl font-semibold tracking-[0.2em] text-primary cursor-pointer select-none">DRAPE</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/50 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 130px)" }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(location, href);
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active ? "bg-primary/10 text-primary font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto bg-background lg:pt-0 pt-14">
        <div className="min-h-full">
          {children}
        </div>
      </main>

      {/* ── BOTTOM NAV (mobile) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden flex bg-[#111111] border-t border-white/10 pb-safe">
        {NAV.filter((_, i) => i < 5).map(({ href, label, icon: Icon }) => {
          const active = isActive(location, href);
          return (
            <Link key={href} href={href}
              className={cn("flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors", active ? "text-[#C08B4E]" : "text-white/40")}>
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
