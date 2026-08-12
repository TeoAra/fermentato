import { useState } from "react";
import { MapPin, Building2, Beer as BeerIcon } from "lucide-react";
import { EntityPreviewCard, type EntityType } from "./EntityPreviewCard";

interface EntityChipProps {
  type: EntityType;
  id: number;
  label: string;
}

export function EntityChip({ type, id, label }: EntityChipProps) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const icon =
    type === "pub"     ? <MapPin    className="w-3 h-3 flex-shrink-0" /> :
    type === "brewery" ? <Building2 className="w-3 h-3 flex-shrink-0" /> :
                         <BeerIcon  className="w-3 h-3 flex-shrink-0" />;

  const chipCls =
    type === "beer"
      ? "bg-primary/10 text-primary hover:bg-primary/20"
      : "bg-stone-100 dark:bg-[#12151A] text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#0B0D10]";

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAnchorRect((e.currentTarget as HTMLElement).getBoundingClientRect());
        }}
        className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors cursor-pointer ${chipCls}`}
      >
        {icon}
        <span className="truncate max-w-[140px]">{label}</span>
      </button>
      {anchorRect && (
        <EntityPreviewCard
          type={type}
          id={id}
          anchorRect={anchorRect}
          onClose={() => setAnchorRect(null)}
        />
      )}
    </>
  );
}
