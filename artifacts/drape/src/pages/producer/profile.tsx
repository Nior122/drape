import { useState, useEffect } from "react";
import { getToken } from "@/lib/token-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, CheckCircle2, UserCircle, Scissors, MapPin, Star, Briefcase, Globe, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

const TOTAL_FIELDS = 11;

export default function DesignerProfilePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<Record<string, any>>({});

  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    fetch(`${API_BASE}/api/designer/profile`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) setProfile(data.profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fields = {
    brandName: profile.brandName ?? "",
    professionalName: profile.professionalName ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    specialization: profile.specialization ?? "",
    studioName: profile.studioName ?? "",
    experience: profile.experience ?? "",
    website: profile.website ?? "",
    instagram: profile.instagram ?? "",
    priceMin: profile.priceMin ?? "",
    priceMax: profile.priceMax ?? "",
  };

  const filledCount = Object.values(fields).filter((v) => v !== "" && v !== null && v !== undefined).length;
  const completion = Math.round((filledCount / TOTAL_FIELDS) * 100);

  const set = (key: string, value: any) => setProfile((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    const body: Record<string, any> = {};
    Object.entries(fields).forEach(([key]) => { body[key] = profile[key] ?? null; });
    body.priceMin = body.priceMin ? Number(body.priceMin) : null;
    body.priceMax = body.priceMax ? Number(body.priceMax) : null;
    body.experience = body.experience ? Number(body.experience) : null;

    const res = await fetch(`${API_BASE}/api/designer/profile`, {
      method: "PATCH", headers, body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      toast({ title: "Profile saved", description: "Your designer profile has been updated." });
      setTimeout(() => setSaved(false), 3000);
    } else {
      toast({ title: "Error", description: "Failed to save profile. Try again.", variant: "destructive" });
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-[#C08B4E]" /></div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-medium">Profile</h1>
          <p className="text-sm text-white/40 mt-1">Manage your designer profile and public storefront information.</p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-[#C08B4E] hover:bg-[#C08B4E]/80 text-white rounded-lg gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : saved ? "Saved" : "Save"}
        </Button>
      </div>

      {/* Profile completion */}
      <div className="bg-[#111] border border-white/10 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white/60">Profile completion</span>
          <span className="text-sm font-medium">{completion}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-[#C08B4E] rounded-full transition-all duration-500" style={{ width: `${completion}%` }} />
        </div>
      </div>

      <div className="space-y-6">
        {/* Identity */}
        <section className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium flex items-center gap-2 text-white/60"><UserCircle className="h-4 w-4" /> Identity</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-xs text-white/40 block mb-1">Brand Name</label><Input value={profile.brandName ?? ""} onChange={(e) => set("brandName", e.target.value)} placeholder="e.g. Ada Obi Studio" className="bg-white/5 border-white/10 text-white" /></div>
            <div><label className="text-xs text-white/40 block mb-1">Professional Name</label><Input value={profile.professionalName ?? ""} onChange={(e) => set("professionalName", e.target.value)} placeholder="e.g. Ada Obi" className="bg-white/5 border-white/10 text-white" /></div>
          </div>
          <div><label className="text-xs text-white/40 block mb-1">Bio</label><Textarea value={profile.bio ?? ""} onChange={(e) => set("bio", e.target.value)} placeholder="Tell clients about your design philosophy and experience..." className="bg-white/5 border-white/10 text-white min-h-[80px]" /></div>
        </section>

        {/* Studio */}
        <section className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium flex items-center gap-2 text-white/60"><Scissors className="h-4 w-4" /> Studio</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-xs text-white/40 block mb-1">Studio Name</label><Input value={profile.studioName ?? ""} onChange={(e) => set("studioName", e.target.value)} placeholder="e.g. Ada Obi Studio" className="bg-white/5 border-white/10 text-white" /></div>
            <div><label className="text-xs text-white/40 block mb-1">Specialization</label><Input value={profile.specialization ?? ""} onChange={(e) => set("specialization", e.target.value)} placeholder="e.g. Bridal Couture" className="bg-white/5 border-white/10 text-white" /></div>
          </div>
        </section>

        {/* Location & Experience */}
        <section className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium flex items-center gap-2 text-white/60"><MapPin className="h-4 w-4" /> Location & Experience</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div><label className="text-xs text-white/40 block mb-1">Location</label><Input value={profile.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Lagos, Nigeria" className="bg-white/5 border-white/10 text-white" /></div>
            <div><label className="text-xs text-white/40 block mb-1">Experience (years)</label><Input type="number" value={profile.experience ?? ""} onChange={(e) => set("experience", e.target.value)} placeholder="e.g. 8" className="bg-white/5 border-white/10 text-white" /></div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Availability</label>
              <select value={profile.availability ?? "available"} onChange={(e) => set("availability", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                <option value="available">Available for projects</option>
                <option value="busy">Limited availability</option>
                <option value="not_accepting">Not accepting projects</option>
              </select>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium flex items-center gap-2 text-white/60"><Star className="h-4 w-4" /> Pricing</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-xs text-white/40 block mb-1">Minimum Price (₦)</label><Input type="number" value={profile.priceMin ?? ""} onChange={(e) => set("priceMin", e.target.value)} placeholder="e.g. 50000" className="bg-white/5 border-white/10 text-white" /></div>
            <div><label className="text-xs text-white/40 block mb-1">Maximum Price (₦)</label><Input type="number" value={profile.priceMax ?? ""} onChange={(e) => set("priceMax", e.target.value)} placeholder="e.g. 500000" className="bg-white/5 border-white/10 text-white" /></div>
          </div>
        </section>

        {/* Social */}
        <section className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium flex items-center gap-2 text-white/60"><Globe className="h-4 w-4" /> Social & Web</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-xs text-white/40 block mb-1">Website</label><Input value={profile.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://yourstudio.com" className="bg-white/5 border-white/10 text-white" /></div>
            <div><label className="text-xs text-white/40 block mb-1">Instagram</label><Input value={profile.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} placeholder="@yourstudio" className="bg-white/5 border-white/10 text-white" /></div>
          </div>
        </section>
      </div>
    </div>
  );
}
