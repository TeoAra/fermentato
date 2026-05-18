// File ObjC che registra esplicitamente NativeCastPlugin con Capacitor.
//
// L'auto-discovery di Capacitor 8 tramite CAPBridgedPlugin NON funziona per
// plugin Swift in-app aggiunti dinamicamente al progetto Xcode da pipeline
// CI (verificato sperimentalmente: la classe risulta compilata e caricata
// nella ObjC runtime, ma Capacitor non la trova → "plugin is not implemented
// on ios"). La macro CAP_PLUGIN genera il codice di registrazione che
// Capacitor cerca al boot — è lo stesso approccio usato da tutti i plugin
// ufficiali (@capacitor/camera, @capacitor/geolocation, ecc.).
//
// IMPORTANTE: il primo argomento (NativeCastPlugin) DEVE corrispondere
// all'@objc(NativeCastPlugin) della classe Swift. Il secondo argomento
// ("NativeCast") DEVE corrispondere al jsName e a registerPlugin("NativeCast")
// lato JS.

#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(NativeCastPlugin, "NativeCast",
    CAP_PLUGIN_METHOD(initialize,        CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(showPickerAndLoad, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getDiagnostics,    CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(endSession,        CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getState,          CAPPluginReturnPromise);
)
