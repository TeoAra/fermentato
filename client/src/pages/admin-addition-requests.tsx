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
      const res = await apiRequest("PATCH", `/api/admin/addition-requests/${id}/approve`, { adminNotes });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
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
      const res = await apiRequest("PATCH", `/api/admin/addition-requests/${id}/reject`, { adminNotes });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-3xl mx-auto">
          <Link href="/admin">
            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Richieste di aggiunta</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Birre e birrifici proposti dagli utenti</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nessuna richiesta {statusFilter === 'pending' ? 'in attesa' : statusFilter === 'approved' ? 'approvata' : 'rifiutata'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map(r => {
              const isExpanded = expandedId === r.id;
              const name = getName(r);
              return (
                <div key={r.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${r.type === 'beer' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                        {r.type === 'beer' ? <Beer className="h-5 w-5 text-amber-600" /> : <Building2 className="h-5 w-5 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-xs ${r.type === 'beer' ? 'border-amber-300 text-amber-700 dark:text-amber-400' : 'border-blue-300 text-blue-700 dark:text-blue-400'}`}>
                            {r.type === 'beer' ? 'Birra' : 'Birrificio'}
                          </Badge>
                          {r.status === 'approved' && <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">Approvata</Badge>}
                          {r.status === 'rejected' && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">Rifiutata</Badge>}
                          {r.status === 'pending' && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">In attesa</Badge>}
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white mt-1 truncate">{name || "—"}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {getUserLabel(r)}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: it })}</span>
                        </div>
                        {/* Quick info pills */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {r.style && <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{r.style}</span>}
                          {r.abv && <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{r.abv}%</span>}
                          {r.city && <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{r.city}</span>}
                          {r.country && r.country !== 'Italia' && <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{r.country}</span>}
                          {r.breweryId && <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">Birrificio ID #{r.breweryId}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 shrink-0"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-3 pl-13 space-y-2 text-sm border-t border-gray-100 dark:border-gray-800 pt-3">
                        {r.breweryName && r.type === 'beer' && (
                          <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Birrificio:</span> {r.breweryName}</p>
                        )}
                        {r.websiteUrl && (
                          <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Sito:</span> <a href={r.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-amber-600 underline">{r.websiteUrl}</a></p>
                        )}
                        {r.description && (
                          <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Descrizione:</span> {r.description}</p>
                        )}
                        {r.notes && (
                          <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Note utente:</span> {r.notes}</p>
                        )}
                        {r.adminNotes && (
                          <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Note admin:</span> {r.adminNotes}</p>
                        )}
                      </div>
                    )}

                    {/* Action buttons (only for pending) */}
                    {r.status === 'pending' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <Button
                          size="sm"
                          onClick={() => setApproveId(r.id)}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-1.5"
                        >
                          <CheckCircle className="h-4 w-4" /> Approva
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setRejectId(r.id); setRejectNote(""); }}
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1.5"
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approva richiesta</AlertDialogTitle>
            <AlertDialogDescription>
              Approvando questa richiesta, il record verrà creato nel database e l'utente verrà notificato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2">
            <Label htmlFor="approveNote">Nota (opzionale)</Label>
            <Textarea
              id="approveNote"
              value={approveNote}
              onChange={e => setApproveNote(e.target.value)}
              placeholder="Messaggio per l'utente..."
              className="mt-1 resize-none"
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveId !== null && approveMutation.mutate({ id: approveId, adminNotes: approveNote })}
              className="bg-green-500 hover:bg-green-600"
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approva"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <AlertDialog open={rejectId !== null} onOpenChange={open => !open && setRejectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rifiuta richiesta</AlertDialogTitle>
            <AlertDialogDescription>
              L'utente riceverà una notifica con il motivo del rifiuto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2">
            <Label htmlFor="rejectNote">Motivo del rifiuto (opzionale)</Label>
            <Textarea
              id="rejectNote"
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="es. Già presente nel database, informazioni insufficienti..."
              className="mt-1 resize-none"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectId !== null && rejectMutation.mutate({ id: rejectId, adminNotes: rejectNote })}
              className="bg-red-500 hover:bg-red-600"
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
