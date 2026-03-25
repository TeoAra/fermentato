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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const dialogName = dialogTarget
    ? dialogTarget.type === "pub"
      ? (dialogTarget.request as PublicanRequest).pubName
      : (dialogTarget.request as BreweryRequest).breweryName
    : "";

  const RequestCard = ({ request, showActions = false }: { request: PublicanRequest; showActions?: boolean }) => (
    <Card className="mb-4 bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg text-foreground">{request.pubName}</h3>
              <Badge 
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  request.status === 'pending' ? 'bg-stone-50 text-primary dark:bg-stone-900/20 dark:text-orange-400' : 
                  request.status === 'approved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 
                  'bg-destructive/10 text-destructive dark:bg-destructive/20'
                }`}
              >
                {request.status === 'pending' ? 'In attesa' : 
                 request.status === 'approved' ? 'Approvata' : 'Rifiutata'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary/60" />
                <span>{request.pubAddress}, {request.pubCity}</span>
                {request.pubRegion && <span>({request.pubRegion})</span>}
              </div>
              
              {request.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary/60" />
                  <span>{request.phone}</span>
                </div>
              )}
              
              {request.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary/60" />
                  <span>{request.email}</span>
                </div>
              )}
              
              {request.vatNumber && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary/60" />
                  <span>P.IVA: {request.vatNumber}</span>
                </div>
              )}
            </div>

            {request.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {request.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-stone-100 dark:border-[hsl(25,12%,16%)]">
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
              <div className="bg-stone-50/50 dark:bg-stone-900/10 p-3 rounded-xl mt-2 border border-stone-100 dark:border-[hsl(25,12%,16%)]">
                <p className="text-sm text-foreground">
                  <strong className="text-primary">Note admin:</strong> {request.adminNotes}
                </p>
                {request.reviewedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Rivista il {format(new Date(request.reviewedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                  </p>
                )}
              </div>
            )}
          </div>

          {showActions && (
            <div className="flex flex-col gap-2 items-end">
              <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl px-2.5 py-1.5 font-medium">
                <CheckCircle className="h-3.5 w-3.5" />
                Attivazione via Stripe
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="rounded-xl font-semibold"
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
      <Card className="mb-4 bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="pt-5 pb-4">
          {/* Header row: icon + name + badges */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-stone-50 dark:bg-stone-900/20 flex items-center justify-center shrink-0 mt-0.5 border border-stone-200 dark:border-stone-700/50">
              <Factory className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-bold text-base text-foreground">{request.breweryName}</h3>
                <Badge
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    request.status === 'pending' ? 'bg-stone-50 text-primary dark:bg-stone-900/20 dark:text-orange-400' :
                    request.status === 'approved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                    'bg-destructive/10 text-destructive dark:bg-destructive/20'
                  }`}
                >
                  {request.status === 'pending' ? 'In attesa' : request.status === 'approved' ? 'Approvata' : 'Rifiutata'}
                </Badge>
                {request.existingBreweryId && (
                  <Badge className="bg-muted text-muted-foreground text-xs rounded-full font-medium">Birrificio esistente #{request.existingBreweryId}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="space-y-2 text-sm text-muted-foreground ml-12">
            {locationParts && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
                <span>{locationParts}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-x-6 gap-y-1.5">
              {request.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-primary/60" />
                  <span>{request.phone}</span>
                </div>
              )}
              {request.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-primary/60" />
                  <span>{request.email}</span>
                </div>
              )}
              {request.vatNumber && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-primary/60" />
                  <span>P.IVA: {request.vatNumber}</span>
                </div>
              )}
              {request.websiteUrl && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0 text-primary/60" />
                  <a href={request.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-xs font-medium">
                    {request.websiteUrl}
                  </a>
                </div>
              )}
            </div>

            {request.description && (
              <p className="text-sm text-muted-foreground italic bg-stone-50/30 dark:bg-stone-900/10 p-2 rounded-lg border border-transparent hover:border-stone-100 transition-colors">{request.description}</p>
            )}

            {request.adminNotes && (
              <div className="bg-stone-50/50 dark:bg-stone-900/10 p-2.5 rounded-xl border border-stone-100 dark:border-[hsl(25,12%,16%)]">
                <p className="text-xs font-medium text-foreground"><strong className="text-primary">Note admin:</strong> {request.adminNotes}</p>
                {request.reviewedAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(request.reviewedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer: user info + actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-stone-100 dark:border-[hsl(25,12%,16%)]">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 text-xs rounded-xl font-semibold"
                  data-testid={`button-approve-brewery-${request.id}`}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Approva
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBreweryAction(request, "reject")}
                  className="h-8 px-3 text-xs rounded-xl font-semibold"
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
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="mb-4 border-stone-200 dark:border-[hsl(25,12%,20%)] hover:bg-stone-50 rounded-xl" data-testid="button-back-admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna al pannello admin
            </Button>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
                <FileText className="h-8 w-8 text-primary" />
                Richieste Registrazione
              </h1>
              <p className="text-muted-foreground mt-1">
                Gestisci le richieste di registrazione di locali e birrifici
              </p>
            </div>
            
            <div className="flex gap-2">
              {pendingRequests.length > 0 && (
                <Badge className="bg-primary text-white rounded-full font-bold px-3">
                  <Store className="h-3 w-3 mr-1" />
                  {pendingRequests.length} pub
                </Badge>
              )}
              {pendingBreweryRequests.length > 0 && (
                <Badge className="bg-primary text-white rounded-full font-bold px-3">
                  <Factory className="h-3 w-3 mr-1" />
                  {pendingBreweryRequests.length} birrifici
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card 
            className={`cursor-pointer transition-all rounded-2xl border-stone-100 dark:border-[hsl(25,12%,16%)] shadow-sm ${section === "pub" ? "ring-2 ring-primary bg-stone-50/50 dark:bg-stone-900/20" : "hover:bg-stone-50/30 dark:hover:bg-stone-900/10 bg-white dark:bg-[hsl(25,14%,10%)]"}`}
            onClick={() => { setSection("pub"); setActiveTab("pending"); }}
          >
            <CardContent className="flex items-center gap-3 py-4">
              <Store className={`h-6 w-6 ${section === "pub" ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className={`font-bold ${section === "pub" ? "text-primary" : "text-foreground"}`}>Richieste Pub</p>
                <p className="text-xs text-muted-foreground">{requests.length} totali · {pendingRequests.length} in attesa</p>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all rounded-2xl border-stone-100 dark:border-[hsl(25,12%,16%)] shadow-sm ${section === "brewery" ? "ring-2 ring-primary bg-stone-50/50 dark:bg-stone-900/20" : "hover:bg-stone-50/30 dark:hover:bg-stone-900/10 bg-white dark:bg-[hsl(25,14%,10%)]"}`}
            onClick={() => { setSection("brewery"); setActiveTab("pending"); }}
          >
            <CardContent className="flex items-center gap-3 py-4">
              <Factory className={`h-6 w-6 ${section === "brewery" ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className={`font-bold ${section === "brewery" ? "text-primary" : "text-foreground"}`}>Richieste Birrificio</p>
                <p className="text-xs text-muted-foreground">{breweryRequests.length} totali · {pendingBreweryRequests.length} in attesa</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {section === "pub" && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="mb-4 flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl text-sm text-blue-800 dark:text-blue-300">
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
              <span>
                <strong>Attivazione automatica via Stripe.</strong> I nuovi pub si attivano autonomamente dopo il checkout (prova gratuita 15 giorni → €65/anno). Non è necessaria approvazione manuale. Questa sezione mostra solo lo storico e permette di rifiutare richieste anomale.
              </span>
            </div>
            <TabsList className="mb-6 bg-stone-50 dark:bg-stone-900/20 p-1 rounded-xl border border-stone-200 dark:border-stone-700/50">
              <TabsTrigger value="pending" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-primary dark:data-[state=active]:text-white font-semibold">
                <Clock className="h-4 w-4" />
                In attesa ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-emerald-600 dark:data-[state=active]:text-white font-semibold">
                <CheckCircle className="h-4 w-4" />
                Approvate ({approvedRequests.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-destructive dark:data-[state=active]:text-white font-semibold">
                <XCircle className="h-4 w-4" />
                Rifiutate ({rejectedRequests.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-0">
              {pendingRequests.length === 0 ? (
                <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm"><CardContent className="p-8 text-center text-muted-foreground">Nessuna richiesta in attesa</CardContent></Card>
              ) : (
                pendingRequests.map(r => <RequestCard key={r.id} request={r} showActions />)
              )}
            </TabsContent>
            <TabsContent value="approved" className="mt-0">
              {approvedRequests.length === 0 ? (
                <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm"><CardContent className="p-8 text-center text-muted-foreground">Nessuna richiesta approvata</CardContent></Card>
              ) : (
                approvedRequests.map(r => <RequestCard key={r.id} request={r} />)
              )}
            </TabsContent>
            <TabsContent value="rejected" className="mt-0">
              {rejectedRequests.length === 0 ? (
                <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm"><CardContent className="p-8 text-center text-muted-foreground">Nessuna richiesta rifiutata</CardContent></Card>
              ) : (
                rejectedRequests.map(r => <RequestCard key={r.id} request={r} />)
              )}
            </TabsContent>
          </Tabs>
        )}

        {section === "brewery" && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 bg-stone-50 dark:bg-stone-900/20 p-1 rounded-xl border border-stone-200 dark:border-stone-700/50">
              <TabsTrigger value="pending" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-primary dark:data-[state=active]:text-white font-semibold">
                <Clock className="h-4 w-4" />
                In attesa ({pendingBreweryRequests.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-emerald-600 dark:data-[state=active]:text-white font-semibold">
                <CheckCircle className="h-4 w-4" />
                Approvate ({approvedBreweryRequests.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-destructive dark:data-[state=active]:text-white font-semibold">
                <XCircle className="h-4 w-4" />
                Rifiutate ({rejectedBreweryRequests.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-0">
              {pendingBreweryRequests.length === 0 ? (
                <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm"><CardContent className="p-8 text-center text-muted-foreground">Nessuna richiesta in attesa</CardContent></Card>
              ) : (
                pendingBreweryRequests.map(r => <BreweryRequestCard key={r.id} request={r} showActions />)
              )}
            </TabsContent>
            <TabsContent value="approved" className="mt-0">
              {approvedBreweryRequests.length === 0 ? (
                <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm"><CardContent className="p-8 text-center text-muted-foreground">Nessuna richiesta approvata</CardContent></Card>
              ) : (
                approvedBreweryRequests.map(r => <BreweryRequestCard key={r.id} request={r} />)
              )}
            </TabsContent>
            <TabsContent value="rejected" className="mt-0">
              {rejectedBreweryRequests.length === 0 ? (
                <Card className="bg-white dark:bg-[hsl(25,14%,10%)] border border-stone-100 dark:border-[hsl(25,12%,16%)] rounded-2xl shadow-sm"><CardContent className="p-8 text-center text-muted-foreground">Nessuna richiesta rifiutata</CardContent></Card>
              ) : (
                rejectedBreweryRequests.map(r => <BreweryRequestCard key={r.id} request={r} />)
              )}
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={!!dialogTarget} onOpenChange={(open) => !open && setDialogTarget(null)}>
          <DialogContent className="rounded-2xl border-stone-200 dark:border-[hsl(25,12%,20%)]">
            <DialogHeader>
              <DialogTitle className="text-foreground font-bold">
                {dialogAction === "approve" ? "Approva richiesta" : "Rifiuta richiesta"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Stai per {dialogAction === "approve" ? "approvare" : "rifiutare"} la richiesta per <strong>{dialogName}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm font-semibold text-foreground mb-2 block">Note amministrative (opzionale)</label>
              <Textarea
                placeholder="Inserisci eventuali note per l'utente..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="min-h-[100px] border-stone-200 rounded-xl focus-visible:ring-primary/20"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogTarget(null)} className="rounded-xl border-stone-200 dark:border-[hsl(25,12%,20%)] hover:bg-stone-50">
                Annulla
              </Button>
              <Button
                variant={dialogAction === "approve" ? "default" : "destructive"}
                className={`rounded-xl font-semibold ${dialogAction === "approve" ? "bg-primary hover:bg-primary/90 text-white" : ""}`}
                onClick={confirmAction}
                disabled={isAnyMutationPending}
              >
                {isAnyMutationPending ? "In corso..." : dialogAction === "approve" ? "Approva" : "Rifiuta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
