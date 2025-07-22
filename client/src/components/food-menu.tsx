import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, Wheat, Milk, Egg, ChevronDown, ChevronRight } from "lucide-react";

interface FoodMenuProps {
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
    }>;
  }>;
}

const allergenIcons: Record<string, { icon: any; color: string; label: string }> = {
  glutine: { icon: Wheat, color: "bg-yellow-100 text-yellow-800", label: "Glutine" },
  lattosio: { icon: Milk, color: "bg-red-100 text-red-800", label: "Lattosio" },
  uova: { icon: Egg, color: "bg-orange-100 text-orange-800", label: "Uova" },
  default: { icon: AlertTriangle, color: "bg-gray-100 text-gray-800", label: "Allergeni" },
};

export default function FoodMenu({ menu }: FoodMenuProps) {
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set());

  if (!menu || menu.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Menu non disponibile</p>
      </div>
    );
  }

  const getAllergenInfo = (allergen: string) => {
    return allergenIcons[allergen.toLowerCase()] || allergenIcons.default;
  };

  const toggleCategory = (categoryId: number) => {
    const newOpenCategories = new Set(openCategories);
    if (newOpenCategories.has(categoryId)) {
      newOpenCategories.delete(categoryId);
    } else {
      newOpenCategories.add(categoryId);
    }
    setOpenCategories(newOpenCategories);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xl sm:text-2xl font-bold text-secondary mb-4 sm:mb-6">Menu Cibo</h3>
      
      {menu.map((category) => {
        const isOpen = openCategories.has(category.id);
        return (
          <Collapsible key={category.id} open={isOpen} onOpenChange={() => toggleCategory(category.id)}>
            <CollapsibleTrigger className="w-full">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <div className="p-3 sm:p-4 flex items-center justify-between">
                  <div className="text-left flex-1">
                    <h4 className="text-lg sm:text-xl font-semibold text-secondary">
                      {category.name}
                    </h4>
                    {category.description && (
                      <p className="text-gray-600 text-sm mt-1">{category.description}</p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {category.items.length} {category.items.length === 1 ? 'piatto' : 'piatti'}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {isOpen ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </Card>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="mt-2 space-y-3">
                {category.items.map((item) => (
                  <Card key={item.id} className="p-3 sm:p-4 ml-2 sm:ml-4 border-l-4 border-l-primary/20">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                          <h5 className="font-semibold text-base sm:text-lg">{item.name}</h5>
                          {!item.isAvailable && (
                            <Badge variant="destructive" className="text-xs w-fit">Non Disponibile</Badge>
                          )}
                        </div>
                        
                        {item.description && (
                          <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                        )}
                        
                        {item.allergens && item.allergens.length > 0 && (
                          <div className="flex flex-wrap gap-1 sm:gap-2 mb-2">
                            {item.allergens.map((allergen) => {
                              const allergenInfo = getAllergenInfo(allergen);
                              const Icon = allergenInfo.icon;
                              
                              return (
                                <Badge 
                                  key={allergen} 
                                  variant="outline"
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${allergenInfo.color}`}
                                >
                                  <Icon className="w-3 h-3 mr-1" />
                                  {allergenInfo.label}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-shrink-0 text-right">
                        <span className="text-lg sm:text-xl font-bold text-primary">
                          €{item.price}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}