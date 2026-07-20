import { useState } from "react";
import {
  useGetClientStyleProfile,
  useUpdateClientStyleProfile,
  useUpdateClientMeasurements,
  getGetClientStyleProfileQueryKey,
  getGetClientMeasurementsQueryKey,
} from "@workspace/api-client-react";
import type { ClientStyleProfile } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Sparkles, Ruler, User, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";

/* ── Constants ──────────────────────────────────────────────────── */

const STYLE_OPTIONS = [
  "Minimalist", "Maximalist", "Bohemian", "Classic", "Streetwear",
  "Avant-garde", "Romantic", "Dark & Moody", "Colourful", "Earthy",
  "Vintage", "Editorial", "Preppy", "Sustainable", "Tailored",
  "Playful", "Sculptural", "Luxe",
];

const MEASUREMENT_FIELDS: { key: string; label: string }[] = [
  { key: "height", label: "Height" },
  { key: "weight", label: "Weight" },
  { key: "chest", label: "Chest / Bust" },
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "shoulderWidth", label: "Shoulder Width" },
  { key: "sleeveLength", label: "Sleeve Length" },
  { key: "inseam", label: "Inseam" },
  { key: "thigh", label: "Thigh" },
  { key: "neck", label: "Neck" },
];

/* ── Style DNA tab ───────────────────────────────────────────────── */

function StyleDNATab({ profile }: { profile: ClientStyleProfile }) {
  const queryClient = useQueryClient();
  const updateProfile = useUpdateClientStyleProfile();
  const { toast } = useToast();

  const [prefs, setPrefs] = useState<string[]>(profile.stylePreferences ?? []);
  const [note, setNote] = useState(profile.styleNote ?? "");
  const [budgetMin, setBudgetMin] = useState(profile.budgetMin?.toString() ?? "");
  const [budgetMax, setBudgetMax] = useState(profile.budgetMax?.toString() ?? "");
  const [dirty, setDirty] = useState(false);

  const togglePref = (pref: string) => {
    setPrefs((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
    setDirty(true);
  };

  const handleSave = () => {
    updateProfile.mutate(
      {
        data: {
          stylePreferences: prefs,
          styleNote: note || undefined,
          budgetMin: budgetMin ? parseInt(budgetMin) : undefined,
          budgetMax: budgetMax ? parseInt(budgetMax) : undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetClientStyleProfileQueryKey(),
          });
          setDirty(false);
          toast({ description: "Style profile saved" });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Style tags */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Style Identity
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Select all that resonate with your aesthetic
        </p>
        <div className="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map((opt) => {
            const selected = prefs.includes(opt);
            return (
              <button
                key={opt}
                onClick={() => togglePref(opt)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                  selected
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                )}
              >
                {selected && <Check size={11} strokeWidth={2.5} />}
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Style note */}
      <div>
        <Label className="text-sm font-semibold block mb-1">Style Note</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Describe your aesthetic in your own words
        </p>
        <Textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setDirty(true);
          }}
          placeholder="e.g. I love clean silhouettes with unexpected textures. Japanese minimalism meets London edge…"
          rows={3}
          className="resize-none text-sm bg-muted/30 border-muted-foreground/10"
        />
      </div>

      {/* Budget */}
      <div>
        <Label className="text-sm font-semibold block mb-1">Budget Range</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Typical spend per piece (£ GBP)
        </p>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            value={budgetMin}
            onChange={(e) => {
              setBudgetMin(e.target.value);
              setDirty(true);
            }}
            placeholder="Min"
            className="text-sm bg-muted/30 border-muted-foreground/10"
          />
          <span className="text-muted-foreground text-sm shrink-0">to</span>
          <Input
            type="number"
            value={budgetMax}
            onChange={(e) => {
              setBudgetMax(e.target.value);
              setDirty(true);
            }}
            placeholder="Max"
            className="text-sm bg-muted/30 border-muted-foreground/10"
          />
        </div>
      </div>

      {dirty && (
        <Button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="w-full text-sm"
        >
          {updateProfile.isPending ? "Saving…" : "Save Style Profile"}
        </Button>
      )}
    </div>
  );
}

/* ── Measurements tab ────────────────────────────────────────────── */

function MeasurementsTab({ profile }: { profile: ClientStyleProfile }) {
  const queryClient = useQueryClient();
  const updateMeasurements = useUpdateClientMeasurements();
  const { toast } = useToast();

  const existing = profile.measurements;
  const [unit, setUnit] = useState<"cm" | "in">(existing?.unit ?? "cm");
  const [data, setData] = useState<Record<string, string>>(
    Object.fromEntries(
      MEASUREMENT_FIELDS.map((f) => [
        f.key,
        existing?.data[f.key]?.toString() ?? "",
      ])
    )
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [dirty, setDirty] = useState(false);

  const handleSave = () => {
    const numericData: Record<string, number | null> = {};
    MEASUREMENT_FIELDS.forEach((f) => {
      numericData[f.key] = data[f.key] ? parseFloat(data[f.key]) : null;
    });
    updateMeasurements.mutate(
      { data: { unit, data: numericData, notes: notes || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetClientStyleProfileQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetClientMeasurementsQueryKey(),
          });
          setDirty(false);
          toast({ description: "Measurements saved" });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Unit toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-foreground">Unit</span>
        <div className="flex rounded-lg bg-muted/50 p-1 gap-1">
          {(["cm", "in"] as const).map((u) => (
            <button
              key={u}
              onClick={() => {
                setUnit(u);
                setDirty(true);
              }}
              className={cn(
                "px-5 py-1.5 rounded-md text-sm font-medium transition-all",
                unit === u
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Measurement grid */}
      <div className="grid grid-cols-2 gap-3">
        {MEASUREMENT_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              {label}{" "}
              <span className="text-muted-foreground/50">({unit})</span>
            </Label>
            <Input
              type="number"
              value={data[key]}
              onChange={(e) => {
                setData((prev) => ({ ...prev, [key]: e.target.value }));
                setDirty(true);
              }}
              placeholder="—"
              className="text-sm bg-muted/30 border-muted-foreground/10 h-9"
            />
          </div>
        ))}
      </div>

      {/* Notes */}
      <div>
        <Label className="text-sm font-semibold block mb-1.5">Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
          }}
          placeholder="Any fitting notes or special requirements for your designer…"
          rows={2}
          className="resize-none text-sm bg-muted/30 border-muted-foreground/10"
        />
      </div>

      {dirty && (
        <Button
          onClick={handleSave}
          disabled={updateMeasurements.isPending}
          className="w-full text-sm"
        >
          {updateMeasurements.isPending ? "Saving…" : "Save Measurements"}
        </Button>
      )}
    </div>
  );
}

/* ── Account tab ─────────────────────────────────────────────────── */

function AccountTab({ profile }: { profile: ClientStyleProfile }) {
  const queryClient = useQueryClient();
  const updateProfile = useUpdateClientStyleProfile();
  const { toast } = useToast();

  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [country, setCountry] = useState(profile.country ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [dirty, setDirty] = useState(false);

  const mark = () => setDirty(true);

  const handleSave = () => {
    updateProfile.mutate(
      { data: { name, phone, whatsapp, city, country, bio } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetClientStyleProfileQueryKey(),
          });
          setDirty(false);
          toast({ description: "Account updated" });
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Name</Label>
        <Input
          value={name}
          onChange={(e) => { setName(e.target.value); mark(); }}
          placeholder="Your name"
          className="text-sm bg-muted/30 border-muted-foreground/10"
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Email</Label>
        <Input
          value={profile.email}
          readOnly
          className="text-sm bg-muted/30 border-muted-foreground/10 opacity-50 cursor-not-allowed"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Phone</Label>
          <Input
            value={phone}
            onChange={(e) => { setPhone(e.target.value); mark(); }}
            placeholder="+44 7700 000000"
            className="text-sm bg-muted/30 border-muted-foreground/10"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">WhatsApp</Label>
          <Input
            value={whatsapp}
            onChange={(e) => { setWhatsapp(e.target.value); mark(); }}
            placeholder="+44 7700 000000"
            className="text-sm bg-muted/30 border-muted-foreground/10"
          />
        </div>
      </div>

      <LocationAutocomplete
        cityValue={city}
        countryValue={country}
        onCityChange={(v) => { setCity(v); mark(); }}
        onCountryChange={(v) => { setCountry(v); mark(); }}
        cityClassName="text-sm bg-muted/30 border-muted-foreground/10"
        countryClassName="text-sm bg-muted/30 border-muted-foreground/10"
      />

      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">About you</Label>
        <Textarea
          value={bio}
          onChange={(e) => { setBio(e.target.value); mark(); }}
          placeholder="A little about your style and what you're looking for…"
          rows={3}
          className="resize-none text-sm bg-muted/30 border-muted-foreground/10"
        />
      </div>

      {dirty && (
        <Button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="w-full text-sm"
        >
          {updateProfile.isPending ? "Saving…" : "Save Changes"}
        </Button>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */

export default function ProfilePage() {
  const { data: profile, isLoading } = useGetClientStyleProfile();

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-8 w-40 bg-muted/30 rounded animate-pulse" />
        <div className="h-10 bg-muted/20 rounded-xl animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted/20 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        Unable to load profile
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-[Cormorant_Garamond] text-2xl font-semibold text-foreground">
          My Style
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your fashion DNA, measurements, and account
        </p>
      </div>

      <Tabs defaultValue="style">
        <TabsList className="w-full mb-6 bg-muted/40">
          <TabsTrigger value="style" className="flex-1 gap-1.5 text-sm">
            <Sparkles size={13} /> Style DNA
          </TabsTrigger>
          <TabsTrigger value="measurements" className="flex-1 gap-1.5 text-sm">
            <Ruler size={13} /> Measures
          </TabsTrigger>
          <TabsTrigger value="account" className="flex-1 gap-1.5 text-sm">
            <User size={13} /> Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="style">
          <StyleDNATab profile={profile} />
        </TabsContent>
        <TabsContent value="measurements">
          <MeasurementsTab profile={profile} />
        </TabsContent>
        <TabsContent value="account">
          <AccountTab profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
