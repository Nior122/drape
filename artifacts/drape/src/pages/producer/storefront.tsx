import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProducerStorefront,
  useUpdateProducerStorefront,
  getGetProducerStorefrontQueryKey,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, X, Loader2, Instagram, Image as ImageIcon, CheckCircle2, Store } from "lucide-react";

const SPECIALTY_OPTIONS = [
  "Bridal", "Evening Wear", "Tailored Suits", "Ready-to-Wear", "Casual",
  "Traditional / Cultural", "Corsetry", "Knitwear", "Leather", "Swimwear",
  "Denim", "Activewear", "Childrenswear", "Menswear", "Plus Size",
];

type StorefrontData = {
  profile: {
    id: string; userId: string; studioName: string | null; studioType: string;
    specialties: string[]; bio: string | null; priceMin: number | null; priceMax: number | null;
    instagram: string | null; portfolioUrls: string[];
  } | null;
  user: { name: string | null; email: string; phone: string | null; city: string | null; country: string | null } | null;
};

export default function ProducerStorefront() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useGetProducerStorefront({ query: { queryKey: getGetProducerStorefrontQueryKey() } });
  const sf = data as StorefrontData | undefined;
  const updateStorefront = useUpdateProducerStorefront();

  const [studioName, setStudioName] = useState("");
  const [studioType, setStudioType] = useState<"SOLO" | "STUDIO">("SOLO");
  const [bio, setBio] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [instagram, setInstagram] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (sf?.profile) {
      setStudioName(sf.profile.studioName ?? "");
      setStudioType(sf.profile.studioType as "SOLO" | "STUDIO");
      setBio(sf.profile.bio ?? "");
      setPriceMin(sf.profile.priceMin != null ? String(sf.profile.priceMin / 100) : "");
      setPriceMax(sf.profile.priceMax != null ? String(sf.profile.priceMax / 100) : "");
      setInstagram(sf.profile.instagram ?? "");
      setSpecialties(sf.profile.specialties ?? []);
      setPortfolioUrls(sf.profile.portfolioUrls ?? []);
    }
  }, [sf]);

  function toggleSpecialty(s: string) {
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function addPortfolioUrl() {
    const url = newUrl.trim();
    if (!url) return;
    setPortfolioUrls((prev) => [...prev, url]);
    setNewUrl("");
  }

  function handleSave() {
    updateStorefront.mutate(
      {
        data: {
          studioName: studioName || undefined,
          studioType,
          bio: bio || undefined,
          priceMin: priceMin ? Math.round(parseFloat(priceMin) * 100) : undefined,
          priceMax: priceMax ? Math.round(parseFloat(priceMax) * 100) : undefined,
          instagram: instagram || undefined,
          specialties,
          portfolioUrls,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetProducerStorefrontQueryKey() });
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
          toast({ title: "Storefront updated!" });
        },
        onError: () => toast({ title: "Failed to save", variant: "destructive" }),
      },
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-[#C08B4E]" /></div>;
  }

  return (
    <div className="p-6 md:p-8 pb-24 md:pb-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Storefront</h1>
          <p className="text-sm text-white/40 mt-0.5">How clients see your profile on Drape</p>
        </div>
        <Button onClick={handleSave} disabled={updateStorefront.isPending} className="bg-[#C08B4E] hover:bg-[#d4a96a] text-white text-sm">
          {updateStorefront.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : saved ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {saved ? "Saved!" : "Save changes"}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-[2] space-y-5">
          {/* Studio info */}
          <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Store className="h-4 w-4 text-[#C08B4E]" />
              <p className="text-sm font-semibold text-white">Studio Information</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-white/60 text-xs mb-1.5 block">Studio Name</Label>
                <Input value={studioName} onChange={(e) => setStudioName(e.target.value)} placeholder="e.g. Maison Élégant" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-[#C08B4E]/30" />
              </div>
              <div>
                <Label className="text-white/60 text-xs mb-1.5 block">Studio Type</Label>
                <div className="flex gap-2">
                  {(["SOLO", "STUDIO"] as const).map((t) => (
                    <button key={t} onClick={() => setStudioType(t)} className={cn("flex-1 py-2 rounded-lg text-xs font-medium border transition-colors", studioType === t ? "bg-[#C08B4E]/20 border-[#C08B4E]/40 text-[#C08B4E]" : "bg-white/5 border-white/10 text-white/40 hover:text-white")}>
                      {t === "SOLO" ? "Solo Tailor" : "Studio / Atelier"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-white/60 text-xs mb-1.5 block">Bio</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell clients about your craft, experience, and what makes your work unique…" rows={4} className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-[#C08B4E]/30 resize-none" />
                <p className="text-[10px] text-white/20 mt-1">{bio.length} / 500 characters</p>
              </div>
            </div>
          </div>

          {/* Specialties */}
          <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-5">
            <p className="text-sm font-semibold text-white mb-1">Specialties</p>
            <p className="text-xs text-white/40 mb-4">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_OPTIONS.map((s) => (
                <button key={s} onClick={() => toggleSpecialty(s)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all", specialties.includes(s) ? "bg-[#C08B4E]/20 border-[#C08B4E]/50 text-[#C08B4E]" : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20")}>
                  {specialties.includes(s) && "✓ "}{s}
                </button>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-5">
            <p className="text-sm font-semibold text-white mb-4">Pricing Range</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs mb-1.5 block">From (£)</Label>
                <Input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="500" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-[#C08B4E]/30" />
              </div>
              <div>
                <Label className="text-white/60 text-xs mb-1.5 block">To (£)</Label>
                <Input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="5000" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-[#C08B4E]/30" />
              </div>
            </div>
          </div>

          {/* Social */}
          <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-5">
            <p className="text-sm font-semibold text-white mb-4">Social Links</p>
            <div>
              <Label className="text-white/60 text-xs mb-1.5 flex items-center gap-1.5"><Instagram className="h-3 w-3" /> Instagram handle</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="yourstudio" className="pl-7 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-[#C08B4E]/30" />
              </div>
            </div>
          </div>

          {/* Portfolio */}
          <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-1">
              <ImageIcon className="h-4 w-4 text-[#C08B4E]" />
              <p className="text-sm font-semibold text-white">Portfolio Images</p>
            </div>
            <p className="text-xs text-white/40 mb-4">Add image URLs from your existing portfolio</p>
            <div className="flex gap-2 mb-3">
              <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPortfolioUrl()} placeholder="https://example.com/image.jpg" className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 text-xs focus-visible:ring-[#C08B4E]/30" />
              <Button size="sm" onClick={addPortfolioUrl} className="bg-[#C08B4E] hover:bg-[#d4a96a] text-white shrink-0"><Plus className="h-4 w-4" /></Button>
            </div>
            {portfolioUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {portfolioUrls.map((url, i) => (
                  <div key={i} className="relative group aspect-square">
                    <div className="w-full h-full rounded-lg bg-white/5 overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.opacity = "0.2")} />
                    </div>
                    <button onClick={() => setPortfolioUrls((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="lg:w-72 shrink-0">
          <div className="sticky top-8">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Preview</p>
            <div className="bg-[#1A1A1A] rounded-xl border border-white/5 overflow-hidden">
              {portfolioUrls[0] && (
                <div className="h-32 overflow-hidden">
                  <img src={portfolioUrls[0]} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-white">{studioName || sf?.user?.name || "Your Studio"}</p>
                    <p className="text-[10px] text-white/40">{studioType === "SOLO" ? "Solo Tailor" : "Studio / Atelier"}</p>
                  </div>
                  {(priceMin || priceMax) && (
                    <p className="text-xs text-[#C08B4E] font-medium">£{priceMin || "?"}–{priceMax || "?"}</p>
                  )}
                </div>
                {bio && <p className="text-xs text-white/50 leading-relaxed line-clamp-3">{bio}</p>}
                {specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {specialties.slice(0, 4).map((s) => (
                      <span key={s} className="text-[9px] px-2 py-0.5 rounded-full bg-white/8 text-white/50">{s}</span>
                    ))}
                    {specialties.length > 4 && <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/30">+{specialties.length - 4}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
