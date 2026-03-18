import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ImageUpload } from "@/components/image-upload";
import { Beer, Loader2, QrCode, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";

const PRICE = 50;

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
  const [form, setForm] = useState({ nickname: "", email: "", password: "" });

  const registerMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/auth/register", { method: "POST" }, data),
    onSuccess: (data: any) => {
      if (data?.pendingVerification) {
        toast({ title: "Controlla la tua email per verificare l'account, poi torna qui." });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onDone();
    },
    onError: (err: any) =>
      toast({ title: err?.message || "Errore nella registrazione", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="nickname">Username *</Label>
        <Input
          id="nickname"
          value={form.nickname}
          onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
          placeholder="il_tuo_username"
          autoComplete="username"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          placeholder="tua@email.it"
          autoComplete="email"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="password">Password *</Label>
        <div className="relative mt-1">
          <Input
            id="password"
            type={showPass ? "text" : "password"}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Crea una password sicura"
            autoComplete="new-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <Button
        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold mt-2"
        size="lg"
        disabled={registerMutation.isPending || !form.nickname || !form.email || !form.password}
        onClick={() => registerMutation.mutate(form)}
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
    </div>
  );
}

// ── Step 2: Festival form ────────────────────────────────────────────────────
function StepFestival() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
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
      navigate(`/festival-dashboard?checkout_pending=1&festival_id=${data.id}`);
    },
    onError: (err: any) =>
      toast({ title: err?.message || "Errore nella creazione", variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      </div>

      <Separator />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label>Nome del festival *</Label>
          <Input
            className="mt-1"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug || suggestSlug(e.target.value) }))}
            placeholder="Es. Roma Beer Fest 2026"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>URL pubblico (slug) *</Label>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-gray-400 whitespace-nowrap">/festival/</span>
            <Input
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="roma-beer-fest-2026"
            />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Questo sarà il link del vostro taplist QR</p>
        </div>
        <div>
          <Label>Data inizio</Label>
          <Input className="mt-1" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div>
          <Label>Data fine</Label>
          <Input className="mt-1" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <Label>Location</Label>
          <Input className="mt-1" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Es. Parco della Musica, Roma" />
        </div>
        <div className="sm:col-span-2">
          <Label>Descrizione breve</Label>
          <Textarea
            className="mt-1"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            placeholder="Descrivi il tuo festival in 1-2 righe"
          />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Switch checked={form.showFood} onCheckedChange={v => setForm(f => ({ ...f, showFood: v }))} />
          <Label>Mostra sezione menu cibo</Label>
        </div>
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
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <Beer className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white tracking-tight">fermenta.to</span>
        </Link>
        <Link href="/crea-festival" className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium">
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
