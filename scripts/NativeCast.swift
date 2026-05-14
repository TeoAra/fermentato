import Foundation
import Capacitor

// ─── Capacitor plugin: NativeCast (iOS) ──────────────────────────────────────
// Wraps the Google Cast iOS SDK for use in a Capacitor WKWebView app.
//
// NOTA: NON usa 'import GoogleCast'. Le classi GCK sono esposte a tutto il
// target App tramite il bridging header  App/App-Bridging-Header.h  che
// Xcode carica prima di compilare qualsiasi file Swift. Questo bypassa il
// bug Xcode 16 che impedisce di risolvere XCFramework binari come moduli Swift.
//
// GCKCastContext è inizializzato in AppDelegate (inject_cast_appdelegate.py)
// così la discovery dei dispositivi parte all'avvio, non quando JS chiama initialize().
//
// JS usage (useChromecast.ts — condiviso con Android):
//   const NativeCast = registerPlugin('NativeCast');
//   await NativeCast.initialize({ appId: '6666EC62' });
//   await NativeCast.showPickerAndLoad({ url, title });
//   await NativeCast.endSession();
//   NativeCast.addListener('castStateChanged', handler);
// ─────────────────────────────────────────────────────────────────────────────

@objc(NativeCastPlugin)
public class NativeCastPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier    = "NativeCastPlugin"
    public let jsName        = "NativeCast"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showPickerAndLoad", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endSession",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState",          returnType: CAPPluginReturnPromise),
    ]

    private var sessionDelegate: CastSessionDelegate?
    private var pendingLoad: PendingLoad?

    // MARK: - initialize
    // GCKCastContext è già configurato in AppDelegate; qui colleghiamo solo
    // i listener di sessione e discovery.

    @objc func initialize(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if self.sessionDelegate == nil {
                let del = CastSessionDelegate(plugin: self)
                self.sessionDelegate = del
                GCKCastContext.sharedInstance().sessionManager.add(del)
                GCKCastContext.sharedInstance().discoveryManager.add(del)
            }
            self.notifyState()
            call.resolve(["success": true])
        }
    }

    // MARK: - showPickerAndLoad

    @objc func showPickerAndLoad(_ call: CAPPluginCall) {
        call.keepAlive = true
        let url   = call.getString("url")   ?? ""
        let title = call.getString("title") ?? "Fermenta.to"

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let sm = GCKCastContext.sharedInstance().sessionManager
            if sm.hasConnectedCastSession(), let session = sm.currentCastSession {
                self.sendUrlMessage(session: session, url: url, title: title)
                call.resolve(["success": true])
            } else {
                self.pendingLoad = PendingLoad(url: url, title: title, call: call)
                GCKCastContext.sharedInstance().presentCastDialog()
            }
        }
    }

    // MARK: - endSession

    @objc func endSession(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            GCKCastContext.sharedInstance().sessionManager.endSessionAndStopCasting(true)
            call.resolve(["success": true])
        }
    }

    // MARK: - getState

    @objc func getState(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            call.resolve(["state": self?.currentStateString() ?? "unavailable"])
        }
    }

    // MARK: - Internal helpers

    func sendUrlMessage(session: GCKCastSession, url: String, title: String) {
        let escapedUrl   = url.replacingOccurrences(of: "\"", with: "\\\"")
        let escapedTitle = title.replacingOccurrences(of: "\"", with: "\\\"")
        let payload      = "{\"url\":\"\(escapedUrl)\",\"title\":\"\(escapedTitle)\"}"
        let channel      = FermentaCastChannel()
        session.add(channel)
        try? channel.sendTextMessage(payload)
        notifyState()
    }

    func onSessionStarted(_ session: GCKCastSession) {
        let name = session.device.friendlyName ?? "TV"
        notifyListeners("castStateChanged", data: ["state": "connected", "deviceName": name])
        if let p = pendingLoad {
            sendUrlMessage(session: session, url: p.url, title: p.title)
            p.call.resolve(["success": true])
            pendingLoad = nil
        }
    }

    func onSessionEnded() {
        pendingLoad?.call.resolve(["success": false])
        pendingLoad = nil
        notifyListeners("castStateChanged", data: ["state": "not_connected"])
    }

    func onDiscoveryChanged() {
        notifyListeners("castStateChanged", data: ["state": currentStateString()])
    }

    func currentStateString() -> String {
        let sm = GCKCastContext.sharedInstance().sessionManager
        if sm.hasConnectedCastSession()      { return "connected" }
        if sm.connectionState == .connecting { return "connecting" }
        let dc = GCKCastContext.sharedInstance().discoveryManager
        return dc.deviceCount > 0 ? "not_connected" : "no_devices"
    }

    func notifyState() {
        var data: [String: Any] = ["state": currentStateString()]
        if let session = GCKCastContext.sharedInstance().sessionManager.currentCastSession,
           session.connectionState == .connected {
            data["deviceName"] = session.device.friendlyName ?? "TV"
        }
        notifyListeners("castStateChanged", data: data)
    }
}

// MARK: - FermentaCastChannel
// Canale custom per inviare l'URL al receiver via "urn:x-cast:fermenta.to"

private class FermentaCastChannel: GCKCastChannel {
    init() { super.init(namespace: "urn:x-cast:fermenta.to") }
}

// MARK: - Helper types

private struct PendingLoad {
    let url:   String
    let title: String
    let call:  CAPPluginCall
}

private class CastSessionDelegate: NSObject, GCKSessionManagerListener, GCKDiscoveryManagerListener {
    weak var plugin: NativeCastPlugin?
    init(plugin: NativeCastPlugin) { self.plugin = plugin }

    func sessionManager(_ sm: GCKSessionManager, didStart session: GCKCastSession) {
        plugin?.onSessionStarted(session)
    }
    func sessionManager(_ sm: GCKSessionManager, didEnd session: GCKCastSession, withError error: Error?) {
        plugin?.onSessionEnded()
    }
    func sessionManager(_ sm: GCKSessionManager, didFailToStart session: GCKCastSession, withError error: Error) {
        plugin?.onSessionEnded()
    }
    func sessionManager(_ sm: GCKSessionManager, didResumeCastSession session: GCKCastSession) {
        plugin?.onSessionStarted(session)
    }
    func didUpdateDeviceList() {
        plugin?.onDiscoveryChanged()
    }
}
