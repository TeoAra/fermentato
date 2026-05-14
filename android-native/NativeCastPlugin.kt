package to.fermentato.app

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
import androidx.mediarouter.media.MediaRouteSelector
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

    private var castContext: CastContext? = null
    private var pendingUrl: String? = null
    private var pendingTitle: String? = null
    private var pendingCall: PluginCall? = null

    // ── Lazy init helper — usa Activity context (richiesto da CastContext) ────
    private fun getOrInitCastContext(): CastContext? {
        if (castContext != null) return castContext
        return try {
            // activity è il contesto corretto per CastContext su Android
            castContext = CastContext.getSharedInstance(activity)
            castContext?.sessionManager?.addSessionManagerListener(
                sessionListener, CastSession::class.java
            )
            castContext
        } catch (e: Exception) {
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
            notifyState()
        }

        override fun onSessionStartFailed(session: CastSession, error: Int) {
            pendingCall?.resolve(JSObject().put("success", false))
            pendingUrl = null; pendingTitle = null; pendingCall = null
            notifyState()
        }

        override fun onSessionEnded(session: CastSession, error: Int) {
            pendingCall?.resolve(JSObject().put("success", false))
            pendingUrl = null; pendingTitle = null; pendingCall = null
            notifyState()
        }

        override fun onSessionStarting(session: CastSession)                             = notifyState()
        override fun onSessionResumed(session: CastSession, wasSuspended: Boolean)       = notifyState()
        override fun onSessionResuming(session: CastSession, sessionId: String)          = notifyState()
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

        // Ritenta l'inizializzazione se la prima volta è fallita
        val ctx = getOrInitCastContext()
            ?: return call.resolve(JSObject().put("success", false))

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
                    val dialog = MediaRouteChooserDialog(activity)
                    dialog.routeSelector = selector
                    dialog.show()
                }
            } catch (e: Exception) {
                pendingUrl = null; pendingTitle = null; pendingCall = null
                call.resolve(JSObject().put("success", false))
            }
        }
    }

    @PluginMethod
    fun endSession(call: PluginCall) {
        try {
            castContext?.sessionManager?.endCurrentSession(true)
        } catch (_: Exception) {}
        call.resolve(JSObject().put("success", true))
    }

    @PluginMethod
    fun getState(call: PluginCall) {
        call.resolve(JSObject().put("state", currentStateString()))
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
