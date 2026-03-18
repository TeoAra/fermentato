import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
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
import { Beer, Eye, EyeOff, Mail, Lock, User, Store, Phone, Factory, Plus, Search, MailCheck, RefreshCw, CheckCircle2, CheckCircle, XCircle, AlertTriangle, Check, X, QrCode } from "lucide-react";
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

  const handleAddressSelect = useCallback((details: {
    formattedAddress: string; city: string; region: string; country: string; placeId: string;
  }) => {
    registerForm.setValue("pubAddress", details.formattedAddress);
    registerForm.setValue("pubCity", details.city);
    registerForm.setValue("pubRegion", details.region);
  }, [registerForm]);

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
      toast({ title: "Benvenuto!", description: "Login effettuato con successo" });
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
      toast({ title: "Registrazione completata!", description: "Benvenuto su Fermenta.to" });
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

  const handleGoogleLogin = () => { window.location.href = "/api/auth/google"; };

  const passReqs = PASSWORD_REQUIREMENTS.map(r => ({ ...r, passed: r.test(passwordValue) }));
  const passStrength = passReqs.filter(r => r.passed).length;

  if (pendingVerificationEmail) {
    return (
      <div className="min-h-screen bg-[hsl(38,14%,97%)] dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
            <MailCheck className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Controlla la tua email</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Abbiamo inviato un link di conferma a
            </p>
            <p className="font-semibold text-amber-600 mt-1 text-sm">{pendingVerificationEmail}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              Clicca il link nell'email per attivare il tuo account. Il link scade in 24 ore.
            </p>
          </div>
          <div className="space-y-2">
            <Button variant="outline" className="w-full text-sm" onClick={() => resendMutation.mutate(pendingVerificationEmail)} disabled={resendMutation.isPending}>
              {resendMutation.isPending ? <><RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />Invio...</> : <><RefreshCw className="w-3.5 h-3.5 mr-2" />Reinvia email</>}
            </Button>
            <Button variant="ghost" className="w-full text-sm text-gray-400" onClick={() => { setPendingVerificationEmail(null); setActiveTab("login"); }}>
              Torna al login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(38,14%,97%)] dark:bg-gray-950 flex">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-shrink-0 bg-[hsl(25,30%,12%)] dark:bg-[hsl(25,30%,8%)] flex-col justify-between p-10 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-700/10 pointer-events-none" />
        <div className="absolute bottom-10 -left-16 w-56 h-56 rounded-full bg-amber-700/10 pointer-events-none" />
        <div className="absolute top-1/2 right-8 w-32 h-32 rounded-full bg-amber-600/5 pointer-events-none" />

        {/* Logo */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Beer className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">fermenta.to</span>
          </div>
          <p className="text-amber-200/50 text-xs mt-1 ml-[52px]">Bevi Artigianale</p>
        </div>

        {/* Central content */}
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Scopri il meglio<br />
              <span className="text-amber-400">della birra artigianale</span><br />
              italiana e del mondo.
            </h2>
            <p className="mt-4 text-amber-100/50 text-sm leading-relaxed max-w-xs">
              Migliaia di birre, birrifici e locali selezionati. Tieni traccia di quello che assaggi, scopri nuovi posti, condividi le tue esperienze.
            </p>
          </div>

          <div className="space-y-3">
            {[
              "Catalogo di oltre 1 milione di birre",
              "Mappa dei pub e birrifici italiani",
              "Valutazioni e recensioni dalla community",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-amber-400" />
                </div>
                <span className="text-amber-100/70 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="text-amber-100/30 text-xs">© {new Date().getFullYear()} Fermenta.to</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-amber-600 rounded-xl flex items-center justify-center">
              <Beer className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">fermenta.to</span>
          </div>

          {/* Tab switcher */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-5">
              {activeTab === "login" ? "Bentornato" : "Crea un account"}
            </h1>
            <div className="flex items-end border-b border-gray-200 dark:border-gray-800">
              {(["login", "register"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 px-1 mr-6 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === tab
                      ? "border-amber-500 text-amber-600 dark:text-amber-400"
                      : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  {tab === "login" ? "Accedi" : "Registrati"}
                </button>
              ))}
              <a
                href="/festival"
                className="pb-3 px-1 ml-auto -mb-px flex items-center gap-1.5 text-sm font-medium border-b-2 border-transparent text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
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
                <div className="flex items-center gap-3 p-3.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <CheckCircle2 className="w-4.5 h-4.5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium">Email verificata! Ora puoi accedere.</p>
                </div>
              )}
              {verifiedParam === "expired" && (
                <div className="flex items-start gap-3 p-3.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                  <AlertTriangle className="w-4.5 h-4.5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">Link scaduto.</p>
                    {verifiedEmailParam && (
                      <button className="text-xs text-amber-600 underline mt-1" onClick={() => resendMutation.mutate(verifiedEmailParam)}>
                        Richiedi un nuovo link
                      </button>
                    )}
                  </div>
                </div>
              )}
              {emailNotVerified && (
                <div className="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                  <Mail className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">Email non verificata.</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">Controlla la tua casella di posta.</p>
                    <button className="text-xs text-amber-600 dark:text-amber-400 underline mt-1 disabled:opacity-50"
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
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Email o Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input {...field} placeholder="tu@esempio.it oppure @username" className="pl-10 h-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl"
                            data-testid="input-login-email" autoComplete="username" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={loginForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input {...field} type={showPassword ? "text" : "password"} placeholder="••••••••"
                            className="pl-10 pr-10 h-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl"
                            data-testid="input-login-password" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
                          className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600" />
                      </FormControl>
                      <FormLabel className="text-sm font-normal text-gray-500 dark:text-gray-400 cursor-pointer">Ricordami</FormLabel>
                    </FormItem>
                  )} />

                  {RECAPTCHA_SITE_KEY && (
                    <div className="flex justify-center">
                      <ReCAPTCHA ref={loginRecaptchaRef} sitekey={RECAPTCHA_SITE_KEY}
                        onChange={(token) => setLoginRecaptchaToken(token)} onExpired={() => setLoginRecaptchaToken(null)} theme="light" hl="it" />
                    </div>
                  )}

                  <Button type="submit"
                    className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors"
                    disabled={loginMutation.isPending || (!!RECAPTCHA_SITE_KEY && !loginRecaptchaToken)}
                    data-testid="button-login">
                    {loginMutation.isPending ? "Accesso in corso..." : "Accedi"}
                  </Button>
                </form>
              </Form>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200 dark:border-gray-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[hsl(38,14%,97%)] dark:bg-gray-950 px-3 text-gray-400">oppure</span>
                </div>
              </div>

              <Button type="button" variant="outline"
                className="w-full h-11 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={handleGoogleLogin} data-testid="button-google-login">
                <SiGoogle className="w-4 h-4 mr-2" />
                Continua con Google
              </Button>

              <p className="text-center text-sm text-gray-400">
                Non hai un account?{" "}
                <button onClick={() => setActiveTab("register")} className="text-amber-600 font-medium hover:underline">
                  Registrati
                </button>
              </p>
            </div>
          )}

          {/* ── REGISTER FORM ── */}
          {activeTab === "register" && (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">

                {/* Username */}
                <FormField control={registerForm.control} name="nickname" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">@</span>
                        <Input {...field} placeholder="il_tuo_username"
                          className={`pl-7 pr-8 h-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl ${
                            nicknameAvailable === true ? "border-green-500 focus-visible:ring-green-500" :
                            nicknameAvailable === false ? "border-red-500 focus-visible:ring-red-500" : ""
                          }`}
                          data-testid="input-register-nickname" autoComplete="username"
                          onChange={(e) => {
                            field.onChange(e);
                            setNicknameAvailable(null);
                            if (nicknameTimerRef.current) clearTimeout(nicknameTimerRef.current);
                            nicknameTimerRef.current = setTimeout(() => checkNickname(e.target.value), 500);
                          }} />
                        {nicknameChecking && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />}
                        {!nicknameChecking && nicknameAvailable === true && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                        {!nicknameChecking && nicknameAvailable === false && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />}
                      </div>
                    </FormControl>
                    {nicknameAvailable === true && <p className="text-xs text-green-600">Username disponibile!</p>}
                    {nicknameAvailable === false && <p className="text-xs text-red-500">Username già in uso</p>}
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Email */}
                <FormField control={registerForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input {...field} type="email" placeholder="tu@esempio.it"
                          className="pl-10 h-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl"
                          data-testid="input-register-email" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Password + strength meter */}
                <FormField control={registerForm.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input {...field} type={showPassword ? "text" : "password"} placeholder="Crea una password sicura"
                          className="pl-10 pr-10 h-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl"
                          data-testid="input-register-password"
                          onChange={(e) => { field.onChange(e); setPasswordValue(e.target.value); }} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    {/* Strength bar */}
                    {passwordValue.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                              i < passStrength
                                ? passStrength <= 1 ? "bg-red-400"
                                : passStrength <= 2 ? "bg-orange-400"
                                : passStrength <= 3 ? "bg-amber-400"
                                : "bg-green-500"
                                : "bg-gray-200 dark:bg-gray-700"
                            }`} />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {passReqs.map((req) => (
                            <span key={req.label} className={`flex items-center gap-1 text-xs transition-colors ${req.passed ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
                              {req.passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              {req.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Confirm password */}
                <FormField control={registerForm.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Conferma Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input {...field} type={showConfirmPassword ? "text" : "password"} placeholder="Ripeti la password"
                          className="pl-10 pr-10 h-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl"
                          data-testid="input-register-confirm-password" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Role toggles */}
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tipo di account</p>

                  {/* Pub toggle */}
                  <div className={`p-3.5 rounded-xl border transition-colors ${isPublican ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"}`}>
                    <FormField control={registerForm.control} name="isPublican" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${isPublican ? "bg-amber-100 dark:bg-amber-800/40" : "bg-gray-100 dark:bg-gray-800"}`}>
                            <Store className={`w-4 h-4 ${isPublican ? "text-amber-600" : "text-gray-400"}`} />
                          </div>
                          <div>
                            <FormLabel className={`text-sm font-medium ${isPublican ? "text-amber-900 dark:text-amber-100" : "text-gray-700 dark:text-gray-300"}`}>
                              Gestore di pub
                            </FormLabel>
                            <FormDescription className="text-xs text-gray-400 dark:text-gray-500">
                              Registra il tuo locale
                            </FormDescription>
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-is-publican" />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>

                  {/* Brewery toggle */}
                  <div className={`p-3.5 rounded-xl border transition-colors ${isBrewery ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"}`}>
                    <FormField control={registerForm.control} name="isBrewery" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${isBrewery ? "bg-orange-100 dark:bg-orange-800/40" : "bg-gray-100 dark:bg-gray-800"}`}>
                            <Factory className={`w-4 h-4 ${isBrewery ? "text-orange-600" : "text-gray-400"}`} />
                          </div>
                          <div>
                            <FormLabel className={`text-sm font-medium ${isBrewery ? "text-orange-900 dark:text-orange-100" : "text-gray-700 dark:text-gray-300"}`}>
                              Birrificio
                            </FormLabel>
                            <FormDescription className="text-xs text-gray-400 dark:text-gray-500">
                              Gestisci birrificio e birre
                            </FormDescription>
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (!checked) { setSelectedBrewery(null); setCreatingNewBrewery(false); setBrewerySearch(""); registerForm.setValue("breweryId", undefined); registerForm.setValue("breweryName", ""); }
                          }} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Pub info box */}
                {isPublican && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <Store className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-900 dark:text-amber-100 text-sm">Registrazione pub dedicata</p>
                        <p className="text-xs text-amber-700/70 dark:text-amber-300/70 mt-0.5">
                          Completa la registrazione nella pagina dedicata per il tuo locale.
                        </p>
                      </div>
                    </div>
                    <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 pl-1">
                      {["15 giorni di prova gratuita", "Poi solo €65/anno (IVA inclusa)", "Puoi annullare in qualsiasi momento", "Supporto brewpub"].map(item => (
                        <li key={item} className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-green-600 flex-shrink-0" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Brewery section */}
                {isBrewery && (
                  <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
                      <Factory className="w-4 h-4" />Dati del Birrificio
                    </h3>

                    {!selectedBrewery && !creatingNewBrewery && (
                      <>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input value={brewerySearch} onChange={(e) => setBrewerySearch(e.target.value)}
                            placeholder="Cerca il tuo birrificio..." className="pl-10 h-10 rounded-xl" />
                        </div>

                        {searchedBreweries && searchedBreweries.length > 0 && (
                          <div className="max-h-40 overflow-y-auto space-y-1 border rounded-xl p-2 bg-white dark:bg-gray-900">
                            {searchedBreweries.map((b) => (
                              <button key={b.id} type="button" onClick={() => {
                                setSelectedBrewery(b);
                                registerForm.setValue("breweryId", b.id);
                                registerForm.setValue("breweryName", b.name);
                                registerForm.setValue("breweryLocation", b.location || "");
                                registerForm.setValue("breweryRegion", b.region || "");
                                registerForm.setValue("breweryCountry", (b as any).country || "");
                                setBrewerySearch("");
                              }} className="w-full text-left p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                                <div className="font-medium text-sm text-gray-900 dark:text-white">{b.name}</div>
                                <div className="text-xs text-gray-500">{b.location} {b.region ? `• ${b.region}` : ''}</div>
                              </button>
                            ))}
                          </div>
                        )}
                        {brewerySearch.length >= 2 && searchedBreweries && searchedBreweries.length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-2">Nessun birrificio trovato</p>
                        )}
                        <Button type="button" variant="outline" size="sm" className="w-full rounded-xl"
                          onClick={() => { setCreatingNewBrewery(true); if (brewerySearch) registerForm.setValue("breweryName", brewerySearch); }}>
                          <Plus className="w-4 h-4 mr-1" />Crea nuovo birrificio
                        </Button>
                      </>
                    )}

                    {selectedBrewery && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                          <p className="font-medium text-amber-900 dark:text-amber-100 text-sm">{selectedBrewery.name}</p>
                          <Button type="button" variant="ghost" size="sm" className="text-xs h-7 px-2"
                            onClick={() => { setSelectedBrewery(null); registerForm.setValue("breweryId", undefined); registerForm.setValue("breweryName", ""); registerForm.setValue("breweryLocation", ""); registerForm.setValue("breweryRegion", ""); registerForm.setValue("breweryCountry", ""); }}>
                            Cambia
                          </Button>
                        </div>
                        <FormField control={registerForm.control} name="breweryLocation" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Sede</FormLabel>
                            <FormControl>
                              <AddressAutocomplete value={field.value} onAddressSelect={handleBreweryAddressSelect}
                                placeholder="Cerca la sede del birrificio..." countryRestriction={null} />
                            </FormControl>
                            <FormDescription className="text-xs">Regione e nazione compilati automaticamente.</FormDescription>
                          </FormItem>
                        )} />
                      </div>
                    )}

                    {creatingNewBrewery && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nuovo birrificio</p>
                          <Button type="button" variant="ghost" size="sm" className="text-xs h-7 px-2"
                            onClick={() => { setCreatingNewBrewery(false); registerForm.setValue("breweryName", ""); }}>
                            Annulla
                          </Button>
                        </div>
                        <FormField control={registerForm.control} name="breweryName" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Nome Birrificio *</FormLabel>
                            <FormControl><Input {...field} placeholder="Es. Birrificio Italiano" className="h-10 rounded-xl" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={registerForm.control} name="breweryLocation" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Sede</FormLabel>
                            <FormControl>
                              <AddressAutocomplete value={field.value} onAddressSelect={handleBreweryAddressSelect}
                                placeholder="Cerca la sede..." countryRestriction={null} />
                            </FormControl>
                            <FormDescription className="text-xs">Regione e nazione compilati automaticamente.</FormDescription>
                          </FormItem>
                        )} />
                      </div>
                    )}

                    {(selectedBrewery || creatingNewBrewery) && (
                      <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Dati aziendali</p>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={registerForm.control} name="breweryVatNumber" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">P.IVA</FormLabel>
                              <FormControl><Input {...field} placeholder="IT12345678901" className="h-10 rounded-xl" /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={registerForm.control} name="breweryPhone" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Telefono</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <Input {...field} placeholder="+39 02..." className="pl-10 h-10 rounded-xl" />
                                </div>
                              </FormControl>
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={registerForm.control} name="breweryWebsite" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Sito Web</FormLabel>
                            <FormControl><Input {...field} placeholder="https://www.birrificio.it" className="h-10 rounded-xl" /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={registerForm.control} name="breweryDescription" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Descrizione</FormLabel>
                            <FormControl><Textarea {...field} placeholder="Racconta del tuo birrificio..." className="resize-none rounded-xl" rows={2} /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    )}
                  </div>
                )}

                {RECAPTCHA_SITE_KEY && !isPublican && (
                  <div className="flex justify-center">
                    <ReCAPTCHA ref={registerRecaptchaRef} sitekey={RECAPTCHA_SITE_KEY}
                      onChange={(token) => setRegisterRecaptchaToken(token)} onExpired={() => setRegisterRecaptchaToken(null)} theme="light" hl="it" />
                  </div>
                )}

                {isPublican ? (
                  <Button type="button"
                    className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors"
                    onClick={() => {
                      const vals = registerForm.getValues();
                      if (vals.nickname || vals.email || vals.password) {
                        sessionStorage.setItem('pub_reg_basic', JSON.stringify({
                          nickname: vals.nickname, email: vals.email,
                          password: vals.password, confirmPassword: vals.confirmPassword,
                        }));
                      }
                      if (vals.isBrewery) {
                        sessionStorage.setItem('pub_reg_brewery', JSON.stringify({
                          isBrewpub: true, breweryId: vals.breweryId, breweryName: vals.breweryName,
                          breweryLocation: vals.breweryLocation, breweryRegion: vals.breweryRegion,
                          breweryCountry: vals.breweryCountry, breweryVatNumber: vals.breweryVatNumber,
                          breweryPhone: vals.breweryPhone, breweryDescription: vals.breweryDescription,
                          breweryWebsite: vals.breweryWebsite,
                        }));
                      }
                      setLocation("/registra-pub");
                    }}>
                    Continua con la registrazione pub →
                  </Button>
                ) : (
                  <Button type="submit"
                    className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors"
                    disabled={registerMutation.isPending || (!!RECAPTCHA_SITE_KEY && !registerRecaptchaToken)}
                    data-testid="button-register">
                    {registerMutation.isPending ? "Registrazione in corso..." : "Crea account"}
                  </Button>
                )}

                <p className="text-center text-sm text-gray-400">
                  Hai già un account?{" "}
                  <button type="button" onClick={() => setActiveTab("login")} className="text-amber-600 font-medium hover:underline">
                    Accedi
                  </button>
                </p>
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
