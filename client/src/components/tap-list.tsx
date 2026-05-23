import { useMemo, useState, lazy, Suspense } from "react";
import { Link } from "wouter";
import { Wine, Beer } from "lucide-react";
import ImageWithFallback from "@/components/image-with-fallback";
import { GlutenFreeSmallBadge, AlcoholFreeBadge } from "@/components/beer-badges";
import { useAuth } from "@/hooks/useAuth";

const CheckinModal = lazy(() => import("@/components/checkin-modal"));

function getBeerStyleColor(style: string): { bg: string; text: string } {
  const s = style?.toLowerCase() || '';
  if (s.includes('stout') || s.includes('porter')) return { bg: 'rgba(60,30,10,0.12)', text: '#7B4A1E' };
  if (s.includes('sour') || s.includes('gose') || s.includes('lambic') || s.includes('berliner')) return { bg: 'rgba(212,168,56,0.14)', text: '#A8840A' };
  if (s.includes('saison') || s.includes('farmhouse') || s.includes('bière de garde')) return { bg: 'rgba(100,160,70,0.14)', text: '#4E8A28' };
  if (s.includes('wit') || s.includes('weiss') || s.includes('weizen') || s.includes('wheat') || s.includes('farro')) return { bg: 'rgba(212,168,67,0.14)', text: '#9A7820' };
  if (s.includes('lager') || s.includes('pilsner') || s.includes('pils') || s.includes('märzen') || s.includes('marzen') || s.includes('bock')) return { bg: 'rgba(207,168,101,0.14)', text: '#8A6A10' };
  if (s.includes('red') || s.includes('amber') || s.includes('rossa') || s.includes('ambrata')) return { bg: 'rgba(185,60,30,0.13)', text: '#B04020' };
  if (s.includes('barley wine') || s.includes('barleywine') || s.includes('imperial') || s.includes('wee heavy')) return { bg: 'rgba(130,30,80,0.12)', text: '#8A1E55' };
  if (s.includes('ipa') || s.includes('india pale')) return { bg: 'rgba(80,140,60,0.13)', text: '#3A7A1A' };
  if (s.includes('apa') || s.includes('pale ale') || s.includes('session')) return { bg: 'rgba(232,140,30,0.13)', text: '#C07010' };
  return { bg: 'rgba(247,113,4,0.12)', text: '#C05A00' };
}

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (isNaN(num) || num <= 0) return '';
  return `€\u00a0${num.toFixed(2).replace('.', ',')}`;
}

interface PriceItem {
  size: string;
  price: string;
  format?: string;
}

type TapListItem = {
  id: number;
  beer: {
    id: number;
    name: string;
    style: string;
    abv: string | null;
    ibu?: number | null;
    logoUrl: string | null;
    imageUrl?: string | null;
    isGlutenFree?: boolean;
    isAlcoholFree?: boolean;
    brewery: {
      id: number;
      name: string;
      logoUrl: string | null;
    };
  };
  prices?: PriceItem[];
  priceSmall: string | null;
  priceMedium: string | null;
  priceLarge: string | null;
  tapNumber: number | null;
  tapType?: string | null;
  description?: string | null;
  isVisible?: boolean | null;
};

interface TapListProps {
  tapList: TapListItem[];
  pub?: { id: number; name: string } | null;
}

function getAllPrices(tap: TapListItem): string[] {
  if (tap.prices && tap.prices.length > 0) {
    const valid = tap.prices
      .filter(p => parseFloat(p.price) > 0)
      .map(p => {
        const label = p.size ? `${p.size} ${formatPrice(p.price)}` : formatPrice(p.price);
        return label;
      });
    if (valid.length > 0) return valid;
  }
  const pairs: Array<[string | null, string]> = [
    [tap.priceSmall, 'piccola'],
    [tap.priceMedium, 'media'],
    [tap.priceLarge, 'grande'],
  ];
  return pairs
    .filter(([p]) => p && parseFloat(p as string) > 0)
    .map(([p]) => formatPrice(p as string));
}

export default function TapList({ tapList, pub }: TapListProps) {
  const { isAuthenticated } = useAuth();
  const [checkinTap, setCheckinTap] = useState<TapListItem | null>(null);
  const sorted = useMemo(() => {
    if (!tapList) return [];
    const ORDER: Record<string, number> = { spina: 0, pompa: 1, botte: 2 };
    return [...tapList].sort((a, b) => {
      const aOrd = ORDER[a.tapType ?? "spina"] ?? 0;
      const bOrd = ORDER[b.tapType ?? "spina"] ?? 0;
      if (aOrd !== bOrd) return aOrd - bOrd;
      return (a.tapNumber ?? 999) - (b.tapNumber ?? 999);
    });
  }, [tapList]);

  if (!sorted || sorted.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-2xl bg-stone-100 dark:bg-[#1B2735] mx-auto mb-4 flex items-center justify-center">
          <Wine className="h-10 w-10 text-stone-400" />
        </div>
        <h4 className="text-base font-semibold text-stone-700 dark:text-stone-300 mb-1">
          Nessuna birra alla spina
        </h4>
        <p className="text-sm text-stone-400 dark:text-stone-500">
          Controlla più tardi per le novità in taplist
        </p>
      </div>
    );
  }

  const spinaItems = sorted.filter(t => !t.tapType || t.tapType === "spina");
  const pompaItems = sorted.filter(t => t.tapType === "pompa");
  const botteItems = sorted.filter(t => t.tapType === "botte");

  const renderRow = (tap: TapListItem, index: number, arr: TapListItem[]) => {
    const styleColor = getBeerStyleColor(tap.beer.style);
    const prices = getAllPrices(tap);
    const isLast = index === arr.length - 1;

    const metaParts: string[] = [];
    if (tap.beer.brewery?.name) metaParts.push(tap.beer.brewery.name);
    if (tap.beer.abv && parseFloat(tap.beer.abv) > 0) {
      metaParts.push(tap.beer.isAlcoholFree ? '0,0%' : `${tap.beer.abv}%`);
    }
    if (tap.beer.ibu && tap.beer.ibu > 0) metaParts.push(`${tap.beer.ibu} IBU`);
    const metaLine = metaParts.join(' · ');

    return (
      <div key={tap.id} className={tap.isVisible === false ? 'opacity-50' : ''}>
        <div className="flex items-center gap-3.5 px-4 py-3.5 active:bg-stone-50 dark:active:bg-stone-800/30 transition-colors">
          <Link href={`/beer/${tap.beer.id}`} className="flex items-center gap-3.5 flex-1 min-w-0">
            {/* Style-tinted icon */}
            <div
              className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
              style={{ background: styleColor.bg }}
            >
              <ImageWithFallback
                src={tap.beer.imageUrl || tap.beer.logoUrl}
                alt={tap.beer.name}
                imageType="beer"
                containerClassName="w-full h-full"
                className="w-full h-full object-cover"
                iconSize="sm"
              />
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-[15px] text-stone-900 dark:text-white leading-snug break-words line-clamp-2">
                  {tap.beer.name}
                </p>
                {tap.beer.isGlutenFree && <GlutenFreeSmallBadge size={10} />}
                {tap.beer.isAlcoholFree && <AlcoholFreeBadge size={10} />}
              </div>
              {tap.beer.style && (
                <span
                  className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 mb-0.5 leading-tight"
                  style={{ background: styleColor.bg, color: styleColor.text }}
                >
                  {tap.beer.style}
                </span>
              )}
              {metaLine && (
                <p className="text-xs text-stone-400 dark:text-stone-500 truncate leading-tight">
                  {metaLine}
                </p>
              )}
            </div>
          </Link>

          {/* Prices + check-in */}
          <div className="flex items-center gap-2 flex-shrink-0 pl-1">
            {prices.length > 0 && (
              <div className="flex flex-col items-end gap-0.5">
                {prices.map((p, i) => (
                  <p key={i} className="text-[13px] font-semibold tabular-nums leading-tight text-stone-600 dark:text-stone-400">
                    {p}
                  </p>
                ))}
              </div>
            )}
            {isAuthenticated && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCheckinTap(tap); }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-100 dark:bg-[#1B2735] text-stone-500 dark:text-stone-400 hover:text-primary hover:bg-stone-200 dark:hover:bg-[#232F3D] active:scale-95 transition-all flex-shrink-0"
                aria-label="Check-in"
                title="Sto bevendo questa"
              >
                <Beer className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {!isLast && (
          <div className="h-px bg-stone-100 dark:bg-[#1B2735]/60 ml-[3.75rem] mr-4" />
        )}
      </div>
    );
  };

  const Section = ({ items, label, accent }: { items: TapListItem[]; label?: string; accent?: string }) => (
    <div>
      {label && (
        <div className="flex items-center gap-2 px-4 pb-1 pt-2">
          <span className={`text-[11px] font-black uppercase tracking-widest ${accent || 'text-stone-400 dark:text-stone-500'}`}>
            {label}
          </span>
        </div>
      )}
      <div className="bg-white dark:bg-card rounded-2xl overflow-hidden border border-stone-100/70 dark:border-[#2F3D4D]/20 shadow-sm">
        {items.map((tap, i) => renderRow(tap, i, items))}
      </div>
    </div>
  );

  const modal = checkinTap ? (
    <Suspense fallback={null}>
      <CheckinModal
        open={!!checkinTap}
        onClose={() => setCheckinTap(null)}
        beer={{
          id: checkinTap.beer.id,
          name: checkinTap.beer.name,
          style: checkinTap.beer.style,
          breweryName: checkinTap.beer.brewery?.name,
        }}
        pub={pub ?? null}
        tapType={checkinTap.tapType ?? "spina"}
      />
    </Suspense>
  ) : null;

  const hasMultipleSections = (spinaItems.length > 0 ? 1 : 0) + (pompaItems.length > 0 ? 1 : 0) + (botteItems.length > 0 ? 1 : 0) > 1;

  if (!hasMultipleSections) {
    return (
      <>
        <Section items={spinaItems.length ? spinaItems : pompaItems.length ? pompaItems : botteItems} />
        {modal}
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {spinaItems.length > 0 && (
          <Section items={spinaItems} label="In Spina" accent="text-primary dark:text-orange-400" />
        )}
        {pompaItems.length > 0 && (
          <Section items={pompaItems} label="In Pompa" accent="text-violet-600 dark:text-violet-400" />
        )}
        {botteItems.length > 0 && (
          <Section items={botteItems} label="Alla Botte" accent="text-amber-700 dark:text-amber-400" />
        )}
      </div>
      {modal}
    </>
  );
}
