import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

const FLAG_KEYS = [
  "ai_enabled",
  "marketplace_enabled",
  "bookings_enabled",
  "reviews_enabled",
  "business_finance",
  "admin_panel",
  "maintenance_mode",
  "signup_enabled",
] as const;

type Flags = Record<(typeof FLAG_KEYS)[number], boolean>;

const FLAG_LABELS: Record<string, string> = {
  ai_enabled: "AI Studio",
  marketplace_enabled: "Marketplace",
  bookings_enabled: "Bookings",
  reviews_enabled: "Reviews",
  business_finance: "Business Finance",
  admin_panel: "Admin Panel",
  maintenance_mode: "Maintenance Mode",
  signup_enabled: "Signup",
};

const FLAG_DESCRIPTIONS: Record<string, string> = {
  ai_enabled: "Allow AI-powered design tools and features",
  marketplace_enabled: "Enable the designer marketplace",
  bookings_enabled: "Allow clients to book consultations",
  reviews_enabled: "Enable the review and rating system",
  business_finance: "Enable business finance management tools",
  admin_panel: "Enable access to the admin panel",
  maintenance_mode: "Put the platform in maintenance mode (blocks all users)",
  signup_enabled: "Allow new user registrations",
};

export default function AdminFeatureFlags() {
  const [flags, setFlags] = useState<Flags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchFlags = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/api/admin/feature-flags`);
        if (!res.ok) throw new Error(`Failed to fetch feature flags (${res.status})`);
        const json = await res.json();
        if (!cancelled) setFlags(json.data ?? json.flags ?? json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchFlags();
    return () => { cancelled = true; };
  }, []);

  const toggleFlag = async (key: string, value: boolean) => {
    try {
      setToggling(key);
      const res = await fetch(`${API_BASE}/api/admin/feature-flags/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: value }),
      });
      if (!res.ok) throw new Error(`Failed to update ${key}`);
      setFlags((prev) => (prev ? { ...prev, [key]: value } : prev));
    } catch (err) {
      console.error("Flag toggle failed:", err);
      // Revert optimistic update
      setFlags((prev) => (prev ? { ...prev, [key]: !value } : prev));
    } finally {
      setToggling(null);
    }
  };

  const handleToggle = (key: string, currentValue: boolean) => {
    // Optimistic update
    setFlags((prev) => (prev ? { ...prev, [key]: !currentValue } : prev));
    toggleFlag(key, !currentValue);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Feature Flags</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Toggle platform features and settings on or off
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm max-w-xl">
          {error}
        </div>
      ) : flags ? (
        <div className="grid gap-3 max-w-2xl">
          {FLAG_KEYS.map((key) => {
            const enabled = flags[key];
            return (
              <Card key={key}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor={`flag-${key}`}
                        className="text-sm font-medium text-foreground cursor-pointer"
                      >
                        {FLAG_LABELS[key] ?? key}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {FLAG_DESCRIPTIONS[key] ?? ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {toggling === key && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        id={`flag-${key}`}
                        checked={enabled}
                        onCheckedChange={() => handleToggle(key, enabled)}
                        disabled={toggling === key}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
