import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    country?: string;
    country_code?: string;
  };
}

interface Suggestion {
  city: string;
  country: string;
  displayName: string;
}

interface LocationAutocompleteProps {
  cityValue: string;
  countryValue: string;
  onCityChange: (city: string) => void;
  onCountryChange: (country: string) => void;
  cityClassName?: string;
  countryClassName?: string;
  disabled?: boolean;
  required?: boolean;
  cityError?: string;
  countryError?: string;
  showLabels?: boolean;
  labelClassName?: string;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

async function searchCities(query: string): Promise<Suggestion[]> {
  if (query.length < 2) return [];
  const params = new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: "1",
    limit: "7",
    featuretype: "city",
  });
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { "Accept-Language": "en" } }
  );
  if (!res.ok) return [];
  const data: NominatimResult[] = await res.json();

  const seen = new Set<string>();
  const suggestions: Suggestion[] = [];

  for (const item of data) {
    const city =
      item.address.city ||
      item.address.town ||
      item.address.village ||
      item.address.municipality ||
      item.address.county ||
      "";
    const country = item.address.country || "";
    if (!city) continue;
    const key = `${city.toLowerCase()}|${country.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({ city, country, displayName: `${city}, ${country}` });
  }

  return suggestions;
}

export function LocationAutocomplete({
  cityValue,
  countryValue,
  onCityChange,
  onCountryChange,
  cityClassName,
  countryClassName,
  disabled,
  cityError,
  countryError,
  showLabels = true,
  labelClassName,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedCity = useDebouncedValue(cityValue, 300);

  useEffect(() => {
    if (debouncedCity.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchCities(debouncedCity).then((results) => {
      if (cancelled) return;
      setSuggestions(results);
      setOpen(results.length > 0);
      setActiveIndex(-1);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [debouncedCity]);

  const handleSelect = useCallback((s: Suggestion) => {
    onCityChange(s.city);
    onCountryChange(s.country);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }, [onCityChange, onCountryChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div ref={containerRef} className="relative">
        {showLabels && (
          <Label className={cn("text-xs text-muted-foreground mb-1.5 block", labelClassName)}>
            City
          </Label>
        )}
        <div className="relative">
          <Input
            ref={inputRef}
            value={cityValue}
            onChange={(e) => onCityChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="London"
            disabled={disabled}
            autoComplete="off"
            className={cn(cityClassName, "pr-8")}
            aria-autocomplete="list"
            aria-expanded={open}
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MapPin className="h-3.5 w-3.5 opacity-50" />
            )}
          </span>
        </div>
        {cityError && (
          <p className="text-[0.8rem] font-medium text-destructive mt-1">{cityError}</p>
        )}

        {open && suggestions.length > 0 && (
          <ul
            className="absolute z-50 w-full mt-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
            role="listbox"
          >
            {suggestions.map((s, i) => (
              <li
                key={`${s.city}-${s.country}-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(s);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer transition-colors",
                  i === activeIndex
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50 text-foreground"
                )}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>
                  <span className="font-medium">{s.city}</span>
                  <span className="text-muted-foreground">, {s.country}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        {showLabels && (
          <Label className={cn("text-xs text-muted-foreground mb-1.5 block", labelClassName)}>
            Country
          </Label>
        )}
        <Input
          value={countryValue}
          onChange={(e) => onCountryChange(e.target.value)}
          placeholder="United Kingdom"
          disabled={disabled}
          autoComplete="off"
          className={countryClassName}
        />
        {countryError && (
          <p className="text-[0.8rem] font-medium text-destructive mt-1">{countryError}</p>
        )}
      </div>
    </div>
  );
}
