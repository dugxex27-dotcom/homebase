import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

interface NominatimResult {
  place_id: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  lat: string;
  lon: string;
}

function formatAddress(result: NominatimResult): string {
  const a = result.address;
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const city = a.city || a.town || a.village || a.county || "";
  const state = a.state || "";
  const zip = a.postcode || "";
  const parts = [street, city, state, zip].filter(Boolean);
  return parts.length >= 2 ? parts.join(", ") : result.display_name;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (formatted: string, raw: NominatimResult) => void;
  placeholder?: string;
  id?: string;
  "data-testid"?: string;
  className?: string;
  countryCodes?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address…",
  id,
  "data-testid": testId,
  className,
  countryCodes = "us",
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1&countrycodes=${countryCodes}`;
      const res = await fetch(url, {
        signal: abortRef.current.signal,
        headers: { "Accept-Language": "en" },
      });
      if (!res.ok) throw new Error("Nominatim error");
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setShowDropdown(data.length > 0);
    } catch (e: any) {
      if (e?.name !== "AbortError") setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [countryCodes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 400);
  };

  const handleSelect = (result: NominatimResult) => {
    const formatted = formatAddress(result);
    onChange(formatted);
    onSelect?.(formatted, result);
    setShowDropdown(false);
    setSuggestions([]);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        data-testid={testId}
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-[#3C258E] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {showDropdown && suggestions.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
        >
          {suggestions.map((s) => {
            const main = [
              [s.address.house_number, s.address.road].filter(Boolean).join(" "),
            ].filter(Boolean)[0] || s.display_name.split(",")[0];
            const secondary = formatAddress(s)
              .split(",")
              .slice(1)
              .join(",")
              .trim();
            return (
              <li
                key={s.place_id}
                onMouseDown={() => handleSelect(s)}
                className="px-4 py-2.5 hover:bg-[#EEEDFE] cursor-pointer border-b border-gray-50 last:border-b-0"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#3C258E] mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{main}</p>
                    {secondary && (
                      <p className="text-xs text-gray-500 truncate">{secondary}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
