import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, GlassWater, Wine } from "lucide-react";
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
        className="max-h-[min(88dvh,760px)] overflow-y-auto overscroll-contain rounded-2xl p-0 sm:max-w-lg"
        data-testid="drink-detail-dialog"
        aria-describedby={undefined}
      >
        {item && (
          <>
            {item.imageUrl && (
              <div className="h-48 overflow-hidden bg-muted sm:h-56">
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain" />
              </div>
            )}
            <div className="space-y-5 p-5 sm:p-6">
              <DialogHeader className="space-y-1 text-left">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                  Dettaglio prodotto
                </p>
                <DialogTitle className="pr-7 text-xl font-black leading-tight">{item.name}</DialogTitle>
                {meta.length > 0 && (
                  <p className="text-sm text-muted-foreground">{meta.join(" · ")}</p>
                )}
              </DialogHeader>
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
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground/85" data-testid="drink-detail-description">
                  {description}
                </p>
              ) : (
                <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                  Non è disponibile una descrizione per questo prodotto.
                </p>
              )}
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
  onSelect,
}: {
  item: Drink;
  onSelect: (item: Drink) => void;
}) {
  const hasDescription = Boolean(text(item.description));
  const producer = [item.producer, item.vintage, item.distillery].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="flex min-h-[76px] w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted"
      aria-label={`Apri i dettagli di ${item.name}`}
      data-testid={`drink-detail-trigger-${item.id}`}
    >
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
          {item.category === "vino" ? <Wine className="h-5 w-5" /> : <GlassWater className="h-5 w-5" />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-bold leading-snug text-foreground">{item.name}</span>
        {producer && <span className="mt-0.5 block text-xs text-muted-foreground">{producer}</span>}
        {hasDescription ? (
          <span className="mt-1 block whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {text(item.description)}
          </span>
        ) : (
          <span className="mt-1 block text-xs font-medium text-primary">Dettagli prodotto</span>
        )}
        {hasDescription && <span className="mt-1 block text-[11px] font-semibold text-primary">Leggi tutto</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {price(item.priceByGlass) && (
          <span className="rounded-lg border border-border bg-background px-2 py-1 text-right">
            <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Calice</span>
            <span className="block text-xs font-black text-primary">{price(item.priceByGlass)}</span>
          </span>
        )}
        {price(item.priceByBottle) && (
          <span className="rounded-lg border border-border bg-background px-2 py-1 text-right">
            <span className="block text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Bottiglia</span>
            <span className="block text-xs font-black text-primary">{price(item.priceByBottle)}</span>
          </span>
        )}
        {price(item.price) && !item.priceByGlass && !item.priceByBottle && (
          <span className="text-sm font-black text-primary">{price(item.price)}</span>
        )}
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
          {item.volumeCl ? `${item.volumeCl} cl` : ""}
          {item.volumeCl && item.alcoholDegree ? " · " : ""}
          {item.alcoholDegree ? `${item.alcoholDegree}%` : ""}
        </span>
      </span>
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
              <DrinkRow key={item.id} item={item} onSelect={setSelected} />
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
          <section key={category.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card-sm">
            <button
              type="button"
              onClick={() => onToggle(category.id)}
              aria-expanded={isOpen}
              aria-controls={`drink-category-${category.id}`}
              className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
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
                      {category.items?.map((item) => <DrinkRow key={item.id} item={item} onSelect={onSelect} />)}
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
