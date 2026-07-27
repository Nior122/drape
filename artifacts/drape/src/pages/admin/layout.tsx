import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, UserCheck, MessageSquare, CreditCard,
  ToggleLeft, ScrollText, Settings, LogOut, Menu, X,
} from "lucide-react";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/designers", label: "Designers", icon: UserCheck },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/feature-flags", label: "Feature Flags", icon: ToggleLeft },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function isActive(loc: string, href: string) {
  return loc === href || loc.startsWith(href + "/");
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── SIDEBAR OVERLAY (mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-56 bg-sidebar border-r border-sidebar-border shrink-0 transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
          <Link href="/">
            <span className="font-[Cormorant_Garamond] text-xl font-semibold tracking-[0.2em] text-primary cursor-pointer select-none">
              DRAPE
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/50 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav
          className="flex-1 p-3 space-y-0.5 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 130px)" }}
        >
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(location, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-3 border-t border-sidebar-border space-y-1">
            <div className="px-3 py-1.5 text-xs text-sidebar-foreground/60 truncate">
              {user.email}
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto bg-background lg:pt-0 pt-14">
        <div className="min-h-full">{children}</div>
      </main>

      {/* ── BOTTOM NAV (mobile) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden flex bg-[#111111] border-t border-white/10 pb-safe">
        {NAV.filter((_, i) => i < 5).map(({ href, label, icon: Icon }) => {
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

      {/* ── MOBILE HEADER ── */}
      <div className="fixed top-0 left-0 right-0 z-20 lg:hidden flex items-center justify-between px-4 h-14 bg-[#111111] border-b border-white/10">
        <span className="font-[Cormorant_Garamond] text-lg font-semibold tracking-[0.2em] text-primary select-none">
          DRAPE
        </span>
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-white/50 hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
