/**
 * Stima "device-class" degli inset di safe-area per iOS edge-to-edge.
 *
 * Perché serve: header/bottom-nav/dock sono `position: fixed` dentro layer
 * GPU compositati (translateZ in `.bottom-nav-fixed` / `.pwa-standalone .fixed`).
 * In un layer compositato WebKit risolve `env(safe-area-inset-*)` come 0 al
 * PRIMO paint. Siccome `--frozen-sat/--frozen-sab` di default puntano a env(),
 * la chrome viene disegnata col primo frame a inset 0 (sovrapposta alla status
 * bar / Dynamic Island); poi il probe JS (fuori dal layer compositato) legge il
 * valore reale (≈59) e congela le var → la chrome SALTA 0→59.
 *
 * Soluzione: pre-seed sincrono di `--frozen-sat/sab` con una stima ricavata dalle
 * dimensioni di `screen` (disponibili subito, senza layout) PRIMA del primo paint
 * della chrome (in main.tsx, prima di render). Così il primo frame ha già l'inset
 * giusto → niente overlap, niente salto. Il probe in App.tsx poi rifinisce al
 * valore misurato reale (su Dynamic Island 59==59 → nessun assestamento; su un
 * device a notch più vecchio un piccolo assestamento una tantum, accettabile).
 *
 * Condivisa fra il pre-seed (main.tsx) e il fallback (App.tsx) per evitare drift.
 */
import { Capacitor } from "@capacitor/core";

/** iOS in modalità edge-to-edge: app nativa Capacitor OPPURE PWA standalone. */
export function isIosEdgeToEdge(): boolean {
  try {
    const isIosNative =
      Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
    if (isIosNative) return true;
    const ua = navigator.userAgent || "";
    const isIosUA =
      /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS si maschera da Macintosh ma ha il touch
      (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
    const isStandalone =
      (navigator as any).standalone === true ||
      window.matchMedia?.("(display-mode: standalone)")?.matches === true;
    return isIosUA && isStandalone;
  } catch {
    return false;
  }
}

/**
 * Stima degli inset (px) per la classe di device. Ritorna null se non siamo su
 * iOS edge-to-edge o se non possiamo determinarla. Usa il valore PIÙ ALTO per
 * classe così non sotto-padda mai (overlap); qualche px in più su un notch
 * (≈44px) è solo cosmetico e viene corretto dalla misura reale di env().
 */
export function estimateIosInsets(): { sat: number; sab: number } | null {
  if (!isIosEdgeToEdge()) return null;
  const w = window.screen?.width ?? 0;
  const h = window.screen?.height ?? 0;
  const long = Math.max(w, h),
    short = Math.min(w, h);
  if (!long || !short) return null;
  const ratio = long / short;
  // Notch / Dynamic Island (aspect ratio ≥ ~1.9).
  if (ratio >= 1.9) return { sat: 59, sab: 34 };
  // Device con tasto home (SE/8): status bar piccola, niente home indicator.
  return { sat: 20, sab: 0 };
}

/**
 * Pre-seed sincrono di `--frozen-sat/--frozen-sab` PRIMA del primo paint.
 * Solo in PORTRAIT (in landscape gli inset top/bottom sono ~0 e il notch va sul
 * lato) e solo se non c'è già un valore px > 0 impostato. Non persiste nulla:
 * è solo per avere il primo frame corretto; il probe reale rifinisce dopo.
 */
export function preseedSafeAreaInsets(): void {
  try {
    const portrait =
      window.matchMedia?.("(orientation: portrait)")?.matches ?? true;
    if (!portrait) return;
    const est = estimateIosInsets();
    if (!est) return;
    const root = document.documentElement;
    if (est.sat > 0) root.style.setProperty("--frozen-sat", est.sat + "px");
    if (est.sab > 0) root.style.setProperty("--frozen-sab", est.sab + "px");
    if (/[?&]sadebug/.test(window.location.search)) {
      // eslint-disable-next-line no-console
      console.log("[safe-area] preseed", est);
    }
  } catch {}
}
