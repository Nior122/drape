import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Settings,
  Loader2,
  AlertCircle,
  Save,
  Building2,
  Globe,
  Percent,
  Hash,
  Bell,
  Image,
  MapPin,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type BusinessSettings = {
  brandName: string;
  logoUrl: string;
  businessAddress: string;
  currency: string;
  timezone: string;
  taxRate: number;
  invoicePrefix: string;
  notifications: {
    emailNotifications: boolean;
    orderUpdates: boolean;
    marketingEmails: boolean;
  };
};

const CURRENCIES = [
  { value: "GBP", label: "£ GBP — British Pound" },
  { value: "USD", label: "$ USD — US Dollar" },
  { value: "EUR", label: "€ EUR — Euro" },
  { value: "NGN", label: "₦ NGN — Nigerian Naira" },
  { value: "KES", label: "KSh KES — Kenyan Shilling" },
  { value: "ZAR", label: "R ZAR — South African Rand" },
  { value: "GHS", label: "₵ GHS — Ghanaian Cedi" },
];

const TIMEZONES = [
  "Europe/London",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Africa/Accra",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const defaultSettings: BusinessSettings = {
  brandName: "",
  logoUrl: "",
  businessAddress: "",
  currency: "GBP",
  timezone: "Europe/London",
  taxRate: 20,
  invoicePrefix: "INV-",
  notifications: {
    emailNotifications: true,
    orderUpdates: true,
    marketingEmails: false,
  },
};

export default function BusinessSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BusinessSettings>(defaultSettings);
  const [initialized, setInitialized] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data, isLoading, error } = useQuery<BusinessSettings>({
    queryKey: ["business-settings"],
    queryFn: () => fetchApi<BusinessSettings>("/api/business/settings"),
  });

  // Sync fetched data into form once
  if (data && !initialized) {
    setForm(data);
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: (settings: BusinessSettings) =>
      fetchApi<BusinessSettings>("/api/business/settings", {
        method: "PATCH",
        body: JSON.stringify(settings),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-settings"] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const updateField = <K extends keyof BusinessSettings>(
    field: K,
    value: BusinessSettings[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateNotification = (
    field: keyof BusinessSettings["notifications"],
    value: boolean
  ) => {
    setForm((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [field]: value },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm font-medium">Failed to load settings</p>
        <p className="text-xs text-muted-foreground">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Business Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure your business profile and preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 font-medium animate-pulse">
              Saved!
            </span>
          )}
          <Button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
      </div>

      {/* Brand Section */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Brand Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Brand Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={form.brandName}
                onChange={(e) => updateField("brandName", e.target.value)}
                placeholder="My Design Studio"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Logo URL
            </label>
            <div className="relative">
              <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={form.logoUrl}
                onChange={(e) => updateField("logoUrl", e.target.value)}
                placeholder="https://example.com/logo.png"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">
              Business Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={form.businessAddress}
                onChange={(e) =>
                  updateField("businessAddress", e.target.value)
                }
                placeholder="123 Fashion Street, London, UK"
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Localization Section */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Localization
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Currency
            </label>
            <Select
              value={form.currency}
              onValueChange={(v) => updateField("currency", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Timezone
            </label>
            <Select
              value={form.timezone}
              onValueChange={(v) => updateField("timezone", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Tax Rate (%)
            </label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                min={0}
                max={100}
                value={form.taxRate}
                onChange={(e) =>
                  updateField("taxRate", parseInt(e.target.value) || 0)
                }
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Section */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Hash className="h-4 w-4 text-primary" />
          Invoice Settings
        </h2>
        <div className="space-y-1.5 max-w-xs">
          <label className="text-xs font-medium text-muted-foreground">
            Invoice Number Prefix
          </label>
          <Input
            value={form.invoicePrefix}
            onChange={(e) =>
              updateField("invoicePrefix", e.target.value)
            }
            placeholder="INV-"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Example: {form.invoicePrefix || "INV-"}001
          </p>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Notification Preferences
        </h2>
        <div className="space-y-3">
          {[
            {
              key: "emailNotifications" as const,
              label: "Email Notifications",
              desc: "Receive email updates about your business",
            },
            {
              key: "orderUpdates" as const,
              label: "Order Updates",
              desc: "Get notified when orders change status",
            },
            {
              key: "marketingEmails" as const,
              label: "Marketing Emails",
              desc: "Receive tips, offers, and product updates",
            },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-start gap-3 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={form.notifications[item.key]}
                onChange={(e) =>
                  updateNotification(item.key, e.target.checked)
                }
                className="mt-0.5 rounded border-input"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Save bar for mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-card border-t border-border p-4">
        <Button
          className="w-full"
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
