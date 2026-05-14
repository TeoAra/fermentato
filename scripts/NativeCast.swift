import Foundation
import Capacitor

// ─── NativeCast iOS stub ──────────────────────────────────────────────────────
// Il Google Cast iOS SDK (google-cast-sdk-no-bluetooth) è incompatibile con
// il setup Codemagic + Xcode 16: import GoogleCast fallisce come modulo Swift
// e il bridging header non trova GoogleCast.h perché il pod non viene installato
// dalla cache di CocoaPods in 3s. Tentativi effettuati: modular_headers, import
// diretto Swift, bridging header ObjC — tutti falliti.
//
// Su iOS l'utente usa AirPlay (WebKit webkitShowPlaybackTargetPicker) che funziona
// nativamente con Apple TV. Il pulsante Cast non viene mostrato su iOS nativo.
// Il pulsante Cast (Chromecast) è attivo su Android APK (NativeCastPlugin.kt).
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

    @objc func initialize(_ call: CAPPluginCall) {
        call.resolve(["success": false, "state": "unavailable"])
    }

    @objc func showPickerAndLoad(_ call: CAPPluginCall) {
        call.resolve(["success": false])
    }

    @objc func endSession(_ call: CAPPluginCall) {
        call.resolve(["success": false])
    }

    @objc func getState(_ call: CAPPluginCall) {
        call.resolve(["state": "unavailable"])
    }
}
