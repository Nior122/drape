import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/auth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X, Bell, Sparkles } from "lucide-react";
import { getDashboardUrl, getDashboardLabel } from "@/lib/roles";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDesignerOrProducer = user?.role === "DESIGNER" || user?.role === "PRODUCER";
  const isAdmin = user?.role === "ADMIN";

  const navLinks: { href: string; label: string }[] = [
    { href: "/marketplace", label: "Designers" },
  ];

  if (user?.role === "ADMIN") {
    navLinks.push({ href: "/admin/dashboard", label: "Admin" });
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-app mx-auto">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="font-serif text-2xl text-primary tracking-tight font-bold">
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
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <>
                {isDesignerOrProducer && (
                  <Link
                    href="/designer/dashboard"
                    className={`text-sm tracking-wide transition-colors ${
                      location.startsWith("/designer") || location.startsWith("/producer")
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Studio
                  </Link>
                )}
                {user.role === "CLIENT" && (
                  <Link
                    href="/client/orders"
                    className={`text-sm tracking-wide transition-colors ${
                      location.startsWith("/client")
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    My Orders
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {user ? (
              <>
                <Link href={isDesignerOrProducer ? "/designer/ai-studio" : "/design/:slug"}>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={getDashboardUrl(user.role)}>
                  <Button variant="outline" size="sm" className="rounded-full text-xs h-8 px-3">
                    {getDashboardLabel(user.role)}
                  </Button>
                </Link>
                <button onClick={logout} className="hidden sm:block text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/login">
                <Button variant="default" size="sm" className="rounded-full text-xs h-8 px-4">
                  Sign in
                </Button>
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-foreground">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-fade-in">
          <div className="max-w-app mx-auto py-4 px-4 space-y-2">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm text-foreground hover:text-primary transition-colors">
                {link.label}
              </Link>
            ))}
            {user && (
              <Link href={getDashboardUrl(user.role)} onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm text-foreground hover:text-primary transition-colors">
                {getDashboardLabel(user.role)}
              </Link>
            )}
            {user && (
              <button onClick={() => { logout(); setMobileOpen(false); }}
                className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign out
              </button>
            )}
            {!user && (
              <Link href="/login" onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm text-primary font-medium">
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
