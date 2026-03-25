import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, GitMerge, Trash2, Beer, Loader2, RefreshCw, SlidersHorizontal, Check } from "lucide-react";

interface DupePair {
  id1: number; name1: string; country1: string; region1: string; location1: string; logo1: string; beers1: number;
  id2: number; name2: string; country2: string; region2: string; location2: string; logo2: string; beers2: number;
  sim: number;
}

function BreweryCard({ id, name, country, region, logo, beers, isKept, isDeleted, onSelect, selectable }: {
  id: number; name: string; country?: string; region?: string; logo?: string; beers: number;
  isKept?: boolean; isDeleted?: boolean; onSelect?: () => void; selectable?: boolean;
}) {
  return (
    <div
      onClick={selectable ? onSelect : undefined}
      className={`flex-1 border-2 rounded-xl p-4 transition-all ${
        selectable ? 'cursor-pointer' : ''
      } ${
        isKept ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
        isDeleted ? 'border-red-400 bg-red-50 dark:bg-red-900/20 opacity-60' :
        selectable ? 'border-gray-200 dark:border-neutral-700 hover:border-amber-400 dark:hover:border-amber-500' :
        'border-gray-200 dark:border-neutral-700'
      }`}
    >
      <div className="flex items-start gap-3">
        {logo ? (
          <img src={logo} alt={name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-100" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
            <Beer className="h-6 w-6 text-gray-400" />
          </div>
        )}
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{name}</div>
          {(country || region) && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {[region, country].filter(Boolean).join(", ")}
            </div>
          )}
          <div className="flex items-center gap-1 mt-1.5">
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              🍺 {beers} birre
            </Badge>
            <Badge variant="outline" className="text-xs px-1.5 py-0 text-gray-400">
              ID {id}
            </Badge>
          </div>
        </div>
        {isKept && (
          <div className="ml-auto flex-shrink-0 bg-green-500 text-white rounded-full p-0.5">
            <Check className="h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDuplicates() {
  const { toast } = useToast();
  const [threshold, setThreshold] = useState("0.85");
  const [country, setCountry] = useState("all");
  const [limit, setLimit] = useState("100");
  const [searched, setSearched] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Merge dialog
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergePair, setMergePair] = useState<DupePair | null>(null);
  const [keepId, setKeepId] = useState<number | null>(null);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const queryKey = ['/api/admin/breweries/find-duplicates', threshold, country, limit];

  const { data: pairs = [], isLoading, refetch } = useQuery<DupePair[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ threshold, limit });
      if (country && country !== 'all') params.set('country', country);
      const res = await fetch(`/api/admin/breweries/find-duplicates?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Errore ricerca duplicati');
      return res.json();
    },
    enabled: searched,
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ keepId, mergeId }: { keepId: number; mergeId: number }) =>
      apiRequest('/api/admin/breweries/merge', { method: 'POST' }, { keepId, mergeId }),
    onSuccess: (data: any, vars) => {
      const key = `${Math.min(vars.keepId, vars.mergeId)}_${Math.max(vars.keepId, vars.mergeId)}`;
      setDismissed(prev => new Set([...prev, key]));
      setMergeOpen(false);
      setMergePair(null);
      setKeepId(null);
      toast({ title: "Merge completato", description: `"${data?.keepName}" ora ha ${data?.beersMoved} birre` });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: any) => toast({ title: "Errore merge", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest(`/api/admin/breweries/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      const pairsWithId = pairs.filter(p => p.id1 === id || p.id2 === id);
      pairsWithId.forEach(p => {
        const key = `${Math.min(p.id1, p.id2)}_${Math.max(p.id1, p.id2)}`;
        setDismissed(prev => new Set([...prev, key]));
      });
      setDeleteOpen(false);
      toast({ title: "Birrificio eliminato", description: deleteTarget?.name });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: any) => toast({ title: "Errore eliminazione", description: e.message, variant: "destructive" }),
  });

  const visiblePairs = pairs.filter(p => {
    const key = `${Math.min(p.id1, p.id2)}_${Math.max(p.id1, p.id2)}`;
    return !dismissed.has(key);
  });

  const handleSearch = () => setSearched(true);

  const openMerge = (pair: DupePair) => {
    setMergePair(pair);
    setKeepId(pair.beers1 >= pair.beers2 ? pair.id1 : pair.id2);
    setMergeOpen(true);
  };

  const handleDeleteSmaller = (pair: DupePair) => {
    const smaller = pair.beers1 <= pair.beers2 ? { id: pair.id1, name: pair.name1 } : { id: pair.id2, name: pair.name2 };
    setDeleteTarget(smaller);
    setDeleteOpen(true);
  };

  const simColor = (sim: number) => {
    if (sim >= 0.95) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (sim >= 0.85) return 'bg-stone-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-4 py-3 flex items-center gap-3">
        <Link href="/admin/content">
          <Button variant="ghost" size="sm" className="p-1.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Birrifici Duplicati</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Trova e unisci birrifici simili o duplicati</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Search controls */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-gray-200 dark:border-neutral-700 p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <SlidersHorizontal className="h-4 w-4 text-amber-500" />
            Parametri di ricerca
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Soglia similarità</label>
              <Select value={threshold} onValueChange={setThreshold}>
                <SelectTrigger className="bg-gray-50 dark:bg-neutral-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.95">0.95 — Solo identici</SelectItem>
                  <SelectItem value="0.90">0.90 — Molto simili</SelectItem>
                  <SelectItem value="0.85">0.85 — Consigliato</SelectItem>
                  <SelectItem value="0.80">0.80 — Abbastanza simili</SelectItem>
                  <SelectItem value="0.75">0.75 — Moderata</SelectItem>
                  <SelectItem value="0.70">0.70 — Liberale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Paese (opzionale)</label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="bg-gray-50 dark:bg-neutral-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i paesi</SelectItem>
                  <SelectItem value="Italia">Italia</SelectItem>
                  <SelectItem value="United States">USA</SelectItem>
                  <SelectItem value="Germany">Germania</SelectItem>
                  <SelectItem value="United Kingdom">UK</SelectItem>
                  <SelectItem value="Belgium">Belgio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Max risultati</label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger className="bg-gray-50 dark:bg-neutral-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleSearch}
            disabled={isLoading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-white font-semibold"
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Ricerca in corso...</>
            ) : (
              <><Search className="h-4 w-4 mr-2" />Trova duplicati</>
            )}
          </Button>
        </div>

        {/* Results */}
        {searched && !isLoading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {visiblePairs.length} coppie trovate
                {dismissed.size > 0 && <span className="text-gray-400 font-normal ml-2">({dismissed.size} gestiti)</span>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-gray-500 gap-1">
                <RefreshCw className="h-3.5 w-3.5" /> Aggiorna
              </Button>
            </div>

            {visiblePairs.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-3">✅</div>
                <div className="font-medium">Nessun duplicato trovato</div>
                <div className="text-sm mt-1">Prova ad abbassare la soglia di similarità</div>
              </div>
            )}

            {visiblePairs.map((pair) => {
              const key = `${Math.min(pair.id1, pair.id2)}_${Math.max(pair.id1, pair.id2)}`;
              return (
                <div key={key} className="bg-white dark:bg-neutral-800 rounded-2xl border border-gray-200 dark:border-neutral-700 p-4 space-y-3">
                  {/* Similarity badge */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${simColor(pair.sim)}`}>
                      {Math.round(pair.sim * 100)}% simile
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteSmaller(pair)}
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1 h-7 text-xs"
                      >
                        <Trash2 className="h-3 w-3" /> Elimina il minore
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openMerge(pair)}
                        className="bg-purple-600 hover:bg-purple-500 text-white gap-1 h-7 text-xs"
                      >
                        <GitMerge className="h-3 w-3" /> Merge
                      </Button>
                    </div>
                  </div>

                  {/* Two brewery cards */}
                  <div className="flex gap-3">
                    <BreweryCard
                      id={pair.id1} name={pair.name1} country={pair.country1}
                      region={pair.region1} logo={pair.logo1} beers={pair.beers1}
                    />
                    <div className="flex items-center text-gray-300 dark:text-gray-600 font-bold text-lg">vs</div>
                    <BreweryCard
                      id={pair.id2} name={pair.name2} country={pair.country2}
                      region={pair.region2} logo={pair.logo2} beers={pair.beers2}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Merge Dialog */}
      {mergePair && (
        <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitMerge className="h-5 w-5 text-purple-500" /> Merge birrifici
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Scegli quale birrificio <strong>mantenere</strong>. Tutte le birre e i dati dell'altro verranno migrati su quello mantenuto, poi il duplicato sarà eliminato.
            </p>
            <div className="flex gap-3">
              <BreweryCard
                id={mergePair.id1} name={mergePair.name1} country={mergePair.country1}
                region={mergePair.region1} logo={mergePair.logo1} beers={mergePair.beers1}
                isKept={keepId === mergePair.id1} isDeleted={keepId === mergePair.id2}
                selectable onSelect={() => setKeepId(mergePair.id1)}
              />
              <BreweryCard
                id={mergePair.id2} name={mergePair.name2} country={mergePair.country2}
                region={mergePair.region2} logo={mergePair.logo2} beers={mergePair.beers2}
                isKept={keepId === mergePair.id2} isDeleted={keepId === mergePair.id1}
                selectable onSelect={() => setKeepId(mergePair.id2)}
              />
            </div>
            {keepId && (
              <p className="text-xs text-red-500 dark:text-red-400 mt-2">
                ⚠ Il birrificio non selezionato (ID {keepId === mergePair.id1 ? mergePair.id2 : mergePair.id1}) sarà <strong>eliminato definitivamente</strong>.
              </p>
            )}
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => setMergeOpen(false)} className="flex-1">Annulla</Button>
              <Button
                disabled={!keepId || mergeMutation.isPending}
                onClick={() => {
                  const mId = keepId === mergePair.id1 ? mergePair.id2 : mergePair.id1;
                  mergeMutation.mutate({ keepId: keepId!, mergeId: mId });
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
              >
                {mergeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><GitMerge className="h-4 w-4 mr-1" /> Conferma merge</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina birrificio</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare definitivamente <strong>"{deleteTarget?.name}"</strong> e tutte le sue birre. Questa azione non è reversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-500"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Elimina definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
