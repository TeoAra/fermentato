import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Beer, Building2, Loader2, Search, X, Zap, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onClose: () => void;
  initialBeerName?: string;
  initialBreweryName?: string;
  defaultTab?: "beer" | "brewery";
}

interface BrewerySearchResult {
  id: number;
  name: string;
  location: string;
  country: string | null;
}

function ImageUploadField({
  label,
  value,
  onChange,
  folder,
  hint,
  aspect = "square",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
  hint?: string;
  aspect?: "square" | "wide";
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File troppo grande", description: "Max 10MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("folder", folder);
      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload fallito");
      const data = await res.json();
      onChange(data.url);
    } catch (err: any) {
      toast({ title: "Errore upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const previewClass = aspect === "wide"
    ? "w-full h-28 object-cover rounded-lg"
    : "w-20 h-20 object-cover rounded-lg";

  return (
    <div>
      <Label>{label}</Label>
      {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>}
      <div className="mt-1.5 flex items-start gap-3">
        {value ? (
          <div className="relative flex-shrink-0">
            <img loading="lazy" src={value} alt={label} className={previewClass} />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={`flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-[#23262E] rounded-lg text-gray-400 dark:text-gray-500 hover:border-amber-400 hover:text-amber-500 transition-colors ${aspect === "wide" ? "w-full h-20" : "w-20 h-20"}`}
          >
            {uploading
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <><Upload className="h-4 w-4" />{aspect === "wide" ? <span className="text-xs">Carica immagine</span> : null}</>
            }
          </button>
        )}
        {!value && aspect === "square" && (
          <div className="flex flex-col justify-center gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Caricamento..." : "Carica"}
            </button>
            <p className="text-xs text-gray-400">JPG, PNG, WebP · max 10MB</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

export default function AdditionRequestModal({ open, onClose, initialBeerName = "", initialBreweryName = "", defaultTab = "beer" }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = (user as any)?.userType === "admin";
  const [tab, setTab] = useState<"beer" | "brewery">(defaultTab);
  const [success, setSuccess] = useState(false);
  const [createdDirect, setCreatedDirect] = useState(false);

  // Beer form state
  const [beerName, setBeerName] = useState(initialBeerName);
  const [style, setStyle] = useState("");
  const [abv, setAbv] = useState("");
  const [ibu, setIbu] = useState("");
  const [beerBreweryQuery, setBeerBreweryQuery] = useState(initialBreweryName);
  const [selectedBrewery, setSelectedBrewery] = useState<BrewerySearchResult | null>(null);
  const [beerDescription, setBeerDescription] = useState("");
  const [beerNotes, setBeerNotes] = useState("");
  const [beerLogoUrl, setBeerLogoUrl] = useState("");
  const [beerImageUrl, setBeerImageUrl] = useState("");

  // Brewery form state
  const [breweryName, setBreweryName] = useState(initialBreweryName);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Italia");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [breweryDescription, setBreweryDescription] = useState("");
  const [breweryNotes, setBreweryNotes] = useState("");
  const [breweryLogoUrl, setBreweryLogoUrl] = useState("");
  const [breweryCoverUrl, setBreweryCoverUrl] = useState("");

  // Brewery search for beer form
  const [showBreweryResults, setShowBreweryResults] = useState(false);
  const { data: breweryResults = [] } = useQuery<BrewerySearchResult[]>({
    queryKey: ["/api/admin/breweries/search", beerBreweryQuery],
    queryFn: async () => {
      if (!beerBreweryQuery.trim() || beerBreweryQuery.trim().length < 2 || selectedBrewery) return [];
      const res = await fetch(`/api/admin/breweries/search?q=${encodeURIComponent(beerBreweryQuery)}&limit=8`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: beerBreweryQuery.trim().length >= 2 && !selectedBrewery,
  });

  const mutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return await apiRequest("/api/addition-requests", { method: "POST" }, data);
    },
    onSuccess: () => { setSuccess(true); setCreatedDirect(false); },
    onError: (err: any) => toast({ title: "Errore", description: err.message || "Errore durante l'invio", variant: "destructive" }),
  });

  const directMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const { type, ...payload } = data;
      const url = type === "beer" ? "/api/admin/beers" : "/api/admin/breweries";
      const body = type === "beer"
        ? {
            name: payload.beerName,
            style: payload.style || "Non specificato",
            abv: payload.abv ? parseFloat(payload.abv) : null,
            ibu: payload.ibu ? parseInt(payload.ibu) : null,
            breweryId: payload.breweryId || null,
            description: payload.description || null,
            logoUrl: payload.logoUrl || null,
            imageUrl: payload.imageUrl || null,
          }
        : {
            name: payload.breweryName,
            location: payload.city || "",
            region: "",
            country: payload.country || "Italia",
            description: payload.description || null,
            websiteUrl: payload.websiteUrl || null,
            logoUrl: payload.logoUrl || null,
            coverImageUrl: payload.coverImageUrl || null,
          };
      return await apiRequest(url, { method: "POST" }, body);
    },
    onSuccess: () => { setSuccess(true); setCreatedDirect(true); },
    onError: (err: any) => toast({ title: "Errore", description: err.message || "Errore durante la creazione", variant: "destructive" }),
  });

  const handleSubmitBeer = (e: React.FormEvent, direct = false) => {
    e.preventDefault();
    if (!beerName.trim()) {
      toast({ title: "Errore", description: "Il nome della birra è obbligatorio", variant: "destructive" });
      return;
    }
    const data = {
      type: "beer",
      beerName: beerName.trim(),
      breweryId: selectedBrewery?.id || null,
      breweryName: selectedBrewery ? null : (beerBreweryQuery.trim() || null),
      style: style.trim() || null,
      abv: abv.trim() || null,
      ibu: ibu.trim() || null,
      description: beerDescription.trim() || null,
      notes: beerNotes.trim() || null,
      logoUrl: beerLogoUrl || null,
      imageUrl: beerImageUrl || null,
    };
    if (direct) directMutation.mutate(data);
    else mutation.mutate(data);
  };

  const handleSubmitBrewery = (e: React.FormEvent, direct = false) => {
    e.preventDefault();
    if (!breweryName.trim()) {
      toast({ title: "Errore", description: "Il nome del birrificio è obbligatorio", variant: "destructive" });
      return;
    }
    const data = {
      type: "brewery",
      breweryName: breweryName.trim(),
      city: city.trim() || null,
      country: country.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
      description: breweryDescription.trim() || null,
      notes: breweryNotes.trim() || null,
      logoUrl: breweryLogoUrl || null,
      coverImageUrl: breweryCoverUrl || null,
    };
    if (direct) directMutation.mutate(data);
    else mutation.mutate(data);
  };

  const isPending = mutation.isPending || directMutation.isPending;

  const handleClose = () => {
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Beer className="h-5 w-5 text-amber-500" />
            Suggerisci un'aggiunta
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              {createdDirect ? (
                <>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">Creata con successo!</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Il record è stato aggiunto direttamente al database.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">Richiesta inviata!</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    La tua richiesta verrà esaminata dall'admin o dal gestore del birrificio a breve.
                  </p>
                </>
              )}
            </div>
            <Button onClick={handleClose} className="bg-amber-500 hover:bg-amber-600 text-white">
              Chiudi
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 -mt-1">
              {isAdmin
                ? "Come admin puoi creare il record direttamente, oppure inviarlo in approvazione al flusso standard."
                : "Non hai trovato quello che cercavi? Puoi suggerire l'aggiunta di una birra o un birrificio. Verrà esaminata e approvata da un amministratore o dal proprietario del birrificio."}
            </p>

            <Tabs value={tab} onValueChange={v => setTab(v as "beer" | "brewery")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="beer" className="gap-2">
                  <Beer className="h-4 w-4" /> Birra
                </TabsTrigger>
                <TabsTrigger value="brewery" className="gap-2">
                  <Building2 className="h-4 w-4" /> Birrificio
                </TabsTrigger>
              </TabsList>

              {/* ── BEER TAB ── */}
              <TabsContent value="beer" className="mt-4">
                <form onSubmit={handleSubmitBeer} className="flex flex-col gap-4">
                  <div>
                    <Label htmlFor="beerName">Nome birra *</Label>
                    <Input
                      id="beerName"
                      value={beerName}
                      onChange={e => setBeerName(e.target.value)}
                      placeholder="es. Moretti Baffo d'Oro"
                      className="mt-1"
                    />
                  </div>

                  {/* Brewery search */}
                  <div className="relative">
                    <Label htmlFor="beerBrewery">Birrificio</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="beerBrewery"
                        value={selectedBrewery ? selectedBrewery.name : beerBreweryQuery}
                        onChange={e => {
                          setSelectedBrewery(null);
                          setBeerBreweryQuery(e.target.value);
                          setShowBreweryResults(true);
                        }}
                        onFocus={() => setShowBreweryResults(true)}
                        placeholder="Cerca birrificio (opzionale)..."
                        className="pl-9 pr-9"
                        readOnly={!!selectedBrewery}
                      />
                      {selectedBrewery && (
                        <button
                          type="button"
                          onClick={() => { setSelectedBrewery(null); setBeerBreweryQuery(""); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {showBreweryResults && !selectedBrewery && beerBreweryQuery.trim().length >= 2 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1A1D24] rounded-lg border border-gray-200 dark:border-[#23262E] shadow-lg max-h-48 overflow-y-auto">
                        {breweryResults.map(br => (
                          <button
                            key={br.id}
                            type="button"
                            onClick={() => { setSelectedBrewery(br); setBeerBreweryQuery(br.name); setShowBreweryResults(false); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#12151A] text-sm border-b border-gray-100 dark:border-[#23262E] last:border-0"
                          >
                            <span className="font-medium text-gray-900 dark:text-white">{br.name}</span>
                            <span className="text-gray-400 ml-2 text-xs">{br.location}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setBreweryName(beerBreweryQuery.trim());
                            setShowBreweryResults(false);
                            setTab("brewery");
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium border-t border-gray-100 dark:border-[#23262E]"
                        >
                          <Building2 className="h-4 w-4 flex-shrink-0" />
                          Birrificio non trovato? Suggeriscilo
                        </button>
                      </div>
                    )}
                    {selectedBrewery && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Birrificio collegato: {selectedBrewery.name}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="style">Stile</Label>
                      <Input id="style" value={style} onChange={e => setStyle(e.target.value)} placeholder="es. IPA, Lager..." className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="abv">ABV (%)</Label>
                      <Input id="abv" value={abv} onChange={e => setAbv(e.target.value)} placeholder="es. 5.4" className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="ibu">IBU</Label>
                    <Input id="ibu" value={ibu} onChange={e => setIbu(e.target.value)} placeholder="es. 35" className="mt-1" />
                  </div>

                  {/* Image uploads */}
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <ImageUploadField
                      label="Etichetta / Logo"
                      value={beerLogoUrl}
                      onChange={setBeerLogoUrl}
                      folder="beer-labels"
                      hint="Etichetta della bottiglia"
                    />
                    <ImageUploadField
                      label="Immagine principale"
                      value={beerImageUrl}
                      onChange={setBeerImageUrl}
                      folder="beers"
                      hint="Foto della birra"
                    />
                  </div>

                  <div>
                    <Label htmlFor="beerDescription">Descrizione</Label>
                    <Textarea id="beerDescription" value={beerDescription} onChange={e => setBeerDescription(e.target.value)} placeholder="Breve descrizione della birra..." className="mt-1 resize-none" rows={2} />
                  </div>

                  <div>
                    <Label htmlFor="beerNotes">Note aggiuntive</Label>
                    <Textarea id="beerNotes" value={beerNotes} onChange={e => setBeerNotes(e.target.value)} placeholder="Altre informazioni utili..." className="mt-1 resize-none" rows={2} />
                  </div>

                  <div className={`flex gap-2 ${isAdmin ? 'flex-col sm:flex-row' : ''}`}>
                    <Button type="submit" disabled={isPending} className="bg-amber-500 hover:bg-amber-600 text-white flex-1">
                      {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Invio...</> : "Invia richiesta"}
                    </Button>
                    {isAdmin && (
                      <Button
                        type="button"
                        disabled={isPending}
                        onClick={e => handleSubmitBeer(e as any, true)}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1 gap-1.5"
                      >
                        {directMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creazione...</> : <><Zap className="h-4 w-4" /> Crea direttamente</>}
                      </Button>
                    )}
                  </div>
                </form>
              </TabsContent>

              {/* ── BREWERY TAB ── */}
              <TabsContent value="brewery" className="mt-4">
                <form onSubmit={handleSubmitBrewery} className="flex flex-col gap-4">
                  <div>
                    <Label htmlFor="breweryName">Nome birrificio *</Label>
                    <Input
                      id="breweryName"
                      value={breweryName}
                      onChange={e => setBreweryName(e.target.value)}
                      placeholder="es. Birrificio del Ducato"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="city">Città</Label>
                      <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="es. Milano" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="country">Paese</Label>
                      <Input id="country" value={country} onChange={e => setCountry(e.target.value)} placeholder="Italia" className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="websiteUrl">Sito web</Label>
                    <Input id="websiteUrl" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://..." className="mt-1" type="url" />
                  </div>

                  {/* Logo upload */}
                  <ImageUploadField
                    label="Logo birrificio"
                    value={breweryLogoUrl}
                    onChange={setBreweryLogoUrl}
                    folder="brewery-logos"
                    hint="Logo quadrato del birrificio"
                  />

                  {/* Cover upload */}
                  <ImageUploadField
                    label="Immagine di copertina"
                    value={breweryCoverUrl}
                    onChange={setBreweryCoverUrl}
                    folder="brewery-covers"
                    hint="Banner orizzontale (es. 1200×400px)"
                    aspect="wide"
                  />

                  <div>
                    <Label htmlFor="breweryDescription">Descrizione</Label>
                    <Textarea id="breweryDescription" value={breweryDescription} onChange={e => setBreweryDescription(e.target.value)} placeholder="Breve descrizione del birrificio..." className="mt-1 resize-none" rows={2} />
                  </div>

                  <div>
                    <Label htmlFor="breweryNotes">Note aggiuntive</Label>
                    <Textarea id="breweryNotes" value={breweryNotes} onChange={e => setBreweryNotes(e.target.value)} placeholder="Altre informazioni utili..." className="mt-1 resize-none" rows={2} />
                  </div>

                  <div className={`flex gap-2 ${isAdmin ? 'flex-col sm:flex-row' : ''}`}>
                    <Button type="submit" disabled={isPending} className="bg-amber-500 hover:bg-amber-600 text-white flex-1">
                      {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Invio...</> : "Invia richiesta"}
                    </Button>
                    {isAdmin && (
                      <Button
                        type="button"
                        disabled={isPending}
                        onClick={e => handleSubmitBrewery(e as any, true)}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1 gap-1.5"
                      >
                        {directMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creazione...</> : <><Zap className="h-4 w-4" /> Crea direttamente</>}
                      </Button>
                    )}
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
