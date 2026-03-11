import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Store, Lock, Mail, User, Phone, Building2, Factory, Plus, Search,
  CheckCircle2, Beer, ArrowLeft, Eye, EyeOff, MailCheck, RefreshCw, X
} from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import ReCAPTCHA from "react-google-recaptcha";
import type { Brewery } from "@shared/schema";

const RECAPTCHA_SITE_KEY = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) || "6LcDuIEsAAAAAAPwdAQ2rAKZvA_ae_FmyRlft11z";

const schema = z.object({
  nickname: z.string().min(3, "Minimo 3 caratteri").max(30, "Massimo 30 caratteri").regex(/^[a-zA-Z0-9_.]+$/, "Solo lettere, numeri, punti e underscore"),
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "Minimo 8 caratteri"),
  confirmPassword: z.string(),
  pubName: z.string().min(2, "Nome locale obbligatorio"),
  pubAddress: z.string().min(3, "Indirizzo obbligatorio"),
  pubCity: z.string().min(2, "Città obbligatoria"),
  pubRegion: z.string().optional(),
  vatNumber: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
  isBrewpub: z.boolean().default(false),
  breweryId: z.number().optional(),
  breweryName: z.string().optional(),
  breweryLocation: z.string().optional(),
  breweryRegion: z.string().optional(),
  breweryCountry: z.string().optional(),
  breweryVatNumber: z.string().optional(),
  breweryPhone: z.string().optional(),
  breweryDescription: z.string().optional(),
  breweryWebsite: z.string().optional(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function RegistraPub() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<any>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [brewerySearch, setBrewerySearch] = useState("");
  const [selectedBrewery, setSelectedBrewery] = useState<Brewery | null>(null);
  const [creatingNewBrewery, setCreatingNewBrewery] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nickname: "", email: "", password: "", confirmPassword: "",
      pubName: "", pubAddress: "", pubCity: "", pubRegion: "",
      vatNumber: "", phone: "", description: "",
      isBrewpub: false,
      breweryId: undefined, breweryName: "", breweryLocation: "",
      breweryRegion: "", breweryCountry: "", breweryVatNumber: "",
      breweryPhone: "", breweryDescription: "", breweryWebsite: "",
    },
  });

  const isBrewpub = form.watch("isBrewpub");

  // Pre-fill from sessionStorage if user came from auth page
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('pub_reg_basic');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.nickname) form.setValue('nickname', data.nickname);
        if (data.email) form.setValue('email', data.email);
        if (data.password) form.setValue('password', data.password);
        if (data.confirmPassword) form.setValue('confirmPassword', data.confirmPassword);
        sessionStorage.removeItem('pub_reg_basic');
      }
    } catch {}
  }, []);

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

  const { data: searchedBreweries } = useQuery<Brewery[]>({
    queryKey: [`/api/breweries/search?q=${encodeURIComponent(brewerySearch)}`],
    enabled: isBrewpub && brewerySearch.length >= 2 && !selectedBrewery && !creatingNewBrewery,
  });

  const handlePubAddressSelect = useCallback((details: { formattedAddress: string; city: string; region: string; country: string; placeId: string }) => {
    form.setValue("pubAddress", details.formattedAddress);
    form.setValue("pubCity", details.city);
    form.setValue("pubRegion", details.region);
  }, [form]);

  const handleBreweryAddressSelect = useCallback((details: { formattedAddress: string; city: string; region: string; country: string; placeId: string }) => {
    form.setValue("breweryLocation", details.formattedAddress);
    form.setValue("breweryRegion", details.region);
    form.setValue("breweryCountry", details.country);
  }, [form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { confirmPassword, ...rest } = data;
      return await apiRequest("/api/auth/register-pub", { method: "POST" }, { ...rest, recaptchaToken });
    },
    onSuccess: (data: any) => {
      if (data?.pendingVerification) {
        setPendingEmail(data.email);
      }
    },
    onError: (error: any) => {
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
      toast({ title: "Errore", description: error.message || "Errore durante la registrazione", variant: "destructive" });
    },
  });

  const handleResendVerification = async () => {
    if (!pendingEmail) return;
    setResendLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: pendingEmail }),
      });
      const data = await res.json();
      toast({ title: "Email inviata", description: data.message || "Controlla la tua casella di posta." });
    } catch {
      toast({ title: "Errore", description: "Impossibile inviare l'email", variant: "destructive" });
    } finally {
      setResendLoading(false);
    }
  };

  const onSubmit = (data: FormData) => {
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      toast({ title: "Verifica richiesta", description: "Completa la verifica reCAPTCHA", variant: "destructive" });
      return;
    }
    mutation.mutate(data);
  };

  // --- Pending verification screen ---
  if (pendingEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4 pt-20">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
              <MailCheck className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Controlla la tua email!</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Abbiamo inviato un link di conferma a<br />
              <span className="font-semibold text-amber-700 dark:text-amber-300">{pendingEmail}</span>
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200 space-y-1">
              <p className="font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Cosa succede dopo:</p>
              <p>• Clicca sul link nell'email per verificare il tuo account</p>
              <p>• La tua <strong>prova gratuita di 15 giorni</strong> partirà automaticamente</p>
              <p>• Potrai gestire il tuo pub subito dal dashboard</p>
            </div>
            <Button variant="outline" className="w-full gap-2" onClick={handleResendVerification} disabled={resendLoading}>
              <RefreshCw className={`w-4 h-4 ${resendLoading ? 'animate-spin' : ''}`} />
              {resendLoading ? "Invio in corso..." : "Reinvia email di conferma"}
            </Button>
            <Button variant="ghost" className="w-full text-sm" onClick={() => setLocation('/auth')}>
              Torna al login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <Button variant="ghost" size="sm" className="mb-2" onClick={() => setLocation('/auth')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Torna indietro
          </Button>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <Store className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Registra il tuo pub</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">15 giorni gratuiti, poi €65/anno (IVA inclusa)</p>
            </div>
          </div>
        </div>

        {/* Trial info banner */}
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          {[
            { icon: "🎁", title: "15 giorni gratis", desc: "Prova senza carta di credito" },
            { icon: "💳", title: "€65/anno", desc: "IVA inclusa, poi all'anno" },
            { icon: "❌", title: "Annulla quando vuoi", desc: "Nessun vincolo" },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 shadow-sm">
              <div className="text-xl mb-1">{icon}</div>
              <p className="font-semibold text-gray-800 dark:text-gray-200 leading-tight">{title}</p>
              <p className="text-gray-500 dark:text-gray-400 leading-tight mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Section 1: User account */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4 text-amber-500" />
                  Account personale
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="nickname" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                        <Input {...field} placeholder="il_tuo_username" className="pl-8"
                          onChange={e => { field.onChange(e); checkNickname(e.target.value); }} />
                        {nicknameChecking && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
                        {!nicknameChecking && nicknameAvailable === true && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                        {!nicknameChecking && nicknameAvailable === false && <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input {...field} type="email" placeholder="tu@esempio.it" className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input {...field} type={showPassword ? "text" : "password"} placeholder="Minimo 8 caratteri" className="pl-10 pr-10" />
                          <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conferma Password *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input {...field} type={showPassword ? "text" : "password"} placeholder="Ripeti la password" className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Pub details */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Store className="w-4 h-4 text-amber-500" />
                  Dati del tuo locale
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="pubName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome del Locale *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input {...field} placeholder="Es. The Craft Pub" className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="pubAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo *</FormLabel>
                    <FormControl>
                      <AddressAutocomplete
                        value={field.value}
                        onAddressSelect={handlePubAddressSelect}
                        placeholder="Cerca il tuo locale o l'indirizzo..."
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Città e regione si compilano automaticamente.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="pubCity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Città *</FormLabel>
                      <FormControl><Input {...field} placeholder="Roma" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="pubRegion" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regione</FormLabel>
                      <FormControl><Input {...field} placeholder="Lazio" /></FormControl>
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="vatNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>P.IVA</FormLabel>
                      <FormControl><Input {...field} placeholder="IT12345678901" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input {...field} placeholder="+39 06 1234567" className="pl-10" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Racconta del tuo locale, l'atmosfera, le specialità..." className="resize-none" rows={3} />
                    </FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Section 3: Brewpub toggle */}
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <FormField control={form.control} name="isBrewpub" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                        <Factory className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <FormLabel className="font-semibold text-gray-900 dark:text-gray-100">
                          Questo è un Brewpub
                        </FormLabel>
                        <FormDescription className="text-xs">
                          Gestisco anche la produzione del birrificio
                        </FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={checked => {
                        field.onChange(checked);
                        if (!checked) {
                          setSelectedBrewery(null);
                          setCreatingNewBrewery(false);
                          setBrewerySearch("");
                          form.setValue("breweryId", undefined);
                          form.setValue("breweryName", "");
                        }
                      }} />
                    </FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Section 4: Brewery details (if brewpub) */}
            {isBrewpub && (
              <Card className="shadow-sm border-orange-200 dark:border-orange-800">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base text-orange-800 dark:text-orange-200">
                    <Factory className="w-4 h-4" />
                    Dati del Birrificio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedBrewery && !creatingNewBrewery && (
                    <>
                      <div>
                        <FormLabel className="text-sm">Cerca il tuo birrificio nel database</FormLabel>
                        <div className="relative mt-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input value={brewerySearch} onChange={e => setBrewerySearch(e.target.value)} placeholder="Nome del birrificio..." className="pl-10" />
                        </div>
                      </div>

                      {searchedBreweries && searchedBreweries.length > 0 && (
                        <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                          {searchedBreweries.map(b => (
                            <button key={b.id} type="button" onClick={() => {
                              setSelectedBrewery(b);
                              form.setValue("breweryId", b.id);
                              form.setValue("breweryName", b.name);
                              form.setValue("breweryLocation", b.location || "");
                              form.setValue("breweryRegion", b.region || "");
                              form.setValue("breweryCountry", (b as any).country || "");
                              setBrewerySearch("");
                            }} className="w-full text-left p-2 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                              <p className="font-medium text-sm">{b.name}</p>
                              <p className="text-xs text-gray-500">{b.location}</p>
                            </button>
                          ))}
                        </div>
                      )}

                      <Button type="button" variant="outline" size="sm" className="w-full gap-2 border-dashed" onClick={() => setCreatingNewBrewery(true)}>
                        <Plus className="w-4 h-4" /> Crea nuovo birrificio
                      </Button>
                    </>
                  )}

                  {selectedBrewery && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-orange-900 dark:text-orange-100">{selectedBrewery.name}</p>
                          <p className="text-xs text-orange-600 dark:text-orange-300">{selectedBrewery.location}</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => {
                          setSelectedBrewery(null);
                          form.setValue("breweryId", undefined);
                          form.setValue("breweryName", "");
                          form.setValue("breweryLocation", "");
                        }}>
                          Cambia
                        </Button>
                      </div>
                    </div>
                  )}

                  {creatingNewBrewery && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Nuovo birrificio</p>
                        <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => { setCreatingNewBrewery(false); form.setValue("breweryName", ""); }}>
                          Annulla
                        </Button>
                      </div>

                      <FormField control={form.control} name="breweryName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Birrificio *</FormLabel>
                          <FormControl><Input {...field} placeholder="Es. Birrificio Artigianale" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="breweryLocation" render={({ field }) => (
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
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="breweryVatNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel>P.IVA</FormLabel>
                            <FormControl><Input {...field} placeholder="IT12345678901" /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="breweryPhone" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefono</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input {...field} placeholder="+39..." className="pl-10" />
                              </div>
                            </FormControl>
                          </FormItem>
                        )} />
                      </div>

                      <FormField control={form.control} name="breweryWebsite" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sito Web</FormLabel>
                          <FormControl><Input {...field} placeholder="https://www.miobirrificio.it" /></FormControl>
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="breweryDescription" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrizione</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Racconta del tuo birrificio..." className="resize-none" rows={2} />
                          </FormControl>
                        </FormItem>
                      )} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* reCAPTCHA */}
            {RECAPTCHA_SITE_KEY && (
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={token => setRecaptchaToken(token)}
                  onExpired={() => setRecaptchaToken(null)}
                  theme="light"
                  hl="it"
                />
              </div>
            )}

            {/* Terms note */}
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Registrandoti accetti i nostri{" "}
              <a href="/tos" className="underline hover:text-amber-600">Termini di Servizio</a>{" "}
              e la{" "}
              <a href="/privacy" className="underline hover:text-amber-600">Privacy Policy</a>.
              Dopo la conferma email la tua prova di 15 giorni partirà automaticamente.
            </p>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold py-3 text-base"
              disabled={mutation.isPending || (!!RECAPTCHA_SITE_KEY && !recaptchaToken)}
            >
              {mutation.isPending ? "Registrazione in corso..." : (
                <>
                  <Store className="w-5 h-5 mr-2" />
                  Registra il mio pub — inizia la prova gratuita
                </>
              )}
            </Button>

          </form>
        </Form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Hai già un account?{" "}
          <button onClick={() => setLocation('/auth')} className="text-amber-600 hover:underline font-medium">Accedi</button>
        </p>
      </div>
    </div>
  );
}
