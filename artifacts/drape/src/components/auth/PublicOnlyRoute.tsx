import React from "react";
import { useAuth } from "../../context/auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    if (!user.onboardingComplete) {
      return <Redirect to="/onboarding" />;
    }
    return <Redirect to={user.role === "CLIENT" ? "/marketplace" : "/dashboard/producer"} />;
  }

  return <>{children}</>;
}
