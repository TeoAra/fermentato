import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Plus, Utensils, ChevronDown } from "lucide-react";
import ImageWithFallback from "@/components/image-with-fallback";
import type { FoodMenu, MenuCategory, MenuItem, MenuItemAllergen } from "./types";
import { MOCK_FOOD_MENU, ALLERGEN_LEGEND } from "./mock-data";

interface FoodMenuSectionProps {
  menu: FoodMenu | null;
  isOwner?: boolean;
  onAddMenu?: () => void;
  allergensIndex?: Record<string, { emoji?: string; name?: string }>;
  menuInfoBox?: string | null;
}

function parseInfoBoxes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {}
  return [raw]; // backward compat: testo singolo
}

function formatPrice(price: string | number): string {
  const n = typeof price === "string" ? parseFloat(price) : Number(price);
  if (isNaN(n)) return "—";
  return `€ ${n.toFixed(2).replace(".", ",")}`;
}

function resolveAllergens(
  raw: MenuItem["allergens"],
  index?: Record<string, { emoji?: string; name?: string }>
): MenuItemAllergen[] {
  if (!raw || raw.length === 0) return [];
  return raw
    .map((a) => {
      if (typeof a === "object" && a !== null && "emoji" in a && "label" in a) {
        return a as MenuItemAllergen;
      }
      const key = String(a);
      const found = index?.[key];
      if (found) return { emoji: found.emoji || "⚠️", label: found.name || key };
      return null;
    })
    .filter(Boolean) as MenuItemAllergen[];
}

export default function FoodMenuSection({
  menu,
  isOwner,
  onAddMenu,
  allergensIndex,
  menuInfoBox,
}: FoodMenuSectionProps) {
  const useMock = !menu || !menu.categories || menu.categories.length === 0;
  const data = useMock ? MOCK_FOOD_MENU : (menu as FoodMenu);
  const categories: MenuCategory[] = (data.categories || []).filter((c) => c.items && c.items.length > 0);
  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);

  // Espandibile: di default solo la prima categoria è aperta
  const [expanded, setExpanded] = useState<Set<string | number>>(
    () => new Set(categories.length > 0 ? [categories[0].id] : [])
  );
  const toggleCat = (id: string | number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 pt-4"
      data-testid="food-menu-section"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[#151515] dark:text-[#F5F5F5]">Menù</h2>
          <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] mt-0.5">
            {useMock ? "Menù di esempio" : `${totalItems} piatti disponibili`}
          </p>
        </div>
        {useMock && isOwner && onAddMenu && (
          <button
            type="button"
            onClick={onAddMenu}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-[#F59E0B] text-white text-xs font-bold active:scale-95 transition-transform"
            data-testid="food-menu-add"
          >
            <Plus className="w-3.5 h-3.5" />
            Aggiungi menù
          </button>
        )}
      </div>

      {useMock && (
        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#FFF7EA] dark:bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[10px] font-bold uppercase tracking-wider text-[#C77800] dark:text-[#FFB74D]">
          Menù di esempio
        </div>
      )}

      {/* Info box globali (esterne alle categorie) */}
      {parseInfoBoxes(menuInfoBox).map((box, i) => (
        <div key={i} className="bg-[#FFF7EA] dark:bg-[#F59E0B]/10 rounded-[16px] border border-[#F59E0B]/30 p-3.5 flex items-start gap-2.5">
          <span className="text-lg flex-shrink-0">📋</span>
          <p className="text-sm text-[#6B6357] dark:text-[#B7BDC7] leading-relaxed whitespace-pre-wrap">{box}</p>
        </div>
      ))}

      {/* Categorie verticali (scroll naturale verso il basso) */}
      {categories.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] py-12 text-center">
          <Utensils className="w-10 h-10 text-[#F59E0B] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#151515] dark:text-[#F5F5F5]">Nessun piatto disponibile</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const isOpen = expanded.has(cat.id);
            return (
            <section
              key={cat.id}
              data-testid={`menu-cat-${cat.id}`}
              className="bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleCat(cat.id)}
                aria-expanded={isOpen}
                aria-controls={`menu-cat-panel-${cat.id}`}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-[#FAF7F1] dark:active:bg-white/[0.03] transition-colors"
                data-testid={`menu-cat-toggle-${cat.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="text-base font-black text-[#151515] dark:text-[#F5F5F5]">
                      {cat.name}
                    </h3>
                    <span className="text-[10px] font-bold text-[#F59E0B] tabular-nums">
                      {cat.items.length} {cat.items.length === 1 ? "piatto" : "piatti"}
                    </span>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] leading-relaxed mt-1">
                      {cat.description}
                    </p>
                  )}
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[#6B6357] dark:text-[#B7BDC7] flex-shrink-0 transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`menu-cat-panel-${cat.id}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y divide-[#E8DED1] dark:divide-white/[0.06] border-t border-[#E8DED1] dark:border-white/[0.06]">
                {cat.infoBox && (
                  <div className="px-4 py-3 bg-[#FFF7EA] dark:bg-[#F59E0B]/10 flex items-start gap-2">
                    <span className="text-base flex-shrink-0 mt-0.5">📌</span>
                    <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] leading-relaxed">{cat.infoBox}</p>
                  </div>
                )}
                {cat.items.map((item) => {
                  const allergens = resolveAllergens(item.allergens, allergensIndex);
                  return (
                    <div
                      key={item.id}
                      className="px-4 py-3 flex gap-3"
                      data-testid={`menu-item-${item.id}`}
                    >
                      {item.imageUrl && (
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#FAF7F1] dark:bg-[#12151A] flex-shrink-0">
                          <ImageWithFallback
                            src={item.imageUrl}
                            alt={item.name}
                            imageType="food"
                            containerClassName="w-full h-full"
                            className="w-full h-full object-cover"
                            iconSize="md"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-sm text-[#151515] dark:text-[#F5F5F5] leading-tight">{item.name}</p>
                          <span className="text-base font-black text-[#F59E0B] tabular-nums whitespace-nowrap">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] leading-snug mt-1 line-clamp-3">
                            {item.description}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          {item.isVegetarian && <span className="text-sm" title="Vegetariano">🌿</span>}
                          {item.isSpicy && <span className="text-sm" title="Piccante">🌶️</span>}
                          {allergens.slice(0, 4).map((a, i) => (
                            <span
                              key={i}
                              title={a.label}
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#FFF7EA] dark:bg-[#F59E0B]/15 text-[11px]"
                            >
                              {a.emoji}
                            </span>
                          ))}
                        </div>
                        {item.pairingBeer && (
                          <div className="mt-2 inline-flex items-center gap-1.5 self-start px-2 py-1 rounded-full bg-[#FFF7EA] dark:bg-[#F59E0B]/15 border border-[#F59E0B]/20 max-w-full">
                            {item.pairingBeer.logoUrl && (
                              <div className="w-4 h-4 rounded-full overflow-hidden bg-white dark:bg-[#1A1D24] flex-shrink-0">
                                <ImageWithFallback
                                  src={item.pairingBeer.logoUrl}
                                  alt={item.pairingBeer.name}
                                  imageType="beer"
                                  containerClassName="w-full h-full"
                                  className="w-full h-full object-cover"
                                  iconSize="sm"
                                />
                              </div>
                            )}
                            <span className="text-[10px] font-semibold text-[#C77800] dark:text-[#FFB74D] truncate">
                              In abbinamento <strong>{item.pairingBeer.name}</strong>
                              {item.pairingBeer.breweryName && <> di <strong>{item.pairingBeer.breweryName}</strong></>}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
            );
          })}
        </div>
      )}

      {/* Allergeni info box */}
      <div className="bg-[#FFF7EA] dark:bg-[#F59E0B]/15 rounded-[20px] border border-[#F59E0B]/30 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-white dark:bg-[#1A1D24] flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-[#151515] dark:text-[#F5F5F5]">Hai allergie?</p>
            <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] mt-0.5 leading-relaxed">
              Chiedi al nostro staff per informazioni sugli allergeni dei nostri piatti.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {(() => {
                const raw = (allergensIndex && Object.keys(allergensIndex).length > 0
                  ? Object.values(allergensIndex).map(a => ({ emoji: a.emoji || '⚠️', label: a.name || '' }))
                  : ALLERGEN_LEGEND
                ).filter(a => a.label);
                // Dedup per nome normalizzato: il DB può avere 2 row per lo stesso
                // allergene con capitalizzazione diversa (es. "Frutta a guscio" / "Frutta a Guscio")
                const seen = new Set<string>();
                return raw.filter(a => {
                  const k = a.label.trim().toLowerCase();
                  if (seen.has(k)) return false;
                  seen.add(k);
                  return true;
                }).map((a) => (
                  <div key={a.label} className="flex items-center gap-1.5 text-[11px] text-[#6B6357] dark:text-[#B7BDC7]">
                    <span className="text-sm">{a.emoji}</span>
                    <span className="truncate">{a.label}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
