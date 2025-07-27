import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Edit3, Beer } from "lucide-react";
import { PubAutocomplete } from "./PubAutocomplete";

interface BeerTastingsEditorProps {
  beerTastings: any[];
}

export default function BeerTastingsEditor({ beerTastings }: BeerTastingsEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTasting, setEditingTasting] = useState<any>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editRating, setEditRating] = useState(5);
  const [selectedPubId, setSelectedPubId] = useState<number | undefined>();

  // Update tasting mutation
  const updateTastingMutation = useMutation({
    mutationFn: async ({ tastingId, notes, rating, pubId }: { 
      tastingId: number, 
      notes: string, 
      rating: number,
      pubId?: number 
    }) => {
      const updateData: any = { personalNotes: notes, rating };
      if (pubId !== undefined) {
        updateData.pubId = pubId;
      }
      return apiRequest(`/api/user/beer-tastings/${tastingId}`, "PATCH", updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/beer-tastings"] });
      setEditingTasting(null);
      setSelectedPubId(undefined);
      toast({
        title: "Successo",
        description: "Degustazione aggiornata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore durante l'aggiornamento",
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (tasting: any) => {
    setEditingTasting(tasting);
    setEditNotes(tasting.personalNotes || "");
    setEditRating(tasting.rating || 5);
    setSelectedPubId(tasting.pubId);
  };

  const handleSave = () => {
    if (editingTasting) {
      updateTastingMutation.mutate({
        tastingId: editingTasting.id,
        notes: editNotes,
        rating: editRating,
        pubId: selectedPubId
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beer className="w-5 h-5" />
            Birre Assaggiate ({beerTastings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {beerTastings.length > 0 ? (
            <div className="space-y-3">
              {beerTastings.slice(0, 10).map((tasting: any) => (
                <div key={tasting.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <img
                      src={tasting.beer?.imageUrl || '/default-beer.jpg'}
                      alt={tasting.beer?.name || 'Birra'}
                      className="w-10 h-10 rounded object-cover"
                    />
                    <div>
                      <h4 className="font-medium">{tasting.beer?.name || 'Birra sconosciuta'}</h4>
                      <p className="text-sm text-gray-600">{tasting.brewery?.name || 'Birrificio sconosciuto'}</p>
                      {tasting.personalNotes && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 italic mt-1 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                          "{tasting.personalNotes}"
                        </p>
                      )}
                      {tasting.pubName && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          📍 Provata da: {tasting.pubName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= (tasting.rating || 0)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(tasting)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {beerTastings.length > 10 && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  ... e altre {beerTastings.length - 10} birre
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              Nessuna birra ancora assaggiata. Inizia a esplorare!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingTasting} onOpenChange={() => setEditingTasting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifica Degustazione</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingTasting && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={editingTasting.beer?.imageUrl || '/default-beer.jpg'}
                    alt={editingTasting.beer?.name || 'Birra'}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div>
                    <h4 className="font-medium">{editingTasting.beer?.name}</h4>
                    <p className="text-sm text-gray-600">{editingTasting.brewery?.name}</p>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium mb-2">Valutazione</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setEditRating(star)}
                        className="p-1"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= editRating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300 hover:text-yellow-200'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dove l'hai bevuta - Con Autocompletamento */}
                <div>
                  <label className="block text-sm font-medium mb-2">Dove l'hai bevuta?</label>
                  <PubAutocomplete
                    value={selectedPubId}
                    onSelect={setSelectedPubId}
                    placeholder="Cerca e seleziona un pub..."
                  />
                </div>

                {/* Personal Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2">Note personali</label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Aggiungi le tue note su questa birra..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleSave}
                    disabled={updateTastingMutation.isPending}
                    className="flex-1"
                  >
                    {updateTastingMutation.isPending ? "Salvando..." : "Salva"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditingTasting(null)}
                    className="flex-1"
                  >
                    Annulla
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}