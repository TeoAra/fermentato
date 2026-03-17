import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Store, 
  Factory,
  CheckCircle, 
  XCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  Building2,
  User,
  ArrowLeft,
  FileText,
  Globe
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PublicanRequest {
  id: number;
  userId: string;
  pubName: string;
  pubAddress: string;
  pubCity: string;
  pubRegion: string | null;
  vatNumber: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
}

interface BreweryRequest {
  id: number;
  userId: string;
  breweryName: string;
  breweryLocation: string;
  breweryRegion: string | null;
  breweryCountry: string | null;
  vatNumber: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  description: string | null;
  existingBreweryId: number | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
}

type DialogTarget = {
  type: "pub";
  request: PublicanRequest;
} | {
  type: "brewery";
  request: BreweryRequest;
};

export default function AdminPublicanRequests() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  const urlSection = new URLSearchParams(window.location.search).get('section');
  const [section, setSection] = useState<"pub" | "brewery">(urlSection === 'pub' ? 'pub' : 'brewery');
  const [activeTab, setActiveTab] = useState("pending");
  const [adminNotes, setAdminNotes] = useState("");
  const [dialogAction, setDialogAction] = useState<"approve" | "reject" | null>(null);
  const [dialogTarget, setDialogTarget] = useState<DialogTarget | null>(null);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !(user as any)?.roles?.includes('admin'))) {
      toast({
        title: "Accesso negato",
        description: "Solo gli amministratori possono accedere a questa pagina",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = user ? "/" : "/login";
      }, 1000);
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: requests = [], isLoading: requestsLoading } = useQuery<PublicanRequest[]>({
    queryKey: ["/api/admin/publican-requests"],
    enabled: isAuthenticated && (user as any)?.roles?.includes('admin'),
  });

  const { data: breweryRequests = [], isLoading: breweryRequestsLoading } = useQuery<BreweryRequest[]>({
    queryKey: ["/api/admin/brewery-requests"],
    enabled: isAuthenticated && (user as any)?.roles?.includes('admin'),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: number; adminNotes: string }) => {
      return apiRequest(`/api/admin/publican-requests/${id}/approve`, { method: "POST" }, { adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/publican-requests"] });
      toast({
        title: "Richiesta approvata",
        description: "Il locale è stato creato e l'utente ora può gestirlo",
      });
      setDialogTarget(null);
      setDialogAction(null);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'approvazione",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: number; adminNotes: string }) => {
      return apiRequest(`/api/admin/publican-requests/${id}/reject`, { method: "POST" }, { adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/publican-requests"] });
      toast({
        title: "Richiesta rifiutata",
        description: "La richiesta è stata rifiutata",
      });
      setDialogTarget(null);
      setDialogAction(null);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante il rifiuto",
        variant: "destructive",
      });
    },
  });

  const breweryApproveMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: number; adminNotes: string }) => {
      return apiRequest(`/api/admin/brewery-requests/${id}/approve`, { method: "POST" }, { adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brewery-requests"] });
      toast({
        title: "Richiesta approvata",
        description: "Il birrificio è stato creato e l'utente ora può gestirlo",
      });
      setDialogTarget(null);
      setDialogAction(null);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'approvazione",
        variant: "destructive",
      });
    },
  });

  const breweryRejectMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: number; adminNotes: string }) => {
      return apiRequest(`/api/admin/brewery-requests/${id}/reject`, { method: "POST" }, { adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brewery-requests"] });
      toast({
        title: "Richiesta rifiutata",
        description: "La richiesta è stata rifiutata",
      });
      setDialogTarget(null);
      setDialogAction(null);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante il rifiuto",
        variant: "destructive",
      });
    },
  });

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const pendingBreweryRequests = breweryRequests.filter(r => r.status === 'pending');
  const approvedBreweryRequests = breweryRequests.filter(r => r.status === 'approved');
  const rejectedBreweryRequests = breweryRequests.filter(r => r.status === 'rejected');

  const handlePubAction = (request: PublicanRequest, action: "approve" | "reject") => {
    setDialogTarget({ type: "pub", request });
    setDialogAction(action);
    setAdminNotes("");
  };

  const handleBreweryAction = (request: BreweryRequest, action: "approve" | "reject") => {
    setDialogTarget({ type: "brewery", request });
    setDialogAction(action);
    setAdminNotes("");
  };

  const confirmAction = () => {
    if (!dialogTarget || !dialogAction) return;
    
    const id = dialogTarget.request.id;
    if (dialogTarget.type === "pub") {
      if (dialogAction === "approve") {
        approveMutation.mutate({ id, adminNotes });
      } else {
        rejectMutation.mutate({ id, adminNotes });
      }
    } else {
      if (dialogAction === "approve") {
        breweryApproveMutation.mutate({ id, adminNotes });
      } else {
        breweryRejectMutation.mutate({ id, adminNotes });
      }
    }
  };

  const isAnyMutationPending = approveMutation.isPending || rejectMutation.isPending || breweryApproveMutation.isPending || breweryRejectMutation.isPending;

  if (isLoading || requestsLoading || breweryRequestsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const dialogName = dialogTarget
    ? dialogTarget.type === "pub"
      ? (dialogTarget.request as PublicanRequest).pubName
      : (dialogTarget.request as BreweryRequest).breweryName
    : "";

  const RequestCard = ({ request, showActions = false }: { request: PublicanRequest; showActions?: boolean }) => (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-lg">{request.pubName}</h3>
              <Badge 
                variant={
                  request.status === 'pending' ? 'secondary' : 
                  request.status === 'approved' ? 'default' : 
                  'destructive'
                }
              >
                {request.status === 'pending' ? 'In attesa' : 
                 request.status === 'approved' ? 'Approvata' : 'Rifiutata'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{request.pubAddress}, {request.pubCity}</span>
                {request.pubRegion && <span>({request.pubRegion})</span>}
              </div>
              
              {request.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{request.phone}</span>
                </div>
              )}
              
              {request.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{request.email}</span>
                </div>
              )}
              
              {request.vatNumber && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>P.IVA: {request.vatNumber}</span>
                </div>
              )}
            </div>

            {request.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {request.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>
                  {request.userFirstName} {request.userLastName} ({request.userEmail})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: it })}
                </span>
              </div>
            </div>

            {request.adminNotes && (
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mt-2">
                <p className="text-sm">
                  <strong>Note admin:</strong> {request.adminNotes}
                </p>
                {request.reviewedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Rivista il {format(new Date(request.reviewedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                  </p>
                )}
              </div>
            )}
          </div>

          {showActions && (
            <div className="flex flex-col gap-2 items-end">
              <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-2.5 py-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                Attivazione via Stripe
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handlePubAction(request, "reject")}
                data-testid={`button-reject-${request.id}`}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rifiuta
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const BreweryRequestCard = ({ request, showActions = false }: { request: BreweryRequest; showActions?: boolean }) => {
    const locationParts = [
      request.breweryLocation,
      request.breweryRegion ? `(${request.breweryRegion})` : null,
      request.breweryCountry && request.breweryCountry !== 'Italia' ? request.breweryCountry : null,
    ].filter(Boolean).join(' ');

    return (
      <Card className="mb-4 overflow-hidden">
        <CardContent className="pt-5 pb-4">
          {/* Header row: icon + name + badges */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
              <Factory className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-semibold text-base text-gray-900 dark:text-white">{request.breweryName}</h3>
                <Badge
                  className={`text-xs px-2 py-0.5 ${
                    request.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200' :
                    request.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200' :
                    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200'
                  }`}
                  variant="outline"
                >
                  {request.status === 'pending' ? 'In attesa' : request.status === 'approved' ? 'Approvata' : 'Rifiutata'}
                </Badge>
                {request.existingBreweryId && (
                  <Badge variant="outline" className="text-xs">Birrificio esistente #{request.existingBreweryId}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 ml-12">
            {locationParts && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-gray-400" />
                <span>{locationParts}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-x-6 gap-y-1.5">
              {request.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                  <span>{request.phone}</span>
                </div>
              )}
              {request.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                  <span>{request.email}</span>
                </div>
              )}
              {request.vatNumber && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-gray-400" />
                  <span>P.IVA: {request.vatNumber}</span>
                </div>
              )}
              {request.websiteUrl && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0 text-gray-400" />
                  <a href={request.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline truncate max-w-xs">
                    {request.websiteUrl}
                  </a>
                </div>
              )}
            </div>

            {request.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">{request.description}</p>
            )}

            {request.adminNotes && (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Note admin: {request.adminNotes}</p>
                {request.reviewedAt && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(request.reviewedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer: user info + actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{request.userEmail || [request.userFirstName, request.userLastName].filter(Boolean).join(' ') || '—'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: it })}</span>
              </div>
            </div>

            {showActions && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleBreweryAction(request, "approve")}
                  className="bg-green-600 hover:bg-green-700 h-8 px-3 text-xs"
                  data-testid={`button-approve-brewery-${request.id}`}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Approva
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBreweryAction(request, "reject")}
                  className="h-8 px-3 text-xs"
                  data-testid={`button-reject-brewery-${request.id}`}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Rifiuta
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna al pannello admin
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-amber-600" />
              Richieste Registrazione
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestisci le richieste di registrazione di locali e birrifici
            </p>
          </div>
          
          <div className="flex gap-2">
            {pendingRequests.length > 0 && (
              <Badge className="bg-amber-500 text-white">
                <Store className="h-3 w-3 mr-1" />
                {pendingRequests.length} pub
              </Badge>
            )}
            {pendingBreweryRequests.length > 0 && (
              <Badge className="bg-amber-500 text-white">
                <Factory className="h-3 w-3 mr-1" />
                {pendingBreweryRequests.length} birrifici
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card 
          className={`cursor-pointer transition-all ${section === "pub" ? "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950" : "hover:bg-gray-50 dark:hover:bg-gray-900"}`}
          onClick={() => { setSection("pub"); setActiveTab("pending"); }}
        >
          <CardContent className="flex items-center gap-3 py-4">
            <Store className={`h-6 w-6 ${section === "pub" ? "text-amber-600" : "text-gray-400"}`} />
            <div>
              <p className={`font-semibold ${section === "pub" ? "text-amber-700 dark:text-amber-400" : ""}`}>Richieste Pub</p>
              <p className="text-xs text-gray-500">{requests.length} totali · {pendingRequests.length} in attesa</p>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${section === "brewery" ? "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950" : "hover:bg-gray-50 dark:hover:bg-gray-900"}`}
          onClick={() => { setSection("brewery"); setActiveTab("pending"); }}
        >
          <CardContent className="flex items-center gap-3 py-4">
            <Factory className={`h-6 w-6 ${section === "brewery" ? "text-amber-600" : "text-gray-400"}`} />
            <div>
              <p className={`font-semibold ${section === "brewery" ? "text-amber-700 dark:text-amber-400" : ""}`}>Richieste Birrificio</p>
              <p className="text-xs text-gray-500">{breweryRequests.length} totali · {pendingBreweryRequests.length} in attesa</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {section === "pub" && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-4 flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
            <span>
              <strong>Attivazione automatica via Stripe.</strong> I nuovi pub si attivano autonomamente dopo il checkout (prova gratuita 15 giorni → €65/anno). Non è necessaria approvazione manuale. Questa sezione mostra solo lo storico e permette di rifiutare richieste anomale.
            </span>
          </div>
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              In attesa ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Approvate ({approvedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4" />
              Rifiutate ({rejectedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Nessuna richiesta in attesa
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map((request) => (
                <RequestCard key={request.id} request={request} showActions />
              ))
            )}
          </TabsContent>

          <TabsContent value="approved">
            {approvedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    Nessuna richiesta approvata
                  </p>
                </CardContent>
              </Card>
            ) : (
              approvedRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {rejectedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    Nessuna richiesta rifiutata
                  </p>
                </CardContent>
              </Card>
            ) : (
              rejectedRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {section === "brewery" && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              In attesa ({pendingBreweryRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Approvate ({approvedBreweryRequests.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4" />
              Rifiutate ({rejectedBreweryRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingBreweryRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Nessuna richiesta in attesa
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingBreweryRequests.map((request) => (
                <BreweryRequestCard key={request.id} request={request} showActions />
              ))
            )}
          </TabsContent>

          <TabsContent value="approved">
            {approvedBreweryRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    Nessuna richiesta approvata
                  </p>
                </CardContent>
              </Card>
            ) : (
              approvedBreweryRequests.map((request) => (
                <BreweryRequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {rejectedBreweryRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    Nessuna richiesta rifiutata
                  </p>
                </CardContent>
              </Card>
            ) : (
              rejectedBreweryRequests.map((request) => (
                <BreweryRequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={dialogAction !== null} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "approve" ? "Approva richiesta" : "Rifiuta richiesta"}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === "approve" 
                ? `Stai per approvare la richiesta per "${dialogName}". ${dialogTarget?.type === "pub" ? "Verrà creato il locale e l'utente riceverà i permessi di gestore." : "Verrà creato il birrificio e l'utente riceverà i permessi di gestione."}`
                : `Stai per rifiutare la richiesta per "${dialogName}".`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Note (opzionali)
            </label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={dialogAction === "reject" ? "Motivo del rifiuto..." : "Note aggiuntive..."}
              rows={3}
              data-testid="input-admin-notes"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>
              Annulla
            </Button>
            <Button
              onClick={confirmAction}
              disabled={isAnyMutationPending}
              className={dialogAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={dialogAction === "reject" ? "destructive" : "default"}
              data-testid="button-confirm-action"
            >
              {isAnyMutationPending 
                ? "Elaborazione..." 
                : dialogAction === "approve" ? "Conferma Approvazione" : "Conferma Rifiuto"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
