import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getToken } from "@/lib/token-storage";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublicOnlyRoute } from "@/components/auth/PublicOnlyRoute";
import { RoleGuard } from "@/components/auth/RoleGuard";
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
import ClientProfilePage from "@/pages/client/profile";
import DiscoverPage from "@/pages/client/discover";

import DesignSessionPage from "@/pages/design-session";

import ProducerLayout from "@/pages/producer/layout";
import ProducerDashboard from "@/pages/producer/dashboard";
import ProducerOrders from "@/pages/producer/orders";
import ProducerOrderDetail from "@/pages/producer/order-detail";
import ProducerClients from "@/pages/producer/clients";
import ProducerStorefront from "@/pages/producer/storefront";
import ProducerAnalytics from "@/pages/producer/analytics";
import ProjectsBoardPage from "@/pages/producer/projects-board";
import ProjectWorkspacePage from "@/pages/producer/project-workspace";
import CalendarPage from "@/pages/producer/calendar";
import TeamPage from "@/pages/producer/team";
import ReportsPage from "@/pages/producer/reports";

// New Designer pages
import AiStudioPage from "@/pages/producer/ai-studio";
import PortfolioPage from "@/pages/producer/portfolio";
import MessagesPage from "@/pages/producer/messages";
import DesignerProfilePage from "@/pages/producer/profile";

// ── Phase 7 — Business Management pages ──
import InventoryPage from "@/pages/designer/inventory";
import SuppliersPage from "@/pages/designer/suppliers";
import PurchaseOrdersPage from "@/pages/designer/purchase-orders";
import InvoicesPage from "@/pages/designer/invoices";
import ExpensesPage from "@/pages/designer/expenses";
import ProfitCalculatorPage from "@/pages/designer/profit-calculator";
import BusinessAnalyticsPage from "@/pages/designer/business-analytics";
import SubscriptionPage from "@/pages/designer/subscription";
import BusinessSettingsPage from "@/pages/designer/business-settings";
import BusinessReportsPage from "@/pages/designer/reports";

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

// ── Role-wrapped layouts ──────────────────────────────────────────────────

function ClientRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleGuard roles={["CLIENT"]}>
        <ClientLayout>{children}</ClientLayout>
      </RoleGuard>
    </ProtectedRoute>
  );
}

function DesignerRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleGuard roles={["DESIGNER", "PRODUCER"]}>
        <ProducerLayout>{children}</ProducerLayout>
      </RoleGuard>
    </ProtectedRoute>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleGuard roles={["ADMIN"]}>
        {children}
      </RoleGuard>
    </ProtectedRoute>
  );
}

// ── Router ────────────────────────────────────────────────────────────────

function Router() {
  return (
    <Switch>
      {/* ── Public routes ── */}
      <Route path="/" component={HomePage} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/designers/:slug" component={StorefrontPage} />
      <Route path="/design/:designerSlug" component={DesignSessionPage} />

      {/* ── Public-only auth routes ── */}
      <Route path="/login">
        <PublicOnlyRoute><LoginPage /></PublicOnlyRoute>
      </Route>
      <Route path="/signup">
        <PublicOnlyRoute><SignupPage /></PublicOnlyRoute>
      </Route>

      {/* ── Shared protected routes ── */}
      <Route path="/onboarding">
        <ProtectedRoute><OnboardingPage /></ProtectedRoute>
      </Route>
      <Route path="/dashboard/client">
        <ProtectedRoute>
          <RoleGuard roles={["CLIENT"]}><ClientDashboardPage /></RoleGuard>
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/producer">
        <ProtectedRoute>
          <RoleGuard roles={["DESIGNER", "PRODUCER"]}><ProducerDashboardPage /></RoleGuard>
        </ProtectedRoute>
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
        <ClientRoute><ClientProfilePage /></ClientRoute>
      </Route>
      <Route path="/client/discover">
        <ClientRoute><DiscoverPage /></ClientRoute>
      </Route>

      {/* ── Designer / Studio experience ── */}
      <Route path="/designer">
        <DesignerRoute><Redirect to="/designer/dashboard" /></DesignerRoute>
      </Route>
      <Route path="/designer/dashboard">
        <DesignerRoute><ProducerDashboard /></DesignerRoute>
      </Route>
      <Route path="/designer/ai-studio">
        <DesignerRoute><AiStudioPage /></DesignerRoute>
      </Route>
      <Route path="/designer/projects">
        <DesignerRoute><ProjectsBoardPage /></DesignerRoute>
      </Route>
      <Route path="/designer/projects/:id">
        <DesignerRoute><ProjectWorkspacePage /></DesignerRoute>
      </Route>
      <Route path="/designer/orders/:id">
        <DesignerRoute><ProducerOrderDetail /></DesignerRoute>
      </Route>
      <Route path="/designer/orders">
        <DesignerRoute><ProducerOrders /></DesignerRoute>
      </Route>
      <Route path="/designer/clients">
        <DesignerRoute><ProducerClients /></DesignerRoute>
      </Route>
      <Route path="/designer/portfolio">
        <DesignerRoute><PortfolioPage /></DesignerRoute>
      </Route>
      <Route path="/designer/messages">
        <DesignerRoute><MessagesPage /></DesignerRoute>
      </Route>
      <Route path="/designer/storefront">
        <DesignerRoute><ProducerStorefront /></DesignerRoute>
      </Route>
      <Route path="/designer/analytics">
        <DesignerRoute><ProducerAnalytics /></DesignerRoute>
      </Route>
      <Route path="/designer/calendar">
        <DesignerRoute><CalendarPage /></DesignerRoute>
      </Route>
      <Route path="/designer/team">
        <DesignerRoute><TeamPage /></DesignerRoute>
      </Route>
      <Route path="/designer/reports">
        <DesignerRoute><ReportsPage /></DesignerRoute>
      </Route>
      <Route path="/designer/profile">
        <DesignerRoute><DesignerProfilePage /></DesignerRoute>
      </Route>

      {/* ── Phase 7 — Business Management routes ── */}
      <Route path="/designer/inventory">
        <DesignerRoute><InventoryPage /></DesignerRoute>
      </Route>
      <Route path="/designer/suppliers">
        <DesignerRoute><SuppliersPage /></DesignerRoute>
      </Route>
      <Route path="/designer/purchase-orders">
        <DesignerRoute><PurchaseOrdersPage /></DesignerRoute>
      </Route>
      <Route path="/designer/invoices">
        <DesignerRoute><InvoicesPage /></DesignerRoute>
      </Route>
      <Route path="/designer/expenses">
        <DesignerRoute><ExpensesPage /></DesignerRoute>
      </Route>
      <Route path="/designer/profit-calculator">
        <DesignerRoute><ProfitCalculatorPage /></DesignerRoute>
      </Route>
      <Route path="/designer/business-analytics">
        <DesignerRoute><BusinessAnalyticsPage /></DesignerRoute>
      </Route>
      <Route path="/designer/subscription">
        <DesignerRoute><SubscriptionPage /></DesignerRoute>
      </Route>
      <Route path="/designer/business-settings">
        <DesignerRoute><BusinessSettingsPage /></DesignerRoute>
      </Route>
      <Route path="/designer/business-reports">
        <DesignerRoute><BusinessReportsPage /></DesignerRoute>
      </Route>

      {/* ── Legacy /producer/* routes — redirect to /designer/* where possible ── */}
      <Route path="/producer">
        <DesignerRoute><Redirect to="/designer/dashboard" /></DesignerRoute>
      </Route>
      <Route path="/producer/dashboard">
        <DesignerRoute><ProducerDashboard /></DesignerRoute>
      </Route>
      <Route path="/producer/orders/:id">
        <DesignerRoute><ProducerOrderDetail /></DesignerRoute>
      </Route>
      <Route path="/producer/orders">
        <DesignerRoute><ProducerOrders /></DesignerRoute>
      </Route>
      <Route path="/producer/clients">
        <DesignerRoute><ProducerClients /></DesignerRoute>
      </Route>
      <Route path="/producer/storefront">
        <DesignerRoute><ProducerStorefront /></DesignerRoute>
      </Route>
      <Route path="/producer/analytics">
        <DesignerRoute><ProducerAnalytics /></DesignerRoute>
      </Route>
      <Route path="/producer/ai-studio">
        <DesignerRoute><AiStudioPage /></DesignerRoute>
      </Route>
      <Route path="/producer/calendar">
        <DesignerRoute><CalendarPage /></DesignerRoute>
      </Route>
      <Route path="/producer/team">
        <DesignerRoute><TeamPage /></DesignerRoute>
      </Route>
      <Route path="/producer/reports">
        <DesignerRoute><ReportsPage /></DesignerRoute>
      </Route>
      <Route path="/producer/profile">
        <DesignerRoute><DesignerProfilePage /></DesignerRoute>
      </Route>
      <Route path="/producer/messages">
        <DesignerRoute><MessagesPage /></DesignerRoute>
      </Route>

      {/* ── Admin routes ── */}
      <Route path="/admin">
        <AdminRoute><Redirect to="/admin/dashboard" /></AdminRoute>
      </Route>
      <Route path="/admin/dashboard">
        <AdminRoute>
          <div className="min-h-screen flex items-center justify-center bg-background">
            <p className="text-muted-foreground text-lg">Admin dashboard — coming in a future phase</p>
          </div>
        </AdminRoute>
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
