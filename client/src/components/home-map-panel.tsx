import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { AlertCircle, LocateFixed, Map, Minus, Plus, SlidersHorizontal, X } from "lucide-react";

const HomepageMap = lazy(() => import("@/components/homepage-map"));

interface HomeMapPanelProps {
  pubs: any[];
  breweries: any[];
  userLocation: { lat: number; lng: number } | null;
  accuracy: number | null;
  locationStatus: string;
  locationError: string | null;
  isCached?: boolean;
  recenterToken: number;
  onRequestLocation: () => void;
  isLoading?: boolean;
  distanceKm: number;
  onDistanceChange: (distance: number) => void;
  showPubs: boolean;
  onShowPubsChange: (show: boolean) => void;
  showBreweries: boolean;
  onShowBreweriesChange: (show: boolean) => void;
}

const radiusOptions = [1, 5, 10, 15, 20, 30, 50, 100];

export default function HomeMapPanel(props: HomeMapPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localRecenter, setLocalRecenter] = useState(0);
  const [zoom, setZoom] = useState(5.4);
  const panelRef = useRef<HTMLElement>(null);
  const target = expanded ? "fixed inset-0 z-[200] min-h-[100dvh] rounded-none" : "relative h-[min(64vh,520px)] min-h-[360px] rounded-[26px]";
  const token = props.recenterToken + localRecenter;
  const accuracyText = props.accuracy != null
    ? props.accuracy >= 1000 ? `±${(props.accuracy / 1000).toFixed(1)} km` : `±${Math.round(props.accuracy)} m`
    : null;
  const locationText = props.locationStatus === "requesting"
    ? props.isCached ? "Ricerca posizione aggiornata…" : `Affinamento GPS${accuracyText ? ` · ${accuracyText}` : "…"}`
    : props.locationStatus === "denied" ? "Permesso posizione negato"
    : props.locationStatus === "error" ? "Posizione non disponibile"
    : props.isCached && props.userLocation ? "Ultima posizione rilevata"
    : props.userLocation ? `Precisione ${accuracyText ?? "non disponibile"}`
    : props.locationStatus === "unsupported" ? "GPS non disponibile"
    : "Tocca il mirino per attivare il GPS";
  const topInset = expanded ? "calc(var(--frozen-sat, 0px) + 12px)" : undefined;

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLButtonElement>('[aria-label="Chiudi mappa a schermo intero"]')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key !== "Tab") return;
      const controls = panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), select:not([disabled]), input:not([disabled]), a[href]");
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [expanded]);

  const map = () => (
    <Suspense fallback={<div className="h-full animate-pulse bg-[#e5ebdf] dark:bg-[#26312a]" aria-label="Caricamento mappa" />}>
      <HomepageMap
        pubs={props.pubs}
        breweries={props.breweries}
        userLocation={props.userLocation}
        accuracy={props.accuracy}
        recenterToken={token}
        isLoading={props.isLoading}
        showPubs={props.showPubs}
        showBreweries={props.showBreweries}
        distanceKm={props.distanceKm}
        externalZoom={zoom}
        onZoomChange={setZoom}
        showControls={false}
      />
    </Suspense>
  );

  return (
    <section ref={panelRef} role={expanded ? "dialog" : undefined} aria-modal={expanded ? true : undefined} aria-label="Mappa dei locali" data-no-pull="true" className={`overflow-hidden border border-[#d8e0d2] bg-[#edf1e8] shadow-[0_16px_40px_rgba(43,67,46,0.12)] dark:border-[#38463a] dark:bg-[#202a23] ${target}`}>
      <div style={{ bottom: expanded ? "var(--frozen-sab, 0px)" : undefined }} className="absolute inset-0" data-no-pull="true">{map()}</div>
      <div style={{ paddingTop: topInset }} className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3">
        <div className="pointer-events-auto max-w-[70%] rounded-2xl border border-white/70 bg-[#fffdf7]/95 px-3.5 py-2.5 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-[#202a23]/95">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#617260] dark:text-[#bdcbb6]"><Map className="h-3.5 w-3.5" /> Esplora sulla mappa</div>
          <p className="mt-0.5 text-xs text-[#536252] dark:text-[#c1cabb]">
            {props.userLocation ? `Entro ${props.distanceKm} km dalla tua posizione` : "Esplora pub e birrifici"}
          </p>
          <p role="status" className="mt-1 text-xs font-semibold text-[#435344] dark:text-[#d2ddce]">{locationText}</p>
          {props.locationError && <p role="alert" className="mt-1 flex items-start gap-1 text-xs text-[#9a3f2d] dark:text-[#ffb3a2]"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{props.locationError}</p>}
        </div>
        <div className="pointer-events-auto flex flex-col gap-2">
          <button type="button" aria-label="Centra sulla tua posizione" onClick={() => { props.onRequestLocation(); setLocalRecenter(v => v + 1); }} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-[#fffdf7] text-[#34483a] shadow-lg transition-transform active:scale-95 dark:border-white/10 dark:bg-[#202a23] dark:text-[#e8efe3]">
            <LocateFixed className="h-5 w-5" />
          </button>
          <button type="button" aria-label={filtersOpen ? "Chiudi filtri mappa" : "Apri filtri mappa"} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(v => !v)} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-[#fffdf7] text-[#34483a] shadow-lg transition-transform active:scale-95 dark:border-white/10 dark:bg-[#202a23] dark:text-[#e8efe3]">
            <SlidersHorizontal className="h-5 w-5" />
          </button>
          {!expanded && <button type="button" aria-label="Espandi mappa a schermo intero" onClick={() => setExpanded(true)} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-[#fffdf7] text-[#34483a] shadow-lg dark:border-white/10 dark:bg-[#202a23] dark:text-[#e8efe3]"><Map className="h-5 w-5" /></button>}
          {expanded && <button type="button" aria-label="Chiudi mappa a schermo intero" onClick={() => setExpanded(false)} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-[#fffdf7] text-[#34483a] shadow-lg dark:border-white/10 dark:bg-[#202a23] dark:text-[#e8efe3]"><X className="h-5 w-5" /></button>}
        </div>
      </div>
      <div className="absolute bottom-16 right-3 z-20 flex flex-col gap-1 overflow-hidden rounded-2xl border border-white/70 bg-[#fffdf7]/95 shadow-lg dark:border-white/10 dark:bg-[#202a23]/95">
        <button type="button" aria-label="Ingrandisci mappa" onClick={() => setZoom(z => Math.min(18, z + 1))} className="flex h-11 w-11 items-center justify-center text-[#34483a] dark:text-[#e8efe3]"><Plus className="h-4 w-4" /></button>
        <span className="mx-2 border-t border-[#d8e0d2] dark:border-[#38463a]" />
        <button type="button" aria-label="Riduci mappa" onClick={() => setZoom(z => Math.max(2, z - 1))} className="flex h-11 w-11 items-center justify-center text-[#34483a] dark:text-[#e8efe3]"><Minus className="h-4 w-4" /></button>
      </div>
      {filtersOpen && (
        <div style={{ top: expanded ? "calc(var(--frozen-sat, 0px) + 72px)" : undefined }} className="absolute right-[4.5rem] top-[4.5rem] z-30 w-[min(290px,calc(100%_-_6rem))] rounded-2xl border border-[#d8e0d2] bg-[#fffdf7] p-3 shadow-xl dark:border-[#38463a] dark:bg-[#202a23]" aria-label="Filtri mappa">
          <div className="mb-1 flex items-center justify-between"><h3 className="text-sm font-bold text-[#314335] dark:text-[#e8efe3]">Filtri</h3><button type="button" className="flex h-11 w-11 items-center justify-center" aria-label="Chiudi filtri" onClick={() => setFiltersOpen(false)}><X className="h-4 w-4" /></button></div>
          <label className="flex min-h-11 items-center justify-between text-sm text-[#435344] dark:text-[#d2ddce]"><span>Pub</span><input type="checkbox" checked={props.showPubs} onChange={e => props.onShowPubsChange(e.target.checked)} className="h-4 w-4 accent-[#e86b32]" /></label>
          <label className="mb-2 flex min-h-11 items-center justify-between text-sm text-[#435344] dark:text-[#d2ddce]"><span>Birrifici</span><input type="checkbox" checked={props.showBreweries} onChange={e => props.onShowBreweriesChange(e.target.checked)} className="h-4 w-4 accent-[#568a42]" /></label>
          <label htmlFor="map-radius" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#70806f] dark:text-[#b9c7b5]">Raggio di ricerca</label>
          <select id="map-radius" value={props.distanceKm} onChange={e => props.onDistanceChange(Number(e.target.value))} disabled={!props.userLocation} className="min-h-11 w-full rounded-xl border border-[#d8e0d2] bg-transparent px-3 py-2 text-sm text-[#314335] disabled:opacity-50 dark:border-[#38463a] dark:text-[#e8efe3]">
            {radiusOptions.map(value => <option key={value} value={value}>{value} km</option>)}
          </select>
          {!props.userLocation && <p className="mt-2 text-xs text-[#778273] dark:text-[#bac4b7]">Attiva la posizione per filtrare per distanza.</p>}
        </div>
      )}
    </section>
  );
}
