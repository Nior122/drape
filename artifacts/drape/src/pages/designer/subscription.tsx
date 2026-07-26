import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Loader2,
  AlertCircle,
  Check,
  X,
  Crown,
  Star,
  Sparkles,
  Clock,
  ArrowRight,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

type SubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  highlighted: boolean;
  isCurrent?: boolean;
};

type CurrentSubscription = {
  id: string;
  planId: string;
  planName: string;
  status: "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIALING";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
};

type BillingHistoryItem = {
  id: string;
  date: string;
  amount: number;
  description: string;
  status: "PAID" | "PENDING" | "FAILED";
};

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  CANCELLED: { label: "Cancelled", color: "text-red-400", bg: "bg-red-400/10" },
  PAST_DUE: { label: "Past Due", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  TRIALING: { label: "Trial", color: "text-blue-400", bg: "bg-blue-400/10" },
};

const PLAN_TIERS: Record<string, { icon: typeof Crown; color: string; bg: string }> = {
  Free: { icon: Star, color: "text-muted-foreground", bg: "bg-muted" },
  Basic: { icon: Star, color: "text-blue-400", bg: "bg-blue-400/10" },
  Pro: { icon: Crown, color: "text-[#C08B4E]", bg: "bg-[#C08B4E]/10" },
  Enterprise: { icon: Sparkles, color: "text-purple-400", bg: "bg-purple-400/10" },
};

export default function SubscriptionPage() {
  const queryClient = useQueryClient();
  const [changeDialog, setChangeDialog] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data: subscription, isLoading: subLoading, error: subError } = useQuery<CurrentSubscription>({
    queryKey: ["subscription"],
    queryFn: () => fetchApi<CurrentSubscription>("/api/business/subscription"),
  });

  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["subscription-plans"],
    queryFn: () => fetchApi<SubscriptionPlan[]>("/api/business/subscription-plans"),
  });

  const changeMutation = useMutation({
    mutationFn: (planId: string) =>
      fetchApi("/api/business/subscription", {
        method: "PATCH",
        body: JSON.stringify({ planId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      setChangeDialog(false);
      setSelectedPlanId(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      fetchApi("/api/business/subscription", {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });

  const { data: billingHistory } = useQuery<BillingHistoryItem[]>({
    queryKey: ["billing-history"],
    queryFn: () => fetchApi<BillingHistoryItem[]>("/api/business/subscription/billing-history"),
  });

  const isLoading = subLoading || plansLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (subError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm font-medium">Failed to load subscription</p>
        <p className="text-xs text-muted-foreground">
          {(subError as Error).message}
        </p>
      </div>
    );
  }

  const currentPlan = plans?.find((p) => p.id === subscription?.planId);
  const tierConfig = PLAN_TIERS[currentPlan?.name ?? "Free"] ?? PLAN_TIERS.Free;
  const TierIcon = tierConfig.icon;

  const billingStatus = subscription
    ? STATUS_STYLES[subscription.status] ?? STATUS_STYLES.ACTIVE
    : null;

  return (
    <div className="p-6 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Subscription</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your plan and billing
        </p>
      </div>

      {/* Current Plan */}
      {subscription && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                tierConfig.bg
              )}
            >
              <TierIcon className={cn("h-6 w-6", tierConfig.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground">
                  {currentPlan?.name ?? subscription.planName}
                </h2>
                {billingStatus && (
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide",
                      billingStatus.color,
                      billingStatus.bg
                    )}
                  >
                    {billingStatus.label}
                  </span>
                )}
              </div>
              {currentPlan && (
                <p className="text-sm text-muted-foreground mt-1">
                  £{(currentPlan.price / 100).toFixed(0)} /{" "}
                  {currentPlan.interval}
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Current period:{" "}
                  {new Date(
                    subscription.currentPeriodStart
                  ).toLocaleDateString()}{" "}
                  –{" "}
                  {new Date(
                    subscription.currentPeriodEnd
                  ).toLocaleDateString()}
                </span>
                {subscription.cancelAtPeriodEnd && (
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Clock className="h-3 w-3" />
                    Cancels at period end
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => setChangeDialog(true)}
              >
                Change Plan
              </Button>
              {subscription.status === "ACTIVE" &&
                !subscription.cancelAtPeriodEnd && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Cancel
                  </Button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Available Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(plans ?? []).map((plan) => {
            const pTier = PLAN_TIERS[plan.name] ?? PLAN_TIERS.Free;
            const PIcon = pTier.icon;
            const isCurrent = plan.id === subscription?.planId;
            return (
              <div
                key={plan.id}
                className={cn(
                  "bg-card rounded-xl border p-5 transition-all",
                  plan.highlighted
                    ? "border-primary/50 ring-1 ring-primary/20"
                    : "border-border",
                  isCurrent && "ring-1 ring-emerald-500/30"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                    pTier.bg
                  )}
                >
                  <PIcon className={cn("h-5 w-5", pTier.color)} />
                </div>
                <h3 className="font-semibold text-foreground">
                  {plan.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  {plan.description}
                </p>
                <p className="text-2xl font-bold text-foreground mb-4">
                  £{(plan.price / 100).toFixed(0)}
                  <span className="text-xs font-normal text-muted-foreground">
                    /{plan.interval}
                  </span>
                </p>
                <ul className="space-y-2 mb-5">
                  {plan.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Badge
                    variant="outline"
                    className="w-full justify-center"
                  >
                    Current Plan
                  </Badge>
                ) : (
                  <Button
                    variant={
                      plan.highlighted ? "default" : "outline"
                    }
                    className="w-full"
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setChangeDialog(true);
                    }}
                  >
                    {plan.price === 0 ? "Get Started" : "Select"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing History */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Billing History
        </h2>
        {!billingHistory || billingHistory.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No billing history yet
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {billingHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground font-mono">
                      £{(item.amount / 100).toFixed(2)}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] mt-0.5",
                        item.status === "PAID"
                          ? "text-emerald-400 border-emerald-400/30"
                          : item.status === "PENDING"
                            ? "text-yellow-400 border-yellow-400/30"
                            : "text-red-400 border-red-400/30"
                      )}
                    >
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Change Plan Dialog */}
      <Dialog
        open={changeDialog}
        onOpenChange={(open) => {
          if (!open) {
            setChangeDialog(false);
            setSelectedPlanId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to change your subscription plan?
            {selectedPlanId &&
              currentPlan &&
              selectedPlanId !== currentPlan.id && (
                <span className="block mt-2">
                  Current: <strong>{currentPlan.name}</strong> →{" "}
                  <strong>
                    {plans?.find((p) => p.id === selectedPlanId)?.name}
                  </strong>
                </span>
              )}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (selectedPlanId) changeMutation.mutate(selectedPlanId);
              }}
              disabled={changeMutation.isPending || !selectedPlanId}
            >
              {changeMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
