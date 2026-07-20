import { useState } from "react";
import { useGetDesigners } from "@workspace/api-client-react";
import type { Designer } from "@workspace/api-client-react";
import { cn, formatPrice } from "@/lib/utils";
import { MapPin, Instagram, ExternalLink, Search } from "lucide-react";
import { motion } from "framer-motion";

const SPECIALTIES = [
  "All", "Wedding", "Evening", "Casual", "Tailoring",
  "Bridal", "Accessories", "Swimwear", "Activewear", "Knitwear",
];

function DesignerCard({ designer }: { designer: Designer }) {
  const displayName = designer.studioName ?? designer.name ?? "Designer";
  const initial = displayName[0]?.toUpperCase() ?? "D";

  return (
    <motion.div
      className="rounded-xl border border-border bg-card overflow-hidden flex flex-col"
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Portfolio image / placeholder */}
      <div className="h-44 bg-gradient-to-br from-muted/60 to-muted/20 flex items-center justify-center relative overflow-hidden shrink-0">
        {designer.portfolioUrls.length > 0 ? (
          <img
            src={designer.portfolioUrls[0]}
            alt={displayName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="font-[Cormorant_Garamond] text-5xl font-semibold text-muted-foreground/20 select-none">
            {initial}
          </span>
        )}
        {designer.studioType && (
          <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm">
            {designer.studioType}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2.5">
        {/* Name & location */}
        <div>
          <h3 className="font-[Cormorant_Garamond] text-base font-semibold text-foreground leading-tight">
            {displayName}
          </h3>
          {designer.studioName && designer.name && (
            <p className="text-xs text-muted-foreground">{designer.name}</p>
          )}
          {(designer.city || designer.country) && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground/70 mt-0.5">
              <MapPin size={10} />
              {[designer.city, designer.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        {/* Bio */}
        {designer.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
            {designer.bio}
          </p>
        )}

        {/* Specialties */}
        {designer.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {designer.specialties.slice(0, 4).map((s) => (
              <span
                key={s}
                className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
              >
                {s}
              </span>
            ))}
            {designer.specialties.length > 4 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                +{designer.specialties.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Price range */}
        {(designer.priceMin != null || designer.priceMax != null) && (
          <p className="text-xs text-muted-foreground">
            {designer.priceMin != null && designer.priceMax != null
              ? `${formatPrice(designer.priceMin * 100)} – ${formatPrice(designer.priceMax * 100)}`
              : designer.priceMin != null
              ? `From ${formatPrice(designer.priceMin * 100)}`
              : `Up to ${formatPrice(designer.priceMax! * 100)}`}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-0.5 mt-auto">
          {designer.instagram && (
            <a
              href={`https://instagram.com/${designer.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Instagram size={12} />@{designer.instagram}
            </a>
          )}
          {designer.whatsapp && (
            <a
              href={`https://wa.me/${designer.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-medium transition-colors"
            >
              WhatsApp
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="h-44 bg-muted/30" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted/40 rounded w-2/3" />
        <div className="h-3 bg-muted/30 rounded w-1/2" />
        <div className="flex gap-1.5">
          <div className="h-5 w-14 bg-muted/25 rounded-full" />
          <div className="h-5 w-16 bg-muted/25 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const [specialty, setSpecialty] = useState("All");
  const [search, setSearch] = useState("");
  const { data: designers = [], isLoading, isError } = useGetDesigners();

  const filtered = designers.filter((d) => {
    const matchesSpecialty =
      specialty === "All" ||
      d.specialties.some((s) =>
        s.toLowerCase().includes(specialty.toLowerCase())
      );
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      (d.studioName?.toLowerCase().includes(query) ?? false) ||
      (d.name?.toLowerCase().includes(query) ?? false) ||
      (d.bio?.toLowerCase().includes(query) ?? false) ||
      d.specialties.some((s) => s.toLowerCase().includes(query));
    return matchesSpecialty && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[Cormorant_Garamond] text-2xl font-semibold text-foreground">
          Discover Designers
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Find your perfect creative partner
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, specialty, or style…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
        />
      </div>

      {/* Specialty filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mb-6">
        {SPECIALTIES.map((s) => (
          <button
            key={s}
            onClick={() => setSpecialty(s)}
            className={cn(
              "shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all",
              specialty === s
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-card border border-card-border flex items-center justify-center">
            <Search size={22} className="text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Unable to load designers</p>
          <p className="text-xs text-muted-foreground/60">Check your connection and try again.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <p className="text-sm text-muted-foreground">No designers found</p>
          {(search || specialty !== "All") && (
            <button
              onClick={() => { setSearch(""); setSpecialty("All"); }}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.06 } },
            hidden: {},
          }}
        >
          {filtered.map((d) => (
            <motion.div
              key={d.id}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <DesignerCard designer={d} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
