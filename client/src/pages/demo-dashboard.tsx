import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Database, Utensils, Beer, Coffee } from "lucide-react";

export default function DemoDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const seedDemoMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/seed-demo", "POST");
    },
    onSuccess: () => {
      toast({
        title: "Dati Demo Caricati",
        description: "Tutti i locali ora hanno taplist, cantina e menu completi!",
      });
      queryClient.invalidateQueries();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore nel caricamento dei dati demo",
        variant: "destructive",
      });
    },
  });

  // Simula login demo
  const handleDemoLogin = () => {
    localStorage.setItem('demo_user', 'true');
    toast({
      title: "Modalità Demo Attivata",
      description: "Ora puoi accedere alla dashboard dei locali",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna alla Home
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-orange-800 dark:text-orange-200">
                Dashboard Demo
              </h1>
              <p className="text-lg text-orange-600 dark:text-orange-300 mt-2">
                Gestisci i dati demo di Fermenta.to
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Carica Dati Demo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-orange-600" />
                  Carica Dati Demo
                </CardTitle>
                <CardDescription>
                  Popola il database con dati realistici per tutti i locali
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <p className="mb-2">Questo caricherà:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>4 pub demo con informazioni complete</li>
                      <li>Taplist con birre italiane autentiche</li>
                      <li>Cantina con birre in bottiglia</li>
                      <li>Menu con piatti regionali e allergeni</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={() => seedDemoMutation.mutate()}
                    disabled={seedDemoMutation.isPending}
                    className="w-full"
                  >
                    {seedDemoMutation.isPending ? "Caricamento..." : "Carica Dati Demo"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Modalità Demo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-orange-600" />
                  Modalità Demo
                </CardTitle>
                <CardDescription>
                  Attiva l'accesso alla dashboard senza login
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <p>Attiva la modalità demo per:</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Accedere alla dashboard pub</li>
                      <li>Gestire taplist e menu</li>
                      <li>Testare tutte le funzionalità</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={handleDemoLogin}
                    variant="outline"
                    className="w-full"
                  >
                    Attiva Modalità Demo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Collegamenti Rapidi */}
          <Card>
            <CardHeader>
              <CardTitle>Collegamenti Rapidi Demo</CardTitle>
              <CardDescription>
                Accedi rapidamente alle funzionalità demo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Link href="/pub-dashboard">
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <Utensils className="w-6 h-6" />
                    <span>Dashboard Pub</span>
                  </Button>
                </Link>
                
                <Link href="/pubs">
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <Beer className="w-6 h-6" />
                    <span>Elenco Pub</span>
                  </Button>
                </Link>
                
                <Link href="/breweries">
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <Coffee className="w-6 h-6" />
                    <span>Birrifici</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Informazioni Dati Demo */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Dettagli Dati Demo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Locali Demo:</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                    <li>• The Hop Garden (Milano)</li>
                    <li>• Birrificio del Borgo (Roma)</li>
                    <li>• Malto & Luppolo (Torino)</li>
                    <li>• La Cantina delle Birre (Firenze)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Contenuti per ogni locale:</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                    <li>• 3-4 birre in taplist con prezzi</li>
                    <li>• 2-3 birre in cantina</li>
                    <li>• 3-4 categorie di menu</li>
                    <li>• 8-15 piatti con allergeni</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}