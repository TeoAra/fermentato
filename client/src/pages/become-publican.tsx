import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Beer, Store, MapPin, Phone, FileText, ArrowLeft, CheckCircle } from "lucide-react";
import type { User } from "@shared/schema";

const becomePublicanSchema = z.object({
  pubName: z.string().min(2, "Il nome deve avere almeno 2 caratteri"),
  address: z.string().min(5, "Inserisci un indirizzo valido"),
  city: z.string().min(2, "Inserisci una città valida"),
  vatNumber: z.string().optional(),
  phone: z.string().optional(),
});

type BecomePublicanForm = z.infer<typeof becomePublicanSchema>;

export default function BecomePublican() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user: authUser, isLoading: authLoading } = useAuth();
  const user = authUser as User | null;
  const [success, setSuccess] = useState(false);

  const form = useForm<BecomePublicanForm>({
    resolver: zodResolver(becomePublicanSchema),
    defaultValues: {
      pubName: "",
      address: "",
      city: "",
      vatNumber: "",
      phone: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: BecomePublicanForm) => {
      const response = await apiRequest("/api/auth/become-publican", { method: "POST" }, data);
      return response.json();
    },
    onSuccess: (data) => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Congratulazioni!",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BecomePublicanForm) => {
    mutation.mutate(data);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Beer className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <CardTitle>Accedi per continuare</CardTitle>
            <CardDescription>
              Devi essere registrato per diventare un publican
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate("/login")}
              data-testid="button-go-to-login"
            >
              Vai al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.roles?.includes("pub_owner")) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle>Sei già un Publican!</CardTitle>
            <CardDescription>
              Puoi gestire i tuoi locali dalla dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate("/dashboard")}
              data-testid="button-go-to-dashboard"
            >
              Vai alla Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle>Benvenuto tra i Publican!</CardTitle>
            <CardDescription>
              Il tuo locale è stato registrato ed è in attesa di verifica.
              Riceverai una notifica quando sarà approvato.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => navigate("/dashboard")}
              data-testid="button-go-to-dashboard-success"
            >
              Vai alla Dashboard
            </Button>
            <Button 
              variant="outline"
              className="w-full" 
              onClick={() => navigate("/")}
              data-testid="button-go-to-home"
            >
              Torna alla Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>

        <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-amber-200 dark:border-amber-800">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <Store className="h-8 w-8 text-amber-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Diventa Publican</CardTitle>
            <CardDescription className="text-base">
              Registra il tuo locale su Fermenta.to e raggiungi migliaia di appassionati di birra artigianale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="pubName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome del Locale *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Store className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Es. Birrificio Roma" 
                            className="pl-10" 
                            data-testid="input-pub-name"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Indirizzo *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Es. Via Roma, 123" 
                            className="pl-10" 
                            data-testid="input-address"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Città *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Es. Roma" 
                          data-testid="input-city"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Es. +39 06 1234567" 
                            className="pl-10" 
                            data-testid="input-phone"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Opzionale - sarà visibile ai clienti
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partita IVA</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Es. IT12345678901" 
                            className="pl-10" 
                            data-testid="input-vat-number"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Opzionale - utile per la verifica del locale
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-amber-600 hover:bg-amber-700"
                    disabled={mutation.isPending}
                    data-testid="button-submit-publican"
                  >
                    {mutation.isPending ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Registrazione in corso...
                      </>
                    ) : (
                      <>
                        <Beer className="h-4 w-4 mr-2" />
                        Diventa Publican
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Registrandoti accetti i nostri termini di servizio e la privacy policy
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
