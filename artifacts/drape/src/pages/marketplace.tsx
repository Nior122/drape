import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/shared/Navbar";
import { DesignerCard } from "@/components/marketplace/DesignerCard";
import { DesignerCardSkeleton } from "@/components/marketplace/DesignerCardSkeleton";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, X, ChevronDown, MapPin, DollarSign, Star } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

const SPECIALTIES = [
  "Bridal", "Evening Wear", "Tailoring", "Streetwear",
  "Ready-to-Wear", "Couture", "Accessories", "Knitwear",
  "Leather Goods", "Embroidery", "Wedding", "Traditional",
  "Luxury", "Corporate", "Kids", "Sportswear",
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Highest Rated" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "experience", label: "Most Experienced" },
];

const EXPERIENCE_LEVELS = [
  { value: "", label: "Any experience" },
  { value: "1", label: "1+ years" },
  { value: "3", label: "3+ years" },
  { value: "5", label: "5+ years" },
  { value: "10", label: "10+ years" },
];

function Select({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-card border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 pr-8 cursor-pointer">
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
}

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [sort, setSort] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [designers, setDesigners] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Browse Designers — Drape"; }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "12", sort });
    if (search) params.set("search", search);
    if (specialty) params.set("specialty", specialty);
    if (location) params.set("location", location);
    if (experience) params.set("experienceMin", experience);

    fetch(`${API_BASE}/api/marketplace/designers?${params}`)
      .then((r) => r.json())
      .then((data) => { setDesigners(data.designers || []); setTotal(data.total || 0); })
      .catch(() => { setDesigners([]); })
      .finally(() => setLoading(false));
  }, [page, sort, search, specialty, location, experience]);

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto pt-24 pb-16 px-4 sm:px-6">
        {/* ── Hero ── */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl sm:text-5xl text-foreground tracking-tight mb-3">
            Find Your Designer
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Browse Africa's finest bespoke fashion talents. Commission something singular.
          </p>
        </div>

        {/* ── Search Bar ── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search designers, styles, or specialties…"
              className="w-full pl-10 pr-4 py-3 bg-card border border-card-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setFiltersOpen(!filtersOpen)}
            className="rounded-xl gap-2 h-11">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
          <Select value={sort} onChange={setSort} options={SORT_OPTIONS} placeholder="Sort by" />
        </div>

        {/* ── Filter Panel ── */}
        {filtersOpen && (
          <div className="bg-card border border-card-border rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-200">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Specialty</label>
              <select value={specialty} onChange={(e) => { setSpecialty(e.target.value); setPage(1); }}
                className="w-full bg-background border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                <option value="">All Specialties</option>
                {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Location</label>
              <input value={location} onChange={(e) => { setLocation(e.target.value); setPage(1); }}
                placeholder="City or country…"
                className="w-full bg-background border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium uppercase tracking-wider">Experience</label>
              <select value={experience} onChange={(e) => { setExperience(e.target.value); setPage(1); }}
                className="w-full bg-background border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                {EXPERIENCE_LEVELS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            {(search || specialty || location || experience) && (
              <div className="sm:col-span-3 flex justify-end">
                <button onClick={() => { setSearch(""); setSpecialty(""); setLocation(""); setExperience(""); setPage(1); }}
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  <X className="h-3 w-3" /> Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Results ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? Array.from({ length: 6 }).map((_, i) => <DesignerCardSkeleton key={i} />)
            : designers.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <p className="text-muted-foreground text-lg">No designers found matching your criteria.</p>
                <button onClick={() => { setSearch(""); setSpecialty(""); setLocation(""); setExperience(""); }}
                  className="mt-4 text-sm text-primary hover:underline">Clear filters</button>
              </div>
            ) : designers.map((d: any) => (
              <Link key={d.id} href={`/designer/${d.slug || d.id}`}>
                <DesignerCardRemapped designer={d} />
              </Link>
            ))}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  page === i + 1 ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-card-border"
                }`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DesignerCardRemapped({ designer }: { designer: any }) {
  const avgRating = designer.avgRating ?? 0;
  return (
    <article className="group relative bg-card border border-card-border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5">
      <div className="relative h-52 overflow-hidden bg-muted">
        {(designer.portfolioUrls?.[0] || designer.avatar) ? (
          <img src={designer.portfolioUrls?.[0] || designer.avatar} alt={designer.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-4xl font-serif">D</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          {(designer.specialties || []).slice(0, 2).map((s: string) => (
            <span key={s} className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-black/60 text-primary border border-primary/20 backdrop-blur-sm font-medium">{s}</span>
          ))}
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {designer.avatar ? (
              <img src={designer.avatar} alt={designer.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-primary/20" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">{designer.name?.[0]}</div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-serif text-base font-medium text-foreground truncate leading-tight">{designer.brandName || designer.name}</h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{designer.specialization || (designer.specialties?.[0] ?? "Fashion Designer")}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star size={11} className="fill-primary text-primary" />
            <span className="text-foreground font-medium">{avgRating.toFixed(1)}</span>
            <span>({designer.reviewCount ?? 0})</span>
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {designer.location || "Various"}
          </span>
          <span className="flex items-center gap-1">
            <Star size={11} className="text-primary" />
            {designer.experience ?? 0}yr
          </span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="text-xs text-muted-foreground">Starts from</span>
          <span className="text-xs font-medium text-foreground">
            {designer.priceMin ? `${designer.currency || "NGN"} ${(designer.priceMin).toLocaleString()}` : "Contact for pricing"}
          </span>
        </div>
      </div>
    </article>
  );
}
