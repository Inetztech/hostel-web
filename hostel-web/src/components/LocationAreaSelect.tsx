import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchLocations, LocationSuggestion } from "@/lib/tnLocations";
import { Loader2, Search } from "lucide-react";

interface LocationAreaSelectProps {
  value: string;
  district: string;
  stateLabel: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}

export const LocationAreaSelect = ({
  value, district, stateLabel, disabled, placeholder, onChange,
}: LocationAreaSelectProps) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const prevDistrictRef = useRef(district);
  useEffect(() => {
    if (prevDistrictRef.current === district) return;
    prevDistrictRef.current = district;
    setQuery("");
    setSuggestions([]);
    setOpen(false);
  }, [district]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleType = async (v: string) => {
    setQuery(v);
    if (v.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const results = await searchLocations(v, district, stateLabel);
    setLoading(false);
    setSuggestions(results);
    setOpen(true);
  };

  const handlePick = (s: LocationSuggestion) => {
    setQuery(s.short);
    onChange(s.short);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          placeholder={placeholder || "Type to search location..."}
          disabled={disabled}
          className="rounded-lg pl-8"
          onChange={(e) => handleType(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">
              {loading ? "Searching..." : "No matches — keep typing or try a different spelling"}
            </div>
          ) : (
            suggestions.map((s) => (
              <button
                key={s.placeId}
                type="button"
                className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => handlePick(s)}
              >
                <div className="font-medium text-foreground">{s.short}</div>
                <div className="text-xs text-muted-foreground truncate">{s.text}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};