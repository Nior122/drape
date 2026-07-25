import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/auth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { getDashboardUrl, getDashboardLabel } from "@/lib/roles";

export function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDesignerOrProducer = user?.role === "DESIGNER" || user?.role === "PRODUCER";
  const isAdmin = user?.role === "ADMIN";

  const navLinks: { href: string; label: string }[] = [
    { href: "/marketplace", label: "Designers" },
  ];

  // Role-specific nav links
  if (user && isAdmin) {
    navLinks.push({ href: "/admin/dashboard", label: "Admin" });
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="font-serif text-2xl text-primary tracking-tight font-medium">
            Drape
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm tracking-wide transition-colors ${
                  location === link.href
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user && isDesignerOrProducer && (
              <Link
                href="/designer/dashboard"
                className={`text-sm tracking-wide transition-colors ${
                  location.startsWith("/designer") || location.startsWith("/producer")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Studio
              </Link>
            )}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href={getDashboardUrl(user.role)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {getDashboardLabel(user.role)}
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => logout.mutate(undefined)}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="rounded-full text-xs">
                    Join Drape
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-foreground p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-white/5 pt-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-sm text-foreground py-1"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href={getDashboardUrl(user.role)}
                  className="block text-sm text-foreground py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  {getDashboardLabel(user.role)}
                </Link>
                <button
                  className="text-sm text-muted-foreground py-1"
                  onClick={() => { logout.mutate(undefined); setMobileOpen(false); }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block text-sm text-foreground py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="block text-sm text-foreground py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  Join Drape
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
