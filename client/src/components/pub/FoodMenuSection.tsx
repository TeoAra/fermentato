import { motion } from "framer-motion";
import { ShieldCheck, Plus, Utensils } from "lucide-react";
import ImageWithFallback from "@/components/image-with-fallback";
import type { FoodMenu, MenuCategory, MenuItem, MenuItemAllergen } from "./types";
import { MOCK_FOOD_MENU, ALLERGEN_LEGEND } from "./mock-data";

interface FoodMenuSectionProps {
  menu: FoodMenu | null;
  isOwner?: boolean;
  onAddMenu?: () => void;
  allergensIndex?: Record<string, { emoji?: string; name?: string }>;
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
}: FoodMenuSectionProps) {
  const useMock = !menu || !menu.categories || menu.categories.length === 0;
  const data = useMock ? MOCK_FOOD_MENU : (menu as FoodMenu);
  const categories: MenuCategory[] = (data.categories || []).filter((c) => c.items && c.items.length > 0);
  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);

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
          <h2 className="text-xl font-black text-[#151515]">Menù</h2>
          <p className="text-xs text-[#6B6357] mt-0.5">
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
        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#FFF7EA] border border-[#F59E0B]/30 text-[10px] font-bold uppercase tracking-wider text-[#C77800]">
          Menù di esempio
        </div>
      )}

      {/* Categorie verticali (scroll naturale verso il basso) */}
      {categories.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-[#E8DED1] py-12 text-center">
          <Utensils className="w-10 h-10 text-[#F59E0B] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#151515]">Nessun piatto disponibile</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <section key={cat.id} data-testid={`menu-cat-${cat.id}`} className="space-y-2.5">
              <h3 className="text-base font-black text-[#151515] sticky top-0 bg-[#FAF7F1]/95 backdrop-blur-sm py-1.5 -mx-1 px-1 z-10">
                {cat.name}
                <span className="ml-2 text-[10px] font-bold text-[#F59E0B] align-middle">
                  {cat.items.length}
                </span>
              </h3>
              <div className="space-y-2.5">
                {cat.items.map((item) => {
                  const allergens = resolveAllergens(item.allergens, allergensIndex);
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-[20px] border border-[#E8DED1] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-3 flex gap-3"
                      data-testid={`menu-item-${item.id}`}
                    >
                      {item.imageUrl && (
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#FAF7F1] flex-shrink-0">
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
                          <p className="font-bold text-sm text-[#151515] leading-tight">{item.name}</p>
                          <span className="text-base font-black text-[#F59E0B] tabular-nums whitespace-nowrap">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-[#6B6357] leading-snug mt-1 line-clamp-3">
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
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#FFF7EA] text-[11px]"
                            >
                              {a.emoji}
                            </span>
                          ))}
                        </div>
                        {item.pairingBeer && (
                          <div className="mt-2 inline-flex items-center gap-1.5 self-start px-2 py-1 rounded-full bg-[#FFF7EA] border border-[#F59E0B]/20 max-w-full">
                            {item.pairingBeer.logoUrl && (
                              <div className="w-4 h-4 rounded-full overflow-hidden bg-white flex-shrink-0">
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
                            <span className="text-[10px] font-semibold text-[#C77800] truncate">
                              In abbinamento {item.pairingBeer.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Allergeni info box */}
      <div className="bg-[#FFF7EA] rounded-[20px] border border-[#F59E0B]/30 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-[#151515]">Hai allergie?</p>
            <p className="text-xs text-[#6B6357] mt-0.5 leading-relaxed">
              Chiedi al nostro staff per informazioni sugli allergeni dei nostri piatti.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {ALLERGEN_LEGEND.map((a) => (
                <div key={a.label} className="flex items-center gap-1.5 text-[11px] text-[#6B6357]">
                  <span className="text-sm">{a.emoji}</span>
                  <span className="truncate">{a.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
