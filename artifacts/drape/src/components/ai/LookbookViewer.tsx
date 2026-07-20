import { useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConceptCard {
  title: string;
  palette: string[];
  silhouette: string;
  fabrics: string;
  keyDetails: string;
  stylingNotes: string;
}

type LookbookEntry = {
  id?: string;
  objectPath: string;
  prompt: string;
  promptIndex?: number;
  // mode can be top-level (from /ai/generate results) or nested in metadata (from DB)
  mode?: "image" | "concept";
  metadata?: {
    mode?: "image" | "concept";
    concept?: ConceptCard;
  } | null;
};

type Brief = {
  styleSummary?: string | null;
  occasion?: string | null;
  colorPalette: string[];
};

type Props = {
  brief: Brief;
  images: LookbookEntry[];
};

const CARD_ACCENTS = [
  "from-amber-950/60 border-amber-500/20",
  "from-stone-900/60 border-stone-500/20",
  "from-zinc-900/60 border-zinc-500/20",
];

function ConceptCardDisplay({ card, index }: { card: ConceptCard; index: number }) {
  return (
    <div className={cn(
      "relative rounded-xl border bg-gradient-to-b to-black/40 p-5 space-y-4 h-full flex flex-col",
      CARD_ACCENTS[index % CARD_ACCENTS.length],
    )}>
      <div>
        <span className="text-xs text-amber-500/60 uppercase tracking-widest font-medium">
          Concept {index + 1}
        </span>
        <h3 className="mt-1 text-white font-serif text-lg leading-snug">{card.title}</h3>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {card.palette.map((colour) => (
          <span key={colour} className="px-2.5 py-0.5 rounded-full text-xs border border-white/10 text-white/70 bg-white/5">
            {colour}
          </span>
        ))}
      </div>

      <div className="space-y-3 flex-1">
        {[
          { label: "Silhouette", value: card.silhouette },
          { label: "Fabrics", value: card.fabrics },
          { label: "Key Details", value: card.keyDetails },
          { label: "Styling", value: card.stylingNotes },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-white/35 uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-sm text-white/75 leading-relaxed">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageCard({ entry, index, onClick }: { entry: LookbookEntry; index: number; onClick: () => void }) {
  const imageUrl = (entry.objectPath.startsWith("http") || entry.objectPath.startsWith("data:"))
    ? entry.objectPath
    : `/api/storage${entry.objectPath}`;
  return (
    <div
      className="relative group rounded-xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer"
      style={{ aspectRatio: "9/16" }}
      onClick={onClick}
    >
      <img
        src={imageUrl}
        alt={`Concept ${index + 1}`}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
        <p className="text-xs text-white/80 line-clamp-2">{entry.prompt}</p>
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
          <ZoomIn className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <div className="absolute top-2 left-2">
        <span className="text-xs bg-black/60 text-white/70 px-2 py-0.5 rounded-full">
          Concept {index + 1}
        </span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-16 bg-white/10 rounded" />
        <div className="h-5 w-3/4 bg-white/10 rounded" />
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3].map((i) => <div key={i} className="h-5 w-16 bg-white/10 rounded-full" />)}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-20 bg-white/10 rounded" />
            <div className="h-4 w-full bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LookbookViewer({ brief, images }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Brief tags */}
      <div className="flex flex-wrap gap-2">
        {brief.occasion && (
          <span className="px-3 py-1 rounded-full text-xs border border-amber-500/30 text-amber-400">
            {brief.occasion}
          </span>
        )}
        {brief.colorPalette?.map((c) => (
          <span key={c} className="px-3 py-1 rounded-full text-xs border border-white/10 text-white/60">
            {c}
          </span>
        ))}
      </div>

      {brief.styleSummary && (
        <p className="text-sm text-white/60 leading-relaxed italic">"{brief.styleSummary}"</p>
      )}

      {/* Grid */}
      {images.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {images.map((entry, idx) => {
            // Support both flat (generate results) and nested (DB lookbook) structures
            const mode = entry.mode ?? entry.metadata?.mode;
            const isImage = mode === "image" && !!entry.objectPath;
            const concept = entry.metadata?.concept;

            if (isImage) {
              return (
                <ImageCard
                  key={entry.id}
                  entry={entry}
                  index={idx}
                  onClick={() => setLightboxIdx(idx)}
                />
              );
            }

            if (concept) {
              return (
                <div
                  key={entry.id}
                  className="cursor-pointer hover:scale-[1.01] transition-transform duration-200"
                  onClick={() => setLightboxIdx(idx)}
                >
                  <ConceptCardDisplay card={concept} index={idx} />
                </div>
              );
            }

            return <SkeletonCard key={entry.id} />;
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && images[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-6"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          {lightboxIdx > 0 && (
            <button
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          )}
          {lightboxIdx < images.length - 1 && (
            <button
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          )}

          <div className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const entry = images[lightboxIdx];
              const mode = entry.mode ?? entry.metadata?.mode;
              const isImage = mode === "image" && !!entry.objectPath;
              if (isImage) {
                const imgUrl = (entry.objectPath.startsWith("http") || entry.objectPath.startsWith("data:"))
                  ? entry.objectPath
                  : `/api/storage${entry.objectPath}`;
                return (
                  <div className="space-y-4">
                    <img
                      src={imgUrl}
                      alt={`Concept ${lightboxIdx + 1}`}
                      className="w-full max-h-[80vh] object-contain rounded-xl"
                    />
                    <p className="text-sm text-white/50 text-center px-4">{entry.prompt}</p>
                  </div>
                );
              }
              const concept = entry.metadata?.concept;
              if (concept) {
                return <ConceptCardDisplay card={concept} index={lightboxIdx} />;
              }
              return null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
