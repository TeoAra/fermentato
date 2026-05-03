import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Send, Loader2, Megaphone, Users, Beer, Building2, Shield, Rss, Trash2, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

const AUDIENCES = [
  { value: "all", label: "Tutti", icon: Users },
  { value: "publicans", label: "Publican", icon: Beer },
  { value: "brewers", label: "Birrai", icon: Building2 },
  { value: "admins", label: "Admin", icon: Shield },
];

export default function AdminBroadcast() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [audience, setAudience] = useState("all");
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");

  const { data: history = [] } = useQuery<any[]>({ queryKey: ["/api/admin/broadcasts"] });
  const { data: sources = [] } = useQuery<any[]>({ queryKey: ["/api/admin/rss-sources"] });

  const sendMutation = useMutation({
    mutationFn: () => apiRequest("/api/admin/broadcasts", { method: "POST" },
      { title, body, url: url || undefined, audience }),
    onSuccess: (data: any) => {
      toast({ title: `Inviato a ${data.sentCount}/${data.targetCount} utenti` });
      setTitle(""); setBody(""); setUrl("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/broadcasts"] });
    },
    onError: (e: any) => toast({ title: "Errore", description: e.message, variant: "destructive" }),
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

  const canSend = title.trim() && body.trim() && !sendMutation.isPending;

  return (
    <div className="min-h-screen bg-[hsl(36,10%,95%)] dark:bg-[hsl(220,5%,14%)] pb-24">
      <Helmet><title>Broadcast | Admin</title></Helmet>

      <header className="bg-white dark:bg-[hsl(220,5%,18%)] border-b border-stone-100 dark:border-stone-800 px-4 py-5">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-black font-poppins">Push broadcast & News</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">

        {/* ── Compose broadcast ────────────────────────────────────────── */}
        <section className="bg-white dark:bg-[hsl(220,5%,18%)] rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">Nuova notifica</h2>

          <div>
            <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Pubblico</label>
            <div className="flex gap-2 flex-wrap">
              {AUDIENCES.map(a => (
                <button key={a.value} onClick={() => setAudience(a.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    audience === a.value
                      ? "bg-primary text-white border-primary"
                      : "bg-stone-50 dark:bg-stone-800 text-stone-500 border-stone-200 dark:border-stone-700"
                  }`}>
                  <a.icon className="w-3.5 h-3.5" /> {a.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Titolo</label>
            <Input value={title} onChange={e => setTitle(e.target.value.slice(0, 60))}
              placeholder="🎉 Novità!" className="rounded-xl" />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Testo</label>
            <Textarea value={body} onChange={e => setBody(e.target.value.slice(0, 200))}
              placeholder="Il messaggio che vedranno gli utenti…" rows={3}
              className="rounded-xl resize-none" />
            <p className="text-right text-[10px] text-stone-400 mt-1">{body.length}/200</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 mb-1.5 block">Link (opzionale)</label>
            <Input value={url} onChange={e => setUrl(e.target.value)}
              placeholder="/news oppure https://…" className="rounded-xl" />
          </div>

          <Button onClick={() => sendMutation.mutate()} disabled={!canSend}
            className="w-full rounded-xl h-11">
            {sendMutation.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Invio in corso…</>
              : <><Send className="w-4 h-4 mr-2" /> Invia broadcast</>}
          </Button>
        </section>

        {/* ── History ──────────────────────────────────────────────────── */}
        {history.length > 0 && (
          <section className="bg-white dark:bg-[hsl(220,5%,18%)] rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-3">Storico invii</h2>
            <div className="space-y-2">
              {history.slice(0, 10).map(b => (
                <div key={b.id} className="border border-stone-100 dark:border-stone-700/50 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-50 flex-1">{b.title}</p>
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">{b.audience}</span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{b.body}</p>
                  <p className="text-[10px] text-stone-400 mt-2">
                    {b.sent_count} inviati · {formatDistanceToNow(new Date(b.created_at), { addSuffix: true, locale: it })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── RSS Sources ──────────────────────────────────────────────── */}
        <section className="bg-white dark:bg-[hsl(220,5%,18%)] rounded-2xl shadow-sm p-5">
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
              <div key={s.id} className="flex items-center gap-2 border border-stone-100 dark:border-stone-700/50 rounded-xl p-3">
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

          <div className="space-y-2 border-t border-stone-100 dark:border-stone-700/50 pt-4">
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
      </main>
    </div>
  );
}
