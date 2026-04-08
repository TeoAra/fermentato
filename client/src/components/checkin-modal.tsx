import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Beer, MapPin, Star, CheckCircle2, Search, X, ChevronRight } from "lucide-react";

interface PubResult {
  id: number;
  name: string;
  city?: string | null;
  address?: string | null;
}

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
    city?: string | null;
  } | null;
}

export default function CheckinModal({ open, onClose, beer, pub: initialPub }: CheckinModalProps) {
  const [rating, setRating]       = useState<number>(0);
  const [hovered, setHovered]     = useState<number>(0);
  const [note, setNote]           = useState("");
  const [done, setDone]           = useState(false);

  // Pub state
  const [selectedPub, setSelectedPub]       = useState<PubResult | null>(initialPub ?? null);
  const [pubSearchOpen, setPubSearchOpen]   = useState(false);
  const [pubQuery, setPubQuery]             = useState("");
  const [pubResults, setPubResults]         = useState<PubResult[]>([]);
  const [pubSearching, setPubSearching]     = useState(false);
  const debounceRef                         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef                      = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sync pre-filled pub when modal opens
  useEffect(() => {
    if (open) {
      setSelectedPub(initialPub ?? null);
      setPubSearchOpen(false);
      setPubQuery("");
      setPubResults([]);
    }
  }, [open, initialPub]);

  // Focus search input when opened
  useEffect(() => {
    if (pubSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 80);
    }
  }, [pubSearchOpen]);

  // Debounced pub search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!pubQuery.trim()) { setPubResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setPubSearching(true);
      try {
        const res = await fetch(`/api/pubs/search?q=${encodeURIComponent(pubQuery)}`);
        if (res.ok) setPubResults(await res.json());
      } finally {
        setPubSearching(false);
      }
    }, 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [pubQuery]);

  const checkinMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/user/beer-tastings", {
        method: "POST",
        body: JSON.stringify({
          beerId: beer.id,
          rating: rating > 0 ? rating : null,
          personalNotes: note.trim() || null,
          pubId: selectedPub?.id ?? null,
        }),
      }),
    onSuccess: () => {
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ["/api/user/beer-tastings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/feed"] });
      setTimeout(() => {
        setDone(false); setRating(0); setNote("");
        onClose();
      }, 1600);
    },
    onError: () => {
      toast({ title: "Errore check-in", description: "Riprova tra poco", variant: "destructive" });
    },
  });

  const handleClose = () => {
    if (checkinMutation.isPending) return;
    setDone(false); setRating(0); setNote("");
    setPubSearchOpen(false); setPubQuery(""); setPubResults([]);
    onClose();
  };

  const selectPub = (p: PubResult) => {
    setSelectedPub(p);
    setPubSearchOpen(false);
    setPubQuery("");
    setPubResults([]);
  };

  const removePub = () => {
    setSelectedPub(null);
    setPubSearchOpen(false);
    setPubQuery("");
    setPubResults([]);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-10 px-5 pt-5 max-h-[92dvh] overflow-y-auto">
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
          <div className="space-y-4">

            {/* Beer info */}
            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl px-4 py-3">
              <p className="font-semibold text-stone-900 dark:text-stone-50 text-base leading-snug">{beer.name}</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {[beer.breweryName, beer.style].filter(Boolean).join(" · ")}
              </p>
            </div>

            {/* ── Dove stai bevendo? ── */}
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">
                Dove stai bevendo?
              </p>

              {/* Selected pub pill */}
              {selectedPub && !pubSearchOpen && (
                <div className="flex items-center gap-2 bg-primary/8 dark:bg-primary/15 border border-primary/20 rounded-xl px-3 py-2.5">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">{selectedPub.name}</p>
                    {selectedPub.city && (
                      <p className="text-xs text-stone-400 truncate">{selectedPub.city}</p>
                    )}
                  </div>
                  <button
                    onClick={removePub}
                    className="p-1 rounded-full hover:bg-stone-200/60 dark:hover:bg-stone-700/60 transition-colors"
                    aria-label="Rimuovi locale"
                  >
                    <X className="w-3.5 h-3.5 text-stone-400" />
                  </button>
                </div>
              )}

              {/* Search toggle button */}
              {!selectedPub && !pubSearchOpen && (
                <button
                  onClick={() => setPubSearchOpen(true)}
                  className="w-full flex items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-2.5 text-sm text-stone-400 hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
                >
                  <Search className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">Cerca un locale…</span>
                  <ChevronRight className="w-4 h-4 opacity-40" />
                </button>
              )}

              {/* Change button when pub is pre-selected */}
              {selectedPub && !pubSearchOpen && (
                <button
                  onClick={() => setPubSearchOpen(true)}
                  className="mt-1.5 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                >
                  Cambia locale
                </button>
              )}

              {/* Inline search */}
              {pubSearchOpen && (
                <div className="rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-stone-100 dark:border-stone-700">
                    <Search className="w-4 h-4 text-stone-400 flex-shrink-0" />
                    <Input
                      ref={searchInputRef}
                      value={pubQuery}
                      onChange={(e) => setPubQuery(e.target.value)}
                      placeholder="Nome del locale, città…"
                      className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                    />
                    <button onClick={() => { setPubSearchOpen(false); setPubQuery(""); setPubResults([]); }}>
                      <X className="w-4 h-4 text-stone-400" />
                    </button>
                  </div>

                  {/* Results */}
                  <div className="max-h-44 overflow-y-auto">
                    {pubSearching && (
                      <p className="px-4 py-3 text-xs text-stone-400">Ricerca…</p>
                    )}
                    {!pubSearching && pubQuery && pubResults.length === 0 && (
                      <p className="px-4 py-3 text-xs text-stone-400">Nessun locale trovato</p>
                    )}
                    {pubResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selectPub(p)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-left"
                      >
                        <MapPin className="w-3.5 h-3.5 text-stone-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">{p.name}</p>
                          {(p.city || p.address) && (
                            <p className="text-xs text-stone-400 truncate">{[p.city, p.address].filter(Boolean).join(" · ")}</p>
                          )}
                        </div>
                      </button>
                    ))}
                    {!pubQuery && (
                      <p className="px-4 py-3 text-xs text-stone-400">Digita per cercare un locale…</p>
                    )}
                  </div>
                </div>
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
