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
  CheckCircle, 
  XCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  Building2,
  User,
  ArrowLeft,
  FileText
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

export default function AdminPublicanRequests() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<PublicanRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [dialogAction, setDialogAction] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user?.roles?.includes('admin'))) {
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
    enabled: isAuthenticated && user?.roles?.includes('admin'),
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
      setSelectedRequest(null);
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
      setSelectedRequest(null);
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

  const handleAction = (request: PublicanRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setDialogAction(action);
    setAdminNotes("");
  };

  const confirmAction = () => {
    if (!selectedRequest || !dialogAction) return;
    
    if (dialogAction === "approve") {
      approveMutation.mutate({ id: selectedRequest.id, adminNotes });
    } else {
      rejectMutation.mutate({ id: selectedRequest.id, adminNotes });
    }
  };

  if (isLoading || requestsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

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
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAction(request, "approve")}
                className="bg-green-600 hover:bg-green-700"
                data-testid={`button-approve-${request.id}`}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approva
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleAction(request, "reject")}
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
              Richieste Publican
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestisci le richieste di registrazione dei gestori di locali
            </p>
          </div>
          
          {pendingRequests.length > 0 && (
            <Badge className="bg-amber-500 text-white">
              {pendingRequests.length} in attesa
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
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

      <Dialog open={dialogAction !== null} onOpenChange={() => setDialogAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === "approve" ? "Approva richiesta" : "Rifiuta richiesta"}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === "approve" 
                ? `Stai per approvare la richiesta per "${selectedRequest?.pubName}". Verrà creato il locale e l'utente riceverà i permessi di gestore.`
                : `Stai per rifiutare la richiesta per "${selectedRequest?.pubName}".`
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
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className={dialogAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={dialogAction === "reject" ? "destructive" : "default"}
              data-testid="button-confirm-action"
            >
              {(approveMutation.isPending || rejectMutation.isPending) 
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
