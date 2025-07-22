import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { pubRegistrationSchema } from "@shared/schema";
import { z } from "zod";
import { Store, MapPin, Phone, Mail, Globe, Building, FileText } from "lucide-react";
import { useLocation } from "wouter";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PubRegistrationForm = z.infer<typeof pubRegistrationSchema>;

const italianRegions = [
  "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna", "Friuli-Venezia Giulia",
  "Lazio", "Liguria", "Lombardia", "Marche", "Molise", "Piemonte", "Puglia", "Sardegna",
  "Sicilia", "Toscana", "Trentino-Alto Adige", "Umbria", "Valle d'Aosta", "Veneto"
];

export default function PubRegistration() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Accesso Richiesto",
        description: "Devi effettuare l'accesso per registrare un pub",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const form = useForm<PubRegistrationForm>({
    resolver: zodResolver(pubRegistrationSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      region: "",
      postalCode: "",
      phone: "",
      email: "",
      websiteUrl: "",
      description: "",
      vatNumber: "",
      businessName: "",
      isActive: true,
    },
  });

  const registrationMutation = useMutation({
    mutationFn: async (data: PubRegistrationForm) => {
      return apiRequest("POST", "/api/pubs", data);
    },
    onSuccess: (pub) => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pubs"] });
      toast({
        title: "Successo!",
        description: `Il pub "${pub.name}" è stato registrato correttamente`,
      });
      navigate("/pub-dashboard");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Accesso Scaduto",
          description: "La tua sessione è scaduta. Effettua nuovamente l'accesso",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      console.error("Registration error:", error);
      toast({
        title: "Errore nella Registrazione",
        description: error.message || "Si è verificato un errore durante la registrazione del pub",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PubRegistrationForm) => {
    registrationMutation.mutate(data);
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-6"></div>
            <div className="h-96 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Store className="text-primary mr-3" size={48} />
            <h1 className="text-4xl font-bold text-secondary">Registra il tuo Pub</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Unisciti a Fermenta.to e porta il tuo pub nel mondo della birra artigianale italiana. 
            Gestisci facilmente la tua tap list e fai scoprire le tue birre agli appassionati.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-white" size={24} />
              </div>
              <h3 className="font-semibold mb-2">Gestione Facile</h3>
              <p className="text-sm text-gray-600">Dashboard intuitiva per aggiornare tap list e prezzi in tempo reale</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="text-white" size={24} />
              </div>
              <h3 className="font-semibold mb-2">Visibilità Online</h3>
              <p className="text-sm text-gray-600">Raggiungi migliaia di appassionati di birra artigianale</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="text-white" size={24} />
              </div>
              <h3 className="font-semibold mb-2">Crescita Business</h3>
              <p className="text-sm text-gray-600">Attira nuovi clienti e fidelizza quelli esistenti</p>
            </CardContent>
          </Card>
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-secondary">Informazioni del Pub</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Business Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-secondary border-b border-gray-200 pb-2">
                    Dati Aziendali
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Building className="mr-2" size={16} />
                            Ragione Sociale *
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="es. Pub Rossi S.r.l."
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            La ragione sociale registrata della tua attività
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
                          <FormLabel className="flex items-center">
                            <FileText className="mr-2" size={16} />
                            Partita IVA *
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="es. 12345678901"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            La tua Partita IVA (11 caratteri)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Pub Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-secondary border-b border-gray-200 pb-2">
                    Informazioni del Pub
                  </h3>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Store className="mr-2" size={16} />
                          Nome del Pub *
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="es. The Hop House"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Il nome con cui è conosciuto il tuo pub
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrizione</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Racconta ai tuoi clienti cosa rende speciale il tuo pub..."
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Una breve descrizione del tuo pub e della sua atmosfera
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Address */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-secondary border-b border-gray-200 pb-2">
                    Indirizzo
                  </h3>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <MapPin className="mr-2" size={16} />
                          Indirizzo Completo *
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="es. Via Roma 123"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Città *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="es. Milano"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Regione *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona regione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {italianRegions.map((region) => (
                                <SelectItem key={region} value={region}>
                                  {region}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CAP</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="es. 20121"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-secondary border-b border-gray-200 pb-2">
                    Contatti
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Phone className="mr-2" size={16} />
                            Telefono
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="es. +39 02 1234567"
                              type="tel"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Mail className="mr-2" size={16} />
                            Email
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="es. info@iltuopub.it"
                              type="email"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Globe className="mr-2" size={16} />
                          Sito Web
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="es. https://www.iltuopub.it"
                            type="url"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Il sito web del tuo pub (opzionale)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-center pt-6">
                  <Button 
                    type="submit" 
                    className="bg-primary text-white hover:bg-orange-600 px-12 py-3 text-lg"
                    disabled={registrationMutation.isPending}
                  >
                    {registrationMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Registrazione in corso...
                      </>
                    ) : (
                      <>
                        <Store className="mr-2" size={20} />
                        Registra il Pub
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-secondary mb-4">Prossimi Passi</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xs">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">Verifica Dati</h4>
                  <p className="text-gray-600">I tuoi dati verranno verificati entro 24 ore</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xs">
                  2
                </div>
                <div>
                  <h4 className="font-semibold">Setup Dashboard</h4>
                  <p className="text-gray-600">Accedi alla dashboard per configurare tap list e menu</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xs">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">Vai Online</h4>
                  <p className="text-gray-600">Il tuo pub sarà visibile a tutti gli utenti di Fermenta.to</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
