import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Calendar, FileText, CheckCircle, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface BeerTastingFormProps {
  beerId: number;
  beerName: string;
  existingTasting?: any;
}

export default function BeerTastingForm({ beerId, beerName, existingTasting }: BeerTastingFormProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    pubId: existingTasting?.pubId || "",
    format: existingTasting?.format || "spina",
    rating: existingTasting?.rating || 5,
    personalNotes: existingTasting?.personalNotes || "",
  });

  // Fetch pubs for selection
  const { data: pubs = [] } = useQuery({
    queryKey: ["/api/pubs/all"],
    enabled: showForm,
  });

  const addTastingMutation = useMutation({
    mutationFn: async (tastingData: any) => {
      return await apiRequest("/api/user/beer-tastings", "POST", {
        beerId,
        ...tastingData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/beer-tastings"] });
      queryClient.invalidateQueries({ queryKey: [`/api/beers/${beerId}/user-tasting`] });
      setShowForm(false);
      toast({
        title: "Tasting aggiunto!",
        description: `Hai registrato il tuo assaggio di ${beerName}`,
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
    if (!formData.pubId) {
      toast({
        title: "Errore",
        description: "Seleziona un pub",
        variant: "destructive",
      });
      return;
    }
    addTastingMutation.mutate(formData);
  };

  if (!isAuthenticated) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          <p className="text-center text-gray-500 dark:text-gray-400">
            <a href="/api/login" className="text-amber-600 hover:text-amber-700">
              Accedi
            </a> per registrare i tuoi assaggi
          </p>
        </CardContent>
      </Card>
    );
  }

  if (existingTasting) {
    return (
      <Card className="mt-6 border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle className="w-5 h-5" />
            Già assaggiata!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm">{existingTasting.pub?.name || "Pub non specificato"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm">
                {new Date(existingTasting.tastedAt).toLocaleDateString("it-IT")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= (existingTasting.rating || 0)
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">{existingTasting.rating}/5</span>
            </div>
            {existingTasting.personalNotes && (
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {existingTasting.personalNotes}
                </p>
              </div>
            )}
            <Badge variant="secondary" className="w-fit">
              {existingTasting.format || "spina"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Hai bevuto questa birra?
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Assaggio
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      {showForm && (
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Dove l'hai bevuta? *
              </label>
              <Select
                value={formData.pubId}
                onValueChange={(value) => setFormData({ ...formData, pubId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona un pub..." />
                </SelectTrigger>
                <SelectContent>
                  {pubs.map((pub: any) => (
                    <SelectItem key={pub.id} value={pub.id.toString()}>
                      {pub.name} - {pub.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Come l'hai bevuta?
              </label>
              <Select
                value={formData.format}
                onValueChange={(value) => setFormData({ ...formData, format: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spina">Alla spina</SelectItem>
                  <SelectItem value="bottiglia">Bottiglia</SelectItem>
                  <SelectItem value="lattina">Lattina</SelectItem>
                  <SelectItem value="boccale">Boccale</SelectItem>
                </SelectContent>
              </Select>
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
                onClick={() => setShowForm(false)}
              >
                Annulla
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
}