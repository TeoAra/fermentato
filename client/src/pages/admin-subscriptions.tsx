import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CreditCard, ArrowLeft, Search, Gift, CheckCircle, XCircle, Clock,
  AlertTriangle, RefreshCw, Store, User, Calendar
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow, isAfter, isBefore, addDays } from "date-fns";
import { it } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  none: { label: "Nessuno", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: XCircle },
  trial: { label: "Prova (15gg)", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: Clock },
  active: { label: "Attivo", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", icon: CheckCircle },
  gifted: { label: "Regalato", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", icon: Gift },
  expired: { label: "Scaduto", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: AlertTriangle },
};

export default function AdminSubscriptions() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [giftTarget, setGiftTarget] = useState<any>(null);
  const [giftMonths, setGiftMonths] = useState("12");
  const [filterStatus, setFilterStatus] = useState("all");

  const isAdminUser = (user as any)?.activeRole === 'admin' || (!((user as any)?.activeRole) && (user as any)?.userType === 'admin');

  const { data: subscriptions = [], isLoading: subLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/pub-subscriptions"],
    enabled: isAuthenticated && isAdminUser,
  });

  const giftMutation = useMutation({
    mutationFn: ({ pubId, months }: { pubId: number; months: number }) =>
      apiRequest(`/api/admin/pubs/${pubId}/gift-subscription`, { method: "POST" }, { months }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pub-subscriptions"] });
      toast({ title: "Abbonamento regalato!", description: `${giftMonths} mesi attivati per ${giftTarget?.name}` });
      setGiftTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err?.message || "Impossibile regalare l'abbonamento", variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (pubId: number) =>
      apiRequest(`/api/admin/pubs/${pubId}/revoke-subscription`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pub-subscriptions"] });
      toast({ title: "Abbonamento revocato" });
    },
    onError: () => toast({ title: "Errore", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdminUser) return null;

  const now = new Date();
  const soonThreshold = addDays(now, 30);

  const getEffectiveStatus = (pub: any): string => {
    const status = pub.subscriptionStatus || "none";
    if (status === "trial" && pub.trialEndsAt && isBefore(new Date(pub.trialEndsAt), now)) return "expired";
    if ((status === "active" || status === "gifted") && pub.subscriptionExpiresAt && isBefore(new Date(pub.subscriptionExpiresAt), now)) return "expired";
    return status;
  };

  const isExpiringSoon = (pub: any): boolean => {
    const expiresAt = pub.subscriptionExpiresAt || pub.trialEndsAt;
    if (!expiresAt) return false;
    const exp = new Date(expiresAt);
    return isAfter(exp, now) && isBefore(exp, soonThreshold);
  };

  const filtered = subscriptions.filter((p: any) => {
    const q = search.toLowerCase();
    const matchesSearch = !search || p.name?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q) || p.ownerEmail?.toLowerCase().includes(q);
    const effectiveStatus = getEffectiveStatus(p);
    const matchesFilter = filterStatus === "all" || effectiveStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    active: subscriptions.filter(p => ["active", "gifted"].includes(getEffectiveStatus(p))).length,
    trial: subscriptions.filter(p => getEffectiveStatus(p) === "trial").length,
    expiringSoon: subscriptions.filter(p => isExpiringSoon(p)).length,
    expired: subscriptions.filter(p => getEffectiveStatus(p) === "expired").length,
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard Admin
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-emerald-500" />
          Abbonamenti Pub
        </h1>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-auto">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Abbonamenti attivi", value: stats.active, color: "text-green-600", border: "border-l-green-500" },
          { label: "In prova", value: stats.trial, color: "text-blue-600", border: "border-l-blue-500" },
          { label: "In scadenza (30gg)", value: stats.expiringSoon, color: "text-amber-600", border: "border-l-amber-500" },
          { label: "Scaduti", value: stats.expired, color: "text-red-600", border: "border-l-red-500" },
        ].map(({ label, value, color, border }) => (
          <Card key={label} className={`border-l-4 ${border}`}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cerca per nome pub, città, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filtro stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="none">Nessuno</SelectItem>
            <SelectItem value="trial">In prova</SelectItem>
            <SelectItem value="active">Attivi</SelectItem>
            <SelectItem value="gifted">Regalati</SelectItem>
            <SelectItem value="expired">Scaduti</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pub</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Proprietario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stato</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Scadenza</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {subLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nessun pub trovato</td>
                  </tr>
                ) : (
                  filtered.map((pub: any) => {
                    const effectiveStatus = getEffectiveStatus(pub);
                    const cfg = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG["none"];
                    const Icon = cfg.icon;
                    const expiresAt = pub.subscriptionExpiresAt || pub.trialEndsAt;
                    const expiringSoon = isExpiringSoon(pub);
                    return (
                      <tr key={pub.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Store className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-900 dark:text-white">{pub.name}</p>
                              <p className="text-xs text-gray-400">{pub.city}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[150px]">
                              {pub.ownerEmail || pub.ownerNickname || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                          {expiringSoon && (
                            <span className="ml-1.5 text-xs text-amber-600 font-medium">⚠️ In scadenza</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {expiresAt ? (
                            <div>
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                {new Date(expiresAt).toLocaleDateString("it-IT")}
                              </p>
                              <p className="text-xs text-gray-400">
                                {isAfter(new Date(expiresAt), now)
                                  ? `scade ${formatDistanceToNow(new Date(expiresAt), { addSuffix: true, locale: it })}`
                                  : `scaduto ${formatDistanceToNow(new Date(expiresAt), { addSuffix: true, locale: it })}`
                                }
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 text-purple-700 border-purple-200 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/20"
                              onClick={() => setGiftTarget(pub)}
                            >
                              <Gift className="w-3 h-3" />
                              Regala
                            </Button>
                            {effectiveStatus !== "none" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => revokeMutation.mutate(pub.id)}
                                disabled={revokeMutation.isPending}
                              >
                                Revoca
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Gift subscription dialog */}
      <Dialog open={!!giftTarget} onOpenChange={open => { if (!open) setGiftTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-500" />
              Regala abbonamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="font-semibold text-purple-800 dark:text-purple-200">{giftTarget?.name}</p>
              <p className="text-sm text-purple-600 dark:text-purple-300">{giftTarget?.city}</p>
              {giftTarget?.ownerEmail && (
                <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">{giftTarget.ownerEmail}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Durata abbonamento</label>
              <Select value={giftMonths} onValueChange={setGiftMonths}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mese</SelectItem>
                  <SelectItem value="3">3 mesi</SelectItem>
                  <SelectItem value="6">6 mesi</SelectItem>
                  <SelectItem value="12">12 mesi (1 anno)</SelectItem>
                  <SelectItem value="24">24 mesi (2 anni)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-gray-500">
              Se il pub ha già un abbonamento attivo, la durata verrà aggiunta a partire dalla scadenza esistente.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setGiftTarget(null)}>
                Annulla
              </Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                disabled={giftMutation.isPending}
                onClick={() => giftMutation.mutate({ pubId: giftTarget.id, months: parseInt(giftMonths) })}
              >
                {giftMutation.isPending ? "..." : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Regala {giftMonths === "12" ? "1 anno" : `${giftMonths} ${parseInt(giftMonths) === 1 ? "mese" : "mesi"}`}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
