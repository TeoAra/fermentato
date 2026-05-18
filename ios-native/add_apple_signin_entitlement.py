#!/usr/bin/env python3
"""
Aggiunge l'entitlement "Sign in with Apple" al file App.entitlements.

L'entitlement com.apple.developer.applesignin abilita iOS a mostrare il
foglio nativo di Sign in with Apple. Senza questo, ASAuthorizationController
fallisce con AKAuthenticationError -7026.

Richiede inoltre che la capability "Sign In with Apple" sia attivata sul
provisioning profile/App ID nel Apple Developer Portal (automatico se usi
match con Codemagic e il bundle ID ha la capability nel portale).

Usage:
    python3 add_apple_signin_entitlement.py <path/to/App.entitlements>
"""
import sys
import os
import re

if len(sys.argv) < 2:
    print(__doc__)
    sys.exit(1)

entitlements_path = sys.argv[1]

if not os.path.exists(entitlements_path):
    print(f"ERROR: {entitlements_path} non esiste. Esegui add_push_entitlement.py prima.")
    sys.exit(1)

txt = open(entitlements_path).read()

if "com.apple.developer.applesignin" in txt:
    print(f"Apple Sign-In entitlement gia' presente in {entitlements_path} — skip")
    sys.exit(0)

# Inserisce la chiave prima della chiusura </dict>
apple_block = (
    "\t<key>com.apple.developer.applesignin</key>\n"
    "\t<array>\n"
    "\t\t<string>Default</string>\n"
    "\t</array>\n"
)
new_txt = re.sub(r"(\n</dict>)", "\n" + apple_block + r"\1", txt, count=1)

with open(entitlements_path, "w") as f:
    f.write(new_txt)

print(f"OK: Apple Sign-In entitlement aggiunto a {entitlements_path}")
print("---")
print(open(entitlements_path).read())
