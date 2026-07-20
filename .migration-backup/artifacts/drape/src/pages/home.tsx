import { Link } from "wouter";
import { useAuth } from "@/context/auth";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 bg-background text-foreground">
      
      {user && (
        <div className="absolute top-6 right-6 flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground font-serif">Welcome, {user.name}</span>
          <Button variant="outline" size="sm" onClick={() => logout.mutate(undefined)}>Logout</Button>
        </div>
      )}

      <main className="flex flex-col gap-8 row-start-2 items-center text-center max-w-2xl">
        <div className="flex flex-col gap-4">
          <h1 className="text-6xl md:text-8xl font-serif tracking-tight font-medium text-primary">Drape</h1>
          <p className="text-muted-foreground text-xl md:text-2xl font-serif">Bespoke fashion, made for you.</p>
        </div>
        
        <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          Step into a private atelier. Discover exceptional tailors and designers, commission custom pieces, and curate a wardrobe uniquely yours.
        </p>

        <div className="flex gap-4 items-center flex-col sm:flex-row mt-6">
          {!user ? (
            <>
              <Link
                href="/login"
                className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/80 text-sm sm:text-base h-12 px-8 font-medium tracking-wide shadow-[0_0_20px_rgba(201,168,76,0.2)]"
              >
                Enter the Club
              </Link>
              <Link
                href="/signup?producer=true"
                className="rounded-full border border-solid border-border transition-colors flex items-center justify-center hover:bg-accent hover:border-transparent text-sm sm:text-base h-12 px-8 text-muted-foreground hover:text-foreground"
              >
                Apply as a Designer
              </Link>
            </>
          ) : (
            <Link
              href={user.role === "CLIENT" ? "/marketplace" : "/dashboard/producer"}
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/80 text-sm sm:text-base h-12 px-8 font-medium tracking-wide shadow-[0_0_20px_rgba(201,168,76,0.2)]"
            >
              {user.role === "CLIENT" ? "Browse Marketplace" : "My Atelier"}
            </Link>
          )}
        </div>
      </main>
      
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Drape. All rights reserved.</p>
      </footer>
    </div>
  );
}
