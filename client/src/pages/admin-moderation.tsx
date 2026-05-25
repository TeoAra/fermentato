import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Star,
  Flag,
  MessageSquare,
  User,
  Calendar,
  Filter,
  ArrowLeft,
  BeerIcon
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { PageContainer } from "@/components/layout/page-container";
import { it } from "date-fns/locale";

interface ReviewReport {
  id: number;
  targetType: "review" | "checkin_comment";
  targetId: number;
  reviewId: number; // alias di targetId per backward-compat UI
  reporterId: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  reviewRating: number | null;
  reviewText: string | null;
  reviewBeerId: number | null;
  reviewUserId: string | null;
  beerName: string | null;
  beerStyle: string | null;
  // Comment-specific
  commentText: string | null;
  commentTastingId: number | null;
  commentUserId: string | null;
  commentBeerName: string | null;
  commentBeerId: number | null;
  reporterNickname: string | null;
  reporterFirstName: string | null;
  reporterAvatar: string | null;
}

const reasonLabels: Record<string, string> = {
  inappropriato: "Contenuto inappropriato",
  spam: "Spam o pubblicità",
  falso: "Recensione falsa",
  offensivo: "Linguaggio offensivo",
  altro: "Altro",
};

export default function AdminModeration() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const { data: reports = [], isLoading: reportsLoading, refetch } = useQuery<ReviewReport[]>({
    queryKey: ["/api/admin/reports", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/reports?status=${statusFilter}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
    enabled: isAuthenticated && user?.userType === "admin",
  });

  // Counter "in attesa" coerente, indipendente dal filtro corrente
  const { data: pendingMeta } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/reports/pending-count"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reports/pending-count", { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    enabled: isAuthenticated && user?.userType === "admin",
    refetchInterval: 60000,
  });

  const reportActionMutation = useMutation({
    mutationFn: async ({ reportId, action }: { reportId: number; action: "resolve" | "dismiss" | "remove-content" }) =>
      apiRequest(`/api/admin/reports/${reportId}/${action}`, { method: "POST" }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports/pending-count"] });
      toast({
        title: vars.action === "resolve" ? "Segnalazione risolta" :
               vars.action === "dismiss" ? "Segnalazione archiviata" :
               "Contenuto rimosso",
        description: "L'azione è stata completata con successo",
      });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile processare la segnalazione", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Caricamento moderazione...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.userType !== "admin") return null;

  // Counter sempre coerente, anche su tab "risolte" / "archiviate" / "tutte"
  const pendingCount = pendingMeta?.count ?? (statusFilter === "pending" ? reports.length : 0);

  return (
    <div className="bg-background min-h-screen">
      <PageContainer variant="standard" className="py-6 space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="border-stone-200 dark:border-border hover:bg-stone-50 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard Admin
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Moderazione Contenuti</h1>
            <p className="text-muted-foreground mt-1">Gestisci le segnalazioni della community</p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-primary text-white animate-pulse text-sm px-3 py-1 rounded-full font-semibold">
              {pendingCount} in attesa
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "In attesa", value: "pending", color: "border-l-primary", icon: AlertTriangle, iconColor: "text-primary" },
            { label: "Risolte", value: "resolved", color: "border-l-emerald-500", icon: CheckCircle, iconColor: "text-emerald-500" },
            { label: "Archiviate", value: "dismissed", color: "border-l-muted-foreground", icon: XCircle, iconColor: "text-muted-foreground" },
            { label: "Tutte", value: "all", color: "border-l-blue-500", icon: Flag, iconColor: "text-blue-500" },
          ].map(({ label, value, color, icon: Icon, iconColor }) => (
            <Card
              key={value}
              className={`bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] border-l-4 ${color} cursor-pointer transition-all duration-200 hover:border-primary/30 active:scale-[0.99] ${statusFilter === value ? "ring-2 ring-offset-1 ring-primary" : ""}`}
              onClick={() => setStatusFilter(value)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold text-foreground">{statusFilter === value ? reports.length : "—"}</p>
                </div>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtro attivo:</span>
          {[
            { label: "In attesa", value: "pending" },
            { label: "Risolte", value: "resolved" },
            { label: "Archiviate", value: "dismissed" },
            { label: "Tutte", value: "all" },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === value
                  ? "bg-primary text-white"
                  : "bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] text-primary hover:border-primary/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {reportsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Caricamento segnalazioni...</p>
          </div>
        ) : reports.length === 0 ? (
          <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <CardContent className="p-12 text-center">
              <Shield className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                {statusFilter === "pending" ? "Tutto sotto controllo!" : "Nessuna segnalazione trovata"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {statusFilter === "pending"
                  ? "Non ci sono segnalazioni in attesa di revisione."
                  : `Nessuna segnalazione con stato "${statusFilter}".`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const reporterName = report.reporterNickname || report.reporterFirstName || `Utente ${report.reporterId.slice(0, 6)}`;
              const reasonLabel = reasonLabels[report.reason] || report.reason;
              return (
                <Card key={report.id} className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Flag className="w-4 h-4 text-destructive flex-shrink-0" />
                            <span className="font-semibold text-sm text-foreground">{reasonLabel}</span>
                          </div>
                          <Badge
                            className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                              report.status === "resolved" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" :
                              report.status === "pending" ? "bg-stone-50 text-primary dark:bg-[#15202B]/20 dark:text-orange-400" :
                              report.status === "escalated" ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400" :
                              "bg-muted text-muted-foreground"
                            }`}
                          >
                            {report.status === "resolved" ? "Risolta" :
                             report.status === "pending" ? "In attesa" :
                             report.status === "escalated" ? "Da titolare" :
                             "Archiviata"}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: it })}
                          </span>
                        </div>

                        {(() => {
                          const isComment = report.targetType === "checkin_comment";
                          const beerName = isComment ? report.commentBeerName : report.beerName;
                          const beerId = isComment ? report.commentBeerId : report.reviewBeerId;
                          const text = isComment ? report.commentText : report.reviewText;
                          if (!text && !beerName) return null;
                          return (
                            <div className="bg-stone-50 dark:bg-[#15202B]/20 border border-stone-200 dark:border-[#2F3D4D]/50 rounded-xl p-3">
                              <div className="flex items-center gap-2 mb-2">
                                {isComment ? <MessageSquare className="w-3.5 h-3.5 text-primary" /> : <BeerIcon className="w-3.5 h-3.5 text-primary" />}
                                <Badge className="text-[10px] rounded-full bg-stone-100 dark:bg-[#1B2735] text-stone-700 dark:text-stone-300 border-0 px-1.5 py-0">
                                  {isComment ? "Commento check-in" : "Recensione"}
                                </Badge>
                                <span className="text-xs font-medium text-primary dark:text-orange-400">
                                  {beerName || "Birra"}{!isComment && report.beerStyle ? ` — ${report.beerStyle}` : ""}
                                </span>
                                {!isComment && report.reviewRating != null && (
                                  <div className="flex items-center gap-0.5">
                                    {[1,2,3,4,5].map(s => (
                                      <Star key={s} className={`w-3 h-3 ${s <= report.reviewRating! ? "fill-primary text-primary" : "text-muted dark:text-orange-950"}`} />
                                    ))}
                                  </div>
                                )}
                              </div>
                              {text && (
                                <p className="text-sm text-foreground italic">"{text}"</p>
                              )}
                              {beerId && (
                                <Link href={`/beer/${beerId}`}>
                                  <button className="text-xs text-primary hover:underline mt-1 font-medium">Vai alla birra →</button>
                                </Link>
                              )}
                            </div>
                          );
                        })()}

                        {report.description && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Nota segnalante:</span> {report.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {report.reporterAvatar ? (
                            <img src={report.reporterAvatar} className="w-4 h-4 rounded-full" alt="" />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          <span>Segnalato da <span className="font-medium text-foreground">{reporterName}</span></span>
                          <span>·</span>
                          <span>Report #{report.id}</span>
                          {report.resolvedAt && (
                            <>
                              <span>·</span>
                              <span>Risolto {formatDistanceToNow(new Date(report.resolvedAt), { addSuffix: true, locale: it })}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {(report.status === "pending" || report.status === "escalated") && (
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5"
                            disabled={reportActionMutation.isPending}
                            onClick={() => reportActionMutation.mutate({ reportId: report.id, action: "resolve" })}
                            data-testid={`button-resolve-${report.id}`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Risolvi
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl font-semibold gap-1.5 text-red-600 dark:text-red-400"
                            disabled={reportActionMutation.isPending}
                            onClick={() => {
                              if (confirm("Eliminare definitivamente questo contenuto?")) {
                                reportActionMutation.mutate({ reportId: report.id, action: "remove-content" });
                              }
                            }}
                            data-testid={`button-remove-${report.id}`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Rimuovi
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-stone-200 dark:border-border hover:bg-stone-50 rounded-xl font-semibold gap-1.5 text-muted-foreground"
                            disabled={reportActionMutation.isPending}
                            onClick={() => reportActionMutation.mutate({ reportId: report.id, action: "dismiss" })}
                            data-testid={`button-dismiss-${report.id}`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Archivia
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
