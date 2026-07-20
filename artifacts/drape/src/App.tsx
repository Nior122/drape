import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getToken } from "@/lib/token-storage";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublicOnlyRoute } from "@/components/auth/PublicOnlyRoute";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import MarketplacePage from "@/pages/marketplace";
import StorefrontPage from "@/pages/storefront";
import ClientDashboardPage from "@/pages/dashboard/client";
import ProducerDashboardPage from "@/pages/dashboard/producer";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import OnboardingPage from "@/pages/onboarding";

import ClientLayout from "@/pages/client/layout";
import OrdersPage from "@/pages/client/orders";
import OrderDetailPage from "@/pages/client/order-detail";
import ProfilePage from "@/pages/client/profile";
import DiscoverPage from "@/pages/client/discover";

import DesignSessionPage from "@/pages/design-session";

import ProducerLayout from "@/pages/producer/layout";
import ProducerDashboard from "@/pages/producer/dashboard";
import ProducerOrders from "@/pages/producer/orders";
import ProducerOrderDetail from "@/pages/producer/order-detail";
import ProducerClients from "@/pages/producer/clients";
import ProducerStorefront from "@/pages/producer/storefront";
import ProducerAnalytics from "@/pages/producer/analytics";

setAuthTokenGetter(getToken);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ClientRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <ClientLayout>{children}</ClientLayout>
    </ProtectedRoute>
  );
}

function ProducerRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <ProducerLayout>{children}</ProducerLayout>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={HomePage} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/designers/:slug" component={StorefrontPage} />
      <Route path="/design/:designerSlug" component={DesignSessionPage} />

      {/* Public-only auth routes */}
      <Route path="/login">
        <PublicOnlyRoute><LoginPage /></PublicOnlyRoute>
      </Route>
      <Route path="/signup">
        <PublicOnlyRoute><SignupPage /></PublicOnlyRoute>
      </Route>

      {/* Shared protected routes */}
      <Route path="/onboarding">
        <ProtectedRoute><OnboardingPage /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/client">
        <ProtectedRoute><ClientDashboardPage /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/producer">
        <ProtectedRoute><ProducerDashboardPage /></ProtectedRoute>
      </Route>

      {/* ── Client experience ── */}
      <Route path="/client">
        <ClientRoute><Redirect to="/client/orders" /></ClientRoute>
      </Route>
      <Route path="/client/orders/:id">
        <ClientRoute><OrderDetailPage /></ClientRoute>
      </Route>
      <Route path="/client/orders">
        <ClientRoute><OrdersPage /></ClientRoute>
      </Route>
      <Route path="/client/profile">
        <ClientRoute><ProfilePage /></ClientRoute>
      </Route>
      <Route path="/client/discover">
        <ClientRoute><DiscoverPage /></ClientRoute>
      </Route>

      {/* ── Producer / Studio experience ── */}
      <Route path="/producer">
        <ProducerRoute><Redirect to="/producer/dashboard" /></ProducerRoute>
      </Route>
      <Route path="/producer/dashboard">
        <ProducerRoute><ProducerDashboard /></ProducerRoute>
      </Route>
      <Route path="/producer/orders/:id">
        <ProducerRoute><ProducerOrderDetail /></ProducerRoute>
      </Route>
      <Route path="/producer/orders">
        <ProducerRoute><ProducerOrders /></ProducerRoute>
      </Route>
      <Route path="/producer/clients">
        <ProducerRoute><ProducerClients /></ProducerRoute>
      </Route>
      <Route path="/producer/storefront">
        <ProducerRoute><ProducerStorefront /></ProducerRoute>
      </Route>
      <Route path="/producer/analytics">
        <ProducerRoute><ProducerAnalytics /></ProducerRoute>
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
