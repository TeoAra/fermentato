import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PubAutocomplete } from "./PubAutocomplete";

interface BeerTastingFormProps {
  beerId: number;
  beerName?: string;
  existingTasting?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function BeerTastingForm({ beerId, beerName, existingTasting, onSuccess, onCancel }: BeerTastingFormProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!existingTasting && !!onCancel;
  const [showForm, setShowForm] = useState(isEditMode);
  const [selectedPubId, setSelectedPubId] = useState<number | undefined>(existingTasting?.pubId || undefined);
  const [formData, setFormData] = useState({
    format: existingTasting?.format || "",
    rating: existingTasting?.rating || 5,
    personalNotes: existingTasting?.personalNotes || existingTasting?.notes || "",
  });

  const addTastingMutation = useMutation({
    mutationFn: async (tastingData: any) => {
      if (isEditMode && existingTasting?.id) {
        return await apiRequest(`/api/user/beer-tastings/${existingTasting.id}`, { method: "PATCH" }, tastingData);
      }
      return await apiRequest("/api/user/beer-tastings", { method: "POST" }, {
        beerId,
        ...tastingData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/beer-tastings"] });
      queryClient.invalidateQueries({ queryKey: [`/api/beers/${beerId}/user-tasting`] });
      setShowForm(false);
      if (onSuccess) onSuccess();
      toast({
        title: isEditMode ? "Degustazione aggiornata!" : "Tasting aggiunto!",
        description: isEditMode ? "Le modifiche sono state salvate" : "Hai registrato il tuo assaggio",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile salvare l'assaggio",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTastingMutation.mutate({
      ...formData,
      pubId: selectedPubId || null,
    });
  };

  if (!isAuthenticated) {
    return (
      <Button variant="outline" className="w-full" onClick={() => window.location.href = "/api/login"}>
        <Plus className="w-4 h-4 mr-2" />
        Accedi per registrare assaggi
      </Button>
    );
  }

  if (existingTasting && !isEditMode) {
    return (
      <Button variant="outline" className="w-full border-green-200 bg-green-50 dark:bg-green-900/20 text-green-700" disabled>
        <CheckCircle className="w-4 h-4 mr-2" />
        Già assaggiata il {new Date(existingTasting.tastedAt).toLocaleDateString("it-IT")}
      </Button>
    );
  }

  return (
    <>
      {!showForm && (
        <Button
          onClick={() => setShowForm(true)}
          variant="outline"
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Hai bevuto questa birra?
        </Button>
      )}
      
      {showForm && (
        <Card className="mt-2">
          <CardHeader>
            <CardTitle className="text-lg">{isEditMode ? "Modifica degustazione" : "Aggiungi il tuo assaggio"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Dove l'hai bevuta?
                </label>
                <PubAutocomplete
                  value={selectedPubId}
                  onSelect={setSelectedPubId}
                  placeholder="Cerca e seleziona un pub..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Come l'hai bevuta?
                </label>
                <Input
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                  placeholder="Es. alla spina, bottiglia, lattina..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Voto (1-5 stelle)
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="p-1"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= formData.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300 hover:text-amber-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Note personali
                </label>
                <Textarea
                  value={formData.personalNotes}
                  onChange={(e) => setFormData({ ...formData, personalNotes: e.target.value })}
                  placeholder="Come ti è sembrata? Sapori, profumi, ricordi..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={addTastingMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {addTastingMutation.isPending ? "Salvando..." : "Salva Assaggio"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowForm(false); if (onCancel) onCancel(); }}
                >
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
