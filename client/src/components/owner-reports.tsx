import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertTriangle, MessageSquare, Star, Flag, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface OwnerReport {
  id: number;
  targetType: "review" | "checkin_comment";
  targetId: number;
  reason: string;
  description: string | null;
  status: "pending" | "resolved" | "dismissed" | "escalated";
  createdAt: string;
  reviewRating: number | null;
  reviewText: string | null;
  commentText: string | null;
  beerName: string | null;
  beerId: number | null;
}

const reasonLabels: Record<string, string> = {
  inappropriato: "Contenuto inappropriato",
  spam: "Spam o pubblicità",
  offensivo: "Linguaggio offensivo",
  falso: "Informazione falsa",
  altro: "Altro",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  escalated: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  dismissed: "bg-stone-100 text-stone-700 dark:bg-[#1A1D24] dark:text-stone-300",
};

const statusLabels: Record<string, string> = {
  pending: "In attesa",
  escalated: "Inoltrata agli admin",
  resolved: "Risolta",
  dismissed: "Archiviata",
};

interface Props {
  ownerType: "brewery" | "pub";
  ownerId: number;
}

export function OwnerReportsSection({ ownerType, ownerId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = [`/api/${ownerType}`, String(ownerId), "reports"];

  const { data: reports = [], isLoading } = useQuery<OwnerReport[]>({
    queryKey,
    queryFn: () => apiRequest(`/api/${ownerType}/${ownerId}/reports`),
  });

  const escalateMut = useMutation({
    mutationFn: (reportId: number) => apiRequest(`/api/reports/${reportId}/escalate`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Segnalazione inoltrata", description: "Gli admin la valuteranno al più presto" });
    },
    onError: (e: any) => toast({ title: "Errore", description: e?.message ?? "Riprova", variant: "destructive" }),
  });

  return (
    <div className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <div className="p-2 bg-amber-500 rounded-xl shadow-sm">
            <Flag className="h-5 w-5 text-white" />
          </div>
          Segnalazioni sui tuoi contenuti
        </h2>
        {reports.length > 0 && (
          <Badge variant="outline" className="rounded-full">
            {reports.filter(r => r.status === "pending" || r.status === "escalated").length} attive
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Flag className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nessuna segnalazione sui tuoi contenuti</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => {
            const isComment = r.targetType === "checkin_comment";
            const text = isComment ? r.commentText : r.reviewText;
            return (
              <Card key={r.id} className="p-4 border border-stone-100 dark:border-border rounded-xl" data-testid={`owner-report-${r.id}`}>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className={`${statusColors[r.status]} border-0 rounded-full text-[10px]`}>
                    {statusLabels[r.status]}
                  </Badge>
                  <Badge variant="outline" className="rounded-full text-[10px]">
                    {isComment ? <><MessageSquare className="w-3 h-3 mr-1" />Commento</> : <><Star className="w-3 h-3 mr-1" />Recensione</>}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{reasonLabels[r.reason] ?? r.reason}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: it })}
                  </span>
                </div>

                {r.beerName && (
                  <p className="text-xs font-semibold text-primary mb-1">🍺 {r.beerName}</p>
                )}
                {text && (
                  <p className="text-sm text-foreground italic bg-stone-50 dark:bg-[#0B0D10]/30 rounded-lg p-2 mb-2">
                    "{text}"
                  </p>
                )}
                {r.description && (
                  <p className="text-xs text-muted-foreground mb-2">
                    <span className="font-semibold">Motivo segnalante:</span> {r.description}
                  </p>
                )}

                {r.status === "pending" && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl gap-1.5 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40 hover:bg-amber-50"
                      disabled={escalateMut.isPending}
                      onClick={() => {
                        if (confirm("Inoltrare la segnalazione agli admin per richiederne la rimozione?")) {
                          escalateMut.mutate(r.id);
                        }
                      }}
                      data-testid={`button-escalate-${r.id}`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Richiedi rimozione
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
