import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

// ── AppUpdateCheck ───────────────────────────────────────────────────────────────
// Il controllo versione/blocco aggiornamento è disabilitato.
//
// Motivo: l'app è configurata con server.url (carica sempre JS dal server),
// quindi ogni reload implicito o esplicito è sufficiente per aggiornare.
// Bloccare l'utente con un dialog modale è controproducente e causa
// loop quando la versione client/server non sono perfettamente sincronizzate.
//
// Rimane solo l'auto-reload silenzioso quando l'app torna in primo piano
// dopo 5 minuti in background — così il JS fresco viene caricato
// automaticamente dopo un deploy.
// ───────────────────────────────────────────────────────────────────────────

export function AppUpdateCheck() {
  const isNative = Capacitor.isNativePlatform();
  const lastForegroundRef = useRef<number>(Date.now());

  // Auto-reload silenzioso quando l'app torna in primo piano dopo > 5 min.
  // Questo è sufficiente a garantire che l'app riceva il nuovo JS
  // dal server dopo un deploy — senza bloccare l'utente con dialog.
  useEffect(() => {
    if (!isNative) return;
    let listener: { remove: () => void } | null = null;

    const setup = async () => {
      listener = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) return;
        const now = Date.now();
        if (now - lastForegroundRef.current > 5 * 60 * 1000) {
          window.location.reload();
        }
        lastForegroundRef.current = now;
      });
    };
    setup();
    return () => { listener?.remove(); };
  }, [isNative]);

  return null;
}
