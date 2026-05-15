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

// ─── Push Notifications ────────────────────────────────────────────────────

async function setupPushNotifications() {
  if (!isNative) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Listener: token FCM/APNs ricevuto dopo register()
    await PushNotifications.addListener("registration", async (token) => {
      console.log("[native] FCM/APNs token:", token.value);
      try {
        await fetch("/api/push/native-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token: token.value, platform: nativePlatform }),
        });
      } catch (e) {
        console.warn("[native] Failed to save push token", e);
      }
    });

    // Listener: errore di registrazione
    await PushNotifications.addListener("registrationError", (err) => {
      console.warn("[native] Push registration error:", err.error);
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
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.path) {
        window.location.hash = "";
        history.pushState(null, "", data.path);
        window.dispatchEvent(new PopStateEvent("popstate"));
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

    // Deep link handler
    App.addListener("appUrlOpen", (event) => {
      console.log("[native] Deep link:", event.url);
      try {
        const url = new URL(event.url);
        const path = url.pathname + url.search + url.hash;
        history.pushState(null, "", path);
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch {}
    });

    // Back button su Android — naviga indietro o chiude l'app
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    // Resume dall'app in background — aggiorna i dati
    App.addListener("resume", () => {
      window.dispatchEvent(new CustomEvent("native-app-resume"));
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
    // Style.Light = icone bianche (per sfondi scuri); Style.Dark = icone nere (per sfondi chiari)
    await StatusBar.setStyle({ style: isDark ? Style.Light : Style.Dark });
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
  if (!isNative) return "error";
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const result = await PushNotifications.requestPermissions();
    if (result.receive === "granted" || result.receive === "prompt-with-rationale") {
      await PushNotifications.register();
      return "granted";
    }
    return "denied";
  } catch (e) {
    console.warn("[native] registerNativePush error:", e);
    return "error";
  }
}
