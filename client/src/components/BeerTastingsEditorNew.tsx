import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Edit3, Trash2, Beer, Calendar, ChevronLeft, ChevronRight, Filter, X, Camera, MapPin } from "lucide-react";
import { PubAutocomplete } from "./PubAutocomplete";
import { Link } from "wouter";

interface BeerTastingsEditorProps {
  beerTastings: any[];
}

function StarRow({ rating, max = 5, size = "sm" }: { rating: number; max?: number; size?: "sm" | "md" }) {
  const r = parseFloat(String(rating)) || 0;
  const sz = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={`${sz} ${i < r ? "text-amber-400 fill-amber-400" : "text-stone-200 dark:text-stone-700"}`} />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button" onClick={() => onChange(star)} className="p-1 tap-scale">
          <Star className={`w-7 h-7 ${star <= value ? "text-amber-400 fill-amber-400" : "text-stone-300 dark:text-stone-600 hover:text-amber-200"}`} />
        </button>
      ))}
    </div>
  );
}

const formatDate = (d: string) => {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; }
};

const toPlain = (s: string) => s ? s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() : "";

export default function BeerTastingsEditor({ beerTastings }: BeerTastingsEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTasting, setEditingTasting] = useState<any>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editRating, setEditRating] = useState(5);
  const [editFormat, setEditFormat] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>("");
  const [editPhotoUploading, setEditPhotoUploading] = useState(false);
  const [selectedPubId, setSelectedPubId] = useState<number | undefined>();
  const [deletingTasting, setDeletingTasting] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async ({ tastingId, notes, rating, pubId, format, photoUrl }: { tastingId: number; notes: string; rating: number; pubId?: number; format?: string; photoUrl?: string | null }) => {
      const payload: any = { personalNotes: notes, rating, format: format || null, photoUrl: photoUrl ?? null };
      if (pubId !== undefined) payload.pubId = pubId;
      return apiRequest(`/api/user/beer-tastings/${tastingId}`, { method: "PATCH" }, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/beer-tastings"] });
      setEditingTasting(null);
      setSelectedPubId(undefined);
      toast({ title: "Salvata" });
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (beerId: number) => apiRequest(`/api/user/beer-tastings/${beerId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/beer-tastings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      setDeletingTasting(null);
      setEditingTasting(null);
      toast({ title: "Eliminata" });
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  const openEdit = (t: any) => {
    setEditingTasting(t);
    setEditNotes(toPlain(t.personalNotes || ""));
    setEditRating(parseFloat(t.rating) || 5);
    setEditFormat(t.format || "");
    setEditPhotoUrl(t.photoUrl || "");
    setSelectedPubId(t.pubId);
  };

  const filtered = useMemo(() => {
    let arr = beerTastings ? [...beerTastings] : [];
    if (dateFrom) arr = arr.filter(t => new Date(t.createdAt || t.tastedAt || 0) >= new Date(dateFrom));
    if (dateTo) { const to = new Date(dateTo); to.setHours(23, 59, 59); arr = arr.filter(t => new Date(t.createdAt || t.tastedAt || 0) <= to); }
    return arr.sort((a, b) => new Date(b.createdAt || b.tastedAt || 0).getTime() - new Date(a.createdAt || a.tastedAt || 0).getTime());
  }, [beerTastings, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);
  const hasFilters = !!(dateFrom || dateTo);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <Beer className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-foreground">Bevute ({beerTastings?.length || 0})</h3>
            {hasFilters && <p className="text-[10px] text-primary font-semibold">{filtered.length} filtrate</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${showFilters ? "bg-primary text-white border-primary" : "bg-stone-50 dark:bg-white/5 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-white/10"}`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtra
            {hasFilters && <span className="w-4 h-4 bg-white text-primary rounded-full text-[10px] flex items-center justify-center font-black">!</span>}
          </button>
          <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setCurrentPage(1); }}>
            <SelectTrigger className="w-[60px] h-8 text-xs rounded-xl border-stone-200 dark:border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 15, 25].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-end gap-3 mb-3 p-3 bg-stone-50 dark:bg-white/[0.03] rounded-2xl border border-stone-100 dark:border-white/[0.06]">
          <div className="flex-1 min-w-[130px]">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Dal</label>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }} className="h-8 text-sm rounded-xl" />
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Al</label>
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }} className="h-8 text-sm rounded-xl" />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setCurrentPage(1); }} className="h-8 text-xs gap-1">
              <X className="w-3.5 h-3.5" /> Reset
            </Button>
          )}
        </div>
      )}

      {/* Cards */}
      {paginated.length === 0 ? (
        <div className="text-center py-10">
          <Beer className="w-10 h-10 text-stone-200 dark:text-stone-700 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            {hasFilters ? "Nessuna bevuta con questi filtri" : "Inizia a esplorare birre!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((t: any) => {
            const name = t.beer?.name || "Birra sconosciuta";
            const brewery = t.beer?.brewery?.name || "";
            const notes = toPlain(t.personalNotes || "");
            const date = formatDate(t.createdAt || t.tastedAt);
            return (
              <div key={t.id} className="flex gap-3 p-3 bg-white dark:bg-white/[0.03] rounded-2xl border border-stone-100 dark:border-white/[0.06] hover:border-stone-200 dark:hover:border-white/[0.10] transition-colors group">
                {/* Image */}
                <Link href={`/beer/${t.beerId || t.beer?.id}`}>
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-100 dark:bg-[#1A1D24] flex-shrink-0 cursor-pointer">
                    {t.beer?.imageUrl ? (
                      <img src={t.beer.imageUrl} alt={name} className="w-full h-full object-cover" onError={e => { (e.target as any).style.display = 'none'; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Beer className="w-6 h-6 text-stone-300 dark:text-stone-600" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Top row: name + actions */}
                  <div className="flex items-start gap-1">
                    <div className="flex-1 min-w-0">
                      <Link href={`/beer/${t.beerId || t.beer?.id}`}>
                        <h4 className="text-sm font-bold text-foreground truncate leading-snug hover:text-primary transition-colors cursor-pointer">{name}</h4>
                      </Link>
                      {brewery && (
                        <Link href={`/brewery/${t.beer?.brewery?.id || t.beer?.breweryId}`}>
                          <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate hover:text-primary transition-colors cursor-pointer">{brewery}</p>
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0 -mr-1">
                      <button
                        onClick={() => openEdit(t)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-primary hover:bg-stone-50 dark:hover:bg-white/5 transition-colors tap-scale"
                        title="Modifica"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingTasting(t)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-300 dark:text-stone-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors tap-scale"
                        title="Elimina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="mt-1">
                    <StarRow rating={t.rating || 0} />
                  </div>

                  {/* Notes */}
                  {notes && (
                    <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400 italic line-clamp-2 leading-relaxed">"{notes}"</p>
                  )}

                  {/* Meta */}
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    {date && (
                      <span className="flex items-center gap-1 text-[10px] text-stone-400 dark:text-stone-500">
                        <Calendar className="w-3 h-3" />{date}
                      </span>
                    )}
                    {t.format && <span className="text-[10px] text-stone-400 dark:text-stone-500">· {t.format}</span>}
                    {t.pubName && (
                      <span className="flex items-center gap-0.5 text-[10px] text-stone-400 dark:text-stone-500">
                        <MapPin className="w-3 h-3" />{t.pubName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > perPage && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100 dark:border-white/[0.06]">
          <p className="text-xs text-muted-foreground">
            {(safePage - 1) * perPage + 1}–{Math.min(safePage * perPage, filtered.length)} di {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button disabled={safePage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="w-8 h-8 rounded-xl border border-stone-200 dark:border-white/10 flex items-center justify-center disabled:opacity-40 hover:border-primary/40 transition-colors tap-scale">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-2">{safePage}/{totalPages}</span>
            <button disabled={safePage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="w-8 h-8 rounded-xl border border-stone-200 dark:border-white/10 flex items-center justify-center disabled:opacity-40 hover:border-primary/40 transition-colors tap-scale">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deletingTasting} onOpenChange={open => !open && setDeletingTasting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la bevuta?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per rimuovere la bevuta di <strong>{deletingTasting?.beer?.name || "questa birra"}</strong>. Non è reversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deletingTasting && deleteMutation.mutate(deletingTasting.beerId || deletingTasting.beer?.id)}
              disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Eliminando…" : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit dialog */}
      <Dialog open={!!editingTasting} onOpenChange={() => setEditingTasting(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingTasting?.beer?.imageUrl && (
                <img src={editingTasting.beer.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
              )}
              {editingTasting?.beer?.name || "Modifica bevuta"}
            </DialogTitle>
          </DialogHeader>
          {editingTasting && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Valutazione</label>
                <StarPicker value={editRating} onChange={setEditRating} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Dove l'hai bevuta?</label>
                <PubAutocomplete value={selectedPubId} onSelect={setSelectedPubId} placeholder="Cerca un pub…" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Formato</label>
                <Input value={editFormat} onChange={e => setEditFormat(e.target.value)} placeholder="Alla spina, bottiglia, lattina…" className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Note</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Aromi, sapori, impressione…" maxLength={2000} rows={4}
                  className="w-full px-3 py-2 text-sm border border-stone-200 dark:border-[#23262E] rounded-xl bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                <p className="text-[10px] text-muted-foreground text-right mt-1">{editNotes.length}/2000</p>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Foto</label>
                {editPhotoUrl ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-stone-200 dark:border-[#23262E]">
                    <img src={editPhotoUrl} alt="Foto" className="w-full h-full object-cover" />
                    <button onClick={() => setEditPhotoUrl("")} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-stone-300 dark:border-[#23262E] rounded-xl cursor-pointer hover:border-primary transition-colors">
                    <Camera className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{editPhotoUploading ? "Caricamento…" : "Aggiungi foto"}</span>
                    <input type="file" accept="image/*" className="hidden" disabled={editPhotoUploading}
                      onChange={async e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        setEditPhotoUploading(true);
                        try {
                          const fd = new FormData(); fd.append("photo", file);
                          const r = await fetch("/api/user/beer-tastings/upload-photo", { method: "POST", body: fd, credentials: "include" });
                          if (!r.ok) throw new Error("Upload fallito");
                          const { photoUrl: url } = await r.json();
                          setEditPhotoUrl(url);
                        } catch { toast({ title: "Errore foto", variant: "destructive" }); }
                        finally { setEditPhotoUploading(false); e.target.value = ""; }
                      }} />
                  </label>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => updateMutation.mutate({ tastingId: editingTasting.id, notes: editNotes, rating: editRating, pubId: selectedPubId, format: editFormat, photoUrl: editPhotoUrl || null })}
                  disabled={updateMutation.isPending} className="flex-1">
                  {updateMutation.isPending ? "Salvo…" : "Salva"}
                </Button>
                <Button variant="outline" onClick={() => setEditingTasting(null)} className="flex-1">Annulla</Button>
              </div>
              <div className="pt-1 border-t">
                <Button variant="ghost" size="sm" className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => setDeletingTasting(editingTasting)}>
                  <Trash2 className="w-4 h-4 mr-2" />Elimina questa bevuta
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
