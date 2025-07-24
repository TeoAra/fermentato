import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Package, Beer } from "lucide-react";

interface PriceItem {
  size: string;
  price: string;
  format?: string;
}

interface PriceFormatManagerProps {
  type: 'tap' | 'bottles';
  initialPrices?: PriceItem[];
  onSave: (prices: PriceItem[]) => void;
  onCancel: () => void;
  beerName?: string;
}

const TAP_SIZES = [
  { value: '20cl', label: '20cl (Piccola)' },
  { value: '30cl', label: '30cl (Media)' },
  { value: '40cl', label: '40cl (Media)' },
  { value: '50cl', label: '50cl (Grande)' },
  { value: '60cl', label: '60cl (Maxi)' },
];

const BOTTLE_FORMATS = [
  { value: 'bottiglia', label: 'Bottiglia', icon: '🍺' },
  { value: 'lattina', label: 'Lattina', icon: '🥤' },
  { value: 'botticella', label: 'Botticella', icon: '🛢️' },
];

const BOTTLE_SIZES = [
  { value: '25cl', label: '25cl' },
  { value: '33cl', label: '33cl' },
  { value: '35cl', label: '35cl' },
  { value: '50cl', label: '50cl' },
  { value: '66cl', label: '66cl' },
  { value: '75cl', label: '75cl' },
  { value: '1L', label: '1 Litro' },
  { value: '1.5L', label: '1.5 Litri' },
];

export function PriceFormatManager({ 
  type, 
  initialPrices = [], 
  onSave, 
  onCancel, 
  beerName 
}: PriceFormatManagerProps) {
  const [prices, setPrices] = useState<PriceItem[]>(
    initialPrices.length > 0 ? initialPrices : 
    type === 'tap' ? [
      { size: '20cl', price: '4.50' },
      { size: '40cl', price: '7.50' }
    ] : [
      { size: '33cl', price: '5.50', format: 'bottiglia' },
      { size: '50cl', price: '7.50', format: 'bottiglia' }
    ]
  );

  const addPriceRow = () => {
    const newRow: PriceItem = type === 'tap' 
      ? { size: '30cl', price: '6.00' }
      : { size: '33cl', price: '5.50', format: 'bottiglia' };
    setPrices([...prices, newRow]);
  };

  const updatePrice = (index: number, field: keyof PriceItem, value: string) => {
    const newPrices = [...prices];
    newPrices[index] = { ...newPrices[index], [field]: value };
    setPrices(newPrices);
  };

  const removePrice = (index: number) => {
    setPrices(prices.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const validPrices = prices.filter(p => p.size && p.price && parseFloat(p.price) > 0);
    onSave(validPrices);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {type === 'tap' ? <Beer className="w-5 h-5" /> : <Package className="w-5 h-5" />}
          <div>
            <span>
              {type === 'tap' ? 'Configura Prezzi Spina' : 'Configura Prezzi Cantina'}
            </span>
            {beerName && (
              <p className="text-sm text-gray-600 font-normal">{beerName}</p>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {prices.map((priceItem, index) => (
            <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Misura</Label>
                  <Select
                    value={priceItem.size}
                    onValueChange={(value) => updatePrice(index, 'size', value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(type === 'tap' ? TAP_SIZES : BOTTLE_SIZES).map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {type === 'bottles' && (
                  <div>
                    <Label className="text-xs">Formato</Label>
                    <Select
                      value={priceItem.format || 'bottiglia'}
                      onValueChange={(value) => updatePrice(index, 'format', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BOTTLE_FORMATS.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            <span className="flex items-center space-x-1">
                              <span>{format.icon}</span>
                              <span>{format.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Prezzo (€)</Label>
                  <Input
                    type="number"
                    step="0.50"
                    min="0"
                    placeholder="0.00"
                    value={priceItem.price}
                    onChange={(e) => updatePrice(index, 'price', e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => removePrice(index)}
                disabled={prices.length <= 1}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={addPriceRow}
          className="w-full"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi {type === 'tap' ? 'Misura' : 'Formato'}
        </Button>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Anteprima prezzi:</Label>
          <div className="flex flex-wrap gap-2">
            {prices
              .filter(p => p.size && p.price && parseFloat(p.price) > 0)
              .map((priceItem, index) => (
                <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                  <span>{priceItem.size}</span>
                  {priceItem.format && (
                    <span className="text-xs">
                      ({BOTTLE_FORMATS.find(f => f.value === priceItem.format)?.icon})
                    </span>
                  )}
                  <span>€{parseFloat(priceItem.price).toFixed(2)}</span>
                </Badge>
              ))}
          </div>
        </div>

        <div className="flex space-x-2 pt-4">
          <Button onClick={handleSave} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            Salva Prezzi
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Annulla
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}