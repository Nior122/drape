import { Link } from "wouter";
import { Star, MapPin, Clock, BadgeCheck } from "lucide-react";
import type { Designer } from "@/data/designers";

function formatBudget(min: number, max: number, currency: string) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  return `${fmt(min)} – ${fmt(max)}`;
}

interface DesignerCardProps {
  designer: Designer;
}

export function DesignerCard({ designer }: DesignerCardProps) {
  return (
    <Link href={`/designers/${designer.slug}`}>
      <article className="group relative bg-card border border-card-border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_40px_rgba(201,168,76,0.08)] hover:-translate-y-0.5">
        {/* Cover image */}
        <div className="relative h-52 overflow-hidden bg-muted">
          <img
            src={designer.coverImageUrl}
            alt={designer.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

          {/* Specialties chips */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            {designer.specialties.slice(0, 2).map((s) => (
              <span
                key={s}
                className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-black/60 text-primary border border-primary/20 backdrop-blur-sm font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {/* Avatar + name row */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src={designer.avatarUrl}
                alt={designer.name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-primary/20"
              />
              {designer.verified && (
                <BadgeCheck
                  size={14}
                  className="absolute -bottom-0.5 -right-0.5 text-primary fill-primary/20"
                />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-base font-medium text-foreground truncate leading-tight">{designer.name}</h3>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{designer.tagline}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star size={11} className="fill-primary text-primary" />
              <span className="text-foreground font-medium">{designer.avgRating.toFixed(1)}</span>
              <span>({designer.reviewCount})</span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {designer.city}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {designer.turnaroundDays}d
            </span>
          </div>

          {/* Budget */}
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Budget range</span>
            <span className="text-xs font-medium text-foreground">
              {formatBudget(designer.minBudget, designer.maxBudget, designer.currency)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
