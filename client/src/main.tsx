import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Capacitor } from "@capacitor/core";

if (Capacitor.isNativePlatform()) {
  // Tag the document so CSS can target Capacitor-specific overrides
  document.documentElement.setAttribute("data-capacitor", "true");
  document.documentElement.setAttribute("data-platform", Capacitor.getPlatform());

  // Inizializza tutti i servizi nativi: push, deep link, back button, resume/pause
  import("./services/capacitor-native").then(({ initCapacitorNative }) => {
    initCapacitorNative().catch(() => {});
  }).catch(() => {});

  // Status bar: WebView edge-to-edge (overlaysWebView=true) così l'header
  // del sito estende il proprio background fin sotto la status bar tramite
  // env(safe-area-inset-top) e nulla "stacca". Stile e colore vengono poi
  // mantenuti in sync col tema dark/light dentro ThemeProvider.
  import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
    const isDark = document.documentElement.classList.contains("dark");
    const bg = isDark ? "#0B0D10" : "#FFFFFF";
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    // ⚠️ Capacitor 8: la mappatura nomi è INVERTITA rispetto alla semantica:
    //   Style.Dark  ("DARK")  → UIStatusBarStyle.lightContent → icone BIANCHE
    //   Style.Light ("LIGHT") → UIStatusBarStyle.darkContent  → icone NERE
    // Quindi: dark theme (sfondo navy) vuole Style.Dark (icone bianche);
    // light theme (sfondo bianco) vuole Style.Light (icone nere).
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
    // Su iOS non chiamare setBackgroundColor: in overlay mode interferirebbe con
    // il colore delle icone e causerebbe icone del colore sbagliato dopo cambio tema.
    if (Capacitor.getPlatform() !== "ios") {
      StatusBar.setBackgroundColor({ color: bg }).catch(() => {});
    }
  }).catch(() => {});

  // Splash screen: nascondiamo manualmente al ready del DOM, con un
  // timeout di sicurezza a 3.5s per evitare che resti bloccato in caso
  // di errore di rete iniziale (config launchAutoHide=false).
  import("@capacitor/splash-screen").then(({ SplashScreen }) => {
    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
    };
    // Nascondi dopo 1200ms: dà tempo al bundle JS di caricarsi e alla
    // NativeSplashOverlay React di renderizzarsi PRIMA che la splash nativa
    // scompaia, evitando il flash del logo default Capacitor (icona blu X).
    requestAnimationFrame(() => setTimeout(hide, 1200));
    // Fallback duro: dopo 3.5s nascondi comunque
    setTimeout(hide, 3500);
  }).catch(() => {});
}

// Service workers conflict with Capacitor's WebView request handling
// and can cause fetch hangs on Android. Only register in browser context.
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Quando un chunk lazy non si carica (deploy recente ha cambiato gli hash),
// forza un reload pulito. Senza questo l'utente vede un errore bianco.
window.addEventListener('vite:preloadError', () => {
  // Evita loop di reload: se abbiamo già ricaricato di recente, non ricaricare
  const lastReload = sessionStorage.getItem('_chunk_reload');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload) > 10000) {
    sessionStorage.setItem('_chunk_reload', String(now));
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
