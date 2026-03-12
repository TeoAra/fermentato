import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Beer, Eye, EyeOff, Mail, Lock, User, Store, Phone, Building2, Factory, Plus, Search, MailCheck, RefreshCw, CheckCircle2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import ReCAPTCHA from "react-google-recaptcha";
import type { Brewery } from "@shared/schema";

const RECAPTCHA_SITE_KEY = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) || "6LcDuIEsAAAAAAPwdAQ2rAKZvA_ae_FmyRlft11z";

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "Email o username richiesti"),
  password: z.string().min(1, "Password richiesta"),
  rememberMe: z.boolean().default(false),
});

const registerSchema = z.object({
  nickname: z.string()
    .min(3, "Username: minimo 3 caratteri")
    .max(30, "Username: massimo 30 caratteri")
    .regex(/^[a-zA-Z0-9_.]+$/, "Solo lettere, numeri, punti e underscore"),
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "La password deve essere di almeno 8 caratteri"),
  confirmPassword: z.string(),
  isPublican: z.boolean().default(false),
  pubName: z.string().optional(),
  pubAddress: z.string().optional(),
  pubCity: z.string().optional(),
  pubRegion: z.string().optional(),
  vatNumber: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
  isBrewery: z.boolean().default(false),
  breweryId: z.number().optional(),
  breweryName: z.string().optional(),
  breweryLocation: z.string().optional(),
  breweryRegion: z.string().optional(),
  breweryCountry: z.string().optional(),
  breweryVatNumber: z.string().optional(),
  breweryPhone: z.string().optional(),
  breweryDescription: z.string().optional(),
  breweryWebsite: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.isPublican) {
    return data.pubName && data.pubName.length > 0;
  }
  return true;
}, {
  message: "Nome del locale richiesto",
  path: ["pubName"],
}).refine((data) => {
  if (data.isPublican) {
    return data.pubAddress && data.pubAddress.length > 0;
  }
  return true;
}, {
  message: "Seleziona un indirizzo dai suggerimenti",
  path: ["pubAddress"],
}).refine((data) => {
  if (data.isBrewery && !data.breweryId) {
    return data.breweryName && data.breweryName.length > 0;
  }
  return true;
}, {
  message: "Seleziona un birrificio esistente o inserisci il nome per crearne uno nuovo",
  path: ["breweryName"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const loginRecaptchaRef = useRef<ReCAPTCHA>(null);
  const registerRecaptchaRef = useRef<ReCAPTCHA>(null);
  const [loginRecaptchaToken, setLoginRecaptchaToken] = useState<string | null>(null);
  const [registerRecaptchaToken, setRegisterRecaptchaToken] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [emailNotVerified, setEmailNotVerified] = useState<string | null>(null);

  const verifiedParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("verified") : null;
  const verifiedEmailParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("email") : null;

  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const nicknameTimerRef = useRef<any>(null);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { emailOrUsername: "", password: "", rememberMe: false },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { 
      nickname: "",
      email: "", 
      password: "", 
      confirmPassword: "",
      isPublican: false,
      pubName: "",
      pubAddress: "",
      pubCity: "",
      pubRegion: "",
      vatNumber: "",
      phone: "",
      description: "",
      isBrewery: false,
      breweryId: undefined,
      breweryName: "",
      breweryLocation: "",
      breweryRegion: "",
      breweryCountry: "",
      breweryVatNumber: "",
      breweryPhone: "",
      breweryDescription: "",
      breweryWebsite: "",
    },
  });

  const isPublican = registerForm.watch("isPublican");
  const isBrewery = registerForm.watch("isBrewery");
  const [brewerySearch, setBrewerySearch] = useState("");
  const [selectedBrewery, setSelectedBrewery] = useState<Brewery | null>(null);
  const [creatingNewBrewery, setCreatingNewBrewery] = useState(false);

  const { data: searchedBreweries } = useQuery<Brewery[]>({
    queryKey: [`/api/breweries/search?q=${encodeURIComponent(brewerySearch)}`],
    enabled: isBrewery && brewerySearch.length >= 2 && !selectedBrewery && !creatingNewBrewery,
  });

  const handleAddressSelect = useCallback((details: {
    formattedAddress: string;
    city: string;
    region: string;
    country: string;
    placeId: string;
  }) => {
    registerForm.setValue("pubAddress", details.formattedAddress);
    registerForm.setValue("pubCity", details.city);
    registerForm.setValue("pubRegion", details.region);
  }, [registerForm]);

  const handleBreweryAddressSelect = useCallback((details: {
    formattedAddress: string;
    city: string;
    region: string;
    country: string;
    placeId: string;
  }) => {
    registerForm.setValue("breweryLocation", details.formattedAddress);
    registerForm.setValue("breweryRegion", details.region);
    registerForm.setValue("breweryCountry", details.country);
  }, [registerForm]);

  const checkNickname = useCallback(async (value: string) => {
    if (!value || value.length < 3) { setNicknameAvailable(null); return; }
    setNicknameChecking(true);
    try {
      const res = await fetch(`/api/auth/check-nickname?nickname=${encodeURIComponent(value)}`, { credentials: "include" });
      const data = await res.json();
      setNicknameAvailable(data.available);
    } catch { setNicknameAvailable(null); }
    finally { setNicknameChecking(false); }
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      return await apiRequest("/api/auth/login", { method: "POST" }, { ...data, recaptchaToken: loginRecaptchaToken });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Benvenuto!", description: "Login effettuato con successo" });
      setLocation("/");
    },
    onError: (error: any) => {
      if (error.emailNotVerified) {
        setEmailNotVerified(error.email || loginForm.getValues("email"));
        loginRecaptchaRef.current?.reset();
        setLoginRecaptchaToken(null);
        return;
      }
      loginRecaptchaRef.current?.reset();
      setLoginRecaptchaToken(null);
      toast({ 
        title: "Errore", 
        description: error.message || "Credenziali non valide", 
        variant: "destructive" 
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const { confirmPassword, ...registerData } = data;
      return await apiRequest("/api/auth/register", { method: "POST" }, { ...registerData, recaptchaToken: registerRecaptchaToken });
    },
    onSuccess: (data: any) => {
      if (data?.pendingVerification) {
        setPendingVerificationEmail(data.email);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Registrazione completata!", description: "Benvenuto su Fermenta.to" });
      setLocation("/");
    },
    onError: (error: any) => {
      registerRecaptchaRef.current?.reset();
      setRegisterRecaptchaToken(null);
      toast({ 
        title: "Errore", 
        description: error.message || "Errore durante la registrazione", 
        variant: "destructive" 
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("/api/auth/resend-verification", { method: "POST" }, { email });
    },
    onSuccess: () => {
      toast({ title: "Email inviata!", description: "Controlla la tua casella di posta e clicca il link di conferma." });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile inviare l'email. Riprova.", variant: "destructive" });
    },
  });

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  if (pendingVerificationEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="pt-10 pb-8 px-8 text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <MailCheck className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Controlla la tua email!</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Abbiamo inviato un link di conferma a
              </p>
              <p className="font-semibold text-amber-600 mt-1">{pendingVerificationEmail}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-3">
                Clicca il link nell'email per attivare il tuo account. Il link scade in 24 ore.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => resendMutation.mutate(pendingVerificationEmail)}
                disabled={resendMutation.isPending}
              >
                {resendMutation.isPending ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Invio in corso...</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" />Reinvia email di conferma</>
                )}
              </Button>
              <Button variant="ghost" className="w-full text-gray-500" onClick={() => { setPendingVerificationEmail(null); setActiveTab("login"); }}>
                Torna al login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Beer className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Fermenta.to
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Scopri la birra artigianale italiana
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="tab-login">Accedi</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Registrati</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              {verifiedParam === "success" && (
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium">Email verificata! Ora puoi accedere al tuo account.</p>
                </div>
              )}
              {verifiedParam === "expired" && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">Link scaduto.</p>
                    {verifiedEmailParam && (
                      <button className="text-sm text-amber-600 underline mt-1" onClick={() => resendMutation.mutate(verifiedEmailParam)}>
                        Clicca qui per ricevere un nuovo link
                      </button>
                    )}
                  </div>
                </div>
              )}
              {emailNotVerified && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                  <Mail className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">Email non verificata.</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Controlla la tua casella di posta e clicca il link di conferma.</p>
                    <button
                      className="text-xs text-amber-600 dark:text-amber-400 underline mt-1 hover:no-underline disabled:opacity-50"
                      onClick={() => resendMutation.mutate(emailNotVerified)}
                      disabled={resendMutation.isPending}
                    >
                      {resendMutation.isPending ? "Invio..." : "Reinvia email di conferma"}
                    </button>
                  </div>
                </div>
              )}
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="emailOrUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email o Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                              {...field} 
                              placeholder="tu@esempio.it oppure @username" 
                              className="pl-10"
                              data-testid="input-login-email"
                              autoComplete="username"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                              {...field} 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              className="pl-10 pr-10"
                              data-testid="input-login-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal text-gray-600 dark:text-gray-400 cursor-pointer">
                          Ricordami
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {RECAPTCHA_SITE_KEY && (
                    <div className="flex justify-center">
                      <ReCAPTCHA
                        ref={loginRecaptchaRef}
                        sitekey={RECAPTCHA_SITE_KEY}
                        onChange={(token) => setLoginRecaptchaToken(token)}
                        onExpired={() => setLoginRecaptchaToken(null)}
                        theme="light"
                        hl="it"
                      />
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                    disabled={loginMutation.isPending || (!!RECAPTCHA_SITE_KEY && !loginRecaptchaToken)}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? "Accesso in corso..." : "Accedi"}
                  </Button>
                </form>
              </Form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">oppure</span>
                </div>
              </div>

              <Button 
                type="button"
                variant="outline" 
                className="w-full"
                onClick={handleGoogleLogin}
                data-testid="button-google-login"
              >
                <SiGoogle className="w-4 h-4 mr-2" />
                Continua con Google
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="nickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">@</span>
                            <Input
                              {...field}
                              placeholder="il_tuo_username"
                              className={`pl-7 pr-8 ${
                                nicknameAvailable === true ? "border-green-500 focus-visible:ring-green-500" :
                                nicknameAvailable === false ? "border-red-500 focus-visible:ring-red-500" : ""
                              }`}
                              data-testid="input-register-nickname"
                              autoComplete="username"
                              onChange={(e) => {
                                field.onChange(e);
                                const val = e.target.value;
                                setNicknameAvailable(null);
                                if (nicknameTimerRef.current) clearTimeout(nicknameTimerRef.current);
                                nicknameTimerRef.current = setTimeout(() => checkNickname(val), 500);
                              }}
                            />
                            {nicknameChecking && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                            )}
                            {!nicknameChecking && nicknameAvailable === true && (
                              <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                            )}
                            {!nicknameChecking && nicknameAvailable === false && (
                              <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </FormControl>
                        {nicknameAvailable === true && (
                          <p className="text-xs text-green-600">Username disponibile!</p>
                        )}
                        {nicknameAvailable === false && (
                          <p className="text-xs text-red-500">Username già in uso</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                              {...field} 
                              type="email" 
                              placeholder="tu@esempio.it" 
                              className="pl-10"
                              data-testid="input-register-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                              {...field} 
                              type={showPassword ? "text" : "password"} 
                              placeholder="Minimo 8 caratteri" 
                              className="pl-10 pr-10"
                              data-testid="input-register-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conferma Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                              {...field} 
                              type={showPassword ? "text" : "password"} 
                              placeholder="Ripeti la password" 
                              className="pl-10"
                              data-testid="input-register-confirm-password"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Role Selection Toggles */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Che tipo di account vuoi creare?</p>
                    
                    {/* Publican Toggle */}
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <FormField
                        control={registerForm.control}
                        name="isPublican"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-amber-100 dark:bg-amber-800/30 rounded-full">
                                <Store className="w-5 h-5 text-amber-600" />
                              </div>
                              <div>
                                <FormLabel className="font-medium text-amber-900 dark:text-amber-100">
                                  Sono un gestore di pub
                                </FormLabel>
                                <FormDescription className="text-xs text-amber-700 dark:text-amber-300">
                                  Registra il tuo locale su Fermenta.to
                                </FormDescription>
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  if (checked) {
                                    registerForm.setValue("isBrewery", false);
                                    setSelectedBrewery(null);
                                    setCreatingNewBrewery(false);
                                    setBrewerySearch("");
                                    registerForm.setValue("breweryId", undefined);
                                    registerForm.setValue("breweryName", "");
                                  }
                                }}
                                data-testid="switch-is-publican"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Brewery Toggle */}
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <FormField
                        control={registerForm.control}
                        name="isBrewery"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-orange-100 dark:bg-orange-800/30 rounded-full">
                                <Factory className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <FormLabel className="font-medium text-orange-900 dark:text-orange-100">
                                  Sono un birrificio
                                </FormLabel>
                                <FormDescription className="text-xs text-orange-700 dark:text-orange-300">
                                  Gestisci il tuo birrificio e le tue birre
                                </FormDescription>
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  if (checked) {
                                    registerForm.setValue("isPublican", false);
                                  } else {
                                    setSelectedBrewery(null);
                                    setCreatingNewBrewery(false);
                                    setBrewerySearch("");
                                    registerForm.setValue("breweryId", undefined);
                                    registerForm.setValue("breweryName", "");
                                  }
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Pub / Brewpub → redirect to dedicated registration page */}
                  {isPublican && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-800/40 rounded-full flex-shrink-0 mt-0.5">
                          <Store className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-amber-900 dark:text-amber-100 text-sm">Registrazione pub dedicata</p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                            Completa la registrazione nella pagina dedicata per gestire il tuo locale su Fermenta.to.
                          </p>
                        </div>
                      </div>
                      <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 pl-2">
                        <li className="flex items-center gap-1.5"><span className="text-green-600">✓</span> 15 giorni di prova gratuita</li>
                        <li className="flex items-center gap-1.5"><span className="text-green-600">✓</span> Poi solo €65/anno (IVA inclusa)</li>
                        <li className="flex items-center gap-1.5"><span className="text-green-600">✓</span> Puoi annullare la prova in qualsiasi momento</li>
                        <li className="flex items-center gap-1.5"><span className="text-green-600">✓</span> Supporto brewpub (gestisci pub + birrificio)</li>
                      </ul>
                    </div>
                  )}

                  {/* Brewery Details */}
                  {isBrewery && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Factory className="w-4 h-4" />
                        Dati del Birrificio
                      </h3>

                      {!selectedBrewery && !creatingNewBrewery && (
                        <>
                          <div>
                            <FormLabel className="text-sm">Cerca il tuo birrificio</FormLabel>
                            <div className="relative mt-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <Input
                                value={brewerySearch}
                                onChange={(e) => setBrewerySearch(e.target.value)}
                                placeholder="Nome del birrificio..."
                                className="pl-10"
                              />
                            </div>
                          </div>

                          {searchedBreweries && searchedBreweries.length > 0 && (
                            <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                              {searchedBreweries.map((b) => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedBrewery(b);
                                    registerForm.setValue("breweryId", b.id);
                                    registerForm.setValue("breweryName", b.name);
                                    registerForm.setValue("breweryLocation", b.location || "");
                                    registerForm.setValue("breweryRegion", b.region || "");
                                    registerForm.setValue("breweryCountry", (b as any).country || "");
                                    setBrewerySearch("");
                                  }}
                                  className="w-full text-left p-2 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                >
                                  <div className="font-medium text-sm text-gray-900 dark:text-white">{b.name}</div>
                                  <div className="text-xs text-gray-500">{b.location} {b.region ? `• ${b.region}` : ''}</div>
                                </button>
                              ))}
                            </div>
                          )}

                          {brewerySearch.length >= 2 && searchedBreweries && searchedBreweries.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-2">Nessun birrificio trovato per "{brewerySearch}"</p>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setCreatingNewBrewery(true);
                              if (brewerySearch) {
                                registerForm.setValue("breweryName", brewerySearch);
                              }
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Crea nuovo birrificio
                          </Button>
                        </>
                      )}

                      {selectedBrewery && (
                        <div className="space-y-3">
                          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-amber-900 dark:text-amber-100">{selectedBrewery.name}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedBrewery(null);
                                  registerForm.setValue("breweryId", undefined);
                                  registerForm.setValue("breweryName", "");
                                  registerForm.setValue("breweryLocation", "");
                                  registerForm.setValue("breweryRegion", "");
                                  registerForm.setValue("breweryCountry", "");
                                }}
                                className="text-xs"
                              >
                                Cambia
                              </Button>
                            </div>
                          </div>

                          <FormField
                            control={registerForm.control}
                            name="breweryLocation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sede del Birrificio</FormLabel>
                                <FormControl>
                                  <AddressAutocomplete
                                    value={field.value}
                                    onAddressSelect={handleBreweryAddressSelect}
                                    placeholder="Cerca la sede del birrificio..."
                                    countryRestriction={null}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Regione e nazione verranno compilati automaticamente.
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {creatingNewBrewery && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nuovo birrificio</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCreatingNewBrewery(false);
                                registerForm.setValue("breweryName", "");
                              }}
                              className="text-xs"
                            >
                              Annulla
                            </Button>
                          </div>

                          <FormField
                            control={registerForm.control}
                            name="breweryName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome Birrificio *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Es. Birrificio Italiano" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="breweryLocation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sede del Birrificio</FormLabel>
                                <FormControl>
                                  <AddressAutocomplete
                                    value={field.value}
                                    onAddressSelect={handleBreweryAddressSelect}
                                    placeholder="Cerca la sede del birrificio..."
                                    countryRestriction={null}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Regione e nazione verranno compilati automaticamente.
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {(selectedBrewery || creatingNewBrewery) && (
                        <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dati aziendali</p>

                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={registerForm.control}
                              name="breweryVatNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>P.IVA</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="IT12345678901" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={registerForm.control}
                              name="breweryPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Telefono</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                      <Input {...field} placeholder="+39 06 1234567" className="pl-10" />
                                    </div>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={registerForm.control}
                            name="breweryWebsite"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sito Web</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://www.birrificio.it" />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="breweryDescription"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Descrizione</FormLabel>
                                <FormControl>
                                  <Textarea {...field} placeholder="Racconta del tuo birrificio..." className="resize-none" rows={2} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {RECAPTCHA_SITE_KEY && !isPublican && (
                    <div className="flex justify-center">
                      <ReCAPTCHA
                        ref={registerRecaptchaRef}
                        sitekey={RECAPTCHA_SITE_KEY}
                        onChange={(token) => setRegisterRecaptchaToken(token)}
                        onExpired={() => setRegisterRecaptchaToken(null)}
                        theme="light"
                        hl="it"
                      />
                    </div>
                  )}

                  {isPublican ? (
                    <Button
                      type="button"
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                      onClick={() => {
                        const vals = registerForm.getValues();
                        if (vals.nickname || vals.email || vals.password) {
                          sessionStorage.setItem('pub_reg_basic', JSON.stringify({
                            nickname: vals.nickname,
                            email: vals.email,
                            password: vals.password,
                            confirmPassword: vals.confirmPassword,
                          }));
                        }
                        setLocation('/registra-pub');
                      }}
                    >
                      Continua la registrazione del pub →
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                      disabled={registerMutation.isPending || (!!RECAPTCHA_SITE_KEY && !registerRecaptchaToken)}
                      data-testid="button-register"
                    >
                      {registerMutation.isPending ? "Registrazione..." : isBrewery ? "Registra Birrificio" : "Crea Account"}
                    </Button>
                  )}
                </form>
              </Form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">oppure</span>
                </div>
              </div>

              <Button 
                type="button"
                variant="outline" 
                className="w-full"
                onClick={handleGoogleLogin}
                data-testid="button-google-register"
              >
                <SiGoogle className="w-4 h-4 mr-2" />
                Registrati con Google
              </Button>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-center text-gray-500 mt-6">
            Continuando, accetti i nostri <a href="/tos" className="underline">Termini di Servizio</a> e la <a href="/privacy" className="underline">Privacy Policy</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
