import { useState } from "react";
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
  const [open, setOpen] = useState(false);

  const { data: allBeers = [] } = useQuery<any[]>({
    queryKey: ["/api/beers"],
    staleTime: 5 * 60 * 1000,
  });

  const filtered = query.trim().length < 2
    ? []
    : (allBeers as any[]).filter((b) => {
        const q = query.toLowerCase();
        return b.name?.toLowerCase().includes(q) || b.style?.toLowerCase().includes(q);
      }).slice(0, 8);

  if (value) {
    return (
      <div className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-[hsl(220,5%,22%)] rounded-xl">
        {value.imageUrl ? (
          <img src={value.imageUrl} alt={value.name} className="w-10 h-10 object-contain rounded-lg" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-[hsl(220,5%,25%)] flex items-center justify-center">
            <Package className="w-5 h-5 text-stone-300" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">{value.name}</p>
          <p className="text-xs text-stone-400">{value.style}</p>
        </div>
        <button className="text-xs text-stone-400 underline" onClick={() => { onChange(null); setQuery(""); }}>
          Cambia
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-9 rounded-xl"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-[hsl(220,5%,18%)] rounded-xl shadow-xl border border-stone-100 dark:border-[hsl(220,5%,27%)] max-h-60 overflow-y-auto">
          {filtered.map((beer: any) => (
            <button
              key={beer.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-stone-50 dark:hover:bg-[hsl(220,5%,22%)] text-left first:rounded-t-xl last:rounded-b-xl"
              onClick={() => { onChange(beer); setOpen(false); setQuery(""); }}
            >
              {beer.imageUrl ? (
                <img src={beer.imageUrl} alt={beer.name} className="w-9 h-9 object-contain rounded-lg" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center">
                  <Package className="w-4 h-4 text-stone-300" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{beer.name}</p>
                <p className="text-xs text-stone-400">{beer.style}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
