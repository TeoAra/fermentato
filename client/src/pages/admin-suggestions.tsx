import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  Lightbulb,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Beer,
  Factory,
  Clock,
  User,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { PageContainer } from "@/components/layout/page-container";
import { it as itLocale } from "date-fns/locale";

interface Suggestion {
  id: number;
  type: "beer" | "brewery";
  itemId: number;
  userId: string;
  status: string;
  proposedChanges: Record<string, any>;
  currentData: Record<string, any> | null;
  message: string | null;
  adminNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  itemName: string;
  user: {
    id: string;
    nickname: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  } | null;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  style: "Stile",
  abv: "ABV",
  ibu: "IBU",
  description: "Descrizione",
  color: "Colore",
  logoUrl: "Logo",
  imageUrl: "Immagine",

  coverImageUrl: "Immagine di Copertina",
  isGlutenFree: "Gluten Free",
  isAlcoholFree: "Analcolica",
  location: "Località",
  region: "Regione",
  websiteUrl: "Sito Web",
};

function isImageField(key: string) {
  return key.toLowerCase().includes("url") || key.toLowerCase().includes("image");
}

function DiffRow({ field, current, proposed }: { field: string; current: any; proposed: any }) {
  const label = FIELD_LABELS[field] || field;
  const img = isImageField(field);

  return (
    <div className="grid grid-cols-3 gap-3 py-2 border-b border-gray-100 dark:border-[#2F3D4D] last:border-0">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 self-start pt-1">{label}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 line-through">
        {img && current ? (
          <img src={current} alt="" className="h-12 w-12 object-cover rounded-md opacity-60" />
        ) : (
          <span>{String(current ?? "—")}</span>
        )}
      </div>
      <div className="text-xs text-green-700 dark:text-green-400 font-medium">
        {img && proposed ? (
          <img src={proposed} alt="" className="h-12 w-12 object-cover rounded-md ring-2 ring-green-500/50" />
        ) : (
          <span>{String(proposed ?? "—")}</span>
        )}
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion, onApprove, onReject, isProcessing }: {
  suggestion: Suggestion;
  onApprove: (id: number, notes: string) => void;
  onReject: (id: number, notes: string) => void;
  isProcessing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);

  const userName = suggestion.user?.nickname || suggestion.user?.firstName || "Utente";
  const userInitial = userName[0]?.toUpperCase() || "U";

  const changedFields = Object.keys(suggestion.proposedChanges);

  const handleAction = (action: "approve" | "reject") => {
    if (action === "reject") {
      setPendingAction("reject");
      setShowNotesInput(true);
    } else {
      onApprove(suggestion.id, notes);
    }
  };

  const confirmReject = () => {
    onReject(suggestion.id, notes);
    setShowNotesInput(false);
  };

  return (
    <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg flex-shrink-0 ${suggestion.type === "beer" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
              {suggestion.type === "beer" ? (
                <Beer className={`h-4 w-4 ${suggestion.type === "beer" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`} />
              ) : (
                <Factory className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                  {suggestion.itemName || `${suggestion.type === "beer" ? "Birra" : "Birrificio"} #${suggestion.itemId}`}
                </span>
                <Badge variant="outline" className="text-xs">
                  {suggestion.type === "beer" ? "Birra" : "Birrificio"}
                </Badge>
                <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                  {changedFields.length} campo{changedFields.length !== 1 ? "i" : ""} modificato{changedFields.length !== 1 ? "i" : ""}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {suggestion.createdAt ? format(new Date(suggestion.createdAt), "d MMM yyyy 'alle' HH:mm", { locale: itLocale }) : "—"}
                </span>
                <Link href={`/${suggestion.type === "beer" ? "beer" : "brewery"}/${suggestion.itemId}`}>
                  <span className="flex items-center gap-1 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer">
                    <ExternalLink className="h-3 w-3" />
                    Vedi pagina
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* User pill */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Avatar className="h-7 w-7">
              <AvatarImage src={suggestion.user?.profileImageUrl ?? undefined} />
              <AvatarFallback className="text-xs bg-gray-200 dark:bg-[#232F3D]">{userInitial}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-600 dark:text-gray-300 hidden sm:block">{userName}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* User message */}
        {suggestion.message && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
            <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
            <p className="italic">&ldquo;{suggestion.message}&rdquo;</p>
          </div>
        )}

        {/* Diff section */}
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Nascondi" : "Mostra"} modifiche
          </button>

          {expanded && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-[#15202B] rounded-lg">
              <div className="grid grid-cols-3 gap-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <div>Campo</div>
                <div>Attuale</div>
                <div className="text-green-600 dark:text-green-500">Proposta</div>
              </div>
              {changedFields.map((field) => (
                <DiffRow
                  key={field}
                  field={field}
                  current={suggestion.currentData?.[field]}
                  proposed={suggestion.proposedChanges[field]}
                />
              ))}
            </div>
          )}
        </div>

        {/* Notes input (for reject) */}
        {showNotesInput && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Nota per l&apos;utente (opzionale)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Spiega perché il suggerimento non è stato accettato..."
              rows={2}
              className="text-sm"
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          {!showNotesInput ? (
            <>
              <Button
                size="sm"
                onClick={() => handleAction("approve")}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Approva e applica
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("reject")}
                disabled={isProcessing}
                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20 flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Rifiuta
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                onClick={confirmReject}
                disabled={isProcessing}
                className="bg-red-600 hover:bg-red-700 text-white flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                {isProcessing ? "Rifiuto..." : "Conferma rifiuto"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowNotesInput(false); setPendingAction(null); }}
                disabled={isProcessing}
              >
                Annulla
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSuggestions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [processingId, setProcessingId] = useState<number | null>(null);

  const { data: suggestions = [], isLoading } = useQuery<Suggestion[]>({
    queryKey: ["/api/admin/suggestions", statusFilter],
    queryFn: () => fetch(`/api/admin/suggestions?status=${statusFilter}`).then(r => r.json()),
  });

  const { data: pendingCount } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/suggestions/pending-count"],
    queryFn: () => fetch("/api/admin/suggestions/pending-count").then(r => r.json()),
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, adminNotes }: { id: number; adminNotes: string }) =>
      apiRequest(`/api/admin/suggestions/${id}/approve`, { method: "PATCH" }, { adminNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suggestions"] });
      toast({ title: "Suggerimento approvato", description: "Le modifiche sono state applicate." });
      setProcessingId(null);
    },
    onError: () => {
      toast({ title: "Errore durante l'approvazione", variant: "destructive" });
      setProcessingId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, adminNotes }: { id: number; adminNotes: string }) =>
      apiRequest(`/api/admin/suggestions/${id}/reject`, { method: "PATCH" }, { adminNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suggestions"] });
      toast({ title: "Suggerimento rifiutato", description: "L'utente è stato notificato." });
      setProcessingId(null);
    },
    onError: () => {
      toast({ title: "Errore durante il rifiuto", variant: "destructive" });
      setProcessingId(null);
    },
  });

  const handleApprove = (id: number, notes: string) => {
    setProcessingId(id);
    approveMutation.mutate({ id, adminNotes: notes });
  };

  const handleReject = (id: number, notes: string) => {
    setProcessingId(id);
    rejectMutation.mutate({ id, adminNotes: notes });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50/20 dark:from-gray-950 dark:to-amber-950/10">
      {/* Header */}
      <div className="bg-white dark:bg-[#15202B] border-b border-gray-200 dark:border-[#2F3D4D] sticky top-0 z-10">
        <PageContainer variant="standard" className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Admin
              </Button>
            </Link>
            <div className="h-4 w-px bg-gray-200 dark:bg-[#232F3D]" />
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h1 className="font-semibold text-gray-900 dark:text-white">Suggerimenti di modifica</h1>
              {pendingCount && pendingCount.count > 0 && (
                <Badge className="bg-amber-500 text-white text-xs">
                  {pendingCount.count}
                </Badge>
              )}
            </div>
          </div>
        </PageContainer>
      </div>

      <PageContainer variant="standard" className="py-6 space-y-5">
        {/* Status tabs */}
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-[#1B2735] rounded-lg w-fit">
          {(["pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                statusFilter === s
                  ? "bg-white dark:bg-[#232F3D] shadow-sm text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {s === "pending" ? "In attesa" : s === "approved" ? "Approvati" : "Rifiutati"}
              {s === "pending" && pendingCount && pendingCount.count > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {pendingCount.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 dark:bg-[#1B2735] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 mx-auto flex items-center justify-center mb-4">
              <Lightbulb className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {statusFilter === "pending" ? "Nessun suggerimento in attesa" : "Nessun suggerimento"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {statusFilter === "pending"
                ? "Quando gli utenti suggeriranno modifiche a birre o birrifici, appariranno qui."
                : `Non ci sono suggerimenti ${statusFilter === "approved" ? "approvati" : "rifiutati"}.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onApprove={handleApprove}
                onReject={handleReject}
                isProcessing={processingId === suggestion.id}
              />
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
