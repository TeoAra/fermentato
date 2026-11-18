import { lazy, Suspense, useState, useEffect, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useHideGlobalBottomNav } from "@/components/bottom-navigation";
import { AlertCircle, LocateFixed, Map, Minus, Plus, SlidersHorizontal, X } from "lucide-react";
import type { SelectedMapVenue } from "@/components/homepage-map";

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

function FullscreenNavigationGuard() {
  useHideGlobalBottomNav();
  return null;
}

export default function HomeMapPanel(props: HomeMapPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localRecenter, setLocalRecenter] = useState(0);
  const [zoom, setZoom] = useState(5.4);
  const [selectedVenue, setSelectedVenue] = useState<SelectedMapVenue | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const target = expanded ? "ios-fixed-chrome fixed inset-0 z-[10000] rounded-none" : "relative h-[clamp(220px,31svh,300px)] rounded-2xl";
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
    const appRoot = document.getElementById("root");
    const previousInert = appRoot?.inert ?? false;
    if (appRoot) appRoot.inert = true;
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
      if (appRoot) appRoot.inert = previousInert;
      document.removeEventListener("keydown", onKey);
      if (previousFocus?.isConnected) previousFocus.focus();
      else panelRef.current?.querySelector<HTMLButtonElement>('[aria-label="Espandi mappa a schermo intero"]')?.focus();
    };
  }, [expanded]);

  const map = () => (
    <Suspense fallback={<div className="h-full bg-[#f3f0e8]" aria-label="Caricamento mappa" />}>
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
        popupPlacement="bottom"
        showSummary={false}
        onSelectionChange={setSelectedVenue}
      />
    </Suspense>
  );

  const content = (
    <section ref={panelRef} role={expanded ? "dialog" : undefined} aria-modal={expanded ? true : undefined} aria-label="Mappa dei locali" data-testid="home-map-panel" data-no-pull="true"
      style={{ "--map-popup-bottom": expanded ? "calc(var(--frozen-sab, 0px) + 76px)" : "76px" } as CSSProperties}
      className={`overflow-hidden border border-border bg-[#FFF7EA] ${filtersOpen ? "[&_[data-testid=home-map-selected-venue]]:hidden" : ""} ${target}`}>
      {expanded && <FullscreenNavigationGuard />}
      <div className="absolute inset-0" data-no-pull="true">{map()}</div>
      {expanded && <button type="button" style={{ top: topInset }} aria-label="Chiudi mappa a schermo intero" onClick={() => setExpanded(false)} className="absolute right-3 z-30 flex h-11 w-11 items-center justify-center rounded-xl border border-[#ead7b7] bg-[#fff7ea] text-[#675239] shadow-sm"><X className="h-5 w-5" /></button>}
      <div style={{ bottom: expanded ? "calc(var(--frozen-sab, 0px) + 20px)" : 20 }} className="pointer-events-none absolute inset-x-0 z-40 flex items-end justify-between gap-2 px-3">
        <p id="home-map-location-status" role="status" className="sr-only">{locationText}</p>
        <div className="pointer-events-auto flex overflow-hidden rounded-xl border border-[#ead7b7] bg-[#fff7ea] text-[#675239] shadow-sm">
          <button type="button" aria-label="Ingrandisci mappa" onClick={() => setZoom(z => Math.min(18, z + 1))} className="flex h-11 w-11 items-center justify-center"><Plus className="h-4 w-4" /></button>
          <button type="button" aria-label="Riduci mappa" onClick={() => setZoom(z => Math.max(2, z - 1))} className="flex h-11 w-11 items-center justify-center border-l border-[#ead7b7]"><Minus className="h-4 w-4" /></button>
        </div>
        <div className="pointer-events-auto ml-auto flex gap-2">
          <button type="button" aria-label="Centra sulla tua posizione" aria-describedby="home-map-location-status" title={locationText} onClick={() => { props.onRequestLocation(); setLocalRecenter(v => v + 1); }} className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#ead7b7] bg-[#fff7ea] text-[#b36b0b] shadow-sm">
            <LocateFixed className="h-5 w-5" />
          </button>
          <button type="button" aria-label={filtersOpen ? "Chiudi filtri mappa" : "Apri filtri mappa"} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(v => !v)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#ead7b7] bg-[#fff7ea] text-[#675239] shadow-sm">
            <SlidersHorizontal className="h-5 w-5" />
          </button>
          {!expanded && <button type="button" aria-label="Espandi mappa a schermo intero" onClick={() => setExpanded(true)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#ead7b7] bg-[#fff7ea] text-[#675239] shadow-sm"><Map className="h-5 w-5" /></button>}
        </div>
      </div>
      {props.locationError && !selectedVenue && <p role="alert" style={{ bottom: expanded ? "calc(var(--frozen-sab, 0px) + 76px)" : 76 }} className="absolute left-3 right-3 z-20 flex items-start gap-1.5 rounded-xl border border-border bg-card p-2.5 text-xs text-destructive shadow-sm"><AlertCircle className="h-4 w-4 shrink-0" />{props.locationError}</p>}
      {filtersOpen && (
        <div style={{ bottom: expanded ? "calc(var(--frozen-sab, 0px) + 76px)" : 76, maxHeight: expanded ? "calc(100% - var(--frozen-sat, 0px) - var(--frozen-sab, 0px) - 140px)" : "calc(100% - 88px)" }} className="absolute inset-x-3 z-50 overflow-y-auto rounded-2xl border border-[#ead7b7] bg-[#fff7ea] p-3 shadow-md" aria-label="Filtri mappa">
          <div className="mb-1 flex items-center justify-between"><h3 className="text-sm font-bold text-[#314335] dark:text-[#e8efe3]">Filtri</h3><button type="button" className="flex h-11 w-11 items-center justify-center" aria-label="Chiudi filtri" onClick={() => setFiltersOpen(false)}><X className="h-4 w-4" /></button></div>
          <label className="flex min-h-11 items-center justify-between text-sm text-[#435344] dark:text-[#d2ddce]"><span className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />Pub</span><input type="checkbox" checked={props.showPubs} onChange={e => props.onShowPubsChange(e.target.checked)} className="h-4 w-4 accent-[#F59E0B]" /></label>
          <label className="mb-2 flex min-h-11 items-center justify-between text-sm text-[#435344] dark:text-[#d2ddce]"><span className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#0F766E]" />Birrifici</span><input type="checkbox" checked={props.showBreweries} onChange={e => props.onShowBreweriesChange(e.target.checked)} className="h-4 w-4 accent-[#0F766E]" /></label>
          <label htmlFor="map-radius" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#70806f] dark:text-[#b9c7b5]">Raggio di ricerca</label>
          <select id="map-radius" value={props.distanceKm} onChange={e => props.onDistanceChange(Number(e.target.value))} disabled={!props.userLocation} className="min-h-11 w-full rounded-xl border border-[#d8e0d2] bg-transparent px-3 py-2 text-sm text-[#314335] disabled:opacity-50 dark:border-[#38463a] dark:text-[#e8efe3]">
            {radiusOptions.map(value => <option key={value} value={value}>{value} km</option>)}
          </select>
          {!props.userLocation && <p className="mt-2 text-xs text-[#778273] dark:text-[#bac4b7]">Attiva la posizione per filtrare per distanza.</p>}
          <p className="mt-2 text-xs text-muted-foreground">{locationText}</p>
        </div>
      )}
    </section>
  );
  // Escape transformed/animated page ancestors: fullscreen must be viewport-bound.
  return expanded ? createPortal(content, document.body) : content;
}
