import { motion } from "framer-motion";
import { Link } from "wouter";
import { Heart, Beer as BeerIcon, Wine, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { format as formatDate } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import ImageWithFallback from "@/components/image-with-fallback";
import type { BottleItem } from "./types";

interface BottlesSectionProps {
  bottles: BottleItem[];
  onCheckin?: (bottle: BottleItem) => void;
  currentUserCanCheckin?: boolean;
  onToggleFavorite?: (beerId: number) => void;
  favoriteBeerIds?: Set<number>;
  /** Naviga verso un'altra tab (es. "taplist" o "menu") per il CTA dello stato vuoto */
  onNavigateTab?: (tab: string) => void;
}

type FormatFilter = "all" | "bottiglia" | "lattina";
type SortKey = "nome" | "stile" | "prezzo";

function normalizeFormat(b: BottleItem): FormatFilter | null {
  const raw = String(b.format || (b.beer as any)?.format || b.size || "").toLowerCase();
  if (raw.includes("latt") || raw.includes("can")) return "lattina";
  if (raw.includes("bott")) return "bottiglia";
  // Default assumption for craft beer cellar entries
  return "bottiglia";
}

function priceNum(b: BottleItem): number | null {
  if (!b.price) return null;
  const n = parseFloat(String(b.price));
  return Number.isFinite(n) ? n : null;
}

export default function BottlesSection({
  bottles,
  onCheckin,
  currentUserCanCheckin,
  onToggleFavorite,
  favoriteBeerIds,
  onNavigateTab,
}: BottlesSectionProps) {
  const visibleBottles = useMemo(
    () =>
      Array.isArray(bottles)
        ? bottles.filter((b) => b.isVisible !== false && b.isActive !== false)
        : [],
    [bottles],
  );

  const [query, setQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("nome");

  // Distinct styles for chip filters
  const styles = useMemo(() => {
    const set = new Set<string>();
    for (const b of visibleBottles) {
      if (b.beer.style) set.add(b.beer.style);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "it"));
  }, [visibleBottles]);

  // Which format chips make sense to show
  const availableFormats = useMemo(() => {
    const set = new Set<FormatFilter>();
    for (const b of visibleBottles) {
      const f = normalizeFormat(b);
      if (f) set.add(f);
    }
    return set;
  }, [visibleBottles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = visibleBottles.filter((b) => {
      if (styleFilter !== "all" && b.beer.style !== styleFilter) return false;
      if (formatFilter !== "all" && normalizeFormat(b) !== formatFilter) return false;
      if (q) {
        const hay = `${b.beer.name ?? ""} ${b.beer.brewery?.name ?? b.beer.breweryName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortKey === "prezzo") {
        const pa = priceNum(a);
        const pb = priceNum(b);
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return pa - pb;
      }
      if (sortKey === "stile") {
        return (a.beer.style ?? "").localeCompare(b.beer.style ?? "", "it");
      }
      return (a.beer.name ?? "").localeCompare(b.beer.name ?? "", "it");
    });

    return list;
  }, [visibleBottles, query, styleFilter, formatFilter, sortKey]);

  // Summary: price range + most recent update
  const summary = useMemo(() => {
    const prices = visibleBottles.map(priceNum).filter((p): p is number => p != null);
    const min = prices.length ? Math.min(...prices) : null;
    const max = prices.length ? Math.max(...prices) : null;

    let latest: Date | null = null;
    for (const b of visibleBottles) {
      const ts = b.updatedAt || b.addedAt;
      if (ts) {
        const d = new Date(ts);
        if (!Number.isNaN(d.getTime()) && (!latest || d > latest)) latest = d;
      }
    }
    return { min, max, latest };
  }, [visibleBottles]);

  const fmtPrice = (n: number) => `€ ${n.toFixed(2).replace(".", ",")}`;

  const hasActiveFilters =
    query.trim() !== "" || styleFilter !== "all" || formatFilter !== "all";

  const resetFilters = () => {
    setQuery("");
    setStyleFilter("all");
    setFormatFilter("all");
  };

  // ── Empty state (no bottles at all) ────────────────────────────────────────
  if (visibleBottles.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-3 pt-4"
        data-testid="bottles-section"
      >
        <h2 className="text-xl font-black text-[#151515] dark:text-[#F5F5F5]">Bottiglie & Lattine</h2>
        <div
          className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-6 text-center flex flex-col items-center gap-3"
          data-testid="bottles-empty"
        >
          <div className="w-14 h-14 rounded-full bg-[#FFF7EA] dark:bg-[#F59E0B]/15 flex items-center justify-center">
            <Wine className="w-7 h-7 text-[#F59E0B]" />
          </div>
          <div>
            <p className="font-bold text-[#151515] dark:text-[#F5F5F5]">Cantina in aggiornamento</p>
            <p className="text-sm text-[#6B6357] dark:text-[#B7BDC7] mt-1 max-w-xs mx-auto">
              Nessuna bottiglia o lattina disponibile al momento. Dai un'occhiata alle birre alla spina o al menù.
            </p>
          </div>
          {onNavigateTab && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigateTab("taplist")}
                className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full bg-[#F59E0B] text-white text-xs font-bold shadow-[0_4px_12px_rgba(245,158,11,0.35)] active:scale-95 transition-transform"
                data-testid="button-empty-view-taplist"
              >
                <BeerIcon className="w-3.5 h-3.5" />
                Vedi le spine
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab("menu")}
                className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full bg-[#FAF7F1] dark:bg-[#12151A] border border-[#E8DED1] dark:border-white/[0.06] text-xs font-bold text-[#151515] dark:text-[#F5F5F5] active:scale-95 transition-transform"
                data-testid="button-empty-view-menu"
              >
                Vedi il menù
              </button>
            </div>
          )}
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3 pt-4"
      data-testid="bottles-section"
    >
      <div>
        <h2 className="text-xl font-black text-[#151515] dark:text-[#F5F5F5]">Bottiglie & Lattine</h2>
        <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] mt-0.5" data-testid="bottles-summary">
          {visibleBottles.length} {visibleBottles.length === 1 ? "referenza" : "referenze"}
          {summary.min != null && summary.max != null && (
            <>
              {" · "}
              {summary.min === summary.max
                ? fmtPrice(summary.min)
                : `${fmtPrice(summary.min)}–${fmtPrice(summary.max)}`}
            </>
          )}
        </p>
        {summary.latest && (
          <p className="text-[11px] text-[#9B9384] dark:text-[#7A828C] mt-0.5" data-testid="bottles-updated">
            Aggiornato il {formatDate(summary.latest, "d MMMM yyyy", { locale: itLocale })}
          </p>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6357] dark:text-[#B7BDC7] pointer-events-none" />
        <input
          type="text"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca birra o birrificio…"
          className="w-full h-10 pl-9 pr-9 rounded-full bg-white dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] text-sm text-[#151515] dark:text-[#F5F5F5] placeholder:text-[#9B9384] dark:placeholder:text-[#7A828C] focus:outline-none focus:border-[#F59E0B] transition-colors"
          data-testid="input-bottle-search"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[#6B6357] dark:text-[#B7BDC7] active:scale-95 transition-transform"
            aria-label="Cancella ricerca"
            data-testid="button-clear-search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter chips (scroll horizontally on mobile) */}
      <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 w-max pb-0.5">
          {/* Format chips */}
          {(availableFormats.has("bottiglia") && availableFormats.has("lattina")) && (
            <>
              <Chip
                active={formatFilter === "all"}
                onClick={() => setFormatFilter("all")}
                testId="chip-format-all"
              >
                Tutti
              </Chip>
              <Chip
                active={formatFilter === "bottiglia"}
                onClick={() => setFormatFilter("bottiglia")}
                testId="chip-format-bottiglia"
              >
                Bottiglia
              </Chip>
              <Chip
                active={formatFilter === "lattina"}
                onClick={() => setFormatFilter("lattina")}
                testId="chip-format-lattina"
              >
                Lattina
              </Chip>
              {styles.length > 0 && <span className="w-px h-5 bg-[#E8DED1] dark:bg-white/[0.08] mx-0.5 flex-shrink-0" />}
            </>
          )}

          {/* Style chips */}
          {styles.length > 0 && (
            <Chip
              active={styleFilter === "all"}
              onClick={() => setStyleFilter("all")}
              testId="chip-style-all"
            >
              Tutti gli stili
            </Chip>
          )}
          {styles.map((s) => (
            <Chip
              key={s}
              active={styleFilter === s}
              onClick={() => setStyleFilter(styleFilter === s ? "all" : s)}
              testId={`chip-style-${s}`}
            >
              {s}
            </Chip>
          ))}
        </div>
      </div>

      {/* Sort control */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#6B6357] dark:text-[#B7BDC7]">Ordina:</span>
          {(["nome", "stile", "prezzo"] as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSortKey(k)}
              className={`text-[11px] font-bold px-2.5 h-7 rounded-full transition-colors ${
                sortKey === k
                  ? "bg-[#151515] dark:bg-[#F5F5F5] text-white dark:text-[#151515]"
                  : "bg-[#FAF7F1] dark:bg-[#12151A] border border-[#E8DED1] dark:border-white/[0.06] text-[#6B6357] dark:text-[#B7BDC7]"
              }`}
              data-testid={`sort-${k}`}
            >
              {k === "nome" ? "Nome" : k === "stile" ? "Stile" : "Prezzo"}
            </button>
          ))}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] font-bold text-[#F59E0B] active:scale-95 transition-transform whitespace-nowrap"
            data-testid="button-reset-filters"
          >
            Azzera
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div
          className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] p-6 text-center"
          data-testid="bottles-no-results"
        >
          <p className="text-sm font-bold text-[#151515] dark:text-[#F5F5F5]">Nessun risultato</p>
          <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] mt-1">
            Nessuna referenza corrisponde ai filtri selezionati.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-3 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full bg-[#FAF7F1] dark:bg-[#12151A] border border-[#E8DED1] dark:border-white/[0.06] text-xs font-bold text-[#151515] dark:text-[#F5F5F5] active:scale-95 transition-transform"
          >
            Azzera i filtri
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((b) => {
            const isFav = favoriteBeerIds?.has(b.beer.id) ?? false;
            const formatLabel = b.size || b.format || (b.beer as any)?.format;
            return (
              <div
                key={b.id}
                className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-3 flex items-center gap-3"
                data-testid={`bottle-${b.id}`}
              >
                <Link href={`/beer/${b.beer.id}`} className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-white dark:bg-[#12151A] border border-[#E8DED1] dark:border-white/[0.06] shadow-sm flex items-center justify-center">
                    <ImageWithFallback
                      src={b.imageUrl || b.beer.imageUrl || b.beer.logoUrl}
                      alt={b.beer.name}
                      imageType="bottle"
                      containerClassName="w-full h-full"
                      className="w-full h-full object-contain p-1"
                      iconSize="sm"
                    />
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link href={`/beer/${b.beer.id}`}>
                    <p className="font-bold text-sm text-[#151515] dark:text-[#F5F5F5] leading-tight break-words hover:text-[#F59E0B] transition-colors">
                      {b.beer.name}
                    </p>
                  </Link>
                  {(b.beer.brewery?.name || b.beer.breweryName) && (
                    <p className="text-[11px] font-semibold text-[#F59E0B] leading-tight break-words mt-0.5">
                      {b.beer.brewery?.name || b.beer.breweryName}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {b.beer.style && (
                      <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFF7EA] dark:bg-[#F59E0B]/15 text-[#C77800] dark:text-[#FFB74D] whitespace-nowrap">
                        {b.beer.style}
                      </span>
                    )}
                    {formatLabel && (
                      <span className="text-[10px] text-[#6B6357] dark:text-[#B7BDC7] font-medium">{formatLabel}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className="text-base font-black text-[#151515] dark:text-[#F5F5F5] tabular-nums">
                    {b.price ? `€ ${parseFloat(b.price).toFixed(2).replace(".", ",")}` : "—"}
                  </span>
                </div>

                {(onToggleFavorite || (currentUserCanCheckin && onCheckin)) && (
                  <div className="flex flex-col items-center justify-center gap-1.5 flex-shrink-0 pl-1">
                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggleFavorite(b.beer.id);
                        }}
                        className="w-8 h-8 rounded-full bg-[#FAF7F1] dark:bg-[#12151A] border border-[#E8DED1] dark:border-white/[0.06] flex items-center justify-center hover:bg-[#FFF7EA] dark:hover:bg-[#F59E0B]/15 active:scale-95 transition-all"
                        aria-label={isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${isFav ? "text-[#F59E0B]" : "text-[#6B6357] dark:text-[#B7BDC7]"}`}
                          fill={isFav ? "currentColor" : "none"}
                        />
                      </button>
                    )}
                    {currentUserCanCheckin && onCheckin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onCheckin(b);
                        }}
                        className="w-8 h-8 rounded-full bg-[#F59E0B] text-white flex items-center justify-center shadow-[0_4px_12px_rgba(245,158,11,0.35)] active:scale-95 transition-all"
                        aria-label="Check-in"
                        title="Sto bevendo questa"
                      >
                        <BeerIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}

// ── Small chip button ────────────────────────────────────────────────────────
function Chip({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 text-[11px] font-bold px-3 h-7 rounded-full whitespace-nowrap transition-colors ${
        active
          ? "bg-[#F59E0B] text-white"
          : "bg-white dark:bg-[#1A1D24] border border-[#E8DED1] dark:border-white/[0.06] text-[#6B6357] dark:text-[#B7BDC7]"
      }`}
      data-testid={testId}
    >
      {children}
    </button>
  );
}
