import { CheckCircle2, Clock, FileText, Sparkles, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FashionBrief, BriefStatus } from "@/lib/useEnquiryStream";

type Props = {
  brief: FashionBrief | null;
  briefStatus: BriefStatus;
  briefReady: boolean;
  selectedImageUrl: string | null;
  className?: string;
};

const STATUS_CONFIG: Record<BriefStatus, { label: string; color: string; bg: string; pulse?: boolean }> = {
  collecting:            { label: "Recording…",           color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20", pulse: true },
  awaiting_confirmation: { label: "Ready to confirm",      color: "text-amber-300",  bg: "bg-amber-500/10 border-amber-500/20" },
  revision_requested:    { label: "Revision in progress",  color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", pulse: true },
  confirmed:             { label: "Brief confirmed",        color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
  finalized:             { label: "Brief finalised",        color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
  forwarded:             { label: "Sent to designer",       color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
};

type BriefField = {
  key: keyof FashionBrief;
  label: string;
  render?: (brief: FashionBrief) => string;
};

const BRIEF_FIELDS: BriefField[] = [
  { key: "occasion",            label: "Occasion" },
  { key: "style_summary",       label: "Style" },
  { key: "aesthetic_direction", label: "Aesthetic" },
  { key: "color_palette",       label: "Colours",   render: (b) => Array.isArray(b.color_palette) ? b.color_palette.join(", ") : "" },
  { key: "fabric_preferences",  label: "Fabric" },
  { key: "silhouette",          label: "Silhouette" },
  {
    key: "budget_min",
    label: "Budget",
    render: (b) => {
      const { budget_min: min, budget_max: max } = b;
      if (!min && !max) return "";
      if (min && max) return `₦${min.toLocaleString()} – ₦${max.toLocaleString()}`;
      if (min) return `From ₦${min.toLocaleString()}`;
      return `Up to ₦${max!.toLocaleString()}`;
    },
  },
  { key: "timeline_days", label: "Timeline", render: (b) => b.timeline_days ? `${b.timeline_days} days` : "" },
  { key: "special_notes",  label: "Notes" },
];

function BriefRow({ label, value, filled }: { label: string; value: string; filled: boolean }) {
  return (
    <div className={cn("flex gap-2 py-2 border-b border-white/5 last:border-0 transition-all duration-500", filled ? "opacity-100" : "opacity-35")}>
      <span className="text-[11px] text-white/40 uppercase tracking-wider shrink-0 w-20 pt-0.5">{label}</span>
      {filled
        ? <span className="text-xs text-white/85 leading-relaxed flex-1">{value}</span>
        : <span className="text-xs text-white/20 italic">Not yet captured</span>
      }
    </div>
  );
}

function WorkflowSteps({ briefReady, briefStatus, hasSelectedImage }: {
  briefReady: boolean;
  briefStatus: BriefStatus;
  hasSelectedImage: boolean;
}) {
  const isConfirmed = briefStatus === "confirmed" || briefStatus === "finalized" || briefStatus === "forwarded";

  const steps = [
    { id: "chat",    label: "Chat with Aria",         done: true,           active: !briefReady },
    { id: "brief",   label: "Brief captured",          done: briefReady,     active: briefReady && !hasSelectedImage },
    { id: "concept", label: "Concept selected",        done: hasSelectedImage, active: briefReady && !hasSelectedImage },
    { id: "confirm", label: "Review & confirm",        done: isConfirmed,    active: briefStatus === "awaiting_confirmation" },
    { id: "send",    label: "Sent to designer",        done: briefStatus === "forwarded", active: isConfirmed && briefStatus !== "forwarded" },
  ];

  return (
    <div className="space-y-1.5 mb-5">
      {steps.map((step) => (
        <div key={step.id} className={cn("flex items-center gap-2.5 text-xs transition-all duration-300", step.done ? "text-amber-400" : step.active ? "text-white/80" : "text-white/20")}>
          <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
            step.done ? "border-amber-400 bg-amber-400/20" : step.active ? "border-white/40 bg-white/5" : "border-white/10")}>
            {step.done && <CheckCircle2 className="w-2.5 h-2.5 text-amber-400" />}
            {step.active && !step.done && <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />}
          </div>
          <span>{step.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DesignBriefPanel({ brief, briefStatus, briefReady, selectedImageUrl, className }: Props) {
  const cfg = STATUS_CONFIG[briefStatus] ?? STATUS_CONFIG.collecting;
  const hasSelectedImage = Boolean(selectedImageUrl);

  return (
    <div className={cn("flex flex-col h-full bg-[#0a0a0a] border-l border-white/8", className)}>
      {/* Panel header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={14} className="text-amber-400/60" />
          <span className="text-xs font-medium uppercase tracking-[0.15em] text-white/50">Your Brief</span>
        </div>
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wider", cfg.color, cfg.bg)}>
          <span className={cn("w-1.5 h-1.5 rounded-full bg-current", cfg.pulse && "animate-pulse")} />
          {cfg.label}
        </div>
      </div>

      {/* Workflow progress */}
      <div className="px-5 pt-4 pb-0 shrink-0">
        <WorkflowSteps briefReady={briefReady} briefStatus={briefStatus} hasSelectedImage={hasSelectedImage} />
      </div>

      {/* Brief fields */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {!brief && !briefReady && (
          <div className="flex flex-col items-center justify-center h-32 gap-3 text-center mt-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/8 border border-amber-500/15 flex items-center justify-center">
              <Sparkles size={16} className="text-amber-400/50" />
            </div>
            <p className="text-xs text-white/30 leading-relaxed max-w-[180px]">
              Your brief will appear here as Aria captures your vision
            </p>
          </div>
        )}

        {(brief || briefReady) && (
          <div className="space-y-0">
            {BRIEF_FIELDS.map((field) => {
              let value = "";
              if (brief) {
                value = field.render ? field.render(brief) : (brief[field.key] != null ? String(brief[field.key]) : "");
              }
              return (
                <BriefRow
                  key={field.key}
                  label={field.label}
                  value={value}
                  filled={Boolean(value)}
                />
              );
            })}
          </div>
        )}

        {/* Selected image */}
        {selectedImageUrl && (
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon size={12} className="text-amber-400/60" />
              <span className="text-[10px] uppercase tracking-wider text-white/40">Selected concept</span>
            </div>
            <div className="relative rounded-xl overflow-hidden border-2 border-amber-400/40 shadow-lg shadow-amber-400/10">
              <img
                src={selectedImageUrl}
                alt="Selected look"
                className="w-full aspect-[3/4] object-cover"
              />
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-black" />
              </div>
            </div>
          </div>
        )}

        {/* Confirmed state message */}
        {(briefStatus === "confirmed" || briefStatus === "finalized" || briefStatus === "forwarded") && (
          <div className="mt-5 p-4 rounded-xl bg-green-500/8 border border-green-500/20">
            <div className="flex items-center gap-2 mb-1.5">
              <CheckCircle2 size={13} className="text-green-400" />
              <span className="text-xs font-semibold text-green-300">Brief confirmed</span>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed">
              {briefStatus === "forwarded"
                ? "Your brief has been sent to the designer. They'll be in touch soon."
                : "Your brief is ready. Click 'Send to Designer' below to forward it."}
            </p>
          </div>
        )}
      </div>

      {/* Panel footer */}
      <div className="px-5 py-4 border-t border-white/8 shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] text-white/25">
          <Clock size={10} />
          <span>Updates as you chat</span>
        </div>
      </div>
    </div>
  );
}
