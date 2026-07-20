import { useAuth } from "@/context/auth";
import { Button } from "@/components/ui/button";

export default function ProducerDashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-serif">Producer Dashboard</h1>
          <Button variant="outline" onClick={() => logout.mutate(undefined)}>
            Logout
          </Button>
        </div>
        <div className="p-8 bg-card border rounded-xl text-center space-y-4">
          <p className="text-xl font-serif">Welcome, {user?.name}</p>
          <p className="text-muted-foreground">
            Coming soon — manage your storefront and orders.
          </p>
        </div>
      </div>
    </div>
  );
}
