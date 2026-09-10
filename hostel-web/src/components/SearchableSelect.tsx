import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown } from "lucide-react";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  options: SearchableSelectOption[];
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}

/**
 * A client-side searchable / type-ahead dropdown for a fixed list of options.
 * Same look & interaction model as LocationAreaSelect, but filters a local
 * array instead of hitting an API — good fit for static lists like districts.
 */
export const SearchableSelect = ({
  value, options, disabled, placeholder, onChange,
}: SearchableSelectProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  // Keep the visible text in sync with the selected value when the
  // dropdown is closed (e.g. value changed programmatically, or on mount).
  useEffect(() => {
    if (!open) setQuery(selectedLabel);
  }, [selectedLabel, open]);

  // Reset when disabled (e.g. parent field like "state" was cleared).
  useEffect(() => {
    if (disabled) {
      setQuery("");
      setOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(selectedLabel);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLabel]);

  const filtered = query.trim().length === 0
    ? options
    : options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));

  const handleType = (v: string) => {
    setQuery(v);
    setOpen(true);
  };

  const handlePick = (o: SearchableSelectOption) => {
    onChange(o.value);
    setQuery(o.label);
    setOpen(false);
  };

  const handleFocus = () => {
    if (disabled) return;
    setQuery(""); // clear so the full list / matching starts fresh
    setOpen(true);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={open ? query : selectedLabel}
          placeholder={placeholder || "Type to search..."}
          disabled={disabled}
          className="rounded-lg pl-8 pr-8"
          onChange={(e) => handleType(e.target.value)}
          onFocus={handleFocus}
          autoComplete="off"
        />
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">No matches</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                  o.value === value ? "bg-slate-50 font-medium text-[#5200FF]" : "text-foreground"
                }`}
                onClick={() => handlePick(o)}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};