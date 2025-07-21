import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Beer, Plus, Edit, Trash2, BarChart } from "lucide-react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

export default function PubDashboard() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: myPubs, isLoading: pubsLoading } = useQuery({
    queryKey: ["/api/my-pubs"],
    enabled: !!isAuthenticated,
  });

  const { data: tapLists } = useQuery({
    queryKey: ["/api/my-pubs", "taplists"],
    enabled: !!myPubs && myPubs.length > 0,
    queryFn: async () => {
      if (!myPubs) return [];
      const promises = myPubs.map((pub: any) =>
        fetch(`/api/pubs/${pub.id}/taplist`).then(res => res.json())
      );
      return Promise.all(promises);
    },
  });

  const removeBeerMutation = useMutation({
    mutationFn: async (tapId: number) => {
      await apiRequest("DELETE", `/api/taplist/${tapId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-pubs"] });
      toast({
        title: "Successo",
        description: "Birra rimossa dalla spina",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Errore",
        description: "Errore durante la rimozione della birra",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary">Dashboard Pub</h1>
            <p className="text-gray-600">Gestisci i tuoi pub e le tap list</p>
          </div>
          
          {(!myPubs || myPubs.length === 0) && (
            <Button className="bg-primary text-white hover:bg-orange-600">
              <Plus className="mr-2" size={16} />
              Registra il tuo primo Pub
            </Button>
          )}
        </div>

        {pubsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        ) : myPubs && myPubs.length > 0 ? (
          <div className="space-y-8">
            {/* Pub Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Beer className="text-primary mr-3" size={24} />
                    <div>
                      <p className="text-sm text-gray-600">Pub Attivi</p>
                      <p className="text-2xl font-bold">{myPubs.filter((pub: any) => pub.isActive).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <BarChart className="text-primary mr-3" size={24} />
                    <div>
                      <p className="text-sm text-gray-600">Birre in Spina</p>
                      <p className="text-2xl font-bold">
                        {tapLists ? tapLists.flat().filter((tap: any) => tap.isActive).length : 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="text-primary mr-3">⭐</div>
                    <div>
                      <p className="text-sm text-gray-600">Rating Medio</p>
                      <p className="text-2xl font-bold">
                        {myPubs.length > 0
                          ? (myPubs.reduce((sum: number, pub: any) => sum + parseFloat(pub.rating || 0), 0) / myPubs.length).toFixed(1)
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="text-primary mr-3">👥</div>
                    <div>
                      <p className="text-sm text-gray-600">Visualizzazioni</p>
                      <p className="text-2xl font-bold">N/A</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pub List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {myPubs.map((pub: any, index: number) => (
                <Card key={pub.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        {pub.name}
                        {!pub.isActive && (
                          <Badge variant="destructive" className="ml-2">Inattivo</Badge>
                        )}
                      </CardTitle>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit size={16} />
                        </Button>
                        <Button variant="outline" size="sm">
                          <BarChart size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-gray-600 mb-4">{pub.address}, {pub.city}</p>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Birre alla Spina</h4>
                        <Button size="sm" variant="outline">
                          <Plus size={16} className="mr-1" />
                          Aggiungi
                        </Button>
                      </div>
                      
                      {tapLists && tapLists[index] && tapLists[index].length > 0 ? (
                        <div className="space-y-2">
                          {tapLists[index].filter((tap: any) => tap.isActive).slice(0, 3).map((tap: any) => (
                            <div key={tap.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <span className="font-medium">{tap.beer?.name || 'N/A'}</span>
                                <span className="text-sm text-gray-500 ml-2">
                                  {tap.beer?.brewery?.name || 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-primary">
                                  €{tap.priceMedium || 'N/A'}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeBeerMutation.mutate(tap.id)}
                                  disabled={removeBeerMutation.isPending}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>
                          ))}
                          {tapLists[index].filter((tap: any) => tap.isActive).length > 3 && (
                            <p className="text-sm text-gray-500 text-center">
                              +{tapLists[index].filter((tap: any) => tap.isActive).length - 3} altre birre
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">
                          Nessuna birra in spina
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          // No pubs registered
          <div className="text-center py-16">
            <Beer className="mx-auto text-gray-400 mb-6" size={64} />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Nessun pub registrato</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Inizia registrando il tuo primo pub su Fermenta.to per gestire la tap list e il menu.
            </p>
            <Button className="bg-primary text-white hover:bg-orange-600">
              <Plus className="mr-2" size={16} />
              Registra il tuo Pub
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
