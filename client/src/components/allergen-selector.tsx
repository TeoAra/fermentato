import { useMemo, useState } from "react";
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

interface AllergenGroup extends Allergen {
  equivalentIds: string[];
}

function normalizeAllergenName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("it");
}

function groupAllergens(allergens: Allergen[], selectedIds: string[] = []): AllergenGroup[] {
  const groups = new Map<string, Allergen[]>();

  allergens.forEach((allergen) => {
    const key = normalizeAllergenName(allergen.name);
    groups.set(key, [...(groups.get(key) ?? []), allergen]);
  });

  return Array.from(groups.values()).map((matches) => {
    const sorted = [...matches].sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);
    const representative = sorted.find((item) => selectedIds.includes(item.id.toString())) ?? sorted[0];
    return {
      ...representative,
      equivalentIds: sorted.map((item) => item.id.toString()),
    };
  });
}

interface AllergenSelectorProps {
  selectedAllergens: string[];
  onAllergensChange: (allergens: string[]) => void;
  className?: string;
}

export function AllergenSelector({ selectedAllergens, onAllergensChange, className }: AllergenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: allergens = [], isLoading, error } = useQuery<Allergen[]>({
    queryKey: ['/api/allergens'],
    queryFn: () => fetch('/api/allergens').then(res => {
      if (!res.ok) throw new Error('Failed to fetch allergens');
      return res.json();
    }),
  });

  const uniqueAllergens = useMemo(
    () => groupAllergens(allergens, selectedAllergens),
    [allergens, selectedAllergens],
  );

  const selectedGroups = uniqueAllergens.filter((allergen) =>
    allergen.equivalentIds.some((id) => selectedAllergens.includes(id)),
  );

  const handleAllergenToggle = (allergen: AllergenGroup) => {
    const isSelected = allergen.equivalentIds.some((id) => selectedAllergens.includes(id));
    const withoutEquivalentIds = selectedAllergens.filter((id) => !allergen.equivalentIds.includes(id));
    if (isSelected) {
      onAllergensChange(withoutEquivalentIds);
    } else {
      onAllergensChange([...withoutEquivalentIds, allergen.id.toString()]);
    }
  };

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
          <Button variant="outline" className="w-full min-w-0 justify-start overflow-hidden text-left" data-testid="button-select-allergens">
            <Plus className="mr-2 h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">
              {selectedGroups.length > 0
                ? `${selectedGroups.length} ${selectedGroups.length === 1 ? "allergene selezionato" : "allergeni selezionati"}`
                : "Seleziona allergeni..."}
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[80dvh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Seleziona Allergeni</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 min-h-0">
            {uniqueAllergens.map((allergen) => {
              const isSelected = allergen.equivalentIds.some((id) => selectedAllergens.includes(id));
              return (
                <Button
                  key={allergen.id}
                  variant={isSelected ? "default" : "outline"}
                  className="h-auto p-3 flex flex-col items-center justify-center"
                  onClick={() => handleAllergenToggle(allergen)}
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
            {selectedGroups.map((allergen) => (
                <Badge
                  key={allergen.id}
                  variant="secondary"
                  className="text-xs"
                  data-testid={`selected-allergen-${allergen.id}`}
                >
                  {allergen.emoji} {allergen.name}
                  <X 
                    className="w-3 h-3 cursor-pointer ml-1" 
                    onClick={() => handleAllergenToggle(allergen)}
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

  const selectedAllergenData = groupAllergens(allAllergens as Allergen[], allergens).filter((allergen) =>
    allergen.equivalentIds.some((id) => allergens.includes(id)),
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