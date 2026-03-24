import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  QrCode, Search, Plus, Loader2, ArrowLeft, CheckCircle2, XCircle,
  CreditCard, Pencil, ExternalLink, Users, RefreshCw, UserCheck,
} from "lucide-react";

interface AdminFestival {
  id: number; slug: string; name: string; description: string | null;
  location: string | null; startDate: string | null; endDate: string | null;
  isActive: boolean; showFood: boolean; ownerId: string | null;
  paidAt: string | null; priceEur: number | null;
  logoUrl: string | null; coverImageUrl: string | null;
  useTokens: boolean | null; tokenName: string | null;
  createdAt: string | null;
  // enriched
  ownerEmail?: string; ownerUsername?: string;
}

interface AdminUser {
  id: string; email: string; username: string | null; full_name: string | null;
}

function StatusBadge({ festival }: { festival: AdminFestival }) {
  if (festival.isActive && !festival.endDate || (festival.isActive && festival.endDate && new Date(festival.endDate) >= new Date())) {
    return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">Attivo</Badge>;
  }
  if (festival.endDate && new Date(festival.endDate) < new Date()) {
    return <Badge variant="outline" className="bg-[hsl(38,14%,93%)] text-muted-foreground border-transparent">Scaduto</Badge>;
  }
  if (!festival.paidAt && !festival.isActive) {
    return <Badge className="bg-orange-50 text-primary border-orange-100">Non pagato</Badge>;
  }
  return <Badge variant="secondary" className="bg-orange-50 text-primary border-orange-100">Inattivo</Badge>;
}

// ── User search picker ────────────────────────────────────────────────────────
function UserSearchPicker({ onSelect }: { onSelect: (user: AdminUser) => void }) {
  const [q, setQ] = useState("");
  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users/search", q],
    queryFn: async () => {
      if (q.length < 2) return [];
      return fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`, { credentials: "include" }).then(r => r.json());
    },
    enabled: q.length >= 2,
  });

  return (
    <div className="space-y-2">
      <div className="relative">
        {isLoading ? <Loader2 className="absolute left-3 top-3 h-4 w-4 animate-spin text-muted-foreground" /> : <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />}
        <Input className="pl-9 border-orange-100 rounded-xl focus-visible:ring-primary/20" placeholder="Cerca per email, username o nome…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {users.length > 0 && (
        <div className="border border-orange-100 rounded-xl overflow-hidden bg-white dark:bg-[hsl(25,14%,10%)]">
          {users.map(u => (
            <button key={u.id} className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-orange-50 dark:hover:bg-orange-950/10 border-b border-orange-100 last:border-b-0 transition-colors" onClick={() => { onSelect(u); setQ(""); }}>
              <div className="w-7 h-7 rounded-full bg-orange-50 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">{(u.username || u.email)[0].toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{u.full_name || u.username || u.email}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {q.length >= 2 && !isLoading && users.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Nessun utente trovato per "{q}"</p>
      )}
    </div>
  );
}

// ── Transfer dialog ───────────────────────────────────────────────────────────
function TransferDialog({ festival, onClose }: { festival: AdminFestival; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const transferMutation = useMutation({
    mutationFn: () => apiRequest(`/api/admin/festivals/${festival.id}/transfer`, { method: "PUT" }, { newOwnerId: selectedUser!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals"] });
      toast({ title: `Festival "${festival.name}" trasferito a ${selectedUser?.email}` });
      onClose();
    },
    onError: () => toast({ title: "Errore nel trasferimento", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-[hsl(25,14%,10%)] border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground font-bold">Trasferisci "{festival.name}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Cerca e seleziona l'utente a cui assegnare questo festival:</p>
          <UserSearchPicker onSelect={u => setSelectedUser(u)} />
          {selectedUser && (
            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl">
              <UserCheck className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedUser.full_name || selectedUser.username || selectedUser.email}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
              </div>
              <Button size="sm" variant="ghost" className="ml-auto text-primary hover:bg-orange-50 rounded-xl" onClick={() => setSelectedUser(null)}>Cambia</Button>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2 border-t border-orange-100">
            <Button variant="outline" className="border-orange-100 hover:bg-orange-50 rounded-xl text-muted-foreground" onClick={onClose}>Annulla</Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold"
              disabled={!selectedUser || transferMutation.isPending}
              onClick={() => transferMutation.mutate()}
            >
              {transferMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Trasferisci festival
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Create festival for user dialog ──────────────────────────────────────────
function CreateForUserDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", location: "" });

  const suggestSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const createMutation = useMutation({
    mutationFn: async () => {
      const fest: any = await apiRequest("/api/admin/festivals", { method: "POST" }, {
        ...form,
        ownerId: selectedUser!.id,
      });
      // Activate for free immediately
      await apiRequest(`/api/admin/festivals/${fest.id}/activate-free`, { method: "POST" });
      return fest;
    },
    onSuccess: (fest: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals"] });
      toast({ title: `Festival "${fest.name}" creato e assegnato a ${selectedUser?.email}` });
      onClose();
    },
    onError: (err: any) => toast({ title: err?.message || "Errore", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-[hsl(25,14%,10%)] border-orange-50 dark:border-[hsl(25,12%,16%)] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground font-bold">Crea festival per un utente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Assegna a utente</Label>
            {selectedUser ? (
              <div className="flex items-center gap-3 mt-1 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 rounded-xl">
                <UserCheck className="h-4 w-4 text-primary flex-shrink-0" />
                <p className="text-sm font-medium flex-1 text-foreground">{selectedUser.email}</p>
                <Button size="sm" variant="ghost" className="text-primary hover:bg-orange-50 rounded-xl" onClick={() => setSelectedUser(null)}>Cambia</Button>
              </div>
            ) : (
              <div className="mt-1">
                <UserSearchPicker onSelect={setSelectedUser} />
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Nome festival *</Label>
            <Input className="mt-1 h-9 border-orange-100 rounded-xl focus-visible:ring-primary/20" value={form.name} onChange={e => {
              const name = e.target.value;
              setForm(f => ({ ...f, name, slug: suggestSlug(name) }));
            }} placeholder="Es. Birra Loca Fest 2025" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Slug URL *</Label>
            <Input className="mt-1 h-9 font-mono text-sm border-orange-100 rounded-xl focus-visible:ring-primary/20" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="birra-loca-fest-2025" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Luogo</Label>
            <Input className="mt-1 h-9 border-orange-100 rounded-xl focus-visible:ring-primary/20" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Es. Milano, Arena Civica" />
          </div>
          <p className="text-xs text-primary bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg px-3 py-2">
            Il festival sarà creato come già pagato e attivo (gratuito).
          </p>
          <div className="flex gap-2 justify-end pt-2 border-t border-orange-100">
            <Button variant="outline" className="border-orange-100 hover:bg-orange-50 rounded-xl text-muted-foreground" onClick={onClose}>Annulla</Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold"
              disabled={!selectedUser || !form.name || !form.slug || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Crea e attiva
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminFestivals() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [transferFest, setTransferFest] = useState<AdminFestival | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: allFestivals = [], isLoading } = useQuery<AdminFestival[]>({
    queryKey: ["/api/admin/festivals"],
    queryFn: () => apiRequest("/api/admin/festivals"),
    enabled: isAuthenticated,
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/festivals/${id}/activate-free`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals"] });
      toast({ title: "Festival attivato gratuitamente" });
    },
    onError: () => toast({ title: "Errore nell'attivazione", variant: "destructive" }),
  });

  const filteredFestivals = allFestivals.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q)
      || f.slug.includes(q)
      || (f.ownerEmail?.toLowerCase().includes(q) ?? false)
      || (f.location?.toLowerCase().includes(q) ?? false);
  });

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center"><p>Accesso negato</p></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 bg-white dark:bg-[hsl(25,14%,10%)] border-b border-orange-100 dark:border-[hsl(25,12%,16%)] p-4 -mx-4 sm:mx-0 rounded-t-2xl">
          <Link href="/admin">
            <button className="p-2 border border-orange-100 hover:bg-orange-50 rounded-xl text-muted-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <QrCode className="h-6 w-6 text-primary" />
              Gestione Festival
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{allFestivals.length} festival totali</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />Crea per utente
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 bg-white dark:bg-[hsl(25,14%,10%)] border-orange-100 rounded-xl focus-visible:ring-primary/20" placeholder="Cerca per nome, slug, email proprietario…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Festival list */}
        {isLoading ? (
          <div className="text-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-muted-foreground">Caricamento festival…</p>
          </div>
        ) : filteredFestivals.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <QrCode className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>{search ? `Nessun festival trovato per "${search}"` : "Nessun festival"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFestivals.map(fest => (
              <Card key={fest.id} className="bg-white dark:bg-[hsl(25,14%,10%)] rounded-2xl border border-orange-50 dark:border-[hsl(25,12%,16%)] shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    {fest.logoUrl ? (
                      <img src={fest.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-orange-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                        <QrCode className="h-6 w-6 text-primary/40" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground">{fest.name}</h3>
                        <StatusBadge festival={fest} />
                        {fest.useTokens && (
                          <Badge className="bg-primary/10 text-primary border-primary/20">Token: {fest.tokenName}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                        <span className="font-mono">{fest.slug}</span>
                        {fest.location && <span>{fest.location}</span>}
                        {fest.startDate && <span>{new Date(fest.startDate).toLocaleDateString("it-IT")}
                          {fest.endDate && fest.endDate !== fest.startDate ? ` → ${new Date(fest.endDate).toLocaleDateString("it-IT")}` : ""}</span>}
                      </div>
                      {/* Owner */}
                      <div className="flex items-center gap-1 mt-1 text-xs">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {fest.ownerEmail || fest.ownerId ? (
                          <span className="text-muted-foreground">{fest.ownerEmail || fest.ownerId}</span>
                        ) : (
                          <span className="text-destructive italic">Nessun proprietario</span>
                        )}
                        {fest.paidAt && (
                          <span className="ml-2 text-emerald-600 flex items-center gap-0.5">
                            <CreditCard className="h-3 w-3" />Pagato {new Date(fest.paidAt).toLocaleDateString("it-IT")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <Link href={`/festival-dashboard`}>
                        <Button size="sm" variant="outline" className="border-orange-100 hover:bg-orange-50 text-primary rounded-xl gap-1 text-xs w-full">
                          <Pencil className="h-3 w-3" />Gestisci
                        </Button>
                      </Link>
                      <Link href={`/festival/${fest.slug}`} target="_blank">
                        <Button size="sm" variant="outline" className="border-orange-100 hover:bg-orange-50 text-primary rounded-xl gap-1 text-xs w-full">
                          <ExternalLink className="h-3 w-3" />Apri
                        </Button>
                      </Link>
                      {!fest.isActive && (
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold gap-1 text-xs"
                          onClick={() => activateMutation.mutate(fest.id)}
                          disabled={activateMutation.isPending}
                        >
                          {activateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          Attiva gratis
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="border-orange-100 hover:bg-orange-50 text-primary rounded-xl gap-1 text-xs" onClick={() => setTransferFest(fest)}>
                        <UserCheck className="h-3 w-3" />Trasferisci
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {transferFest && <TransferDialog festival={transferFest} onClose={() => setTransferFest(null)} />}
      {showCreate && <CreateForUserDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
