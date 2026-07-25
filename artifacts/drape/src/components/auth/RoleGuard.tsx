import React from "react";
import { useAuth } from "../../context/auth";
import { Link, Redirect } from "wouter";
import { Loader2, ShieldOff } from "lucide-react";
import { getDashboardUrl } from "../../lib/roles";

interface RoleGuardProps {
  children: React.ReactNode;
  roles: string[];
  /** Fallback destination when role doesn't match. Defaults to 403 page. */
  fallback?: "403" | "redirect";
}

/**
 * RoleGuard — renders children only if the current user has one of the
 * allowed roles. Otherwise shows a 403 page or redirects to the user's
 * correct dashboard.
 */
export function RoleGuard({ children, roles, fallback = "403" }: RoleGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null; // ProtectedRoute should handle this

  if (!roles.includes(user.role)) {
    if (fallback === "redirect") {
      return <Redirect to={getDashboardUrl(user.role)} />;
    }
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}

function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center gap-6">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <ShieldOff className="w-8 h-8 text-red-400" />
      </div>
      <h1 className="text-2xl font-serif font-medium text-foreground">Access Denied</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        You don't have permission to view this page. If you believe this is
        a mistake, please contact support.
      </p>
      <Link
        href="/"
        className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition"
      >
        Go Home
      </Link>
    </div>
  );
}
