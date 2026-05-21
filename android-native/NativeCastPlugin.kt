package to.fermentato.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.gms.cast.CastMediaControlIntent
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.cast.framework.CastSession
import com.google.android.gms.cast.framework.CastState
import com.google.android.gms.cast.framework.SessionManager
import com.google.android.gms.cast.framework.SessionManagerListener
import androidx.mediarouter.app.MediaRouteChooserDialog
import androidx.mediarouter.media.MediaRouter
import androidx.mediarouter.media.MediaRouteSelector
import org.json.JSONArray
import org.json.JSONObject

// ─── Capacitor plugin: NativeCast (Android) ──────────────────────────────────
// Mirrors the iOS NativeCast Swift plugin, wrapping the Google Cast Android SDK.
//
// JS usage (shared with iOS via useChromecast hook):
//   const NativeCast = registerPlugin('NativeCast');
//   await NativeCast.initialize({ appId: '6666EC62' });
//   await NativeCast.showPickerAndLoad({ url: '...', title: '...' });
//   await NativeCast.endSession();
//   NativeCast.addListener('castStateChanged', handler);
// ─────────────────────────────────────────────────────────────────────────────

@CapacitorPlugin(name = "NativeCast")
class NativeCastPlugin : Plugin() {

    companion object {
        // BUMP QUESTO STRING AD OGNI MODIFICA del plugin. È esposto via
        // getDiagnostics e visibile nel pannello diagnostica così l'utente
        // può verificare di avere installato l'APK aggiornato (non basta
        // ./deploy.sh per le modifiche Kotlin — serve ./scripts/build-apk.sh).
        const val PLUGIN_BUILD_ID = "2026-05-21-v12-poll-300ms"
    }

    private var castContext: CastContext? = null
    private var pendingUrl: String? = null
    private var pendingTitle: String? = null
    private var pendingCall: PluginCall? = null
    private var lastErrorCode: Int = 0
    private var lastErrorSource: String = ""

    // ── Lazy init helper — usa Activity context (richiesto da CastContext) ────
    private var lastCtxInitError: String? = null

    // ── Manifest introspection (debug) ───────────────────────────────────────
    // Legge il meta-data OPTIONS_PROVIDER_CLASS_NAME dall'AppInfo del manifest
    // e verifica se la classe è caricabile. Ritorna "FQN | classLoadable"
    // così possiamo distinguere: manifest mancante, FQN sbagliato, classe non
    // trovata dal classloader (R8/ProGuard strip).
    private fun introspectManifest(): String {
        return try {
            val pm = activity.packageManager
            val ai = pm.getApplicationInfo(
                activity.packageName,
                PackageManager.GET_META_DATA
            )
            val meta = ai.metaData
            if (meta == null) return "no-metadata-bundle"
            val fqn = meta.getString(
                "com.google.android.gms.cast.framework.OPTIONS_PROVIDER_CLASS_NAME"
            )
            if (fqn.isNullOrEmpty()) return "META MISSING (pkg=${activity.packageName})"
            val loadable = try {
                Class.forName(fqn); "loadable"
            } catch (e: Throwable) {
                "NOT_LOADABLE(${e.javaClass.simpleName})"
            }
            "$fqn | $loadable"
        } catch (e: Exception) {
            "introspect-error: ${e.message}"
        }
    }

    private fun getOrInitCastContext(): CastContext? {
        if (castContext != null) return castContext
        return try {
            // activity è il contesto corretto per CastContext su Android
            castContext = CastContext.getSharedInstance(activity)
            castContext?.sessionManager?.addSessionManagerListener(
                sessionListener, CastSession::class.java
            )
            lastCtxInitError = null
            castContext
        } catch (e: Exception) {
            // Espone il messaggio dell'eccezione in diagnostica così non
            // resta più un silent-null misterioso. Cause tipiche:
            // - ClassNotFoundException: meta-data OPTIONS_PROVIDER_CLASS_NAME
            //   nel manifest punta a una FQN che non esiste nel dex
            //   (mismatch package, vedi inject_cast_manifest.py + $PKG).
            // - Google Play Services Cast non installato/aggiornato.
            lastCtxInitError = "${e.javaClass.simpleName}: ${e.message}"
            android.util.Log.e("NativeCast", "getSharedInstance failed", e)
            null
        }
    }

    private val sessionListener = object : SessionManagerListener<CastSession> {
        override fun onSessionStarted(session: CastSession, sessionId: String) {
            val url   = pendingUrl
            val title = pendingTitle
            val call  = pendingCall
            if (url != null) {
                sendUrlMessage(session, url, title ?: "Fermenta.to")
                pendingUrl = null; pendingTitle = null; pendingCall = null
                call?.resolve(JSObject().put("success", true))
            }
            lastErrorCode = 0
            notifyState()
        }

        override fun onSessionStartFailed(session: CastSession, error: Int) {
            // error è un codice CastStatusCodes — lo esponiamo a JS per diagnostica.
            // 2005=AUTHENTICATION_FAILED (sender non autorizzato in Cast Console),
            // 2002=APPLICATION_NOT_FOUND (app ID 6666EC62 non registrato/non pubblicato),
            // 2003=APPLICATION_NOT_RUNNING, 15=TIMEOUT, 7=NETWORK_ERROR.
            lastErrorCode = error
            lastErrorSource = "onSessionStartFailed"
            android.util.Log.e("NativeCast", "Session start failed code=$error")
            pendingCall?.resolve(JSObject().put("success", false).put("errorCode", error).put("source", "onSessionStartFailed"))
            pendingUrl = null; pendingTitle = null; pendingCall = null
            notifyState()
        }

        override fun onSessionEnded(session: CastSession, error: Int) {
            lastErrorCode = error
            lastErrorSource = "onSessionEnded"
            android.util.Log.w("NativeCast", "Session ended code=$error")
            pendingCall?.resolve(JSObject().put("success", false).put("errorCode", error).put("source", "onSessionEnded"))
            pendingUrl = null; pendingTitle = null; pendingCall = null
            notifyState()
        }

        override fun onSessionStarting(session: CastSession)                             = notifyState()
        override fun onSessionResumed(session: CastSession, wasSuspended: Boolean)       = notifyState()
        override fun onSessionResuming(session: CastSession, sessionId: String)          = notifyState()
        override fun onSessionResumeFailed(session: CastSession, error: Int)             = notifyState()
        override fun onSessionEnding(session: CastSession)                               = notifyState()
        override fun onSessionSuspended(session: CastSession, reason: Int)               = notifyState()
    }

    override fun load() {
        // Inizializzazione anticipata — se fallisce verrà ritentata in showPickerAndLoad
        getOrInitCastContext()
    }

    override fun handleOnDestroy() {
        try {
            castContext?.sessionManager?.removeSessionManagerListener(
                sessionListener, CastSession::class.java
            )
        } catch (_: Exception) {}
    }

    @PluginMethod
    fun initialize(call: PluginCall) {
        // Capacitor esegue i @PluginMethod sul thread "CapacitorPlugins", ma
        // l'intero Cast SDK (CastContext.getSharedInstance, ctx.castState,
        // sessionManager.endCurrentSession, ecc.) richiede il main thread.
        // Senza questo wrap → IllegalStateException("Must be called from the
        // main thread") → FATAL EXCEPTION sul CapacitorPlugins thread → APK
        // killed all'apertura della dashboard pub (dove useChromecast monta).
        activity.runOnUiThread { initializeOnUiThread(call) }
    }

    private fun initializeOnUiThread(call: PluginCall) {
        // Su Android 13+ (API 33) NEARBY_WIFI_DEVICES è un runtime permission
        // OBBLIGATORIO per la discovery Chromecast via mDNS. Senza, il Cast SDK
        // non vede nessun device anche con manifest + Play Services OK.
        // Lo richiediamo qui (idempotente: il sistema mostra il dialog solo
        // la prima volta o se l'utente l'ha rifiutato in precedenza).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                activity, Manifest.permission.NEARBY_WIFI_DEVICES
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(Manifest.permission.NEARBY_WIFI_DEVICES),
                    /* requestCode = */ 9871
                )
            }
        }
        val ctx = getOrInitCastContext()
        if (ctx != null) {
            notifyState()
            call.resolve(JSObject().put("success", true))
        } else {
            call.resolve(JSObject().put("success", false))
        }
    }

    @PluginMethod
    fun showPickerAndLoad(call: PluginCall) {
        val url   = call.getString("url")   ?: return call.reject("url required")
        val title = call.getString("title") ?: "Fermenta.to"

        // Ritenta l'inizializzazione se la prima volta è fallita.
        // Se ancora null → Google Play Services Cast mancanti/non aggiornati.
        // Sentinel -3 = NO_CAST_CONTEXT (così lastErrorCode non rimane 0).
        val ctx = getOrInitCastContext()
        if (ctx == null) {
            lastErrorCode = -3
            return call.resolve(
                JSObject()
                    .put("success", false)
                    .put("errorCode", -3)
                    .put("reason", "no_cast_context")
            )
        }

        activity.runOnUiThread {
            try {
                val session = ctx.sessionManager.currentCastSession
                if (session != null && session.isConnected) {
                    // Sessione già attiva: invia subito il messaggio
                    sendUrlMessage(session, url, title)
                    call.resolve(JSObject().put("success", true))
                } else {
                    // Salva il pending load — verrà eseguito quando la sessione parte
                    pendingUrl   = url
                    pendingTitle = title
                    pendingCall  = call

                    val appId    = CastOptionsProvider.CAST_APP_ID
                    val selector = MediaRouteSelector.Builder()
                        .addControlCategory(CastMediaControlIntent.categoryForCast(appId))
                        .build()

                    // FORZA discovery attiva PRIMA di aprire il picker. Senza questo
                    // step il MediaRouter non sta facendo scanning attivo, il
                    // MediaRouteChooserDialog può aprirsi vuoto anche se la TV è
                    // raggiungibile in rete. Il chooser nativo non sempre triggera
                    // discovery da solo in modo affidabile su Capacitor WebView.
                    val router = MediaRouter.getInstance(activity)
                    val discoveryCb = object : MediaRouter.Callback() {}
                    router.addCallback(
                        selector,
                        discoveryCb,
                        MediaRouter.CALLBACK_FLAG_REQUEST_DISCOVERY
                    )
                    val routesNow = router.routes.count {
                        it.matchesSelector(selector) && !it.isDefault
                    }
                    android.util.Log.i(
                        "NativeCast",
                        "Pre-picker: routes=$routesNow appId=$appId"
                    )

                    val dialog = MediaRouteChooserDialog(activity)
                    dialog.routeSelector = selector
                    // Listener dismiss: se l'utente chiude il picker senza scegliere,
                    // la sessione non parte mai → onSessionStartFailed non viene chiamato →
                    // pendingCall resterebbe pending fino al timeout JS (30s).
                    //
                    // ⚠️  FIX doppio-passaggio: non risolvere subito il pendingCall!
                    // Quando l'utente seleziona un device, il dialog si chiude (dismiss)
                    // PRIMA che onSessionStarted/onSessionStartFailed vengano chiamati
                    // dal Cast SDK. Se risolviamo qui con false, la Promise JS ritorna
                    // false anche se il cast sta per partire. La seconda volta la
                    // sessione è già attiva e funziona — dà l'impressione del doppio passaggio.
                    //
                    // Soluzione: puliamo solo il discovery callback e lasciamo che
                    // onSessionStarted/onSessionStartFailed gestiscano pendingCall.
                    // Se entro 6s non succede nulla, allora risolviamo con USER_CANCELLED.
                    dialog.setOnDismissListener {
                        try { router.removeCallback(discoveryCb) } catch (_: Exception) {}
                        android.util.Log.i(
                            "NativeCast",
                            "Picker dismissed — polling 300ms for Cast SDK session event (max 6s)"
                        )
                        // Polling ogni 300ms invece del postDelayed fisso a 6s.
                        // Non appena il Cast SDK riporta una sessione attiva, risolviamo
                        // subito → tempo di connessione percepito 1-3s invece di sempre 6s.
                        // Dopo 6s senza sessione, risolviamo USER_CANCELLED come prima.
                        val maxAttempts = 20   // 20 × 300ms = 6000ms totali
                        var attempt = 0
                        val decorView = activity.window?.decorView
                        val pollRunnable = object : Runnable {
                            override fun run() {
                                if (pendingCall == null) return // già risolto da onSessionStarted
                                val session = castContext?.sessionManager?.currentCastSession
                                if (session != null && session.isConnected) {
                                    // Sessione attiva già notificata via onSessionStarted ma
                                    // pendingCall non era ancora null — risolvi success.
                                    android.util.Log.i("NativeCast", "Poll: session already active at attempt $attempt")
                                    // pendingCall may have already been resolved by onSessionStarted — be safe
                                    pendingUrl = null; pendingTitle = null; pendingCall = null
                                    return
                                }
                                attempt++
                                if (attempt >= maxAttempts) {
                                    lastErrorCode = -1
                                    lastErrorSource = "picker_dismissed(routes_at_open=$routesNow)"
                                    android.util.Log.w(
                                        "NativeCast",
                                        "No session event after 6s — resolving USER_CANCELLED"
                                    )
                                    pendingCall?.resolve(
                                        JSObject()
                                            .put("success", false)
                                            .put("errorCode", -1)
                                            .put("source", "picker_dismissed")
                                            .put("routesAtOpen", routesNow)
                                    )
                                    pendingUrl = null; pendingTitle = null; pendingCall = null
                                    notifyState()
                                } else {
                                    decorView?.postDelayed(this, 300)
                                }
                            }
                        }
                        decorView?.postDelayed(pollRunnable, 300)
                    }
                    android.util.Log.i("NativeCast", "Showing MediaRouteChooserDialog")
                    dialog.show()
                }
            } catch (e: Exception) {
                // Sentinel -2 = SHOW_EXCEPTION. Senza questa riga lastErrorCode
                // restava 0 e l'utente non aveva alcun feedback nel pannello.
                lastErrorCode = -2
                lastErrorSource = "show_exception: ${e.javaClass.simpleName}: ${e.message ?: "?"}"
                android.util.Log.e("NativeCast", "showPickerAndLoad exception", e)
                pendingUrl = null; pendingTitle = null; pendingCall = null
                call.resolve(
                    JSObject()
                        .put("success", false)
                        .put("errorCode", -2)
                        .put("source", lastErrorSource)
                )
                notifyState()
            }
        }
    }

    @PluginMethod
    fun endSession(call: PluginCall) {
        // sessionManager.endCurrentSession va invocato sul main thread.
        activity.runOnUiThread {
            try {
                castContext?.sessionManager?.endCurrentSession(true)
            } catch (_: Exception) {}
            call.resolve(JSObject().put("success", true))
        }
    }

    @PluginMethod
    fun getState(call: PluginCall) {
        // ctx.castState (dentro currentStateString) richiede il main thread.
        activity.runOnUiThread {
            call.resolve(JSObject().put("state", currentStateString()))
        }
    }

    // ── Diagnostica: mirror della getDiagnostics iOS ──────────────────────────
    // Espone a JS lo stato attuale della discovery e la lista delle route
    // (Chromecast / Android TV) trovate da MediaRouter. Utile per debugging
    // "Nessun Chromecast trovato": se discoveryActive=true e deviceCount=0
    // significa che il problema è di rete (mDNS bloccato, WiFi diversa) o di
    // permessi (NEARBY_WIFI_DEVICES non concesso). Se deviceCount>0 ma il
    // picker è vuoto, il problema è nell'app ID.
    @PluginMethod
    fun getDiagnostics(call: PluginCall) {
        activity.runOnUiThread {
            try {
                val ctx = getOrInitCastContext()
                val appIdLocal = CastOptionsProvider.CAST_APP_ID
                val selector = MediaRouteSelector.Builder()
                    .addControlCategory(CastMediaControlIntent.categoryForCast(appIdLocal))
                    .build()
                val router = MediaRouter.getInstance(activity)
                // Forza discovery attiva per ottenere il count aggiornato
                router.addCallback(
                    selector,
                    object : MediaRouter.Callback() {},
                    MediaRouter.CALLBACK_FLAG_REQUEST_DISCOVERY
                )
                val routes = router.routes.filter {
                    it.matchesSelector(selector) && !it.isDefault
                }
                val devices = JSONArray()
                routes.forEach { r ->
                    val obj = JSONObject()
                        .put("name",      r.name ?: "?")
                        .put("modelName", r.description ?: "?")
                        .put("deviceID",  r.id)
                        .put("category",  "cast")
                    devices.put(obj)
                }
                val result = JSObject()
                    .put("discoveryActive", ctx != null)
                    .put("deviceCount",     routes.size)
                    .put("devices",         devices)
                    .put("castState",       currentStateString())
                    .put("appId",           appIdLocal)
                    .put("lastErrorCode",   lastErrorCode)
                    .put("lastErrorSource", lastErrorSource)
                    .put("pluginBuildId",   PLUGIN_BUILD_ID)
                    .put("ctxInitError",    lastCtxInitError ?: "")
                    .put("manifestMeta",    introspectManifest())
                call.resolve(result)
            } catch (e: Exception) {
                call.resolve(
                    JSObject()
                        .put("discoveryActive", false)
                        .put("deviceCount", 0)
                        .put("devices", JSONArray())
                        .put("error", e.message ?: "unknown")
                )
            }
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Invia l'URL al Custom Web Receiver tramite sendMessage.
     * Il receiver (https://fermenta.to/tv/<id>) ascolta "urn:x-cast:fermenta.to"
     * e naviga all'URL ricevuto — stessa logica del client web in useChromecast.ts.
     */
    private fun sendUrlMessage(session: CastSession, url: String, title: String) {
        try {
            val payload = JSONObject()
                .put("url", url)
                .put("title", title)
                .toString()
            session.sendMessage("urn:x-cast:fermenta.to", payload)
        } catch (_: Exception) {}
        notifyState()
    }

    private fun currentStateString(): String {
        val ctx = castContext ?: return "unavailable"
        return when (ctx.castState) {
            CastState.CONNECTED            -> "connected"
            CastState.CONNECTING           -> "connecting"
            CastState.NOT_CONNECTED        -> "not_connected"
            CastState.NO_DEVICES_AVAILABLE -> "no_devices"
            else                           -> "unavailable"
        }
    }

    private fun notifyState() {
        val state   = currentStateString()
        val data    = JSObject().put("state", state)
        val session = castContext?.sessionManager?.currentCastSession
        if (session != null && session.isConnected) {
            data.put("deviceName", session.castDevice?.friendlyName ?: "TV")
        }
        notifyListeners("castStateChanged", data)
    }
}
