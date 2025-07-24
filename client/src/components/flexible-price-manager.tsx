import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PriceEntry {
  size: string;
  price: string;
}

interface FlexiblePriceManagerProps {
  type: 'tap' | 'bottles';
  initialPrices?: PriceEntry[];
  onSave: (prices: PriceEntry[]) => void;
  onCancel: () => void;
  beerName?: string;
}

// Suggerimenti predefiniti per spine e bottiglie
const SPINE_SUGGESTIONS = ['Piccola (20cl)', 'Media (40cl)', 'Grande (50cl)', 'Boccale (1L)', 'Taster (10cl)'];
const BOTTLE_SUGGESTIONS = ['33cl', '50cl', '75cl', '1L', '1.5L'];

export default function FlexiblePriceManager({
  type,
  initialPrices = [],
  onSave,
  onCancel,
  beerName = "Birra selezionata"
}: FlexiblePriceManagerProps) {
  const [prices, setPrices] = useState<PriceEntry[]>(
    initialPrices.length > 0 ? initialPrices : [{ size: '', price: '' }]
  );

  const suggestions = type === 'tap' ? SPINE_SUGGESTIONS : BOTTLE_SUGGESTIONS;

  const addPriceEntry = () => {
    setPrices([...prices, { size: '', price: '' }]);
  };

  const removePriceEntry = (index: number) => {
    if (prices.length > 1) {
      setPrices(prices.filter((_, i) => i !== index));
    }
  };

  const updatePriceEntry = (index: number, field: 'size' | 'price', value: string) => {
    const updated = prices.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    setPrices(updated);
  };

  const selectSuggestion = (index: number, size: string) => {
    updatePriceEntry(index, 'size', size);
  };

  const handleSave = () => {
    const validPrices = prices.filter(p => p.size.trim() && p.price.trim());
    if (validPrices.length === 0) {
      alert('Inserisci almeno una taglia con prezzo');
      return;
    }
    onSave(validPrices);
  };

  const isValid = prices.some(p => p.size.trim() && p.price.trim());

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">
              ⚙️ Configura Prezzi {type === 'tap' ? 'Spine' : 'Bottiglie'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{beerName}</p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {type === 'tap' ? 'Alla Spina' : 'In Bottiglia'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Suggerimenti rapidi */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            🎯 Suggerimenti rapidi
          </Label>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((size) => (
              <Button
                key={size}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const emptyIndex = prices.findIndex(p => !p.size.trim());
                  if (emptyIndex !== -1) {
                    selectSuggestion(emptyIndex, size);
                  } else {
                    setPrices([...prices, { size, price: '' }]);
                  }
                }}
              >
                {size}
              </Button>
            ))}
          </div>
        </div>

        {/* Campi prezzi dinamici */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-gray-700">
            💰 Taglie e Prezzi
          </Label>
          
          {prices.map((priceEntry, index) => (
            <div key={index} className="flex items-center space-x-3 p-4 border rounded-lg bg-gray-50">
              <div className="flex-shrink-0">
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Taglia</Label>
                  <Input
                    placeholder={type === 'tap' ? 'es. Media (40cl)' : 'es. 33cl'}
                    value={priceEntry.size}
                    onChange={(e) => updatePriceEntry(index, 'size', e.target.value)}
                    className="text-sm"
                  />
                </div>
                
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block">Prezzo (€)</Label>
                  <Input
                    type="number"
                    step="0.10"
                    min="0"
                    placeholder="5.50"
                    value={priceEntry.price}
                    onChange={(e) => updatePriceEntry(index, 'price', e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removePriceEntry(index)}
                disabled={prices.length === 1}
                className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Bottone aggiungi taglia */}
        <Button
          variant="outline"
          onClick={addPriceEntry}
          className="w-full border-dashed border-2 border-primary/30 text-primary hover:bg-primary/10"
        >
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi Altra Taglia
        </Button>

        {/* Anteprima */}
        {isValid && (
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <h4 className="font-medium text-blue-900 mb-2">📋 Anteprima Prezzi</h4>
            <div className="space-y-1">
              {prices
                .filter(p => p.size.trim() && p.price.trim())
                .map((p, i) => (
                  <div key={i} className="flex justify-between text-sm text-blue-800">
                    <span>{p.size}</span>
                    <span className="font-medium">€{parseFloat(p.price).toFixed(2)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Bottoni azione */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onCancel}
            className="px-6"
          >
            ❌ Annulla
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!isValid}
            className="bg-primary hover:bg-primary/90 text-white px-6"
          >
            ✅ Salva Prezzi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}