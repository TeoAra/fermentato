import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface StyleMultiSelectProps {
  value: string[];
  onValueChange: (styles: string[]) => void;
  maxSelections?: number;
}

export function StyleMultiSelect({ value, onValueChange, maxSelections = 5 }: StyleMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: beerStyles = [] } = useQuery<{ style: string }[]>({
    queryKey: ["/api/beers/styles"],
  });

  const filteredStyles = beerStyles.filter((styleObj) =>
    styleObj.style.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (style: string) => {
    if (value.includes(style)) {
      onValueChange(value.filter(s => s !== style));
    } else if (value.length < maxSelections) {
      onValueChange([...value, style]);
    }
  };

  const removeStyle = (styleToRemove: string) => {
    onValueChange(value.filter(s => s !== styleToRemove));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value.length > 0 ? `${value.length} stili selezionati` : "Cerca e seleziona stili..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput
              placeholder="Cerca stili birra..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandEmpty>Nessuno stile trovato.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {filteredStyles.map((styleObj) => (
                <CommandItem
                  key={styleObj.style}
                  value={styleObj.style}
                  onSelect={() => handleSelect(styleObj.style)}
                  disabled={!value.includes(styleObj.style) && value.length >= maxSelections}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(styleObj.style) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>{styleObj.style}</span>
                  {!value.includes(styleObj.style) && value.length >= maxSelections && (
                    <span className="ml-auto text-xs text-muted-foreground">Max raggiunto</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Styles */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((style) => (
            <Badge
              key={style}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {style}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => removeStyle(style)}
              />
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {value.length}/{maxSelections} stili selezionati
      </p>
    </div>
  );
}