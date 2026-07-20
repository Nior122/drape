import { Link, useSearch } from "wouter";
import { LoginForm } from "@/components/auth/LoginForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function LoginPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const isProducer = params.get("producer") === "true";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-serif tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground text-lg">Sign in to your account</p>
        </div>

        <div className="bg-card p-8 rounded-2xl border border-border shadow-2xl">
          <LoginForm />
          
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
            </div>
          </div>
          
          <GoogleSignInButton />
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline underline-offset-4">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
