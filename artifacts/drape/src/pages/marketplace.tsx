import { useState, useMemo, useEffect, useRef } from "react";
import { Navbar } from "@/components/shared/Navbar";
import { DesignerCard } from "@/components/marketplace/DesignerCard";
import { DesignerCardSkeleton } from "@/components/marketplace/DesignerCardSkeleton";
import { MOCK_DESIGNERS, SPECIALTIES, CITIES, filterDesigners } from "@/data/designers";
import { Button } from "@/components/ui/button";
import { CitySearchInput } from "@/components/marketplace/CitySearchInput";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";

const PAGE_SIZE = 6;

const BUDGET_RANGES = [
  { label: "Any budget", min: 0, max: Infinity },
  { label: "Under $500", min: 0, max: 500 },
  { label: "$500 – $2,000", min: 500, max: 2000 },
  { label: "$2,000 – $10,000", min: 2000, max: 10000 },
  { label: "$10,000+", min: 10000, max: Infinity },
];

const RATING_OPTIONS = [
  { label: "Any rating", value: 0 },
  { label: "4.5+ stars", value: 4.5 },
  { label: "4.8+ stars", value: 4.8 },
];

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-card border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 pr-8 cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
}

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [budgetRange, setBudgetRange] = useState("0");
  const [minRating, setMinRating] = useState("0");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Page title
  useEffect(() => {
    const prev = document.title;
    document.title = "Browse Designers — Drape";
    return () => { document.title = prev; };
  }, []);

  // Simulate initial load
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, specialty, city, budgetRange, minRating]);

  const budgetOption = BUDGET_RANGES[Number(budgetRange)] ?? BUDGET_RANGES[0];
  const ratingOption = RATING_OPTIONS[Number(minRating)] ?? RATING_OPTIONS[0];

  const filtered = useMemo(
    () =>
      filterDesigners({
        search: search || undefined,
        specialty: specialty || undefined,
        city: city || undefined,
        minBudget: budgetOption.min > 0 ? budgetOption.min : undefined,
        maxBudget: budgetOption.max < Infinity ? budgetOption.max : undefined,
        minRating: ratingOption.value > 0 ? ratingOption.value : undefined,
      }),
    [search, specialty, city, budgetOption, ratingOption]
  );

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  const activeFilterCount = [specialty, city, Number(budgetRange) > 0 ? "1" : "", Number(minRating) > 0 ? "1" : ""].filter(Boolean).length;

  function clearFilters() {
    setSearch("");
    setSpecialty("");
    setCity("");
    setBudgetRange("0");
    setMinRating("0");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="pt-16">
        {/* Header strip */}
        <div className="border-b border-border/30 px-4 py-10">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">The atelier network</p>
            <h1 className="font-serif text-3xl md:text-4xl text-foreground">Browse Designers</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {MOCK_DESIGNERS.length} bespoke makers across {new Set(MOCK_DESIGNERS.map((d) => d.city)).size} cities
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <CitySearchInput
              search={search}
              onSearchChange={setSearch}
              cityFilter={city}
              onCitySelect={setCity}
            />
            <Button
              variant="outline"
              className={`rounded-xl border-card-border h-10 px-4 gap-2 shrink-0 text-sm ${activeFilterCount > 0 ? "border-primary/40 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <SlidersHorizontal size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full bg-primary text-primary-foreground font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="rounded-xl h-10 px-3 text-xs text-muted-foreground hover:text-foreground gap-1 shrink-0"
              >
                <X size={13} /> Clear
              </Button>
            )}
          </div>

          {/* Expanded filters */}
          {filtersOpen && (
            <div className="mb-6 p-4 bg-card border border-card-border rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select
                value={specialty}
                onChange={setSpecialty}
                placeholder="All specialties"
                options={SPECIALTIES.map((s) => ({ label: s, value: s }))}
              />
              <Select
                value={city}
                onChange={setCity}
                placeholder="All cities"
                options={CITIES.map((c) => ({ label: c, value: c }))}
              />
              <Select
                value={budgetRange}
                onChange={setBudgetRange}
                placeholder="Any budget"
                options={BUDGET_RANGES.map((b, i) => ({ label: b.label, value: String(i) }))}
              />
              <Select
                value={minRating}
                onChange={setMinRating}
                placeholder="Any rating"
                options={RATING_OPTIONS.map((r, i) => ({ label: r.label, value: String(i) }))}
              />
            </div>
          )}

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {specialty && (
                <button
                  onClick={() => setSpecialty("")}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  {specialty} <X size={11} />
                </button>
              )}
              {city && (
                <button
                  onClick={() => setCity("")}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  {city} <X size={11} />
                </button>
              )}
              {Number(budgetRange) > 0 && (
                <button
                  onClick={() => setBudgetRange("0")}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  {budgetOption.label} <X size={11} />
                </button>
              )}
              {Number(minRating) > 0 && (
                <button
                  onClick={() => setMinRating("0")}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  {ratingOption.label} <X size={11} />
                </button>
              )}
            </div>
          )}

          {/* Results count */}
          {!loading && (
            <p className="text-xs text-muted-foreground mb-5">
              {filtered.length === 0
                ? "No designers found"
                : `${filtered.length} designer${filtered.length !== 1 ? "s" : ""} found`}
            </p>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <DesignerCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-card border border-card-border flex items-center justify-center mb-5">
                <Search size={24} className="text-muted-foreground" />
              </div>
              <h3 className="font-serif text-xl text-foreground mb-2">No designers found</h3>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
                Try adjusting your filters or broadening your search to discover more makers.
              </p>
              <Button variant="outline" onClick={clearFilters} className="rounded-full border-border/50">
                Clear all filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {visible.map((d) => (
                  <DesignerCard key={d.id} designer={d} />
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center mt-10">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-full border-border/50 px-8 text-muted-foreground hover:text-foreground"
                  >
                    Load more designers
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
