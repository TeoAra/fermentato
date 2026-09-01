#!/usr/bin/env python3
"""
Aggiunge gli entitlement Push Notifications e Universal Links al progetto iOS.

Crea ios/App/App/App.entitlements con aps-environment=production e
com.apple.developer.associated-domains per fermenta.to,
e imposta CODE_SIGN_ENTITLEMENTS nel pbxproj.

Necessario per ricevere notifiche push APNs native su iOS.
Senza questo il device token non viene mai generato da iOS.

Usage:
    python3 ios-native/add_push_entitlement.py <project.pbxproj>
"""
import sys
import re
import os

pbxproj = sys.argv[1]
entitlements_path = os.path.join(os.path.dirname(pbxproj), "../App/App.entitlements")
entitlements_path = os.path.normpath(entitlements_path)

# ── 1. Crea App.entitlements ─────────────────────────────────────────────────
os.makedirs(os.path.dirname(entitlements_path), exist_ok=True)
entitlements_content = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>aps-environment</key>
\t<string>production</string>
\t<key>com.apple.developer.associated-domains</key>
\t<array>
\t\t<string>applinks:fermenta.to</string>
\t</array>
</dict>
</plist>
"""
with open(entitlements_path, "w") as f:
    f.write(entitlements_content)
print(f"✅ App.entitlements creato: {entitlements_path}")

# ── 2. Imposta CODE_SIGN_ENTITLEMENTS nel pbxproj ─────────────────────────────
txt = open(pbxproj).read()

if "CODE_SIGN_ENTITLEMENTS" in txt:
    print("CODE_SIGN_ENTITLEMENTS già presente nel pbxproj — skip")
    sys.exit(0)

# SWIFT_VERSION = 5.0; appare in ogni configurazione (Debug + Release) del target App.
# Inseriamo CODE_SIGN_ENTITLEMENTS dopo ogni occorrenza.
count = len(re.findall(r"SWIFT_VERSION = 5\.0;", txt))
txt = re.sub(
    r"(SWIFT_VERSION = 5\.0;)",
    r'\1\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;',
    txt,
)
open(pbxproj, "w").write(txt)
print(f"✅ CODE_SIGN_ENTITLEMENTS = App/App.entitlements aggiunto a {count} configurazioni")
