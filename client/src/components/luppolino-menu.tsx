import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChefHat, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface LuppolinoMenuProps {
  menu: Array<{
    id: number;
    name: string;
    description: string | null;
    infoBox?: string | null;
    items: Array<{
      id: number;
      name: string;
      description: string | null;
      price: string;
      allergens: string[] | null;
      isAvailable: boolean;
      isInfoBox?: boolean;
      isVegetarian?: boolean;
      isSpicy?: boolean;
      imageUrl?: string | null;
    }>;
  }>;
  menuInfoBox?: string | null;
}

function InfoBoxCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-amber-100 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex gap-2.5 items-start">
      <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-line">
        {text}
      </p>
    </div>
  );
}

export default function LuppolinoMenu({ menu, menuInfoBox }: LuppolinoMenuProps) {
  const { data: allergens = [] } = useQuery({
    queryKey: ['/api/allergens'],
  });

  if (!menu || menu.length === 0) {
    return (
      <div className="text-center py-12 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-700/30">
        <div className="w-14 h-14 bg-stone-50 dark:bg-stone-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <ChefHat className="w-7 h-7 text-primary/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Menu in preparazione</p>
      </div>
    );
  }

  const formatAllergens = (allergenIds: string[] | null) => {
    if (!allergenIds || allergenIds.length === 0 || !Array.isArray(allergens)) return null;
    const allergenMap = allergens.reduce((acc: any, allergen: any) => {
      acc[allergen.id.toString()] = allergen;
      return acc;
    }, {});
    return allergenIds
      .map(id => allergenMap[id])
      .filter(Boolean)
      .map((allergen: any) => ({ emoji: allergen.emoji || "⚠️", label: allergen.name }));
  };

  return (
    <div className="space-y-2.5">
      {menuInfoBox && <InfoBoxCard text={menuInfoBox} />}

      <Accordion type="multiple" className="space-y-2.5">
        {menu.map((category) => {
          const regularItems = category.items?.filter(item => !item.isInfoBox) || [];
          const infoBoxItems = category.items?.filter(item => item.isInfoBox) || [];

          return (
            <AccordionItem
              key={category.id}
              value={`category-${category.id}`}
              className="rounded-2xl border border-stone-100 dark:border-[hsl(25,12%,16%)] bg-white dark:bg-[hsl(25,14%,10%)] shadow-[0_4px_20px_rgba(247,113,4,0.05)] overflow-hidden"
              data-testid={`menu-category-${category.id}`}
            >
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-background dark:hover:bg-stone-900/10 transition-colors [&>svg]:text-primary [&>svg]:h-4 [&>svg]:w-4">
                <div className="text-left flex-1">
                  <span className="text-base font-bold text-foreground">
                    {category.name}
                  </span>
                  {category.description && (
                    <p className="text-xs text-muted-foreground font-normal mt-0.5 leading-snug">
                      {category.description}
                    </p>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 pt-1">
                  {category.infoBox && <InfoBoxCard text={category.infoBox} />}
                  {infoBoxItems.map((item) => (
                    <InfoBoxCard key={item.id} text={item.description || item.name} />
                  ))}

                  {regularItems.length > 0 ? (
                    regularItems.map((item) => {
                      const formattedAllergens = formatAllergens(item.allergens);
                      return (
                        <div
                          key={item.id}
                          className={`flex gap-3 p-3 rounded-2xl border border-stone-100 dark:border-[hsl(25,12%,18%)] bg-background/60 dark:bg-[hsl(25,14%,12%)] hover:bg-background dark:hover:bg-stone-900/10 transition-colors ${!item.isAvailable ? 'opacity-50' : ''}`}
                          data-testid={`menu-item-${item.id}`}
                        >
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-14 h-14 object-cover rounded-xl flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-bold text-foreground leading-tight">
                                  {item.name}
                                </span>
                                {item.isVegetarian && (
                                  <span className="ml-1.5 text-sm" title="Vegetariano">🌿</span>
                                )}
                                {item.isSpicy && (
                                  <span className="ml-0.5 text-sm" title="Piccante">🌶️</span>
                                )}
                                {!item.isAvailable && (
                                  <Badge variant="destructive" className="ml-1.5 text-[10px] px-1 py-0 h-4">
                                    N/D
                                  </Badge>
                                )}
                              </div>
                              <span className="text-sm font-black text-primary flex-shrink-0">
                                €{typeof item.price === 'string' ? parseFloat(item.price).toFixed(2) : Number(item.price).toFixed(2)}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                                {item.description}
                              </p>
                            )}
                            {formattedAllergens && formattedAllergens.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                  Allergeni:
                                </span>
                                {formattedAllergens.map(({ emoji, label }, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-full text-[10px] font-semibold border border-amber-100 dark:border-amber-800/40"
                                  >
                                    <span>{emoji}</span>
                                    <span>{label}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : infoBoxItems.length === 0 && !category.infoBox ? (
                    <p className="text-xs text-muted-foreground italic text-center py-4">Categoria in allestimento</p>
                  ) : null}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <p className="text-[10px] text-muted-foreground text-center pt-2 pb-4">
        Informazioni dettagliate sugli allergeni disponibili su richiesta
      </p>
    </div>
  );
}
