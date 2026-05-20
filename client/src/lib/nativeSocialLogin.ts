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

let initialized = false;
let initPromise: Promise<void> | null = null;

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
    // progetto Google Cloud, lo stesso usato da Passport lato server per
    // GOOGLE_CLIENT_ID). È pubblico, non è un segreto. Va impostato come
    // VITE_GOOGLE_CLIENT_ID nell'.env del VPS (stesso valore di
    // GOOGLE_CLIENT_ID) prima di buildare. Senza, il plugin Android
    // rigetta con "google.clientId is null or empty".
    const googleWebClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as
      | string
      | undefined;
    await SocialLogin.initialize({
      google: {
        iOSClientId: GOOGLE_IOS_CLIENT_ID,
        ...(googleWebClientId ? { webClientId: googleWebClientId } : {}),
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
  try {
    await ensureInit();
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
    const res = await SocialLogin.login({
      provider: "google",
      options: { scopes: ["email", "profile"] },
    });
    // Il plugin ritorna res.result.idToken (JWT firmato da Google).
    // @ts-ignore — il tipo result varia per provider
    const idToken: string | undefined = res?.result?.idToken;
    if (!idToken) return { ok: false, error: "no_id_token" };

    const r = await fetch("/api/auth/google-native", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken }),
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
      res?.result?.idToken ?? res?.result?.identityToken;
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
