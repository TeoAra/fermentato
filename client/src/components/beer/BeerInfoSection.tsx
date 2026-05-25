import { Loader2, Trophy } from "lucide-react";
import { RichTextDisplay } from "@/components/rich-text-editor";

interface BeerInfoSectionProps {
  beer: any;
  translatedDesc: string | null;
  translating: boolean;
  descExpanded: boolean;
  onToggleExpand: () => void;
}

/**
 * Sezione "Info" per /beer/:id — lista premi/riconoscimenti.
 * La descrizione è ora renderizzata in overview da <BeerDescriptionBlock />.
 */
export default function BeerInfoSection({
  beer,
}: BeerInfoSectionProps) {
  const awards = (beer as any)?.awards || [];

  return (
    <>
      {awards.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-amber-500 fill-amber-500" />
            <h3 className="text-sm font-bold text-foreground">Premi e Riconoscimenti</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {awards.map((award: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-[#E8DED1] dark:border-white/[0.06]/50 shadow-sm text-sm"
              >
                <Trophy
                  className={`h-3.5 w-3.5 flex-shrink-0 ${
                    award.type === "gold"
                      ? "text-yellow-500"
                      : award.type === "silver"
                        ? "text-muted-foreground"
                        : "text-primary"
                  }`}
                />
                <span className="font-semibold text-foreground">{award.name}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground text-xs">{award.competition}</span>
                <span className="text-muted-foreground text-xs">({award.year})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
