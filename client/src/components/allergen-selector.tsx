import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Wheat, 
  Milk, 
  Egg, 
  Fish, 
  Nut, 
  Apple, 
  Beef,
  Leaf,
  Shell,
  Droplets,
  Zap,
  AlertTriangle,
  Plus,
  X
} from "lucide-react";

const ALLERGENS = [
  { id: 'gluten', name: 'Glutine', icon: Wheat, color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'lactose', name: 'Lattosio', icon: Milk, color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'eggs', name: 'Uova', icon: Egg, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { id: 'fish', name: 'Pesce', icon: Fish, color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { id: 'nuts', name: 'Frutta a Guscio', icon: Nut, color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { id: 'soy', name: 'Soia', icon: Leaf, color: 'bg-green-100 text-green-800 border-green-300' },
  { id: 'shellfish', name: 'Crostacei', icon: Shell, color: 'bg-pink-100 text-pink-800 border-pink-300' },
  { id: 'sesame', name: 'Sesamo', icon: Droplets, color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'sulfites', name: 'Solfiti', icon: Zap, color: 'bg-red-100 text-red-800 border-red-300' },
  { id: 'celery', name: 'Sedano', icon: Leaf, color: 'bg-lime-100 text-lime-800 border-lime-300' },
  { id: 'mustard', name: 'Senape', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { id: 'peanuts', name: 'Arachidi', icon: Apple, color: 'bg-brown-100 text-brown-800 border-brown-300' },
];

interface AllergenSelectorProps {
  selectedAllergens: string[];
  onAllergensChange: (allergens: string[]) => void;
  className?: string;
}

export function AllergenSelector({ selectedAllergens, onAllergensChange, className }: AllergenSelectorProps) {
  const toggleAllergen = (allergenId: string) => {
    if (selectedAllergens.includes(allergenId)) {
      onAllergensChange(selectedAllergens.filter(id => id !== allergenId));
    } else {
      onAllergensChange([...selectedAllergens, allergenId]);
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Allergeni</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAllergensChange([])}
              disabled={selectedAllergens.length === 0}
            >
              <X className="w-3 h-3 mr-1" />
              Cancella tutti
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ALLERGENS.map((allergen) => {
              const Icon = allergen.icon;
              const isSelected = selectedAllergens.includes(allergen.id);
              
              return (
                <Button
                  key={allergen.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleAllergen(allergen.id)}
                  className={`flex items-center space-x-1 justify-start h-8 text-xs ${
                    isSelected ? allergen.color : 'hover:' + allergen.color
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="truncate">{allergen.name}</span>
                </Button>
              );
            })}
          </div>

          {selectedAllergens.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-600">Allergeni selezionati:</h5>
              <div className="flex flex-wrap gap-1">
                {selectedAllergens.map((allergenId) => {
                  const allergen = ALLERGENS.find(a => a.id === allergenId);
                  if (!allergen) return null;
                  
                  const Icon = allergen.icon;
                  return (
                    <Badge
                      key={allergenId}
                      variant="secondary"
                      className={`flex items-center space-x-1 ${allergen.color}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{allergen.name}</span>
                      <X 
                        className="w-3 h-3 cursor-pointer ml-1" 
                        onClick={() => toggleAllergen(allergenId)}
                      />
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AllergenDisplay({ allergens }: { allergens: string[] }) {
  if (!allergens || allergens.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {allergens.map((allergenId) => {
        const allergen = ALLERGENS.find(a => a.id === allergenId);
        if (!allergen) return null;
        
        const Icon = allergen.icon;
        return (
          <Badge
            key={allergenId}
            variant="secondary"
            className={`flex items-center space-x-1 text-xs ${allergen.color}`}
          >
            <Icon className="w-3 h-3" />
            <span>{allergen.name}</span>
          </Badge>
        );
      })}
    </div>
  );
}