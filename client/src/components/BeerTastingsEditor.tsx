import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Edit3, Beer } from "lucide-react";

interface BeerTastingsEditorProps {
  beerTastings: any[];
}

export default function BeerTastingsEditor({ beerTastings }: BeerTastingsEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTasting, setEditingTasting] = useState<any>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editRating, setEditRating] = useState(5);

  // Update tasting mutation
  const updateTastingMutation = useMutation({
    mutationFn: async ({ tastingId, notes, rating }: { tastingId: number, notes: string, rating: number }) => {
      return apiRequest(`/api/user/beer-tastings/${tastingId}`, "PATCH", { personalNotes: notes, rating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/beer-tastings"] });
      setEditingTasting(null);
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
                      src={tasting.beer.imageUrl || '/default-beer.jpg'}
                      alt={tasting.beer.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                    <div>
                      <h4 className="font-medium">{tasting.beer.name}</h4>
                      <p className="text-sm text-gray-600">{tasting.brewery?.name}</p>
                      {tasting.personalNotes && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 italic mt-1 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                          "{tasting.personalNotes}"
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(tasting.tastedAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= (tasting.rating || 0)
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(tasting)}
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {beerTastings.length > 10 && (
                <p className="text-sm text-gray-500 text-center">
                  e altre {beerTastings.length - 10} birre...
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              Non hai ancora assaggiato nessuna birra
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingTasting} onOpenChange={() => setEditingTasting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Degustazione</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-medium">{editingTasting?.beer?.name}</h3>
              <p className="text-sm text-gray-600">{editingTasting?.brewery?.name}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Valutazione</label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setEditRating(star)}
                    className="p-1"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= editRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Note Personali</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Aggiungi le tue note personali sulla birra..."
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  updateTastingMutation.mutate({
                    tastingId: editingTasting.id,
                    notes: editNotes,
                    rating: editRating
                  });
                }}
                disabled={updateTastingMutation.isPending}
                className="flex-1"
              >
                {updateTastingMutation.isPending ? "Salvando..." : "Salva Modifiche"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingTasting(null)}
                disabled={updateTastingMutation.isPending}
              >
                Annulla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}