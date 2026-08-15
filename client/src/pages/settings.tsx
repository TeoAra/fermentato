import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useHideGlobalBottomNav } from "@/components/bottom-navigation";
import AccountSettings from "@/components/profile/AccountSettings";

/**
 * Impostazioni account (/impostazioni) — pagina dedicata separata dal
 * profilo pubblico/identità. Ospita foto, nickname, email, privacy,
 * cambio ruolo, password ed eliminazione account.
 */
export default function SettingsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  useHideGlobalBottomNav();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Accesso richiesto",
        description: "Devi essere autenticato per accedere alle impostazioni",
        variant: "destructive",
      });
      setTimeout(() => setLocation("/login"), 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-200/50 rounded-xl w-40" />
          <div className="h-64 bg-stone-100/50 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      <Helmet>
        <title>Impostazioni account | Fermenta.to</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div
        className="container mx-auto px-4 py-8 max-w-3xl"
        style={{ paddingBottom: "calc(96px + var(--frozen-sab))" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/profile">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Profilo
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground dark:text-white">Impostazioni</h1>
        </div>

        <AccountSettings />
      </div>
    </div>
  );
}
