import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Check, Plus, X } from "lucide-react";

interface Allergen {
  id: number;
  name: string;
  emoji: string;
  orderIndex: number;
}

interface AllergenSelectorProps {
  selectedAllergens: string[];
  onAllergensChange: (allergens: string[]) => void;
  className?: string;
}

export function AllergenSelector({ selectedAllergens, onAllergensChange, className }: AllergenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: allergens = [], isLoading, error } = useQuery({
    queryKey: ['/api/allergens'],
    queryFn: () => fetch('/api/allergens').then(res => {
      if (!res.ok) throw new Error('Failed to fetch allergens');
      return res.json();
    }),
  });

  const handleAllergenToggle = (allergenId: string) => {
    const isSelected = selectedAllergens.includes(allergenId);
    if (isSelected) {
      onAllergensChange(selectedAllergens.filter(id => id !== allergenId));
    } else {
      onAllergensChange([...selectedAllergens, allergenId]);
    }
  };

  const selectedAllergenNames = allergens
    .filter((allergen: Allergen) => selectedAllergens.includes(allergen.id.toString()))
    .map((allergen: Allergen) => `${allergen.emoji} ${allergen.name}`)
    .join(", ");

  if (isLoading) {
    return <div className={className}>Caricamento allergeni...</div>;
  }

  if (error) {
    return (
      <div className={className}>
        <Label>Allergeni</Label>
        <div className="text-red-500 text-sm p-2 border border-red-200 rounded">
          ⚠️ Errore nel caricamento degli allergeni. Riprova più tardi.
        </div>
      </div>
    );
  }

  if (allergens.length === 0) {
    return (
      <div className={className}>
        <Label>Allergeni</Label>
        <div className="text-gray-500 text-sm p-2 border border-gray-200 rounded">
          Nessun allergene disponibile.
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Label>Allergeni</Label>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left" data-testid="button-select-allergens">
            <Plus className="w-4 h-4 mr-2" />
            {selectedAllergens.length > 0 ? selectedAllergenNames : "Seleziona allergeni..."}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[600px]">
          <DialogHeader>
            <DialogTitle>Seleziona Allergeni</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
            {allergens.map((allergen: Allergen) => {
              const isSelected = selectedAllergens.includes(allergen.id.toString());
              return (
                <Button
                  key={allergen.id}
                  variant={isSelected ? "default" : "outline"}
                  className="h-auto p-3 flex flex-col items-center justify-center"
                  onClick={() => handleAllergenToggle(allergen.id.toString())}
                  data-testid={`button-allergen-${allergen.id}`}
                >
                  <div className="text-2xl mb-1">{allergen.emoji}</div>
                  <div className="text-xs text-center leading-tight">{allergen.name}</div>
                  {isSelected && <Check className="w-3 h-3 mt-1" />}
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
      
      {selectedAllergens.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1">
            {allergens
              .filter((allergen: Allergen) => selectedAllergens.includes(allergen.id.toString()))
              .map((allergen: Allergen) => (
                <Badge
                  key={allergen.id}
                  variant="secondary"
                  className="text-xs"
                  data-testid={`selected-allergen-${allergen.id}`}
                >
                  {allergen.emoji} {allergen.name}
                  <X 
                    className="w-3 h-3 cursor-pointer ml-1" 
                    onClick={() => handleAllergenToggle(allergen.id.toString())}
                  />
                </Badge>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface AllergenDisplayProps {
  allergens: string[];
  className?: string;
}

export function AllergenDisplay({ allergens, className }: AllergenDisplayProps) {
  const { data: allAllergens = [] } = useQuery({
    queryKey: ['/api/allergens'],
    queryFn: () => fetch('/api/allergens').then(res => res.json()),
  });

  const selectedAllergenData = allAllergens.filter((allergen: Allergen) => 
    allergens.includes(allergen.id.toString())
  );

  if (selectedAllergenData.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`} data-testid="allergen-display">
      {selectedAllergenData.map((allergen: Allergen) => (
        <Badge 
          key={allergen.id} 
          variant="secondary" 
          className="text-xs"
          data-testid={`allergen-badge-${allergen.id}`}
        >
          {allergen.emoji} {allergen.name}
        </Badge>
      ))}
    </div>
  );
}