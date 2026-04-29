import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Capacitor } from "@capacitor/core";

if (Capacitor.isNativePlatform()) {
  import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: "#FFF7ED" }).catch(() => {});
  }).catch(() => {});
}

if ('serviceWorker' in navigator) {
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
