import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChefHat, Clock } from "lucide-react";

interface LuppolinoMenuProps {
  menu: Array<{
    id: number;
    name: string;
    description: string | null;
    items: Array<{
      id: number;
      name: string;
      description: string | null;
      price: string;
      allergens: string[] | null;
      isAvailable: boolean;
      imageUrl?: string | null;
    }>;
  }>;
}

// Mapping allergeni con emoji come nel sito originale
const allergenEmojis: Record<string, string> = {
  glutine: "🥖",
  latte: "🥛", 
  lattosio: "🥛",
  uova: "🍳",
  soia: "🌱",
  sedano: "🥬",
  senape: "🌿",
  "frutta a guscio": "🌰",
  sesamo: "🌸",
  solfiti: "🍷",
  pesce: "🐟",
  crostacei: "🦐",
  molluschi: "🦪",
  arachidi: "🥜",
  lupini: "🫘"
};

export default function LuppolinoMenu({ menu }: LuppolinoMenuProps) {
  if (!menu || menu.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto flex items-center justify-center mb-6">
          <ChefHat className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Menu in Preparazione</h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
          Il nostro team sta preparando un menu delizioso per te. Torna presto per scoprire le nostre specialità!
        </p>
      </div>
    );
  }

  const formatAllergens = (allergens: string[] | null) => {
    if (!allergens || allergens.length === 0) return null;
    
    return allergens.map(allergen => {
      const emoji = allergenEmojis[allergen.toLowerCase()] || "⚠️";
      const label = allergen.charAt(0).toUpperCase() + allergen.slice(1);
      return { emoji, label };
    });
  };

  return (
    <div className="space-y-6">
      <Accordion type="multiple" className="space-y-4">
        {menu.map((category) => {
          const hasItems = category.items && category.items.length > 0;

          return (
            <AccordionItem 
              key={category.id} 
              value={`category-${category.id}`}
              className="glass-card rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              data-testid={`menu-category-${category.id}`}
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center justify-between w-full">
                  <div className="text-left">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic font-normal">
                        {category.description}
                      </p>
                    )}
                  </div>
                  
                  {hasItems && (
                    <div className="flex items-center space-x-3 mr-6">
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800">
                        {category.items.length} {category.items.length === 1 ? 'piatto' : 'piatti'}
                      </Badge>
                    </div>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-6 pb-6">
                {hasItems ? (
                  <div className="grid gap-4 pt-4">
                    {category.items.map((item) => {
                      const formattedAllergens = formatAllergens(item.allergens);
                      
                      return (
                        <Card 
                          key={item.id} 
                          className="p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 bg-white dark:bg-gray-800"
                          data-testid={`menu-item-${item.id}`}
                        >
                          <div className="flex flex-col md:flex-row gap-4">
                            {/* Immagine (se disponibile) */}
                            {item.imageUrl && (
                              <div className="flex-shrink-0">
                                <img 
                                  src={item.imageUrl} 
                                  alt={item.name}
                                  className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl border-2 border-gray-200 dark:border-gray-700"
                                />
                              </div>
                            )}
                            
                            {/* Contenuto */}
                            <div className="flex-1 space-y-3">
                              {/* Nome e prezzo */}
                              <div className="flex justify-between items-start">
                                <h4 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                                  {item.name}
                                </h4>
                                <div className="text-right">
                                  <span className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">
                                    €{typeof item.price === 'string' ? parseFloat(item.price).toFixed(2) : item.price}
                                  </span>
                                  {!item.isAvailable && (
                                    <Badge variant="destructive" className="ml-2">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Non Disponibile
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              {/* Descrizione */}
                              {item.description && (
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                                  {item.description}
                                </p>
                              )}
                              
                              {/* Allergeni */}
                              {formattedAllergens && formattedAllergens.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-2">
                                    Allergeni:
                                  </span>
                                  {formattedAllergens.map(({ emoji, label }, index) => (
                                    <span 
                                      key={index} 
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 rounded-full text-xs font-medium border border-yellow-200 dark:border-yellow-800"
                                      title={label}
                                    >
                                      <span className="text-sm">{emoji}</span>
                                      <span className="hidden sm:inline">{label}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-400 to-gray-500 mx-auto flex items-center justify-center mb-4">
                      <ChefHat className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      Categoria in allestimento
                    </p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Footer informativo */}
      <div className="text-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Menu aggiornato regolarmente • Informazioni dettagliate sugli allergeni disponibili su richiesta
        </p>
      </div>
    </div>
  );
}