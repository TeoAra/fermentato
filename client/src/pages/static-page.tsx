import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { StaticPage } from "@shared/schema";

const SLUG_MAP: Record<string, string> = {
  "/contatti":  "contatti",
  "/chi-siamo": "chi-siamo",
  "/prezzi":    "prezzi",
  "/supporto":  "supporto",
};

interface StaticPageViewProps {
  slug: string;
}

function StaticPageView({ slug }: StaticPageViewProps) {
  const { data: page, isLoading, isError } = useQuery<StaticPage>({
    queryKey: ["/api/pages", slug],
    queryFn: () => fetch(`/api/pages/${slug}`).then(r => {
      if (!r.ok) throw new Error("not found");
      return r.json();
    }),
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-40" />
        <div className="space-y-3 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pagina non trovata</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Questa pagina non è ancora stata configurata dall'amministratore.
        </p>
        <Link href="/">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Torna alla home</Button>
        </Link>
      </div>
    );
  }

  const updatedDate = page.updatedAt
    ? new Date(page.updatedAt).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/">
        <Button variant="ghost" size="sm" className="mb-6 text-gray-500 hover:text-gray-900 dark:hover:text-white -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Torna alla home
        </Button>
      </Link>

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
        {page.title}
      </h1>

      {updatedDate && (
        <div className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 mb-8">
          <Clock className="h-3.5 w-3.5" />
          <span>Aggiornato il {updatedDate}</span>
        </div>
      )}

      <div
        className="prose prose-gray dark:prose-invert max-w-none
          prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
          prose-a:text-amber-600 dark:prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
          prose-img:rounded-xl prose-img:shadow-md
          prose-hr:border-gray-200 dark:prose-hr:border-slate-700"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  );
}

export function ContattiPage() {
  return <div className="min-h-screen bg-white dark:bg-slate-950 pt-20 pb-24"><StaticPageView slug="contatti" /></div>;
}

export function ChiSiamoPage() {
  return <div className="min-h-screen bg-white dark:bg-slate-950 pt-20 pb-24"><StaticPageView slug="chi-siamo" /></div>;
}

export function PrezziPage() {
  return <div className="min-h-screen bg-white dark:bg-slate-950 pt-20 pb-24"><StaticPageView slug="prezzi" /></div>;
}

export function SupportoPage() {
  return <div className="min-h-screen bg-white dark:bg-slate-950 pt-20 pb-24"><StaticPageView slug="supporto" /></div>;
}
