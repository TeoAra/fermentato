import { useState } from "react";
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
import { Beer, Store, Factory, User, ChevronRight, ChevronLeft, Check, Search } from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import type { Brewery } from "@shared/schema";

type Role = "customer" | "pub_owner" | "brewery_owner";

const pubSchema = z.object({
  pubName: z.string().min(2, "Nome locale richiesto"),
  pubAddress: z.string().min(5, "Seleziona un indirizzo"),
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

type PubForm = z.infer<typeof pubSchema>;
type BreweryForm = z.infer<typeof brewerySchema>;

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"role" | "details" | "done">("role");
  const [selectedRole, setSelectedRole] = useState<Role>("customer");
  const [brewerySearch, setBrewerySearch] = useState("");
  const [selectedBrewery, setSelectedBrewery] = useState<Brewery | null>(null);
  const [newBrewery, setNewBrewery] = useState(false);

  const pubForm = useForm<PubForm>({
    resolver: zodResolver(pubSchema),
    defaultValues: { pubName: "", pubAddress: "", pubCity: "", pubRegion: "", vatNumber: "", phone: "", description: "" },
  });

  const breweryForm = useForm<BreweryForm>({
    resolver: zodResolver(brewerySchema),
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

  const onboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/auth/complete-onboarding", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setStep("done");
      setTimeout(() => navigate("/"), 1800);
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message || "Errore durante il salvataggio", variant: "destructive" });
    },
  });

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    if (role === "customer") {
      onboardingMutation.mutate({ role: "customer" });
    } else {
      setStep("details");
    }
  };

  const handlePubSubmit = (data: PubForm) => {
    onboardingMutation.mutate({ role: "pub_owner", ...data });
  };

  const handleBrewerySubmit = (data: BreweryForm) => {
    if (selectedBrewery) {
      onboardingMutation.mutate({ role: "brewery_owner", breweryId: selectedBrewery.id });
    } else {
      onboardingMutation.mutate({ role: "brewery_owner", ...data });
    }
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Benvenuto su Fermenta.to!</h1>
          <p className="text-gray-400 text-lg">Il tuo profilo è pronto. Redirezione in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center mx-auto mb-4">
            <Beer className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Fermenta.to</h1>
          <p className="text-gray-400 mt-2">Completa il tuo profilo</p>
        </div>

        {/* Step: Role Selection */}
        {step === "role" && (
          <div>
            <h2 className="text-xl font-semibold text-white text-center mb-2">Come utilizzerai la piattaforma?</h2>
            <p className="text-gray-400 text-center text-sm mb-8">Scegli il tuo ruolo per personalizzare l'esperienza</p>

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

            <p className="text-center text-xs text-gray-500 mt-6">
              Puoi cambiare ruolo in qualsiasi momento dalle impostazioni
            </p>
          </div>
        )}

        {/* Step: Pub Details */}
        {step === "details" && selectedRole === "pub_owner" && (
          <div>
            <button onClick={() => setStep("role")} className="flex items-center gap-1 text-gray-400 hover:text-white mb-6 text-sm transition-colors">
              <ChevronLeft className="w-4 h-4" /> Indietro
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Il tuo pub</h2>
                <p className="text-sm text-gray-400">Inserisci i dati del tuo locale</p>
              </div>
            </div>
            <p className="text-xs text-amber-400/80 bg-amber-400/10 rounded-lg px-3 py-2 mb-6">
              La richiesta verrà verificata dall'admin prima dell'attivazione.
            </p>

            <Form {...pubForm}>
              <form onSubmit={pubForm.handleSubmit(handlePubSubmit)} className="space-y-4">
                <FormField control={pubForm.control} name="pubName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Nome del locale *</FormLabel>
                    <FormControl><Input placeholder="es. The Craft Beer Bar" {...field} className="bg-gray-800 border-gray-700 text-white" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={pubForm.control} name="pubAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Indirizzo *</FormLabel>
                    <FormControl>
                      <AddressAutocomplete
                        value={field.value}
                        onChange={(address, city, region) => {
                          field.onChange(address);
                          if (city) pubForm.setValue("pubCity", city);
                          if (region) pubForm.setValue("pubRegion", region);
                        }}
                        placeholder="Cerca indirizzo..."
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={pubForm.control} name="pubCity" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Città *</FormLabel>
                      <FormControl><Input placeholder="Roma" {...field} className="bg-gray-800 border-gray-700 text-white" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={pubForm.control} name="pubRegion" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Regione</FormLabel>
                      <FormControl><Input placeholder="Lazio" {...field} className="bg-gray-800 border-gray-700 text-white" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={pubForm.control} name="vatNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">P.IVA</FormLabel>
                      <FormControl><Input placeholder="IT00000000000" {...field} className="bg-gray-800 border-gray-700 text-white" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={pubForm.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Telefono</FormLabel>
                      <FormControl><Input placeholder="+39 06 12345678" {...field} className="bg-gray-800 border-gray-700 text-white" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={pubForm.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Descrizione</FormLabel>
                    <FormControl><Textarea placeholder="Descrivi il tuo locale..." rows={3} {...field} className="bg-gray-800 border-gray-700 text-white resize-none" /></FormControl>
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

        {/* Step: Brewery Details */}
        {step === "details" && selectedRole === "brewery_owner" && (
          <div>
            <button onClick={() => setStep("role")} className="flex items-center gap-1 text-gray-400 hover:text-white mb-6 text-sm transition-colors">
              <ChevronLeft className="w-4 h-4" /> Indietro
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Factory className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Il tuo birrificio</h2>
                <p className="text-sm text-gray-400">Cerca il tuo birrificio o aggiungine uno nuovo</p>
              </div>
            </div>
            <p className="text-xs text-emerald-400/80 bg-emerald-400/10 rounded-lg px-3 py-2 mb-6">
              La richiesta verrà verificata dall'admin prima dell'attivazione.
            </p>

            {/* Search existing brewery */}
            {!newBrewery && (
              <div className="mb-5">
                <label className="text-sm text-gray-300 block mb-2">Cerca il tuo birrificio</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Cerca per nome..."
                    value={brewerySearch}
                    onChange={e => { setBrewerySearch(e.target.value); setSelectedBrewery(null); }}
                    className="bg-gray-800 border-gray-700 text-white pl-10"
                  />
                </div>
                {breweryResults.length > 0 && !selectedBrewery && (
                  <div className="mt-2 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    {breweryResults.map((b: Brewery) => (
                      <button key={b.id} onClick={() => { setSelectedBrewery(b); setBrewerySearch(b.name); }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-700 flex items-center gap-3 transition-colors">
                        {b.logoUrl ? (
                          <img src={b.logoUrl} alt={b.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <Factory className="w-4 h-4 text-emerald-400" />
                          </div>
                        )}
                        <div>
                          <div className="text-white text-sm font-medium">{b.name}</div>
                          <div className="text-gray-400 text-xs">{b.location}, {b.region}</div>
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
                        <Factory className="w-4 h-4 text-emerald-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-white font-medium">{selectedBrewery.name}</div>
                      <div className="text-gray-400 text-xs">{selectedBrewery.location}, {selectedBrewery.region}</div>
                    </div>
                    <Check className="w-5 h-5 text-emerald-400" />
                  </div>
                )}
                <div className="mt-3 text-center">
                  <button onClick={() => { setNewBrewery(true); setSelectedBrewery(null); setBrewerySearch(""); }}
                    className="text-emerald-400 text-sm hover:underline">
                    Non trovi il tuo birrificio? Aggiungilo
                  </button>
                </div>
              </div>
            )}

            {/* New brewery form */}
            {newBrewery && (
              <div className="mb-4">
                <button onClick={() => { setNewBrewery(false); setSelectedBrewery(null); }}
                  className="text-gray-400 text-sm hover:text-white mb-4 flex items-center gap-1 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Cerca birrificio esistente
                </button>
                <Form {...breweryForm}>
                  <form id="brewery-form" onSubmit={breweryForm.handleSubmit(handleBrewerySubmit)} className="space-y-3">
                    <FormField control={breweryForm.control} name="breweryName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Nome birrificio *</FormLabel>
                        <FormControl><Input placeholder="es. Birrificio Italiano" {...field} className="bg-gray-800 border-gray-700 text-white" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={breweryForm.control} name="breweryLocation" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Città</FormLabel>
                          <FormControl><Input placeholder="Milano" {...field} className="bg-gray-800 border-gray-700 text-white" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={breweryForm.control} name="breweryRegion" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Regione</FormLabel>
                          <FormControl><Input placeholder="Lombardia" {...field} className="bg-gray-800 border-gray-700 text-white" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={breweryForm.control} name="breweryVatNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">P.IVA</FormLabel>
                          <FormControl><Input placeholder="IT00000000000" {...field} className="bg-gray-800 border-gray-700 text-white" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={breweryForm.control} name="breweryPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Telefono</FormLabel>
                          <FormControl><Input placeholder="+39 02 12345678" {...field} className="bg-gray-800 border-gray-700 text-white" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={breweryForm.control} name="breweryWebsite" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Sito web</FormLabel>
                        <FormControl><Input placeholder="https://www.miobirrificio.it" {...field} className="bg-gray-800 border-gray-700 text-white" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={breweryForm.control} name="breweryDescription" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Descrizione</FormLabel>
                        <FormControl><Textarea placeholder="Racconta la storia del tuo birrificio..." rows={3} {...field} className="bg-gray-800 border-gray-700 text-white resize-none" /></FormControl>
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
              onClick={!newBrewery && selectedBrewery ? () => onboardingMutation.mutate({ role: "brewery_owner", breweryId: selectedBrewery.id }) : undefined}
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
      className="w-full flex items-center gap-4 p-5 rounded-2xl border border-gray-800 bg-gray-900 hover:bg-gray-800 hover:border-gray-600 transition-all text-left group"
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white flex-shrink-0 group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-white font-semibold">{title}</div>
        <div className="text-gray-400 text-sm">{description}</div>
      </div>
      {loading ? (
        <div className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
      ) : (
        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all" />
      )}
    </button>
  );
}
