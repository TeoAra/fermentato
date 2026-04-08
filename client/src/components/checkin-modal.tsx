import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Beer, MapPin, Star, CheckCircle2 } from "lucide-react";

interface CheckinModalProps {
  open: boolean;
  onClose: () => void;
  beer: {
    id: number;
    name: string;
    style?: string | null;
    breweryName?: string | null;
  };
  pub?: {
    id: number;
    name: string;
  } | null;
}

export default function CheckinModal({ open, onClose, beer, pub }: CheckinModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkinMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/user/beer-tastings", {
        method: "POST",
        body: JSON.stringify({
          beerId: beer.id,
          rating: rating > 0 ? rating : null,
          personalNotes: note.trim() || null,
          pubId: pub?.id ?? null,
        }),
      }),
    onSuccess: () => {
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ["/api/user/beer-tastings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/feed"] });
      setTimeout(() => {
        setDone(false);
        setRating(0);
        setNote("");
        onClose();
      }, 1600);
    },
    onError: () => {
      toast({ title: "Errore check-in", description: "Riprova tra poco", variant: "destructive" });
    },
  });

  const handleClose = () => {
    if (checkinMutation.isPending) return;
    setDone(false);
    setRating(0);
    setNote("");
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-10 px-5 pt-5">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="font-poppins text-lg flex items-center gap-2">
            <Beer className="w-5 h-5 text-primary flex-shrink-0" />
            Sto bevendo questa
          </SheetTitle>
        </SheetHeader>

        {done ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle2 className="w-14 h-14 text-primary" />
            <p className="font-semibold text-stone-800 dark:text-stone-100 text-base">Check-in registrato!</p>
            <p className="text-sm text-stone-400">I tuoi follower lo vedranno nel feed</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Beer info */}
            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl px-4 py-3">
              <p className="font-semibold text-stone-900 dark:text-stone-50 text-base leading-snug">{beer.name}</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {[beer.breweryName, beer.style].filter(Boolean).join(" · ")}
              </p>
              {pub && (
                <p className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {pub.name}
                </p>
              )}
            </div>

            {/* Star rating */}
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">
                Voto (opzionale)
              </p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(s === rating ? 0 : s)}
                    className="focus:outline-none"
                    aria-label={`${s} stelle`}
                  >
                    <Star
                      className="w-9 h-9 transition-colors"
                      fill={(hovered || rating) >= s ? "#f77104" : "none"}
                      stroke={(hovered || rating) >= s ? "#f77104" : "#d4ccc5"}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">
                Note (opzionale)
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 140))}
                placeholder="Cosa ne pensi?"
                rows={2}
                className="resize-none rounded-xl text-sm"
              />
              <p className="text-right text-xs text-stone-300 mt-1">{note.length}/140</p>
            </div>

            {/* CTA */}
            <Button
              className="w-full rounded-2xl h-12 text-base font-semibold"
              onClick={() => checkinMutation.mutate()}
              disabled={checkinMutation.isPending}
            >
              {checkinMutation.isPending ? "Registro…" : "🍺 Check-in!"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
