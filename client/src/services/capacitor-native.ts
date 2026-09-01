/**
 * Capacitor Native Service — inizializzato una volta al boot dell'app nativa.
 * Gestisce: push notifications (FCM/APNs), deep link, stato rete, haptics,
 * ciclo di vita app (foreground/background), status bar.
 *
 * Uso: chiamare `initCapacitorNative()` in main.tsx quando isNativePlatform()
 */

import { Capacitor } from "@capacitor/core";

export const isNative = Capacitor.isNativePlatform();
export const nativePlatform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

const DEEP_LINK_HOST = "fermenta.to";
const CUSTOM_SCHEME = "fermentato:";
const ROUTE_ALIASES: Record<string, string> = {
  pubs: "pub",
  beers: "beer",
  breweries: "brewery",
  notification: "notifications",
};

function normalizeAppPath(pathname: string): string | null {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return null;
  const segments = pathname.split("/");
  const firstSegment = segments[1]?.toLowerCase();
  if (firstSegment && ROUTE_ALIASES[firstSegment]) {
    segments[1] = ROUTE_ALIASES[firstSegment];
  }
  return segments.join("/");
}

/**
 * Convert an App Link or custom-scheme URL into a safe in-app route.
 *
 * Custom URLs are accepted in both forms used by Android tooling:
 *   fermentato:///pub/123
 *   fermentato://pubs/123
 * The latter stores the first route segment in URL.host, so it needs to be
 * put back into the path before Wouter can match it.
 */
function nativeAppPath(rawTarget: unknown): string | null {
  if (typeof rawTarget !== "string" || !rawTarget.trim()) return null;
  const raw = rawTarget.trim();
  try {
    const url = new URL(raw, window.location.origin);
    const isRelative = raw.startsWith("/");
    const isCurrentOrigin = url.origin === window.location.origin;
    const isFermentaHttps =
      url.protocol === "https:" && url.hostname.toLowerCase() === DEEP_LINK_HOST;
    const isCustomScheme = url.protocol === CUSTOM_SCHEME;

    if (!isRelative && !isCurrentOrigin && !isFermentaHttps && !isCustomScheme) {
      return null;
    }

    let pathname = url.pathname || "/";
    if (isCustomScheme && url.hostname) {
      const customRoute = url.hostname.toLowerCase();
      pathname = `/${customRoute}${pathname === "/" ? "" : pathname}`;
    }
    const path = normalizeAppPath(`${pathname}${url.search}${url.hash}`);
    return path && path !== "//" ? path : null;
  } catch {
    return null;
  }
}

function internalAppPath(rawTarget: unknown): string | null {
  return nativeAppPath(rawTarget);
}

function navigateInsideApp(rawTarget: unknown): boolean {
  const path = internalAppPath(rawTarget);
  if (!path) return false;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (path !== current) {
    history.pushState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  return true;
}

// ─── Push Notifications ────────────────────────────────────────────────────

// Diagnostica visibile in-app: traccia ogni fase della registrazione push
// così l'utente può vedere DOVE fallisce senza accesso a logcat.
export type PushDiagnostic = {
  platform: string;
  step: string;
  permission?: string;
  tokenReceived?: boolean;
  tokenPreview?: string;
  saveStatus?: number | string;
  error?: string;
  updatedAt: number;
};

export const pushDiagnostic: PushDiagnostic = {
  platform: nativePlatform,
  step: "non avviato",
  updatedAt: Date.now(),
};

function updateDiag(patch: Partial<PushDiagnostic>) {
  Object.assign(pushDiagnostic, patch, { updatedAt: Date.now() });
  try {
    window.dispatchEvent(new CustomEvent("native-push-diagnostic", { detail: { ...pushDiagnostic } }));
  } catch {}
}

async function setupPushNotifications() {
  if (!isNative) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Listener: token FCM/APNs ricevuto dopo register()
    await PushNotifications.addListener("registration", async (token) => {
      console.log("[native] FCM/APNs token:", token.value);
      updateDiag({
        step: "token ricevuto",
        tokenReceived: true,
        tokenPreview: token.value ? token.value.slice(0, 12) + "…" : "(vuoto)",
        error: undefined,
      });
      // Retry con backoff: il token può arrivare prima che la sessione sia pronta (401).
      const saveToken = async (attempt = 0): Promise<void> => {
        try {
          const res = await fetch("/api/push/native-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ token: token.value, platform: nativePlatform }),
          });
          updateDiag({ step: res.ok ? "token salvato sul server" : `salvataggio HTTP ${res.status}`, saveStatus: res.status });
          if (res.status === 401 && attempt < 4) {
            // Sessione non ancora pronta — riprova con backoff esponenziale
            const delay = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s, 16s
            console.log(`[native] Token save 401, retry in ${delay}ms (attempt ${attempt + 1})`);
            updateDiag({ step: `401 — riprovo (tentativo ${attempt + 1})`, saveStatus: 401 });
            setTimeout(() => saveToken(attempt + 1), delay);
          }
        } catch (e) {
          console.warn("[native] Failed to save push token", e);
          updateDiag({ step: "errore salvataggio token", saveStatus: "network", error: String(e) });
        }
      };
      await saveToken();
    });

    // Listener: errore di registrazione
    await PushNotifications.addListener("registrationError", (err) => {
      console.warn("[native] Push registration error:", err.error);
      updateDiag({ step: "errore registrazione FCM/APNs", error: String(err?.error ?? err), tokenReceived: false });
    });

    // Listener: notifica ricevuta mentre app è in foreground
    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("[native] Push received:", notification);
      window.dispatchEvent(new CustomEvent("native-push-received", { detail: notification }));
    });

    // Listener: utente ha toccato la notifica (app in background o chiusa)
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("[native] Push action:", action);
      const data = action.notification?.data;
      const target = data?.path ?? data?.url;
      if (target && !navigateInsideApp(target)) {
        console.warn("[native] Ignored unsafe push destination");
      }
      window.dispatchEvent(new CustomEvent("native-push-action", { detail: action }));
    });

    // Controlla se i permessi erano già stati concessi in sessioni precedenti
    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === "granted") {
      await PushNotifications.register();
    }
  } catch (e) {
    console.warn("[native] Push setup failed (Firebase not configured?):", e);
  }
}

// ─── App Lifecycle ─────────────────────────────────────────────────────────

async function setupAppLifecycle() {
  if (!isNative) return;
  try {
    const { App } = await import("@capacitor/app");

    const openExplicitUrl = (rawUrl: string) => {
      console.log("[native] Deep link:", rawUrl);
      if (!navigateInsideApp(rawUrl)) {
        console.warn("[native] Ignored unsafe deep-link destination");
      }
    };

    // Deep link handler
    App.addListener("appUrlOpen", (event) => {
      openExplicitUrl(event.url);
    });

    // Resolve a cold-start URL before the remembered route is applied. The
    // dataset marker also covers the case where this finishes before React has
    // attached its event listener.
    try {
      const launch = await App.getLaunchUrl();
      if (launch?.url) openExplicitUrl(launch.url);
    } finally {
      document.documentElement.dataset.nativeLaunchReady = "true";
      window.dispatchEvent(new CustomEvent("native-launch-ready"));
    }

    // Back button su Android — naviga indietro o chiude l'app
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    // Resume dall'app in background — aggiorna i dati e rinnova token push
    App.addListener("resume", async () => {
      window.dispatchEvent(new CustomEvent("native-app-resume"));
      // Rinnova il token APNs/FCM: può cambiare dopo aggiornamenti OS o
      // passaggi di test→produzione. Re-registrare è idempotente e sicuro.
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const perm = await PushNotifications.checkPermissions();
        if (perm.receive === "granted") {
          await PushNotifications.register();
        }
      } catch {}
    });

    // App sospesa
    App.addListener("pause", () => {
      window.dispatchEvent(new CustomEvent("native-app-pause"));
    });
  } catch (e) {
    console.warn("[native] App lifecycle setup failed:", e);
  }
}

// ─── Status Bar ────────────────────────────────────────────────────────────

export async function setStatusBarStyle(isDark: boolean) {
  if (!isNative) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // ⚠️ Capacitor 8: mappatura INVERTITA rispetto al nome.
    // Style.Dark  → UIStatusBarStyle.lightContent → icone BIANCHE (per sfondi scuri).
    // Style.Light → UIStatusBarStyle.darkContent  → icone NERE (per sfondi chiari).
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  } catch {}
}

// ─── Geolocalizzazione ────────────────────────────────────────────────────

export async function requestNativeGeolocation(): Promise<{ lat: number; lng: number } | null> {
  if (!isNative) return null;
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.requestPermissions();
    if (perm.location !== "granted") return null;
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

export async function watchNativeGeolocation(
  callback: (pos: { lat: number; lng: number }) => void
): Promise<string | null> {
  if (!isNative) return null;
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const id = await Geolocation.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
      if (pos) callback({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
    return id;
  } catch {
    return null;
  }
}

// ─── Splash Screen ────────────────────────────────────────────────────────

export async function hideSplashScreen() {
  if (!isNative) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {}
}

// ─── Init entrypoint ─────────────────────────────────────────────────────

export async function initCapacitorNative() {
  if (!isNative) return;
  console.log("[native] Initializing Capacitor native services (platform:", nativePlatform, ")");
  await Promise.allSettled([
    setupPushNotifications(),
    setupAppLifecycle(),
  ]);
}

// ─── Push: register manuale (chiamato da CapacitorPushPrompt) ────────────

export async function registerNativePush(): Promise<"granted" | "denied" | "error"> {
  if (!isNative) {
    updateDiag({ step: "non è un'app nativa", error: "isNativePlatform() = false" });
    return "error";
  }
  try {
    updateDiag({ step: "richiesta permessi…", error: undefined });
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const result = await PushNotifications.requestPermissions();
    updateDiag({ step: `permesso: ${result.receive}`, permission: result.receive });
    if (result.receive === "granted" || result.receive === "prompt-with-rationale") {
      updateDiag({ step: "chiamo register() — attendo token FCM…" });
      await PushNotifications.register();
      return "granted";
    }
    return "denied";
  } catch (e) {
    console.warn("[native] registerNativePush error:", e);
    updateDiag({ step: "eccezione in registerNativePush", error: String(e) });
    return "error";
  }
}
