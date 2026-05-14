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
    print("GCKCastContext già presente in AppDelegate — skip")
    sys.exit(0)

# NOTA: 'import GoogleCast' NON viene iniettato qui.
# Le classi GCK sono disponibili tramite il bridging header App-Bridging-Header.h
# che Xcode carica automaticamente per tutti i file Swift del target App.
# Aggiungere 'import GoogleCast' causerebbe "unable to resolve module dependency"
# con Xcode 16 + XCFramework binari (bug noto Google Cast iOS SDK).

# Inietta il setup di GCKCastContext prima del primo 'return true'
#    che si trova in application(_:didFinishLaunchingWithOptions:)
cast_block = (
    "        // Google Cast SDK — inizializzato all'avvio per avviare discovery dispositivi\n"
    f'        let _castCriteria = GCKDiscoveryCriteria(applicationID: "{app_id}")\n'
    "        let _castOptions  = GCKCastOptions(discoveryCriteria: _castCriteria)\n"
    "        _castOptions.physicalVolumeButtonsWillControlDeviceVolume = true\n"
    "        GCKCastContext.setSharedInstanceWith(_castOptions)\n"
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
