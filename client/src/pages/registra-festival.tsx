import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ImageUpload } from "@/components/image-upload";
import { Beer, Loader2, QrCode, ArrowRight, Eye, EyeOff, CheckCircle2, Mail, Lock, CheckCircle, XCircle, Check, X, MailCheck } from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import ReCAPTCHA from "react-google-recaptcha";

const PRICE = 50;

const RECAPTCHA_SITE_KEY = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) ||
  (import.meta.env.PROD ? "6LcDuIEsAAAAAAPwdAQ2rAKZvA_ae_FmyRlft11z" : undefined);

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
  email: z.email("Email non valida"),
  password: z.string()
    .min(8, "Minimo 8 caratteri")
    .regex(/[A-Z]/, "Serve almeno una lettera maiuscola")
    .regex(/[0-9]/, "Serve almeno un numero")
    .regex(/[^A-Za-z0-9]/, "Serve almeno un carattere speciale (@, #, !, ...)"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});
type RegisterData = z.infer<typeof registerSchema>;

const suggestSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

// ── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {[1, 2].map((n, i) => (
        <div key={n} className="flex items-center gap-0">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors ${
            step > n ? "bg-amber-500 border-amber-500 text-white" :
            step === n ? "border-amber-500 text-amber-500" :
            "border-gray-200 text-gray-300"
          }`}>
            {step > n ? <CheckCircle2 className="w-4 h-4" /> : n}
          </div>
          <span className={`ml-2 text-xs font-medium ${step >= n ? "text-gray-700 dark:text-gray-200" : "text-gray-300"}`}>
            {n === 1 ? "Account" : "Il tuo festival"}
          </span>
          {i < 1 && <div className={`mx-4 h-px w-10 flex-shrink-0 ${step > 1 ? "bg-amber-400" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Registration ─────────────────────────────────────────────────────
function StepAccount({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const nicknameTimerRef = useRef<any>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<any>(null);
  const [pendingVerification, setPendingVerification] = useState<string | null>(null);

  const form = useForm<RegisterData>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: { nickname: "", email: "", password: "", confirmPassword: "" },
  });

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

  const passReqs = PASSWORD_REQUIREMENTS.map(r => ({ ...r, passed: r.test(passwordValue) }));
  const passStrength = passReqs.filter(r => r.passed).length;

  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => {
      const { confirmPassword, ...rest } = data;
      return apiRequest("/api/auth/register", { method: "POST" }, { ...rest, recaptchaToken });
    },
    onSuccess: (data: any) => {
      if (data?.pendingVerification) {
        setPendingVerification(data.email);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onDone();
    },
    onError: (err: any) => {
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
      toast({ title: err?.message || "Errore nella registrazione", variant: "destructive" });
    },
  });

  if (pendingVerification) {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <MailCheck className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Verifica la tua email</h2>
        <p className="text-sm text-gray-500">
          Abbiamo inviato un link di conferma a <strong>{pendingVerification}</strong>.<br />
          Clicca il link nell'email per attivare l'account e tornare qui.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">

        {/* Username */}
        <FormField control={form.control} name="nickname" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Username</FormLabel>
            <FormControl>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">@</span>
                <Input {...field} placeholder="il_tuo_username"
                  className={`pl-7 pr-8 h-11 rounded-xl ${
                    nicknameAvailable === true ? "border-green-500 focus-visible:ring-green-500" :
                    nicknameAvailable === false ? "border-red-500 focus-visible:ring-red-500" : ""
                  }`}
                  autoComplete="username"
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
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Email</FormLabel>
            <FormControl>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input {...field} type="email" placeholder="tu@esempio.it"
                  className="pl-10 h-11 rounded-xl" autoComplete="email" />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Password */}
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Password</FormLabel>
            <FormControl>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input {...field} type={showPass ? "text" : "password"} placeholder="Crea una password sicura"
                  className="pl-10 pr-10 h-11 rounded-xl" autoComplete="new-password"
                  onChange={(e) => { field.onChange(e); setPasswordValue(e.target.value); }} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormControl>
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
                        : "bg-gray-200 dark:bg-[#232F3D]"
                    }`} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {passReqs.map((req) => (
                    <span key={req.label} className={`flex items-center gap-1 text-xs transition-colors ${req.passed ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
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
        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium">Conferma Password</FormLabel>
            <FormControl>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input {...field} type={showConfirmPass ? "text" : "password"} placeholder="Ripeti la password"
                  className="pl-10 pr-10 h-11 rounded-xl" autoComplete="new-password" />
                <button type="button" onClick={() => setShowConfirmPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* reCAPTCHA */}
        {RECAPTCHA_SITE_KEY && (
          <div className="flex justify-center">
            <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY}
              onChange={(token) => setRecaptchaToken(token)}
              onExpired={() => setRecaptchaToken(null)}
              theme="light" hl="it" />
          </div>
        )}

        <Button type="submit"
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold h-11"
          disabled={registerMutation.isPending || (!!RECAPTCHA_SITE_KEY && !recaptchaToken)}
        >
          {registerMutation.isPending
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : <ArrowRight className="h-4 w-4 mr-2" />}
          Crea account e continua
        </Button>

        <p className="text-center text-sm text-gray-500">
          Hai già un account?{" "}
          <Link href="/login?returnTo=/registra-festival" className="text-amber-600 hover:underline font-medium">
            Accedi
          </Link>
        </p>
      </form>
    </Form>
  );
}

// ── Step 2: Festival form ────────────────────────────────────────────────────
function StepFestival() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [slugEdited, setSlugEdited] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", location: "",
    startDate: "", endDate: "", showFood: true,
    logoUrl: "", coverImageUrl: "", priceEur: PRICE,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/festivals/register", { method: "POST" }, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/festivals/public"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/festivals"] });
      toast({ title: "Festival creato! Ora procedi con il pagamento per attivarlo." });
      navigate(`/festival-dashboard?festival_id=${data.id}`);
    },
    onError: (err: any) =>
      toast({ title: err?.message || "Errore nella creazione", variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      {/* Immagini — stacked */}
      <ImageUpload
        label="Logo festival"
        description="Icona quadrata (400×400px)"
        currentImageUrl={form.logoUrl || undefined}
        onImageChange={url => setForm(f => ({ ...f, logoUrl: url || "" }))}
        folder="festivals/logos"
        aspectRatio="square"
        recommendedDimensions="400×400px"
      />
      <ImageUpload
        label="Immagine di copertina"
        description="Banner orizzontale (1200×400px)"
        currentImageUrl={form.coverImageUrl || undefined}
        onImageChange={url => setForm(f => ({ ...f, coverImageUrl: url || "" }))}
        folder="festivals/covers"
        aspectRatio="landscape"
        recommendedDimensions="1200×400px"
      />

      <Separator />

      {/* Nome */}
      <div>
        <Label>Nome del festival *</Label>
        <Input
          className="mt-1"
          value={form.name}
          onChange={e => {
            const name = e.target.value;
            setForm(f => ({ ...f, name, slug: slugEdited ? f.slug : suggestSlug(name) }));
          }}
          placeholder="Es. Roma Beer Fest 2026"
        />
      </div>

      {/* Slug */}
      <div>
        <Label>URL pubblico (slug) *</Label>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-gray-400 whitespace-nowrap">/festival/</span>
          <Input
            value={form.slug}
            onChange={e => { setSlugEdited(true); setForm(f => ({ ...f, slug: e.target.value })); }}
            placeholder="roma-beer-fest-2026"
          />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Questo sarà il link del vostro taplist QR</p>
      </div>

      {/* Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Data inizio</Label>
          <Input className="mt-1" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div>
          <Label>Data fine</Label>
          <Input className="mt-1" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </div>

      {/* Location con Google */}
      <div>
        <Label>Location</Label>
        <div className="mt-1">
          <AddressAutocomplete
            value={form.location}
            onAddressSelect={d => setForm(f => ({ ...f, location: d.formattedAddress }))}
            placeholder="Es. Parco della Musica, Roma"
            countryRestriction={null}
          />
        </div>
      </div>

      {/* Descrizione */}
      <div>
        <Label>Descrizione breve</Label>
        <Textarea
          className="mt-1"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
          placeholder="Descrivi il tuo festival in 1-2 righe"
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.showFood} onCheckedChange={v => setForm(f => ({ ...f, showFood: v }))} />
        <Label>Mostra sezione menu cibo</Label>
      </div>

      <Button
        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
        size="lg"
        onClick={() => createMutation.mutate(form)}
        disabled={createMutation.isPending || !form.name || !form.slug}
      >
        {createMutation.isPending
          ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
          : <ArrowRight className="h-4 w-4 mr-2" />}
        Crea festival e procedi al pagamento
      </Button>
      <p className="text-xs text-center text-gray-400">
        Pagamento sicuro via Stripe · €{PRICE} una tantum · Nessun abbonamento
      </p>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function RegistraFestivalPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);

  // If already logged in, skip to step 2
  useEffect(() => {
    if (!isLoading && isAuthenticated) setStep(2);
  }, [isAuthenticated, isLoading]);

  return (
    <div className="min-h-screen bg-[hsl(38,14%,97%)] dark:bg-gray-950 flex flex-col">
      {/* Minimal header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border-b border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <Beer className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white tracking-tight">fermenta.to</span>
        </Link>
        <Link href="/festival" className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium">
          <QrCode className="w-3.5 h-3.5" />
          Scopri Festival Mode
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-start py-10 px-4">
        <div className="w-full max-w-lg">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {step === 1 ? "Crea il tuo account" : "Crea il tuo festival"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {step === 1
                ? "Prima di tutto, crea un account gratuito per gestire il tuo festival."
                : "Inserisci i dettagli del festival. Potrai modificarli in qualsiasi momento."}
            </p>
          </div>

          <StepBar step={step} />

          {/* Step content */}
          {step === 1 && <StepAccount onDone={() => setStep(2)} />}
          {step === 2 && <StepFestival />}
        </div>
      </div>
    </div>
  );
}
