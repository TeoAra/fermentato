import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Beer, Store, Factory, User, ChevronRight, ChevronLeft, Check, Search, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { AddressAutocomplete, type AddressDetails } from "@/components/AddressAutocomplete";
import { useAuth } from "@/hooks/useAuth";
import { isIosNative } from "@/lib/platform";
import type { Brewery } from "@shared/schema";

type Role = "customer" | "pub_owner" | "brewery_owner";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  nickname: z.string()
    .min(3, "Minimo 3 caratteri")
    .max(30, "Massimo 30 caratteri")
    .regex(/^[a-zA-Z0-9_.]+$/, "Solo lettere, numeri, punti e underscore"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const pubSchema = z.object({
  pubName: z.string().min(2, "Nome locale richiesto"),
  pubAddress: z.string().min(5, "Seleziona un indirizzo dalla lista"),
  pubCity: z.string().min(2, "Città richiesta"),
  pubRegion: z.string().optional(),
  vatNumber: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
});

const brewerySchema = z.object({
  brewerySearch: z.string().optional(),
  breweryId: z.number().optional(),
  breweryName: z.string().optional(),
  breweryLocation: z.string().optional(),
  breweryRegion: z.string().optional(),
  breweryCountry: z.string().optional(),
  breweryVatNumber: z.string().optional(),
  breweryPhone: z.string().optional(),
  breweryDescription: z.string().optional(),
  breweryWebsite: z.string().optional(),
}).refine(data => data.breweryId || (data.breweryName && data.breweryName.length > 0), {
  message: "Seleziona un birrificio o inserisci il nome",
  path: ["breweryName"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PubForm = z.infer<typeof pubSchema>;
type BreweryForm = z.infer<typeof brewerySchema>;

// ─── Component ───────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState<"profile" | "role" | "details" | "done">("profile");
  const [selectedRole, setSelectedRole] = useState<Role>("customer");
  const [profileData, setProfileData] = useState<ProfileForm | null>(null);
  const [brewerySearch, setBrewerySearch] = useState("");
  const [selectedBrewery, setSelectedBrewery] = useState<Brewery | null>(null);
  const [newBrewery, setNewBrewery] = useState(false);

  // Nickname availability state
  const [nickStatus, setNickStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [nickCheckTimeout, setNickCheckTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema) as any,
    mode: "onChange",
    defaultValues: {
      nickname: user?.nickname ?? "",
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
    },
  });

  // Pre-fill form when user data arrives
  useEffect(() => {
    if (user) {
      profileForm.reset({
        nickname: user.nickname ?? "",
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
      });
    }
  }, [user?.id]);

  const pubForm = useForm<PubForm>({
    resolver: zodResolver(pubSchema) as any,
    mode: "onSubmit",
    defaultValues: { pubName: "", pubAddress: "", pubCity: "", pubRegion: "", vatNumber: "", phone: "", description: "" },
  });

  const breweryForm = useForm<BreweryForm>({
    resolver: zodResolver(brewerySchema) as any,
    mode: "onSubmit",
    defaultValues: { breweryName: "", breweryLocation: "", breweryRegion: "", breweryCountry: "Italia", breweryVatNumber: "", breweryPhone: "", breweryDescription: "", breweryWebsite: "" },
  });

  const { data: breweryResults = [] } = useQuery<Brewery[]>({
    queryKey: ["/api/breweries/search", brewerySearch],
    queryFn: async () => {
      if (brewerySearch.length < 2) return [];
      const res = await fetch(`/api/breweries/search?q=${encodeURIComponent(brewerySearch)}&limit=8`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: brewerySearch.length >= 2,
  });

  // ─── Nickname availability check (debounced) ──────────────────────────────
  const checkNickname = useCallback((value: string) => {
    if (nickCheckTimeout) clearTimeout(nickCheckTimeout);
    if (!value || value.length < 3 || !/^[a-zA-Z0-9_.]+$/.test(value)) {
      setNickStatus("idle");
      return;
    }
    // If same as current nickname, mark ok immediately
    if (user?.nickname && value === user.nickname) {
      setNickStatus("ok");
      return;
    }
    setNickStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-nickname?nickname=${encodeURIComponent(value)}`);
        const data = await res.json();
        setNickStatus(data.available ? "ok" : "taken");
      } catch {
        setNickStatus("idle");
      }
    }, 500);
    setNickCheckTimeout(t);
  }, [user?.nickname, nickCheckTimeout]);

  // ─── Mutation ─────────────────────────────────────────────────────────────
  const onboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/auth/complete-onboarding", { method: "POST" }, data);
    },
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      if (data?.redirectTo) {
        navigate(data.redirectTo);
      } else {
        setStep("done");
        setTimeout(() => navigate("/"), 1800);
      }
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message || "Errore durante il salvataggio", variant: "destructive" });
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleProfileSubmit = (data: ProfileForm) => {
    if (nickStatus === "taken") {
      profileForm.setError("nickname", { message: "Username già in uso" });
      return;
    }
    setProfileData(data);
    setStep("role");
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    if (role === "customer") {
      onboardingMutation.mutate({ ...profileData, role: "customer" });
    } else {
      setStep("details");
    }
  };

  const handlePubSubmit = (data: PubForm) => {
    onboardingMutation.mutate({ ...profileData, role: "pub_owner", ...data });
  };

  const handleBrewerySubmit = (data: BreweryForm) => {
    if (selectedBrewery) {
      onboardingMutation.mutate({ ...profileData, role: "brewery_owner", breweryId: selectedBrewery.id });
    } else {
      onboardingMutation.mutate({ ...profileData, role: "brewery_owner", ...data });
    }
  };

  // ─── Done screen ──────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Benvenuto su Fermenta.to!</h1>
          <p className="text-muted-foreground text-lg">Il tuo profilo è pronto. Redirezione in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center mx-auto mb-4">
            <Beer className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Fermenta.to</h1>
          <p className="text-muted-foreground mt-2">Completa il tuo profilo</p>
        </div>

        {/* ── Step 1: Profile (nickname + name) ─────────────────────────── */}
        {step === "profile" && (
          <div>
            <h2 className="text-xl font-semibold text-foreground text-center mb-2">Scegli il tuo username</h2>
            <p className="text-muted-foreground text-center text-sm mb-8">
              Lo useranno gli altri utenti per trovarti
            </p>

            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-5">

                {/* Nickname */}
                <FormField control={profileForm.control} name="nickname" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username *</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="es. beergeek_42"
                          autoCapitalize="none"
                          autoCorrect="off"
                          className="pr-10"
                          onChange={(e) => {
                            field.onChange(e);
                            checkNickname(e.target.value);
                          }}
                        />
                      </FormControl>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {nickStatus === "checking" && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
                        {nickStatus === "ok" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {nickStatus === "taken" && <XCircle className="w-4 h-4 text-destructive" />}
                      </div>
                    </div>
                    {nickStatus === "taken" && (
                      <p className="text-xs text-destructive mt-1">Username già in uso, scegline un altro</p>
                    )}
                    {nickStatus === "ok" && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Username disponibile!</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />

                {/* First + Last name */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={profileForm.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl><Input {...field} placeholder="Mario" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cognome</FormLabel>
                      <FormControl><Input {...field} placeholder="Rossi" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <Button
                  type="submit"
                  disabled={nickStatus === "taken" || nickStatus === "checking" || onboardingMutation.isPending}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold h-12"
                >
                  Continua
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </Form>
          </div>
        )}

        {/* ── Step 2: Role Selection ─────────────────────────────────────── */}
        {step === "role" && (
          <div>
            <button onClick={() => setStep("profile")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6 text-sm transition-colors">
              <ChevronLeft className="w-4 h-4" /> Indietro
            </button>
            <h2 className="text-xl font-semibold text-foreground text-center mb-2">Come utilizzerai la piattaforma?</h2>
            <p className="text-muted-foreground text-center text-sm mb-8">Scegli il tuo ruolo per personalizzare l'esperienza</p>

            <div className="space-y-4">
              <RoleCard
                icon={<User className="w-7 h-7" />}
                title="Cliente / Appassionato"
                description="Scopri pub, birre artigianali e birrifici italiani"
                color="from-blue-500 to-indigo-600"
                onClick={() => handleRoleSelect("customer")}
                loading={onboardingMutation.isPending && selectedRole === "customer"}
              />
              <RoleCard
                icon={<Store className="w-7 h-7" />}
                title="Gestore di Pub"
                description="Gestisci il tuo locale, la tap list e il menu"
                color="from-amber-500 to-orange-600"
                onClick={() => handleRoleSelect("pub_owner")}
              />
              <RoleCard
                icon={<Factory className="w-7 h-7" />}
                title="Birrificio"
                description="Gestisci il tuo birrificio e il catalogo birre"
                color="from-emerald-500 to-teal-600"
                onClick={() => handleRoleSelect("brewery_owner")}
              />
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Puoi cambiare ruolo in qualsiasi momento dalle impostazioni
            </p>
            <div className="text-center mt-3">
              <button
                onClick={() => onboardingMutation.mutate({ ...profileData, role: "customer" })}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Salta e vai al profilo
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3a: Pub Details ───────────────────────────────────────── */}
        {step === "details" && selectedRole === "pub_owner" && (
          <div>
            <button onClick={() => setStep("role")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6 text-sm transition-colors">
              <ChevronLeft className="w-4 h-4" /> Indietro
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Il tuo pub</h2>
                <p className="text-sm text-muted-foreground">Inserisci i dati del tuo locale</p>
              </div>
            </div>
            {!isIosNative && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2 mb-6">
                Dopo il salvataggio, completerai l'attivazione con Stripe — 15 giorni gratuiti, poi €65/anno IVA inclusa.
              </p>
            )}

            <Form {...pubForm}>
              <form onSubmit={pubForm.handleSubmit(handlePubSubmit)} className="space-y-4">
                <FormField control={pubForm.control} name="pubName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome del locale *</FormLabel>
                    <FormControl><Input placeholder="es. The Craft Beer Bar" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={pubForm.control} name="pubAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo *</FormLabel>
                    <FormControl>
                      <AddressAutocomplete
                        value={field.value}
                        onAddressSelect={(details: AddressDetails) => {
                          field.onChange(details.formattedAddress);
                          pubForm.setValue("pubCity", details.city, { shouldValidate: false });
                          pubForm.setValue("pubRegion", details.region, { shouldValidate: false });
                          pubForm.clearErrors("pubAddress");
                        }}
                        placeholder="Cerca indirizzo..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={pubForm.control} name="pubCity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Città *</FormLabel>
                      <FormControl><Input placeholder="Roma" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={pubForm.control} name="pubRegion" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regione</FormLabel>
                      <FormControl><Input placeholder="Lazio" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={pubForm.control} name="vatNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>P.IVA</FormLabel>
                      <FormControl><Input placeholder="IT00000000000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={pubForm.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl><Input placeholder="+39 06 12345678" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={pubForm.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl><Textarea placeholder="Descrivi il tuo locale..." rows={3} {...field} className="resize-none" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" disabled={onboardingMutation.isPending} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold h-12">
                  {onboardingMutation.isPending ? "Salvataggio..." : "Completa registrazione"}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </Form>
          </div>
        )}

        {/* ── Step 3b: Brewery Details ───────────────────────────────────── */}
        {step === "details" && selectedRole === "brewery_owner" && (
          <div>
            <button onClick={() => setStep("role")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6 text-sm transition-colors">
              <ChevronLeft className="w-4 h-4" /> Indietro
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Factory className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Il tuo birrificio</h2>
                <p className="text-sm text-muted-foreground">Cerca il tuo birrificio o aggiungine uno nuovo</p>
              </div>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2 mb-6">
              La richiesta di associazione al birrificio verrà verificata dal nostro team (di solito entro 24-48 ore).
            </p>

            {/* Search existing brewery */}
            {!newBrewery && (
              <div className="mb-5">
                <label className="text-sm text-foreground block mb-2">Cerca il tuo birrificio</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per nome..."
                    value={brewerySearch}
                    onChange={e => { setBrewerySearch(e.target.value); setSelectedBrewery(null); }}
                    className="pl-10"
                  />
                </div>
                {breweryResults.length > 0 && !selectedBrewery && (
                  <div className="mt-2 rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl border border-white/40 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200">
                    {breweryResults.map((b: Brewery) => (
                      <button key={b.id} onClick={() => { setSelectedBrewery(b); setBrewerySearch(b.name); }}
                        className="w-full text-left px-4 py-3 hover:bg-accent flex items-center gap-3 transition-colors">
                        {b.logoUrl ? (
                          <img src={b.logoUrl} alt={b.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <Factory className="w-4 h-4 text-emerald-500" />
                          </div>
                        )}
                        <div>
                          <div className="text-foreground text-sm font-medium">{b.name}</div>
                          <div className="text-muted-foreground text-xs">{b.location}, {b.region}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedBrewery && (
                  <div className="mt-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 flex items-center gap-3">
                    {selectedBrewery.logoUrl ? (
                      <img src={selectedBrewery.logoUrl} alt={selectedBrewery.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Factory className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-foreground font-medium">{selectedBrewery.name}</div>
                      <div className="text-muted-foreground text-xs">{selectedBrewery.location}, {selectedBrewery.region}</div>
                    </div>
                    <Check className="w-5 h-5 text-emerald-500" />
                  </div>
                )}
                <div className="mt-3 text-center">
                  <button onClick={() => { setNewBrewery(true); setSelectedBrewery(null); setBrewerySearch(""); }}
                    className="text-emerald-600 dark:text-emerald-400 text-sm hover:underline">
                    Non trovi il tuo birrificio? Aggiungilo
                  </button>
                </div>
              </div>
            )}

            {/* New brewery form */}
            {newBrewery && (
              <div className="mb-4">
                <button onClick={() => { setNewBrewery(false); setSelectedBrewery(null); }}
                  className="text-muted-foreground text-sm hover:text-foreground mb-4 flex items-center gap-1 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Cerca birrificio esistente
                </button>
                <Form {...breweryForm}>
                  <form id="brewery-form" onSubmit={breweryForm.handleSubmit(handleBrewerySubmit)} className="space-y-3">
                    <FormField control={breweryForm.control} name="breweryName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome birrificio *</FormLabel>
                        <FormControl><Input placeholder="es. Birrificio Italiano" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormItem>
                      <FormLabel>Indirizzo</FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          onAddressSelect={(details: AddressDetails) => {
                            if (details.city) breweryForm.setValue("breweryLocation", details.city, { shouldValidate: false });
                            if (details.region) breweryForm.setValue("breweryRegion", details.region, { shouldValidate: false });
                            if (details.country) breweryForm.setValue("breweryCountry", details.country, { shouldValidate: false });
                          }}
                          placeholder="Cerca indirizzo del birrificio..."
                        />
                      </FormControl>
                    </FormItem>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={breweryForm.control} name="breweryLocation" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Città</FormLabel>
                          <FormControl><Input placeholder="Milano" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={breweryForm.control} name="breweryRegion" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Regione</FormLabel>
                          <FormControl><Input placeholder="Lombardia" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={breweryForm.control} name="breweryVatNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>P.IVA</FormLabel>
                          <FormControl><Input placeholder="IT00000000000" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={breweryForm.control} name="breweryPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefono</FormLabel>
                          <FormControl><Input placeholder="+39 02 12345678" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={breweryForm.control} name="breweryWebsite" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sito web</FormLabel>
                        <FormControl><Input placeholder="https://www.miobirrificio.it" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={breweryForm.control} name="breweryDescription" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrizione</FormLabel>
                        <FormControl><Textarea placeholder="Racconta la storia del tuo birrificio..." rows={3} {...field} className="resize-none" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </form>
                </Form>
              </div>
            )}

            <Button
              type={newBrewery ? "submit" : "button"}
              form={newBrewery ? "brewery-form" : undefined}
              disabled={onboardingMutation.isPending || (!selectedBrewery && !newBrewery)}
              onClick={!newBrewery && selectedBrewery ? () => onboardingMutation.mutate({ ...profileData, role: "brewery_owner", breweryId: selectedBrewery.id }) : undefined}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold h-12 mt-2"
            >
              {onboardingMutation.isPending ? "Salvataggio..." : "Completa registrazione"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RoleCard ─────────────────────────────────────────────────────────────────

function RoleCard({ icon, title, description, color, onClick, loading }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center gap-4 p-5 rounded-2xl border border-border bg-card hover:bg-accent hover:border-border/80 transition-all text-left group"
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white flex-shrink-0 group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-foreground font-semibold">{title}</div>
        <div className="text-muted-foreground text-sm">{description}</div>
      </div>
      {loading ? (
        <div className="w-5 h-5 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
      ) : (
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      )}
    </button>
  );
}
