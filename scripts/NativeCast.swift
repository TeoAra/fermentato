import Foundation
import Capacitor
import GoogleCast

// ─── Capacitor plugin: NativeCast ────────────────────────────────────────────
// Wraps the Google Cast iOS SDK for use in a Capacitor WKWebView app.
// Auto-discovered by the Capacitor bridge at runtime via ObjC introspection.
//
// JS usage:
//   const NativeCast = registerPlugin('NativeCast');
//   await NativeCast.initialize({ appId: '6666EC62' });
//   await NativeCast.showPickerAndLoad({ url: '...', title: '...' });
//   await NativeCast.endSession();
//   NativeCast.addListener('castStateChanged', handler);
// ─────────────────────────────────────────────────────────────────────────────

@objc(NativeCastPlugin)
public class NativeCastPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "NativeCastPlugin"
    public let jsName    = "NativeCast"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize",       returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showPickerAndLoad",returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endSession",       returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState",         returnType: CAPPluginReturnPromise),
    ]

    private var delegate: CastSessionDelegate?
    private var initialized = false
    private var pendingLoad: PendingLoad?

    // MARK: - initialize

    @objc func initialize(_ call: CAPPluginCall) {
        let appId = call.getString("appId") ?? "6666EC62"
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if !self.initialized {
                let criteria = GCKDiscoveryCriteria(applicationID: appId)
                let options  = GCKCastOptions(discoveryCriteria: criteria)
                options.physicalVolumeButtonsWillControlDeviceVolume = true
                GCKCastContext.setSharedInstanceWith(options)
                GCKCastContext.sharedInstance().useDefaultExpandedMediaControls = true

                let del = CastSessionDelegate(plugin: self)
                self.delegate = del
                GCKCastContext.sharedInstance().sessionManager.add(del)
                GCKCastContext.sharedInstance().discoveryManager.add(del)
                self.initialized = true
            }
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
            if sm.hasConnectedCastSession() {
                self.loadMedia(url: url, title: title, call: call)
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

    // MARK: - Internal

    func loadMedia(url: String, title: String, call: CAPPluginCall?) {
        guard let session  = GCKCastContext.sharedInstance().sessionManager.currentCastSession,
              let mediaURL = URL(string: url) else {
            call?.resolve(["success": false, "loaded": false])
            return
        }
        let builder = GCKMediaInformationBuilder(contentURL: mediaURL)
        builder.contentType = "text/html"
        let meta = GCKMediaMetadata(metadataType: .generic)
        meta.setString(title, forKey: kGCKMetadataKeyTitle)
        builder.metadata = meta

        let req = session.remoteMediaClient?.loadMedia(builder.build())
        let reqDel = CastMediaRequestDelegate(call: call)
        req?.delegate = reqDel
        objc_setAssociatedObject(req as AnyObject, &reqDel, reqDel, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)

        let deviceName = session.device.friendlyName ?? "TV"
        notifyListeners("castStateChanged", data: ["state": "connected", "deviceName": deviceName])
    }

    func onSessionStarted(_ session: GCKCastSession) {
        let name = session.device.friendlyName ?? "TV"
        notifyListeners("castStateChanged", data: ["state": "connected", "deviceName": name])
        if let p = pendingLoad {
            loadMedia(url: p.url, title: p.title, call: p.call)
            pendingLoad = nil
        }
    }

    func onSessionEnded() {
        notifyListeners("castStateChanged", data: ["state": "not_connected"])
        pendingLoad?.call.resolve(["success": false])
        pendingLoad = nil
    }

    func onDiscoveryChanged() {
        notifyListeners("castStateChanged", data: ["state": currentStateString()])
    }

    func currentStateString() -> String {
        let sm = GCKCastContext.sharedInstance().sessionManager
        if sm.hasConnectedCastSession() { return "connected" }
        if sm.connectionState == .connecting { return "connecting" }
        let dc = GCKCastContext.sharedInstance().discoveryManager
        return dc.deviceCount > 0 ? "not_connected" : "no_devices"
    }
}

// MARK: - Helper types

private struct PendingLoad {
    let url: String
    let title: String
    let call: CAPPluginCall
}

private var reqDel = 0

private class CastMediaRequestDelegate: NSObject, GCKRequestDelegate {
    private let call: CAPPluginCall?
    init(call: CAPPluginCall?) { self.call = call }
    func requestDidComplete(_ request: GCKRequest) {
        call?.resolve(["success": true, "loaded": true])
    }
    func request(_ request: GCKRequest, didFailWithError error: GCKError) {
        call?.resolve(["success": true, "loaded": false])
    }
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
