import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Users,
  Star,
  BarChart3,
  TrendingUp,
  Database,
  Crown,
  ArrowLeft,
  Search,
  Edit3,
  Ban,
  CheckCircle,
  ExternalLink,
  Building2,
  MessageSquare,
  CalendarDays,
  SendHorizonal,
  Store,
  Beer,
  Trash2,
  Activity,
  Clock,
  RefreshCw,
  FileText,
  Flag,
  Lightbulb,
  ChevronRight,
  Server,
  Wifi,
  QrCode,
  UserPlus,
  MailCheck,
  MailX,
  ShieldCheck
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";
import { PageContainer } from "@/components/layout/page-container";

const ROLE_LABELS: Record<string, string> = {
  customer: "Cliente",
  pub_owner: "Pub Owner",
  brewery_owner: "Brewery Owner",
  admin: "Admin",
  banned: "Bannato",
};

const ROLE_BADGE_VARIANTS: Record<string, any> = {
  customer: "secondary",
  pub_owner: "default",
  brewery_owner: "outline",
  admin: "destructive",
  banned: "destructive",
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  const [userSearch, setUserSearch] = useState("");
  const [showUnverifiedOnly, setShowUnverifiedOnly] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editRole, setEditRole] = useState("");
  const [banTarget, setBanTarget] = useState<any>(null);
  const [unbanTarget, setUnbanTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [activityFilter, setActivityFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    nickname: "",
    firstName: "",
    lastName: "",
    userType: "customer",
    password: "",
    sendWelcome: true,
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.userType !== "admin")) {
      toast({ title: "Accesso negato", description: "Solo gli amministratori possono accedere a questa pagina", variant: "destructive" });
      setTimeout(() => { window.location.href = user ? "/" : "/api/login"; }, 1000);
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: adminStats } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && user?.userType === "admin",
    refetchInterval: 60000,
  });

  const { data: globalStats } = useQuery<any>({
    queryKey: ["/api/stats/global"],
    enabled: isAuthenticated && user?.userType === "admin",
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && user?.userType === "admin",
  });

  const { data: recentActivity = [], isLoading: activityLoading, refetch: refetchActivity } = useQuery<any[]>({
    queryKey: ["/api/admin/recent-activity", activityFilter],
    queryFn: async () => {
      const params = activityFilter !== "all" ? `?type=${activityFilter}&limit=15` : "?limit=15";
      const res = await fetch(`/api/admin/recent-activity${params}`);
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
    enabled: isAuthenticated && user?.userType === "admin",
    refetchInterval: 60000,
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof createForm) =>
      apiRequest("/api/admin/users", { method: "POST" }, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Utente creato", description: "Nuovo utente aggiunto con successo" });
      setCreateOpen(false);
      setCreateForm({ email: "", nickname: "", firstName: "", lastName: "", userType: "customer", password: "", sendWelcome: true });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err?.message || "Impossibile creare l'utente", variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userType }: { userId: string; userType: string }) =>
      apiRequest(`/api/admin/users/${userId}`, { method: "PATCH" }, { userType }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Utente aggiornato", description: `Ruolo cambiato in: ${ROLE_LABELS[vars.userType] || vars.userType}` });
      setEditTarget(null);
      setBanTarget(null);
      setUnbanTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err?.message || "Impossibile aggiornare l'utente", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) =>
      apiRequest(`/api/admin/users/${userId}`, { method: "DELETE" }),
    onMutate: async (userId: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/users"] });
      const previousUsers = queryClient.getQueryData<any[]>(["/api/admin/users"]);
      queryClient.setQueryData<any[]>(["/api/admin/users"], (old) =>
        old ? old.filter((u) => u.id !== userId) : []
      );
      return { previousUsers };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Utente eliminato", description: "L'account è stato eliminato definitivamente" });
      setDeleteTarget(null);
    },
    onError: (err: any, _userId, context: any) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(["/api/admin/users"], context.previousUsers);
      }
      toast({ title: "Errore", description: err?.message || "Impossibile eliminare l'utente", variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async (userId: string) =>
      apiRequest(`/api/admin/users/${userId}/resend-verification`, { method: "POST" }),
    onSuccess: (_data, _userId) => {
      toast({ title: "Email inviata", description: "Email di verifica inviata all'utente." });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err?.message || "Impossibile inviare l'email", variant: "destructive" });
    },
  });

  const verifyEmailMutation = useMutation({
    mutationFn: async (userId: string) =>
      apiRequest(`/api/admin/users/${userId}/verify-email`, { method: "PATCH" }),
    onSuccess: (_data, userId) => {
      queryClient.setQueryData<any[]>(["/api/admin/users"], (old) =>
        old ? old.map((u) => u.id === userId ? { ...u, isEmailVerified: true } : u) : []
      );
      toast({ title: "Email verificata", description: "L'utente è stato sbloccato." });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err?.message || "Impossibile verificare l'email", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.userType !== "admin") return null;

  const unverifiedCount = allUsers.filter((u: any) => u.email && !u.isEmailVerified).length;

  const filteredUsers = allUsers.filter((u: any) => {
    if (showUnverifiedOnly && (u.isEmailVerified || !u.email)) return false;
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.nickname?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <PageContainer variant="wide" className="py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="border-stone-200 dark:border-border hover:bg-stone-50 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard Admin
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground dark:text-white">Gestione Piattaforma</h1>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Utenti", value: adminStats?.totalUsers ?? allUsers.length, icon: Users, color: "text-blue-600", border: "border-stone-100 dark:border-border" },
            { label: "Pub", value: adminStats?.totalPubs ?? 0, icon: Store, color: "text-primary", border: "border-stone-100 dark:border-border" },
            { label: "Birrifici", value: (adminStats?.totalBreweries || globalStats?.totalBreweries || 0).toLocaleString("it-IT"), icon: Building2, color: "text-primary", border: "border-stone-100 dark:border-border" },
            { label: "Birre", value: (adminStats?.totalBeers || globalStats?.totalBeers || 0).toLocaleString("it-IT"), icon: Beer, color: "text-emerald-600", border: "border-stone-100 dark:border-border" },
            { label: "Recensioni", value: adminStats?.totalReviews ?? 0, icon: Star, color: "text-amber-500", border: "border-stone-100 dark:border-border" },
            { label: "Eventi", value: adminStats?.totalEvents ?? 0, icon: CalendarDays, color: "text-purple-500", border: "border-stone-100 dark:border-border" },
            { label: "Festival", value: adminStats?.totalFestivals ?? 0, icon: QrCode, color: "text-pink-500", border: "border-stone-100 dark:border-border" },
          ].map(({ label, value, icon: Icon, color, border }) => (
            <Card key={label} className={`bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 p-0 overflow-hidden`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                  </div>
                  <Icon className={`w-5 h-5 ${color} opacity-70`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ===== RECENT ACTIVITY + QUICK LINKS ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Activity */}
          <Card className="lg:col-span-2 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="w-4 h-4 text-primary" />
                  Attività Recente
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-wrap">
                    {[
                      { key: "all", label: "Tutto" },
                      { key: "user", label: "Utenti" },
                      { key: "review", label: "Recensioni" },
                      { key: "pub", label: "Pub" },
                      { key: "brewery", label: "Birrifici" },
                      { key: "festival", label: "Festival" },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setActivityFilter(key)}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${activityFilter === key ? "bg-primary text-white border-primary" : "border-stone-200 dark:border-border text-muted-foreground hover:bg-stone-50/60"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => refetchActivity()} className="text-muted-foreground hover:text-primary transition-colors" title="Aggiorna">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nessuna attività recente</p>
              ) : (
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {recentActivity.map((item: any, i: number) => {
                    const IconMap: Record<string, any> = {
                      user: Users, pub: Store, brewery: Building2, review: Star, event: CalendarDays, festival: QrCode,
                    };
                    const ColorMap: Record<string, string> = {
                      user: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
                      pub: "text-primary bg-stone-50 dark:bg-[#0B0D10]/20",
                      brewery: "text-primary bg-stone-50 dark:bg-[#0B0D10]/20",
                      review: "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
                      event: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
                      festival: "text-pink-500 bg-pink-50 dark:bg-pink-900/20",
                    };
                    const Icon = IconMap[item.type] || Activity;
                    const colorClass = ColorMap[item.type] || "text-muted-foreground bg-stone-50/60";
                    const content = (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50/30 dark:hover:bg-stone-900/10 transition-colors">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{item.action}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.name}{item.detail ? ` · ${item.detail}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          {item.time ? formatDistanceToNow(new Date(item.time), { addSuffix: true, locale: it }) : "—"}
                        </div>
                      </div>
                    );
                    return item.link ? (
                      <Link key={i} href={item.link}>{content}</Link>
                    ) : content;
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links + System Status */}
          <div className="space-y-4">
            <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-primary" />
                  Accesso Rapido
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {[
                  { href: "/admin", icon: BarChart3, label: "Dashboard Admin" },
                  { href: "/admin/content", icon: Database, label: "Gestione Contenuti" },
                  { href: "/admin/analytics", icon: TrendingUp, label: "Analytics" },
                  { href: "/festival-dashboard", icon: QrCode, label: "Festival Mode" },
                  { href: "/admin/suggestions", icon: Lightbulb, label: "Suggerimenti" },
                  { href: "/admin/addition-requests", icon: Flag, label: "Richieste Aggiunta" },
                  { href: "/admin/pages", icon: FileText, label: "Pagine Statiche" },
                ].map(({ href, icon: Icon, label }) => (
                  <Link key={href} href={href}>
                    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-stone-50/60 dark:hover:bg-stone-900/20 transition-colors cursor-pointer group">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                      <ChevronRight className="w-3 h-3 text-orange-100 group-hover:text-primary ml-auto transition-colors" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-500" />
                  Stato Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {[
                  { label: "Database", status: adminStats ? "online" : "checking", icon: Database },
                  { label: "API Server", status: "online", icon: Wifi },
                  { label: "Ultimo aggiorn.", status: adminStats?.lastUpdated ? formatDistanceToNow(new Date(adminStats.lastUpdated), { addSuffix: true, locale: it }) : "—", icon: Clock, isInfo: true },
                ].map(({ label, status, icon: Icon, isInfo }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                    {isInfo ? (
                      <span className="text-xs text-muted-foreground">{status}</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${status === "online" ? "bg-emerald-500" : "bg-yellow-500 animate-pulse"}`} />
                        <span className={`text-xs font-medium ${status === "online" ? "text-emerald-600" : "text-yellow-600"}`}>
                          {status === "online" ? "Online" : "Verifica..."}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-xs grid-cols-2 bg-stone-50/60 dark:bg-[#0B0D10]/20">
            <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-primary">
              <Users className="w-4 h-4" />
              Utenti
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-primary">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* ===== USERS TAB ===== */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per email, nickname, nome..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 border-stone-200 dark:border-border focus-visible:ring-primary"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowUnverifiedOnly(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  showUnverifiedOnly
                    ? "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                    : "bg-white dark:bg-transparent border-stone-200 dark:border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <MailX className="w-3.5 h-3.5" />
                Non verificati
                {unverifiedCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${showUnverifiedOnly ? "bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200" : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"}`}>
                    {unverifiedCount}
                  </span>
                )}
              </button>
              <span className="text-sm text-muted-foreground">{filteredUsers.length} utenti</span>
              <Button
                size="sm"
                className="ml-auto gap-2"
                onClick={() => setCreateOpen(true)}
                data-testid="button-create-user"
              >
                <UserPlus className="w-4 h-4" />
                Crea utente
              </Button>
            </div>

            <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-stone-50/40 dark:bg-[#0B0D10]/10 border-b border-stone-100 dark:border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Utente</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ruolo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Iscritto</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-50 dark:divide-border">
                      {usersLoading ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                            Caricamento utenti...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                            Nessun utente trovato
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u: any) => {
                          const isBanned = u.userType === "banned";
                          const isSelf = u.id === (user as any)?.id;
                          const hasEmail = !!u.email;
                          const isVerified = !!u.isEmailVerified;
                          return (
                            <tr key={u.id} className={`hover:bg-stone-50/30 dark:hover:bg-stone-900/10 ${isBanned ? "opacity-60" : ""}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-8 h-8 flex-shrink-0">
                                    <AvatarImage src={u.profileImageUrl} />
                                    <AvatarFallback className="text-xs bg-stone-100 dark:bg-orange-900/40 text-primary">
                                      {(u.nickname?.[0] || u.firstName?.[0] || u.email?.[0] || "U").toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium text-sm truncate max-w-[120px]">
                                        {u.nickname || u.firstName || "Utente"}
                                      </span>
                                      {isSelf && <Crown className="w-3 h-3 text-primary flex-shrink-0" />}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate max-w-[150px] sm:hidden">{u.email || "—"}</p>
                                  </div>
                                </div>
                              </td>
                              {/* Email + verification status column */}
                              <td className="px-4 py-3 hidden sm:table-cell">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">{u.email || <span className="italic text-stone-400">Nessuna email (Replit)</span>}</span>
                                  {hasEmail && (
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold w-fit px-1.5 py-0.5 rounded-full ${
                                      isVerified
                                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                                        : "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
                                    }`}>
                                      {isVerified
                                        ? <><MailCheck className="w-3 h-3" /> Verificata</>
                                        : <><MailX className="w-3 h-3" /> Non verificata</>
                                      }
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  className={`text-xs whitespace-nowrap ${
                                    u.userType === "admin" ? "bg-purple-100 text-purple-700 hover:bg-purple-100/80" :
                                    u.userType === "pub_owner" ? "bg-stone-50 text-primary hover:bg-stone-50/80" :
                                    u.userType === "brewery_owner" ? "bg-blue-50 text-blue-700 hover:bg-blue-50/80" :
                                    u.userType === "banned" ? "bg-red-100 text-red-700 hover:bg-red-100/80" :
                                    "bg-stone-50/60 text-muted-foreground hover:bg-stone-50/80"
                                  }`}
                                >
                                  {isBanned ? "🚫 Bannato" : ROLE_LABELS[u.userType] || u.userType}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap">
                                {u.createdAt ? formatDistanceToNow(new Date(u.createdAt), { addSuffix: true, locale: it }) : "—"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <Link href={`/user/${u.nickname || u.id}`}>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-stone-50 dark:hover:bg-stone-900/20 text-muted-foreground" title="Vedi profilo">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Button>
                                  </Link>
                                  {/* Resend + force-verify buttons: shown only for non-verified email users */}
                                  {hasEmail && !isVerified && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 text-stone-400"
                                        title="Rimanda email di verifica"
                                        disabled={resendVerificationMutation.isPending}
                                        onClick={() => resendVerificationMutation.mutate(u.id)}
                                      >
                                        <SendHorizonal className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 text-amber-500"
                                        title="Forza verifica email"
                                        disabled={verifyEmailMutation.isPending}
                                        onClick={() => verifyEmailMutation.mutate(u.id)}
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  )}
                                  {!isSelf && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 hover:bg-stone-50 dark:hover:bg-stone-900/20 hover:text-primary text-muted-foreground"
                                        title="Modifica ruolo"
                                        onClick={() => { setEditTarget(u); setEditRole(isBanned ? "customer" : u.userType); }}
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </Button>
                                      {isBanned ? (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 text-muted-foreground"
                                          title="Sbanna utente"
                                          onClick={() => setUnbanTarget(u)}
                                        >
                                          <CheckCircle className="w-3.5 h-3.5" />
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 text-muted-foreground"
                                          title="Banna utente"
                                          onClick={() => setBanTarget(u)}
                                        >
                                          <Ban className="w-3.5 h-3.5" />
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 text-muted-foreground"
                                        title="Elimina utente"
                                        onClick={() => setDeleteTarget(u)}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        {/* ===== ANALYTICS TAB ===== */}
        <TabsContent value="analytics" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  Top 10 Stili di Birra
                </CardTitle>
              </CardHeader>
              <CardContent>
                {globalStats?.topStyles?.length > 0 ? (
                  <div className="space-y-2">
                    {globalStats.topStyles.slice(0, 10).map((style: any, i: number) => {
                      const pct = Math.min(100, (parseInt(style.count) / parseInt(globalStats.topStyles[0].count)) * 100);
                      return (
                        <div key={style.style} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-stone-400 w-5 text-right flex-shrink-0">#{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-sm font-medium truncate">{style.style}</span>
                              <span className="text-xs text-stone-400 ml-2 flex-shrink-0">{parseInt(style.count).toLocaleString("it-IT")}</span>
                            </div>
                            <div className="h-1.5 bg-stone-100 dark:bg-[#1A1D24] rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-stone-400 text-center py-4">Nessun dato disponibile</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  Birrifici più Produttivi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {globalStats?.topBreweries?.length > 0 ? (
                  <div className="space-y-2">
                    {globalStats.topBreweries.slice(0, 10).map((brewery: any, i: number) => (
                      <div key={brewery.breweryName} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-[#1A1D24] transition-colors">
                        <span className="text-xs font-bold text-stone-400 w-5 text-right flex-shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{brewery.breweryName}</p>
                          <p className="text-xs text-stone-400">{brewery.location || "—"}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-blue-600">{parseInt(brewery.beerCount).toLocaleString("it-IT")}</p>
                          <p className="text-xs text-stone-400">birre</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-400 text-center py-4">Nessun dato disponibile</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-4 h-4 text-green-500" />
                Statistiche Piattaforma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Stili di birra", value: globalStats?.uniqueStyles?.toLocaleString("it-IT") || "—", desc: "Stili unici nel DB", color: "from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20", textColor: "text-amber-700 dark:text-amber-300" },
                  { label: "Recensioni community", value: adminStats?.totalReviews?.toLocaleString("it-IT") ?? "—", desc: "Con voto assegnato", color: "from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20", textColor: "text-yellow-700 dark:text-yellow-300" },
                  { label: "Assaggi totali", value: adminStats?.totalTastings?.toLocaleString("it-IT") ?? "—", desc: "Inclusi senza voto", color: "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20", textColor: "text-green-700 dark:text-green-300" },
                  { label: "Eventi attivi", value: adminStats?.totalEvents?.toLocaleString("it-IT") ?? "—", desc: "Pub + birrifici", color: "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20", textColor: "text-purple-700 dark:text-purple-300" },
                ].map(({ label, value, desc, color, textColor }) => (
                  <div key={label} className={`p-4 rounded-xl bg-gradient-to-br ${color}`}>
                    <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
                    <p className="text-sm font-medium text-muted-foreground dark:text-stone-300 mt-1">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {globalStats?.countries && globalStats.countries.length > 0 && (
            <Card className="bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="w-4 h-4 text-indigo-500" />
                  Distribuzione per Paese
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {globalStats.countries.slice(0, 18).map((c: any) => (
                    <div key={c.country} className="flex items-center justify-between p-2 rounded-lg bg-stone-50 dark:bg-[#1A1D24] text-xs">
                      <span className="font-medium truncate">{c.country || "N/D"}</span>
                      <span className="text-stone-400 ml-1 flex-shrink-0">{parseInt(c.count).toLocaleString("it-IT")}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </PageContainer>

      {/* ===== CREATE USER DIALOG ===== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Crea nuovo utente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cu-firstName" className="text-xs">Nome</Label>
                <Input
                  id="cu-firstName"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                  data-testid="input-create-firstname"
                />
              </div>
              <div>
                <Label htmlFor="cu-lastName" className="text-xs">Cognome</Label>
                <Input
                  id="cu-lastName"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                  data-testid="input-create-lastname"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cu-nickname" className="text-xs">Nickname *</Label>
              <Input
                id="cu-nickname"
                value={createForm.nickname}
                onChange={(e) => setCreateForm({ ...createForm, nickname: e.target.value })}
                placeholder="es. mario.rossi"
                data-testid="input-create-nickname"
              />
            </div>
            <div>
              <Label htmlFor="cu-email" className="text-xs">Email</Label>
              <Input
                id="cu-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="opzionale, per email/password login"
                data-testid="input-create-email"
              />
            </div>
            <div>
              <Label htmlFor="cu-password" className="text-xs">Password iniziale</Label>
              <Input
                id="cu-password"
                type="text"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="min. 6 caratteri (opzionale)"
                data-testid="input-create-password"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se vuota, l'utente potrà accedere solo via Google/Apple o reset password.
              </p>
            </div>
            <div>
              <Label htmlFor="cu-role" className="text-xs">Ruolo</Label>
              <Select
                value={createForm.userType}
                onValueChange={(v) => setCreateForm({ ...createForm, userType: v })}
              >
                <SelectTrigger id="cu-role" data-testid="select-create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Cliente</SelectItem>
                  <SelectItem value="pub_owner">Pub Owner</SelectItem>
                  <SelectItem value="brewery_owner">Brewery Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 bg-stone-50 dark:bg-[#1A1D24] rounded-lg">
              <div>
                <p className="text-sm font-medium">Invia email di benvenuto</p>
                <p className="text-xs text-muted-foreground">Solo se l'email è compilata</p>
              </div>
              <Switch
                checked={createForm.sendWelcome}
                onCheckedChange={(v) => setCreateForm({ ...createForm, sendWelcome: v })}
                data-testid="switch-create-welcome"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>
                Annulla
              </Button>
              <Button
                className="flex-1"
                disabled={
                  createUserMutation.isPending ||
                  (!createForm.email.trim() && !createForm.nickname.trim())
                }
                onClick={() => createUserMutation.mutate(createForm)}
                data-testid="button-submit-create-user"
              >
                {createUserMutation.isPending ? "Creazione..." : "Crea utente"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT ROLE DIALOG ===== */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Modifica ruolo — {editTarget?.nickname || editTarget?.firstName || "Utente"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-[#1A1D24] rounded-lg">
              <Avatar className="w-10 h-10">
                <AvatarImage src={editTarget?.profileImageUrl} />
                <AvatarFallback>{(editTarget?.nickname?.[0] || "U").toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{editTarget?.nickname || editTarget?.firstName || "Utente"}</p>
                <p className="text-xs text-stone-400">{editTarget?.email}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground dark:text-stone-300 block mb-2">Nuovo ruolo</label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Cliente</SelectItem>
                  <SelectItem value="pub_owner">Pub Owner</SelectItem>
                  <SelectItem value="brewery_owner">Brewery Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditTarget(null)}>
                Annulla
              </Button>
              <Button
                className="flex-1"
                disabled={updateUserMutation.isPending || editRole === editTarget?.userType}
                onClick={() => updateUserMutation.mutate({ userId: editTarget.id, userType: editRole })}
              >
                {updateUserMutation.isPending ? "Salvataggio..." : "Salva"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== BAN CONFIRM DIALOG ===== */}
      <AlertDialog open={!!banTarget} onOpenChange={(open) => { if (!open) setBanTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bannare {banTarget?.nickname || banTarget?.firstName || "questo utente"}?</AlertDialogTitle>
            <AlertDialogDescription>
              L'utente non potrà più accedere alla piattaforma. Puoi rimuovere il ban in qualsiasi momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => updateUserMutation.mutate({ userId: banTarget.id, userType: "banned" })}
              disabled={updateUserMutation.isPending}
            >
              <Ban className="w-4 h-4 mr-2" />
              Banna utente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== UNBAN CONFIRM DIALOG ===== */}
      <AlertDialog open={!!unbanTarget} onOpenChange={(open) => { if (!open) setUnbanTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere il ban a {unbanTarget?.nickname || unbanTarget?.firstName || "questo utente"}?</AlertDialogTitle>
            <AlertDialogDescription>
              L'utente tornerà ad essere un cliente normale e potrà accedere alla piattaforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={() => updateUserMutation.mutate({ userId: unbanTarget.id, userType: "customer" })}
              disabled={updateUserMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Sbanna utente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== DELETE CONFIRM DIALOG ===== */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Eliminare {deleteTarget?.nickname || deleteTarget?.email || "questo utente"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-red-600">Questa azione è irreversibile.</span> L'account, le recensioni, i preferiti e tutti i dati associati verranno eliminati definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteUserMutation.mutate(deleteTarget.id)}
              disabled={deleteUserMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteUserMutation.isPending ? "Eliminazione..." : "Elimina definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
