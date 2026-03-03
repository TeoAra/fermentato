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
import { it } from "date-fns/locale";

interface ReviewReport {
  id: number;
  reviewId: number;
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

  const reportActionMutation = useMutation({
    mutationFn: async ({ reportId, action }: { reportId: number; action: "resolve" | "dismiss" }) =>
      apiRequest(`/api/admin/reports/${reportId}/${action}`, { method: "POST" }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({
        title: vars.action === "resolve" ? "Segnalazione risolta" : "Segnalazione archiviata",
        description: "L'azione è stata completata con successo",
      });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile processare la segnalazione", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600">Caricamento moderazione...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.userType !== "admin") return null;

  const pendingCount = statusFilter === "pending" ? reports.length : 0;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard Admin
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Moderazione Contenuti</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gestisci le segnalazioni della community</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="animate-pulse text-sm px-3 py-1">
            {pendingCount} in attesa
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "In attesa", value: "pending", color: "border-l-orange-500", icon: AlertTriangle, iconColor: "text-orange-500" },
          { label: "Risolte", value: "resolved", color: "border-l-green-500", icon: CheckCircle, iconColor: "text-green-500" },
          { label: "Archiviate", value: "dismissed", color: "border-l-gray-400", icon: XCircle, iconColor: "text-gray-400" },
          { label: "Tutte", value: "all", color: "border-l-blue-500", icon: Flag, iconColor: "text-blue-500" },
        ].map(({ label, value, color, icon: Icon, iconColor }) => (
          <Card
            key={value}
            className={`border-l-4 ${color} cursor-pointer transition-shadow hover:shadow-md ${statusFilter === value ? "ring-2 ring-offset-1 ring-primary" : ""}`}
            onClick={() => setStatusFilter(value)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <p className="text-xl font-bold">{statusFilter === value ? reports.length : "—"}</p>
              </div>
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">Filtro attivo:</span>
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
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {reportsLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento segnalazioni...</p>
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {statusFilter === "pending" ? "Tutto sotto controllo!" : "Nessuna segnalazione trovata"}
            </h3>
            <p className="text-gray-500 text-sm">
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
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Flag className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <span className="font-semibold text-sm">{reasonLabel}</span>
                        </div>
                        <Badge
                          variant={
                            report.status === "resolved" ? "default" :
                            report.status === "pending" ? "destructive" :
                            "secondary"
                          }
                          className="text-xs"
                        >
                          {report.status === "resolved" ? "Risolta" :
                           report.status === "pending" ? "In attesa" :
                           "Archiviata"}
                        </Badge>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: it })}
                        </span>
                      </div>

                      {report.reviewText || report.beerName ? (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <BeerIcon className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                              {report.beerName || "Birra"}{report.beerStyle ? ` — ${report.beerStyle}` : ""}
                            </span>
                            {report.reviewRating != null && (
                              <div className="flex items-center gap-0.5">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} className={`w-3 h-3 ${s <= report.reviewRating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                ))}
                              </div>
                            )}
                          </div>
                          {report.reviewText && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{report.reviewText}"</p>
                          )}
                          {report.reviewBeerId && (
                            <Link href={`/beer/${report.reviewBeerId}`}>
                              <button className="text-xs text-amber-600 hover:underline mt-1">Vai alla birra →</button>
                            </Link>
                          )}
                        </div>
                      ) : null}

                      {report.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Nota segnalante:</span> {report.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {report.reporterAvatar ? (
                          <img src={report.reporterAvatar} className="w-4 h-4 rounded-full" alt="" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        <span>Segnalato da <span className="font-medium text-gray-600 dark:text-gray-300">{reporterName}</span></span>
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

                    {report.status === "pending" && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                          disabled={reportActionMutation.isPending}
                          onClick={() => reportActionMutation.mutate({ reportId: report.id, action: "resolve" })}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Risolvi
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-gray-600"
                          disabled={reportActionMutation.isPending}
                          onClick={() => reportActionMutation.mutate({ reportId: report.id, action: "dismiss" })}
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
    </div>
  );
}
