import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import RichTextEditor from "@/components/rich-text-editor";
import { ArrowLeft, FileText, Edit, CheckCircle, Clock } from "lucide-react";
import { Link } from "wouter";
import { PageContainer } from "@/components/layout/page-container";
import type { StaticPage } from "@shared/schema";

const PAGE_META: Record<string, { label: string; desc: string }> = {
  "contatti":  { label: "Contatti",       desc: "Informazioni di contatto e form" },
  "chi-siamo": { label: "Chi Siamo",      desc: "Storia e missione di Fermenta.to" },
  "prezzi":    { label: "Prezzi e Piani", desc: "Piani subscription per pub e birrifici" },
  "supporto":  { label: "Supporto",       desc: "FAQ e assistenza agli utenti" },
};

export default function AdminPages() {
  const { toast } = useToast();
  const [editing, setEditing] = useState<StaticPage | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: pages = [], isLoading } = useQuery<StaticPage[]>({
    queryKey: ["/api/admin/pages"],
  });

  const saveMutation = useMutation({
    mutationFn: ({ slug, title, content }: { slug: string; title: string; content: string }) =>
      apiRequest(`/api/admin/pages/${slug}`, { method: "PUT" }, { title, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pages"] });
      toast({ title: "Pagina salvata", description: "Le modifiche sono state salvate." });
      setEditing(null);
    },
    onError: () => toast({ title: "Errore", description: "Salvataggio fallito.", variant: "destructive" }),
  });

  const openEditor = (page: StaticPage) => {
    setEditing(page);
    setTitle(page.title);
    setContent(page.content);
  };

  const handleSave = () => {
    if (!editing) return;
    saveMutation.mutate({ slug: editing.slug, title, content });
  };

  if (editing) {
    const meta = PAGE_META[editing.slug];
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
        <PageContainer variant="standard" className="py-8">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Torna alla lista
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Modifica: {meta?.label ?? editing.title}
              </h1>
              {meta && <p className="text-sm text-gray-500 dark:text-gray-400">{meta.desc}</p>}
            </div>
          </div>

          <div className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 p-6 space-y-5">
            <div className="space-y-1.5">
              <Label>Titolo della pagina</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es. Contatti"
                className="text-base font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Contenuto</Label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder={`Scrivi il contenuto della pagina ${meta?.label ?? editing.title}...`}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-neutral-800">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                URL pubblica: <span className="font-mono">/{editing.slug}</span>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Annulla</Button>
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {saveMutation.isPending ? "Salvataggio..." : "Salva modifiche"}
                </Button>
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <PageContainer variant="narrow" className="py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestione Pagine</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Modifica le pagine statiche del sito</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-neutral-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(PAGE_META).map(([slug, meta]) => {
              const page = pages.find(p => p.slug === slug);
              return (
                <div
                  key={slug}
                  className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 rounded-2xl p-5 flex items-center gap-4 hover:border-primary/30"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex-shrink-0">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{meta.label}</h3>
                      {page ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" /> Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" /> Non creata
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{meta.desc}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">/{slug}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditor(page ?? { id: 0, slug, title: meta.label, content: "", updatedAt: new Date() })}
                  >
                    <Edit className="h-4 w-4 mr-1" /> Modifica
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300">
          <strong>Suggerimento:</strong> Le pagine sono visibili a tutti nel footer del sito. Usa l'editor per aggiungere testo formattato, immagini e link.
        </div>
      </PageContainer>
    </div>
  );
}
