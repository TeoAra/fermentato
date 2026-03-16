import { useState } from "react";
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
  glutine: { icon: Wheat, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", label: "Glutine" },
  lattosio: { icon: Milk, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", label: "Lattosio" },
  uova: { icon: Egg, color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", label: "Uova" },
  default: { icon: AlertTriangle, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", label: "Allergeni" },
};

export default function FoodMenu({ menu }: FoodMenuProps) {
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set());

  if (!menu || menu.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">Menu non disponibile</p>
      </div>
    );
  }

  const getAllergenInfo = (allergen: string) =>
    allergenIcons[allergen.toLowerCase()] || allergenIcons.default;

  const toggleCategory = (categoryId: number) => {
    const next = new Set(openCategories);
    next.has(categoryId) ? next.delete(categoryId) : next.add(categoryId);
    setOpenCategories(next);
  };

  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
        Menu Cibo
      </h3>

      {menu.map((category) => {
        const isOpen = openCategories.has(category.id);
        return (
          <Collapsible key={category.id} open={isOpen} onOpenChange={() => toggleCategory(category.id)}>
            {/* Category header */}
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                <div className="text-left">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {category.name}
                  </span>
                  {category.description && (
                    <span className="text-xs text-gray-500 ml-2">{category.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <span className="text-xs text-gray-400">
                    {category.items.length} {category.items.length === 1 ? "piatto" : "piatti"}
                  </span>
                  {isOpen
                    ? <ChevronDown className="w-4 h-4 text-gray-400" />
                    : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </div>
              </div>
            </CollapsibleTrigger>

            {/* Items */}
            <CollapsibleContent>
              <div className="mt-1 space-y-1 ml-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start justify-between gap-2 px-2 py-1.5 rounded-md ${
                      item.isAvailable
                        ? "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        : "opacity-50"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">
                          {item.name}
                        </span>
                        {!item.isAvailable && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                            N/D
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                          {item.description}
                        </p>
                      )}
                      {item.allergens && item.allergens.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.allergens.map((allergen) => {
                            const info = getAllergenInfo(allergen);
                            const Icon = info.icon;
                            return (
                              <span
                                key={allergen}
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${info.color}`}
                              >
                                <Icon className="w-2.5 h-2.5" />
                                {info.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
                      €{item.price}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
