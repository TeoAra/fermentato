import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PriceEntry {
  size: string;
  price: string;
}

interface FlexiblePriceManagerProps {
  initialPrices?: PriceEntry[];
  onSave: (prices: PriceEntry[]) => void;
  onCancel: () => void;
  title: string;
  sizeLabel?: string;
  sizePlaceholder?: string;
}

export default function FlexiblePriceManager({
  initialPrices = [{ size: '', price: '' }],
  onSave,
  onCancel,
  title,
  sizeLabel = "Misura",
  sizePlaceholder = "Es. Piccola, 33cl, etc."
}: FlexiblePriceManagerProps) {
  const [prices, setPrices] = useState<PriceEntry[]>(initialPrices);

  const addPriceEntry = () => {
    setPrices([...prices, { size: '', price: '' }]);
  };

  const removePriceEntry = (index: number) => {
    if (prices.length > 1) {
      setPrices(prices.filter((_, i) => i !== index));
    }
  };

  const updatePriceEntry = (index: number, field: 'size' | 'price', value: string) => {
    const updated = prices.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    );
    setPrices(updated);
  };

  const handleSave = () => {
    const validPrices = prices.filter(p => p.size && p.price && !isNaN(parseFloat(p.price)));
    onSave(validPrices);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {prices.map((entry, index) => (
          <div key={index} className="flex items-end space-x-3">
            <div className="flex-1">
              <Label>{sizeLabel}</Label>
              <Input
                placeholder={sizePlaceholder}
                value={entry.size}
                onChange={(e) => updatePriceEntry(index, 'size', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label>Prezzo (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={entry.price}
                onChange={(e) => updatePriceEntry(index, 'price', e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => removePriceEntry(index)}
              disabled={prices.length === 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={addPriceEntry}>
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi Prezzo
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onCancel}>
              Annulla
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Salva Prezzi
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}