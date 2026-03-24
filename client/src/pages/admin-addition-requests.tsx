import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Beer, Building2, Clock, CheckCircle, XCircle, User, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface AdditionRequest {
  id: number;
  type: string;
  status: string;
  beerName: string | null;
  breweryName: string | null;
  breweryId: number | null;
  style: string | null;
  abv: string | null;
  city: string | null;
  country: string | null;
  websiteUrl: string | null;
  description: string | null;
  notes: string | null;
  adminNotes: string | null;
  createdAt: string;
  user: {
    id: string;
    nickname: string | null;
    firstName: string | null;
    profileImageUrl: string | null;
  } | null;
}

export default function AdminAdditionRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [approveId, setApproveId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [approveNote, setApproveNote] = useState("");

  const { data: requests = [], isLoading } = useQuery<AdditionRequest[]>({
    queryKey: ["/api/admin/addition-requests", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/addition-requests?status=${statusFilter}`);
      if (!res.ok) throw new Error("Errore nel caricamento");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: number; adminNotes: string }) => {
      return await apiRequest(`/api/admin/addition-requests/${id}/approve`, { method: "PATCH" }, { adminNotes });
    },
    onSuccess: (_, { id }) => {
      toast({ title: "Approvata", description: "Richiesta approvata e record creato." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/addition-requests"] });
      setApproveId(null);
      setApproveNote("");
    },
    onError: (e: any) => toast({ title: "Errore", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: number; adminNotes: string }) => {
      return await apiRequest(`/api/admin/addition-requests/${id}/reject`, { method: "PATCH" }, { adminNotes });
    },
    onSuccess: () => {
      toast({ title: "Rifiutata", description: "Richiesta rifiutata, utente notificato." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/addition-requests"] });
      setRejectId(null);
      setRejectNote("");
    },
    onError: (e: any) => toast({ title: "Errore", description: e.message, variant: "destructive" }),
  });

  const getName = (r: AdditionRequest) => r.type === "beer" ? r.beerName : r.breweryName;
  const getUserLabel = (r: AdditionRequest) => r.user?.nickname || r.user?.firstName || "Utente sconosciuto";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-[hsl(25,14%,10%)] border-b border-orange-50 dark:border-[hsl(25,12%,16%)] shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-3xl mx-auto">
          <Link href="/admin">
            <button className="p-2 rounded-full hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors">
              <ArrowLeft className="h-5 w-5 text-primary" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Richieste di aggiunta</h1>
            <p className="text-xs text-muted-foreground">Birre e birrifici proposti dagli utenti</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9 border-orange-100 rounded-xl focus:ring-primary/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-orange-100">
              <SelectItem value="pending">In attesa</SelectItem>
              <SelectItem value="approved">Approvate</SelectItem>
              <SelectItem value="rejected">Rifiutate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-4 py-4 max-w-3xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[hsl(25,14%,10%)] border border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm">
            <CheckCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nessuna richiesta {statusFilter === 'pending' ? 'in attesa' : statusFilter === 'approved' ? 'approvata' : 'rifiutata'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map(r => {
              const isExpanded = expandedId === r.id;
              const name = getName(r);
              return (
                <div key={r.id} className="bg-white dark:bg-[hsl(25,14%,10%)] rounded-2xl border border-orange-50 dark:border-[hsl(25,12%,16%)] shadow-sm overflow-hidden transition-all">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-orange-50 dark:border-orange-900/50 ${r.type === 'beer' ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                        {r.type === 'beer' ? <Beer className="h-5 w-5 text-primary" /> : <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs rounded-full font-medium ${r.type === 'beer' ? 'bg-orange-50 text-primary border-orange-100 dark:bg-orange-950/40 dark:text-orange-400' : 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/40 dark:text-blue-400'}`} variant="outline">
                            {r.type === 'beer' ? 'Birra' : 'Birrificio'}
                          </Badge>
                          {r.status === 'approved' && <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 text-xs rounded-full font-medium border-emerald-100 dark:border-emerald-900/50">Approvata</Badge>}
                          {r.status === 'rejected' && <Badge className="bg-destructive/10 text-destructive dark:bg-destructive/20 text-xs rounded-full font-medium border-destructive/20">Rifiutata</Badge>}
                          {r.status === 'pending' && <Badge className="bg-orange-50 text-primary dark:bg-orange-950/20 dark:text-orange-400 text-xs rounded-full font-medium border-orange-100 dark:border-orange-900/50">In attesa</Badge>}
                        </div>
                        <p className="font-bold text-foreground mt-1 truncate">{name || "—"}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {getUserLabel(r)}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: it })}</span>
                        </div>
                        {/* Quick info pills */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {r.style && <span className="text-xs bg-orange-50/50 dark:bg-orange-950/10 text-primary dark:text-orange-400 px-2.5 py-0.5 rounded-full font-medium border border-orange-50 dark:border-orange-900/30">{r.style}</span>}
                          {r.abv && <span className="text-xs bg-orange-50/50 dark:bg-orange-950/10 text-primary dark:text-orange-400 px-2.5 py-0.5 rounded-full font-medium border border-orange-50 dark:border-orange-900/30">{r.abv}%</span>}
                          {r.city && <span className="text-xs bg-orange-50/50 dark:bg-orange-950/10 text-primary dark:text-orange-400 px-2.5 py-0.5 rounded-full font-medium border border-orange-50 dark:border-orange-900/30">{r.city}</span>}
                          {r.country && r.country !== 'Italia' && <span className="text-xs bg-orange-50/50 dark:bg-orange-950/10 text-primary dark:text-orange-400 px-2.5 py-0.5 rounded-full font-medium border border-orange-50 dark:border-orange-900/30">{r.country}</span>}
                          {r.breweryId && <span className="text-xs bg-blue-50/50 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full font-medium border border-blue-50 dark:border-blue-900/30">Birrificio ID #{r.breweryId}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/20 text-muted-foreground transition-colors shrink-0"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-3 pl-13 space-y-2 text-sm border-t border-orange-50 dark:border-[hsl(25,12%,16%)] pt-3">
                        {r.breweryName && r.type === 'beer' && (
                          <p className="text-muted-foreground"><span className="font-bold text-foreground">Birrificio:</span> {r.breweryName}</p>
                        )}
                        {r.websiteUrl && (
                          <p className="text-muted-foreground"><span className="font-bold text-foreground">Sito:</span> <a href={r.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">{r.websiteUrl}</a></p>
                        )}
                        {r.description && (
                          <p className="text-muted-foreground"><span className="font-bold text-foreground">Descrizione:</span> {r.description}</p>
                        )}
                        {r.notes && (
                          <p className="text-muted-foreground"><span className="font-bold text-foreground">Note utente:</span> {r.notes}</p>
                        )}
                        {r.adminNotes && (
                          <div className="bg-orange-50/30 dark:bg-orange-950/5 p-3 rounded-xl border border-orange-50 dark:border-orange-900/30">
                            <p className="text-muted-foreground"><span className="font-bold text-foreground text-primary">Note admin:</span> {r.adminNotes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action buttons (only for pending) */}
                    {r.status === 'pending' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-orange-50 dark:border-[hsl(25,12%,16%)]">
                        <Button
                          size="sm"
                          onClick={() => setApproveId(r.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5"
                        >
                          <CheckCircle className="h-4 w-4" /> Approva
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setRejectId(r.id); setRejectNote(""); }}
                          className="flex-1 border-orange-100 dark:border-[hsl(25,12%,20%)] text-destructive hover:bg-orange-50 rounded-xl font-semibold gap-1.5"
                        >
                          <XCircle className="h-4 w-4" /> Rifiuta
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Approve dialog */}
      <AlertDialog open={approveId !== null} onOpenChange={open => !open && setApproveId(null)}>
        <AlertDialogContent className="rounded-2xl border-orange-100 dark:border-[hsl(25,12%,20%)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-bold text-xl">Approva richiesta</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Approvando questa richiesta, il record verrà creato nel database e l'utente verrà notificato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2">
            <Label htmlFor="approveNote" className="text-foreground font-semibold mb-2 block">Nota (opzionale)</Label>
            <Textarea
              id="approveNote"
              value={approveNote}
              onChange={e => setApproveNote(e.target.value)}
              placeholder="Messaggio per l'utente..."
              className="mt-1 resize-none border-orange-100 rounded-xl focus-visible:ring-primary/20"
              rows={2}
            />
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-orange-100 dark:border-[hsl(25,12%,20%)] hover:bg-orange-50">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveId !== null && approveMutation.mutate({ id: approveId, adminNotes: approveNote })}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approva"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <AlertDialog open={rejectId !== null} onOpenChange={open => !open && setRejectId(null)}>
        <AlertDialogContent className="rounded-2xl border-orange-100 dark:border-[hsl(25,12%,20%)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-bold text-xl">Rifiuta richiesta</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              L'utente riceverà una notifica con il motivo del rifiuto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2">
            <Label htmlFor="rejectNote" className="text-foreground font-semibold mb-2 block">Motivo del rifiuto (opzionale)</Label>
            <Textarea
              id="rejectNote"
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="es. Già presente nel database, informazioni insufficienti..."
              className="mt-1 resize-none border-orange-100 rounded-xl focus-visible:ring-primary/20"
              rows={3}
            />
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-orange-100 dark:border-[hsl(25,12%,20%)] hover:bg-orange-50">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectId !== null && rejectMutation.mutate({ id: rejectId, adminNotes: rejectNote })}
              className="bg-destructive hover:bg-destructive/90 text-white rounded-xl font-semibold"
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rifiuta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
