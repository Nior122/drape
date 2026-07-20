import { useState } from "react";
import { useAuth } from "@/context/auth";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText } from "lucide-react";
import { EnquiryModal } from "@/components/ai/EnquiryModal";
import type { FashionBrief } from "@/lib/useEnquiryStream";

type BriefData = {
  id: string;
  sessionId: string;
  styleSummary?: string | null;
  occasion?: string | null;
  aestheticDirection?: string | null;
  colorPalette: string[];
  fabricPreferences?: string | null;
  silhouette?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  timelineDays?: number | null;
  specialNotes?: string | null;
  imagePrompts: string[];
};

export default function ClientDashboardPage() {
  const { user, logout } = useAuth();
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [brief, setBrief] = useState<BriefData | null>(null);

  const handleBriefComplete = (rawBrief: FashionBrief, sid: string) => {
    setBrief({
      id: "",
      sessionId: sid,
      styleSummary: rawBrief.style_summary,
      occasion: rawBrief.occasion,
      aestheticDirection: rawBrief.aesthetic_direction,
      colorPalette: rawBrief.color_palette ?? [],
      fabricPreferences: rawBrief.fabric_preferences,
      silhouette: rawBrief.silhouette,
      budgetMin: rawBrief.budget_min,
      budgetMax: rawBrief.budget_max,
      timelineDays: rawBrief.timeline_days,
      specialNotes: rawBrief.special_notes,
      imagePrompts: rawBrief.image_prompts ?? [],
    });
  };

  const briefFields: [string, string][] = brief
    ? (([
        ["Occasion", brief.occasion ?? ""],
        ["Aesthetic", brief.aestheticDirection ?? ""],
        ["Colours", brief.colorPalette?.join(", ") ?? ""],
        ["Fabrics", brief.fabricPreferences ?? ""],
        ["Silhouette", brief.silhouette ?? ""],
        ["Budget", brief.budgetMin && brief.budgetMax ? `$${brief.budgetMin.toLocaleString()} – $${brief.budgetMax.toLocaleString()}` : ""],
        ["Timeline", brief.timelineDays ? `${brief.timelineDays} days` : ""],
        ["Notes", brief.specialNotes ?? ""],
      ] as [string, string][]).filter(([, v]) => v))
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl">My Atelier</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Welcome back, {user?.name ?? "client"}</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => logout.mutate(undefined)}>
          Sign out
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

        {/* No brief yet */}
        {!brief && (
          <div className="flex flex-col items-center text-center gap-6 py-16">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Sparkles className="w-9 h-9 text-amber-400" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-3xl">Start your bespoke journey</h2>
              <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                Our AI consultant will guide you through a short conversation to capture your vision — from occasion and aesthetic to budget and timeline.
              </p>
            </div>
            <Button
              className="rounded-full gap-2 px-8 py-5 text-sm shadow-[0_0_30px_rgba(201,168,76,0.2)] hover:shadow-[0_0_40px_rgba(201,168,76,0.3)] transition-shadow"
              onClick={() => setShowEnquiry(true)}
            >
              <Sparkles size={15} />
              Start AI Enquiry
            </Button>
          </div>
        )}

        {/* Brief card — shows after modal is closed */}
        {brief && (
          <div className="rounded-2xl border border-white/10 bg-card overflow-hidden">
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Style Brief</h3>
                  {brief.occasion && (
                    <p className="text-xs text-muted-foreground">{brief.occasion}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-white rounded-full"
                onClick={() => { setBrief(null); setShowEnquiry(true); }}
              >
                Start new brief
              </Button>
            </div>

            {brief.styleSummary && (
              <div className="px-6 pt-5 pb-2">
                <p className="text-sm text-white/70 italic leading-relaxed">"{brief.styleSummary}"</p>
              </div>
            )}

            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {briefFields.map(([label, value]) => (
                <div key={label} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground w-20 shrink-0">{label}</span>
                  <span className="text-white/80">{value}</span>
                </div>
              ))}
            </div>

            <div className="px-6 pb-5">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2 text-xs"
                onClick={() => setShowEnquiry(true)}
              >
                <Sparkles size={12} />
                Open AI Chat &amp; Lookbook
              </Button>
            </div>
          </div>
        )}
      </div>

      {showEnquiry && (
        <EnquiryModal
          designerSlug="general"
          designerName="Drape"
          onClose={() => setShowEnquiry(false)}
          onBriefComplete={handleBriefComplete}
        />
      )}
    </div>
  );
}
