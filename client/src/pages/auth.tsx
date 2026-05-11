import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Capacitor } from "@capacitor/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Beer, Eye, EyeOff, Mail, Lock, User, Store, Phone, Factory, Plus, Search, MailCheck, RefreshCw, CheckCircle2, CheckCircle, XCircle, AlertTriangle, Check, X, QrCode, Loader2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import ReCAPTCHA from "react-google-recaptcha";
import type { Brewery } from "@shared/schema";

const RECAPTCHA_SITE_KEY = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) ||
  (import.meta.env.PROD ? "6LcDuIEsAAAAAAPwdAQ2rAKZvA_ae_FmyRlft11z" : undefined);

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "Email o username richiesti"),
  password: z.string().min(1, "Password richiesta"),
  rememberMe: z.boolean().default(false),
});

const PASSWORD_REQUIREMENTS = [
  { label: "8+ caratteri", test: (p: string) => p.length >= 8 },
  { label: "Maiuscola", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Numero", test: (p: string) => /[0-9]/.test(p) },
  { label: "Spec. (@!#...)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const registerSchema = z.object({
  nickname: z.string()
    .min(3, "Username: minimo 3 caratteri")
    .max(30, "Username: massimo 30 caratteri")
    .regex(/^[a-zA-Z0-9_.]+$/, "Solo lettere, numeri, punti e underscore"),
  email: z.string().email("Email non valida"),
  password: z.string()
    .min(8, "Minimo 8 caratteri")
    .regex(/[A-Z]/, "Serve almeno una lettera maiuscola")
    .regex(/[0-9]/, "Serve almeno un numero")
    .regex(/[^A-Za-z0-9]/, "Serve almeno un carattere speciale (@, #, !, ...)"),
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
  if (data.isPublican) return data.pubName && data.pubName.length > 0;
  return true;
}, { message: "Nome del locale richiesto", path: ["pubName"] })
  .refine((data) => {
    if (data.isPublican) return data.pubAddress && data.pubAddress.length > 0;
    return true;
  }, { message: "Seleziona un indirizzo dai suggerimenti", path: ["pubAddress"] })
  .refine((data) => {
    if (data.isBrewery && !data.breweryId) return data.breweryName && data.breweryName.length > 0;
    return true;
  }, { message: "Seleziona un birrificio esistente o inserisci il nome per crearne uno nuovo", path: ["breweryName"] });

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const loginRecaptchaRef = useRef<ReCAPTCHA>(null);
  const registerRecaptchaRef = useRef<ReCAPTCHA>(null);
  const [loginRecaptchaToken, setLoginRecaptchaToken] = useState<string | null>(null);
  const [registerRecaptchaToken, setRegisterRecaptchaToken] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [emailNotVerified, setEmailNotVerified] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState("");

  const verifiedParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("verified") : null;
  const verifiedEmailParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("email") : null;
  const tabParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
  const returnToParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("returnTo") : null;

  // Auto-select tab from URL
  useEffect(() => {
    if (tabParam === "register") setActiveTab("register");
  }, [tabParam]);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
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
      nickname: "", email: "", password: "", confirmPassword: "",
      isPublican: false, pubName: "", pubAddress: "", pubCity: "", pubRegion: "",
      vatNumber: "", phone: "", description: "", isBrewery: false,
      breweryId: undefined, breweryName: "", breweryLocation: "", breweryRegion: "",
      breweryCountry: "", breweryVatNumber: "", breweryPhone: "", breweryDescription: "", breweryWebsite: "",
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

  const handleBreweryAddressSelect = useCallback((details: {
    formattedAddress: string; city: string; region: string; country: string; placeId: string;
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
    mutationFn: async (data: LoginForm) =>
      await apiRequest("/api/auth/login", { method: "POST" }, { ...data, recaptchaToken: loginRecaptchaToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Su Capacitor Android il toast animato (position:fixed + CSS transition) corrompe
      // il layer touch del WebView e congela l'intera UI — lo saltiamo su native.
      if (!Capacitor.isNativePlatform()) {
        toast({ title: "Benvenuto!", description: "Login effettuato con successo" });
      }
      setLocation(returnToParam || "/");
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
      toast({ title: "Errore", description: error.message || "Credenziali non valide", variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const { confirmPassword, ...registerData } = data;
      return await apiRequest("/api/auth/register", { method: "POST" }, { ...registerData, recaptchaToken: registerRecaptchaToken });
    },
    onSuccess: (data: any) => {
      if (data?.pendingVerification) { setPendingVerificationEmail(data.email); return; }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      if (!Capacitor.isNativePlatform()) {
        toast({ title: "Registrazione completata!", description: "Benvenuto su Fermenta.to" });
      }
      setLocation(returnToParam || "/");
    },
    onError: (error: any) => {
      registerRecaptchaRef.current?.reset();
      setRegisterRecaptchaToken(null);
      toast({ title: "Errore", description: error.message || "Errore durante la registrazione", variant: "destructive" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (email: string) =>
      await apiRequest("/api/auth/resend-verification", { method: "POST" }, { email }),
    onSuccess: () => toast({ title: "Email inviata!", description: "Controlla la tua casella di posta e clicca il link di conferma." }),
    onError: () => toast({ title: "Errore", description: "Impossibile inviare l'email. Riprova.", variant: "destructive" }),
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) =>
      await apiRequest("/api/auth/forgot-password", { method: "POST" }, { email }),
    onSuccess: () => setForgotSent(true),
    onError: () => setForgotSent(true), // Always show success to avoid email enumeration
  });

  const handleGoogleLogin = () => { window.location.href = "/api/auth/google"; };

  const passReqs = PASSWORD_REQUIREMENTS.map(r => ({ ...r, passed: r.test(passwordValue) }));
  const passStrength = passReqs.filter(r => r.passed).length;

  if (pendingVerificationEmail) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-card rounded-2xl border border-stone-100 dark:border-border shadow-sm p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl flex items-center justify-center">
            <MailCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">Controlla la tua email</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Abbiamo inviato un link di conferma a
            </p>
            <p className="font-semibold text-primary dark:text-orange-400 mt-1 text-sm">{pendingVerificationEmail}</p>
            <p className="text-xs text-muted-foreground mt-3">
              Clicca il link nell'email per attivare il tuo account. Il link scade in 24 ore.
            </p>
          </div>
          <div className="space-y-2">
            <Button variant="outline" className="w-full text-sm border-stone-200 dark:border-border hover:bg-stone-50 dark:hover:bg-stone-900/20 text-foreground" onClick={() => resendMutation.mutate(pendingVerificationEmail)} disabled={resendMutation.isPending}>
              {resendMutation.isPending ? <><RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />Invio...</> : <><RefreshCw className="w-3.5 h-3.5 mr-2" />Reinvia email</>}
            </Button>
            <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={() => { setPendingVerificationEmail(null); setActiveTab("login"); }}>
              Torna al login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-card rounded-3xl border border-stone-100 dark:border-border shadow-sm p-6 md:p-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-gradient-to-br from-[hsl(24,78%,51%)] to-[hsl(20,82%,44%)] rounded-xl flex items-center justify-center">
              <Beer className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">fermenta.to</span>
          </div>

          {/* Tab switcher */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-5">
              {activeTab === "login" ? "Bentornato" : "Crea un account"}
            </h1>
            <div className="flex items-center p-1 bg-stone-50 dark:bg-stone-900/20 rounded-full border border-stone-200 dark:border-border">
              {(["login", "register"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-4 text-sm font-semibold rounded-full transition-all ${
                    activeTab === tab
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "login" ? "Accedi" : "Registrati"}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <a
                href="/festival"
                className="flex items-center gap-1.5 text-sm font-medium text-primary dark:text-orange-400 hover:text-primary/80 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" />
                Festival Mode
              </a>
            </div>
          </div>

          {/* ── LOGIN FORM ── */}
          {activeTab === "login" && (
            <div className="space-y-5">
              {verifiedParam === "success" && (
                <div className="flex items-center gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Email verificata! Ora puoi accedere.</p>
                </div>
              )}
              {verifiedParam === "expired" && (
                <div className="flex items-start gap-3 p-3.5 bg-stone-50 dark:bg-stone-900/20 border border-stone-200 dark:border-stone-700/30 rounded-xl">
                  <AlertTriangle className="w-4.5 h-4.5 text-primary dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-primary dark:text-orange-400 font-medium">Link scaduto.</p>
                    {verifiedEmailParam && (
                      <button className="text-xs text-primary dark:text-orange-400 underline mt-1" onClick={() => resendMutation.mutate(verifiedEmailParam)}>
                        Richiedi un nuovo link
                      </button>
                    )}
                  </div>
                </div>
              )}
              {emailNotVerified && (
                <div className="flex items-start gap-3 p-3.5 bg-stone-50 dark:bg-stone-900/20 border border-stone-200 dark:border-stone-700/30 rounded-xl">
                  <Mail className="w-4.5 h-4.5 text-primary dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-primary dark:text-orange-400 font-medium">Email non verificata.</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Controlla la tua casella di posta.</p>
                    <button className="text-xs text-primary dark:text-orange-400 underline mt-1 disabled:opacity-50"
                      onClick={() => resendMutation.mutate(emailNotVerified)} disabled={resendMutation.isPending}>
                      {resendMutation.isPending ? "Invio..." : "Reinvia email di conferma"}
                    </button>
                  </div>
                </div>
              )}

              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                  <FormField control={loginForm.control} name="emailOrUsername" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Email o Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} placeholder="tu@esempio.it oppure @username" className="pl-10 h-11 bg-white dark:bg-card border-stone-200 dark:border-border focus-visible:ring-primary/20 rounded-xl"
                            data-testid="input-login-email" autoComplete="username" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={loginForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} type={showPassword ? "text" : "password"} placeholder="••••••••"
                            className="pl-10 pr-10 h-11 bg-white dark:bg-card border-stone-200 dark:border-border focus-visible:ring-primary/20 rounded-xl"
                            data-testid="input-login-password" autoComplete="current-password" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={loginForm.control} name="rememberMe" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <input type="checkbox" checked={field.value} onChange={field.onChange}
                          className="h-4 w-4 rounded border-stone-200 text-primary focus:ring-primary/20 cursor-pointer accent-primary" />
                      </FormControl>
                      <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer">Ricordami</FormLabel>
                    </FormItem>
                  )} />

                  {RECAPTCHA_SITE_KEY && (
                    <div className="flex justify-center">
                      <ReCAPTCHA ref={loginRecaptchaRef} sitekey={RECAPTCHA_SITE_KEY}
                        onChange={(token) => setLoginRecaptchaToken(token)} onExpired={() => setLoginRecaptchaToken(null)} theme="light" hl="it" />
                    </div>
                  )}

                  <Button type="submit"
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors"
                    disabled={loginMutation.isPending || (!!RECAPTCHA_SITE_KEY && !loginRecaptchaToken)}
                    data-testid="button-login">
                    {loginMutation.isPending ? "Accesso in corso..." : "Accedi"}
                  </Button>

                  <div className="text-center">
                    <button type="button"
                      onClick={() => { setShowForgotPassword(true); setForgotSent(false); setForgotEmail(""); }}
                      className="text-sm text-primary dark:text-orange-400 hover:underline font-medium">
                      Password dimenticata?
                    </button>
                  </div>
                </form>
              </Form>

              {/* Forgot password panel */}
              {showForgotPassword && (
                <div className="mt-4 p-5 bg-stone-50 dark:bg-stone-900/20 rounded-xl border border-stone-200 dark:border-stone-700/30 space-y-4">
                  {forgotSent ? (
                    <div className="text-center space-y-2">
                      <MailCheck className="w-8 h-8 text-primary dark:text-orange-400 mx-auto" />
                      <p className="font-semibold text-foreground text-sm">Controlla la tua email</p>
                      <p className="text-xs text-muted-foreground">Se l'indirizzo è registrato, riceverai un link per resettare la password.</p>
                      <Button variant="ghost" className="text-xs text-primary dark:text-orange-400" onClick={() => setShowForgotPassword(false)}>Chiudi</Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">Recupero password</p>
                      <div className="space-y-2">
                        <Input placeholder="Inserisci la tua email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                          className="h-10 bg-white dark:bg-[hsl(25,14%,12%)] border-stone-200 dark:border-border rounded-xl" />
                        <div className="flex gap-2">
                          <Button className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl h-10" onClick={() => forgotPasswordMutation.mutate(forgotEmail)}
                            disabled={forgotPasswordMutation.isPending || !forgotEmail.includes("@")}>
                            Invia link
                          </Button>
                          <Button variant="ghost" className="text-muted-foreground h-10" onClick={() => setShowForgotPassword(false)}>Annulla</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200 dark:border-border"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-card px-2 text-muted-foreground">Oppure continua con</span></div>
              </div>

              <Button type="button" variant="outline" onClick={handleGoogleLogin}
                className="w-full h-11 bg-white dark:bg-[hsl(25,14%,12%)] border border-stone-200 dark:border-border text-foreground rounded-xl font-medium hover:bg-stone-50 dark:hover:bg-stone-900/20">
                <SiGoogle className="w-4 h-4 mr-2" />
                Google
              </Button>
            </div>
          )}

          {/* ── REGISTRATION FORM ── */}
          {activeTab === "register" && (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={registerForm.control} name="nickname" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} placeholder="Il tuo nome" className="pl-10 h-11 bg-white dark:bg-card border-stone-200 dark:border-border focus-visible:ring-primary/20 rounded-xl"
                            onChange={(e) => {
                              const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "");
                              field.onChange(val);
                              if (nicknameTimerRef.current) clearTimeout(nicknameTimerRef.current);
                              nicknameTimerRef.current = setTimeout(() => checkNickname(val), 500);
                            }} />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {nicknameChecking && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
                            {!nicknameChecking && nicknameAvailable === true && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                            {!nicknameChecking && nicknameAvailable === false && <XCircle className="w-4 h-4 text-destructive" />}
                          </div>
                        </div>
                      </FormControl>
                      {nicknameAvailable === false && <p className="text-[11px] text-destructive mt-1 font-medium">Username già in uso</p>}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={registerForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} type="email" placeholder="tu@esempio.it" className="pl-10 h-11 bg-white dark:bg-card border-stone-200 dark:border-border focus-visible:ring-primary/20 rounded-xl" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={registerForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} type={showPassword ? "text" : "password"} placeholder="••••••••"
                            className="pl-10 pr-10 h-11 bg-white dark:bg-card border-stone-200 dark:border-border focus-visible:ring-primary/20 rounded-xl"
                            onChange={(e) => { field.onChange(e); setPasswordValue(e.target.value); }} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      {passwordValue && (
                        <div className="mt-2.5 p-3 bg-stone-50/50 dark:bg-stone-900/10 rounded-xl border border-stone-200 dark:border-border">
                          <div className="flex gap-1 mb-2">
                            {[1, 2, 3, 4].map(idx => (
                              <div key={idx} className={`h-1 flex-1 rounded-full transition-colors ${
                                idx <= passStrength
                                  ? passStrength <= 1 ? "bg-destructive" : passStrength <= 3 ? "bg-yellow-500" : "bg-emerald-600"
                                  : "bg-stone-100 dark:bg-orange-900/30"
                              }`} />
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                            {passReqs.map(req => (
                              <div key={req.label} className="flex items-center gap-1.5">
                                {req.passed ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-muted-foreground" />}
                                <span className={`text-[10px] uppercase tracking-wider font-semibold ${req.passed ? "text-emerald-600" : "text-muted-foreground"}`}>{req.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={registerForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Conferma Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} type={showConfirmPassword ? "text" : "password"} placeholder="••••••••"
                            className="pl-10 pr-10 h-11 bg-white dark:bg-card border-stone-200 dark:border-border focus-visible:ring-primary/20 rounded-xl" />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Role Toggles */}
                <div className="space-y-4 pt-2">
                  <a href="/registra-pub" className={`block p-4 rounded-xl border bg-stone-50/50 dark:bg-stone-900/10 border-stone-200 dark:border-stone-700/30 hover:bg-stone-50 dark:hover:bg-stone-900/20 hover:border-stone-300 dark:hover:border-orange-800 transition-all duration-200 group`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-[hsl(25,14%,12%)] text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">Registra un Locale</p>
                          <p className="text-[11px] text-muted-foreground">Sei il proprietario di un pub o un bar?</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </a>

                  <div className={`p-4 rounded-xl border transition-all duration-300 ${isBrewery ? "bg-stone-50 dark:bg-stone-900/20 border-stone-300 dark:border-stone-700" : "bg-stone-50/50 dark:bg-stone-900/10 border-stone-200 dark:border-stone-700/30"}`}>
                    <FormField control={registerForm.control} name="isBrewery" render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${field.value ? "bg-primary text-white" : "bg-white dark:bg-[hsl(25,14%,12%)] text-muted-foreground"}`}>
                            <Factory className="w-5 h-5" />
                          </div>
                          <div>
                            <FormLabel className="text-sm font-bold block">Sei un Birrificio?</FormLabel>
                            <span className="text-[11px] text-muted-foreground">Gestisci la pagina del tuo birrificio.</span>
                          </div>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={(val) => { field.onChange(val); if (!val) { setSelectedBrewery(null); setCreatingNewBrewery(false); registerForm.setValue("breweryId", undefined); } }} /></FormControl>
                      </FormItem>
                    )} />

                    {isBrewery && (
                      <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        {!selectedBrewery && !creatingNewBrewery && (
                          <div className="space-y-4">
                            <FormItem>
                              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cerca Birrificio Esistente</FormLabel>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input value={brewerySearch} onChange={(e) => setBrewerySearch(e.target.value)} placeholder="Inserisci il nome..." className="pl-10 h-10 bg-white dark:bg-[hsl(25,14%,12%)] border-stone-200 dark:border-border rounded-xl" />
                              </div>
                            </FormItem>

                            {searchedBreweries && searchedBreweries.length > 0 && (
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {searchedBreweries.map(b => (
                                  <button key={b.id} type="button" onClick={() => { setSelectedBrewery(b); registerForm.setValue("breweryId", b.id); }} className="w-full p-2.5 flex items-center gap-3 rounded-lg border border-stone-200 dark:border-border bg-white dark:bg-[hsl(25,14%,12%)] hover:bg-stone-50 dark:hover:bg-stone-900/20 text-left transition-colors">
                                    <div className="w-8 h-8 rounded bg-stone-50 dark:bg-stone-900/20 flex items-center justify-center flex-shrink-0 text-primary dark:text-orange-400"><Factory className="w-4 h-4" /></div>
                                    <div><p className="text-sm font-bold leading-none">{b.name}</p><p className="text-[10px] text-muted-foreground mt-1">{b.location}</p></div>
                                  </button>
                                ))}
                              </div>
                            )}

                            <div className="relative py-2">
                              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200 dark:border-border"></div></div>
                              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-stone-50 dark:bg-card px-2 text-muted-foreground font-semibold">Oppure</span></div>
                            </div>

                            <Button type="button" variant="outline" onClick={() => setCreatingNewBrewery(true)} className="w-full h-10 border-stone-200 dark:border-border rounded-xl hover:bg-stone-50 dark:hover:bg-stone-900/20">
                              <Plus className="w-4 h-4 mr-2" /> Registra Nuovo Birrificio
                            </Button>
                          </div>
                        )}

                        {selectedBrewery && (
                          <div className="p-3 bg-white dark:bg-[hsl(25,14%,12%)] rounded-xl border border-primary/20 dark:border-stone-600/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center"><Check className="w-4 h-4" /></div>
                              <div><p className="text-sm font-bold leading-none">{selectedBrewery.name}</p><p className="text-[10px] text-muted-foreground mt-1">Birrificio selezionato</p></div>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedBrewery(null); registerForm.setValue("breweryId", undefined); }} className="text-xs text-muted-foreground">Cambia</Button>
                          </div>
                        )}

                        {creatingNewBrewery && (
                          <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-primary dark:text-orange-400 uppercase tracking-widest">Nuovo Birrificio</p>
                              <Button type="button" variant="ghost" size="sm" onClick={() => setCreatingNewBrewery(false)} className="h-6 px-2 text-[10px] text-muted-foreground">Annulla</Button>
                            </div>

                            <FormField control={registerForm.control} name="breweryName" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-semibold uppercase text-muted-foreground">Nome Birrificio *</FormLabel>
                                <FormControl><Input {...field} placeholder="Es: Birrificio dell'Eremo" className="h-10 bg-white dark:bg-[hsl(25,14%,12%)] border-stone-200 dark:border-border rounded-xl" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />

                            <FormField control={registerForm.control} name="breweryLocation" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-semibold uppercase text-muted-foreground">Sede Birrificio *</FormLabel>
                                <FormControl>
                                  <AddressAutocomplete onAddressSelect={handleBreweryAddressSelect} defaultValue={field.value} placeholder="Indirizzo sede..." className="h-10 bg-white dark:bg-[hsl(25,14%,12%)] border-stone-200 dark:border-border rounded-xl" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />

                            <div className="grid grid-cols-2 gap-4">
                              <FormField control={registerForm.control} name="breweryVatNumber" render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] font-semibold uppercase text-muted-foreground">P. IVA</FormLabel>
                                  <FormControl><Input {...field} placeholder="IT..." className="h-10 bg-white dark:bg-[hsl(25,14%,12%)] border-stone-200 dark:border-border rounded-xl" /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={registerForm.control} name="breweryPhone" render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] font-semibold uppercase text-muted-foreground">Telefono</FormLabel>
                                  <FormControl><Input {...field} placeholder="+39..." className="h-10 bg-white dark:bg-[hsl(25,14%,12%)] border-stone-200 dark:border-border rounded-xl" /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {RECAPTCHA_SITE_KEY && (
                  <div className="flex justify-center pt-2">
                    <ReCAPTCHA ref={registerRecaptchaRef} sitekey={RECAPTCHA_SITE_KEY}
                      onChange={(token) => setRegisterRecaptchaToken(token)} onExpired={() => setRegisterRecaptchaToken(null)} theme="light" hl="it" />
                  </div>
                )}

                <Button type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                  disabled={registerMutation.isPending || (!!RECAPTCHA_SITE_KEY && !registerRecaptchaToken)}>
                  {registerMutation.isPending ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creazione in corso...</> : "Crea Account"}
                </Button>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200 dark:border-border"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-card px-2 text-muted-foreground">Oppure registrati con</span></div>
                </div>

                <Button type="button" variant="outline" onClick={handleGoogleLogin}
                  className="w-full h-11 bg-white dark:bg-[hsl(25,14%,12%)] border border-stone-200 dark:border-border text-foreground rounded-xl font-medium hover:bg-stone-50 dark:hover:bg-stone-900/20">
                  <SiGoogle className="w-4 h-4 mr-2" />
                  Google
                </Button>
              </form>
            </Form>
          )}

          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Continuando, accetti i nostri{" "}
              <a href="/tos" className="text-primary dark:text-orange-400 font-semibold hover:underline">Termini di Servizio</a> e la{" "}
              <a href="/privacy" className="text-primary dark:text-orange-400 font-semibold hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
  );
}
