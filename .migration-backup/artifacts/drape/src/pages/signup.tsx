import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SignupInputRole } from "@workspace/api-client-react/src/generated/api.schemas";
import { RoleStep } from "@/components/auth/signup/RoleStep";
import { AccountStep } from "@/components/auth/signup/AccountStep";
import { Link, useLocation } from "wouter";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<SignupInputRole>("CLIENT");
  const [, setLocation] = useLocation();

  const handleRoleSelect = (selectedRole: SignupInputRole) => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleSignupComplete = () => {
    // We navigate to /onboarding because signup doesn't set onboardingComplete = true
    setLocation("/onboarding");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-4 text-center mb-10">
                <h1 className="text-4xl font-serif tracking-tight">Join Drape</h1>
                <p className="text-muted-foreground text-lg">How would you like to use our platform?</p>
              </div>
              <RoleStep onSelect={handleRoleSelect} />
              <div className="mt-8 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline underline-offset-4">
                  Sign in
                </Link>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-2 mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-serif tracking-tight">Create Account</h1>
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back
                </button>
              </div>
              <div className="bg-card p-6 md:p-8 rounded-2xl border border-border shadow-2xl">
                <AccountStep role={role} onComplete={handleSignupComplete} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
