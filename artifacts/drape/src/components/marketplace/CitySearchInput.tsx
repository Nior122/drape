import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CitySuggestion {
  city: string;
  country: string;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

async function fetchCitySuggestions(query: string): Promise<CitySuggestion[]> {
  if (query.length < 2) return [];
  const params = new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: "1",
    limit: "6",
    featuretype: "city",
  });
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const seen = new Set<string>();
    const results: CitySuggestion[] = [];
    for (const item of data) {
      const city =
        item.address?.city ||
        item.address?.town ||
        item.address?.village ||
        item.address?.municipality ||
        item.address?.county ||
        "";
      const country = item.address?.country || "";
      if (!city) continue;
      const key = `${city.toLowerCase()}|${country.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ city, country });
    }
    return results;
  } catch {
    return [];
  }
}

interface CitySearchInputProps {
  search: string;
  onSearchChange: (v: string) => void;
  cityFilter: string;
  onCitySelect: (city: string) => void;
  className?: string;
}

export function CitySearchInput({
  search,
  onSearchChange,
  cityFilter,
  onCitySelect,
  className,
}: CitySearchInputProps) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebouncedValue(search, 320);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchCitySuggestions(debouncedSearch).then((results) => {
      if (cancelled) return;
      setSuggestions(results);
      setOpen(results.length > 0);
      setActiveIndex(-1);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [debouncedSearch]);

  const handleSelect = useCallback(
    (s: CitySuggestion) => {
      onCitySelect(s.city);
      onSearchChange("");
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [onCitySelect, onSearchChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative flex-1", className)}>
      {/* Active city badge inside the input row */}
      <div className="relative flex items-center">
        {cityFilter ? (
          <MapPin size={15} className="absolute left-3.5 text-primary pointer-events-none z-10" />
        ) : (
          <Search size={15} className="absolute left-3.5 text-muted-foreground pointer-events-none z-10" />
        )}

        {cityFilter && (
          <span className="absolute left-9 flex items-center gap-1 bg-primary/15 text-primary text-xs font-medium px-2 py-0.5 rounded-full z-10 pointer-events-none">
            <MapPin size={10} />
            {cityFilter}
          </span>
        )}

        <input
          ref={inputRef}
          type="search"
          placeholder={cityFilter ? "" : "Search by name, style, or city…"}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
          className={cn(
            "w-full bg-card border border-card-border rounded-xl h-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50",
            "pr-8",
            cityFilter ? "pl-[7.5rem]" : "pl-9"
          )}
          aria-autocomplete="list"
          aria-expanded={open}
        />

        {/* Loading spinner or clear city button */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {loading && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
          {cityFilter && !loading && (
            <button
              onMouseDown={(e) => { e.preventDefault(); onCitySelect(""); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear city filter"
            >
              <X size={13} />
            </button>
          )}
        </span>
      </div>

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1.5 rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
          role="listbox"
        >
          <li className="px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Cities
          </li>
          {suggestions.map((s, i) => (
            <li
              key={`${s.city}-${s.country}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer transition-colors",
                i === activeIndex
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50 text-foreground"
              )}
            >
              <MapPin size={13} className="shrink-0 text-muted-foreground" />
              <span>
                <span className="font-medium">{s.city}</span>
                <span className="text-muted-foreground text-xs">, {s.country}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
