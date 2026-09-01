#!/usr/bin/env python3
"""Verifica identità, scheme ed entitlement richiesti dalla build iOS."""

import plistlib
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(
        "Usage: verify_ios_entitlements.py <project.pbxproj> "
        "<App.entitlements> <Info.plist> <bundle-id>"
    )

project_path = Path(sys.argv[1])
entitlements_path = Path(sys.argv[2])
info_path = Path(sys.argv[3])
expected_bundle_id = sys.argv[4]

for path in (project_path, entitlements_path, info_path):
    if not path.is_file():
        raise SystemExit(f"ERRORE: file iOS mancante: {path}")

project = project_path.read_text(encoding="utf-8")
if "CODE_SIGN_ENTITLEMENTS = App/App.entitlements;" not in project:
    raise SystemExit("ERRORE: CODE_SIGN_ENTITLEMENTS non configurato nel progetto Xcode")

with entitlements_path.open("rb") as handle:
    entitlements = plistlib.load(handle)

if entitlements.get("aps-environment") != "production":
    raise SystemExit("ERRORE: entitlement APNs production mancante")
if "applinks:fermenta.to" not in entitlements.get(
    "com.apple.developer.associated-domains", []
):
    raise SystemExit("ERRORE: entitlement applinks:fermenta.to mancante")
if "Default" not in entitlements.get("com.apple.developer.applesignin", []):
    raise SystemExit("ERRORE: entitlement Sign in with Apple mancante")

with info_path.open("rb") as handle:
    info = plistlib.load(handle)

schemes = {
    scheme
    for item in info.get("CFBundleURLTypes", [])
    for scheme in item.get("CFBundleURLSchemes", [])
}
if "fermentato" not in schemes:
    raise SystemExit("ERRORE: URL scheme fermentato non registrato in Info.plist")

configured_bundle = info.get("CFBundleIdentifier")
if configured_bundle not in (expected_bundle_id, "$(PRODUCT_BUNDLE_IDENTIFIER)"):
    raise SystemExit(
        f"ERRORE: bundle ID Info.plist inatteso: {configured_bundle!r}"
    )

print(
    f"Configurazione iOS verificata: {expected_bundle_id}, "
    "APNs, Universal Links, Apple Sign-In e scheme fermentato"
)