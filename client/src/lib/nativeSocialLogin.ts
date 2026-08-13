/**
 * Wrapper per @capgo/capacitor-social-login.
 *
 * Su iOS/Android native usa il plugin nativo (UI nativa Google/Apple, niente
 * WebView). Su web ritorna `isNative=false` e il chiamante deve usare il
 * flusso OAuth web tradizionale (redirect a /api/auth/google).
 *
 * Apple Sign-In è disponibile nativamente solo su iOS. Su Android usa
 * il fallback web del plugin (popup browser).
 */
import { Capacitor } from "@capacitor/core";

// iOS OAuth Client ID di Google Cloud Console — PUBBLICO (non è un segreto).
// Deve corrispondere al reversed URL scheme nel Info.plist iOS:
//   com.googleusercontent.apps.131123139785-stv42sugd3i1u0lb3u0jssoink746n81
export const GOOGLE_IOS_CLIENT_ID =
  "131123139785-stv42sugd3i1u0lb3u0jssoink746n81.apps.googleusercontent.com";

// Apple Service ID (per Apple Sign-In web/Android fallback). Su iOS nativo
// non viene usato — iOS legge il bundle ID dal Info.plist automaticamente.
export const APPLE_SERVICE_ID = "to.fermentato.app.web";

// Web redirect URI per Apple Sign-In (richiesto da Apple per il fallback web).
export const APPLE_REDIRECT_URI = "https://fermenta.to/api/auth/apple/callback";

export const isNative = Capacitor.isNativePlatform();
export const isNativeIos = isNative && Capacitor.getPlatform() === "ios";
export const isAndroidNative = isNative && Capacitor.getPlatform() === "android";

let initialized = false;
let initPromise: Promise<void> | null = null;
let cachedGoogleClientId: string | null | undefined = undefined;

async function resolveGoogleClientId(): Promise<string | null> {
  // 1. env build-time (Vite → VITE_GOOGLE_CLIENT_ID)
  const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (envId) return envId;
  // 2. cache runtime (fetchato dal server)
  if (cachedGoogleClientId !== undefined) return cachedGoogleClientId;
  // 3. fetch dal server — il server conosce GOOGLE_CLIENT_ID dalle env.
  try {
    const r = await fetch("/api/client-config", { credentials: "include" });
    const cfg = await r.json();
    cachedGoogleClientId = cfg.googleClientId || null;
    return cachedGoogleClientId ?? null;
  } catch {
    cachedGoogleClientId = null;
    return null;
  }
}

/**
 * Inizializza il plugin SocialLogin una sola volta. Idempotente.
 * Chiamato lazy alla prima invocazione di loginGoogleNative/loginAppleNative.
 */
async function ensureInit(): Promise<void> {
  if (!isNative) return;
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
    // IMPORTANTE — Apple Sign-In iOS:
    // Su iOS NON dobbiamo passare `redirectUrl`. Se lo passassimo, il plugin
    // dopo l'auth nativa fa un POST a quell'URL aspettandosi una risposta
    // 3xx con `Location: ...?success=true&...` (flusso web "Sign in with
    // Apple JS"). Il nostro callback Passport risponde 200 + HTML, e il
    // plugin lancia `AppleProviderError.invalidResponseCode(statusCode: 200)`
    // → motivo del rejection App Store 2.1 ("Continue with Apple displays
    // an error message"). Con redirectUrl vuoto il plugin restituisce
    // direttamente l'identityToken nativo che noi inviamo a
    // /api/auth/apple-native.
    // Su Android invece il fallback web ha bisogno di clientId+redirectUrl.
    const appleConfig = isNativeIos
      ? {}
      : { clientId: APPLE_SERVICE_ID, redirectUrl: APPLE_REDIRECT_URI };
    // Android richiede `webClientId` (Web OAuth Client ID dello stesso
    // progetto Google Cloud). Prima prova l'env build-time, poi il server.
    const googleWebClientId = await resolveGoogleClientId();
    if (!googleWebClientId) {
      throw new Error(
        "Google clientId non disponibile. Verifica che GOOGLE_CLIENT_ID sia impostato nel server e VITE_GOOGLE_CLIENT_ID nel build."
      );
    }
    await SocialLogin.initialize({
      google: {
        iOSClientId: GOOGLE_IOS_CLIENT_ID,
        webClientId: googleWebClientId,
        mode: "online",
      },
      apple: appleConfig,
    });
    initialized = true;
  })().catch((err) => {
    // Se l'init fallisce (es. plugin non disponibile / rete), resetta la
    // promise cached così il prossimo tentativo può riprovare invece di
    // restituire sempre lo stesso errore.
    initPromise = null;
    throw err;
  });

  return initPromise;
}

export interface NativeAuthResult {
  ok: boolean;
  error?: string;
}

/**
 * Esegue login Google nativo, invia l'idToken al backend per verifica e
 * creazione sessione. Ritorna ok=true se il backend conferma il login.
 */
export async function loginGoogleNative(): Promise<NativeAuthResult> {
  if (!isNative) return { ok: false, error: "not_native" };

  // ── Helper: esegue il login e invia il token al backend ──────────────────
  async function doLogin(opts: Record<string, unknown>): Promise<NativeAuthResult> {
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
    // Timeout 20s sul plugin nativo: se l'UI Google non risponde (crash plugin,
    // nessuna interazione utente entro 20s), reject invece di restare bloccato.
    const loginTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("google_plugin_timeout")), 20000)
    );
    const res = await Promise.race([
      SocialLogin.login({ provider: "google", options: opts }),
      loginTimeout,
    ]);
    // @ts-ignore — il tipo result varia per provider
    const idToken: string | undefined = res?.result?.idToken;
    if (!idToken) return { ok: false, error: "no_id_token" };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    const r = await fetch("/api/auth/google-native", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return { ok: false, error: `backend_${r.status}: ${t.slice(0, 120)}` };
    }
    return { ok: true };
  }

  try {
    await ensureInit();

    // Tentativo 1: UI standard (GetSignInWithGoogleOption)
    const r1 = await doLogin({});
    if (r1.ok) return r1;

    // ⚠️  Tentativo 2 (solo Android): se il primo è fallito con "cancelled",
    // riproviamo con bottomUi=true (GetGoogleIdOption). Il CredentialManager
    // di Android a volte ritorna "USER_CANCELLED" anche se l'utente ha
    // selezionato l'account — un bug noto dello standard UI. La bottom UI
    // usa un'API diversa e spesso funziona dove lo standard fallisce.
    const isAndroid = Capacitor.getPlatform() === "android";
    const wasCancelled = r1.error?.includes("cancelled") || r1.error?.includes("USER_CANCELLED");
    if (isAndroid && wasCancelled) {
      const r2 = await doLogin({ style: "bottom" });
      if (r2.ok) return r2;
      // Se anche bottom fallisce, ritorniamo l'errore del primo tentativo
      // (più descrittivo per il troubleshooting).
    }

    return r1;
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

/**
 * Fallback Android-only: apre Chrome Custom Tabs per il flusso OAuth web.
 * Si usa quando il plugin nativo fallisce con "cancelled" perché la firma
 * SHA-1 dell'APK non è registrata in Google Cloud Console.
 *
 * Chrome Custom Tabs è consentito da Google (il WebView è bloccato con
 * disallowed_useragent). Chrome Custom Tabs e WebView hanno jar di cookie
 * separati, quindi non possiamo leggere la sessione direttamente dopo l'auth.
 *
 * Soluzione: token exchange monouso (60s TTL).
 *  1. Genera un reqId univoco lato client.
 *  2. Apre /api/auth/google?req_id=REQ_ID in Chrome Custom Tabs.
 *  3. Il server, dopo l'OAuth, salva un exchange token associato al reqId
 *     e redireziona a /auth-app-callback?req_id=REQ_ID.
 *  4. Nel frattempo il WebView esegue polling su /api/auth/app-token-status/REQ_ID
 *     ogni 2 secondi (fino a 60s).
 *  5. Quando il token è pronto, chiama /api/auth/exchange-app-token dal
 *     WebView → il server crea una sessione nel contesto del WebView (cookie
 *     nel jar del WebView) → login completato.
 *  6. Chiude il browser e risolve ok: true.
 */
export async function loginGoogleBrowserFallback(): Promise<NativeAuthResult> {
  try {
    const { Browser } = await import("@capacitor/browser");

    // reqId univoco: 32 caratteri hex
    const reqId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return new Promise<NativeAuthResult>((resolve) => {
      let settled = false;
      let pollInterval: ReturnType<typeof setInterval> | null = null;

      const cleanup = async (result: NativeAuthResult) => {
        if (settled) return;
        settled = true;
        if (pollInterval) clearInterval(pollInterval);
        await Browser.removeAllListeners().catch(() => {});
        resolve(result);
      };

      // Polling ogni 2 secondi per max 60 secondi
      const startPolling = () => {
        let attempts = 0;
        pollInterval = setInterval(async () => {
          attempts++;
          if (attempts > 30) {
            // Timeout 60s
            clearInterval(pollInterval!);
            await Browser.close().catch(() => {});
            await cleanup({ ok: false, error: "browser_login_timeout" });
            return;
          }
          try {
            const r = await fetch(`/api/auth/app-token-status/${reqId}`, {
              credentials: "include",
            });
            if (!r.ok) return;
            const data = await r.json();
            if (!data.ready) return;

            // Token pronto: scambialo per una vera sessione nel WebView
            clearInterval(pollInterval!);
            const r2 = await fetch("/api/auth/exchange-app-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ reqId }),
            });
            if (r2.ok) {
              await Browser.close().catch(() => {});
              await cleanup({ ok: true });
            } else {
              await Browser.close().catch(() => {});
              await cleanup({ ok: false, error: "exchange_failed" });
            }
          } catch {
            // Ignora errori di rete transitori — riprova al prossimo intervallo
          }
        }, 2000);
      };

      // Se l'utente chiude il browser manualmente prima del completamento
      Browser.addListener("browserFinished", () => {
        if (pollInterval) {
          // Aspetta un ultimo controllo prima di arrendersi
          setTimeout(async () => {
            if (!settled) {
              if (pollInterval) clearInterval(pollInterval);
              await cleanup({ ok: false, error: "browser_login_cancelled" });
            }
          }, 2500);
        } else {
          cleanup({ ok: false, error: "browser_login_cancelled" });
        }
      });

      Browser.open({
        url: `https://fermenta.to/api/auth/google?req_id=${reqId}`,
        presentationStyle: "fullscreen",
      })
        .then(() => startPolling())
        .catch((e: any) => {
          cleanup({ ok: false, error: e?.message || "browser_open_failed" });
        });
    });
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

/**
 * Esegue Sign in with Apple nativo. Il name è disponibile SOLO al primo
 * accesso e viene inviato al backend per persistenza.
 */
export async function loginAppleNative(): Promise<NativeAuthResult> {
  // Apple nativo solo su iOS — su Android/web facciamo fallback al flusso web.
  if (!isNativeIos) return { ok: false, error: "not_ios_native" };
  try {
    await ensureInit();
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
    const res = await SocialLogin.login({
      provider: "apple",
      options: { scopes: ["email", "name"] },
    });
    // @capgo/capacitor-social-login v8.x: il campo è `idToken` (JWT firmato
    // da Apple), NON `identityToken` come nei vecchi plugin. Manteniamo il
    // fallback per retro-compatibilità nel caso il plugin venga downgradato.
    // @ts-ignore — il tipo varia
    const identityToken: string | undefined =
      res?.result?.idToken ?? (res?.result as { identityToken?: string } | undefined)?.identityToken;
    // @ts-ignore
    const profile = res?.result?.profile;
    if (!identityToken) {
      const keys = res?.result ? Object.keys(res.result).join(",") : "no-result";
      return { ok: false, error: `no_identity_token (keys=${keys})` };
    }

    const r = await fetch("/api/auth/apple-native", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        identityToken,
        // Apple manda givenName/familyName SOLO la prima volta
        firstName: profile?.givenName ?? null,
        lastName: profile?.familyName ?? null,
        // Email può essere null nelle login successive — il backend la
        // recupera dall'idToken.
        email: profile?.email ?? null,
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return { ok: false, error: `backend_${r.status}: ${t.slice(0, 120)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}
