import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublicOnlyRoute } from "@/components/auth/PublicOnlyRoute";

import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import MarketplacePage from "@/pages/marketplace";
import ClientDashboardPage from "@/pages/dashboard/client";
import ProducerDashboardPage from "@/pages/dashboard/producer";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import OnboardingPage from "@/pages/onboarding";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      
      {/* Public Only Auth Routes */}
      <Route path="/login">
        <PublicOnlyRoute><LoginPage /></PublicOnlyRoute>
      </Route>
      <Route path="/signup">
        <PublicOnlyRoute><SignupPage /></PublicOnlyRoute>
      </Route>

      {/* Protected Routes */}
      <Route path="/onboarding">
        <ProtectedRoute><OnboardingPage /></ProtectedRoute>
      </Route>
      <Route path="/marketplace">
        <ProtectedRoute><MarketplacePage /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/client">
        <ProtectedRoute><ClientDashboardPage /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/producer">
        <ProtectedRoute><ProducerDashboardPage /></ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
