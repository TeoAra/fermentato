import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, GlassWater, Wine } from "lucide-react";
import { descriptionToText } from "@shared/description-text";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Drink = {
  id: number | string;
  name: string;
  description?: unknown;
  imageUrl?: string | null;
  producer?: string | null;
  vintage?: string | number | null;
  distillery?: string | null;
  price?: string | number | null;
  priceByGlass?: string | number | null;
  priceByBottle?: string | number | null;
  volumeCl?: string | number | null;
  alcoholDegree?: string | number | null;
  category?: string | null;
  isVisible?: boolean | null;
};

type DrinkCategory = {
  id: number;
  name: string;
  type?: string | null;
  description?: unknown;
  infoBox?: unknown;
  items?: Drink[];
  isVisible?: boolean | null;
};

function text(value: unknown): string {
  return value == null ? "" : descriptionToText(value as never).trim();
}

function price(value: unknown): string | null {
  if (value == null || String(value).trim() === "") return null;
  const amount = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(amount) ? `€${amount.toFixed(2)}` : null;
}

function DrinkDetailDialog({
  item,
  onOpenChange,
}: {
  item: Drink | null;
  onOpenChange: (open: boolean) => void;
}) {
  const description = item ? text(item.description) : "";
  const meta = item
    ? [item.producer, item.vintage, item.distillery].filter(Boolean).map(String)
    : [];
  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-full min-h-0 flex-col gap-0 overflow-hidden overscroll-none rounded-2xl border-[#E8DED1] bg-[#FCFAF6] p-0 shadow-[0_24px_80px_rgba(35,25,15,0.24)] dark:border-white/[0.08] dark:bg-[#1A1D24] sm:max-w-lg"
        data-testid="drink-detail-dialog"
        aria-describedby={undefined}
      >
        {item && (
          <>
            <DialogHeader
              className="shrink-0 border-b border-[#E8DED1] bg-[#FCFAF6] px-5 pb-4 pt-5 pr-16 text-left dark:border-white/[0.08] dark:bg-[#1A1D24] sm:px-6 sm:pr-16"
              data-testid="menu-detail-header"
            >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  {item.category === "vino" ? "Vino" : "Dettaglio prodotto"}
                </p>
                <DialogTitle className="text-xl font-black leading-tight tracking-[-0.025em] text-[#302820] dark:text-[#F5F5F5]">{item.name}</DialogTitle>
                {meta.length > 0 && (
                  <p className="text-sm text-[#746A5E] dark:text-[#B7BDC7]">{meta.join(" · ")}</p>
                )}
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-testid="menu-detail-scroll">
              {item.imageUrl && (
                <div className="mx-5 mt-4 h-36 overflow-hidden rounded-xl bg-[#F1ECE3] dark:bg-[#12151A] sm:mx-6 sm:h-44">
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain" />
                </div>
              )}
              <div className="space-y-5 p-5 sm:p-6">
              {(item.priceByGlass || item.priceByBottle || item.price) && (
                <div className="flex flex-wrap gap-2">
                  {price(item.priceByGlass) && <PriceTag label="Calice" value={price(item.priceByGlass)!} />}
                  {price(item.priceByBottle) && <PriceTag label="Bottiglia" value={price(item.priceByBottle)!} />}
                  {price(item.price) && !item.priceByGlass && !item.priceByBottle && (
                    <PriceTag label="Prezzo" value={price(item.price)!} />
                  )}
                </div>
              )}
              {(item.volumeCl || item.alcoholDegree) && (
                <div className="flex gap-2 text-xs font-semibold text-muted-foreground">
                  {item.volumeCl && <span className="rounded-full bg-muted px-3 py-1.5">{item.volumeCl} cl</span>}
                  {item.alcoholDegree && <span className="rounded-full bg-muted px-3 py-1.5">{item.alcoholDegree}% vol.</span>}
                </div>
              )}
              {description ? (
                <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-[#433B32] dark:text-[#E3E6EA]" data-testid="drink-detail-description">
                  {description}
                </p>
              ) : (
                <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                  Non è disponibile una descrizione per questo prodotto.
                </p>
              )}
            </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PriceTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-black text-primary">{value}</p>
    </div>
  );
}

function DrinkRow({
  item,
  categoryType,
  onSelect,
}: {
  item: Drink;
  categoryType?: string | null;
  onSelect: (item: Drink) => void;
}) {
  const hasDescription = Boolean(text(item.description));
  const producer = [item.producer, item.vintage, item.distillery].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      onClick={() => onSelect(item.category ? item : { ...item, category: categoryType || undefined })}
      className="group flex min-h-[72px] w-full items-center gap-2.5 rounded-xl border border-[#E8DED1] bg-[#FCFAF6] px-2.5 py-2 text-left transition-[background-color,border-color,transform] duration-150 hover:border-[#D8C5AA] hover:bg-[#F8F2E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D08409] active:scale-[0.995] active:bg-[#F3EBDD] dark:border-white/[0.08] dark:bg-[#1A1D24] dark:hover:border-white/[0.14] dark:hover:bg-[#22262E] dark:active:bg-[#252A33] sm:gap-3 sm:px-3"
      aria-label={`Apri i dettagli di ${item.name}`}
      data-testid={`drink-detail-trigger-${item.id}`}
    >
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-[#F1ECE3] object-cover dark:bg-[#12151A] sm:h-11 sm:w-11" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F5EAD6] text-[#C77800] dark:bg-[#33291C] dark:text-[#FFB74D] sm:h-11 sm:w-11">
          {item.category === "vino" || categoryType === "vino" ? <Wine className="h-[18px] w-[18px]" /> : <GlassWater className="h-[18px] w-[18px]" />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-start gap-1">
          <span className="min-w-0 flex-1 break-words text-[13px] font-extrabold leading-snug tracking-[-0.01em] text-[#302820] dark:text-[#F5F5F5] sm:text-sm">{item.name}</span>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#C77800] dark:text-[#FFB74D]" aria-hidden="true" />
        </span>
        {producer && <span className="mt-0.5 block truncate text-[11px] leading-tight text-[#746A5E] dark:text-[#B7BDC7]">{producer}</span>}
        {hasDescription ? (
          <span
            className="mt-1 block overflow-hidden break-words text-[11px] leading-[1.35rem] text-[#746A5E] dark:text-[#B7BDC7]"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              maxHeight: "2.7rem",
            }}
          >
            {text(item.description)}
          </span>
        ) : (
          <span className="mt-1 block text-[11px] font-semibold text-[#C77800] dark:text-[#FFB74D]">Apri i dettagli</span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5 pl-1">
        {price(item.priceByGlass) && (
          <span className="min-w-[53px] rounded-md bg-[#F2EBDD] px-1.5 py-1 text-right leading-none dark:bg-[#2A2E35]">
            <span className="block text-[10px] font-bold uppercase tracking-[0.04em] text-[#746A5E] dark:text-[#B7BDC7]">Calice</span>
            <span className="mt-0.5 block text-[13px] font-black tabular-nums text-[#C77800] dark:text-[#FFB74D]">{price(item.priceByGlass)}</span>
          </span>
        )}
        {price(item.priceByBottle) && (
          <span className="min-w-[53px] rounded-md bg-[#F2EBDD] px-1.5 py-1 text-right leading-none dark:bg-[#2A2E35]">
            <span className="block text-[10px] font-bold uppercase tracking-[0.04em] text-[#746A5E] dark:text-[#B7BDC7]">Bottiglia</span>
            <span className="mt-0.5 block text-[13px] font-black tabular-nums text-[#C77800] dark:text-[#FFB74D]">{price(item.priceByBottle)}</span>
          </span>
        )}
        {price(item.price) && !item.priceByGlass && !item.priceByBottle && (
          <span className="text-sm font-black tabular-nums text-[#C77800] dark:text-[#FFB74D]">{price(item.price)}</span>
        )}
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums text-[#746A5E] dark:text-[#B7BDC7]">
          {item.volumeCl ? `${item.volumeCl} cl` : ""}
          {item.volumeCl && item.alcoholDegree ? " · " : ""}
          {item.alcoholDegree ? `${item.alcoholDegree}%` : ""}
        </span>
      </span>
      <span className="sr-only">Apri dettagli</span>
    </button>
  );
}

export default function DrinksPublicSection({
  categories,
  legacyItems,
}: {
  categories: DrinkCategory[];
  legacyItems: Drink[];
}) {
  const visibleCategories = categories
    .filter((category) => category.isVisible !== false && Array.isArray(category.items))
    .map((category) => ({
      ...category,
      items: (category.items || []).filter((item) => item.isVisible !== false),
    }))
    .filter((category) => category.items.length > 0);
  const [expandedOverride, setExpanded] = useState<Set<number> | null>(null);
  const expanded = expandedOverride ?? new Set(visibleCategories.length ? [visibleCategories[0].id] : []);
  const [selected, setSelected] = useState<Drink | null>(null);

  const toggleCategory = (id: number) => {
    setExpanded((previous) => {
      const next = new Set(previous ?? expanded);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (visibleCategories.length > 0) {
    const wineCategories = visibleCategories.filter((category) => category.type === "vino");
    const otherCategories = visibleCategories.filter((category) => category.type !== "vino");
    return (
      <>
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-7 pt-4"
          data-testid="drinks-public-section"
        >
          {wineCategories.length > 0 && (
            <CategoryGroup title="Vini" categories={wineCategories} expanded={expanded} onToggle={toggleCategory} onSelect={setSelected} />
          )}
          {otherCategories.length > 0 && (
            <CategoryGroup title="Bevande" categories={otherCategories} expanded={expanded} onToggle={toggleCategory} onSelect={setSelected} />
          )}
        </motion.section>
        <DrinkDetailDialog item={selected} onOpenChange={(open) => !open && setSelected(null)} />
      </>
    );
  }

  const visible = legacyItems.filter((item) => item.isVisible !== false);
  if (visible.length === 0) return null;
  const meta: Record<string, string> = {
    vino: "Vini",
    distillati: "Distillati",
    spirits: "Distillati",
    cocktail: "Cocktail",
    bibita: "Bevande",
    altro: "Altro",
  };
  const order = ["vino", "distillati", "bibita", "altro"];
  const allCategories = [...new Set(visible.map((item) => item.category || "vino"))];
  const ordered = [...order.filter((category) => allCategories.includes(category)),
    ...allCategories.filter((category) => !order.includes(category)).sort()];
  const wines = ordered.filter((category) => category === "vino");
  const others = ordered.filter((category) => category !== "vino");

  const LegacyGroups = ({ title, items }: { title: string; items: string[] }) => (
    items.length > 0 ? (
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-foreground">
          {title === "Vini" ? <Wine className="h-5 w-5 text-primary" /> : <GlassWater className="h-5 w-5 text-primary" />}
          {title}
        </h2>
        {items.map((category) => (
          <div key={category} className="space-y-2">
            <h3 className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{meta[category] || category}</h3>
            {visible.filter((item) => (item.category || "vino") === category).map((item) => (
              <DrinkRow key={item.id} item={item} categoryType={category} onSelect={setSelected} />
            ))}
          </div>
        ))}
      </section>
    ) : null
  );

  return (
    <>
      <section className="space-y-7 pt-6" data-testid="drinks-public-section">
        <LegacyGroups title="Vini" items={wines} />
        <LegacyGroups title="Bevande" items={others} />
      </section>
      <DrinkDetailDialog item={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </>
  );
}

function CategoryGroup({
  title,
  categories,
  expanded,
  onToggle,
  onSelect,
}: {
  title: string;
  categories: DrinkCategory[];
  expanded: Set<number>;
  onToggle: (id: number) => void;
  onSelect: (item: Drink) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-foreground">
        {title === "Vini" ? <Wine className="h-5 w-5 text-primary" /> : <GlassWater className="h-5 w-5 text-primary" />}
        {title}
      </h2>
      {categories.map((category) => {
        const isOpen = expanded.has(category.id);
        return (
          <section key={category.id} className="overflow-hidden rounded-xl border border-[#E8DED1] bg-[#FCFAF6] shadow-[0_2px_10px_rgba(45,30,10,0.035)] dark:border-white/[0.08] dark:bg-[#1A1D24] dark:shadow-none">
            <button
              type="button"
              onClick={() => onToggle(category.id)}
              aria-expanded={isOpen}
              aria-controls={`drink-category-${category.id}`}
              className="flex min-h-12 w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[#F8F2E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D08409] dark:hover:bg-[#22262E] dark:focus-visible:ring-[#FFB74D]"
              data-testid={`drink-category-toggle-${category.id}`}
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-base font-black text-foreground">{category.name}</span>
                  <span className="text-[11px] font-bold tabular-nums text-primary">
                    {category.items?.length} {category.items?.length === 1 ? "prodotto" : "prodotti"}
                  </span>
                </span>
                {text(category.description) && (
                  <span className="mt-1 block whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {text(category.description)}
                  </span>
                )}
              </span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`drink-category-${category.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border">
                    {text(category.infoBox) && (
                      <p className="whitespace-pre-wrap bg-accent px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                        {text(category.infoBox)}
                      </p>
                    )}
                    <div className="space-y-2 p-3">
                      {category.items?.map((item) => <DrinkRow key={item.id} item={item} categoryType={category.type} onSelect={onSelect} />)}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        );
      })}
    </section>
  );
}
