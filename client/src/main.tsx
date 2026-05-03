import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Capacitor } from "@capacitor/core";

if (Capacitor.isNativePlatform()) {
  // Tag the document so CSS can target Capacitor-specific overrides
  document.documentElement.setAttribute("data-capacitor", "true");

  // Status bar: icone scure su sfondo crema chiaro, no overlay del WebView
  // (su Android 13/14 evita il notch/edge-to-edge sopra la UI).
  import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: "#FFF7ED" }).catch(() => {});
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
    // Nascondi appena React ha renderizzato qualcosa di visibile
    requestAnimationFrame(() => setTimeout(hide, 350));
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
