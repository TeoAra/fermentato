import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  if (!menu || menu.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">🍽️ MENU</h2>
        <p className="text-gray-500">Menu non ancora disponibile</p>
      </div>
    );
  }

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const formatAllergens = (allergens: string[] | null) => {
    if (!allergens || allergens.length === 0) return null;
    
    return allergens.map(allergen => {
      const emoji = allergenEmojis[allergen.toLowerCase()] || "⚠️";
      const label = allergen.charAt(0).toUpperCase() + allergen.slice(1);
      return { emoji, label };
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header principale */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">🍽️ MENU</h1>
        <div className="w-24 h-1 bg-orange-500 mx-auto"></div>
      </div>

      {/* Categorie menu */}
      <div className="space-y-12">
        {menu.map((category) => {
          const isExpanded = expandedCategories.has(category.id);
          const hasItems = category.items && category.items.length > 0;

          return (
            <div key={category.id} className="space-y-6">
              {/* Header categoria */}
              <div className="border-b-2 border-gray-200 pb-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                      {category.name}
                    </h2>
                    {category.description && (
                      <p className="text-gray-600 mt-2 italic">{category.description}</p>
                    )}
                  </div>
                  
                  {hasItems && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {category.items.length} {category.items.length === 1 ? 'piatto' : 'piatti'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-6 h-6 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Items categoria */}
              {hasItems && (isExpanded || category.items.length <= 3) && (
                <div className="grid gap-6">
                  {category.items.map((item) => {
                    const formattedAllergens = formatAllergens(item.allergens);
                    
                    return (
                      <Card key={item.id} className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* Immagine (se disponibile) */}
                          {item.imageUrl && (
                            <div className="flex-shrink-0">
                              <img 
                                src={item.imageUrl} 
                                alt={item.name}
                                className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg border-2 border-gray-200"
                              />
                            </div>
                          )}
                          
                          {/* Contenuto */}
                          <div className="flex-1 space-y-3">
                            {/* Nome e prezzo */}
                            <div className="flex justify-between items-start">
                              <h3 className="text-xl md:text-2xl font-bold text-gray-800">
                                {item.name}
                              </h3>
                              <div className="text-right">
                                <span className="text-xl md:text-2xl font-bold text-orange-600">
                                  €{typeof item.price === 'string' ? parseFloat(item.price).toFixed(2) : item.price}
                                </span>
                                {!item.isAvailable && (
                                  <Badge variant="destructive" className="ml-2">
                                    Non Disponibile
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {/* Descrizione */}
                            {item.description && (
                              <p className="text-gray-700 leading-relaxed">
                                {item.description}
                              </p>
                            )}
                            
                            {/* Allergeni */}
                            {formattedAllergens && formattedAllergens.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                                {formattedAllergens.map(({ emoji, label }, index) => (
                                  <span 
                                    key={index} 
                                    className="inline-flex items-center gap-1 text-sm text-gray-600"
                                    title={label}
                                  >
                                    <span className="text-lg">{emoji}</span>
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
              )}

              {/* Messaggio se categoria vuota */}
              {!hasItems && (
                <div className="text-center py-8 text-gray-500 italic">
                  Categoria in allestimento
                </div>
              )}

              {/* Indicatore "Clicca per vedere di più" */}
              {hasItems && !isExpanded && category.items.length > 3 && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="text-orange-600 hover:text-orange-700 font-medium inline-flex items-center gap-2"
                  >
                    Clicca per vedere la lista completa
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center mt-16 pt-8 border-t border-gray-200">
        <p className="text-gray-500 text-sm">
          Menu aggiornato regolarmente • Informazioni allergeni disponibili su richiesta
        </p>
      </div>
    </div>
  );
}