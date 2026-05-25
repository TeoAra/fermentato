import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Package } from "lucide-react";
import { Input } from "@/components/ui/input";

interface BeerSearchComboboxProps {
  value: any;
  onChange: (beer: any) => void;
  placeholder?: string;
}

export default function BeerSearchCombobox({ value, onChange, placeholder = "Cerca birra..." }: BeerSearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: results = [], isFetching } = useQuery<any[]>({
    queryKey: ["/api/beers/search", debouncedQuery],
    queryFn: () => fetch(`/api/beers/search?q=${encodeURIComponent(debouncedQuery)}&limit=20`).then(r => r.json()),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 60_000,
  });

  if (value) {
    return (
      <div className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-[#12151A] rounded-xl">
        {value.imageUrl ? (
          <img src={value.imageUrl} alt={value.name} className="w-10 h-10 object-contain rounded-lg" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-[#23262E] flex items-center justify-center">
            <Package className="w-5 h-5 text-stone-300" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate">{value.name}</p>
          <p className="text-xs text-stone-400">{value.breweryName ?? value.style}</p>
        </div>
        <button className="text-xs text-stone-400 underline shrink-0" onClick={() => { onChange(null); setQuery(""); }}>
          Cambia
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-9 rounded-xl"
        />
        {isFetching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-stone-300 border-t-primary rounded-full animate-spin" />
        )}
      </div>
      {open && debouncedQuery.length >= 2 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-[#1A1D24] rounded-xl shadow-xl border border-stone-100 dark:border-[hsl(220,5%,27%)] max-h-60 overflow-y-auto">
          {results.length === 0 && !isFetching ? (
            <p className="px-4 py-3 text-sm text-stone-400">Nessuna birra trovata</p>
          ) : (
            results.map((beer: any) => (
              <button
                key={beer.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-stone-50 dark:hover:bg-[#12151A] text-left first:rounded-t-xl last:rounded-b-xl"
                onMouseDown={(e) => { e.preventDefault(); onChange(beer); setOpen(false); setQuery(""); }}
              >
                {beer.imageUrl ? (
                  <img src={beer.imageUrl} alt={beer.name} className="w-9 h-9 object-contain rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-[#23262E] flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-stone-300" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">{beer.name}</p>
                  <p className="text-xs text-stone-400 truncate">{beer.breweryName}{beer.style ? ` · ${beer.style}` : ""}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
