import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Edit3, Beer, Calendar, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { PubAutocomplete } from "./PubAutocomplete";
import { Link } from "wouter";

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

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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
      return apiRequest(`/api/user/beer-tastings/${tastingId}`, { method: "PATCH" }, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/beer-tastings"] });
      setEditingTasting(null);
      setSelectedPubId(undefined);
      toast({ title: "Successo", description: "Degustazione aggiornata" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Errore durante l'aggiornamento", variant: "destructive" });
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

  const filteredTastings = useMemo(() => {
    if (!beerTastings) return [];
    let filtered = [...beerTastings];
    
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter(t => new Date(t.createdAt || t.tastedAt || 0) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59);
      filtered = filtered.filter(t => new Date(t.createdAt || t.tastedAt || 0) <= to);
    }
    
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.tastedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.tastedAt || 0).getTime();
      return dateB - dateA;
    });
    
    return filtered;
  }, [beerTastings, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredTastings.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTastings = filteredTastings.slice((safePage - 1) * perPage, safePage * perPage);

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const hasActiveFilters = dateFrom || dateTo;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('it-IT', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    } catch { return ''; }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Beer className="w-5 h-5" />
              Birre Assaggiate ({beerTastings?.length || 0})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-amber-500 hover:bg-amber-600" : ""}
              >
                <Filter className="w-4 h-4 mr-1" />
                Filtri
                {hasActiveFilters && (
                  <span className="ml-1 bg-white text-amber-600 rounded-full w-4 h-4 text-xs flex items-center justify-center">!</span>
                )}
              </Button>
              <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-end gap-3 mt-3 pt-3 border-t">
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Dal</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Al</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                  className="h-8 text-sm"
                />
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                  <X className="w-3 h-3 mr-1" /> Reset
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {paginatedTastings.length > 0 ? (
            <div className="space-y-3">
              {paginatedTastings.map((tasting: any) => (
                <div key={tasting.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Link href={`/beer/${tasting.beerId || tasting.beer?.id}`}>
                      <img
                        src={tasting.beer?.imageUrl || '/default-beer.jpg'}
                        alt={tasting.beer?.name || 'Birra'}
                        className="w-10 h-10 rounded object-cover cursor-pointer hover:ring-2 hover:ring-amber-400 transition-all"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/beer/${tasting.beerId || tasting.beer?.id}`}>
                        <h4 className="font-medium hover:text-amber-600 cursor-pointer transition-colors truncate">
                          {tasting.beer?.name || 'Birra sconosciuta'}
                        </h4>
                      </Link>
                      <Link href={`/brewery/${tasting.beer?.breweryId || tasting.brewery?.id}`}>
                        <p className="text-sm text-gray-600 dark:text-gray-400 hover:text-amber-600 cursor-pointer transition-colors truncate">
                          {tasting.brewery?.name || 'Birrificio sconosciuto'}
                        </p>
                      </Link>
                      {(tasting.createdAt || tasting.tastedAt) && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(tasting.createdAt || tasting.tastedAt)}
                        </p>
                      )}
                      {tasting.personalNotes && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 italic mt-1 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded line-clamp-2">
                          "{tasting.personalNotes}"
                        </p>
                      )}
                      {tasting.pubName && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Provata da: {tasting.pubName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
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
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              {hasActiveFilters ? 'Nessuna birra trovata con questi filtri.' : 'Nessuna birra ancora assaggiata. Inizia a esplorare!'}
            </p>
          )}

          {filteredTastings.length > perPage && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">
                {((safePage - 1) * perPage) + 1}-{Math.min(safePage * perPage, filteredTastings.length)} di {filteredTastings.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm px-3 font-medium">
                  {safePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
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
                    <Link href={`/beer/${editingTasting.beerId || editingTasting.beer?.id}`}>
                      <h4 className="font-medium hover:text-amber-600 cursor-pointer">{editingTasting.beer?.name}</h4>
                    </Link>
                    <Link href={`/brewery/${editingTasting.beer?.breweryId || editingTasting.brewery?.id}`}>
                      <p className="text-sm text-gray-600 hover:text-amber-600 cursor-pointer">{editingTasting.brewery?.name}</p>
                    </Link>
                  </div>
                </div>

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

                <div>
                  <label className="block text-sm font-medium mb-2">Dove l'hai bevuta?</label>
                  <PubAutocomplete
                    value={selectedPubId}
                    onSelect={setSelectedPubId}
                    placeholder="Cerca e seleziona un pub..."
                  />
                </div>

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
