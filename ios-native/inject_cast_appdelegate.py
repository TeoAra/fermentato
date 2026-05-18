#!/usr/bin/env python3
"""
Inietta l'inizializzazione di GCKCastContext nell'AppDelegate.swift di Capacitor.

Deve essere eseguito PRIMA di xcodebuild, dopo cap copy ios.
La discovery dei dispositivi Cast parte subito all'avvio dell'app.

Usage:
    python3 ios-native/inject_cast_appdelegate.py <path/to/AppDelegate.swift> [CAST_APP_ID]
"""
import sys
import re

path   = sys.argv[1]
app_id = sys.argv[2] if len(sys.argv) > 2 else "6666EC62"

txt = open(path).read()

if "GCKCastContext.setSharedInstanceWith" in txt:
    # Patch idempotente: assicura che NativeCastPlugin.self sia referenziato
    # anche su build già modificati (chiave per Capacitor auto-discovery).
    if "NativeCastPlugin.self" not in txt:
        txt = txt.replace(
            "GCKCastContext.setSharedInstanceWith(_castOptions)",
            "// Force-load del plugin nella ObjC runtime: senza questo riferimento\n"
            "        // esplicito Swift NON carica la classe finché qualcuno non la usa,\n"
            "        // quindi Capacitor non la trova in objc_getClassList() al boot e\n"
            "        // il plugin NativeCast risulta NON disponibile da JS.\n"
            "        _ = NativeCastPlugin.self\n"
            "        GCKCastContext.setSharedInstanceWith(_castOptions)"
        )
        open(path, "w").write(txt)
        print("✅ Aggiunto force-load NativeCastPlugin.self in AppDelegate esistente")
    else:
        print("GCKCastContext + force-load già presenti — skip")
    sys.exit(0)

# NOTA: 'import GoogleCast' NON viene iniettato qui.
# Le classi GCK sono disponibili tramite il bridging header App-Bridging-Header.h
# che Xcode carica automaticamente per tutti i file Swift del target App.
# Aggiungere 'import GoogleCast' causerebbe "unable to resolve module dependency"
# con Xcode 16 + XCFramework binari (bug noto Google Cast iOS SDK).

# Inietta il setup di GCKCastContext prima del primo 'return true'
#    che si trova in application(_:didFinishLaunchingWithOptions:)
cast_block = (
    "        // Google Cast SDK — inizializzato all'avvio per avviare discovery dispositivi.\n"
    "        // startDiscoveryAfterFirstTapOnCastButton=false è ESSENZIALE: dal SDK 4.4.8 in poi\n"
    "        // la discovery non parte se questo flag è true e l'app non usa il GCKUICastButton\n"
    "        // standard. Senza discovery attiva il prompt iOS 'Rete locale' non appare mai e\n"
    "        // il picker risulta vuoto. Impostandolo a false, la discovery (e quindi la query\n"
    "        // Bonjour _googlecast._tcp) parte all'avvio e iOS chiede subito il permesso.\n"
    f'        let _castCriteria = GCKDiscoveryCriteria(applicationID: "{app_id}")\n'
    "        let _castOptions  = GCKCastOptions(discoveryCriteria: _castCriteria)\n"
    "        _castOptions.physicalVolumeButtonsWillControlDeviceVolume = true\n"
    "        _castOptions.startDiscoveryAfterFirstTapOnCastButton = false\n"
    "        _castOptions.suspendSessionsWhenBackgrounded = true\n"
    "        // Force-load del plugin nella ObjC runtime: senza questo riferimento\n"
    "        // esplicito Swift NON carica la classe finché qualcuno non la usa,\n"
    "        // quindi Capacitor non la trova in objc_getClassList() al boot e\n"
    "        // il plugin NativeCast risulta NON disponibile da JS.\n"
    "        _ = NativeCastPlugin.self\n"
    "        GCKCastContext.setSharedInstanceWith(_castOptions)\n"
    "        GCKCastContext.sharedInstance().discoveryManager.startDiscovery()\n"
    "        "
)

txt = re.sub(
    r"(\n\s+)(return true\b)",
    lambda m: m.group(1) + cast_block.rstrip() + m.group(0),
    txt,
    count=1,
)

open(path, "w").write(txt)
print(f"GCKCastContext (appId={app_id}) iniettato in AppDelegate.swift")
