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
    <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/40 px-3 py-2 flex gap-2 items-start">
      <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
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
      <div className="text-center py-8">
        <ChefHat className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Menu in preparazione</p>
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
    <div className="space-y-2">
      {menuInfoBox && <InfoBoxCard text={menuInfoBox} />}

      <Accordion type="multiple" className="space-y-1.5">
        {menu.map((category) => {
          const regularItems = category.items?.filter(item => !item.isInfoBox) || [];
          const infoBoxItems = category.items?.filter(item => item.isInfoBox) || [];

          return (
            <AccordionItem
              key={category.id}
              value={`category-${category.id}`}
              className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              data-testid={`menu-category-${category.id}`}
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-amber-50 dark:hover:bg-gray-800/60 transition-colors">
                <div className="text-left flex-1">
                  <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                    {category.name}
                  </span>
                  {category.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic font-normal mt-0.5">
                      {category.description}
                    </p>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-3 pb-3">
                <div className="space-y-1.5 pt-1.5">
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
                          className={`flex gap-3 px-2 py-2 rounded-lg border-l-2 border-l-amber-400 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!item.isAvailable ? 'opacity-50' : ''}`}
                          data-testid={`menu-item-${item.id}`}
                        >
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
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
                              <span className="text-sm font-bold text-amber-600 dark:text-amber-400 flex-shrink-0">
                                €{typeof item.price === 'string' ? parseFloat(item.price).toFixed(2) : item.price}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                                {item.description}
                              </p>
                            )}
                            {formattedAllergens && formattedAllergens.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                  Allergeni:
                                </span>
                                {formattedAllergens.map(({ emoji, label }, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 rounded text-[10px] font-medium border border-amber-200 dark:border-amber-800"
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
                    <p className="text-xs text-gray-400 italic text-center py-3">Categoria in allestimento</p>
                  ) : null}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center pt-2">
        Informazioni dettagliate sugli allergeni disponibili su richiesta
      </p>
    </div>
  );
}
