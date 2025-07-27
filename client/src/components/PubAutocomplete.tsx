import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

interface Pub {
  id: number;
  name: string;
  address?: string;
}

interface PubAutocompleteProps {
  value?: number;
  onSelect: (pubId: number | undefined) => void;
  placeholder?: string;
}

export function PubAutocomplete({ value, onSelect, placeholder = "Seleziona un pub..." }: PubAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: pubs = [] } = useQuery<Pub[]>({
    queryKey: ["/api/pubs"],
  });

  const filteredPubs = pubs.filter((pub) =>
    pub.name.toLowerCase().includes(search.toLowerCase()) ||
    (pub.address && pub.address.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedPub = pubs.find((pub) => pub.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedPub ? selectedPub.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Cerca pub..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>Nessun pub trovato.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {filteredPubs.map((pub) => (
              <CommandItem
                key={pub.id}
                value={pub.name}
                onSelect={() => {
                  onSelect(pub.id === value ? undefined : pub.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === pub.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{pub.name}</span>
                  {pub.address && (
                    <span className="text-sm text-muted-foreground">{pub.address}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}