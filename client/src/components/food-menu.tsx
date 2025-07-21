import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Wheat, Milk, Egg } from "lucide-react";

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

  return (
    <div>
      <h3 className="text-2xl font-bold text-secondary mb-6">Menu Cibo</h3>
      
      {menu.map((category) => (
        <div key={category.id} className="mb-8">
          <h4 className="text-xl font-semibold text-secondary mb-4 border-b border-gray-200 pb-2">
            {category.name}
          </h4>
          {category.description && (
            <p className="text-gray-600 mb-4">{category.description}</p>
          )}
          
          <div className="space-y-4">
            {category.items.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h5 className="font-semibold text-lg">{item.name}</h5>
                      {!item.isAvailable && (
                        <Badge variant="destructive">Non Disponibile</Badge>
                      )}
                    </div>
                    
                    {item.description && (
                      <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                    )}
                    
                    {item.allergens && item.allergens.length > 0 && (
                      <div className="flex flex-wrap gap-2">
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
                  
                  <span className="font-bold text-primary text-lg ml-4">
                    €{item.price}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
