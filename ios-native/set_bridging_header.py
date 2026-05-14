#!/usr/bin/env python3
"""
Configura SWIFT_OBJC_BRIDGING_HEADER nel progetto Xcode (pbxproj).

Con il bridging header, tutti i file Swift del target App possono usare
le classi GCK senza 'import GoogleCast': il compilatore ObjC espone
automaticamente i simboli dichiarati nell'header a tutto il modulo Swift.
Questo bypassa il bug Xcode 16 che impedisce di importare XCFramework
binari pre-compilati come moduli Swift nativi.

Usage:
    python3 ios-native/set_bridging_header.py <project.pbxproj> <header_path>

Esempio:
    python3 ios-native/set_bridging_header.py \\
      ios/App/App.xcodeproj/project.pbxproj \\
      "App/App-Bridging-Header.h"
"""
import sys
import re

pbxproj     = sys.argv[1]
header_path = sys.argv[2]  # relativo a SRCROOT (= ios/App/)

txt = open(pbxproj).read()

if "SWIFT_OBJC_BRIDGING_HEADER" in txt:
    print("SWIFT_OBJC_BRIDGING_HEADER già presente — skip")
    sys.exit(0)

# SWIFT_VERSION = 5.0; appare una volta per ogni configurazione (Debug + Release)
# del target App. Aggiungiamo il bridging header subito dopo in entrambe.
n = len(re.findall(r"SWIFT_VERSION = 5\.0;", txt))
txt = re.sub(
    r"(SWIFT_VERSION = 5\.0;)",
    r'\1\n\t\t\t\tSWIFT_OBJC_BRIDGING_HEADER = "' + header_path + '";',
    txt,
)

open(pbxproj, "w").write(txt)
print(f"✅ SWIFT_OBJC_BRIDGING_HEADER = \"{header_path}\" aggiunto a {n} configurazioni")
