import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Star,
  Flag,
  Eye,
  MessageSquare,
  User,
  Calendar,
  Filter,
  Search,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface Review {
  id: number;
  userId: string;
  beerId: number;
  pubId: number | null;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  beer?: {
    name: string;
    brewery: string;
  };
  pub?: {
    name: string;
  };
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ReportedContent {
  id: number;
  type: 'review' | 'user' | 'pub';
  targetId: number;
  reporterId: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export default function AdminModeration() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<"reviews" | "reports">("reviews");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: pendingReviews, isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["/api/admin/reviews/pending"],
    enabled: isAuthenticated && user?.userType === 'admin',
  });

  const { data: allReviews } = useQuery<Review[]>({
    queryKey: ["/api/admin/reviews/all"],
    enabled: isAuthenticated && user?.userType === 'admin',
  });

  const { data: reports } = useQuery<ReportedContent[]>({
    queryKey: ["/api/admin/reports"],
    enabled: isAuthenticated && user?.userType === 'admin',
  });

  // Review moderation mutation
  const reviewActionMutation = useMutation({
    mutationFn: async ({ reviewId, action }: { reviewId: number; action: 'approve' | 'reject' }) => {
      return apiRequest(`/api/admin/reviews/${reviewId}/${action}`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews/all"] });
      toast({
        title: "Recensione processata",
        description: "L'azione è stata completata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore durante l'elaborazione della recensione",
        variant: "destructive",
      });
    },
  });

  const reportActionMutation = useMutation({
    mutationFn: async ({ reportId, action }: { reportId: number; action: 'resolve' | 'dismiss' }) => {
      return apiRequest(`/api/admin/reports/${reportId}/${action}`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({
        title: "Segnalazione processata",
        description: "L'azione è stata completata con successo",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-600">Caricamento moderazione...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.userType !== 'admin') {
    return null;
  }

  const filteredReviews = allReviews?.filter(review => 
    filterStatus === 'all' || review.status === filterStatus
  ) || [];

  const pendingCount = pendingReviews?.length || 0;
  const reportsCount = reports?.filter(r => r.status === 'pending').length || 0;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Moderazione Contenuti</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gestisci recensioni e segnalazioni della community</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {pendingCount} in attesa
            </Badge>
          )}
          {reportsCount > 0 && (
            <Badge variant="outline" className="border-orange-500 text-orange-600">
              {reportsCount} segnalazioni
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recensioni Totali</p>
                <div className="text-2xl font-bold">{allReviews?.length || 0}</div>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Attesa</p>
                <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approvate</p>
                <div className="text-2xl font-bold text-green-600">
                  {allReviews?.filter(r => r.status === 'approved').length || 0}
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Segnalazioni</p>
                <div className="text-2xl font-bold text-red-600">{reportsCount}</div>
              </div>
              <Flag className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4">
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
          <Button 
            variant={selectedTab === 'reviews' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('reviews')}
            className="flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Recensioni
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingCount}
              </Badge>
            )}
          </Button>
          <Button 
            variant={selectedTab === 'reports' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTab('reports')}
            className="flex items-center gap-2"
          >
            <Flag className="w-4 h-4" />
            Segnalazioni
            {reportsCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {reportsCount}
              </Badge>
            )}
          </Button>
        </div>

        {selectedTab === 'reviews' && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded border border-gray-200 dark:border-gray-700 px-3 py-1 text-sm bg-background"
            >
              <option value="all">Tutte</option>
              <option value="pending">In attesa</option>
              <option value="approved">Approvate</option>
              <option value="rejected">Rifiutate</option>
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {selectedTab === 'reviews' && (
        <div className="space-y-4">
          {reviewsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Caricamento recensioni...</p>
            </div>
          ) : filteredReviews.length > 0 ? (
            filteredReviews.map((review) => (
              <Card key={review.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${review.userId}`} />
                        <AvatarFallback>
                          <User className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">
                            {review.user?.firstName} {review.user?.lastName} 
                          </h3>
                          <Badge 
                            variant={
                              review.status === 'approved' ? 'default' : 
                              review.status === 'pending' ? 'secondary' : 
                              'destructive'
                            }
                          >
                            {review.status === 'approved' ? 'Approvata' : 
                             review.status === 'pending' ? 'In attesa' : 
                             'Rifiutata'}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                              />
                            ))}
                            <span className="ml-1 text-sm font-medium">{review.rating}/5</span>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Recensione per: <span className="font-medium">{review.beer?.name}</span> 
                            {review.beer?.brewery && <span> di {review.beer.brewery}</span>}
                            {review.pub && <span> presso {review.pub.name}</span>}
                          </p>
                          <p className="text-gray-900 dark:text-white">
                            {review.comment}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: it })}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            ID: {review.userId}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {review.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <Button 
                          size="sm" 
                          onClick={() => reviewActionMutation.mutate({ reviewId: review.id, action: 'approve' })}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={reviewActionMutation.isPending}
                        >
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          Approva
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => reviewActionMutation.mutate({ reviewId: review.id, action: 'reject' })}
                          disabled={reviewActionMutation.isPending}
                        >
                          <ThumbsDown className="w-4 h-4 mr-1" />
                          Rifiuta
                        </Button>
                      </div>
                    )}
                    
                    {review.status !== 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          Dettagli
                        </Button>
                        <Button size="sm" variant="outline">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Tutto sotto controllo!</h3>
                <p className="text-gray-600">
                  {filterStatus === 'pending' 
                    ? 'Non ci sono recensioni in attesa di moderazione' 
                    : 'Nessuna recensione trovata con i filtri selezionati'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {selectedTab === 'reports' && (
        <div className="space-y-4">
          {reports && reports.length > 0 ? (
            reports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                        <Flag className="w-6 h-6 text-red-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">
                            Segnalazione {report.type}
                          </h3>
                          <Badge 
                            variant={
                              report.status === 'resolved' ? 'default' : 
                              report.status === 'pending' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {report.status === 'resolved' ? 'Risolta' : 
                             report.status === 'pending' ? 'In attesa' : 
                             'Dismisssa'}
                          </Badge>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            <span className="font-medium">Motivo:</span> {report.reason}
                          </p>
                          <p className="text-gray-900 dark:text-white">
                            {report.description}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: it })}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Reporter: {report.reporterId}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {report.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <Button 
                          size="sm" 
                          onClick={() => reportActionMutation.mutate({ reportId: report.id, action: 'resolve' })}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={reportActionMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Risolvi
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => reportActionMutation.mutate({ reportId: report.id, action: 'dismiss' })}
                          disabled={reportActionMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Dismetti
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Community protetta!</h3>
                <p className="text-gray-600">Non ci sono segnalazioni da processare</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}