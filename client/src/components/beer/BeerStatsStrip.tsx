interface BeerStatsStripProps {
  beer: any;
}

/**
 * Strip 4-card stat per /beer/:id — ABV, Colore, Stile, IBU/Profilo.
 * Card crema (#FAF7F1 light / #1A1D24 dark) con valori bold.
 */
export default function BeerStatsStrip({ beer }: BeerStatsStripProps) {
  return (
    <div className="grid grid-cols-4 gap-2 mt-5">
      <div className="bg-[#FAF7F1] dark:bg-[#1A1D24] rounded-2xl px-2 py-3 flex flex-col items-center text-center">
        <span className="text-base font-extrabold text-foreground leading-tight">
          {beer?.abv ? `${beer.abv}%` : "—"}
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5">
          ABV
        </span>
      </div>
      <div className="bg-[#FAF7F1] dark:bg-[#1A1D24] rounded-2xl px-2 py-3 flex flex-col items-center text-center">
        <span className="text-sm font-extrabold text-foreground leading-tight line-clamp-1 px-1">
          {beer?.color || "—"}
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5">
          Colore
        </span>
      </div>
      <div className="bg-[#FAF7F1] dark:bg-[#1A1D24] rounded-2xl px-2 py-3 flex flex-col items-center text-center">
        <span className="text-sm font-extrabold text-foreground leading-tight line-clamp-1 px-1">
          {beer?.style?.split(/\s*[-–\/]\s*/)[0] || "—"}
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5">
          Stile
        </span>
      </div>
      <div className="bg-[#FAF7F1] dark:bg-[#1A1D24] rounded-2xl px-2 py-3 flex flex-col items-center text-center">
        <span className="text-base font-extrabold text-foreground leading-tight">
          {beer?.ibu ? String(beer.ibu) : "—"}
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-0.5">
          {beer?.ibu ? "IBU" : "Profilo"}
        </span>
      </div>
    </div>
  );
}
