import { useAuth } from "@/context/auth";
import { Redirect, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ClientOnboardingStep } from "@/components/auth/signup/ClientOnboardingStep";
import { ProducerOnboardingStep } from "@/components/auth/signup/ProducerOnboardingStep";
import { getDashboardUrl } from "@/lib/roles";

export default function OnboardingPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!user) return <Redirect to="/login" />;
  if (user.onboardingComplete) {
    return <Redirect to={getDashboardUrl(user.role)} />;
  }

  const handleComplete = () => {
    setLocation(getDashboardUrl(user.role));
  };

  const isDesignerOrProducer = user.role === "DESIGNER" || user.role === "PRODUCER";
  const isAdmin = user.role === "ADMIN";

  // ADMIN users skip onboarding (no admin onboarding step exists yet)
  if (isAdmin) {
    return <Redirect to="/admin/dashboard" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background py-20">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-2 mb-10 text-center">
            <h1 className="text-4xl font-serif tracking-tight">Tell us more</h1>
            <p className="text-muted-foreground text-lg">
              {user.role === "CLIENT"
                ? "Help designers understand your personal style."
                : isDesignerOrProducer
                  ? "Set up your studio profile to receive commissions."
                  : "Complete your profile."}
            </p>
          </div>

          <div className="bg-card p-6 md:p-8 rounded-2xl border border-border shadow-2xl">
            {user.role === "CLIENT" ? (
              <ClientOnboardingStep onComplete={handleComplete} />
            ) : isDesignerOrProducer ? (
              <ProducerOnboardingStep onComplete={handleComplete} />
            ) : (
              // Fallback — mark onboarding complete
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Please complete your profile setup.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
