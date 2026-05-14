import Foundation
import Capacitor

// ─── NativeCast iOS stub ──────────────────────────────────────────────────────
// Su iOS il casting nativo avviene tramite AirPlay (WebKit / AVRoutePickerView).
// Il Google Cast iOS SDK causa errori di modulo irrisolvibili con Xcode 16 +
// use_frameworks!, perciò questo plugin è un no-op che restituisce sempre
// { success: false, state: "unavailable" }.
// L'interfaccia JS (useChromecast.ts) vede stato "unavailable" su iOS nativo
// e non mostra il pulsante Chromecast: l'utente usa il pulsante AirPlay dedicato.
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
