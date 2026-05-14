#!/usr/bin/env python3
"""
Crea il bridging header ObjC e configura SWIFT_OBJC_BRIDGING_HEADER nel pbxproj.

Con il bridging header, tutti i file Swift del target App possono usare
le classi GCK senza 'import GoogleCast': i simboli ObjC dichiarati nell'header
sono automaticamente disponibili in tutti i file Swift del modulo.
Questo bypassa il bug Xcode 16 + XCFramework binari pre-compilati.

Usage:
    python3 ios-native/set_bridging_header.py <project.pbxproj> <pbxproj_rel_path> <file_path>

    project.pbxproj  : percorso al file .pbxproj
    pbxproj_rel_path : path relativo a SRCROOT (ios/App/) da scrivere nel pbxproj
    file_path        : percorso fisico dove creare il file .h

Esempio:
    python3 ios-native/set_bridging_header.py \\
      ios/App/App.xcodeproj/project.pbxproj \\
      "App/App-Bridging-Header.h" \\
      ios/App/App/App-Bridging-Header.h
"""
import sys
import re
import os

pbxproj     = sys.argv[1]
header_path = sys.argv[2]   # relativo a SRCROOT, scritto nel pbxproj
file_path   = sys.argv[3]   # percorso fisico del file .h da creare

# ── 1. Crea il file bridging header ──────────────────────────────────────────
os.makedirs(os.path.dirname(file_path), exist_ok=True)
with open(file_path, "w") as f:
    f.write(
        "// Bridging header — espone il Google Cast iOS SDK a tutti i file Swift del target.\n"
        "// Non usare 'import GoogleCast' nei file Swift: le classi GCK sono disponibili qui.\n"
        "#import <GoogleCast/GoogleCast.h>\n"
    )
print(f"✅ Bridging header creato: {file_path}")

# ── 2. Imposta SWIFT_OBJC_BRIDGING_HEADER nel pbxproj ────────────────────────
txt = open(pbxproj).read()

if "SWIFT_OBJC_BRIDGING_HEADER" in txt:
    print("SWIFT_OBJC_BRIDGING_HEADER già presente nel pbxproj — skip")
    sys.exit(0)

# SWIFT_VERSION = 5.0; appare una volta per ogni config (Debug + Release) del target App.
n = len(re.findall(r"SWIFT_VERSION = 5\.0;", txt))
txt = re.sub(
    r"(SWIFT_VERSION = 5\.0;)",
    r'\1\n\t\t\t\tSWIFT_OBJC_BRIDGING_HEADER = "' + header_path + '";',
    txt,
)
open(pbxproj, "w").write(txt)
print(f"✅ SWIFT_OBJC_BRIDGING_HEADER = \"{header_path}\" aggiunto a {n} configurazioni")
