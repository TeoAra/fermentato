import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Trash2, LogIn, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function AccountDeletePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [step, setStep] = useState<"info" | "confirm" | "done">("info");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await apiRequest("/api/user/delete", { method: "DELETE" });
      setStep("done");
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } catch {
      setError("Impossibile eliminare l'account. Riprova più tardi.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Eliminazione account</h1>
          <p className="text-muted-foreground text-sm">fermenta.to</p>
        </div>

        {step === "done" ? (
          <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <p className="font-medium">Account eliminato con successo.</p>
              <p className="text-sm text-muted-foreground">
                Tutti i tuoi dati sono stati rimossi. Verrai reindirizzato alla home tra qualche secondo.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Cosa viene eliminato
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <ul className="list-disc list-inside space-y-1">
                  <li>Profilo e dati personali</li>
                  <li>Recensioni, check-in e preferiti</li>
                  <li>Abbonamenti a notifiche push</li>
                  <li>Account Google / Apple collegati</li>
                  <li>Locali e taplist gestiti (se sei titolare)</li>
                </ul>
                <p className="pt-2 text-xs">
                  I dati delle birre e dei birrifici rimangono nel database in forma anonima.
                  L'eliminazione è <strong>irreversibile</strong>.
                </p>
              </CardContent>
            </Card>

            {isLoading ? null : !isAuthenticated ? (
              <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                <CardContent className="pt-6 space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Devi essere loggato per eliminare il tuo account.
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/auth">
                      <LogIn className="mr-2 h-4 w-4" />
                      Accedi
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : step === "info" ? (
              <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                <CardContent className="pt-6 space-y-4">
                  <p className="text-sm">
                    Sei loggato come <strong>{(user as any)?.displayName || (user as any)?.email || "utente"}</strong>.
                  </p>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setStep("confirm")}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Richiedi eliminazione account
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/profile">Annulla — torna al profilo</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Conferma eliminazione</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Sei sicuro? Questa azione non può essere annullata.
                  </p>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Eliminazione in corso…" : "Sì, elimina definitivamente"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setStep("info")}
                    disabled={isDeleting}
                  >
                    Annulla
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Per assistenza scrivi a{" "}
          <a href="mailto:info@fermenta.to" className="underline">
            info@fermenta.to
          </a>
        </p>
      </div>
    </div>
  );
}
