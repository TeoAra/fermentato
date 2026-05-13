import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Send, Loader2, Megaphone, Users, Beer, Building2, Shield, Rss, Trash2, RefreshCw, Plus, Image as ImageIcon, Eye, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { PageContainer } from "@/components/layout/page-container";
import { it } from "date-fns/locale";
import { Link } from "wouter";

const AUDIENCES = [
  { value: "all", label: "Tutti", icon: Users },
  { value: "publicans", label: "Publican", icon: Beer },
  { value: "brewers", label: "Birrai", icon: Building2 },
  { value: "admins", label: "Admin", icon: Shield },
];

function audienceLabel(v: string) {
  return AUDIENCES.find(a => a.value === v)?.label ?? v;
}

export default function AdminBroadcast() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const roles = Array.isArray(user?.roles) ? (user.roles as string[]) : [];
  const isAdmin =
    user?.activeRole === "admin" ||
    roles.includes("admin") ||
    user?.userType === "admin";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audience, setAudience] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");

  const { data: history = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/broadcasts"],
    enabled: isAdmin,
  });
  const { data: sources = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/rss-sources"],
    enabled: isAdmin,
  });

  const sendMutation = useMutation({
    mutationFn: () => apiRequest("/api/admin/broadcasts", { method: "POST" },
      { title, body, url: url || undefined, imageUrl: imageUrl || undefined, audience }),
    onSuccess: (data: any) => {
      const sent = data?.sent_count ?? data?.sentCount ?? 0;
      const target = data?.targetCount ?? sent;
      toast({ title: `Inviato a ${sent}/${target} utenti` });
      setTitle(""); setBody(""); setUrl(""); setImageUrl("");
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/broadcasts"] });
    },
    onError: (e: any) => {
      setConfirmOpen(false);
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    },
  });

  const addSourceMutation = useMutation({
    mutationFn: () => apiRequest("/api/admin/rss-sources", { method: "POST" }, { name: newSourceName, url: newSourceUrl }),
    onSuccess: () => {
      setNewSourceName(""); setNewSourceUrl("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rss-sources"] });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/rss-sources/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/rss-sources"] }),
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiRequest("/api/admin/rss-sources/refresh", { method: "POST" }),
    onSuccess: (d: any) => toast({ title: `Refresh OK · ${d.totalItems} articoli totali` }),
  });

  const canPreview = title.trim().length > 0 && body.trim().length > 0 && !sendMutation.isPending;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[#15202B] flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-3">
          <Lock className="w-10 h-10 text-stone-400 mx-auto" />
          <h1 className="text-xl font-bold">Accesso riservato</h1>
          <p className="text-sm text-stone-500">Questa pagina è disponibile solo agli amministratori.</p>
          <Link href="/">
            <Button variant="outline" className="rounded-xl">Torna alla home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[#15202B] pb-24">
      <Helmet><title>Broadcast | Admin</title></Helmet>

      <header className="bg-white dark:bg-[#1B2735] border-b border-stone-100 dark:border-[#2F3D4D] py-5">
        <PageContainer variant="narrow" className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-black font-poppins">Push broadcast & News</h1>
        </PageContainer>
      </header>

      <PageContainer variant="narrow" as="main" className="py-4 space-y-6">

        {/* ── Compose broadcast ────────────────────────────────────────── */}
        <section className="bg-white dark:bg-[#1B2735] rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">Nuova notifica</h2>

          <div>
            <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Pubblico</label>
            <div className="flex gap-2 flex-wrap">
              {AUDIENCES.map(a => (
                <button key={a.value} onClick={() => setAudience(a.value)} type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    audience === a.value
                      ? "bg-primary text-white border-primary"
                      : "bg-stone-50 dark:bg-[#1B2735] text-stone-500 border-stone-200 dark:border-[#2F3D4D]"
                  }`}>
                  <a.icon className="w-3.5 h-3.5" /> {a.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Titolo</label>
            <Input value={title} onChange={e => setTitle(e.target.value.slice(0, 60))}
              placeholder="🎉 Novità!" className="rounded-xl" data-testid="input-broadcast-title" />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Testo</label>
            <Textarea value={body} onChange={e => setBody(e.target.value.slice(0, 200))}
              placeholder="Il messaggio che vedranno gli utenti…" rows={3}
              className="rounded-xl resize-none" data-testid="input-broadcast-body" />
            <p className="text-right text-[10px] text-stone-400 mt-1">{body.length}/200</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Link (opzionale)</label>
            <Input value={url} onChange={e => setUrl(e.target.value)}
              placeholder="/news oppure https://…" className="rounded-xl" data-testid="input-broadcast-url" />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 mb-1.5 block flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Immagine (opzionale)
            </label>
            <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
              placeholder="https://…/image.png" className="rounded-xl" data-testid="input-broadcast-image" />
          </div>

          <Button onClick={() => setConfirmOpen(true)} disabled={!canPreview}
            className="w-full rounded-xl h-11" data-testid="button-broadcast-preview">
            <Eye className="w-4 h-4 mr-2" /> Anteprima e invia
          </Button>
        </section>

        {/* ── Confirm dialog with preview ────────────────────────────── */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma invio broadcast</AlertDialogTitle>
              <AlertDialogDescription>
                Stai per inviare una notifica push a <strong>{audienceLabel(audience)}</strong>.
                Verifica l'anteprima prima di procedere.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="rounded-xl border border-stone-200 dark:border-[#2F3D4D] bg-stone-50 dark:bg-[#15202B]/50 p-3 my-2">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-50 break-words">{title || "Titolo"}</p>
                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 break-words whitespace-pre-wrap">{body || "Corpo del messaggio"}</p>
                  {url && <p className="text-[10px] text-primary mt-1.5 truncate">→ {url}</p>}
                </div>
              </div>
              {imageUrl && (
                <img src={imageUrl} alt="" className="mt-3 w-full rounded-lg object-cover max-h-40"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={sendMutation.isPending} data-testid="button-broadcast-cancel">Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); sendMutation.mutate(); }}
                disabled={sendMutation.isPending}
                data-testid="button-broadcast-confirm"
              >
                {sendMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Invio…</>
                  : <><Send className="w-4 h-4 mr-2" /> Conferma e invia</>}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── History ──────────────────────────────────────────────────── */}
        <section className="bg-white dark:bg-[#1B2735] rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-3">
            Storico invii {history.length > 0 && <span className="text-stone-400">· {history.length}</span>}
          </h2>
          {history.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-3">Nessun broadcast inviato</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {history.slice(0, 50).map(b => (
                <div key={b.id} className="border border-stone-100 dark:border-[#2F3D4D]/50 rounded-xl p-3" data-testid={`broadcast-history-${b.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-50 flex-1 break-words">{b.title}</p>
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase shrink-0">
                      {audienceLabel(b.audience)}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 break-words whitespace-pre-wrap">{b.body}</p>
                  {b.url && <p className="text-[10px] text-stone-400 mt-1 truncate">→ {b.url}</p>}
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {b.sent_count ?? 0} destinatari raggiunti
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {b.sent_by_username ? `@${b.sent_by_username} · ` : ""}
                      {formatDistanceToNow(new Date(b.created_at), { addSuffix: true, locale: it })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── RSS Sources ──────────────────────────────────────────────── */}
        <section className="bg-white dark:bg-[#1B2735] rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
              <Rss className="w-4 h-4" /> Fonti RSS news
            </h2>
            <Button variant="outline" size="sm" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending} className="rounded-full text-xs">
              {refreshMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Aggiorna ora
            </Button>
          </div>

          <div className="space-y-2 mb-4">
            {sources.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-3">Nessuna fonte</p>
            ) : sources.map(s => (
              <div key={s.id} className="flex items-center gap-2 border border-stone-100 dark:border-[#2F3D4D]/50 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{s.name}</p>
                  <p className="text-[11px] text-stone-400 truncate">{s.url}</p>
                </div>
                <button onClick={() => deleteSourceMutation.mutate(s.id)}
                  className="text-stone-400 hover:text-red-500 p-1.5">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-stone-100 dark:border-[#2F3D4D]/50 pt-4">
            <Input value={newSourceName} onChange={e => setNewSourceName(e.target.value)}
              placeholder="Nome (es. Cronache di Birra)" className="rounded-xl" />
            <Input value={newSourceUrl} onChange={e => setNewSourceUrl(e.target.value)}
              placeholder="URL feed RSS (https://…/feed/)" className="rounded-xl" />
            <Button onClick={() => addSourceMutation.mutate()} disabled={!newSourceName.trim() || !newSourceUrl.trim()}
              variant="outline" size="sm" className="rounded-xl">
              <Plus className="w-3.5 h-3.5 mr-1" /> Aggiungi fonte
            </Button>
          </div>
        </section>
      </PageContainer>
    </div>
  );
}
